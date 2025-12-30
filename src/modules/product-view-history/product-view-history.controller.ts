import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';

import { Public } from 'src/common/decorators/public.decorator';
import { TrackProductViewDto } from './dto/track-product-view.dto';
import { ProductViewHistoryService } from './product-view-history.service';

@Controller('product-view-history')
export class ProductViewHistoryController {
  constructor(private productViewHistoryService: ProductViewHistoryService) {}

  @Public()
  @Post('track')
  async trackView(
    @Body()
    trackProductViewDto: TrackProductViewDto,
  ) {
    const { userIdentifier, productId } = trackProductViewDto;

    return this.productViewHistoryService.trackView(
      userIdentifier,
      productId,
      trackProductViewDto,
    );
  }

  @Public()
  @Get(':userIdentifier')
  async getUserHistory(
    @Param('userIdentifier') userIdentifier: string,
    @Query('limit') limit?: number,
  ) {
    return this.productViewHistoryService.getUserHistory(
      userIdentifier,
      limit ? parseInt(limit.toString()) : 50,
    );
  }
}
