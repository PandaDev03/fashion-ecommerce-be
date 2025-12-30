import { Test, TestingModule } from '@nestjs/testing';
import { ProductViewHistoryController } from './product-view-history.controller';

describe('ProductViewHistoryController', () => {
  let controller: ProductViewHistoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductViewHistoryController],
    }).compile();

    controller = module.get<ProductViewHistoryController>(ProductViewHistoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
