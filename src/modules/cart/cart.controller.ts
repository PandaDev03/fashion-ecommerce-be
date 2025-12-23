import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';

import { CartService } from './cart.service';
import { GetCartDto } from './dto/get-cart.dto';

@Controller('carts')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async findCartItems(@Res() res: Response, @Body() getCartDto: GetCartDto) {
    try {
      const result = await this.cartService.findCartItems(getCartDto.items);

      if (!result)
        return res.status(401).json({
          statusCode: 401,
          message: 'Lấy thông tin giỏ hàng thất bại',
        });

      return res.status(200).json({
        statusCode: 200,
        message: 'Lấy thông tin giỏ hàng thành công',
        data: result.data,
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Lấy thông tin giỏ hàng thất bại ${error?.message ?? error}`,
      });
    }
  }
}
