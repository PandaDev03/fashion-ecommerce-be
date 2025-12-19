import { IsEmpty, IsNotEmpty, IsNumber, IsUUID } from 'class-validator';

export class CreateProductVariantImageMappingDto {
  @IsNotEmpty({ message: 'Vui lòng cung cấp ID của danh mục' })
  @IsUUID('4', { message: 'ID danh mục phải là định dạng UUID hợp lệ' })
  variantId: string;

  @IsEmpty()
  @IsUUID('4', { message: 'ID danh mục phải là định dạng UUID hợp lệ' })
  imageId: string | undefined;

  @IsNotEmpty({ message: 'Vui lòng cung cấp vị trí' })
  @IsNumber({}, { message: 'Vị trí phải là số nguyên' })
  position: number;
}
