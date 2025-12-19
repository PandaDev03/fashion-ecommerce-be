import { IsInt, IsOptional, IsString } from 'class-validator';

export class ProductVariantImageDto {
  @IsOptional()
  @IsString()
  imageId?: string;

  @IsString()
  url: string;

  @IsOptional()
  @IsInt()
  position?: number;
}
