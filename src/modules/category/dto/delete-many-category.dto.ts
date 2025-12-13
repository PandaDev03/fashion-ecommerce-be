import { IsArray, IsUUID } from 'class-validator';

export class DeleteManyCategoryDto {
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];
}
