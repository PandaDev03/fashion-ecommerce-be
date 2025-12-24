import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import type { Response } from 'express';

import { CreateOrderDto } from './dto/create-order.dto';
import { OrderService } from './order.service';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  async createOrder(
    @Res() res: Response,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    try {
      const result = await this.orderService.createOrder(createOrderDto);

      if (!result)
        return res.status(401).json({
          statusCode: 401,
          message: 'Đặt hàng không thành công',
        });

      return res.status(200).json({
        statusCode: 200,
        message: 'Đặt hàng thành công',
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Đặt hàng thất bại ${error?.message ?? error}`,
      });
    }
  }

  @Post('migrate')
  async migrateOrders(
    @Res() res: Response,
    @Body() migrateDto: { fromUserId: string; toUserId: string },
  ) {
    try {
      const result = await this.orderService.migrateOrders(
        migrateDto.fromUserId,
        migrateDto.toUserId,
      );

      if (!result)
        return res.status(401).json({
          statusCode: 401,
          message: 'Đặt hàng không thành công',
        });

      return res.status(200).json({
        statusCode: 200,
        message: 'Đặt hàng thành công',
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Đặt hàng thất bại ${error?.message ?? error}`,
      });
    }
  }

  @Get(':id')
  async getOrderById(@Res() res: Response, @Param('id') id: string) {
    try {
      const result = await this.orderService.findOrderById(id);

      if (!result)
        return res.status(401).json({
          statusCode: 401,
          message: 'Lấy thông tin đơn hàng không thành công',
        });

      return res.status(200).json({
        statusCode: 200,
        message: 'Lấy thông tin đơn hàng thành công',
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Lấy thông tin đơn hàng thất bại ${error?.message ?? error}`,
      });
    }
  }

  @Get('number/:orderNumber')
  async getOrderByNumber(
    @Res() res: Response,
    @Param('orderNumber') orderNumber: string,
  ) {
    try {
      const result =
        await this.orderService.findOrderByOrderNumber(orderNumber);

      if (!result)
        return res.status(401).json({
          statusCode: 401,
          message: 'Lấy thông tin đơn hàng không thành công',
        });

      return res.status(200).json({
        statusCode: 200,
        message: 'Lấy thông tin đơn hàng thành công',
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Lấy thông tin đơn hàng thất bại ${error?.message ?? error}`,
      });
    }
  }
}
