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
import {
  RequireToolPermission,
  RequireToolAction,
} from '../autenticacao/decorators/tool-permission.decorator';
import { CurrentUser } from '../autenticacao/decorators/usuario-atual.decorator';
import { JwtGuardAutenticacao } from '../autenticacao/guards/jwt-autenticacao.guard';
import { ToolPermissionGuard } from '../autenticacao/guards/tool-permission.guard';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';

@Controller('imoveis')
@RequireToolPermission('properties')
@UseGuards(JwtGuardAutenticacao, ToolPermissionGuard)
export class ImoveisController {
  constructor(private readonly propertiesService: ImoveisService) {}

  @RequireToolAction('create')
  @Post()
  create(
    @Body() createPropertyDto: CriarImovelDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.propertiesService.create(createPropertyDto, user.companyId);
  }

  @RequireToolAction('view')
  @Get()
  findAll(@CurrentUser() user: UsuarioAutenticado) {
    return this.propertiesService.findAll(user.companyId);
  }

  @RequireToolAction('view')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UsuarioAutenticado) {
    return this.propertiesService.findOne(id, user.companyId);
  }

  @RequireToolAction('edit')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePropertyDto: AtualizarImovelDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.propertiesService.update(id, updatePropertyDto, user.companyId);
  }

  @RequireToolAction('delete')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: UsuarioAutenticado) {
    return this.propertiesService.remove(id, user.companyId);
  }
}
