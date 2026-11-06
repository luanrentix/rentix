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
import { ContratosService } from './contratos.service';
import { CriarContratoDto } from './dto/criar-contrato.dto';
import { AtualizarContratoDto } from './dto/atualizar-contrato.dto';
import {
  MotivoContratoDto,
  RenovarContratoDto,
} from './dto/acoes-contrato.dto';
import {
  RequireToolPermission,
  RequireToolAction,
} from '../autenticacao/decorators/tool-permission.decorator';
import { CurrentUser } from '../autenticacao/decorators/usuario-atual.decorator';
import { JwtGuardAutenticacao } from '../autenticacao/guards/jwt-autenticacao.guard';
import { ToolPermissionGuard } from '../autenticacao/guards/tool-permission.guard';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';

@Controller('contratos')
@RequireToolPermission('contracts')
@UseGuards(JwtGuardAutenticacao, ToolPermissionGuard)
export class ContratosController {
  constructor(private readonly contractsService: ContratosService) {}

  @RequireToolAction('create')
  @Post()
  create(
    @Body() createContractDto: CriarContratoDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.contractsService.create(createContractDto, user.companyId);
  }

  @RequireToolAction('view')
  @Get()
  findAll(@CurrentUser() user: UsuarioAutenticado) {
    return this.contractsService.findAll(user.companyId);
  }

  @RequireToolAction('view')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UsuarioAutenticado) {
    return this.contractsService.findOne(id, user.companyId);
  }

  @RequireToolAction('edit')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateContractDto: AtualizarContratoDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.contractsService.update(id, updateContractDto, user.companyId);
  }

  @RequireToolAction('delete')
  @Post(':id/cancelar')
  cancel(
    @Param('id') id: string,
    @Body() data: MotivoContratoDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.contractsService.cancel(id, data, user.companyId);
  }

  @RequireToolAction('delete')
  @Post(':id/excluir')
  softDelete(
    @Param('id') id: string,
    @Body() data: MotivoContratoDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.contractsService.softDelete(id, data, user.companyId);
  }

  @RequireToolAction('special')
  @Post(':id/finalizar')
  finish(
    @Param('id') id: string,
    @Body() data: MotivoContratoDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.contractsService.finish(id, data, user.companyId);
  }

  @RequireToolAction('special')
  @Post(':id/renovar')
  renew(
    @Param('id') id: string,
    @Body() data: RenovarContratoDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.contractsService.renew(id, data, user.companyId);
  }

  @RequireToolAction('export')
  @Post(':id/compartilhar')
  share(@Param('id') id: string, @CurrentUser() user: UsuarioAutenticado) {
    return this.contractsService.shareContract(id, user.companyId);
  }

  @RequireToolAction('delete')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: UsuarioAutenticado) {
    return this.contractsService.remove(id, user.companyId);
  }
}
