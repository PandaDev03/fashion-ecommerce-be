import { CreateProductVariantDto } from '../dto/create-product-variant.dto';

export class CreateProductDto {
  name: string;
  slug: string;
  description?: string;
  categoryId: string;
  brandId: string;
  price?: number;
  stock?: number;
  status: 'active' | 'inactive';
  images?: { url: string; position?: number }[];
  variants?: {
    price: number;
    stock: number;
    status: 'active' | 'inactive';
    position?: number;
    optionValues: {
      optionId?: string;
      optionName: string;
      value: string;
    }[];
    images?: { url: string; position?: number }[];
  }[];
}
