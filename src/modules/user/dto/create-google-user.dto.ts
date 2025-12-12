import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateGoogleUserDto {
  @IsEmail(
    {},
    { message: 'Email không hợp lệ. Vui lòng nhập đúng định dạng email.' },
  )
  @IsNotEmpty({ message: 'Trường Email không được để trống' })
  email: string;

  @IsString({ message: 'Tên người dùng phải là một chuỗi ký tự' })
  @IsNotEmpty({ message: 'Trường Tên người dùng không được để trống' })
  name: string;

  @IsString({ message: 'URL Avatar phải là một chuỗi ký tự' })
  @IsNotEmpty({ message: 'Trường Avatar không được để trống' })
  avatar: string;
}
