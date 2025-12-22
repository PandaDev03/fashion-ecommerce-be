import { IsBoolean, IsOptional, IsString, ValidateIf } from 'class-validator';

export class CreateVariantOptionValueDto {
  @IsOptional()
  @IsBoolean()
  isNewOption?: boolean;

  @ValidateIf((o) => !o.isNewOption)
  @IsString()
  optionId?: string;

  // @IsOptional()
  // @IsString()
  // optionId?: string;

  // @IsOptional()
  // @IsString()
  // optionName?: string;

  @ValidateIf((o) => o.isNewOption === true)
  @IsString()
  optionName?: string;

  @IsOptional()
  @IsString()
  optionValueId?: string;

  // @IsOptional()
  // @IsString()
  // value?: string;

  @ValidateIf((o) => o.isNew === true)
  @IsString()
  value?: string;

  @IsBoolean()
  isNew: boolean;
}
