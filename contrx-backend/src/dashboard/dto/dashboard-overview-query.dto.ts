import { IsOptional, IsString } from 'class-validator';

export class DashboardOverviewQueryDto {
  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  refresh?: string;
}
