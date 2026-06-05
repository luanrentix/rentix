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
import { ContasPagarService } from './contas-pagar.service';
import { CriarContaPagarDto, PagarContaDto } from './dto/criar-conta-pagar.dto';
import { AtualizarContaPagarDto } from './dto/atualizar-conta-pagar.dto';
import { RequireToolPermission } from '../autenticacao/decorators/tool-permission.decorator';
import { CurrentUser } from '../autenticacao/decorators/usuario-atual.decorator';
import { JwtGuardAutenticacao } from '../autenticacao/guards/jwt-autenticacao.guard';
import { ToolPermissionGuard } from '../autenticacao/guards/tool-permission.guard';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';

@Controller('contas-pagar')
@RequireToolPermission('accountsPayable')
@UseGuards(JwtGuardAutenticacao, ToolPermissionGuard)
export class ContasPagarController {
  constructor(private readonly contasPagarService: ContasPagarService) {}

  @Post()
  create(
    @Body() data: CriarContaPagarDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.contasPagarService.create(data, user.companyId);
  }

  @Get()
  findAll(@CurrentUser() user: UsuarioAutenticado) {
    return this.contasPagarService.findAll(user.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UsuarioAutenticado) {
    return this.contasPagarService.findOne(id, user.companyId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() data: AtualizarContaPagarDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.contasPagarService.update(id, data, user.companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: UsuarioAutenticado) {
    return this.contasPagarService.remove(id, user.companyId);
  }

  @Post(':id/pagar')
  pay(
    @Param('id') id: string,
    @Body() data: PagarContaDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.contasPagarService.pay(id, data, user.companyId);
  }

  @Post(':id/pagar/substituir')
  replacePayment(
    @Param('id') id: string,
    @Body() data: PagarContaDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.contasPagarService.replacePayment(id, data, user.companyId);
  }

  @Post(':id/estornar')
  reversePayment(
    @Param('id') id: string,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.contasPagarService.reversePayment(id, user.companyId);
  }
}
