import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { OrderDetail } from '../order-details/entity/order-details.entity';
import { ProductVariant } from '../product/entities/product-variant.entity';
import { Product } from '../product/entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto, VariantAttributes } from './dto/order-response.dto';
import { Order } from './entity/order.entity';
import { OrderRepository } from './order.repository';
import { GetOrderDto } from './dto/get-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

interface OrderItemData {
  productId: string;
  productVariantId?: string;
  productName: string;
  // variantAttributes?: Record<string, string>;
  variantAttributes?: VariantAttributes[];
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  imageUrl?: string;
}

@Injectable()
export class OrderService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly orderRepository: OrderRepository,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
  ) {}

  private mapToOrderResponse(order: Order): OrderResponseDto {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerAddress: order.customerAddress,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      note: order.note,
      subtotal: Number(order.subtotal),
      shippingFee: Number(order.shippingFee),
      total: Number(order.total),
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      items:
        order.orderDetails?.map((detail) => ({
          id: detail.id,
          productId: detail.productId,
          productVariantId: detail.productVariantId,
          productName: detail.productName,
          variantAttributes: detail.variantAttributes,
          quantity: detail.quantity,
          unitPrice: Number(detail.unitPrice),
          totalPrice: Number(detail.totalPrice),
          imageUrl: detail.imageUrl,
        })) || [],
      createdAt: order.createdAt,
    };
  }

  async createOrder(createOrderDto: CreateOrderDto): Promise<OrderResponseDto> {
    const orderItems = await this.validateAndGetOrderItems(
      createOrderDto.items,
    );

    const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const total = subtotal;

    const orderNumber = await this.orderRepository.generateOrderNumber();

    const orderData: Partial<Order> = {
      orderNumber,
      customerName: createOrderDto.customerName,
      customerAddress: createOrderDto.customerAddress,
      customerPhone: createOrderDto.customerPhone,
      customerEmail: createOrderDto.customerEmail,
      note: createOrderDto.note,
      subtotal,
      total,
      status: 'pending',
      paymentStatus: 'unpaid',
      paymentMethod: createOrderDto.paymentMethod || 'cod',
      userId: createOrderDto.userId,
      // createdBy: createOrderDto.userId,
      // updatedBy: createOrderDto.userId,
    };

    const orderDetails: Partial<OrderDetail>[] = orderItems.map((item) => ({
      productId: item.productId,
      productVariantId: item.productVariantId,
      productName: item.productName,
      variantAttributes: item.variantAttributes,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      imageUrl: item.imageUrl,
    }));

    const order = await this.orderRepository.createOrder(
      orderData,
      orderDetails,
    );

    for (const item of orderItems) {
      if (item.productVariantId) {
        await this.orderRepository.updateOrderStock(
          item.productVariantId,
          item.quantity,
        );
      }
    }

    return this.mapToOrderResponse(order);
  }

  async migrateOrders(fromUserId: string, toUserId: string) {
    const result = await this.dataSource
      .createQueryBuilder()
      .update(Order)
      .set({ userId: toUserId })
      .where('userId = :fromUserId', { fromUserId })
      .execute();

    return (result?.affected ?? 0) > 0;
  }

  async findAllOrders(getOrderDto: GetOrderDto) {
    return await this.orderRepository.findAllOrders(getOrderDto);
  }

  async findOrderByUserId(userId: string) {
    const { orders, total } =
      await this.orderRepository.findOrderByUserId(userId);

    const mappedOrders = orders.map((order) => this.mapToOrderResponse(order));
    return { orders: mappedOrders, total };
  }

  async findOrderById(orderId: string): Promise<OrderResponseDto> {
    const order = await this.orderRepository.findOrderById(orderId);
    if (!order)
      // throw new NotFoundException(`Order with ID ${orderId} not found`);
      throw new NotFoundException(`Không tìm thấy đơn hàng ${orderId}`);

    return this.mapToOrderResponse(order);
  }

  async findOrderByOrderNumber(orderNumber: string): Promise<OrderResponseDto> {
    const order =
      await this.orderRepository.findOrderByOrderNumber(orderNumber);
    if (!order)
      throw new NotFoundException(`Không tìm thấy đơn hàng ${orderNumber}`);
    // throw new NotFoundException(`Order with number ${orderNumber} not found`);

    return this.mapToOrderResponse(order);
  }

  private async validateAndGetOrderItems(
    items: CreateOrderDto['items'],
  ): Promise<OrderItemData[]> {
    const orderItems: OrderItemData[] = [];

    for (const item of items) {
      const product = await this.productRepo
        .createQueryBuilder('product')
        .leftJoinAndSelect('product.images', 'images')
        .where('product.id = :productId', { productId: item.productId })
        .getOne();

      if (!product)
        throw new NotFoundException(
          `Product with ID ${item.productId} not found`,
        );

      let unitPrice: number;
      // let variantAttributes: Record<string, string> | undefined;
      let variantAttributes: VariantAttributes[] = [];
      let imageUrl: string | undefined;

      if (item.productVariantId) {
        const variant = await this.variantRepo
          .createQueryBuilder('variant')
          .leftJoinAndSelect('variant.optionValues', 'optionValues')
          .leftJoinAndSelect('optionValues.optionValue', 'optionValue')
          .leftJoinAndSelect('optionValue.option', 'option')
          .leftJoinAndSelect('variant.imageMappings', 'imageMappings')
          .leftJoinAndSelect('imageMappings.image', 'image')
          .where('variant.id = :variantId', {
            variantId: item.productVariantId,
          })
          .andWhere('variant.productId = :productId', {
            productId: item.productId,
          })
          .getOne();

        if (!variant)
          throw new NotFoundException(
            `Variant with ID ${item.productVariantId} not found`,
          );

        if (variant.stock < item.quantity)
          throw new BadRequestException(
            // `Insufficient stock for variant ${variant.id}`,
            `Sản phẩm ${product.name} với biến thể ${variant.id} không đủ hàng tồn kho.`,
          );

        unitPrice = Number(variant.price);

        // variantAttributes = {};
        variantAttributes = [];
        if (variant.optionValues) {
          for (const ov of variant.optionValues) {
            if (ov.optionValue?.option) {
              variantAttributes.push({
                name: ov.optionValue.option.name,
                value: ov.optionValue.value,
              });
              // variantAttributes[ov.optionValue.option.name] =
              //   ov.optionValue.value;
            }
          }
        }

        if (variant.imageMappings && variant.imageMappings.length > 0)
          imageUrl = variant.imageMappings[0].image?.url;
      } else {
        if (product.stock == null || product.stock < item.quantity)
          throw new BadRequestException(
            // `Insufficient stock for product ${product.id}`,
            `Sản phẩm ${product.name} không đủ hàng tồn kho.`,
          );

        unitPrice = Number(product.price);
      }

      if (!imageUrl && product.images && product.images.length > 0)
        imageUrl = product.images[0].url;

      orderItems.push({
        productId: item.productId,
        productVariantId: item.productVariantId,
        productName: product.name,
        variantAttributes,
        quantity: item.quantity,
        unitPrice,
        totalPrice: unitPrice * item.quantity,
        imageUrl,
      });
    }

    return orderItems;
  }

  private validateStatusTransition(
    order: Order,
    updateStatusDto: UpdateOrderStatusDto,
  ): void {
    const { status, cancellationReason } = updateStatusDto;

    if (order.status === 'cancelled')
      throw new BadRequestException('Không thể cập nhật đơn hàng đã bị hủy');

    if (order.status === 'delivered')
      throw new BadRequestException(
        'Không thể cập nhật đơn hàng đã giao thành công',
      );

    if (status === 'confirmed')
      if (order.status !== 'pending')
        throw new BadRequestException(
          'Chỉ có thể xác nhận đơn hàng ở trạng thái pending',
        );

    if (status === 'cancelled') {
      if (!cancellationReason || cancellationReason.trim().length === 0)
        throw new BadRequestException('Vui lòng cung cấp lý do hủy đơn hàng');

      if (!['pending', 'confirmed'].includes(order.status))
        throw new BadRequestException(
          'Chỉ có thể hủy đơn hàng ở trạng thái pending hoặc confirmed',
        );
    }
  }

  async updateOrderStatus(
    updateStatusDto: UpdateOrderStatusDto,
    userId: string,
  ) {
    const { id } = updateStatusDto;
    const order = await this.orderRepository.findOrderById(id);

    if (!order)
      throw new NotFoundException(`Không tìm thấy đơn hàng với ID: ${id}`);

    this.validateStatusTransition(order, updateStatusDto);

    return this.orderRepository.updateOrderStatus(
      id,
      updateStatusDto.status,
      userId,
      updateStatusDto.cancellationReason,
    );
  }
}
