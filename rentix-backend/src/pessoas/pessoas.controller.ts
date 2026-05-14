import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { PessoasService } from './pessoas.service';
import { CurrentUser } from '../autenticacao/decorators/usuario-atual.decorator';
import { JwtGuardAutenticacao } from '../autenticacao/guards/jwt-autenticacao.guard';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';

import { CriarPessoaDto } from './dto/criar-pessoa.dto';
import { AtualizarPessoaDto } from './dto/atualizar-pessoa.dto';

@Controller('pessoas')
@UseGuards(JwtGuardAutenticacao)
export class PessoasController {
  constructor(private readonly peopleService: PessoasService) {}

  @Post()
  async create(
    @Body() data: CriarPessoaDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.peopleService.create(data, user.companyId);
  }

  @Get()
  async findAll(@CurrentUser() user: UsuarioAutenticado) {
    return this.peopleService.findAll(user.companyId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.peopleService.findOne(id, user.companyId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() data: AtualizarPessoaDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.peopleService.update(id, data, user.companyId);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.peopleService.remove(id, user.companyId);
  }
}
