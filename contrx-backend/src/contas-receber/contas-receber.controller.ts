import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ContasReceberService } from './contas-receber.service';
import {
  CriarContaReceberDto,
  ReceberPagamentoLoteDto,
  ReceberPagamentoDto,
} from './dto/criar-conta-receber.dto';
import { AtualizarContaReceberDto } from './dto/atualizar-conta-receber.dto';
import { RequireToolPermission } from '../autenticacao/decorators/tool-permission.decorator';
import { CurrentUser } from '../autenticacao/decorators/usuario-atual.decorator';
import { JwtGuardAutenticacao } from '../autenticacao/guards/jwt-autenticacao.guard';
import { ToolPermissionGuard } from '../autenticacao/guards/tool-permission.guard';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';

@Controller('contas-receber')
@RequireToolPermission('accountsReceivable')
@UseGuards(JwtGuardAutenticacao, ToolPermissionGuard)
export class ContasReceberController {
  constructor(private readonly contasReceberService: ContasReceberService) {}

  @Post()
  create(
    @Body() data: CriarContaReceberDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.contasReceberService.create(data, user.companyId);
  }

  @Get()
  findAll(@CurrentUser() user: UsuarioAutenticado) {
    return this.contasReceberService.findAll(user.companyId);
  }

  @Get('contratos/resumo')
  findContractSummary(@CurrentUser() user: UsuarioAutenticado) {
    return this.contasReceberService.findContractSummary(user.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UsuarioAutenticado) {
    return this.contasReceberService.findOne(id, user.companyId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() data: AtualizarContaReceberDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.contasReceberService.update(id, data, user.companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: UsuarioAutenticado) {
    return this.contasReceberService.remove(id, user.companyId);
  }

  @Post(':id/receber')
  receivePayment(
    @Param('id') id: string,
    @Body() data: ReceberPagamentoDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.contasReceberService.receivePayment(id, data, user.companyId);
  }

  @Post('receber-lote')
  receiveBatch(
    @Body() data: ReceberPagamentoLoteDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.contasReceberService.receiveBatch(data, user.companyId);
  }

  @Post(':id/receber/substituir')
  replacePayment(
    @Param('id') id: string,
    @Body() data: ReceberPagamentoDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.contasReceberService.replacePayment(id, data, user.companyId);
  }

  @Post(':id/estornar')
  reversePayment(
    @Param('id') id: string,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.contasReceberService.reversePayment(id, user.companyId);
  }

  @Post('relatorio-compartilhado')
  shareReport(@Body() data: any, @CurrentUser() user: UsuarioAutenticado) {
    return this.contasReceberService.shareReceivableReport(
      data,
      user.companyId,
    );
  }
}
