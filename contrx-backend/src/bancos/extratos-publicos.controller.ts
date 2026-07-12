import { Controller, Get, Param } from '@nestjs/common';
import { BancosService } from './bancos.service';

@Controller('extratos-publicos')
export class ExtratosPublicosController {
  constructor(private readonly bancosService: BancosService) {}

  @Get(':id')
  findSharedStatement(@Param('id') id: string) {
    return this.bancosService.findSharedStatement(id);
  }
}
