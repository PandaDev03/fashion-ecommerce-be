import { Transform } from 'class-transformer';
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
  @IsBoolean()
  parent?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value;
    return value;
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  parentIds?: string[];

  @IsOptional()
  @IsDate()
  createdFrom?: Date;

  @IsOptional()
  @IsDate()
  createdTo?: Date;
}
