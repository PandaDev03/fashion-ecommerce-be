import { IsEnum, IsOptional } from 'class-validator';
import { UserRole } from 'src/common/enums/role.enum';

export class ExportUsersDto {
  @IsOptional()
  search?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(['system', 'google'])
  accountType?: 'system' | 'google';
}
