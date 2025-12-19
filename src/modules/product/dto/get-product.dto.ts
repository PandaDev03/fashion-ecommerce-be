import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { BaseQueryDto } from 'src/common/dto/base-query.dto';

export class GetProductDto extends BaseQueryDto {
  @IsOptional()
  @IsString({ message: 'Trường tìm kiếm "search" phải là chuỗi ký tự' })
  search?: string;

  @IsOptional()
  @IsUUID('4', { message: 'ID của danh mục phải là định dạng UUID hợp lệ' })
  categoryId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'ID của thương hiệu phải là định dạng UUID hợp lệ' })
  brandId?: string;

  @IsOptional()
  @IsEnum(['active', 'inactive', 'draft'])
  status?: 'active' | 'inactive' | 'draft';
}
