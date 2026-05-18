import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export const adminUserRoles = [
  'SYSTEM_OWNER',
  'OWNER',
  'ADMIN',
  'MANAGER',
  'USER',
] as const;

export type AdminUserRole = (typeof adminUserRoles)[number];

export class UpdateAdminUserDto {
  @IsOptional()
  @IsIn(adminUserRoles)
  role?: AdminUserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
