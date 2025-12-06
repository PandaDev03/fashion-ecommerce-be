import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';

import { createPaginatedResponse } from 'src/common/utils/function';
import { BrandService } from './brand.service';
import { GetBrandDto } from './dto/get-brand.dto';

@Controller('brands')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  async findAll(@Res() res: Response, @Query() getBrandDto: GetBrandDto) {
    try {
      const { page, pageSize } = getBrandDto;
      const result = await this.brandService.findAll(getBrandDto);

      if (!result)
        return res.status(401).json({
          statusCode: 401,
          message: 'Lấy thông tin thương hiệu thất bại',
        });

      return res.status(200).json({
        statusCode: 200,
        message: 'Lấy thông tin thương hiệu thành công',
        ...createPaginatedResponse(
          { page, pageSize },
          result.total,
          result.brands,
        ),
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Lấy thông tin thương hiệu thất bại ${error?.message ?? error}`,
      });
    }
  }
}
