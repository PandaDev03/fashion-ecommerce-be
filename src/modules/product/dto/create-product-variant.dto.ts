import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreateVariantOptionValueDto } from './create-variant-option-value.dto';
import { Type } from 'class-transformer';
import { ProductVariantImageDto } from './product-variant-image.dto';

export class CreateProductVariantDto {
  // productId: string;
  // price: number;
  // stock: number;
  // status?: 'active' | 'inactive';
  // position?: number;
  // optionValues: CreateVariantOptionValueDto[];
  // //   images?: CreateVariantImageDto[];

  @IsString()
  productId: string;

  @IsNumber()
  price: number;

  @IsInt()
  stock: number;

  @IsOptional()
  @IsEnum(['active', 'inactive'])
  // status?: string;
  status?: 'active' | 'inactive';

  @IsOptional()
  @IsInt()
  position?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantOptionValueDto)
  optionValues: CreateVariantOptionValueDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantImageDto)
  images?: ProductVariantImageDto[];
}
