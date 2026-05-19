import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
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
    let user: {
      id: string;
      companyId: string;
      name: string;
      email: string;
      role: string;
      permissions: unknown;
      isActive: boolean;
      activeSessionId: string | null;
    } | null;

    try {
      user = await this.prisma.user.findUnique({
        where: {
          id: payload.sub,
        },
        select: {
          id: true,
          companyId: true,
          name: true,
          email: true,
          role: true,
          permissions: true,
          isActive: true,
          activeSessionId: true,
        },
      });
    } catch (error) {
      console.error('Falha ao validar token no banco.', error);
      throwDatabaseUnavailable(error);
    }

    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'Invalid or expired authentication token.',
      );
    }

    if (!payload.sessionId || user.activeSessionId !== payload.sessionId) {
      throw new UnauthorizedException(
        'Sessao encerrada porque este usuario entrou no Contrx em outro dispositivo.',
      );
    }

    return {
      id: user.id,
      companyId: user.companyId,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    };
  }
}
