import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { GetProductBySlugDto } from './dto/get-product-by-slug.dto';
import { GetProductDto } from './dto/get-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductOption } from './entities/product-option.entity';
import { ProductVariantImageMapping } from './entities/product-variant-image-mapping.entity';
import { ProductVariantImage } from './entities/product-variant-image.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { Product } from './entities/product.entity';
import { ProductRepository } from './product.repository';
import { ProductOptionValue } from './entities/product-option-value.entity';
import { ProductVariantOptionValue } from './entities/product-variant-option-value.entity';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';

@Injectable()
export class ProductService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly productRepository: ProductRepository,
  ) {}

  private async getColorOptionId(
    manager: EntityManager,
    productId: string,
  ): Promise<string | null> {
    const optionRepo = manager.getRepository(ProductOption);

    const colorOptionNames = ['màu sắc', 'color', 'màu', 'mau sac'];

    const colorOption = await optionRepo
      .createQueryBuilder('option')
      .where('option.productId = :productId', { productId })
      .andWhere('LOWER(option.name) IN (:...names)', {
        names: colorOptionNames,
      })
      .getOne();

    return colorOption?.id || null;
  }

  private getColorOptionValueId(
    optionValues: any[],
    colorOptionId: string,
  ): string | null {
    const colorOptionValue = optionValues.find(
      (ov) => ov.optionId === colorOptionId,
    );

    return colorOptionValue?.optionValueId || null;
  }

  private async getColorOptionValueIdFromVariant(
    manager: EntityManager,
    variantId: string,
    productId: string,
  ): Promise<string | null> {
    const colorOptionId = await this.getColorOptionId(manager, productId);

    if (!colorOptionId) {
      return null;
    }

    const variantOptionValueRepo = manager.getRepository(
      ProductVariantOptionValue,
    );

    const variantOptionValue = await variantOptionValueRepo
      .createQueryBuilder('vov')
      .leftJoin('vov.optionValue', 'ov')
      .where('vov.variantId = :variantId', { variantId })
      .andWhere('ov.optionId = :colorOptionId', { colorOptionId })
      .getOne();

    return variantOptionValue?.optionValueId || null;
  }

  private async getVariantsBySameColor(
    manager: EntityManager,
    productId: string,
    colorOptionValueId: string | null,
  ): Promise<ProductVariant[]> {
    const variantRepo = manager.getRepository(ProductVariant);

    return await variantRepo
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.optionValues', 'variantOptionValue')
      .where('variant.productId = :productId', { productId })
      .andWhere('variantOptionValue.optionValueId = :colorOptionValueId', {
        colorOptionValueId,
      })
      .getMany();
  }

  async findAll(getProductDto: GetProductDto) {
    return await this.productRepository.findAll(getProductDto);
  }

  async findBySlug(getProductBySlugDto: GetProductBySlugDto) {
    const { slug } = getProductBySlugDto;
    return await this.productRepository.findBySlug(slug);
  }

  async getProductOptions(productId: string) {
    return await this.dataSource.transaction(async (manager) => {
      const optionRepo = manager.getRepository(ProductOption);

      const options = await optionRepo
        .createQueryBuilder('option')
        .where('option.productId = :productId', { productId })
        .leftJoinAndSelect('option.values', 'value')
        .orderBy('option.position', 'ASC')
        .addOrderBy('value.position', 'ASC')
        .getMany();

      return options.map((option) => ({
        id: option.id,
        name: option.name,
        position: option.position,
        values: option.values?.map((value) => ({
          id: value.id,
          value: value.value,
          position: value.position,
        })),
      }));
    });
  }

  // async createVariant(createVariantDto: ICreate<CreateProductVariantDto>) {
  //   return await this.dataSource.transaction(async (manager) => {
  //     const { createdBy, variables } = createVariantDto;
  //     // const { productId, price, stock, status, position, optionValues, images } =
  //     const { productId, price, stock, status, position, optionValues } =
  //       variables;

  //     const variantRepo = manager.getRepository(ProductVariant);
  //     const optionRepo = manager.getRepository(ProductOption);
  //     const optionValueRepo = manager.getRepository(ProductOptionValue);
  //     const variantOptionValueRepo = manager.getRepository(
  //       ProductVariantOptionValue,
  //     );

  //     // 1. Kiểm tra variant đã tồn tại với option values này chưa
  //     const existingVariants = await variantRepo
  //       .createQueryBuilder('variant')
  //       .where('variant.productId = :productId', { productId })
  //       .leftJoinAndSelect('variant.optionValues', 'variantOptionValue')
  //       .getMany();

  //     // Lấy danh sách optionValueIds từ request
  //     const requestOptionValueIds = optionValues
  //       .map((ov) => ov.optionValueId)
  //       .filter(Boolean)
  //       .sort();

  //     // Check xem có variant nào trùng option values không
  //     for (const existingVariant of existingVariants) {
  //       const existingOptionValueIds = (
  //         existingVariant.optionValues?.map((vo) => vo.optionValueId) || []
  //       ).sort();

  //       if (
  //         JSON.stringify(existingOptionValueIds) ===
  //         JSON.stringify(requestOptionValueIds)
  //       ) {
  //         throw new Error('Biến thể với các thuộc tính này đã tồn tại!');
  //       }
  //     }

  //     // 2. Lấy position cao nhất hiện tại
  //     const maxPositionResult = await variantRepo
  //       .createQueryBuilder('variant')
  //       .where('variant.productId = :productId', { productId })
  //       .select('MAX(variant.position)', 'maxPosition')
  //       .getRawOne();

  //     const newPosition =
  //       position ?? (maxPositionResult?.maxPosition ?? -1) + 1;

  //     // 3. Tạo variant mới
  //     const insertVariantResult = await variantRepo
  //       .createQueryBuilder()
  //       .insert()
  //       .values({
  //         productId,
  //         price,
  //         stock,
  //         status: status ?? 'active',
  //         position: newPosition,
  //         createdBy,
  //         updatedBy: createdBy,
  //       })
  //       .execute();

  //     const variantId = insertVariantResult.identifiers[0].id;

  //     const sortedOptionValues = await Promise.all(
  //       optionValues.map(async (ov) => {
  //         const option = await optionRepo.findOne({
  //           where: { id: ov.optionId },
  //         });
  //         return {
  //           ...ov,
  //           optionPosition: option?.position ?? 999,
  //         };
  //       }),
  //     );

  //     sortedOptionValues.sort((a, b) => a.optionPosition - b.optionPosition);

  //     // 4. Xử lý option values
  //     for (const [index, optionValue] of sortedOptionValues.entries()) {
  //       const { optionId, optionValueId, value, isNew } = optionValue;

  //       let finalOptionValueId: string;

  //       if (isNew && value) {
  //         const maxPosition = await optionValueRepo
  //           .createQueryBuilder('optionValue')
  //           .where('optionValue.optionId = :optionId', { optionId })
  //           .select('MAX(optionValue.position)', 'maxPosition')
  //           .getRawOne();

  //         const newValuePosition = (maxPosition?.maxPosition ?? -1) + 1;

  //         const insertResult = await optionValueRepo
  //           .createQueryBuilder()
  //           .insert()
  //           .values({
  //             optionId,
  //             value,
  //             position: newValuePosition,
  //             createdBy,
  //             updatedBy: createdBy,
  //           })
  //           .execute();

  //         finalOptionValueId = insertResult.identifiers[0].id;
  //       } else if (optionValueId) {
  //         finalOptionValueId = optionValueId;
  //       } else {
  //         throw new Error('Thông tin option value không hợp lệ!');
  //       }

  //       // 5. Tạo mapping giữa variant và option value
  //       await variantOptionValueRepo
  //         .createQueryBuilder()
  //         .insert()
  //         .values({
  //           variantId,
  //           optionValueId: finalOptionValueId,
  //           createdBy,
  //           position: index,
  //           updatedBy: createdBy,
  //         })
  //         .execute();
  //     }

  //     return {
  //       success: true,
  //       variantId,
  //     };
  //   });
  // }

  async createVariant(createVariantDto: ICreate<CreateProductVariantDto>) {
    return await this.dataSource.transaction(async (manager) => {
      const { createdBy, variables } = createVariantDto;
      const {
        productId,
        price,
        stock,
        status,
        position,
        optionValues,
        images,
      } = variables;

      const variantRepo = manager.getRepository(ProductVariant);
      const optionRepo = manager.getRepository(ProductOption);
      const optionValueRepo = manager.getRepository(ProductOptionValue);
      const variantOptionValueRepo = manager.getRepository(
        ProductVariantOptionValue,
      );
      const imageRepo = manager.getRepository(ProductVariantImage);
      const imageMappingRepo = manager.getRepository(
        ProductVariantImageMapping,
      );

      // 1. Kiểm tra variant đã tồn tại với option values này chưa
      const existingVariants = await variantRepo
        .createQueryBuilder('variant')
        .where('variant.productId = :productId', { productId })
        .leftJoinAndSelect('variant.optionValues', 'variantOptionValue')
        .getMany();

      // Lấy danh sách optionValueIds từ request
      const requestOptionValueIds = optionValues
        .map((ov) => ov.optionValueId)
        .filter(Boolean)
        .sort();

      // Check xem có variant nào trùng option values không
      for (const existingVariant of existingVariants) {
        const existingOptionValueIds = (
          existingVariant.optionValues?.map((vo) => vo.optionValueId) || []
        ).sort();

        if (
          JSON.stringify(existingOptionValueIds) ===
          JSON.stringify(requestOptionValueIds)
        ) {
          throw new Error('Biến thể với các thuộc tính này đã tồn tại!');
        }
      }

      // 2. Lấy position cao nhất hiện tại
      const maxPositionResult = await variantRepo
        .createQueryBuilder('variant')
        .where('variant.productId = :productId', { productId })
        .select('MAX(variant.position)', 'maxPosition')
        .getRawOne();

      const newPosition =
        position ?? (maxPositionResult?.maxPosition ?? -1) + 1;

      // 3. Tạo variant mới
      const insertVariantResult = await variantRepo
        .createQueryBuilder()
        .insert()
        .values({
          productId,
          price,
          stock,
          status: status ?? 'active',
          position: newPosition,
          createdBy,
          updatedBy: createdBy,
        })
        .execute();

      const variantId = insertVariantResult.identifiers[0].id;

      // 4. Sắp xếp option values theo position của ProductOption
      const sortedOptionValues = await Promise.all(
        optionValues.map(async (ov) => {
          const option = await optionRepo.findOne({
            where: { id: ov.optionId },
          });
          return {
            ...ov,
            optionPosition: option?.position ?? 999,
          };
        }),
      );

      sortedOptionValues.sort((a, b) => a.optionPosition - b.optionPosition);

      // 5. Xử lý option values
      for (const [index, optionValue] of sortedOptionValues.entries()) {
        const { optionId, optionValueId, value, isNew } = optionValue;

        let finalOptionValueId: string;

        if (isNew && value) {
          const maxPosition = await optionValueRepo
            .createQueryBuilder('optionValue')
            .where('optionValue.optionId = :optionId', { optionId })
            .select('MAX(optionValue.position)', 'maxPosition')
            .getRawOne();

          const newValuePosition = (maxPosition?.maxPosition ?? -1) + 1;

          const insertResult = await optionValueRepo
            .createQueryBuilder()
            .insert()
            .values({
              optionId,
              value,
              position: newValuePosition,
              createdBy,
              updatedBy: createdBy,
            })
            .execute();

          finalOptionValueId = insertResult.identifiers[0].id;
        } else if (optionValueId) {
          finalOptionValueId = optionValueId;
        } else {
          throw new Error('Thông tin option value không hợp lệ!');
        }

        // Tạo mapping giữa variant và option value
        await variantOptionValueRepo
          .createQueryBuilder()
          .insert()
          .values({
            variantId,
            optionValueId: finalOptionValueId,
            position: index,
            createdBy,
            updatedBy: createdBy,
          })
          .execute();
      }

      // 6. Xử lý images
      if (images && images.length > 0) {
        // Trường hợp 1: User upload ảnh mới cho variant này
        for (let i = 0; i < images.length; i++) {
          const imageDto = images[i];
          let imageId = imageDto.imageId;

          // Nếu chưa có imageId, tạo image mới
          if (!imageId) {
            const insertResult = await imageRepo
              .createQueryBuilder()
              .insert()
              .values({
                url: imageDto.url,
                position: imageDto.position ?? i,
                createdBy,
                updatedBy: createdBy,
              })
              .execute();

            imageId = insertResult.identifiers[0].id;
          }

          // Tạo mapping
          await imageMappingRepo
            .createQueryBuilder()
            .insert()
            .values({
              variantId,
              imageId,
              position: i,
              createdBy,
              updatedBy: createdBy,
            })
            .execute();
        }
      } else {
        // Trường hợp 2: Không có ảnh mới -> Tự động copy ảnh từ variant cùng màu
        const colorOptionId = await this.getColorOptionId(manager, productId);

        if (colorOptionId) {
          const colorOptionValueId = this.getColorOptionValueId(
            sortedOptionValues,
            colorOptionId,
          );

          if (colorOptionValueId) {
            // Tìm variant khác có cùng màu sắc
            const sameColorVariant = await variantRepo
              .createQueryBuilder('variant')
              .leftJoinAndSelect('variant.optionValues', 'variantOptionValue')
              .leftJoinAndSelect('variant.imageMappings', 'imageMapping')
              .leftJoinAndSelect('imageMapping.image', 'image')
              .where('variant.productId = :productId', { productId })
              .andWhere('variant.id != :variantId', { variantId })
              .andWhere(
                'variantOptionValue.optionValueId = :colorOptionValueId',
                {
                  colorOptionValueId,
                },
              )
              .getOne();

            // Nếu tìm thấy variant cùng màu và có ảnh, copy sang
            if (
              sameColorVariant?.imageMappings &&
              sameColorVariant.imageMappings.length > 0
            ) {
              for (const [
                index,
                mapping,
              ] of sameColorVariant.imageMappings.entries()) {
                await imageMappingRepo
                  .createQueryBuilder()
                  .insert()
                  .values({
                    variantId,
                    imageId: mapping.imageId,
                    position: index,
                    createdBy,
                    updatedBy: createdBy,
                  })
                  .execute();
              }
            }
          }
        }
      }

      return {
        success: true,
        variantId,
      };
    });
  }

  // async update(updateProductDto: IUpdate<UpdateProductDto>) {
  //   return await this.dataSource.transaction(async (manager) => {
  //     const { updatedBy, variables } = updateProductDto;
  //     const {
  //       productId,
  //       name,
  //       description,
  //       slug,
  //       categoryId,
  //       brandId,
  //       variantId,
  //       price,
  //       stock,
  //       status,
  //       position,
  //       images,
  //     } = variables;

  //     const productRepo = manager.getRepository(Product);
  //     const variantRepo = manager.getRepository(ProductVariant);
  //     const mappingRepo = manager.getRepository(ProductVariantImageMapping);
  //     const imageRepo = manager.getRepository(ProductVariantImage);

  //     const productData: any = {};
  //     if (name !== undefined) productData.name = name;
  //     if (description !== undefined) productData.description = description;
  //     if (slug !== undefined) productData.slug = slug;
  //     if (categoryId !== undefined) productData.categoryId = categoryId;
  //     if (brandId !== undefined) productData.brandId = brandId;

  //     if (Object.keys(productData).length > 0) {
  //       await productRepo
  //         .createQueryBuilder()
  //         .update()
  //         .set({
  //           ...productData,
  //           updatedBy,
  //         })
  //         .where('id = :productId', { productId })
  //         .execute();
  //     }

  //     const variantData: any = {};
  //     if (price !== undefined) variantData.price = price;
  //     if (stock !== undefined) variantData.stock = stock;
  //     if (status !== undefined) variantData.status = status;
  //     if (position !== undefined) variantData.position = position;

  //     if (variantId && Object.keys(variantData).length > 0) {
  //       await variantRepo
  //         .createQueryBuilder()
  //         .update()
  //         .set({
  //           ...variantData,
  //           updatedBy,
  //         })
  //         .where('id = :variantId', { variantId })
  //         .execute();
  //     }

  //     // if (variantId && images && images.length > 0) {
  //     if (variantId && images !== undefined) {
  //       const oldMappings = await mappingRepo
  //         .createQueryBuilder('mapping')
  //         .where('mapping.variantId = :variantId', { variantId })
  //         .getMany();

  //       const oldImageIds = oldMappings.map((m) => m.imageId);

  //       const imageIdsToKeep = images
  //         .filter((img) => img.imageId)
  //         .map((img) => img.imageId);

  //       const imageIdsToDelete = oldImageIds.filter(
  //         (id) => !imageIdsToKeep.includes(id),
  //       );

  //       await mappingRepo
  //         .createQueryBuilder()
  //         .delete()
  //         .where('variantId = :variantId', { variantId })
  //         .execute();

  //       if (imageIdsToDelete.length > 0)
  //         await imageRepo
  //           .createQueryBuilder()
  //           .delete()
  //           .whereInIds(imageIdsToDelete)
  //           .execute();

  //       for (let i = 0; i < images.length; i++) {
  //         const imageDto = images[i];
  //         let imageId = imageDto.imageId;

  //         if (!imageId) {
  //           const insertResult = await imageRepo
  //             .createQueryBuilder()
  //             .insert()
  //             .values({
  //               url: imageDto.url,
  //               position: i,
  //               createdBy: updatedBy,
  //               updatedBy: updatedBy,
  //             })
  //             .execute();

  //           imageId = insertResult.identifiers[0].id;
  //         }

  //         await mappingRepo
  //           .createQueryBuilder()
  //           .insert()
  //           .values({
  //             variantId,
  //             imageId,
  //             position: i,
  //             createdBy: updatedBy,
  //             updatedBy: updatedBy,
  //           })
  //           .execute();
  //       }
  //     }

  //     return {
  //       success: true,
  //       affected: {
  //         product: Object.keys(productData).length > 0 ? 1 : 0,
  //         variant: variantId && Object.keys(variantData).length > 0 ? 1 : 0,
  //         images: images ? images.length : 0,
  //       },
  //     };
  //   });
  // }

  // async updateVariant(updateVariantDto: IUpdate<UpdateProductVariantDto>) {
  //   return await this.dataSource.transaction(async (manager) => {
  //     const { updatedBy, variables } = updateVariantDto;
  //     const { variantId, price, stock, status, position, optionValues } =
  //       variables;

  //     const variantRepo = manager.getRepository(ProductVariant);
  //     const optionValueRepo = manager.getRepository(ProductOptionValue);
  //     const variantOptionValueRepo = manager.getRepository(
  //       ProductVariantOptionValue,
  //     );
  //     // const imageRepo = manager.getRepository(ProductVariantImage);
  //     const imageMappingRepo = manager.getRepository(
  //       ProductVariantImageMapping,
  //     );

  //     // 1. Kiểm tra variant có tồn tại không
  //     const existingVariant = await variantRepo.findOne({
  //       where: { id: variantId },
  //       relations: ['optionValues'],
  //     });

  //     if (!existingVariant) {
  //       throw new Error('Biến thể không tồn tại!');
  //     }

  //     // 2. Nếu có optionValues mới, kiểm tra trùng lặp với các variant khác
  //     if (optionValues && optionValues.length > 0) {
  //       // Lấy tất cả variants của cùng product (trừ variant hiện tại)
  //       const otherVariants = await variantRepo
  //         .createQueryBuilder('variant')
  //         .where('variant.productId = :productId', {
  //           productId: existingVariant.productId,
  //         })
  //         .andWhere('variant.id != :variantId', { variantId })
  //         .leftJoinAndSelect('variant.optionValues', 'variantOptionValue')
  //         .getMany();

  //       // Lấy danh sách optionValueIds mới từ request
  //       const newOptionValueIds = optionValues
  //         .map((ov) => ov.optionValueId)
  //         .filter(Boolean)
  //         .sort();

  //       // Check xem có variant nào trùng option values không
  //       for (const otherVariant of otherVariants) {
  //         const otherOptionValueIds = (
  //           otherVariant.optionValues?.map((vo) => vo.optionValueId) || []
  //         ).sort();

  //         if (
  //           JSON.stringify(otherOptionValueIds) ===
  //           JSON.stringify(newOptionValueIds)
  //         ) {
  //           throw new Error('Biến thể với các thuộc tính này đã tồn tại!');
  //         }
  //       }

  //       // 3. Xóa tất cả option values cũ của variant
  //       await variantOptionValueRepo
  //         .createQueryBuilder()
  //         .delete()
  //         .where('variantId = :variantId', { variantId })
  //         .execute();

  //       // 4. Thêm option values mới
  //       for (const optionValue of optionValues) {
  //         const { optionId, optionValueId, value, isNew } = optionValue;

  //         let finalOptionValueId: string;

  //         if (isNew && value) {
  //           // Nếu là option value mới, tạo mới
  //           const maxPosition = await optionValueRepo
  //             .createQueryBuilder('optionValue')
  //             .where('optionValue.optionId = :optionId', { optionId })
  //             .select('MAX(optionValue.position)', 'maxPosition')
  //             .getRawOne();

  //           const newValuePosition = (maxPosition?.maxPosition ?? -1) + 1;

  //           const insertResult = await optionValueRepo
  //             .createQueryBuilder()
  //             .insert()
  //             .values({
  //               optionId,
  //               value,
  //               position: newValuePosition,
  //               createdBy: updatedBy,
  //               updatedBy: updatedBy,
  //             })
  //             .execute();

  //           finalOptionValueId = insertResult.identifiers[0].id;
  //         } else if (optionValueId) {
  //           // Nếu là option value có sẵn, dùng ID
  //           finalOptionValueId = optionValueId;
  //         } else {
  //           throw new Error('Thông tin option value không hợp lệ!');
  //         }

  //         // Tạo mapping giữa variant và option value
  //         await variantOptionValueRepo
  //           .createQueryBuilder()
  //           .insert()
  //           .values({
  //             variantId,
  //             optionValueId: finalOptionValueId,
  //             createdBy: updatedBy,
  //             updatedBy: updatedBy,
  //           })
  //           .execute();
  //       }
  //     }

  //     // 5. Cập nhật thông tin variant (price, stock, status, position)
  //     const variantData: any = {};
  //     if (price !== undefined) variantData.price = price;
  //     if (stock !== undefined) variantData.stock = stock;
  //     if (status !== undefined) variantData.status = status;
  //     if (position !== undefined) variantData.position = position;

  //     if (Object.keys(variantData).length > 0) {
  //       await variantRepo
  //         .createQueryBuilder()
  //         .update()
  //         .set({
  //           ...variantData,
  //           updatedBy,
  //         })
  //         .where('id = :variantId', { variantId })
  //         .execute();
  //     }

  //     // 7. Trả về variant đã cập nhật với đầy đủ relations
  //     return await variantRepo
  //       .createQueryBuilder('variant')
  //       .where('variant.id = :variantId', { variantId })
  //       .leftJoinAndSelect('variant.imageMappings', 'imageMapping')
  //       .leftJoinAndSelect('imageMapping.image', 'image')
  //       .leftJoinAndSelect('variant.optionValues', 'variantOptionValue')
  //       .leftJoinAndSelect('variantOptionValue.optionValue', 'optionValue')
  //       .leftJoinAndSelect('optionValue.option', 'option')
  //       .leftJoinAndSelect('variant.product', 'product')
  //       .orderBy('imageMapping.position', 'ASC')
  //       .addOrderBy('option.position', 'ASC')
  //       .addOrderBy('optionValue.position', 'ASC')
  //       .getOne();
  //   });
  // }

  // async updateVariant(updateVariantDto: IUpdate<UpdateProductVariantDto>) {
  //   return await this.dataSource.transaction(async (manager) => {
  //     const { updatedBy, variables } = updateVariantDto;
  //     const { variantId, price, stock, status, position, optionValues } =
  //       variables;

  //     const variantRepo = manager.getRepository(ProductVariant);
  //     const optionRepo = manager.getRepository(ProductOption);
  //     const optionValueRepo = manager.getRepository(ProductOptionValue);
  //     const variantOptionValueRepo = manager.getRepository(
  //       ProductVariantOptionValue,
  //     );
  //     const imageMappingRepo = manager.getRepository(
  //       ProductVariantImageMapping,
  //     );

  //     // 1. Kiểm tra variant có tồn tại không
  //     const existingVariant = await variantRepo.findOne({
  //       where: { id: variantId },
  //       relations: ['optionValues'],
  //     });

  //     if (!existingVariant) {
  //       throw new Error('Biến thể không tồn tại!');
  //     }

  //     // 2. Nếu có optionValues mới, kiểm tra trùng lặp với các variant khác
  //     if (optionValues && optionValues.length > 0) {
  //       // Lấy tất cả variants của cùng product (trừ variant hiện tại)
  //       const otherVariants = await variantRepo
  //         .createQueryBuilder('variant')
  //         .where('variant.productId = :productId', {
  //           productId: existingVariant.productId,
  //         })
  //         .andWhere('variant.id != :variantId', { variantId })
  //         .leftJoinAndSelect('variant.optionValues', 'variantOptionValue')
  //         .getMany();

  //       // Lấy danh sách optionValueIds mới từ request
  //       const newOptionValueIds = optionValues
  //         .map((ov) => ov.optionValueId)
  //         .filter(Boolean)
  //         .sort();

  //       // Check xem có variant nào trùng option values không
  //       for (const otherVariant of otherVariants) {
  //         const otherOptionValueIds = (
  //           otherVariant.optionValues?.map((vo) => vo.optionValueId) || []
  //         ).sort();

  //         if (
  //           JSON.stringify(otherOptionValueIds) ===
  //           JSON.stringify(newOptionValueIds)
  //         ) {
  //           throw new Error('Biến thể với các thuộc tính này đã tồn tại!');
  //         }
  //       }

  //       // 3. Xóa tất cả image mappings cũ của variant (vì option values thay đổi)
  //       await imageMappingRepo
  //         .createQueryBuilder()
  //         .delete()
  //         .where('variantId = :variantId', { variantId })
  //         .execute();

  //       // 4. Xóa tất cả option values cũ của variant
  //       await variantOptionValueRepo
  //         .createQueryBuilder()
  //         .delete()
  //         .where('variantId = :variantId', { variantId })
  //         .execute();

  //       // 5. Sắp xếp option values theo position của ProductOption
  //       const sortedOptionValues = await Promise.all(
  //         optionValues.map(async (ov) => {
  //           const option = await optionRepo.findOne({
  //             where: { id: ov.optionId },
  //           });
  //           return {
  //             ...ov,
  //             optionPosition: option?.position ?? 999,
  //           };
  //         }),
  //       );

  //       sortedOptionValues.sort((a, b) => a.optionPosition - b.optionPosition);

  //       // 6. Thêm option values mới theo thứ tự đã sắp xếp
  //       for (const [index, optionValue] of sortedOptionValues.entries()) {
  //         const { optionId, optionValueId, value, isNew } = optionValue;

  //         let finalOptionValueId: string;

  //         if (isNew && value) {
  //           // Nếu là option value mới, tạo mới
  //           const maxPosition = await optionValueRepo
  //             .createQueryBuilder('optionValue')
  //             .where('optionValue.optionId = :optionId', { optionId })
  //             .select('MAX(optionValue.position)', 'maxPosition')
  //             .getRawOne();

  //           const newValuePosition = (maxPosition?.maxPosition ?? -1) + 1;

  //           const insertResult = await optionValueRepo
  //             .createQueryBuilder()
  //             .insert()
  //             .values({
  //               optionId,
  //               value,
  //               position: newValuePosition,
  //               createdBy: updatedBy,
  //               updatedBy: updatedBy,
  //             })
  //             .execute();

  //           finalOptionValueId = insertResult.identifiers[0].id;
  //         } else if (optionValueId) {
  //           // Nếu là option value có sẵn, dùng ID
  //           finalOptionValueId = optionValueId;
  //         } else {
  //           throw new Error('Thông tin option value không hợp lệ!');
  //         }

  //         // Tạo mapping giữa variant và option value với position
  //         await variantOptionValueRepo
  //           .createQueryBuilder()
  //           .insert()
  //           .values({
  //             variantId,
  //             optionValueId: finalOptionValueId,
  //             position: index,
  //             createdBy: updatedBy,
  //             updatedBy: updatedBy,
  //           })
  //           .execute();
  //       }
  //     }

  //     // 7. Cập nhật thông tin variant (price, stock, status, position)
  //     const variantData: any = {};
  //     if (price !== undefined) variantData.price = price;
  //     if (stock !== undefined) variantData.stock = stock;
  //     if (status !== undefined) variantData.status = status;
  //     if (position !== undefined) variantData.position = position;

  //     if (Object.keys(variantData).length > 0) {
  //       await variantRepo
  //         .createQueryBuilder()
  //         .update()
  //         .set({
  //           ...variantData,
  //           updatedBy,
  //         })
  //         .where('id = :variantId', { variantId })
  //         .execute();
  //     }

  //     // 8. Trả về variant đã cập nhật với đầy đủ relations
  //     return await variantRepo
  //       .createQueryBuilder('variant')
  //       .where('variant.id = :variantId', { variantId })
  //       .leftJoinAndSelect('variant.imageMappings', 'imageMapping')
  //       .leftJoinAndSelect('imageMapping.image', 'image')
  //       .leftJoinAndSelect('variant.optionValues', 'variantOptionValue')
  //       .leftJoinAndSelect('variantOptionValue.optionValue', 'optionValue')
  //       .leftJoinAndSelect('optionValue.option', 'option')
  //       .leftJoinAndSelect('variant.product', 'product')
  //       .orderBy('imageMapping.position', 'ASC')
  //       .addOrderBy('variantOptionValue.position', 'ASC')
  //       .getOne();
  //   });
  // }

  async updateVariant(updateVariantDto: IUpdate<UpdateProductVariantDto>) {
    return await this.dataSource.transaction(async (manager) => {
      const { updatedBy, variables } = updateVariantDto;
      const {
        variantId,
        price,
        stock,
        status,
        position,
        optionValues,
        images,
      } = variables;

      const variantRepo = manager.getRepository(ProductVariant);
      const optionRepo = manager.getRepository(ProductOption);
      const optionValueRepo = manager.getRepository(ProductOptionValue);
      const variantOptionValueRepo = manager.getRepository(
        ProductVariantOptionValue,
      );
      const imageRepo = manager.getRepository(ProductVariantImage);
      const imageMappingRepo = manager.getRepository(
        ProductVariantImageMapping,
      );

      // 1. Kiểm tra variant có tồn tại không
      const existingVariant = await variantRepo.findOne({
        where: { id: variantId },
        relations: ['optionValues'],
      });

      if (!existingVariant) {
        throw new Error('Biến thể không tồn tại!');
      }

      // 2. Nếu có optionValues mới, kiểm tra trùng lặp với các variant khác
      if (optionValues && optionValues.length > 0) {
        // Lấy tất cả variants của cùng product (trừ variant hiện tại)
        const otherVariants = await variantRepo
          .createQueryBuilder('variant')
          .where('variant.productId = :productId', {
            productId: existingVariant.productId,
          })
          .andWhere('variant.id != :variantId', { variantId })
          .leftJoinAndSelect('variant.optionValues', 'variantOptionValue')
          .getMany();

        // Lấy danh sách optionValueIds mới từ request
        const newOptionValueIds = optionValues
          .map((ov) => ov.optionValueId)
          .filter(Boolean)
          .sort();

        // Check xem có variant nào trùng option values không
        for (const otherVariant of otherVariants) {
          const otherOptionValueIds = (
            otherVariant.optionValues?.map((vo) => vo.optionValueId) || []
          ).sort();

          if (
            JSON.stringify(otherOptionValueIds) ===
            JSON.stringify(newOptionValueIds)
          ) {
            throw new Error('Biến thể với các thuộc tính này đã tồn tại!');
          }
        }

        // 3. Xóa tất cả image mappings cũ của variant
        await imageMappingRepo
          .createQueryBuilder()
          .delete()
          .where('variantId = :variantId', { variantId })
          .execute();

        // 4. Xóa tất cả option values cũ của variant
        await variantOptionValueRepo
          .createQueryBuilder()
          .delete()
          .where('variantId = :variantId', { variantId })
          .execute();

        // 5. Sắp xếp option values theo position của ProductOption
        const sortedOptionValues = await Promise.all(
          optionValues.map(async (ov) => {
            const option = await optionRepo.findOne({
              where: { id: ov.optionId },
            });
            return {
              ...ov,
              optionPosition: option?.position ?? 999,
            };
          }),
        );

        sortedOptionValues.sort((a, b) => a.optionPosition - b.optionPosition);

        // 6. Thêm option values mới theo thứ tự đã sắp xếp
        for (const [index, optionValue] of sortedOptionValues.entries()) {
          const { optionId, optionValueId, value, isNew } = optionValue;

          let finalOptionValueId: string;

          if (isNew && value) {
            // Nếu là option value mới, tạo mới
            const maxPosition = await optionValueRepo
              .createQueryBuilder('optionValue')
              .where('optionValue.optionId = :optionId', { optionId })
              .select('MAX(optionValue.position)', 'maxPosition')
              .getRawOne();

            const newValuePosition = (maxPosition?.maxPosition ?? -1) + 1;

            const insertResult = await optionValueRepo
              .createQueryBuilder()
              .insert()
              .values({
                optionId,
                value,
                position: newValuePosition,
                createdBy: updatedBy,
                updatedBy: updatedBy,
              })
              .execute();

            finalOptionValueId = insertResult.identifiers[0].id;
          } else if (optionValueId) {
            // Nếu là option value có sẵn, dùng ID
            finalOptionValueId = optionValueId;
          } else {
            throw new Error('Thông tin option value không hợp lệ!');
          }

          // Tạo mapping giữa variant và option value với position
          await variantOptionValueRepo
            .createQueryBuilder()
            .insert()
            .values({
              variantId,
              optionValueId: finalOptionValueId,
              position: index,
              createdBy: updatedBy,
              updatedBy: updatedBy,
            })
            .execute();
        }

        // 7. Xử lý images sau khi update option values
        if (images && images.length > 0) {
          // Trường hợp 1: User cung cấp ảnh mới
          for (let i = 0; i < images.length; i++) {
            const imageDto = images[i];
            let imageId = imageDto.imageId;

            // Nếu chưa có imageId, tạo image mới
            if (!imageId) {
              const insertResult = await imageRepo
                .createQueryBuilder()
                .insert()
                .values({
                  url: imageDto.url,
                  position: imageDto.position ?? i,
                  createdBy: updatedBy,
                  updatedBy: updatedBy,
                })
                .execute();

              imageId = insertResult.identifiers[0].id;
            }

            // Tạo mapping mới
            await imageMappingRepo
              .createQueryBuilder()
              .insert()
              .values({
                variantId,
                imageId,
                position: i,
                createdBy: updatedBy,
                updatedBy: updatedBy,
              })
              .execute();
          }
        } else {
          // Trường hợp 2: Không có ảnh mới -> Tự động copy ảnh từ variant cùng màu
          const colorOptionId = await this.getColorOptionId(
            manager,
            existingVariant.productId,
          );

          if (colorOptionId) {
            const colorOptionValueId = this.getColorOptionValueId(
              sortedOptionValues,
              colorOptionId,
            );

            if (colorOptionValueId) {
              // Tìm variant khác có cùng màu sắc
              const sameColorVariant = await variantRepo
                .createQueryBuilder('variant')
                .leftJoinAndSelect('variant.optionValues', 'variantOptionValue')
                .leftJoinAndSelect('variant.imageMappings', 'imageMapping')
                .leftJoinAndSelect('imageMapping.image', 'image')
                .where('variant.productId = :productId', {
                  productId: existingVariant.productId,
                })
                .andWhere('variant.id != :variantId', { variantId })
                .andWhere(
                  'variantOptionValue.optionValueId = :colorOptionValueId',
                  { colorOptionValueId },
                )
                .getOne();

              // Nếu tìm thấy variant cùng màu và có ảnh, copy sang
              if (
                sameColorVariant?.imageMappings &&
                sameColorVariant.imageMappings.length > 0
              ) {
                for (const [
                  index,
                  mapping,
                ] of sameColorVariant.imageMappings.entries()) {
                  await imageMappingRepo
                    .createQueryBuilder()
                    .insert()
                    .values({
                      variantId,
                      imageId: mapping.imageId,
                      position: index,
                      createdBy: updatedBy,
                      updatedBy: updatedBy,
                    })
                    .execute();
                }
              }
            }
          }
        }
      }

      // 8. Cập nhật thông tin variant (price, stock, status, position)
      const variantData: any = {};
      if (price !== undefined) variantData.price = price;
      if (stock !== undefined) variantData.stock = stock;
      if (status !== undefined) variantData.status = status;
      if (position !== undefined) variantData.position = position;

      if (Object.keys(variantData).length > 0) {
        await variantRepo
          .createQueryBuilder()
          .update()
          .set({
            ...variantData,
            updatedBy,
          })
          .where('id = :variantId', { variantId })
          .execute();
      }

      // 9. Nếu có images được cung cấp mà không có optionValues thay đổi
      // (chỉ update ảnh)
      if (
        images !== undefined &&
        (!optionValues || optionValues.length === 0)
      ) {
        // Xóa mappings cũ
        const oldMappings = await imageMappingRepo
          .createQueryBuilder('mapping')
          .where('mapping.variantId = :variantId', { variantId })
          .getMany();

        const oldImageIds = oldMappings.map((m) => m.imageId);

        const imageIdsToKeep = images
          .filter((img) => img.imageId)
          .map((img) => img.imageId);

        const imageIdsToDelete = oldImageIds.filter(
          (id) => !imageIdsToKeep.includes(id),
        );

        await imageMappingRepo
          .createQueryBuilder()
          .delete()
          .where('variantId = :variantId', { variantId })
          .execute();

        if (imageIdsToDelete.length > 0) {
          await imageRepo
            .createQueryBuilder()
            .delete()
            .whereInIds(imageIdsToDelete)
            .execute();
        }

        // Tạo mappings mới
        for (let i = 0; i < images.length; i++) {
          const imageDto = images[i];
          let imageId = imageDto.imageId;

          if (!imageId) {
            const insertResult = await imageRepo
              .createQueryBuilder()
              .insert()
              .values({
                url: imageDto.url,
                position: i,
                createdBy: updatedBy,
                updatedBy: updatedBy,
              })
              .execute();

            imageId = insertResult.identifiers[0].id;
          }

          await imageMappingRepo
            .createQueryBuilder()
            .insert()
            .values({
              variantId,
              imageId,
              position: i,
              createdBy: updatedBy,
              updatedBy: updatedBy,
            })
            .execute();
        }
      }

      // 10. Trả về variant đã cập nhật với đầy đủ relations
      return await variantRepo
        .createQueryBuilder('variant')
        .where('variant.id = :variantId', { variantId })
        .leftJoinAndSelect('variant.imageMappings', 'imageMapping')
        .leftJoinAndSelect('imageMapping.image', 'image')
        .leftJoinAndSelect('variant.optionValues', 'variantOptionValue')
        .leftJoinAndSelect('variantOptionValue.optionValue', 'optionValue')
        .leftJoinAndSelect('optionValue.option', 'option')
        .leftJoinAndSelect('variant.product', 'product')
        .orderBy('imageMapping.position', 'ASC')
        .addOrderBy('variantOptionValue.position', 'ASC')
        .getOne();
    });
  }

  async update(updateProductDto: IUpdate<UpdateProductDto>) {
    return await this.dataSource.transaction(async (manager) => {
      const { updatedBy, variables } = updateProductDto;
      const {
        productId,
        name,
        description,
        slug,
        categoryId,
        brandId,
        variantId,
        price,
        stock,
        status,
        position,
        images,
      } = variables;

      const productRepo = manager.getRepository(Product);
      const variantRepo = manager.getRepository(ProductVariant);
      const mappingRepo = manager.getRepository(ProductVariantImageMapping);
      const imageRepo = manager.getRepository(ProductVariantImage);

      // 1. Update thông tin Product
      const productData: any = {};
      if (name !== undefined) productData.name = name;
      if (description !== undefined) productData.description = description;
      if (slug !== undefined) productData.slug = slug;
      if (categoryId !== undefined) productData.categoryId = categoryId;
      if (brandId !== undefined) productData.brandId = brandId;

      if (Object.keys(productData).length > 0) {
        await productRepo
          .createQueryBuilder()
          .update()
          .set({
            ...productData,
            updatedBy,
          })
          .where('id = :productId', { productId })
          .execute();
      }

      // 2. Update thông tin Variant (price, stock, status, position)
      const variantData: any = {};
      if (price !== undefined) variantData.price = price;
      if (stock !== undefined) variantData.stock = stock;
      if (status !== undefined) variantData.status = status;
      if (position !== undefined) variantData.position = position;

      if (variantId && Object.keys(variantData).length > 0) {
        await variantRepo
          .createQueryBuilder()
          .update()
          .set({
            ...variantData,
            updatedBy,
          })
          .where('id = :variantId', { variantId })
          .execute();
      }

      // 3. Update Images cho TẤT CẢ variants cùng màu
      if (variantId && images !== undefined) {
        // Lấy colorOptionValueId từ variant hiện tại
        const colorOptionValueId = await this.getColorOptionValueIdFromVariant(
          manager,
          variantId,
          productId,
        );

        // Lấy tất cả variants có cùng màu sắc
        let variantsToUpdate: ProductVariant[] = [];

        if (colorOptionValueId) {
          variantsToUpdate = await this.getVariantsBySameColor(
            manager,
            productId,
            colorOptionValueId,
          );
        } else {
          // Nếu không tìm thấy color option, chỉ update variant hiện tại
          const variant = await variantRepo.findOne({
            where: { id: variantId },
          });
          if (variant) {
            variantsToUpdate = [variant];
          }
        }

        // Xử lý từng variant
        for (const variant of variantsToUpdate) {
          const currentVariantId = variant.id;

          // Lấy mappings và imageIds cũ
          const oldMappings = await mappingRepo
            .createQueryBuilder('mapping')
            .where('mapping.variantId = :variantId', {
              variantId: currentVariantId,
            })
            .getMany();

          const oldImageIds = oldMappings.map((m) => m.imageId);

          const imageIdsToKeep = images
            .filter((img) => img.imageId)
            .map((img) => img.imageId);

          const imageIdsToDelete = oldImageIds.filter(
            (id) => !imageIdsToKeep.includes(id),
          );

          // Xóa tất cả mappings cũ của variant này
          await mappingRepo
            .createQueryBuilder()
            .delete()
            .where('variantId = :variantId', { variantId: currentVariantId })
            .execute();

          // Xóa các images không còn được sử dụng
          // CHÚ Ý: Chỉ xóa image nếu không còn variant nào khác sử dụng
          if (imageIdsToDelete.length > 0) {
            for (const imageId of imageIdsToDelete) {
              const mappingCount = await mappingRepo
                .createQueryBuilder('mapping')
                .where('mapping.imageId = :imageId', { imageId })
                .getCount();

              // Nếu không còn mapping nào tham chiếu đến image này, xóa image
              if (mappingCount === 0) {
                await imageRepo
                  .createQueryBuilder()
                  .delete()
                  .where('id = :imageId', { imageId })
                  .execute();
              }
            }
          }

          // Tạo mappings mới cho variant này
          for (let i = 0; i < images.length; i++) {
            const imageDto = images[i];
            let imageId = imageDto.imageId;

            // Nếu là image mới (chưa có imageId), tạo image mới
            // Nhưng chỉ tạo 1 lần cho variant đầu tiên, các variant sau dùng chung
            if (!imageId) {
              // Kiểm tra xem image này đã được tạo chưa (dựa vào URL)
              const existingImage = await imageRepo
                .createQueryBuilder('image')
                .where('image.url = :url', { url: imageDto.url })
                .getOne();

              if (existingImage) {
                imageId = existingImage.id;
              } else {
                const insertResult = await imageRepo
                  .createQueryBuilder()
                  .insert()
                  .values({
                    url: imageDto.url,
                    position: i,
                    createdBy: updatedBy,
                    updatedBy: updatedBy,
                  })
                  .execute();

                imageId = insertResult.identifiers[0].id;
              }
            }

            // Tạo mapping mới
            await mappingRepo
              .createQueryBuilder()
              .insert()
              .values({
                variantId: currentVariantId,
                imageId,
                position: i,
                createdBy: updatedBy,
                updatedBy: updatedBy,
              })
              .execute();
          }
        }
      }

      return {
        success: true,
        affected: {
          product: Object.keys(productData).length > 0 ? 1 : 0,
          variant: variantId && Object.keys(variantData).length > 0 ? 1 : 0,
          images: images ? images.length : 0,
          variantsUpdated:
            variantId && images !== undefined
              ? (await this.getColorOptionValueIdFromVariant(
                  manager,
                  variantId,
                  productId,
                ))
                ? (
                    await this.getVariantsBySameColor(
                      manager,
                      productId,
                      await this.getColorOptionValueIdFromVariant(
                        manager,
                        variantId,
                        productId,
                      ),
                    )
                  )?.length
                : 1
              : 0,
        },
      };
    });
  }
}
