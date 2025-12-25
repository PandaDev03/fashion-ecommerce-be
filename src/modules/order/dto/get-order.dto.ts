import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString } from 'class-validator';
import { BaseQueryDto } from 'src/common/dto/base-query.dto';

export class GetOrderDto extends BaseQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?:
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'shipping'
    | 'delivered'
    | 'cancelled';

  @IsOptional()
  @IsString()
  paymentStatus?: 'unpaid' | 'paid' | 'refunded';

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
