import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';

import { AgendaService } from './agenda.service';
import { CriarAgendaItemDto } from './dto/criar-agenda-item.dto';
import { AtualizarAgendaItemDto } from './dto/atualizar-agenda-item.dto';

@Controller('agenda')
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Post()
  create(@Body() data: CriarAgendaItemDto) {
    return this.agendaService.create(data);
  }

  @Get()
  findAll(@Query('companyId') companyId?: string) {
    return this.agendaService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agendaService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: AtualizarAgendaItemDto) {
    return this.agendaService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.agendaService.remove(id);
  }
}
