import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { CreateCategoryDto } from './create-category.dto';

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @IsNotEmpty({ message: 'ID của danh mục không được để trống' })
  @IsUUID('4', { message: 'ID danh mục phải là định dạng UUID hợp lệ' })
  id: string;
}
