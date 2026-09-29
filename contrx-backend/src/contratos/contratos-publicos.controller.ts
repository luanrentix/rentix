import { Controller, Get, Param } from '@nestjs/common';
import { ContratosService } from './contratos.service';

@Controller('contratos-publicos')
export class ContratosPublicosController {
  constructor(private readonly contratosService: ContratosService) {}

  @Get(':id')
  findSharedContract(@Param('id') id: string) {
    return this.contratosService.findSharedContract(id);
  }
}
