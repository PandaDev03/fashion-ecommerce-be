import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SignInDto {
  @IsEmail(
    {},
    { message: 'Email không hợp lệ. Vui lòng nhập đúng định dạng email.' },
  )
  @IsNotEmpty({ message: 'Trường Email không được để trống' })
  email: string;

  @IsString({ message: 'Mật khẩu phải là một chuỗi ký tự' })
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @IsNotEmpty({ message: 'Trường Mật khẩu không được để trống' })
  password: string;
}
