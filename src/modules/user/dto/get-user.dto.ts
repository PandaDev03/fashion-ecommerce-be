import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';
import { BaseQueryDto } from 'src/common/dto/base-query.dto';

export class GetUserDto extends BaseQueryDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;
}
