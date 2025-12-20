// export class CreateProductDto {
//   name: string;
//   slug: string;
//   description?: string;
//   categoryId: string;
//   brandId: string;
//   price?: number;
//   stock?: number;
//   status: 'active' | 'inactive';
//   images?: { url: string; position?: number }[];
//   variants?: {
//     price: number;
//     stock: number;
//     status: 'active' | 'inactive';
//     position?: number;
//     optionValues: {
//       optionId?: string;
//       optionName: string;
//       value: string;
//     }[];
//     images?: { url: string; position?: number }[];
//   }[];
// }

import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class ImageMetadataDto {
  @IsOptional()
  @IsNumber()
  position?: number;

  @IsOptional()
  @IsString()
  variantIndex?: number;
}

class OptionValueDto {
  @IsString()
  @IsNotEmpty()
  optionName: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}

class VariantDto {
  @IsNumber()
  price: number;

  @IsNumber()
  stock: number;

  @IsOptional()
  @IsString()
  status: 'active' | 'inactive';

  @IsOptional()
  @IsNumber()
  position?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionValueDto)
  optionValues: OptionValueDto[];
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsNotEmpty()
  brandId: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  stock?: number;

  @IsString()
  status: 'active' | 'inactive';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants?: VariantDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImageMetadataDto)
  imageMetadata?: ImageMetadataDto[];
}
