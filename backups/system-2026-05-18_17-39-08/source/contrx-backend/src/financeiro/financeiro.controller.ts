import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FinanceiroService } from './financeiro.service';
import { CurrentUser } from '../autenticacao/decorators/usuario-atual.decorator';
import { JwtGuardAutenticacao } from '../autenticacao/guards/jwt-autenticacao.guard';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';

@Controller('financeiro')
@UseGuards(JwtGuardAutenticacao)
export class FinanceiroController {
  constructor(private readonly financeiroService: FinanceiroService) {}

  @Get('resumo')
  getResumo(
    @CurrentUser() user: UsuarioAutenticado,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financeiroService.getResumo(user.companyId, {
      startDate,
      endDate,
    });
  }
}
