import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { GetProductBySlugDto } from './dto/get-product-by-slug.dto';
import { GetProductDto } from './dto/get-product.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductImage } from './entities/product-image.entity';
import { ProductOptionValue } from './entities/product-option-value.entity';
import { ProductOption } from './entities/product-option.entity';
import { ProductVariantImageMapping } from './entities/product-variant-image-mapping.entity';
import { ProductVariantImage } from './entities/product-variant-image.entity';
import { ProductVariantOptionValue } from './entities/product-variant-option-value.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { Product } from './entities/product.entity';
import { ProductRepository } from './product.repository';

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
  //     const {
  //       productId,
  //       price,
  //       stock,
  //       status,
  //       position,
  //       optionValues,
  //       images,
  //     } = variables;

  //     const variantRepo = manager.getRepository(ProductVariant);
  //     const optionRepo = manager.getRepository(ProductOption);
  //     const optionValueRepo = manager.getRepository(ProductOptionValue);
  //     const variantOptionValueRepo = manager.getRepository(
  //       ProductVariantOptionValue,
  //     );
  //     const imageRepo = manager.getRepository(ProductVariantImage);
  //     const imageMappingRepo = manager.getRepository(
  //       ProductVariantImageMapping,
  //     );

  //     // 1. Kiểm tra variant đã tồn tại
  //     const existingVariants = await variantRepo
  //       .createQueryBuilder('variant')
  //       .where('variant.productId = :productId', { productId })
  //       .leftJoinAndSelect('variant.optionValues', 'variantOptionValue')
  //       .getMany();

  //     const requestOptionValueIds = optionValues
  //       .map((ov) => ov.optionValueId)
  //       .filter(Boolean)
  //       .sort();

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

  //     // 2. Lấy position cao nhất
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

  //     // 4. Sắp xếp option values theo position của ProductOption
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

  //     // 5. Xử lý option values
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

  //       await variantOptionValueRepo
  //         .createQueryBuilder()
  //         .insert()
  //         .values({
  //           variantId,
  //           optionValueId: finalOptionValueId,
  //           position: index,
  //           createdBy,
  //           updatedBy: createdBy,
  //         })
  //         .execute();
  //     }

  //     // 6. Xử lý images
  //     if (images && images.length > 0) {
  //       // ========== User upload ảnh mới ==========
  //       for (let i = 0; i < images.length; i++) {
  //         const imageDto = images[i];
  //         let imageId = imageDto.imageId;

  //         if (!imageId) {
  //           const insertResult = await imageRepo
  //             .createQueryBuilder()
  //             .insert()
  //             .values({
  //               url: imageDto.url,
  //               position: imageDto.position ?? i,
  //               createdBy,
  //               updatedBy: createdBy,
  //             })
  //             .execute();

  //           imageId = insertResult.identifiers[0].id;
  //         }

  //         await imageMappingRepo
  //           .createQueryBuilder()
  //           .insert()
  //           .values({
  //             variantId,
  //             imageId,
  //             position: i,
  //             createdBy,
  //             updatedBy: createdBy,
  //           })
  //           .execute();
  //       }
  //     } else {
  //       // ========== Copy ảnh dựa trên việc có option Màu sắc hay không ==========

  //       const colorOptionId = await this.getColorOptionId(manager, productId);

  //       if (colorOptionId) {
  //         // ===== Case 1: Product có option Màu sắc =====
  //         const colorOptionValueId = this.getColorOptionValueId(
  //           sortedOptionValues,
  //           colorOptionId,
  //         );

  //         if (colorOptionValueId) {
  //           const sameColorVariant = await variantRepo
  //             .createQueryBuilder('variant')
  //             .leftJoinAndSelect('variant.optionValues', 'variantOptionValue')
  //             .leftJoinAndSelect('variant.imageMappings', 'imageMapping')
  //             .leftJoinAndSelect('imageMapping.image', 'image')
  //             .where('variant.productId = :productId', { productId })
  //             .andWhere('variant.id != :variantId', { variantId })
  //             .andWhere(
  //               'variantOptionValue.optionValueId = :colorOptionValueId',
  //               { colorOptionValueId },
  //             )
  //             .orderBy('variant.createdAt', 'DESC')
  //             .addOrderBy('imageMapping.position', 'ASC')
  //             .getOne();

  //           // Copy nếu tìm thấy variant cùng màu có ảnh
  //           if (
  //             sameColorVariant?.imageMappings &&
  //             sameColorVariant.imageMappings.length > 0
  //           ) {
  //             for (const [
  //               index,
  //               mapping,
  //             ] of sameColorVariant.imageMappings.entries()) {
  //               await imageMappingRepo
  //                 .createQueryBuilder()
  //                 .insert()
  //                 .values({
  //                   variantId,
  //                   imageId: mapping.imageId,
  //                   position: index,
  //                   createdBy,
  //                   updatedBy: createdBy,
  //                 })
  //                 .execute();
  //             }
  //           }
  //           // Nếu không tìm thấy variant cùng màu -> Không copy, đợi user upload
  //         }
  //       } else {
  //         // ===== Case 2: Product KHÔNG có option Màu sắc =====
  //         const anyVariantWithImages = await variantRepo
  //           .createQueryBuilder('variant')
  //           .leftJoinAndSelect('variant.imageMappings', 'imageMapping')
  //           .leftJoinAndSelect('imageMapping.image', 'image')
  //           .where('variant.productId = :productId', { productId })
  //           .andWhere('variant.id != :variantId', { variantId })
  //           .orderBy('variant.createdAt', 'DESC')
  //           .addOrderBy('imageMapping.position', 'ASC')
  //           .getOne();

  //         // Copy nếu tìm thấy variant nào có ảnh
  //         if (
  //           anyVariantWithImages?.imageMappings &&
  //           anyVariantWithImages.imageMappings.length > 0
  //         ) {
  //           for (const [
  //             index,
  //             mapping,
  //           ] of anyVariantWithImages.imageMappings.entries()) {
  //             await imageMappingRepo
  //               .createQueryBuilder()
  //               .insert()
  //               .values({
  //                 variantId,
  //                 imageId: mapping.imageId,
  //                 position: index,
  //                 createdBy,
  //                 updatedBy: createdBy,
  //               })
  //               .execute();
  //           }
  //         }
  //         // Nếu không có variant nào -> Không copy, đợi user upload
  //       }
  //     }

  //     return {
  //       success: true,
  //       variantId,
  //     };
  //   });
  // }

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

  //     // 1. Update thông tin Product
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

  //     // 2. Update thông tin Variant (price, stock, status, position)
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

  //     // 3. Update Images cho TẤT CẢ variants cùng màu
  //     if (variantId && images !== undefined) {
  //       // Lấy colorOptionValueId từ variant hiện tại
  //       const colorOptionValueId = await this.getColorOptionValueIdFromVariant(
  //         manager,
  //         variantId,
  //         productId,
  //       );

  //       // Lấy tất cả variants có cùng màu sắc
  //       let variantsToUpdate: ProductVariant[] = [];

  //       if (colorOptionValueId) {
  //         variantsToUpdate = await this.getVariantsBySameColor(
  //           manager,
  //           productId,
  //           colorOptionValueId,
  //         );
  //       } else {
  //         // Nếu không tìm thấy color option, chỉ update variant hiện tại
  //         const variant = await variantRepo.findOne({
  //           where: { id: variantId },
  //         });
  //         if (variant) {
  //           variantsToUpdate = [variant];
  //         }
  //       }

  //       // Xử lý từng variant
  //       for (const variant of variantsToUpdate) {
  //         const currentVariantId = variant.id;

  //         // Lấy mappings và imageIds cũ
  //         const oldMappings = await mappingRepo
  //           .createQueryBuilder('mapping')
  //           .where('mapping.variantId = :variantId', {
  //             variantId: currentVariantId,
  //           })
  //           .getMany();

  //         const oldImageIds = oldMappings.map((m) => m.imageId);

  //         const imageIdsToKeep = images
  //           .filter((img) => img.imageId)
  //           .map((img) => img.imageId);

  //         const imageIdsToDelete = oldImageIds.filter(
  //           (id) => !imageIdsToKeep.includes(id),
  //         );

  //         // Xóa tất cả mappings cũ của variant này
  //         await mappingRepo
  //           .createQueryBuilder()
  //           .delete()
  //           .where('variantId = :variantId', { variantId: currentVariantId })
  //           .execute();

  //         // Xóa các images không còn được sử dụng
  //         // CHÚ Ý: Chỉ xóa image nếu không còn variant nào khác sử dụng
  //         if (imageIdsToDelete.length > 0) {
  //           for (const imageId of imageIdsToDelete) {
  //             const mappingCount = await mappingRepo
  //               .createQueryBuilder('mapping')
  //               .where('mapping.imageId = :imageId', { imageId })
  //               .getCount();

  //             // Nếu không còn mapping nào tham chiếu đến image này, xóa image
  //             if (mappingCount === 0) {
  //               await imageRepo
  //                 .createQueryBuilder()
  //                 .delete()
  //                 .where('id = :imageId', { imageId })
  //                 .execute();
  //             }
  //           }
  //         }

  //         // Tạo mappings mới cho variant này
  //         for (let i = 0; i < images.length; i++) {
  //           const imageDto = images[i];
  //           let imageId = imageDto.imageId;

  //           // Nếu là image mới (chưa có imageId), tạo image mới
  //           // Nhưng chỉ tạo 1 lần cho variant đầu tiên, các variant sau dùng chung
  //           if (!imageId) {
  //             // Kiểm tra xem image này đã được tạo chưa (dựa vào URL)
  //             const existingImage = await imageRepo
  //               .createQueryBuilder('image')
  //               .where('image.url = :url', { url: imageDto.url })
  //               .getOne();

  //             if (existingImage) {
  //               imageId = existingImage.id;
  //             } else {
  //               const insertResult = await imageRepo
  //                 .createQueryBuilder()
  //                 .insert()
  //                 .values({
  //                   url: imageDto.url,
  //                   position: i,
  //                   createdBy: updatedBy,
  //                   updatedBy: updatedBy,
  //                 })
  //                 .execute();

  //               imageId = insertResult.identifiers[0].id;
  //             }
  //           }

  //           // Tạo mapping mới
  //           await mappingRepo
  //             .createQueryBuilder()
  //             .insert()
  //             .values({
  //               variantId: currentVariantId,
  //               imageId,
  //               position: i,
  //               createdBy: updatedBy,
  //               updatedBy: updatedBy,
  //             })
  //             .execute();
  //         }
  //       }
  //     }

  //     return {
  //       success: true,
  //       affected: {
  //         product: Object.keys(productData).length > 0 ? 1 : 0,
  //         variant: variantId && Object.keys(variantData).length > 0 ? 1 : 0,
  //         images: images ? images.length : 0,
  //         variantsUpdated:
  //           variantId && images !== undefined
  //             ? (await this.getColorOptionValueIdFromVariant(
  //                 manager,
  //                 variantId,
  //                 productId,
  //               ))
  //               ? (
  //                   await this.getVariantsBySameColor(
  //                     manager,
  //                     productId,
  //                     await this.getColorOptionValueIdFromVariant(
  //                       manager,
  //                       variantId,
  //                       productId,
  //                     ),
  //                   )
  //                 )?.length
  //               : 1
  //             : 0,
  //       },
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

      const productRepo = manager.getRepository(Product);
      const variantRepo = manager.getRepository(ProductVariant);
      const optionRepo = manager.getRepository(ProductOption);
      const optionValueRepo = manager.getRepository(ProductOptionValue);
      const variantOptionValueRepo = manager.getRepository(
        ProductVariantOptionValue,
      );
      const variantImageRepo = manager.getRepository(ProductVariantImage);
      const imageMappingRepo = manager.getRepository(
        ProductVariantImageMapping,
      );
      const productImageRepo = manager.getRepository(ProductImage);

      // 1. Kiểm tra variant đã tồn tại
      const existingVariants = await variantRepo
        .createQueryBuilder('variant')
        .where('variant.productId = :productId', { productId })
        .leftJoinAndSelect('variant.optionValues', 'variantOptionValue')
        .getMany();

      const requestOptionValueIds = optionValues
        .map((ov) => ov.optionValueId)
        .filter(Boolean)
        .sort();

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

      // 2. Lấy position cao nhất
      const maxPositionResult = await variantRepo
        .createQueryBuilder('variant')
        .where('variant.productId = :productId', { productId })
        .select('MAX(variant.position)', 'maxPosition')
        .getRawOne();

      const newPosition =
        position ?? (maxPositionResult?.maxPosition ?? -1) + 1;

      // 6 ->
      const existingVariantCount = await variantRepo
        .createQueryBuilder('variant')
        .where('variant.productId = :productId', { productId })
        .getCount();

      const isFirstVariant = existingVariantCount === 0;

      console.log('productId', productId);
      console.log('isFirstVariant', isFirstVariant);

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

      // 6. Kiểm tra xem đây có phải variant đầu tiên của product không
      // const existingVariantCount = await variantRepo
      //   .createQueryBuilder('variant')
      //   .where('variant.productId = :productId', { productId })
      //   .getCount();

      // const isFirstVariant = existingVariantCount === 0;

      // console.log('productId', productId);
      // console.log('isFirstVariant', isFirstVariant);

      // 7. Xử lý images
      if (images && images.length > 0) {
        // ========== User upload ảnh mới ==========
        for (let i = 0; i < images.length; i++) {
          const imageDto = images[i];
          let imageId = imageDto.imageId;

          if (!imageId) {
            const insertResult = await variantImageRepo
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

        // Nếu là variant đầu tiên và user upload ảnh mới
        // Xóa ProductImage và null price/stock của Product
        if (isFirstVariant) {
          // Xóa tất cả ProductImage
          await productImageRepo
            .createQueryBuilder()
            .delete()
            .where('productId = :productId', { productId })
            .execute();

          // Update null price và stock của Product
          await productRepo
            .createQueryBuilder()
            .update()
            .set({
              price: null,
              stock: null,
              updatedBy: createdBy,
            })
            .where('id = :productId', { productId })
            .execute();
        }
      } else {
        // ========== Copy ảnh tự động ==========
        // BƯỚC 1: Ưu tiên copy từ ProductImage (khi là variant đầu tiên)
        if (isFirstVariant) {
          const productImages = await productImageRepo
            .createQueryBuilder('image')
            .where('image.productId = :productId', { productId })
            .orderBy('image.position', 'ASC')
            .getMany();

          if (productImages && productImages.length > 0) {
            // Copy từ ProductImage sang ProductVariantImage
            for (const [index, productImage] of productImages.entries()) {
              // Tạo ProductVariantImage mới
              const insertResult = await variantImageRepo
                .createQueryBuilder()
                .insert()
                .values({
                  url: productImage.url,
                  position: productImage.position,
                  createdBy,
                  updatedBy: createdBy,
                })
                .execute();

              const variantImageId = insertResult.identifiers[0].id;

              // Tạo mapping
              await imageMappingRepo
                .createQueryBuilder()
                .insert()
                .values({
                  variantId,
                  imageId: variantImageId,
                  position: index,
                  createdBy,
                  updatedBy: createdBy,
                })
                .execute();
            }

            // ========== XÓA ProductImage và NULL price/stock ==========
            await productImageRepo
              .createQueryBuilder()
              .delete()
              .where('productId = :productId', { productId })
              .execute();

            // Update null price và stock của Product
            await productRepo
              .createQueryBuilder()
              .update()
              .set({
                price: null,
                stock: null,
                updatedBy: createdBy,
              })
              .where('id = :productId', { productId })
              .execute();
          }
        } else {
          // BƯỚC 2: Không phải variant đầu tiên -> Copy từ variant khác
          const colorOptionId = await this.getColorOptionId(manager, productId);

          if (colorOptionId) {
            // ===== Case 1: Product có option Màu sắc =====
            const colorOptionValueId = this.getColorOptionValueId(
              sortedOptionValues,
              colorOptionId,
            );

            if (colorOptionValueId) {
              const sameColorVariant = await variantRepo
                .createQueryBuilder('variant')
                .leftJoinAndSelect('variant.optionValues', 'variantOptionValue')
                .leftJoinAndSelect('variant.imageMappings', 'imageMapping')
                .leftJoinAndSelect('imageMapping.image', 'image')
                .where('variant.productId = :productId', { productId })
                .andWhere('variant.id != :variantId', { variantId })
                .andWhere(
                  'variantOptionValue.optionValueId = :colorOptionValueId',
                  { colorOptionValueId },
                )
                .orderBy('variant.createdAt', 'DESC')
                .addOrderBy('imageMapping.position', 'ASC')
                .getOne();

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
          } else {
            // ===== Case 2: Product KHÔNG có option Màu sắc =====
            const anyVariantWithImages = await variantRepo
              .createQueryBuilder('variant')
              .leftJoinAndSelect('variant.imageMappings', 'imageMapping')
              .leftJoinAndSelect('imageMapping.image', 'image')
              .where('variant.productId = :productId', { productId })
              .andWhere('variant.id != :variantId', { variantId })
              .orderBy('variant.createdAt', 'DESC')
              .addOrderBy('imageMapping.position', 'ASC')
              .getOne();

            if (
              anyVariantWithImages?.imageMappings &&
              anyVariantWithImages.imageMappings.length > 0
            ) {
              for (const [
                index,
                mapping,
              ] of anyVariantWithImages.imageMappings.entries()) {
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
        parentPrice,
        price,
        parentStock,
        stock,
        status,
        position,
        images,
      } = variables;

      const productRepo = manager.getRepository(Product);
      const variantRepo = manager.getRepository(ProductVariant);
      const variantMappingRepo = manager.getRepository(
        ProductVariantImageMapping,
      );
      const variantImageRepo = manager.getRepository(ProductVariantImage);
      const productImageRepo = manager.getRepository(ProductImage);

      // 1. Update thông tin Product
      const productData: any = {};
      if (name !== undefined) productData.name = name;
      if (slug !== undefined) productData.slug = slug;
      if (brandId !== undefined) productData.brandId = brandId;
      if (categoryId !== undefined) productData.categoryId = categoryId;
      if (parentPrice !== undefined) productData.price = parentPrice;
      if (parentStock !== undefined) productData.stock = parentStock;
      if (description !== undefined) productData.description = description;

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

      // 2. Kiểm tra product có variant hay không
      const variantCount = await variantRepo
        .createQueryBuilder('variant')
        .where('variant.productId = :productId', { productId })
        .getCount();

      const hasVariants = variantCount > 0;

      // 3. Xử lý Images
      if (images !== undefined) {
        if (!hasVariants) {
          // ========== TRƯỜNG HỢP 1: Product KHÔNG có variant ==========
          // Lưu vào ProductImage

          // Lấy images cũ
          const oldProductImages = await productImageRepo
            .createQueryBuilder('image')
            .where('image.productId = :productId', { productId })
            .getMany();

          const oldImageIds = oldProductImages.map((img) => img.id);

          const imageIdsToKeep = images
            .filter((img) => img.imageId)
            .map((img) => img.imageId);

          const imageIdsToDelete = oldImageIds.filter(
            (id) => !imageIdsToKeep.includes(id),
          );

          // Xóa images cũ không còn sử dụng
          if (imageIdsToDelete.length > 0) {
            await productImageRepo
              .createQueryBuilder()
              .delete()
              .where('id IN (:...ids)', { ids: imageIdsToDelete })
              .execute();
          }

          // Tạo hoặc update images mới
          for (let i = 0; i < images.length; i++) {
            const imageDto = images[i];

            if (imageDto.imageId) {
              // Update image hiện có
              await productImageRepo
                .createQueryBuilder()
                .update()
                .set({
                  position: i,
                  updatedBy,
                })
                .where('id = :imageId', { imageId: imageDto.imageId })
                .execute();
            } else {
              // Tạo image mới
              await productImageRepo
                .createQueryBuilder()
                .insert()
                .values({
                  productId,
                  url: imageDto.url,
                  position: i,
                  createdBy: updatedBy,
                  updatedBy: updatedBy,
                })
                .execute();
            }
          }
        } else if (variantId) {
          // ========== TRƯỜNG HỢP 2: Product CÓ variant ==========
          // Update cho TẤT CẢ variants cùng màu

          const colorOptionValueId =
            await this.getColorOptionValueIdFromVariant(
              manager,
              variantId,
              productId,
            );

          let variantsToUpdate: ProductVariant[] = [];

          if (colorOptionValueId) {
            variantsToUpdate = await this.getVariantsBySameColor(
              manager,
              productId,
              colorOptionValueId,
            );
          } else {
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
            const oldMappings = await variantMappingRepo
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

            // Xóa tất cả mappings cũ
            await variantMappingRepo
              .createQueryBuilder()
              .delete()
              .where('variantId = :variantId', { variantId: currentVariantId })
              .execute();

            // Xóa images không còn được sử dụng
            if (imageIdsToDelete.length > 0) {
              for (const imageId of imageIdsToDelete) {
                const mappingCount = await variantMappingRepo
                  .createQueryBuilder('mapping')
                  .where('mapping.imageId = :imageId', { imageId })
                  .getCount();

                if (mappingCount === 0) {
                  await variantImageRepo
                    .createQueryBuilder()
                    .delete()
                    .where('id = :imageId', { imageId })
                    .execute();
                }
              }
            }

            // Tạo mappings mới
            for (let i = 0; i < images.length; i++) {
              const imageDto = images[i];
              let imageId = imageDto.imageId;

              if (!imageId) {
                const existingImage = await variantImageRepo
                  .createQueryBuilder('image')
                  .where('image.url = :url', { url: imageDto.url })
                  .getOne();

                if (existingImage) {
                  imageId = existingImage.id;
                } else {
                  const insertResult = await variantImageRepo
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

              await variantMappingRepo
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
      }

      // 4. Update thông tin Variant (price, stock, status, position)
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

      return {
        success: true,
        affected: {
          product: Object.keys(productData).length > 0 ? 1 : 0,
          variant: variantId && Object.keys(variantData).length > 0 ? 1 : 0,
          images: images ? images.length : 0,
          variantsUpdated:
            hasVariants && variantId && images !== undefined
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

        // 3. LẤY DANH SÁCH IMAGES CŨ TRƯỚC KHI XÓA MAPPINGS
        const oldImageMappings = await imageMappingRepo
          .createQueryBuilder('mapping')
          .where('mapping.variantId = :variantId', { variantId })
          .getMany();

        const oldImageIds = oldImageMappings.map((m) => m.imageId);

        // 4. Xóa tất cả image mappings cũ của variant
        await imageMappingRepo
          .createQueryBuilder()
          .delete()
          .where('variantId = :variantId', { variantId })
          .execute();

        // 5. Xóa tất cả option values cũ của variant
        await variantOptionValueRepo
          .createQueryBuilder()
          .delete()
          .where('variantId = :variantId', { variantId })
          .execute();

        // 6. Sắp xếp option values theo position của ProductOption
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

        // 7. Thêm option values mới theo thứ tự đã sắp xếp
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
                createdBy: updatedBy,
                updatedBy: updatedBy,
              })
              .execute();

            finalOptionValueId = insertResult.identifiers[0].id;
          } else if (optionValueId) {
            finalOptionValueId = optionValueId;
          } else {
            throw new Error('Thông tin option value không hợp lệ!');
          }

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

        // 8. Xử lý images sau khi update option values
        if (images && images.length > 0) {
          // Trường hợp 1: User cung cấp ảnh mới
          for (let i = 0; i < images.length; i++) {
            const imageDto = images[i];
            let imageId = imageDto.imageId;

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

        // ========== 8.5. XÓA IMAGES MỒ CÔI ==========
        if (oldImageIds.length > 0) {
          for (const oldImageId of oldImageIds) {
            const mappingCount = await imageMappingRepo
              .createQueryBuilder('mapping')
              .where('mapping.imageId = :imageId', { imageId: oldImageId })
              .getCount();

            // Nếu không còn variant nào sử dụng image này, xóa image
            if (mappingCount === 0) {
              await imageRepo
                .createQueryBuilder()
                .delete()
                .where('id = :imageId', { imageId: oldImageId })
                .execute();
            }
          }
        }
      }

      // 9. Cập nhật thông tin variant (price, stock, status, position)
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

      // 10. Nếu có images được cung cấp mà không có optionValues thay đổi
      if (
        images !== undefined &&
        (!optionValues || optionValues.length === 0)
      ) {
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

        // 10.1. XÓA IMAGES KHÔNG CÒN DÙNG
        if (imageIdsToDelete.length > 0) {
          for (const imageId of imageIdsToDelete) {
            const mappingCount = await imageMappingRepo
              .createQueryBuilder('mapping')
              .where('mapping.imageId = :imageId', { imageId })
              .getCount();

            if (mappingCount === 0) {
              await imageRepo
                .createQueryBuilder()
                .delete()
                .where('id = :imageId', { imageId })
                .execute();
            }
          }
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

      // 11. Trả về variant đã cập nhật với đầy đủ relations
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

  async deleteVariants(variantIds: string | string[]) {
    const ids = Array.isArray(variantIds) ? variantIds : [variantIds];

    if (ids.length === 0)
      throw new Error('Vui lòng cung cấp ít nhất một variant để xóa!');

    return await this.dataSource.transaction(async (manager) => {
      const variantRepo = manager.getRepository(ProductVariant);
      const variantOptionValueRepo = manager.getRepository(
        ProductVariantOptionValue,
      );
      const imageMappingRepo = manager.getRepository(
        ProductVariantImageMapping,
      );
      const imageRepo = manager.getRepository(ProductVariantImage);

      const results = {
        success: true,
        deleted: {
          variantCount: 0,
          variantIds: [] as string[],
          imagesDeleted: 0,
          imageIds: [] as string[],
        },
        failed: [] as Array<{
          variantId: string;
          reason: string;
        }>,
        warnings: {
          unusedOptionValues: [] as Array<{
            optionId: string;
            optionName: string;
            optionValueId: string;
            value: string;
          }>,
          message: null as string | null,
        },
      };

      // Track tất cả imageIds cần kiểm tra
      const allImageIds = new Set<string>();
      // Track productId để thống kê sau
      let productId: string | null = null;

      // Xóa từng variant
      for (const variantId of ids) {
        try {
          // 1. Kiểm tra variant có tồn tại không
          const variant = await variantRepo.findOne({
            where: { id: variantId },
            relations: ['imageMappings'],
          });

          if (!variant) {
            results.failed.push({
              variantId,
              reason: 'Biến thể không tồn tại!',
            });
            continue;
          }

          // Lưu productId để thống kê sau
          if (!productId) {
            productId = variant.productId;
          }

          // 2. Thu thập imageIds
          variant.imageMappings?.forEach((m) => allImageIds.add(m.imageId));

          // 3. Xóa mappings của variant với option values
          await variantOptionValueRepo
            .createQueryBuilder()
            .delete()
            .where('variantId = :variantId', { variantId })
            .execute();

          // 4. Xóa mappings của variant với images
          await imageMappingRepo
            .createQueryBuilder()
            .delete()
            .where('variantId = :variantId', { variantId })
            .execute();

          // 5. Xóa variant
          await variantRepo
            .createQueryBuilder()
            .delete()
            .where('id = :variantId', { variantId })
            .execute();

          results.deleted.variantCount++;
          results.deleted.variantIds.push(variantId);
        } catch (error) {
          results.failed.push({
            variantId,
            reason: error.message || 'Lỗi không xác định',
          });
        }
      }

      // 6. Kiểm tra và xóa images không còn được sử dụng
      for (const imageId of allImageIds) {
        const mappingCount = await imageMappingRepo
          .createQueryBuilder('mapping')
          .where('mapping.imageId = :imageId', { imageId })
          .getCount();

        // Nếu không còn variant nào sử dụng image này, xóa image
        if (mappingCount === 0) {
          await imageRepo
            .createQueryBuilder()
            .delete()
            .where('id = :imageId', { imageId })
            .execute();
          results.deleted.imagesDeleted++;
          results.deleted.imageIds.push(imageId);
        }
      }

      // 7. Thống kê option values không còn biến thể nào sử dụng
      if (productId && results.deleted.variantCount > 0) {
        const optionRepo = manager.getRepository(ProductOption);

        // Lấy tất cả option values của product này
        const allOptions = await optionRepo
          .createQueryBuilder('option')
          .where('option.productId = :productId', { productId })
          .leftJoinAndSelect('option.values', 'value')
          .getMany();

        for (const option of allOptions) {
          for (const optionValue of option.values || []) {
            // Đếm số biến thể đang sử dụng option value này
            const variantCount = await variantOptionValueRepo
              .createQueryBuilder('vov')
              .innerJoin('vov.variant', 'variant')
              .where('vov.optionValueId = :optionValueId', {
                optionValueId: optionValue.id,
              })
              .andWhere('variant.productId = :productId', { productId })
              .getCount();

            if (variantCount === 0) {
              results.warnings.unusedOptionValues.push({
                optionId: option.id,
                optionName: option.name,
                optionValueId: optionValue.id,
                value: optionValue.value,
              });
            }
          }
        }

        if (results.warnings.unusedOptionValues.length > 0) {
          results.warnings.message = `Có ${results.warnings.unusedOptionValues.length} giá trị thuộc tính không còn biến thể nào sử dụng. Các giá trị này vẫn được giữ lại trong hệ thống.`;
        }
      }

      results.success = results.failed.length === 0;
      return results;
    });
  }
}
