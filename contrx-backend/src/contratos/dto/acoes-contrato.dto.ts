import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class MotivoContratoDto {
  @IsString()
  reason: string;
}

export class RenovarContratoDto {
  @IsString()
  endDate: string;

  @IsNumber()
  @Min(0.01)
  rentValue: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
