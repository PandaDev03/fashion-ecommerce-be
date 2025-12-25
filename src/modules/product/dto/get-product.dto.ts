import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
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

  @IsOptional()
  @IsDate({
    message: 'Ngày tạo từ "createdFrom" phải là định dạng ngày tháng hợp lệ',
  })
  @Type(() => Date)
  createdFrom?: Date;

  @IsOptional()
  @IsDate({
    message: 'Ngày tạo đến "createdTo" phải là định dạng ngày tháng hợp lệ',
  })
  @Type(() => Date)
  createdTo?: Date;
}
