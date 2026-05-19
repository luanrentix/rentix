import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateAdminCompanyDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
