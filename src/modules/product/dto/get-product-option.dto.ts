import { IsNotEmpty, IsUUID } from 'class-validator';

export class GetProductOptionDto {
  @IsNotEmpty({ message: 'Vui lòng cung cấp ID của sản phẩm' })
  @IsUUID('4', { message: 'ID của thương hiệu phải là định dạng UUID hợp lệ' })
  productId: string;
}
