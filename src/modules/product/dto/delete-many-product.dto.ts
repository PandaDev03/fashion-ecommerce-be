import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class DeleteManyProductDto {
  @IsNotEmpty({ message: 'Vui lòng cung cấp ID của sản phẩm' })
  @IsArray()
  @IsUUID('4', {
    each: true,
    message: 'ID của sản phẩm phải là định dạng UUID hợp lệ',
  })
  ids: string[];
}
