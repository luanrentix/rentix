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
import { CriarImovelDto } from './dto/criar-imovel.dto';
import { AtualizarImovelDto } from './dto/atualizar-imovel.dto';
import { ImoveisService } from './imoveis.service';
import { CurrentUser } from '../autenticacao/decorators/usuario-atual.decorator';
import { JwtGuardAutenticacao } from '../autenticacao/guards/jwt-autenticacao.guard';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';

@Controller('imoveis')
@UseGuards(JwtGuardAutenticacao)
export class ImoveisController {
  constructor(private readonly propertiesService: ImoveisService) {}

  @Post()
  create(
    @Body() createPropertyDto: CriarImovelDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.propertiesService.create(createPropertyDto, user.companyId);
  }

  @Get()
  findAll(@CurrentUser() user: UsuarioAutenticado) {
    return this.propertiesService.findAll(user.companyId);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.propertiesService.findOne(id, user.companyId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePropertyDto: AtualizarImovelDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.propertiesService.update(id, updatePropertyDto, user.companyId);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.propertiesService.remove(id, user.companyId);
  }
}
