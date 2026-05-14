import { Controller, Get, Query } from '@nestjs/common';
import { FinanceiroService } from './financeiro.service';

@Controller('financeiro')
export class FinanceiroController {
  constructor(private readonly financeiroService: FinanceiroService) {}

  @Get('resumo')
  getResumo(@Query('companyId') companyId?: string) {
    return this.financeiroService.getResumo(companyId);
  }
}
