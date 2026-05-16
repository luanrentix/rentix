import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class CriarAgendaItemDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  customerName: string;

  @IsString()
  propertyName: string;

  @IsDateString({ strict: true })
  date: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  time: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsIn(['scheduled', 'completed', 'canceled'])
  status?: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high'])
  priority?: string;

  @IsString()
  responsibleName: string;

  @IsString()
  reminder: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
