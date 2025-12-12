import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBrandDto {
  @IsNotEmpty({ message: 'Tên thương hiệu không được để trống' })
  @IsString({ message: 'Tên thương hiệu phải là chuỗi' })
  @MaxLength(255, { message: 'Tên thương hiệu không được vượt quá 255 ký tự' })
  name: string;

  @IsNotEmpty({ message: 'Slug không được để trống' })
  @IsString({ message: 'Slug phải là chuỗi' })
  @MaxLength(255, { message: 'Slug không được vượt quá 255 ký tự' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  slug: string;

  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi' })
  description?: string | null;

  @IsOptional()
  @IsString({ message: 'Website domain phải là một URL hợp lệ' })
  website?: string | null;

  @IsOptional()
  @IsString({ message: 'Facebook domain phải là một URL hợp lệ' })
  facebook?: string | null;

  @IsOptional()
  @IsString({ message: 'Instagram domain phải là một URL hợp lệ' })
  instagram?: string | null;
}
