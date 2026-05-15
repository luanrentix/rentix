import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CriarAgendaItemDto {
  @IsUUID()
  companyId: string;

  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  customerName: string;

  @IsString()
  propertyName: string;

  @IsString()
  date: string;

  @IsString()
  time: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsString()
  responsibleName: string;

  @IsString()
  reminder: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
