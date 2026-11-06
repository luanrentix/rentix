import { PublicShareRateLimitGuard } from '../autenticacao/guards/rate-limit.guard';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { BancosService } from './bancos.service';

@Controller('extratos-publicos')
@UseGuards(PublicShareRateLimitGuard)
export class ExtratosPublicosController {
  constructor(private readonly bancosService: BancosService) {}

  @Get(':id')
  findSharedStatement(@Param('id') id: string) {
    return this.bancosService.findSharedStatement(id);
  }
}
