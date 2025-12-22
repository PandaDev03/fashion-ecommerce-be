import { IsArray, IsUUID } from 'class-validator';

export class DeleteManyBrandDto {
  @IsArray()
  @IsUUID('4', {
    each: true,
    message: 'ID của thương hiệu phải là định dạng UUID hợp lệ',
  })
  ids: string[];
}
