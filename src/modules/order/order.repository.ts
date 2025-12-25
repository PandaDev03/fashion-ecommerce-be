import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { OrderDetail } from '../order-details/entity/order-details.entity';
import { Order } from './entity/order.entity';
import { GetOrderDto } from './dto/get-order.dto';
import { getSkipTakeParams } from 'src/common/utils/function';

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

  async findAllOrders(getOrderDto: GetOrderDto) {
    const {
      page,
      pageSize,
      search,
      status,
      paymentStatus,
      createdFrom,
      createdTo,
    } = getOrderDto;

    const queryBuilder = this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.orderDetails', 'details')
      .leftJoinAndSelect('order.updater', 'updater');

    if (status) queryBuilder.andWhere('order.status = :status', { status });

    if (paymentStatus) {
      queryBuilder.andWhere('order.paymentStatus = :paymentStatus', {
        paymentStatus,
      });
    }

    if (createdFrom)
      queryBuilder.andWhere('order.createdAt >= :createdFrom', { createdFrom });

    if (createdTo)
      queryBuilder.andWhere('order.createdAt <= :createdTo', { createdTo });

    if (search)
      queryBuilder.andWhere(
        '(order.orderNumber LIKE :search OR order.customerName LIKE :search OR order.customerEmail LIKE :search OR order.customerPhone LIKE :search)',
        { search: `%${search}%` },
      );

    queryBuilder.orderBy('order.createdAt', 'DESC');

    const { skip, take } = getSkipTakeParams({ page, pageSize });
    if (skip !== undefined) queryBuilder.skip(skip);
    if (take !== undefined) queryBuilder.take(take);

    const [orders, total] = await queryBuilder.getManyAndCount();

    return {
      orders,
      total,
    };
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

  async updateOrderStatus(
    orderId: string,
    status: string,
    // paymentStatus?: string,
    updatedBy?: string,
    cancellationReason?: string,
  ): Promise<boolean> {
    const updateData: any = {
      status,
      updatedBy,
    };

    // if (paymentStatus) {
    //   updateData.paymentStatus = paymentStatus;
    // }

    const now = new Date();

    if (status === 'confirmed') updateData.confirmedAt = now;

    if (status === 'delivered') updateData.deliveredAt = now;

    if (status === 'cancelled') {
      updateData.cancelledAt = now;

      if (cancellationReason)
        updateData.cancellationReason = cancellationReason;
    }

    const result = await this.orderRepo
      .createQueryBuilder()
      .update(Order)
      .set(updateData)
      .where('id = :orderId', { orderId })
      .execute();

    return (result?.affected ?? 0) > 0;
  }
}
