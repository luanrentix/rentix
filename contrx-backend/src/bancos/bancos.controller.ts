import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { BancosService } from './bancos.service';
import { CriarContaBancariaDto } from './dto/criar-conta-bancaria.dto';
import { CriarMovimentacaoDto } from './dto/criar-movimentacao.dto';
import { TransferenciaSaldoDto } from './dto/transferencia-saldo.dto';
import { CompartilharExtratoDto } from './dto/compartilhar-extrato.dto';
import {
  RequireToolPermission,
  RequireToolAction,
} from '../autenticacao/decorators/tool-permission.decorator';
import { CurrentUser } from '../autenticacao/decorators/usuario-atual.decorator';
import { JwtGuardAutenticacao } from '../autenticacao/guards/jwt-autenticacao.guard';
import { ToolPermissionGuard } from '../autenticacao/guards/tool-permission.guard';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';

@Controller('bancos')
@RequireToolPermission('bank')
@UseGuards(JwtGuardAutenticacao, ToolPermissionGuard)
export class BancosController {
  constructor(private readonly bancosService: BancosService) {}

  @RequireToolAction('create')
  @Post('contas')
  createAccount(
    @Body() dto: CriarContaBancariaDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.bancosService.createAccount(dto, user.companyId);
  }

  @RequireToolAction('view')
  @Get('contas')
  findAllAccounts(@CurrentUser() user: UsuarioAutenticado) {
    return this.bancosService.findAllAccounts(user.companyId);
  }

  @RequireToolAction('view')
  @Get('contas/:id')
  findOneAccount(
    @Param('id') id: string,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.bancosService.findOneAccount(id, user.companyId);
  }

  @RequireToolAction('edit')
  @Patch('contas/:id')
  updateAccount(
    @Param('id') id: string,
    @Body() dto: Partial<CriarContaBancariaDto>,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.bancosService.updateAccount(id, dto, user.companyId);
  }

  @RequireToolAction('delete')
  @Delete('contas/:id')
  removeAccount(
    @Param('id') id: string,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.bancosService.removeAccount(id, user.companyId);
  }

  @RequireToolAction('create')
  @Post('contas/:id/movimentacoes')
  createTransaction(
    @Param('id') bankAccountId: string,
    @Body() dto: CriarMovimentacaoDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.bancosService.createTransaction(
      bankAccountId,
      dto,
      user.companyId,
    );
  }

  @RequireToolAction('view')
  @Get('movimentacoes')
  findAllTransactions(
    @CurrentUser() user: UsuarioAutenticado,
    @Query('bankAccountId') bankAccountId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('description') description?: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.bancosService.findAllTransactions(
      user.companyId,
      bankAccountId,
      {
        startDate,
        endDate,
        type,
        status,
        category,
        description,
        skip,
        take,
      },
    );
  }

  @RequireToolAction('delete')
  @Delete('movimentacoes/:id')
  deleteTransaction(
    @Param('id') id: string,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.bancosService.deleteTransaction(id, user.companyId);
  }

  @RequireToolAction('special')
  @Patch('movimentacoes/:id/conciliar')
  reconcileTransaction(
    @Param('id') id: string,
    @Body('paymentDate') paymentDate: string,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.bancosService.reconcileTransaction(
      id,
      paymentDate,
      user.companyId,
    );
  }

  @RequireToolAction('special')
  @Post('transferir')
  transfer(
    @Body() dto: TransferenciaSaldoDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.bancosService.transfer(dto, user.companyId);
  }

  @RequireToolAction('export')
  @Post('compartilhar')
  shareStatement(
    @Body() dto: CompartilharExtratoDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.bancosService.shareStatement(dto, user.companyId);
  }
}
