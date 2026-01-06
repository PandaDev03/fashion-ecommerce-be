import { IsEmail, IsNotEmpty } from 'class-validator';

export class RequestPasswordResetDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;
}
