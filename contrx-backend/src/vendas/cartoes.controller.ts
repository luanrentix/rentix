import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Post,
  UseGuards,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUser } from '../autenticacao/decorators/usuario-atual.decorator';
import {
  RequireToolPermission,
  RequireToolAction,
} from '../autenticacao/decorators/tool-permission.decorator';
import { JwtGuardAutenticacao } from '../autenticacao/guards/jwt-autenticacao.guard';
import { ToolPermissionGuard } from '../autenticacao/guards/tool-permission.guard';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';

export type CardAdministrator = { id: string; name: string };
export function administratorsFromSettings(
  value: Prisma.JsonValue | null | undefined,
): CardAdministrator[] {
  const list = (value as Record<string, unknown> | null)
    ?.salesCardAdministrators;
  return Array.isArray(list)
    ? list.filter((item): item is CardAdministrator =>
        Boolean(
          item && typeof item.id === 'string' && typeof item.name === 'string',
        ),
      )
    : [];
}
class CreateAdministratorDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
}

@Injectable()
export class SalesCardsService {
  constructor(private readonly prisma: PrismaService) {}
  async list(companyId: string) {
    const settings = await this.prisma.appSettings.findUnique({
      where: { companyId },
    });
    return administratorsFromSettings(settings?.companySettings);
  }
  async create(companyId: string, name: string) {
    const normalized = name
      .trim()
      .replace(/\s+/g, ' ')
      .toLocaleUpperCase('pt-BR');
    if (normalized.length < 2)
      throw new BadRequestException('Informe o nome da administradora.');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM empresas WHERE id = ${companyId} FOR UPDATE`;
      const settings = await tx.appSettings.findUnique({
        where: { companyId },
      });
      const list = administratorsFromSettings(settings?.companySettings);
      const existing = list.find(
        (item) => item.name.toLocaleUpperCase('pt-BR') === normalized,
      );
      if (existing) return existing;
      const admin = { id: randomUUID(), name: normalized };
      const companySettings = {
        ...((settings?.companySettings || {}) as Prisma.JsonObject),
        salesCardAdministrators: [...list, admin],
      } as Prisma.InputJsonObject;
      await tx.appSettings.upsert({
        where: { companyId },
        create: { companyId, companySettings },
        update: { companySettings },
      });
      return admin;
    });
  }
}

@Controller('vendas/cartoes/administradoras')
@RequireToolPermission('sales')
@UseGuards(JwtGuardAutenticacao, ToolPermissionGuard)
export class SalesCardsController {
  constructor(private readonly service: SalesCardsService) {}
  @RequireToolAction('view')
  @Get()
  list(@CurrentUser() user: UsuarioAutenticado) {
    return this.service.list(user.companyId);
  }
  @RequireToolAction('create')
  @Post()
  create(
    @CurrentUser() user: UsuarioAutenticado,
    @Body() body: CreateAdministratorDto,
  ) {
    return this.service.create(user.companyId, body.name);
  }
}
