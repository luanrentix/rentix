import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';

import { CriarPropertyMovementDto } from './dto/criar-property-movement.dto';
import { PropertyMovementsService } from './property-movements.service';
import { CurrentUser } from '../autenticacao/decorators/usuario-atual.decorator';
import { JwtGuardAutenticacao } from '../autenticacao/guards/jwt-autenticacao.guard';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';

@Controller('property-movements')
@UseGuards(JwtGuardAutenticacao)
export class PropertyMovementsController {
  constructor(private readonly propertyMovementsService: PropertyMovementsService) {}

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
