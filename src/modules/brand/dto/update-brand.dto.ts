import { PartialType } from '@nestjs/mapped-types';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { CreateBrandDto } from './create-brand.dto';

export class UpdateBrandDto extends PartialType(CreateBrandDto) {
  @IsNotEmpty({ message: 'Vui lòng cung cấp ID của thương hiệu' })
  @IsUUID('4', { message: 'ID của thương hiệu phải là định dạng UUID hợp lệ' })
  id: string;
}
