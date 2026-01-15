import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from 'src/common/enums/role.enum';

export class UpdateUserByAdminDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (value === 'true') return true;
    if (value === 'false') return false;

    return value;
  })
  @IsBoolean()
  isActive?: boolean;
}
