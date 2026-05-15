import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtGuardAutenticacao } from '../autenticacao/guards/jwt-autenticacao.guard';
import { AdminService } from './admin.service';
import { SystemOwnerGuard } from './system-owner.guard';

@Controller('admin')
@UseGuards(JwtGuardAutenticacao, SystemOwnerGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('resumo')
  getResumo() {
    return this.adminService.getResumo();
  }

  @Get('usuarios')
  findUsers() {
    return this.adminService.findUsers();
  }

  @Get('empresas')
  findCompanies() {
    return this.adminService.findCompanies();
  }
}
