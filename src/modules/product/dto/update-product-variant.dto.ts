import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { CreateVariantOptionValueDto } from './create-variant-option-value.dto';
import { Type } from 'class-transformer';
import { ProductVariantImageDto } from './product-variant-image.dto';

export class UpdateProductVariantDto {
  variantId: string;
  price?: number;
  stock?: number;
  status?: 'active' | 'inactive';
  position?: number;
  optionValues: CreateVariantOptionValueDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantImageDto)
  images?: ProductVariantImageDto[]; //
}
