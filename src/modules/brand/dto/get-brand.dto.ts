import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString } from 'class-validator';
import { BaseQueryDto } from 'src/common/dto/base-query.dto';

export class GetBrandDto extends BaseQueryDto {
  @IsOptional()
  @IsString({ message: 'Trường tìm kiếm "search" phải là chuỗi ký tự' })
  search?: string;

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
