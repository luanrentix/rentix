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
import { RequireToolPermission } from '../autenticacao/decorators/tool-permission.decorator';
import { CurrentUser } from '../autenticacao/decorators/usuario-atual.decorator';
import { JwtGuardAutenticacao } from '../autenticacao/guards/jwt-autenticacao.guard';
import { ToolPermissionGuard } from '../autenticacao/guards/tool-permission.guard';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';

@Controller('bancos')
@RequireToolPermission('bank')
@UseGuards(JwtGuardAutenticacao, ToolPermissionGuard)
export class BancosController {
  constructor(private readonly bancosService: BancosService) {}

  @Post('contas')
  createAccount(
    @Body() dto: CriarContaBancariaDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.bancosService.createAccount(dto, user.companyId);
  }

  @Get('contas')
  findAllAccounts(@CurrentUser() user: UsuarioAutenticado) {
    return this.bancosService.findAllAccounts(user.companyId);
  }

  @Get('contas/:id')
  findOneAccount(
    @Param('id') id: string,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.bancosService.findOneAccount(id, user.companyId);
  }

  @Patch('contas/:id')
  updateAccount(
    @Param('id') id: string,
    @Body() dto: Partial<CriarContaBancariaDto>,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.bancosService.updateAccount(id, dto, user.companyId);
  }

  @Delete('contas/:id')
  removeAccount(
    @Param('id') id: string,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.bancosService.removeAccount(id, user.companyId);
  }

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

  @Delete('movimentacoes/:id')
  deleteTransaction(
    @Param('id') id: string,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.bancosService.deleteTransaction(id, user.companyId);
  }

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

  @Post('transferir')
  transfer(
    @Body() dto: TransferenciaSaldoDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.bancosService.transfer(dto, user.companyId);
  }

  @Post('compartilhar')
  shareStatement(
    @Body() dto: CompartilharExtratoDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.bancosService.shareStatement(dto, user.companyId);
  }
}
