import { Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';

import { Public } from 'src/common/decorators/public.decorator';
import { RecommendationService } from './recommendation.service';
import { createPaginatedResponse } from 'src/common/utils/function';

@Controller('recommendations')
export class RecommendationController {
  constructor(private recommendationService: RecommendationService) {}

  // @Roles(UserRole.ADMIN)
  @Public()
  @Post('train')
  async trainModel() {
    return this.recommendationService.trainModel();
  }

  @Public()
  @Get('/popular')
  async getPopularProducts(
    @Res() res: Response,
    @Query('limit') limit?: number,
  ) {
    try {
      const result = await this.recommendationService.getPopularProducts(limit);

      if (!result)
        return res.status(401).json({
          statusCode: 401,
          message: 'Lấy thông tin sản phẩm thất bại',
        });

      return res.status(200).json({
        statusCode: 200,
        message: 'Lấy thông tin sản phẩm thành công',
        ...createPaginatedResponse({}, result?.length, result),
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Lấy thông tin sản phẩm thất bại: ${error?.message ?? error}`,
      });
    }
  }

  @Public()
  @Get(':userIdentifier')
  async getRecommendations(
    @Res() res: Response,
    @Param('userIdentifier') userIdentifier: string,
    @Query('limit') limit?: number,
  ) {
    try {
      const result = await this.recommendationService.getRecommendations(
        userIdentifier,
        limit ? parseInt(limit.toString()) : 10,
      );

      if (!result)
        return res.status(401).json({
          statusCode: 401,
          message: 'Lấy thông tin sản phẩm thất bại',
        });

      return res.status(200).json({
        statusCode: 200,
        message: 'Lấy thông tin sản phẩm thành công',
        ...createPaginatedResponse({}, result?.length, result),
      });
    } catch (error) {
      return res.status(500).json({
        statusCode: 500,
        message: `Lấy thông tin sản phẩm thất bại: ${error?.message ?? error}`,
      });
    }
  }
}
