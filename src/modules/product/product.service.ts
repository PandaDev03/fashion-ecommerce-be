import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';

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
import { CreateProductDto } from './dto/create-product.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

interface ProcessedOption {
  optionId: string;
  optionValueId: string;
  optionPosition: number;
}

interface CloudinaryFile extends Express.Multer.File {
  path: string;
  filename: string;
}

@Injectable()
export class ProductService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly productRepository: ProductRepository,
    private readonly cloudinaryService: CloudinaryService,
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
    const { slug, includeVariants } = getProductBySlugDto;
    return await this.productRepository.findBySlug(slug, includeVariants);
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

  private async deleteProductInTransaction(
    manager: EntityManager,
    productId: string,
  ) {
    const productRepo = manager.getRepository(Product);
    const variantRepo = manager.getRepository(ProductVariant);
    const optionRepo = manager.getRepository(ProductOption);
    const optionValueRepo = manager.getRepository(ProductOptionValue);
    const variantOptionValueRepo = manager.getRepository(
      ProductVariantOptionValue,
    );
    const productImageRepo = manager.getRepository(ProductImage);
    const variantImageRepo = manager.getRepository(ProductVariantImage);
    const imageMappingRepo = manager.getRepository(ProductVariantImageMapping);

    // Kiểm tra product có tồn tại không
    const product = await productRepo.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new Error(`Sản phẩm với ID ${productId} không tồn tại!`);
    }

    // Thống kê số lượng đã xóa
    const stats = {
      productsDeleted: 0,
      variantsDeleted: 0,
      optionsDeleted: 0,
      optionValuesDeleted: 0,
      variantOptionValuesDeleted: 0,
      productImagesDeleted: 0,
      variantImagesDeleted: 0,
      variantImageMappingsDeleted: 0,
    };

    // 1. Lấy danh sách variant IDs
    const variants = await variantRepo.find({
      where: { productId },
      select: ['id'],
    });
    const variantIds = variants.map((v) => v.id);

    // 2. Lấy danh sách option IDs
    const options = await optionRepo.find({
      where: { productId },
      select: ['id'],
    });
    const optionIds = options.map((o) => o.id);

    // 3. LẤY danh sách imageIds TRƯỚC KHI xóa mappings
    let imageIds: string[] = [];
    if (variantIds.length > 0) {
      const variantImageMappings = await imageMappingRepo.find({
        where: { variantId: In(variantIds) },
        select: ['imageId'],
      });
      imageIds = [...new Set(variantImageMappings.map((m) => m.imageId))];
    }

    // 4. Xóa ProductVariantImageMappings
    if (variantIds.length > 0) {
      const deleteMappingsResult = await imageMappingRepo
        .createQueryBuilder()
        .delete()
        .where('variantId IN (:...variantIds)', { variantIds })
        .execute();
      stats.variantImageMappingsDeleted = deleteMappingsResult.affected || 0;
    }

    // 5. Xóa ProductVariantImages (chỉ xóa những ảnh không được dùng bởi variant khác)
    if (imageIds.length > 0) {
      // Kiểm tra xem các ảnh này có được dùng bởi variant nào khác không
      const otherVariantMappings = await imageMappingRepo
        .createQueryBuilder('mapping')
        .where('mapping.imageId IN (:...imageIds)', { imageIds })
        .andWhere('mapping.variantId NOT IN (:...variantIds)', { variantIds })
        .getCount();

      // Nếu không có variant nào khác dùng, mới xóa
      if (otherVariantMappings === 0) {
        const deleteImagesResult = await variantImageRepo
          .createQueryBuilder()
          .delete()
          .where('id IN (:...imageIds)', { imageIds })
          .execute();
        stats.variantImagesDeleted = deleteImagesResult.affected || 0;
      }
    }

    // 5. Xóa ProductVariantOptionValues
    if (variantIds.length > 0) {
      const deleteVariantOptionValuesResult = await variantOptionValueRepo
        .createQueryBuilder()
        .delete()
        .where('variantId IN (:...variantIds)', { variantIds })
        .execute();
      stats.variantOptionValuesDeleted =
        deleteVariantOptionValuesResult.affected || 0;
    }

    // 6. Xóa ProductVariants
    if (variantIds.length > 0) {
      const deleteVariantsResult = await variantRepo
        .createQueryBuilder()
        .delete()
        .where('id IN (:...variantIds)', { variantIds })
        .execute();
      stats.variantsDeleted = deleteVariantsResult.affected || 0;
    }

    // 7. Xóa ProductOptionValues
    if (optionIds.length > 0) {
      const deleteOptionValuesResult = await optionValueRepo
        .createQueryBuilder()
        .delete()
        .where('optionId IN (:...optionIds)', { optionIds })
        .execute();
      stats.optionValuesDeleted = deleteOptionValuesResult.affected || 0;
    }

    // 8. Xóa ProductOptions
    if (optionIds.length > 0) {
      const deleteOptionsResult = await optionRepo
        .createQueryBuilder()
        .delete()
        .where('id IN (:...optionIds)', { optionIds })
        .execute();
      stats.optionsDeleted = deleteOptionsResult.affected || 0;
    }

    // 9. Xóa ProductImages
    const deleteProductImagesResult = await productImageRepo
      .createQueryBuilder()
      .delete()
      .where('productId = :productId', { productId })
      .execute();
    stats.productImagesDeleted = deleteProductImagesResult.affected || 0;

    // 10. Cuối cùng, xóa Product
    const deleteProductResult = await productRepo
      .createQueryBuilder()
      .delete()
      .where('id = :productId', { productId })
      .execute();
    stats.productsDeleted = deleteProductResult.affected || 0;

    return {
      success: true,
      message: 'Xóa sản phẩm thành công',
      productId,
      ...stats,
    };
  }

  async createProduct(
    // dto: ICreate<CreateProductDto> & { files?: Express.Multer.File[] },
    dto: ICreate<CreateProductDto> & { files?: CloudinaryFile[] },
  ) {
    return await this.dataSource.transaction(async (manager) => {
      const { createdBy, variables, files } = dto;
      const {
        name,
        slug,
        description,
        categoryId,
        brandId,
        price,
        stock,
        status,
        variants,
      } = variables;

      const productRepo = manager.getRepository(Product);
      const productImageRepo = manager.getRepository(ProductImage);
      const optionRepo = manager.getRepository(ProductOption);
      const optionValueRepo = manager.getRepository(ProductOptionValue);
      const variantRepo = manager.getRepository(ProductVariant);
      const variantOptionValueRepo = manager.getRepository(
        ProductVariantOptionValue,
      );
      const variantImageRepo = manager.getRepository(ProductVariantImage);
      const imageMappingRepo = manager.getRepository(
        ProductVariantImageMapping,
      );

      // ========== BƯỚC 1: Upload tất cả images lên Cloudinary ==========
      let uploadedImages: Array<{
        uid: string;
        url: string;
        publicId: string;
      }> = [];

      if (files && files.length > 0) {
        try {
          // const cloudinaryResults =
          //   await this.cloudinaryService.uploadMultipleImages(files);
          // console.log('cloudinaryResults', cloudinaryResults);

          uploadedImages = files.map((result, index) => ({
            uid: files[index].originalname, // originalname = uid
            url: result.path,
            publicId: result.filename,
          }));
        } catch (error) {
          throw new Error(`Lỗi khi upload ảnh: ${error.message}`);
        }
      }

      // Tạo Map để tra cứu nhanh: uid → uploaded image
      const imageMap = new Map(uploadedImages.map((img) => [img.uid, img]));

      // ========== BƯỚC 2: Tạo Product ==========
      const hasVariants = variants && variants.length > 0;

      const insertProductResult = await productRepo
        .createQueryBuilder()
        .insert()
        .values({
          name,
          slug,
          description,
          categoryId,
          brandId,
          price,
          stock,
          hasVariants,
          status,
          createdBy,
          updatedBy: createdBy,
        })
        .execute();

      const productId = insertProductResult.identifiers[0].id;

      // ========== BƯỚC 3: Xử lý KHÔNG có variants ==========
      if (!hasVariants) {
        // Lưu images vào ProductImage
        for (let i = 0; i < uploadedImages.length; i++) {
          const { url } = uploadedImages[i];

          await productImageRepo
            .createQueryBuilder()
            .insert()
            .values({
              productId,
              url,
              position: i,
              createdBy,
              updatedBy: createdBy,
            })
            .execute();
        }

        return {
          success: true,
          productId,
          message: 'Tạo sản phẩm thành công (không có biến thể)',
        };
      }

      // ========== BƯỚC 4: Xử lý CÓ variants ==========

      // 4.1. Tạo options và option values
      const optionMap = new Map<string, Set<string>>();

      variants.forEach((variant) => {
        variant.optionValues.forEach((ov) => {
          if (!optionMap.has(ov.optionName)) {
            optionMap.set(ov.optionName, new Set());
          }
          optionMap.get(ov.optionName)!.add(ov.value);
        });
      });

      const createdOptions: Map<
        string,
        { optionId: string; values: Map<string, string> }
      > = new Map();

      let optionPosition = 0;
      for (const [optionName, valuesSet] of optionMap.entries()) {
        const insertOptionResult = await optionRepo
          .createQueryBuilder()
          .insert()
          .values({
            productId,
            name: optionName,
            position: optionPosition++,
            createdBy,
            updatedBy: createdBy,
          })
          .execute();

        const optionId = insertOptionResult.identifiers[0].id;

        const valueMap = new Map<string, string>();
        let valuePosition = 0;

        for (const value of valuesSet) {
          const insertValueResult = await optionValueRepo
            .createQueryBuilder()
            .insert()
            .values({
              optionId,
              value,
              position: valuePosition++,
              createdBy,
              updatedBy: createdBy,
            })
            .execute();

          const optionValueId = insertValueResult.identifiers[0].id;
          valueMap.set(value, optionValueId);
        }

        createdOptions.set(optionName, {
          optionId,
          values: valueMap,
        });
      }

      // 4.2. Xác định Primary Option (option đầu tiên)
      const primaryOptionName = Array.from(optionMap.keys())[0];

      // 4.3. Nhóm variants theo Primary Option Value
      const variantsByPrimaryOption = new Map<string, typeof variants>();

      variants.forEach((variant) => {
        const primaryValue = variant.optionValues.find(
          (ov) => ov.optionName === primaryOptionName,
        )?.value;

        if (primaryValue) {
          if (!variantsByPrimaryOption.has(primaryValue)) {
            variantsByPrimaryOption.set(primaryValue, []);
          }
          variantsByPrimaryOption.get(primaryValue)!.push(variant);
        }
      });

      // 4.4. Tạo variants và xử lý images
      const createdVariantIds: string[] = [];
      const savedImagesByPrimaryOption = new Map<string, string[]>();

      for (const [index, variantDto] of variants.entries()) {
        // Tạo ProductVariant
        const insertVariantResult = await variantRepo
          .createQueryBuilder()
          .insert()
          .values({
            productId,
            price: variantDto.price,
            stock: variantDto.stock,
            status: variantDto.status ?? 'active',
            position: variantDto.position ?? index,
            createdBy,
            updatedBy: createdBy,
          })
          .execute();

        const variantId = insertVariantResult.identifiers[0].id;
        createdVariantIds.push(variantId);

        // Tạo mapping với option values
        let optionValuePosition = 0;
        for (const ov of variantDto.optionValues) {
          const option = createdOptions.get(ov.optionName);
          if (!option) continue;

          const optionValueId = option.values.get(ov.value);
          if (!optionValueId) continue;

          await variantOptionValueRepo
            .createQueryBuilder()
            .insert()
            .values({
              variantId,
              optionValueId,
              position: optionValuePosition++,
              createdBy,
              updatedBy: createdBy,
            })
            .execute();
        }

        // ========== XỬ LÝ IMAGES ==========

        const primaryValue = variantDto.optionValues.find(
          (ov) => ov.optionName === primaryOptionName,
        )?.value;

        if (primaryValue) {
          const variantsWithSamePrimaryOption =
            variantsByPrimaryOption.get(primaryValue) || [];
          const isFirstVariant =
            variantsWithSamePrimaryOption[0] === variantDto;

          if (isFirstVariant) {
            // Lấy images cho variant này dựa vào uid
            const variantImages = variantDto.images
              .map((img) => imageMap.get(img.uid)) // Tra cứu bằng uid
              .filter(Boolean) as Array<{ url: string; publicId: string }>;

            if (variantImages.length > 0) {
              const savedImageIds: string[] = [];

              // Lưu images vào ProductVariantImage và mapping
              for (let i = 0; i < variantImages.length; i++) {
                const { url } = variantImages[i];

                // Insert vào ProductVariantImage
                const insertImageResult = await variantImageRepo
                  .createQueryBuilder()
                  .insert()
                  .values({
                    url,
                    position: i,
                    createdBy,
                    updatedBy: createdBy,
                  })
                  .execute();

                const imageId = insertImageResult.identifiers[0].id;
                savedImageIds.push(imageId);

                // Insert vào ProductVariantImageMapping
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

              // Lưu lại imageIds để copy cho các variants khác cùng primary option
              savedImagesByPrimaryOption.set(primaryValue, savedImageIds);
            }
          } else {
            // Copy images từ variant đầu tiên cùng primary option
            const savedImageIds = savedImagesByPrimaryOption.get(primaryValue);

            if (savedImageIds && savedImageIds.length > 0) {
              for (let i = 0; i < savedImageIds.length; i++) {
                await imageMappingRepo
                  .createQueryBuilder()
                  .insert()
                  .values({
                    variantId,
                    imageId: savedImageIds[i],
                    position: i,
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
        productId,
        variantIds: createdVariantIds,
        uploadedImagesCount: uploadedImages.length,
        message: `Tạo sản phẩm thành công với ${variants.length} biến thể`,
      };
    });
  }

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

      // 1. Kiểm tra số lượng variant hiện tại
      const existingVariantCount = await variantRepo
        .createQueryBuilder('variant')
        .where('variant.productId = :productId', { productId })
        .getCount();

      const isFirstVariant = existingVariantCount === 0;

      // 2. Kiểm tra variant đã tồn tại (nếu không phải variant đầu tiên)
      if (!isFirstVariant) {
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
      }

      // 3. Lấy position cao nhất
      const maxPositionResult = await variantRepo
        .createQueryBuilder('variant')
        .where('variant.productId = :productId', { productId })
        .select('MAX(variant.position)', 'maxPosition')
        .getRawOne();

      const newPosition =
        position ?? (maxPositionResult?.maxPosition ?? -1) + 1;

      // 4. Tạo variant mới
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

      // 5. Xử lý options và option values
      const processedOptions: ProcessedOption[] = [];

      for (const optionValue of optionValues) {
        const {
          optionId,
          optionValueId,
          value,
          isNew,
          optionName,
          isNewOption,
        } = optionValue;

        let finalOptionId: string;

        // 5.1. Xử lý ProductOption (chỉ cho variant đầu tiên)
        if (isFirstVariant && isNewOption && optionName) {
          // Tạo ProductOption mới
          const maxOptionPosition = await optionRepo
            .createQueryBuilder('option')
            .where('option.productId = :productId', { productId })
            .select('MAX(option.position)', 'maxPosition')
            .getRawOne();

          const newOptionPosition = (maxOptionPosition?.maxPosition ?? -1) + 1;

          const insertOptionResult = await optionRepo
            .createQueryBuilder()
            .insert()
            .values({
              productId,
              name: optionName,
              position: newOptionPosition,
              createdBy,
              updatedBy: createdBy,
            })
            .execute();

          finalOptionId = insertOptionResult.identifiers[0].id;
        } else if (optionId) {
          // Sử dụng option đã có
          finalOptionId = optionId;
        } else {
          throw new Error('Thông tin option không hợp lệ!');
        }

        // 5.2. Xử lý ProductOptionValue
        let finalOptionValueId: string;

        if (isNew && value) {
          // Tạo option value mới
          const maxValuePosition = await optionValueRepo
            .createQueryBuilder('optionValue')
            .where('optionValue.optionId = :optionId', {
              optionId: finalOptionId,
            })
            .select('MAX(optionValue.position)', 'maxPosition')
            .getRawOne();

          const newValuePosition = (maxValuePosition?.maxPosition ?? -1) + 1;

          const insertValueResult = await optionValueRepo
            .createQueryBuilder()
            .insert()
            .values({
              optionId: finalOptionId,
              value,
              position: newValuePosition,
              createdBy,
              updatedBy: createdBy,
            })
            .execute();

          finalOptionValueId = insertValueResult.identifiers[0].id;
        } else if (optionValueId) {
          // Sử dụng option value đã có
          finalOptionValueId = optionValueId;
        } else {
          throw new Error('Thông tin option value không hợp lệ!');
        }

        // Lưu thông tin để sắp xếp sau
        const option = await optionRepo.findOne({
          where: { id: finalOptionId },
        });

        processedOptions.push({
          optionId: finalOptionId,
          optionValueId: finalOptionValueId,
          optionPosition: option?.position ?? 999,
        });
      }

      // 5.3. Sắp xếp theo position của ProductOption
      processedOptions.sort((a, b) => a.optionPosition - b.optionPosition);

      // 5.4. Tạo ProductVariantOptionValue
      for (const [index, processedOption] of processedOptions.entries()) {
        await variantOptionValueRepo
          .createQueryBuilder()
          .insert()
          .values({
            variantId,
            optionValueId: processedOption.optionValueId,
            position: index,
            createdBy,
            updatedBy: createdBy,
          })
          .execute();
      }

      // 6. Xử lý images
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
        // Xóa ProductImage
        if (isFirstVariant) {
          await productImageRepo
            .createQueryBuilder()
            .delete()
            .where('productId = :productId', { productId })
            .execute();
        }
      } else {
        // ========== Copy ảnh tự động ==========
        if (isFirstVariant) {
          // BƯỚC 1: Copy từ ProductImage (khi là variant đầu tiên)
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

            // Xóa ProductImage sau khi copy
            await productImageRepo
              .createQueryBuilder()
              .delete()
              .where('productId = :productId', { productId })
              .execute();
          }
        } else {
          // BƯỚC 2: Copy từ variant khác (không phải variant đầu tiên)
          const colorOptionId = await this.getColorOptionId(manager, productId);

          if (colorOptionId) {
            // ===== Case 1: Product có option Màu sắc =====
            const colorOptionValueId = this.getColorOptionValueId(
              processedOptions,
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

      // 7. Update Product khi tạo variant đầu tiên
      if (isFirstVariant) {
        await productRepo
          .createQueryBuilder()
          .update()
          .set({
            price: null,
            stock: null,
            hasVariants: true,
            updatedBy: createdBy,
          })
          .where('id = :productId', { productId })
          .execute();
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
      if (status !== undefined) productData.status = status;
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

          // 2.1. Kiểm tra product có option Màu sắc không
          const colorOptionId = await this.getColorOptionId(manager, productId);

          let variantsToUpdate: ProductVariant[] = [];

          if (colorOptionId) {
            // 2.2a. Product CÓ option Màu sắc -> Chỉ update variants CÙNG MÀU
            const colorOptionValueId =
              await this.getColorOptionValueIdFromVariant(
                manager,
                variantId,
                productId,
              );

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
          } else {
            // 2.2b. Product KHÔNG CÓ option Màu sắc -> Update TẤT CẢ variants
            variantsToUpdate = await variantRepo
              .createQueryBuilder('variant')
              .where('variant.productId = :productId', { productId })
              .getMany();
          }

          // 2.3. Xử lý từng variant
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

      // 5. Tính số lượng variants đã update (cho response)
      let variantsUpdatedCount = 0;
      if (hasVariants && variantId && images !== undefined) {
        const colorOptionId = await this.getColorOptionId(manager, productId);

        if (colorOptionId) {
          // Có màu sắc -> đếm variants cùng màu
          const colorOptionValueId =
            await this.getColorOptionValueIdFromVariant(
              manager,
              variantId,
              productId,
            );
          if (colorOptionValueId) {
            const sameColorVariants = await this.getVariantsBySameColor(
              manager,
              productId,
              colorOptionValueId,
            );
            variantsUpdatedCount = sameColorVariants?.length || 0;
          } else {
            variantsUpdatedCount = 1;
          }
        } else {
          // Không có màu sắc -> đếm tất cả variants
          variantsUpdatedCount = await variantRepo
            .createQueryBuilder('variant')
            .where('variant.productId = :productId', { productId })
            .getCount();
        }
      }

      return {
        success: true,
        affected: {
          product: Object.keys(productData).length > 0 ? 1 : 0,
          variant: variantId && Object.keys(variantData).length > 0 ? 1 : 0,
          images: images ? images.length : 0,
          variantsUpdated: variantsUpdatedCount,
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

      // 2. Nếu có optionValues mới, kiểm tra trùng lặp và cập nhật
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

        // Kiểm tra xem optionValues có thực sự thay đổi không
        const currentOptionValueIds = (
          existingVariant.optionValues?.map((vo) => vo.optionValueId) || []
        ).sort();

        const isOptionValuesChanged =
          JSON.stringify(currentOptionValueIds) !==
          JSON.stringify(newOptionValueIds);

        // CHỈ XỬ LÝ IMAGES KHI OPTION VALUES THỰC SỰ THAY ĐỔI
        if (isOptionValuesChanged) {
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

          sortedOptionValues.sort(
            (a, b) => a.optionPosition - b.optionPosition,
          );

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
            // Trường hợp 2: Không có ảnh mới -> Tự động copy ảnh
            const colorOptionId = await this.getColorOptionId(
              manager,
              existingVariant.productId,
            );

            if (colorOptionId) {
              // 2a. Product CÓ option Màu sắc -> Copy ảnh từ variant cùng màu
              const colorOptionValueId = this.getColorOptionValueId(
                sortedOptionValues,
                colorOptionId,
              );

              if (colorOptionValueId) {
                const sameColorVariant = await variantRepo
                  .createQueryBuilder('variant')
                  .leftJoinAndSelect(
                    'variant.optionValues',
                    'variantOptionValue',
                  )
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
            } else {
              // 2b. Product KHÔNG CÓ option Màu sắc -> Copy ảnh từ BẤT KỲ variant nào
              const anyVariant = await variantRepo
                .createQueryBuilder('variant')
                .leftJoinAndSelect('variant.imageMappings', 'imageMapping')
                .leftJoinAndSelect('imageMapping.image', 'image')
                .where('variant.productId = :productId', {
                  productId: existingVariant.productId,
                })
                .andWhere('variant.id != :variantId', { variantId })
                .getOne();

              if (
                anyVariant?.imageMappings &&
                anyVariant.imageMappings.length > 0
              ) {
                for (const [
                  index,
                  mapping,
                ] of anyVariant.imageMappings.entries()) {
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

          // 9. XÓA IMAGES MỒ CÔI
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
        } else {
          // Option values KHÔNG thay đổi -> Chỉ update option values (không động chạm images)
          // Xóa option values cũ
          await variantOptionValueRepo
            .createQueryBuilder()
            .delete()
            .where('variantId = :variantId', { variantId })
            .execute();

          // Sắp xếp và thêm lại option values
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

          sortedOptionValues.sort(
            (a, b) => a.optionPosition - b.optionPosition,
          );

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
        }
      }

      // 10. Cập nhật thông tin variant (price, stock, status, position)
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

      // 11. Nếu có images được cung cấp mà không có optionValues thay đổi
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

        // 11.1. XÓA IMAGES KHÔNG CÒN DÙNG
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

      // 12. Trả về variant đã cập nhật với đầy đủ relations
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

  async delete(id: string) {
    return await this.dataSource.transaction(async (manager) => {
      return await this.deleteProductInTransaction(manager, id);
    });
  }

  async deleteMany(productIds: string[]) {
    if (!productIds || productIds.length === 0) {
      throw new Error('Danh sách productIds không được rỗng!');
    }

    return await this.dataSource.transaction(async (manager) => {
      const productRepo = manager.getRepository(Product);
      const variantRepo = manager.getRepository(ProductVariant);
      const optionRepo = manager.getRepository(ProductOption);
      const optionValueRepo = manager.getRepository(ProductOptionValue);
      const variantOptionValueRepo = manager.getRepository(
        ProductVariantOptionValue,
      );
      const productImageRepo = manager.getRepository(ProductImage);
      const variantImageRepo = manager.getRepository(ProductVariantImage);
      const imageMappingRepo = manager.getRepository(
        ProductVariantImageMapping,
      );

      // 1. Lấy tất cả variant IDs
      const variants = await variantRepo.find({
        where: { productId: In(productIds) },
        select: ['id'],
      });
      const variantIds = variants.map((v) => v.id);

      // 2. Lấy tất cả option IDs
      const options = await optionRepo.find({
        where: { productId: In(productIds) },
        select: ['id'],
      });
      const optionIds = options.map((o) => o.id);

      // 3. Lấy tất cả image IDs
      const imageMappings = await imageMappingRepo.find({
        where: { variantId: In(variantIds) },
        select: ['imageId'],
      });
      const imageIds = [...new Set(imageMappings.map((m) => m.imageId))];

      // Thực hiện xóa bulk
      const results = {
        variantImageMappingsDeleted: 0,
        variantImagesDeleted: 0,
        variantOptionValuesDeleted: 0,
        variantsDeleted: 0,
        optionValuesDeleted: 0,
        optionsDeleted: 0,
        productImagesDeleted: 0,
        productsDeleted: 0,
      };

      // Xóa theo thứ tự phụ thuộc
      if (variantIds.length > 0) {
        results.variantImageMappingsDeleted =
          (await imageMappingRepo.delete({ variantId: In(variantIds) }))
            .affected || 0;

        results.variantOptionValuesDeleted =
          (await variantOptionValueRepo.delete({ variantId: In(variantIds) }))
            .affected || 0;

        results.variantsDeleted =
          (await variantRepo.delete({ id: In(variantIds) })).affected || 0;
      }

      if (imageIds.length > 0) {
        results.variantImagesDeleted =
          (await variantImageRepo.delete({ id: In(imageIds) })).affected || 0;
      }

      if (optionIds.length > 0) {
        results.optionValuesDeleted =
          (await optionValueRepo.delete({ optionId: In(optionIds) }))
            .affected || 0;

        results.optionsDeleted =
          (await optionRepo.delete({ id: In(optionIds) })).affected || 0;
      }

      results.productImagesDeleted =
        (await productImageRepo.delete({ productId: In(productIds) }))
          .affected || 0;

      results.productsDeleted =
        (await productRepo.delete({ id: In(productIds) })).affected || 0;

      return {
        success: true,
        message: `Đã xóa ${results.productsDeleted} sản phẩm`,
        productIds,
        ...results,
      };
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
