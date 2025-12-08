import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SignUpDto {
  @IsEmail(
    {},
    { message: 'Email không hợp lệ. Vui lòng nhập đúng định dạng email.' },
  )
  @IsNotEmpty({ message: 'Trường Email không được để trống' })
  email: string;

  @IsString({ message: 'Tên người dùng phải là một chuỗi ký tự' })
  @IsNotEmpty({ message: 'Trường Tên người dùng không được để trống' })
  name: string;

  @IsString({ message: 'Mật khẩu phải là một chuỗi ký tự' })
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @IsNotEmpty({ message: 'Trường Mật khẩu không được để trống' })
  password: string;
}
