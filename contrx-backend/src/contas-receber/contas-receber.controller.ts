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
import {
  RequireToolPermission,
  RequireToolAction,
} from '../autenticacao/decorators/tool-permission.decorator';
import { CurrentUser } from '../autenticacao/decorators/usuario-atual.decorator';
import { JwtGuardAutenticacao } from '../autenticacao/guards/jwt-autenticacao.guard';
import { ToolPermissionGuard } from '../autenticacao/guards/tool-permission.guard';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';

@Controller('contas-receber')
@RequireToolPermission('accountsReceivable')
@UseGuards(JwtGuardAutenticacao, ToolPermissionGuard)
export class ContasReceberController {
  constructor(private readonly contasReceberService: ContasReceberService) {}

  @RequireToolAction('create')
  @Post()
  create(
    @Body() data: CriarContaReceberDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.contasReceberService.create(data, user.companyId);
  }

  @RequireToolAction('view')
  @Get()
  findAll(@CurrentUser() user: UsuarioAutenticado) {
    return this.contasReceberService.findAll(user.companyId);
  }

  @RequireToolAction('view')
  @Get('contratos/resumo')
  findContractSummary(@CurrentUser() user: UsuarioAutenticado) {
    return this.contasReceberService.findContractSummary(user.companyId);
  }

  @RequireToolAction('view')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UsuarioAutenticado) {
    return this.contasReceberService.findOne(id, user.companyId);
  }

  @RequireToolAction('edit')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() data: AtualizarContaReceberDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.contasReceberService.update(id, data, user.companyId);
  }

  @RequireToolAction('delete')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: UsuarioAutenticado) {
    return this.contasReceberService.remove(id, user.companyId);
  }

  @RequireToolAction('special')
  @Post(':id/receber')
  receivePayment(
    @Param('id') id: string,
    @Body() data: ReceberPagamentoDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.contasReceberService.receivePayment(id, data, user.companyId);
  }

  @RequireToolAction('special')
  @Post('receber-lote')
  receiveBatch(
    @Body() data: ReceberPagamentoLoteDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.contasReceberService.receiveBatch(data, user.companyId);
  }

  @RequireToolAction('special')
  @Post(':id/receber/substituir')
  replacePayment(
    @Param('id') id: string,
    @Body() data: ReceberPagamentoDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.contasReceberService.replacePayment(id, data, user.companyId);
  }

  @RequireToolAction('delete')
  @Post(':id/estornar')
  reversePayment(
    @Param('id') id: string,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.contasReceberService.reversePayment(id, user.companyId);
  }

  @RequireToolAction('export')
  @Post('relatorio-compartilhado')
  shareReport(@Body() data: any, @CurrentUser() user: UsuarioAutenticado) {
    return this.contasReceberService.shareReceivableReport(
      data,
      user.companyId,
    );
  }
}
