import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ContasReceberService } from './contas-receber.service';
import {
  CriarContaReceberDto,
  ReceberPagamentoDto,
} from './dto/criar-conta-receber.dto';
import { AtualizarContaReceberDto } from './dto/atualizar-conta-receber.dto';

@Controller('contas-receber')
export class ContasReceberController {
  constructor(private readonly contasReceberService: ContasReceberService) {}

  @Post()
  create(@Body() data: CriarContaReceberDto) {
    return this.contasReceberService.create(data);
  }

  @Get()
  findAll(@Query('companyId') companyId: string) {
    return this.contasReceberService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contasReceberService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() data: AtualizarContaReceberDto,
  ) {
    return this.contasReceberService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contasReceberService.remove(id);
  }

  @Post(':id/receber')
  receivePayment(
    @Param('id') id: string,
    @Body() data: ReceberPagamentoDto,
  ) {
    return this.contasReceberService.receivePayment(id, data);
  }

  @Post(':id/estornar')
  reversePayment(@Param('id') id: string) {
    return this.contasReceberService.reversePayment(id);
  }
}
