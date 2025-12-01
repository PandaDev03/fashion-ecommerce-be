import { IsNotEmpty, IsString } from 'class-validator';

export class SignInWIthGoogleDto {
  @IsString()
  @IsNotEmpty()
  accessToken: string;
}
