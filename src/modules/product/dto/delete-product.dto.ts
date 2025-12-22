import { IsNotEmpty, IsUUID } from 'class-validator';

export class DeleteProductDto {
  @IsNotEmpty({ message: 'Vui lòng cung cấp ID của sản phẩm' })
  @IsUUID('4', { message: 'ID của sản phẩm phải là định dạng UUID hợp lệ' })
  id: string;
}
