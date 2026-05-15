import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { UpsertSettingsDto } from './dto/upsert-settings.dto';
import { SettingsService } from './settings.service';
import { CurrentUser } from '../autenticacao/decorators/usuario-atual.decorator';
import { JwtGuardAutenticacao } from '../autenticacao/guards/jwt-autenticacao.guard';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';

@Controller('settings')
@UseGuards(JwtGuardAutenticacao)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  findByCompany(@CurrentUser() user: UsuarioAutenticado) {
    return this.settingsService.findByCompany(user.companyId);
  }

  @Put()
  upsert(
    @Body() data: UpsertSettingsDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.settingsService.upsert(data, user.companyId);
  }
}
