import { IsNotEmpty, IsUUID } from 'class-validator';

export class MigrateOrderDto {
  @IsUUID()
  @IsNotEmpty()
  fromUserId: string;

  @IsUUID()
  @IsNotEmpty()
  toUserId: string;
}
