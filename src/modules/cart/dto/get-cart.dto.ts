import { Type } from 'class-transformer';
import { IsString, IsNotEmpty, IsNumber, Min, IsArray } from 'class-validator';

export class CartItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  variantId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  addedAt: number;
}

export class GetCartDto {
  @IsArray()
  @Type(() => CartItemDto)
  items: CartItemDto[];
}
