import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { getCompanyAccessState } from '../../common/company-access-state';
import { PrismaService } from '../../prisma/prisma.service';
import { UsuarioAutenticado } from '../types/usuario-autenticado.type';

type JwtPayload = {
  sub: string;
  companyId: string;
  email: string;
  role: string;
  sessionId?: string;
};

const DATABASE_CONNECTION_ERROR_MESSAGE =
  'Banco de dados indisponivel. Verifique se DATABASE_URL/DIRECT_URL estao corretas e se o banco esta online.';

const DATABASE_AUTH_ERROR_MESSAGE =
  'Credenciais do banco de dados invalidas. Atualize DATABASE_URL e DIRECT_URL no arquivo contrx-backend/.env e reinicie o backend.';

function isDatabaseAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    code?: string;
    message?: string;
    meta?: {
      driverAdapterError?: {
        cause?: {
          code?: string;
        };
      };
    };
  };

  const message = candidate.message?.toLowerCase() || '';
  const causeCode = candidate.meta?.driverAdapterError?.cause?.code;

  return (
    candidate.code === 'P1000' ||
    causeCode === '28P01' ||
    message.includes('authentication failed') ||
    message.includes('password authentication failed')
  );
}

function throwDatabaseUnavailable(error: unknown): never {
  if (isDatabaseAuthError(error)) {
    throw new ServiceUnavailableException(DATABASE_AUTH_ERROR_MESSAGE);
  }

  throw new ServiceUnavailableException(DATABASE_CONNECTION_ERROR_MESSAGE);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<UsuarioAutenticado> {
    let user;
    try {
      user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { company: true },
      });
    } catch (error) {
      throwDatabaseUnavailable(error);
    }
    if (!user || !user.isActive || user.companyId !== payload.companyId) {
      throw new UnauthorizedException(
        'Invalid or expired authentication token.',
      );
    }

    const accessState = getCompanyAccessState(user.company);

    if (!accessState.canAccess) {
      throw new UnauthorizedException(accessState.reason);
    }

    const session = payload.sessionId
      ? await this.prisma.userSession.findFirst({
          where: {
            sessionId: payload.sessionId,
            userId: user.id,
            companyId: user.companyId,
          },
        })
      : null;
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException({
        code: session?.reason || 'SESSION_EXPIRED',
        message: 'Sua sessão foi encerrada. Entre novamente para continuar.',
      });
    }
    if (session.lastSeenAt.getTime() < Date.now() - 60_000)
      await this.prisma.userSession.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { lastSeenAt: new Date() },
      });

    return {
      id: user.id,
      companyId: user.companyId,
      name: user.name,
      email: user.email || '',
      role: user.role,
      permissions: user.permissions,
      actionPermissions: user.actionPermissions,
      sessionId: payload.sessionId,
    };
  }
}
