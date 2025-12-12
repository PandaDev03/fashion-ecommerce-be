import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';
import { BaseQueryDto } from 'src/common/dto/base-query.dto';

export class GetUserDto extends BaseQueryDto {
  @IsOptional()
  @IsUUID('4', { message: 'ID phải là định dạng UUID hợp lệ' })
  id?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email phải là định dạng email hợp lệ' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Tên tìm kiếm phải là chuỗi ký tự' })
  name?: string;
}
