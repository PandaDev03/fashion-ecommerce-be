import { UpdateProductVariantImageDto } from './update-product-variant-image.dto';

export class UpdateProductDto {
  productId: string;
  name?: string;
  description?: string;
  slug?: string;
  categoryId?: string;
  brandId?: string;
  
  variantId: string;
  position?: number;
  price?: number;
  stock?: number;
  status?: 'active' | 'inactive';
  
  images?: UpdateProductVariantImageDto[];
}
