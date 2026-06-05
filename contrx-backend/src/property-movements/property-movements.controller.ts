import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

import { CriarPropertyMovementDto } from './dto/criar-property-movement.dto';
import { PropertyMovementsService } from './property-movements.service';
import { RequireToolPermission } from '../autenticacao/decorators/tool-permission.decorator';
import { CurrentUser } from '../autenticacao/decorators/usuario-atual.decorator';
import { JwtGuardAutenticacao } from '../autenticacao/guards/jwt-autenticacao.guard';
import { ToolPermissionGuard } from '../autenticacao/guards/tool-permission.guard';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';

@Controller('property-movements')
@RequireToolPermission('properties')
@UseGuards(JwtGuardAutenticacao, ToolPermissionGuard)
export class PropertyMovementsController {
  constructor(
    private readonly propertyMovementsService: PropertyMovementsService,
  ) {}

  @Post()
  create(
    @Body() data: CriarPropertyMovementDto,
    @CurrentUser() user: UsuarioAutenticado,
  ) {
    return this.propertyMovementsService.create(data, user.companyId);
  }

  @Get()
  findAll(
    @CurrentUser() user: UsuarioAutenticado,
    @Query('propertyId') propertyId?: string,
  ) {
    return this.propertyMovementsService.findAll(user.companyId, propertyId);
  }
}
