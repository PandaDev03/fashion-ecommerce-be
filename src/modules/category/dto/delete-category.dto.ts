import { IsNotEmpty, IsUUID } from 'class-validator';

export class DeleteCategoryDto {
  @IsNotEmpty({ message: 'Vui lòng cung cấp ID của danh mục' })
  @IsUUID('4', { message: 'ID danh mục phải là định dạng UUID hợp lệ' })
  id: string;
}
