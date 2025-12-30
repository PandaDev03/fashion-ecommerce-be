import { Controller, Get, Param, Post, Query } from '@nestjs/common';

import { Public } from 'src/common/decorators/public.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/role.enum';
import { RecommendationService } from './recommendation.service';

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
  @Get(':userIdentifier')
  async getRecommendations(
    @Param('userIdentifier') userIdentifier: string,
    @Query('limit') limit?: number,
  ) {
    const products = await this.recommendationService.getRecommendations(
      userIdentifier,
      limit ? parseInt(limit.toString()) : 10,
    );

    return {
      products,
      total: products.length,
    };
  }
}
