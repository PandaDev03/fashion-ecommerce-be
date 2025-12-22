import { IsNotEmpty, IsNumber, IsString, MaxLength } from 'class-validator';

export class CreateProductVariantImageDto {
  @IsNotEmpty({ message: 'Vui lòng cung cấp URL hình ảnh' })
  @IsString({ message: 'URL hình ảnh phải là một chuỗi' })
  @MaxLength(500, { message: 'Chuỗi hình ảnh vượt quá 500 ký tự' })
  url: string;

  @IsNotEmpty({ message: 'Vui lòng cung cấp vị trí' })
  @IsNumber({}, { message: 'Vị trí phải là số nguyên' })
  position: number;
}
