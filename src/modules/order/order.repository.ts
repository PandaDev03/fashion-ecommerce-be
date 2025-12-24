import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { OrderDetail } from '../order-details/entity/order-details.entity';
import { Order } from './entity/order.entity';

@Injectable()
export class OrderRepository {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly dataSource: DataSource,
  ) {}

  async createOrder(
    orderData: Partial<Order>,
    orderDetails: Partial<OrderDetail>[],
  ): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const orderInsertResult = await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(Order)
        .values(orderData)
        .returning('*')
        .execute();

      const order = orderInsertResult.raw[0];

      const detailsToInsert = orderDetails.map((detail) => ({
        ...detail,
        orderId: order.id,
      }));

      await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(OrderDetail)
        .values(detailsToInsert)
        .execute();

      await queryRunner.commitTransaction();

      const createdOrder = await this.findOrderById(order.id);
      if (!createdOrder) throw new Error('Failed to fetch created order');

      return createdOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findOrderByUserId(userId: string) {
    const [orders, total] = await this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.orderDetails', 'details')
      .leftJoinAndSelect('details.product', 'product')
      .leftJoinAndSelect('details.productVariant', 'variant')
      .where('o.userId = :uId', { uId: userId })
      .orderBy('o.createdAt', 'DESC')
      .getManyAndCount();

    return { orders, total };
  }

  async findOrderById(orderId: string): Promise<Order | null> {
    return await this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.orderDetails', 'details')
      .leftJoinAndSelect('details.product', 'product')
      .leftJoinAndSelect('details.productVariant', 'variant')
      .where('order.id = :orderId', { orderId })
      .getOne();
  }

  async findOrderByOrderNumber(orderNumber: string): Promise<Order | null> {
    return await this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.orderDetails', 'details')
      .leftJoinAndSelect('details.product', 'product')
      .leftJoinAndSelect('details.productVariant', 'variant')
      .where('order.orderNumber = :orderNumber', { orderNumber })
      .getOne();
  }

  async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const count = await this.orderRepo
      .createQueryBuilder('order')
      .where('order.createdAt >= :startOfDay', { startOfDay })
      .andWhere('order.createdAt <= :endOfDay', { endOfDay })
      .getCount();

    const sequence = String(count + 1).padStart(4, '0');
    return `ORD-${year}${month}${day}-${sequence}`;
  }

  async updateOrderStock(
    productVariantId: string,
    quantity: number,
  ): Promise<void> {
    await this.dataSource
      .createQueryBuilder()
      .update('product_variants')
      .set({ stock: () => `stock - ${quantity}` })
      .where('id = :productVariantId', { productVariantId })
      .execute();
  }
}
