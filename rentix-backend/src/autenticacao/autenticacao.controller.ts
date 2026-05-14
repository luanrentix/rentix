import { Body, Controller, Post } from '@nestjs/common';

import { AutenticacaoService } from './autenticacao.service';

import { RegisterDto } from './dto/registro.dto';
import { LoginDto } from './dto/login.dto';

@Controller('autenticacao')
export class AutenticacaoController {
  constructor(
    private readonly authService: AutenticacaoService,
  ) {}

  @Post('register')
  async register(
    @Body() data: RegisterDto,
  ) {
    return this.authService.register(data);
  }

  @Post('login')
  async login(
    @Body() data: LoginDto,
  ) {
    return this.authService.login(data);
  }
}
