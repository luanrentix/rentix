import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CriarEmpresaDto } from './criar-empresa.dto';

export class AtualizarEmpresaDto extends PartialType(CriarEmpresaDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
