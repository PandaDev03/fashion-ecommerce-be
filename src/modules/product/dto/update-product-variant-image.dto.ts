import {
  IsEmpty,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class UpdateProductVariantImageDto {
  @IsEmpty()
  @IsUUID('4', { message: 'ID danh mục phải là định dạng UUID hợp lệ' })
  imageId?: string;

  @IsNotEmpty({ message: 'Vui lòng cung cấp URL hình ảnh' })
  @IsString({ message: 'URL hình ảnh phải là một chuỗi' })
  @MaxLength(500, { message: 'Chuỗi hình ảnh vượt quá 500 ký tự' })
  url: string;
}
