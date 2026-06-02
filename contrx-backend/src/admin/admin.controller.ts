import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtGuardAutenticacao } from '../autenticacao/guards/jwt-autenticacao.guard';
import { CurrentUser } from '../autenticacao/decorators/usuario-atual.decorator';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';
import { AdminService } from './admin.service';
import { ResetTestDataDto } from './dto/reset-test-data.dto';
import { UpdateAdminCompanyDto } from './dto/update-admin-company.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
import { SystemOwnerGuard } from './system-owner.guard';

@Controller('admin')
@UseGuards(JwtGuardAutenticacao)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('resumo')
  @UseGuards(SystemOwnerGuard)
  getResumo() {
    return this.adminService.getResumo();
  }

  @Get('usuarios')
  @UseGuards(SystemOwnerGuard)
  findUsers() {
    return this.adminService.findUsers();
  }

  @Get('empresas')
  @UseGuards(SystemOwnerGuard)
  findCompanies() {
    return this.adminService.findCompanies();
  }

  @Get('empresas/:id/historico-comercial')
  @UseGuards(SystemOwnerGuard)
  findCompanyCommercialHistory(@Param('id') id: string) {
    return this.adminService.findCompanyCommercialHistory(id);
  }

  @Post('comercial/reprocessar-vencimentos')
  @UseGuards(SystemOwnerGuard)
  reprocessCommercialExpirations(@CurrentUser() user: UsuarioAutenticado) {
    return this.adminService.reprocessCommercialExpirations(user.id);
  }

  @Patch('usuarios/:id')
  @UseGuards(SystemOwnerGuard)
  updateUser(
    @CurrentUser() user: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() data: UpdateAdminUserDto,
  ) {
    return this.adminService.updateUser(user.id, id, data);
  }

  @Patch('empresas/:id')
  @UseGuards(SystemOwnerGuard)
  updateCompany(
    @CurrentUser() user: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() data: UpdateAdminCompanyDto,
  ) {
    return this.adminService.updateCompany(id, data, user.id);
  }

  @Post('reset-test-data')
  @UseGuards(SystemOwnerGuard)
  resetTestData(
    @CurrentUser() user: UsuarioAutenticado,
    @Body() data: ResetTestDataDto,
  ) {
    return this.adminService.resetTestData(
      user.companyId,
      user.id,
      data.modules,
    );
  }
}
