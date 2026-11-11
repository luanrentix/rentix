import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { UpsertSettingsDto } from './dto/upsert-settings.dto';
import { SettingsService } from './settings.service';
import {
  RequireToolPermission,
  RequireToolAction,
} from '../autenticacao/decorators/tool-permission.decorator';
import { CurrentUser } from '../autenticacao/decorators/usuario-atual.decorator';
import { JwtGuardAutenticacao } from '../autenticacao/guards/jwt-autenticacao.guard';
import { ToolPermissionGuard } from '../autenticacao/guards/tool-permission.guard';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';

// Dados de apresentação necessários à navegação de qualquer usuário autenticado.
// As rotas administrativas abaixo continuam protegidas por settings:view/edit.
@Controller('settings/runtime')
@UseGuards(JwtGuardAutenticacao)
export class SettingsRuntimeController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  findByCompany(@CurrentUser() user: UsuarioAutenticado) {
    return this.settingsService.findRuntimeByCompany(user.companyId);
  }
}

@Controller('settings')
@RequireToolPermission('settings')
@UseGuards(JwtGuardAutenticacao, ToolPermissionGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @RequireToolAction('view')
  @Get()
  findByCompany(@CurrentUser() user: UsuarioAutenticado) {
    return this.settingsService.findByCompany(user.companyId);
  }

  @RequireToolAction('edit')
  @Put()
  upsert(
    @Body() data: UpsertSettingsDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.settingsService.upsert(data, user.companyId);
  }
}
