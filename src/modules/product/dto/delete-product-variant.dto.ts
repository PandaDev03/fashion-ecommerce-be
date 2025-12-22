import { IsNotEmpty } from 'class-validator';

export class DeleteProductVariantDto {
  @IsNotEmpty({ message: 'Vui lòng cung cấp ID của biến thể' })
  variantIds: string | string[];
}
