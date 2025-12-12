import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

import { BaseQueryDto } from 'src/common/dto/base-query.dto';

export class GetCategoryDto extends BaseQueryDto {
  @Transform(({ value }) => value === 'true')
  @IsOptional()
  @IsBoolean({
    message: 'Trường "parent" phải là giá trị boolean (true/false)',
  })
  parent?: boolean;

  @IsOptional()
  @IsString({ message: 'Trường tìm kiếm "search" phải là chuỗi ký tự' })
  search?: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value;
    return value;
  })
  @IsOptional()
  @IsArray({ message: 'Danh sách ID cha "parentIds" phải là một mảng' })
  @IsUUID('4', {
    each: true,
    message: 'Mỗi ID trong "parentIds" phải là định dạng UUID v4 hợp lệ',
  })
  parentIds?: string[];

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
