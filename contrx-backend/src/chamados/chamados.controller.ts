import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ChamadosService } from './chamados.service';
import { CriarChamadoDto } from './dto/criar-chamado.dto';
import { CurrentUser } from '../autenticacao/decorators/usuario-atual.decorator';
import { JwtGuardAutenticacao } from '../autenticacao/guards/jwt-autenticacao.guard';
import { SystemOwnerGuard } from '../admin/system-owner.guard';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';

@Controller('chamados')
@UseGuards(JwtGuardAutenticacao)
export class ChamadosController {
  constructor(private readonly chamadosService: ChamadosService) {}

  @Post()
  create(
    @Body() data: CriarChamadoDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.chamadosService.create(data, user.id, user.companyId);
  }

  @Get()
  findAll(@CurrentUser() user: UsuarioAutenticado) {
    return this.chamadosService.findAll(user.id, user.companyId, user.role);
  }

  @Patch(':id/responder')
  @UseGuards(SystemOwnerGuard)
  responder(@Param('id') id: string, @Body() data: { response: string }) {
    return this.chamadosService.responder(id, data.response);
  }

  @Patch(':id/cliente-acao')
  clienteAcao(
    @Param('id') id: string,
    @Body() data: { action: 'reply' | 'close'; replyText?: string },
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.chamadosService.clienteAcao(
      id,
      data.action,
      data.replyText,
      user.companyId,
    );
  }
}
