// import { HttpService } from '@nestjs/axios';
// import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { InjectRepository } from '@nestjs/typeorm';
// import { firstValueFrom } from 'rxjs';
// import { Repository } from 'typeorm';

// import { ProductViewHistory } from '../product-view-history/entity/product-view-history.entity';
// import { Product } from '../product/entities/product.entity';

// @Injectable()
// export class RecommendationService {
//   private readonly logger = new Logger(RecommendationService.name);
//   private readonly mlServiceUrl: string;

//   constructor(
//     @InjectRepository(ProductViewHistory)
//     private viewHistoryRepo: Repository<ProductViewHistory>,
//     @InjectRepository(Product)
//     private productRepo: Repository<Product>,
//     private httpService: HttpService,
//     private configService: ConfigService,
//   ) {
//     this.mlServiceUrl = this.configService.get(
//       'ML_SERVICE_URL',
//       'http://localhost:5000',
//     );
//   }

//   /**
//    * Chuẩn bị product data cho ML
//    * Xử lý variants: lấy giá trung bình của tất cả variants
//    */
//   private prepareProductDataForML(products: Product[]) {
//     return products.map((p) => {
//       let productPrice = Number(p.price) || 0;

//       // Nếu có variants, lấy giá trung bình (chính xác hơn cho ML)
//       if (p.hasVariants && p.variants && p.variants?.length > 0) {
//         const prices = p.variants
//           .map((v) => Number(v.price))
//           .filter((price) => price > 0);

//         if (prices.length > 0) {
//           // Tính trung bình cộng
//           const sum = prices.reduce((acc, price) => acc + price, 0);
//           productPrice = sum / prices.length;
//         }
//       }

//       return {
//         id: p.id,
//         categoryId: p.categoryId,
//         brandId: p.brandId,
//         price: productPrice,
//         description: p.description || '',
//         name: p.name,
//         slug: p.slug,
//       };
//     });
//   }

//   /**
//    * Train ML model với toàn bộ products data
//    */
//   async trainModel(): Promise<{ success: boolean; message: string }> {
//     try {
//       this.logger.log('Starting model training...');

//       const products = await this.productRepo.find({
//         where: { status: 'active' },
//         relations: ['category', 'brand', 'variants'],
//       });

//       if (products.length === 0) {
//         throw new HttpException(
//           'No products available for training',
//           HttpStatus.BAD_REQUEST,
//         );
//       }

//       const productsData = this.prepareProductDataForML(products);
//       this.logger.log(`Prepared ${productsData.length} products for training`);

//       const response = await firstValueFrom(
//         this.httpService.post(`${this.mlServiceUrl}/train`, {
//           products: productsData,
//         }),
//       );

//       this.logger.log('Model training completed successfully');
//       return response.data;
//     } catch (error) {
//       this.logger.error('Train model error:', error);
//       throw new HttpException(
//         'Failed to train ML model',
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }
//   }

//   /**
//    * Lấy recommendations cho user
//    */
//   async getRecommendations(
//     userIdentifier: string,
//     limit: number = 10,
//   ): Promise<Product[]> {
//     try {
//       const viewHistory = await this.viewHistoryRepo.find({
//         where: { userIdentifier },
//         order: { viewedAt: 'DESC' },
//         take: 50,
//         relations: ['product'],
//       });

//       if (viewHistory.length === 0) {
//         this.logger.log(`Cold start for user ${userIdentifier}`);
//         return this.getPopularProducts(limit);
//       }

//       const viewHistoryWithScores = viewHistory.map((view) => ({
//         productId: view.productId,
//         engagementScore: view.calculateEngagementScore(),
//       }));

//       const allProducts = await this.productRepo.find({
//         where: { status: 'active' },
//         relations: ['variants'],
//       });

//       const productsData = this.prepareProductDataForML(allProducts);

//       const response = await firstValueFrom(
//         this.httpService.post(`${this.mlServiceUrl}/recommend`, {
//           userIdentifier,
//           viewHistory: viewHistoryWithScores,
//           products: productsData,
//           topN: limit * 2,
//         }),
//       );

//       if (!response.data.success) {
//         throw new Error(response.data.error);
//       }

//       const recommendedIds = response.data.recommendations.map(
//         (r: any) => r.productId,
//       );

//       if (recommendedIds.length === 0) {
//         return this.getPopularProducts(limit);
//       }

//       const products = await this.getProductsByIds(recommendedIds);

//       const sortedProducts = recommendedIds
//         .map((id) => products.find((p) => p.id === id))
//         .filter((p) => p !== undefined)
//         .slice(0, limit);

//       return sortedProducts;
//     } catch (error) {
//       this.logger.error('Get recommendations error:', error);
//       return this.getPopularProducts(limit);
//     }
//   }

//   /**
//    * Lấy products theo IDs với format giống findAll API
//    */
//   private async getProductsByIds(ids: string[]): Promise<Product[]> {
//     const queryBuilder = this.productRepo.createQueryBuilder('product');

//     queryBuilder
//       .leftJoinAndSelect('product.creator', 'creator')
//       .leftJoinAndSelect('product.updater', 'updater')
//       .leftJoinAndSelect('product.category', 'category')
//       .leftJoinAndSelect('product.brand', 'brand')
//       .leftJoinAndSelect('product.images', 'images')
//       .leftJoinAndSelect('product.options', 'productOption')
//       .leftJoinAndSelect('productOption.values', 'productOptionValue');

//     queryBuilder
//       .leftJoinAndSelect('product.variants', 'variant')
//       .leftJoinAndSelect('variant.imageMappings', 'imageMapping')
//       .leftJoinAndSelect('imageMapping.image', 'variantImage')
//       .leftJoinAndSelect('variant.optionValues', 'variantOptionValue')
//       .leftJoinAndSelect('variantOptionValue.optionValue', 'optionValue');

//     queryBuilder
//       .where('product.id IN (:...ids)', { ids })
//       .andWhere('product.status = :status', { status: 'active' });

//     queryBuilder
//       .addOrderBy('productOption.position', 'ASC')
//       .addOrderBy('variantOptionValue.position', 'ASC')
//       .addOrderBy('productOptionValue.position', 'ASC')
//       .addOrderBy('variant.position', 'ASC')
//       .addOrderBy('variantImage.position', 'ASC');

//     const products = await queryBuilder.getMany();

//     return products.map((product) => {
//       if (product.hasVariants && product.options && product.variants?.length) {
//         const usedOptionValueIds = new Set<string>();

//         product.variants.forEach((variant) => {
//           variant.optionValues?.forEach((vo) => {
//             usedOptionValueIds.add(vo.optionValueId);
//           });
//         });

//         product.options = product.options.map((option) => ({
//           ...option,
//           values: option.values?.filter((value) =>
//             usedOptionValueIds.has(value.id),
//           ),
//         }));
//       }

//       return product;
//     });
//   }

//   /**
//    * Get popular products (fallback)
//    */
//   private async getPopularProducts(limit: number = 10): Promise<Product[]> {
//     const popularProductIds = await this.viewHistoryRepo
//       .createQueryBuilder('vh')
//       .select('vh.productId', 'productId')
//       .addSelect('COUNT(*)', 'viewCount')
//       .groupBy('vh.productId')
//       .orderBy('"viewCount"', 'DESC')
//       .limit(limit)
//       .getRawMany();

//     if (popularProductIds.length === 0) {
//       return this.productRepo.find({
//         where: { status: 'active' },
//         take: limit,
//         relations: [
//           'category',
//           'brand',
//           'images',
//           'variants',
//           'variants.imageMappings',
//           'variants.imageMappings.image',
//           'options',
//           'options.values',
//         ],
//         order: { createdAt: 'DESC' },
//       });
//     }

//     const ids = popularProductIds.map((p) => p.productId);
//     return this.getProductsByIds(ids);
//   }
// }

import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';
import { Repository } from 'typeorm';

import { ProductViewHistory } from '../product-view-history/entity/product-view-history.entity';
import { Product } from '../product/entities/product.entity';

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);
  private readonly mlServiceUrl: string;

  constructor(
    @InjectRepository(ProductViewHistory)
    private viewHistoryRepo: Repository<ProductViewHistory>,
    @InjectRepository(Product)
    private productRepo: Repository<Product>,
    private httpService: HttpService,
    private configService: ConfigService,
  ) {
    this.mlServiceUrl = this.configService.get(
      'ML_SERVICE_URL',
      'http://localhost:5000',
    );
  }

  /**
   * Chuẩn bị product data cho ML
   * Xử lý variants: lấy giá trung bình của tất cả variants
   */
  private prepareProductDataForML(products: Product[]) {
    return products.map((p) => {
      let productPrice = Number(p.price) || 0;

      // Nếu có variants, lấy giá trung bình (chính xác hơn cho ML)
      if (p.hasVariants && p.variants && p.variants?.length > 0) {
        const prices = p.variants
          .map((v) => Number(v.price))
          .filter((price) => price > 0);

        if (prices.length > 0) {
          // Tính trung bình cộng
          const sum = prices.reduce((acc, price) => acc + price, 0);
          productPrice = sum / prices.length;
        }
      }

      return {
        id: p.id,
        categoryId: p.categoryId,
        brandId: p.brandId,
        price: productPrice || 0,
        description: p.description || '',
        name: p.name,
        slug: p.slug,
      };
    });
  }

  /**
   * Train ML model với toàn bộ products data
   */
  async trainModel(): Promise<{ success: boolean; message: string }> {
    try {
      // this.logger.log('Starting model training...');

      const products = await this.productRepo.find({
        where: { status: 'active' },
        relations: ['category', 'brand', 'variants'],
      });

      if (products.length === 0) {
        throw new HttpException(
          'No products available for training',
          HttpStatus.BAD_REQUEST,
        );
      }

      const productsData = this.prepareProductDataForML(products);
      // this.logger.log(`Prepared ${productsData.length} products for training`);

      try {
        await firstValueFrom(
          this.httpService.delete(`${this.mlServiceUrl}/model`),
        );
      } catch (e) {
        // Ignore nếu chưa có model
      }

      const response = await firstValueFrom(
        this.httpService.post(`${this.mlServiceUrl}/train`, {
          products: productsData,
        }),
      );

      // this.logger.log('Model training completed successfully');
      return response.data;
    } catch (error) {
      // this.logger.error('Train model error:', error);
      throw new HttpException(
        'Failed to train ML model',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Lấy recommendations cho user
   */
  async getRecommendations(
    userIdentifier: string,
    limit: number = 10,
  ): Promise<Product[]> {
    try {
      const viewHistory = await this.viewHistoryRepo.find({
        where: { userIdentifier },
        order: { viewedAt: 'DESC' },
        take: 50,
        relations: ['product'],
      });

      if (viewHistory.length === 0) {
        // this.logger.log(`Cold start for user ${userIdentifier}`);
        return this.getPopularProducts(limit);
      }

      // console.log('viewHistory', viewHistory);

      const viewHistoryWithScores = viewHistory.map((view) => ({
        productId: view.productId,
        engagementScore: view.calculateEngagementScore(),
      }));

      const allProducts = await this.productRepo.find({
        where: { status: 'active' },
        relations: ['variants'],
      });

      const productsData = this.prepareProductDataForML(allProducts);

      const response = await firstValueFrom(
        this.httpService.post(`${this.mlServiceUrl}/recommend`, {
          userIdentifier,
          viewHistory: viewHistoryWithScores,
          products: productsData,
          topN: limit * 2,
        }),
      );

      if (!response.data.success) throw new Error(response.data.error);

      const recommendedIds = response.data.recommendations.map(
        (r: any) => r.productId,
      );

      console.log('recommendedIds', recommendedIds);

      if (recommendedIds.length === 0) return this.getPopularProducts(limit);

      const products = await this.getProductsByIds(recommendedIds);

      const sortedProducts = recommendedIds
        .map((id) => products.find((p) => p.id === id))
        .filter((p) => p !== undefined)
        .slice(0, limit);

      return sortedProducts;
    } catch (error) {
      this.logger.error('Get recommendations error:', error);

      return this.getPopularProducts(limit);
    }
  }

  /**
   * Lấy products theo IDs với format giống findAll API
   */
  private async getProductsByIds(ids: string[]): Promise<Product[]> {
    const queryBuilder = this.productRepo.createQueryBuilder('product');

    queryBuilder
      .leftJoinAndSelect('product.creator', 'creator')
      .leftJoinAndSelect('product.updater', 'updater')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('product.options', 'productOption')
      .leftJoinAndSelect('productOption.values', 'productOptionValue');

    queryBuilder
      .leftJoinAndSelect('product.variants', 'variant')
      .leftJoinAndSelect('variant.imageMappings', 'imageMapping')
      .leftJoinAndSelect('imageMapping.image', 'variantImage')
      .leftJoinAndSelect('variant.optionValues', 'variantOptionValue')
      .leftJoinAndSelect('variantOptionValue.optionValue', 'optionValue');

    queryBuilder
      .where('product.id IN (:...ids)', { ids })
      .andWhere('product.status = :status', { status: 'active' });

    queryBuilder
      .addOrderBy('productOption.position', 'ASC')
      .addOrderBy('variantOptionValue.position', 'ASC')
      .addOrderBy('productOptionValue.position', 'ASC')
      .addOrderBy('variant.position', 'ASC')
      .addOrderBy('variantImage.position', 'ASC');

    const products = await queryBuilder.getMany();

    return products.map((product) => {
      if (product.hasVariants && product.options && product.variants?.length) {
        const usedOptionValueIds = new Set<string>();

        product.variants.forEach((variant) => {
          variant.optionValues?.forEach((vo) => {
            usedOptionValueIds.add(vo.optionValueId);
          });
        });

        product.options = product.options.map((option) => ({
          ...option,
          values: option.values?.filter((value) =>
            usedOptionValueIds.has(value.id),
          ),
        }));
      }

      return product;
    });
  }

  /**
   * Get popular products (fallback)
   */
  async getPopularProducts(limit: number = 10): Promise<Product[]> {
    const popularProductIds = await this.viewHistoryRepo
      .createQueryBuilder('vh')
      .select('vh.productId', 'productId')
      .addSelect('COUNT(*)', 'view_count')
      .groupBy('vh.productId')
      .orderBy('view_count', 'DESC')
      .limit(limit)
      .getRawMany();

    console.log('popularProductIds', popularProductIds);

    if (popularProductIds.length === 0) {
      return this.productRepo.find({
        where: { status: 'active' },
        take: limit,
        relations: [
          'category',
          'brand',
          'images',
          'variants',
          'variants.imageMappings',
          'variants.imageMappings.image',
          'options',
          'options.values',
        ],
        order: { createdAt: 'DESC' },
      });
    }

    const ids = popularProductIds.map((p) => p.productId);
    return this.getProductsByIds(ids);
  }
}
