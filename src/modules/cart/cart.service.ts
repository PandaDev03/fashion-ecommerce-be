import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ProductVariant } from '../product/entities/product-variant.entity';
import { Product } from '../product/entities/product.entity';
import { CartItemDto } from './dto/get-cart.dto';

interface InvalidItem {
  productId: string;
  variantId: string | null;
  reason: string;
}

interface ValidCartItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  stock: string;
  quantity: number;
  status: string;
  hasVariant: boolean;
  variant: any;
  category: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
  images: any[];
}

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
  ) {}

  // async findCartItems(items: CartItemDto[]) {
  //   const variantIds = items.map((item) => item.variantId);

  //   // Fetch all variants with full product info
  //   const variants = await this.variantRepository
  //     .createQueryBuilder('variant')
  //     .where('variant.id IN (:...variantIds)', { variantIds })

  //     // Join product
  //     .leftJoinAndSelect('variant.product', 'product')
  //     .leftJoin('product.category', 'category')
  //     .addSelect(['category.id', 'category.name'])
  //     .leftJoin('product.brand', 'brand')
  //     .addSelect(['brand.id', 'brand.name'])

  //     // Join variant images
  //     .leftJoinAndSelect('variant.imageMappings', 'imageMapping')
  //     .leftJoinAndSelect('imageMapping.image', 'variantImage')

  //     // Join variant option values
  //     .leftJoinAndSelect('variant.optionValues', 'variantOptionValue')
  //     .leftJoinAndSelect('variantOptionValue.optionValue', 'optionValue')

  //     // Order by
  //     .addOrderBy('variantImage.position', 'ASC')
  //     .addOrderBy('variantOptionValue.position', 'ASC')

  //     .getMany();

  //   const validItems: ValidCartItem[] = [];
  //   const invalidItems: InvalidItem[] = [];

  //   for (const cartItem of items) {
  //     const variant = variants.find((v) => v.id === cartItem.variantId);

  //     if (!variant || !variant.product) {
  //       invalidItems.push({
  //         productId: cartItem.productId,
  //         variantId: cartItem.variantId,
  //         reason: 'Sản phẩm không tồn tại',
  //       });
  //       continue;
  //     }

  //     const product = variant.product;

  //     // Check if product is active
  //     if (product.status !== 'active') {
  //       invalidItems.push({
  //         productId: cartItem.productId,
  //         variantId: cartItem.variantId,
  //         reason: 'Sản phẩm không khả dụng',
  //       });
  //       continue;
  //     }

  //     // Check if variant is active
  //     if (variant.status !== 'active') {
  //       invalidItems.push({
  //         productId: cartItem.productId,
  //         variantId: cartItem.variantId,
  //         reason: 'Phiên bản sản phẩm không khả dụng',
  //       });
  //       continue;
  //     }

  //     // Check stock
  //     if (variant.stock <= 0) {
  //       invalidItems.push({
  //         productId: cartItem.productId,
  //         variantId: cartItem.variantId,
  //         reason: 'Sản phẩm đã hết hàng',
  //       });
  //       continue;
  //     }

  //     // Check if requested quantity exceeds stock
  //     if (cartItem.quantity > variant.stock) {
  //       invalidItems.push({
  //         productId: cartItem.productId,
  //         variantId: cartItem.variantId,
  //         reason: `Chỉ còn ${variant.stock} sản phẩm trong kho`,
  //       });
  //       continue;
  //     }

  //     // Map to cart item format
  //     const cartItemResponse = {
  //       id: product.id,
  //       name: product.name,
  //       slug: product.slug,
  //       description: product.description || '',
  //       price: variant.price.toString(),
  //       stock: variant.stock.toString(),
  //       quantity: cartItem.quantity, // Quantity từ localStorage
  //       status: product.status,
  //       variant: {
  //         id: variant.id,
  //         productId: variant.productId,
  //         price: variant.price.toString(),
  //         stock: variant.stock,
  //         status: variant.status,
  //         position: variant.position,
  //         createdAt: variant.createdAt,
  //         updatedAt: variant.updatedAt,
  //         createdBy: variant.createdBy,
  //         updatedBy: variant.updatedBy,

  //         // Map option values
  //         optionValues:
  //           variant.optionValues
  //             ?.filter((ov) => ov.optionValue) // Filter out null optionValues
  //             .map((ov) => ({
  //               id: ov.id,
  //               variantId: ov.variantId,
  //               optionValueId: ov.optionValueId,
  //               position: ov.position,
  //               createdAt: ov.createdAt,
  //               updatedAt: ov.updatedAt,
  //               createdBy: ov.createdBy,
  //               updatedBy: ov.updatedBy,
  //               optionValue: {
  //                 id: ov.optionValue!.id,
  //                 optionId: ov.optionValue!.optionId,
  //                 value: ov.optionValue!.value,
  //                 position: ov.optionValue!.position,
  //                 createdAt: ov.optionValue!.createdAt,
  //                 updatedAt: ov.optionValue!.updatedAt,
  //                 createdBy: ov.optionValue!.createdBy,
  //                 updatedBy: ov.optionValue!.updatedBy,
  //               },
  //             })) || [],

  //         // Map image mappings
  //         imageMappings:
  //           variant.imageMappings
  //             ?.filter((mapping) => mapping.image) // Filter out null images
  //             .map((mapping) => ({
  //               id: mapping.id,
  //               variantId: mapping.variantId,
  //               imageId: mapping.imageId,
  //               position: mapping.position,
  //               createdAt: mapping.createdAt,
  //               updatedAt: mapping.updatedAt,
  //               createdBy: mapping.createdBy,
  //               updatedBy: mapping.updatedBy,
  //               image: {
  //                 id: mapping.image!.id,
  //                 url: mapping.image!.url,
  //                 position: mapping.image!.position,
  //                 createdAt: mapping.image!.createdAt,
  //                 updatedAt: mapping.image!.updatedAt,
  //                 createdBy: mapping.image!.createdBy,
  //                 updatedBy: mapping.image!.updatedBy,
  //               },
  //             })) || [],
  //       },
  //       category: product.category
  //         ? {
  //             id: product.category.id,
  //             name: product.category.name,
  //           }
  //         : null,
  //       brand: product.brand
  //         ? {
  //             id: product.brand.id,
  //             name: product.brand.name,
  //           }
  //         : null,
  //       images:
  //         variant.imageMappings
  //           ?.filter((mapping) => mapping.image) // Filter out null images
  //           .map((mapping) => ({
  //             id: mapping.image!.id,
  //             url: mapping.image!.url,
  //             altText: product.name,
  //             position: mapping.position,
  //             productId: product.id,
  //             createdAt: mapping.image!.createdAt,
  //             updatedAt: mapping.image!.updatedAt,
  //             createdBy: mapping.image!.createdBy,
  //             updatedBy: mapping.image!.updatedBy,
  //           })) || [],
  //     };

  //     validItems.push(cartItemResponse);
  //   }

  //   return {
  //     data: validItems,
  //     invalidItems: invalidItems.length > 0 ? invalidItems : undefined,
  //   };
  // }

  async findCartItems(items: CartItemDto[]) {
    const variantIds = items
      .filter((item) => item.variantId)
      .map((item) => item.variantId);

    const productIds = items
      .filter((item) => !item.variantId)
      .map((item) => item.productId);

    const validItems: ValidCartItem[] = [];
    const invalidItems: InvalidItem[] = [];

    // Fetch variants for products with variants
    let variants: ProductVariant[] = [];
    if (variantIds.length > 0) {
      variants = await this.variantRepository
        .createQueryBuilder('variant')
        .where('variant.id IN (:...variantIds)', { variantIds })
        .leftJoinAndSelect('variant.product', 'product')
        .leftJoin('product.category', 'category')
        .addSelect(['category.id', 'category.name'])
        .leftJoin('product.brand', 'brand')
        .addSelect(['brand.id', 'brand.name'])
        .leftJoinAndSelect('variant.imageMappings', 'imageMapping')
        .leftJoinAndSelect('imageMapping.image', 'variantImage')
        .leftJoinAndSelect('variant.optionValues', 'variantOptionValue')
        .leftJoinAndSelect('variantOptionValue.optionValue', 'optionValue')
        .addOrderBy('variantImage.position', 'ASC')
        .addOrderBy('variantOptionValue.position', 'ASC')
        .getMany();
    }

    // Fetch simple products (no variants)
    let simpleProducts: Product[] = [];
    if (productIds.length > 0) {
      simpleProducts = await this.productRepository
        .createQueryBuilder('product')
        .where('product.id IN (:...productIds)', { productIds })
        .andWhere('product.hasVariants = :hasVariants', { hasVariants: false })
        .leftJoin('product.category', 'category')
        .addSelect(['category.id', 'category.name'])
        .leftJoin('product.brand', 'brand')
        .addSelect(['brand.id', 'brand.name'])
        .leftJoinAndSelect('product.images', 'images')
        .addOrderBy('images.position', 'ASC')
        .getMany();
    }

    // Process items with variants
    for (const cartItem of items) {
      if (cartItem.variantId) {
        const variant = variants.find((v) => v.id === cartItem.variantId);

        if (!variant || !variant.product) {
          invalidItems.push({
            productId: cartItem.productId,
            variantId: cartItem.variantId,
            reason: 'Sản phẩm không tồn tại',
          });
          continue;
        }

        const product = variant.product;

        if (product.status !== 'active') {
          invalidItems.push({
            productId: cartItem.productId,
            variantId: cartItem.variantId,
            reason: 'Sản phẩm không khả dụng',
          });
          continue;
        }

        if (variant.status !== 'active') {
          invalidItems.push({
            productId: cartItem.productId,
            variantId: cartItem.variantId,
            reason: 'Phiên bản sản phẩm không khả dụng',
          });
          continue;
        }

        if (variant.stock <= 0) {
          invalidItems.push({
            productId: cartItem.productId,
            variantId: cartItem.variantId,
            reason: 'Sản phẩm đã hết hàng',
          });
          continue;
        }

        if (cartItem.quantity > variant.stock) {
          invalidItems.push({
            productId: cartItem.productId,
            variantId: cartItem.variantId,
            reason: `Chỉ còn ${variant.stock} sản phẩm trong kho`,
          });
          continue;
        }

        validItems.push({
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description || '',
          price: variant.price.toString(),
          stock: variant.stock.toString(),
          quantity: cartItem.quantity,
          status: product.status,
          hasVariant: product.hasVariants,
          variant: {
            id: variant.id,
            productId: variant.productId,
            price: variant.price.toString(),
            stock: variant.stock,
            status: variant.status,
            position: variant.position,
            createdAt: variant.createdAt,
            updatedAt: variant.updatedAt,
            createdBy: variant.createdBy,
            updatedBy: variant.updatedBy,
            optionValues:
              variant.optionValues
                ?.filter((ov) => ov.optionValue)
                .map((ov) => ({
                  id: ov.id,
                  variantId: ov.variantId,
                  optionValueId: ov.optionValueId,
                  position: ov.position,
                  createdAt: ov.createdAt,
                  updatedAt: ov.updatedAt,
                  createdBy: ov.createdBy,
                  updatedBy: ov.updatedBy,
                  optionValue: {
                    id: ov.optionValue!.id,
                    optionId: ov.optionValue!.optionId,
                    value: ov.optionValue!.value,
                    position: ov.optionValue!.position,
                    createdAt: ov.optionValue!.createdAt,
                    updatedAt: ov.optionValue!.updatedAt,
                    createdBy: ov.optionValue!.createdBy,
                    updatedBy: ov.optionValue!.updatedBy,
                  },
                })) || [],
            imageMappings:
              variant.imageMappings
                ?.filter((mapping) => mapping.image)
                .map((mapping) => ({
                  id: mapping.id,
                  variantId: mapping.variantId,
                  imageId: mapping.imageId,
                  position: mapping.position,
                  createdAt: mapping.createdAt,
                  updatedAt: mapping.updatedAt,
                  createdBy: mapping.createdBy,
                  updatedBy: mapping.updatedBy,
                  image: {
                    id: mapping.image!.id,
                    url: mapping.image!.url,
                    position: mapping.image!.position,
                    createdAt: mapping.image!.createdAt,
                    updatedAt: mapping.image!.updatedAt,
                    createdBy: mapping.image!.createdBy,
                    updatedBy: mapping.image!.updatedBy,
                  },
                })) || [],
          },
          category: product.category
            ? {
                id: product.category.id,
                name: product.category.name,
              }
            : null,
          brand: product.brand
            ? {
                id: product.brand.id,
                name: product.brand.name,
              }
            : null,
          images:
            variant.imageMappings
              ?.filter((mapping) => mapping.image)
              .map((mapping) => ({
                id: mapping.image!.id,
                url: mapping.image!.url,
                altText: product.name,
                position: mapping.position,
                productId: product.id,
                createdAt: mapping.image!.createdAt,
                updatedAt: mapping.image!.updatedAt,
                createdBy: mapping.image!.createdBy,
                updatedBy: mapping.image!.updatedBy,
              })) || [],
        });
      } else {
        // Handle simple products
        const product = simpleProducts.find(
          (p: any) => p.id === cartItem.productId,
        );

        if (!product) {
          invalidItems.push({
            productId: cartItem.productId,
            variantId: null,
            reason: 'Sản phẩm không tồn tại',
          });
          continue;
        }

        if (product.status !== 'active') {
          invalidItems.push({
            productId: cartItem.productId,
            variantId: null,
            reason: 'Sản phẩm không khả dụng',
          });
          continue;
        }

        if (product.stock && product.stock <= 0) {
          invalidItems.push({
            productId: cartItem.productId,
            variantId: null,
            reason: 'Sản phẩm đã hết hàng',
          });
          continue;
        }

        if (product.stock && cartItem.quantity > product.stock) {
          invalidItems.push({
            productId: cartItem.productId,
            variantId: null,
            reason: `Chỉ còn ${product.stock} sản phẩm trong kho`,
          });
          continue;
        }

        validItems.push({
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description || '',
          price: (product.price ?? 0).toString(),
          stock: (product.stock ?? 0).toString(),
          quantity: cartItem.quantity,
          status: product.status,
          hasVariant: product.hasVariants,
          variant: null,
          category: product.category
            ? {
                id: product.category.id,
                name: product.category.name,
              }
            : null,
          brand: product.brand
            ? {
                id: product.brand.id,
                name: product.brand.name,
              }
            : null,
          images:
            product.images?.map((image) => ({
              id: image.id,
              url: image.url,
              altText: product.name,
              position: image.position,
              productId: product.id,
              createdAt: image.createdAt,
              updatedAt: image.updatedAt,
              createdBy: image.createdBy,
              updatedBy: image.updatedBy,
            })) || [],
        });
      }
    }

    return {
      data: validItems,
      invalidItems: invalidItems.length > 0 ? invalidItems : undefined,
    };
  }
}
