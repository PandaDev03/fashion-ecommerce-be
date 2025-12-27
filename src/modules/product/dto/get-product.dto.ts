import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
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
  @IsArray()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map((s) => s.trim());
    return value;
  })
  categorySlugs?: string[];

  @IsOptional()
  @IsArray()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map((s) => s.trim());
    return value;
  })
  brandSlugs?: string[];

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

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeVariants?: boolean;
}
