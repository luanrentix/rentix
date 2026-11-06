import {
  Body,
  Headers,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { UserSessionsService } from './user-sessions.service';
import { LoginEmpresaUsuarioDto } from './dto/login-empresa-usuario.dto';
import { PrismaService } from '../prisma/prisma.service';
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
import { assertAccess } from './access-policy';

@Controller('autenticacao')
export class AutenticacaoController {
  constructor(
    private readonly authService: AutenticacaoService,
    private readonly sessions: UserSessionsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('verificar-email')
  @UseGuards(RateLimitGuard)
  async checkEmail(@Query('email') email: string) {
    const exists = await this.authService.checkEmailExists(email);
    return { exists };
  }

  @Post('register')
  @UseGuards(JwtGuardAutenticacao, SystemOwnerGuard)
  async register(@Body() data: RegisterDto) {
    return this.authService.register(data);
  }

  @Post('login')
  @UseGuards(RateLimitGuard)
  async login(@Body() data: LoginDto, @Headers('user-agent') device?: string) {
    return this.authService.login(data, device);
  }

  @Post('login-usuario')
  @UseGuards(RateLimitGuard)
  loginCompanyUser(
    @Body() data: LoginEmpresaUsuarioDto,
    @Headers('user-agent') device?: string,
  ) {
    return this.authService.loginCompanyUser(data, device);
  }

  @Post('logout')
  @UseGuards(JwtGuardAutenticacao)
  logout(@CurrentUser() user: UsuarioAutenticado) {
    return this.sessions.revoke(
      user.companyId,
      user.id,
      user.id,
      undefined,
      user.sessionId,
    );
  }

  @Get('empresa-codigo')
  @UseGuards(JwtGuardAutenticacao, CompanyAdminGuard)
  companyCode(@CurrentUser() user: UsuarioAutenticado) {
    return this.prisma.company.findUnique({
      where: { id: user.companyId },
      select: { code: true, tradeName: true },
    });
  }

  @Get('usuarios/:id/sessoes')
  @UseGuards(JwtGuardAutenticacao, CompanyAdminGuard)
  listSessions(
    @CurrentUser() user: UsuarioAutenticado,
    @Param('id') id: string,
  ) {
    return this.sessions.list(user.companyId, id);
  }

  @Post('usuarios/:id/sessoes/encerrar')
  @UseGuards(JwtGuardAutenticacao, CompanyAdminGuard)
  revokeAll(@CurrentUser() user: UsuarioAutenticado, @Param('id') id: string) {
    return this.sessions.revoke(user.companyId, id, user.id);
  }

  @Post('usuarios/:id/sessoes/:sessionId/encerrar')
  @UseGuards(JwtGuardAutenticacao, CompanyAdminGuard)
  revokeOne(
    @CurrentUser() user: UsuarioAutenticado,
    @Param('id') id: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.sessions.revoke(user.companyId, id, user.id, sessionId);
  }

  @Post('criar-conta')
  @UseGuards(RateLimitGuard)
  async createAccount(
    @Body() data: CriarContaDto,
    @Headers('user-agent') device?: string,
  ) {
    return this.authService.createAccount(data, device);
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

  @Get('acesso/:module/:action')
  @UseGuards(JwtGuardAutenticacao)
  actionAccess(
    @CurrentUser() user: UsuarioAutenticado,
    @Param('module') module: string,
    @Param('action') action: string,
  ) {
    assertAccess(user, module, action);
    return { allowed: true };
  }

  @Get('sessao')
  @UseGuards(JwtGuardAutenticacao)
  verifySession(@CurrentUser() user: UsuarioAutenticado) {
    return {
      active: true,
      userId: user.id,
      user: {
        name: user.name,
        role: user.role,
        permissions: user.permissions,
        actionPermissions: user.actionPermissions,
      },
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
