import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class RecordProductViewDto {
  @IsNotEmpty()
  @IsUUID()
  productId: string;

  @IsNotEmpty()
  @IsArray()
  @IsUUID('all', { each: true })
  productIds: string[];
}
