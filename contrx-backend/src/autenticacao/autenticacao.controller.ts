import { Body, Controller, Patch, Post, UseGuards } from '@nestjs/common';

import { AutenticacaoService } from './autenticacao.service';

import { RegisterDto } from './dto/registro.dto';
import { LoginDto } from './dto/login.dto';
import { CriarContaDto } from './dto/criar-conta.dto';
import { AlterarSenhaDto } from './dto/alterar-senha.dto';
import { CurrentUser } from './decorators/usuario-atual.decorator';
import { JwtGuardAutenticacao } from './guards/jwt-autenticacao.guard';
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
  async login(@Body() data: LoginDto) {
    return this.authService.login(data);
  }

  @Post('criar-conta')
  async createAccount(@Body() data: CriarContaDto) {
    return this.authService.createAccount(data);
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
