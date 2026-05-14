import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { EmpresasService } from './empresas.service';

import { CriarEmpresaDto } from './dto/criar-empresa.dto';
import { AtualizarEmpresaDto } from './dto/atualizar-empresa.dto';

@Controller('empresas')
export class EmpresasController {
  constructor(private readonly companiesService: EmpresasService) {}

  @Post()
  create(@Body() data: CriarEmpresaDto) {
    return this.companiesService.create(data);
  }

  @Get()
  findAll() {
    return this.companiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() data: AtualizarEmpresaDto,
  ) {
    return this.companiesService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.companiesService.remove(id);
  }
}