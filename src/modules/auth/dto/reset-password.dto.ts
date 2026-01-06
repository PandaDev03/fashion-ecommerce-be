import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString({ message: 'Token phải là chuỗi' })
  @IsNotEmpty({ message: 'Token không được để trống' })
  token: string;

  @IsString({ message: 'Mật khẩu phải là chuỗi' })
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  newPassword: string;
}
