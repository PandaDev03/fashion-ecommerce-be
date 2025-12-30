import { Test, TestingModule } from '@nestjs/testing';
import { ProductViewHistoryService } from './product-view-history.service';

describe('ProductViewHistoryService', () => {
  let service: ProductViewHistoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductViewHistoryService],
    }).compile();

    service = module.get<ProductViewHistoryService>(ProductViewHistoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
