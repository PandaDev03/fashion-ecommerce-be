import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { RecommendationService } from './recommendation.service';

@Injectable()
export class RecommendationCron {
  private readonly logger = new Logger(RecommendationCron.name);

  constructor(private recommendationService: RecommendationService) {}

  // Train mỗi 6 giờ
  @Cron('0 */6 * * *')
  async handleModelRetraining() {
    this.logger.log('Starting scheduled model retraining...');
    try {
      const result = await this.recommendationService.trainModel();
      this.logger.log('Model retraining completed:', result);
    } catch (error) {
      this.logger.error('Model retraining failed:', error);
    }
  }
}
