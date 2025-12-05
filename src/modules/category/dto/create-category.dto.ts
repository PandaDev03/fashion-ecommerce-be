import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCategoryDto {
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  @IsString({ message: 'Tên danh mục phải là chuỗi' })
  @MaxLength(255, { message: 'Tên danh mục không được vượt quá 255 ký tự' })
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
  @IsString({ message: 'Parent ID phải là chuỗi' })
  parentId?: string | null;

  @IsInt({ message: 'Vị trí phải là số nguyên' })
  @Min(0, { message: 'Vị trí phải lớn hơn hoặc bằng 0' })
  @Transform(({ value }) => parseInt(value))
  position: number;
}
