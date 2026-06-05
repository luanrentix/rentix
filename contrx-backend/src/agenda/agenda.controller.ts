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

import { AgendaService } from './agenda.service';
import { CriarAgendaItemDto } from './dto/criar-agenda-item.dto';
import { AtualizarAgendaItemDto } from './dto/atualizar-agenda-item.dto';
import { RequireToolPermission } from '../autenticacao/decorators/tool-permission.decorator';
import { CurrentUser } from '../autenticacao/decorators/usuario-atual.decorator';
import { JwtGuardAutenticacao } from '../autenticacao/guards/jwt-autenticacao.guard';
import { ToolPermissionGuard } from '../autenticacao/guards/tool-permission.guard';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';

@Controller('agenda')
@RequireToolPermission('schedule')
@UseGuards(JwtGuardAutenticacao, ToolPermissionGuard)
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Post()
  create(
    @Body() data: CriarAgendaItemDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.agendaService.create(data, user.companyId);
  }

  @Get()
  findAll(@CurrentUser() user: UsuarioAutenticado) {
    return this.agendaService.findAll(user.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UsuarioAutenticado) {
    return this.agendaService.findOne(id, user.companyId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() data: AtualizarAgendaItemDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.agendaService.update(id, data, user.companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: UsuarioAutenticado) {
    return this.agendaService.remove(id, user.companyId);
  }
}
