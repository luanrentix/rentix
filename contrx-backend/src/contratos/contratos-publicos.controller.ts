import { PublicShareRateLimitGuard } from '../autenticacao/guards/rate-limit.guard';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ContratosService } from './contratos.service';

@Controller('contratos-publicos')
@UseGuards(PublicShareRateLimitGuard)
export class ContratosPublicosController {
  constructor(private readonly contratosService: ContratosService) {}

  @Get(':id')
  findSharedContract(@Param('id') id: string) {
    return this.contratosService.findSharedContract(id);
  }
}
