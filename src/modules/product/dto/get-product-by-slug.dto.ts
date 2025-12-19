import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class GetProductBySlugDto {
  @IsNotEmpty({ message: 'Không tìm thấy slug' })
  @IsString({ message: 'Slug phải là chuỗi ký tự' })
  @MaxLength(255, { message: 'Slug không được vượt quá 255 ký tự' })
  slug: string;
}
