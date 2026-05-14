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
import { CurrentUser } from '../autenticacao/decorators/usuario-atual.decorator';
import { JwtGuardAutenticacao } from '../autenticacao/guards/jwt-autenticacao.guard';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';

@Controller('contratos')
@UseGuards(JwtGuardAutenticacao)
export class ContratosController {
  constructor(private readonly contractsService: ContratosService) {}

  @Post()
  create(
    @Body() createContractDto: CriarContratoDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.contractsService.create(createContractDto, user.companyId);
  }

  @Get()
  findAll(@CurrentUser() user: UsuarioAutenticado) {
    return this.contractsService.findAll(user.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: UsuarioAutenticado) {
    return this.contractsService.findOne(id, user.companyId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateContractDto: AtualizarContratoDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.contractsService.update(id, updateContractDto, user.companyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: UsuarioAutenticado) {
    return this.contractsService.remove(id, user.companyId);
  }
}
