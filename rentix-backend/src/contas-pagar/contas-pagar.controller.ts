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
import { ContasPagarService } from './contas-pagar.service';
import {
  CriarContaPagarDto,
  PagarContaDto,
} from './dto/criar-conta-pagar.dto';
import { AtualizarContaPagarDto } from './dto/atualizar-conta-pagar.dto';

@Controller('contas-pagar')
export class ContasPagarController {
  constructor(private readonly contasPagarService: ContasPagarService) {}

  @Post()
  create(@Body() data: CriarContaPagarDto) {
    return this.contasPagarService.create(data);
  }

  @Get()
  findAll(@Query('companyId') companyId: string) {
    return this.contasPagarService.findAll(companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contasPagarService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() data: AtualizarContaPagarDto,
  ) {
    return this.contasPagarService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.contasPagarService.remove(id);
  }

  @Post(':id/pagar')
  pay(
    @Param('id') id: string,
    @Body() data: PagarContaDto,
  ) {
    return this.contasPagarService.pay(id, data);
  }

  @Post(':id/estornar')
  reversePayment(@Param('id') id: string) {
    return this.contasPagarService.reversePayment(id);
  }
}
