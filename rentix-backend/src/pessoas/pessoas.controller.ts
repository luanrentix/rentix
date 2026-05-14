import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { PessoasService } from './pessoas.service';

import { CriarPessoaDto } from './dto/criar-pessoa.dto';
import { AtualizarPessoaDto } from './dto/atualizar-pessoa.dto';

@Controller('pessoas')
export class PessoasController {
  constructor(private readonly peopleService: PessoasService) {}

  @Post()
  async create(@Body() data: CriarPessoaDto) {
    return this.peopleService.create(data);
  }

  @Get()
  async findAll(@Query('companyId') companyId?: string) {
    return this.peopleService.findAll(companyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.peopleService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: AtualizarPessoaDto,
  ) {
    return this.peopleService.update(id, data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.peopleService.remove(id);
  }
}
