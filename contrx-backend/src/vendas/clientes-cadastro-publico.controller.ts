import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  PublicShareRateLimitGuard,
  RateLimitGuard,
} from '../autenticacao/guards/rate-limit.guard';
import { ConsultarCadastroClientePublicoDto } from './dto/consultar-cadastro-cliente-publico.dto';
import { EnviarCadastroClientePublicoDto } from './dto/enviar-cadastro-cliente-publico.dto';
import { VendasService } from './vendas.service';

@Controller('vendas/clientes-cadastro-publico')
export class ClientesCadastroPublicoController {
  constructor(private readonly vendasService: VendasService) {}

  @UseGuards(PublicShareRateLimitGuard)
  @Post('consultar')
  getRegistrationInfo(@Body() dto: ConsultarCadastroClientePublicoDto) {
    return this.vendasService.getPublicCustomerRegistration(dto.token);
  }

  @UseGuards(RateLimitGuard)
  @Post('enviar')
  submitRegistration(@Body() dto: EnviarCadastroClientePublicoDto) {
    return this.vendasService.submitPublicCustomerRegistration(dto);
  }
}
