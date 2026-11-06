import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { getCompanyAccessState } from '../common/company-access-state';

@Injectable()
export class UserSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async lock(tx: Prisma.TransactionClient, userId: string, companyId: string) {
    const rows = await tx.$queryRaw<
      { id: string }[]
    >`SELECT id FROM usuarios WHERE id = ${userId} AND empresa_id = ${companyId} FOR UPDATE`;
    if (!rows.length)
      throw new NotFoundException('Usuário não encontrado nesta empresa.');
  }

  async trim(
    tx: Prisma.TransactionClient,
    userId: string,
    companyId: string,
    limit: number,
    reason: string,
    actorId?: string,
  ) {
    const active = await tx.userSession.findMany({
      where: {
        userId,
        companyId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    const ids = active.slice(limit).map((s) => s.id);
    if (ids.length)
      await tx.userSession.updateMany({
        where: { id: { in: ids }, userId, companyId, revokedAt: null },
        data: { revokedAt: new Date(), reason, revokedBy: actorId },
      });
  }

  async issue(
    userId: string,
    companyId: string,
    expectedHash: string,
    device?: string,
    supportClaims?: { isImpersonated: boolean; impersonatedBy: string },
    loginMethod?: 'EMAIL' | 'USER',
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, userId, companyId);
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: { company: true },
      });
      if (!user.isActive || user.passwordHash !== expectedHash)
        throw new UnauthorizedException('Credenciais inválidas.');
      if (
        (loginMethod === 'EMAIL' && !user.emailLoginEnabled) ||
        (loginMethod === 'USER' && !user.userLoginEnabled)
      )
        throw new UnauthorizedException('Credenciais inválidas.');
      const access = getCompanyAccessState(user.company);
      if (!access.canAccess) throw new UnauthorizedException(access.reason);
      const sessionId = randomUUID();
      const issuedAt = Math.floor(Date.now() / 1000);
      const expiresAt = new Date((issuedAt + 86400) * 1000);
      await this.trim(
        tx,
        userId,
        companyId,
        user.maxConcurrentSessions - 1,
        'NEW_LOGIN',
      );
      const latest = await tx.userSession.findFirst({
        where: { userId, companyId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });
      const createdAt = new Date(
        Math.max(Date.now(), (latest?.createdAt.getTime() || 0) + 1),
      );
      await tx.userSession.create({
        data: {
          sessionId,
          userId,
          companyId,
          createdAt,
          expiresAt,
          device: device?.slice(0, 350) || 'Navegador não identificado',
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: { lastLoginAt: new Date(), activeSessionId: sessionId },
      });
      const accessToken = await this.jwt.signAsync(
        {
          sub: user.id,
          companyId,
          email: user.email,
          role: user.role,
          sessionId,
          ...supportClaims,
          iat: issuedAt,
        },
        { expiresIn: 86400 },
      );
      return { accessToken, user };
    });
  }

  async list(companyId: string, userId: string) {
    if (
      !(await this.prisma.user.findFirst({
        where: { id: userId, companyId },
        select: { id: true },
      }))
    )
      throw new NotFoundException('Usuário não encontrado nesta empresa.');
    const select = {
      id: true,
      createdAt: true,
      lastSeenAt: true,
      expiresAt: true,
      revokedAt: true,
      reason: true,
      device: true,
    } as const;
    const now = new Date();
    const [active, history] = await Promise.all([
      this.prisma.userSession.findMany({
        where: { companyId, userId, revokedAt: null, expiresAt: { gt: now } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        select,
      }),
      this.prisma.userSession.findMany({
        where: {
          companyId,
          userId,
          OR: [{ revokedAt: { not: null } }, { expiresAt: { lte: now } }],
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 100,
        select,
      }),
    ]);
    return [...active, ...history];
  }

  async revoke(
    companyId: string,
    userId: string,
    actorId: string,
    id?: string,
    sessionId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await this.lock(tx, userId, companyId);
      const result = await tx.userSession.updateMany({
        where: {
          companyId,
          userId,
          ...(id ? { id } : {}),
          ...(sessionId ? { sessionId } : {}),
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
          reason: sessionId ? 'LOGOUT' : 'ADMIN_REVOKED',
          revokedBy: actorId,
        },
      });
      if (result.count && !sessionId)
        await tx.commercialHistory.create({
          data: {
            companyId,
            userId: actorId,
            action: 'SESSIONS_REVOKED',
            description: 'Sessoes encerradas pelo administrador.',
            metadata: {
              targetUserId: userId,
              count: result.count,
              sessionRecordId: id || null,
            },
          },
        });
      return { success: true, count: result.count };
    });
  }
}
