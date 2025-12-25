import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

enum OrderStatusUpdate {
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export class UpdateOrderStatusDto {
  @IsNotEmpty()
  @IsUUID('4', { message: 'ID của đơn hàng phải là định dạng UUID' })
  id: string;

  @IsNotEmpty()
  @IsEnum(OrderStatusUpdate, {
    message: 'Status phải là confirmed hoặc cancelled',
  })
  status: OrderStatusUpdate;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancellationReason?: string;
}
