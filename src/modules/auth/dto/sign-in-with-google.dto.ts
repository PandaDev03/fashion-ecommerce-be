import { IsNotEmpty, IsString } from 'class-validator';

export class SignInWIthGoogleDto {
  @IsString({ message: 'Access Token phải là một chuỗi ký tự hợp lệ' })
  @IsNotEmpty({ message: 'Access Token không được để trống' })
  accessToken: string;
}
