import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AgendaService } from './agenda.service';
import { CriarAgendaItemDto } from './dto/criar-agenda-item.dto';
import { AtualizarAgendaItemDto } from './dto/atualizar-agenda-item.dto';
import {
  RequireToolPermission,
  RequireToolAction,
} from '../autenticacao/decorators/tool-permission.decorator';
import { CurrentUser } from '../autenticacao/decorators/usuario-atual.decorator';
import { JwtGuardAutenticacao } from '../autenticacao/guards/jwt-autenticacao.guard';
import { ToolPermissionGuard } from '../autenticacao/guards/tool-permission.guard';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';

@Controller('agenda')
@RequireToolPermission('schedule')
@UseGuards(JwtGuardAutenticacao, ToolPermissionGuard)
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @RequireToolAction('create')
  @Post()
  create(
    @Body() data: CriarAgendaItemDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.agendaService.create(data, user.companyId);
  }

  @RequireToolAction('view')
  @Get('lembretes-pendentes')
  findPendingReminders(@CurrentUser() user: UsuarioAutenticado) {
    return this.agendaService.findPendingReminders(user.companyId);
  }

  @RequireToolAction('view')
  @Get()
  findAll(
    @CurrentUser() user: UsuarioAutenticado,
    @Query('inicio') inicio?: string,
    @Query('fim') fim?: string,
  ) {
    return this.agendaService.findAll(user.companyId, inicio, fim);
  }

  @RequireToolAction('view')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UsuarioAutenticado) {
    return this.agendaService.findOne(id, user.companyId);
  }

  @RequireToolAction('edit')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() data: AtualizarAgendaItemDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.agendaService.update(id, data, user.companyId);
  }

  @RequireToolAction('delete')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: UsuarioAutenticado) {
    return this.agendaService.remove(id, user.companyId);
  }
}
