import { PublicShareRateLimitGuard } from '../autenticacao/guards/rate-limit.guard';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ContasReceberService } from './contas-receber.service';

@Controller('relatorios-receber-publicos')
@UseGuards(PublicShareRateLimitGuard)
export class RelatoriosReceberPublicosController {
  constructor(private readonly contasReceberService: ContasReceberService) {}

  @Get(':id')
  findSharedReceivableReport(@Param('id') id: string) {
    return this.contasReceberService.findSharedReceivableReport(id);
  }
}
