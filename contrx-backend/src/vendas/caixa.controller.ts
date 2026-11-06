import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { CurrentUser } from '../autenticacao/decorators/usuario-atual.decorator';
import {
  RequireToolPermission,
  RequireToolAction,
} from '../autenticacao/decorators/tool-permission.decorator';
import { JwtGuardAutenticacao } from '../autenticacao/guards/jwt-autenticacao.guard';
import { ToolPermissionGuard } from '../autenticacao/guards/tool-permission.guard';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';
import { CaixaService } from './caixa.service';

export class CashOperationDto {
  @IsUUID() requestId!: string;
  @IsOptional() @IsUUID() accountId?: string;
  @IsIn(['IN', 'OUT']) direction!: 'IN' | 'OUT';
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(99999999.99)
  amount!: number;
  @IsString() @MinLength(3) @MaxLength(500) reason!: string;
}

@Controller('vendas/caixa')
@RequireToolPermission('sales')
@UseGuards(JwtGuardAutenticacao, ToolPermissionGuard)
export class CaixaController {
  constructor(private readonly service: CaixaService) {}

  @RequireToolAction('create')
  @Post('conta')
  prepareAccount(@CurrentUser() user: UsuarioAutenticado) {
    return this.service.prepareAccount(user.companyId);
  }
  @RequireToolAction('view')
  @Get()
  list(
    @CurrentUser() user: UsuarioAutenticado,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.service.list(user.companyId, start, end);
  }
  @RequireToolAction('create')
  @Post()
  create(
    @CurrentUser() user: UsuarioAutenticado,
    @Body() body: CashOperationDto,
  ) {
    return this.service.create(user, body);
  }
}
