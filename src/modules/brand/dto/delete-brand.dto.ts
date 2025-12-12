import { IsNotEmpty, IsUUID } from 'class-validator';

export class DeleteBrandDto {
  @IsNotEmpty({ message: 'Vui lòng cung cấp ID của thương hiệu' })
  @IsUUID('4', { message: 'ID của thương hiệu phải là định dạng UUID hợp lệ' })
  id: string;
}
