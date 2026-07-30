import { Controller, Get, Param } from '@nestjs/common';
import { ContasReceberService } from './contas-receber.service';

@Controller('relatorios-receber-publicos')
export class RelatoriosReceberPublicosController {
  constructor(private readonly contasReceberService: ContasReceberService) {}

  @Get(':id')
  findSharedReceivableReport(@Param('id') id: string) {
    return this.contasReceberService.findSharedReceivableReport(id);
  }
}
