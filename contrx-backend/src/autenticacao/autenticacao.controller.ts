import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AutenticacaoService } from './autenticacao.service';

import { RegisterDto } from './dto/registro.dto';
import { LoginDto } from './dto/login.dto';
import { CriarContaDto } from './dto/criar-conta.dto';
import { AlterarSenhaDto } from './dto/alterar-senha.dto';
import { RecuperarSenhaDto } from './dto/recuperar-senha.dto';
import { RedefinirSenhaDto } from './dto/redefinir-senha.dto';
import {
  AtualizarUsuarioEmpresaDto,
  CriarUsuarioEmpresaDto,
} from './dto/criar-usuario-empresa.dto';
import { CurrentUser } from './decorators/usuario-atual.decorator';
import { CompanyAdminGuard } from './guards/company-admin.guard';
import { JwtGuardAutenticacao } from './guards/jwt-autenticacao.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import type { UsuarioAutenticado } from './types/usuario-autenticado.type';
import { SystemOwnerGuard } from '../admin/system-owner.guard';

@Controller('autenticacao')
export class AutenticacaoController {
  constructor(private readonly authService: AutenticacaoService) {}

  @Post('register')
  @UseGuards(JwtGuardAutenticacao, SystemOwnerGuard)
  async register(@Body() data: RegisterDto) {
    return this.authService.register(data);
  }

  @Post('login')
  @UseGuards(RateLimitGuard)
  async login(@Body() data: LoginDto) {
    return this.authService.login(data);
  }

  @Post('criar-conta')
  @UseGuards(RateLimitGuard)
  async createAccount(@Body() data: CriarContaDto) {
    return this.authService.createAccount(data);
  }

  @Post('recuperar-senha')
  @UseGuards(RateLimitGuard)
  async requestPasswordReset(@Body() data: RecuperarSenhaDto) {
    return this.authService.requestPasswordReset(data);
  }

  @Post('redefinir-senha')
  @UseGuards(RateLimitGuard)
  async resetPassword(@Body() data: RedefinirSenhaDto) {
    return this.authService.resetPassword(data);
  }

  @Get('usuarios')
  @UseGuards(JwtGuardAutenticacao, CompanyAdminGuard)
  async findCompanyUsers(@CurrentUser() user: UsuarioAutenticado) {
    return this.authService.findCompanyUsers(user);
  }

  @Get('sessao')
  @UseGuards(JwtGuardAutenticacao)
  verifySession(@CurrentUser() user: UsuarioAutenticado) {
    return {
      active: true,
      userId: user.id,
    };
  }

  @Post('usuarios')
  @UseGuards(JwtGuardAutenticacao, CompanyAdminGuard)
  async createCompanyUser(
    @CurrentUser() user: UsuarioAutenticado,
    @Body() data: CriarUsuarioEmpresaDto,
  ) {
    return this.authService.createCompanyUser(user, data);
  }

  @Patch('usuarios/:id')
  @UseGuards(JwtGuardAutenticacao, CompanyAdminGuard)
  async updateCompanyUser(
    @CurrentUser() user: UsuarioAutenticado,
    @Param('id') id: string,
    @Body() data: AtualizarUsuarioEmpresaDto,
  ) {
    return this.authService.updateCompanyUser(user, id, data);
  }

  @Patch('me/senha')
  @UseGuards(JwtGuardAutenticacao)
  async changePassword(
    @CurrentUser() user: UsuarioAutenticado,
    @Body() data: AlterarSenhaDto,
  ) {
    return this.authService.changePassword(user, data);
  }
}
