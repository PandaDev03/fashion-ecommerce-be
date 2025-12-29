import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

import { Public } from 'src/common/decorators/public.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/role.enum';
import { createPaginatedResponse } from 'src/common/utils/function';
import { CreateOrderDto } from './dto/create-order.dto';
import { GetOrderDto } from './dto/get-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderService } from './order.service';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Public()
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
        message: `Đặt hàng thất bại: ${error?.message ?? error}`,
      });
    }
  }

  @Public()
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
        message: `Đặt hàng thất bại: ${error?.message ?? error}`,
      });
    }
  }

  // @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.ADMIN)
  @Get()
  async findAllOrders(@Res() res: Response, @Query() getOrderDto: GetOrderDto) {
    try {
      const { page, pageSize } = getOrderDto;
      const result = await this.orderService.findAllOrders(getOrderDto);

      if (!result)
        return res.status(401).json({
          statusCode: 401,
          message: 'Lấy thông tin đơn hàng thất bại',
        });

      return res.status(200).json({
        statusCode: 200,
        message: 'Lấy thông tin đơn hàng thành công',
        ...createPaginatedResponse(
          { page, pageSize },
          result?.total,
          result?.orders,
        ),
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Lấy thông tin đơn hàng thất bại: ${error?.message ?? error}`,
      });
    }
  }

  // @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.USER, UserRole.ADMIN)
  @Get('user')
  async getOrderByUserId(@Request() req: any, @Res() res: Response) {
    try {
      const result = await this.orderService.findOrderByUserId(req.user.userId);

      if (!result)
        return res.status(401).json({
          statusCode: 401,
          message: 'Lấy thông tin đơn hàng không thành công',
        });

      return res.status(200).json({
        statusCode: 200,
        message: 'Lấy thông tin đơn hàng thành công',
        ...createPaginatedResponse({}, result.total, result.orders),
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Lấy thông tin đơn hàng thất bại: ${error?.message ?? error}`,
      });
    }
  }

  @Public()
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
        message: `Lấy thông tin đơn hàng thất bại: ${error?.message ?? error}`,
      });
    }
  }

  @Public()
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
        message: `Lấy thông tin đơn hàng thất bại: ${error?.message ?? error}`,
      });
    }
  }

  // @UseGuards(AuthGuard('jwt'))
  @Roles(UserRole.ADMIN)
  @Put('/status')
  async updateOrderStatus(
    @Request() req: any,
    @Res() res: Response,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    try {
      const order = await this.orderService.updateOrderStatus(
        updateStatusDto,
        req.user.userId,
      );

      if (!order)
        return res.status(401).json({
          statusCode: 401,
          message: 'Cập nhật trạng thái đơn hàng không thành công',
        });

      return res.status(200).json({
        statusCode: 200,
        message: 'Cập nhật trạng thái đơn hàng thành công',
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Cập nhật trạng thái đơn hàng thất bại: ${error?.message ?? error}`,
      });
    }
  }
}
