import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import type { Company, User } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { toUpperText } from '../common/text-normalization';
import { getCompanyAccessState } from '../common/company-access-state';

import { RegisterDto } from './dto/registro.dto';
import { LoginDto } from './dto/login.dto';
import { CriarContaDto } from './dto/criar-conta.dto';
import { AlterarSenhaDto } from './dto/alterar-senha.dto';
import {
  AtualizarUsuarioEmpresaDto,
  CriarUsuarioEmpresaDto,
  userToolPermissions,
  type UserToolPermission,
} from './dto/criar-usuario-empresa.dto';
import { UsuarioAutenticado } from './types/usuario-autenticado.type';

const DATABASE_AUTH_ERROR_MESSAGE =
  'Credenciais do banco de dados invalidas. Atualize DATABASE_URL e DIRECT_URL no arquivo contrx-backend/.env e reinicie o backend.';

const DATABASE_CONNECTION_ERROR_MESSAGE =
  'Banco de dados indisponivel. Verifique se DATABASE_URL/DIRECT_URL estao corretas e se o banco esta online.';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '').slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }

  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

type AuthenticatedUserWithCompany = User & {
  company: Pick<
    Company,
    | 'isActive'
    | 'subscriptionStatus'
    | 'trialStartsAt'
    | 'trialEndsAt'
    | 'trialExtendedUntil'
    | 'subscriptionEndsAt'
  >;
};

function buildAuthenticatedUserPayload(user: AuthenticatedUserWithCompany) {
  const accessState = getCompanyAccessState(user.company);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    companyId: user.companyId,
    role: user.role,
    permissions: user.permissions,
    companyIsActive: user.company.isActive,
    subscriptionStatus: user.company.subscriptionStatus,
    trialStartsAt: user.company.trialStartsAt,
    trialEndsAt: user.company.trialEndsAt,
    trialExtendedUntil: user.company.trialExtendedUntil,
    trialAccessEndsAt: accessState.endsAt,
    trialDaysRemaining:
      accessState.daysRemaining === null
        ? null
        : Math.max(0, accessState.daysRemaining),
    subscriptionEndsAt: user.company.subscriptionEndsAt,
    accessState,
  };
}

function normalizePermissions(permissions: string[]) {
  const allowedPermissions = new Set<string>(userToolPermissions);

  return Array.from(
    new Set(
      permissions.filter((permission): permission is UserToolPermission =>
        allowedPermissions.has(permission),
      ),
    ),
  );
}

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
export class AutenticacaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(data: RegisterDto) {
    const email = normalizeEmail(data.email);

    const userExists = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (userExists) {
      throw new UnauthorizedException('User already exists');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        companyId: data.companyId,
        name: toUpperText(data.name || ''),
        email,
        passwordHash,
      },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      companyId: user.companyId,
    };
  }

  async login(data: LoginDto) {
    let user: AuthenticatedUserWithCompany | null;
    const email = normalizeEmail(data.email);

    try {
      user = await this.prisma.user.findUnique({
        where: {
          email,
        },
        include: {
          company: {
            select: {
              isActive: true,
              subscriptionStatus: true,
              trialStartsAt: true,
              trialEndsAt: true,
              trialExtendedUntil: true,
              subscriptionEndsAt: true,
            },
          },
        },
      });
    } catch (error) {
      console.error('Falha ao consultar usuario no login.', error);
      throwDatabaseUnavailable(error);
    }

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuario inativo.');
    }

    const passwordMatch = await bcrypt.compare(
      data.password,
      user.passwordHash,
    );

    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessState = getCompanyAccessState(user.company);

    if (!accessState.canAccess) {
      throw new UnauthorizedException(accessState.reason);
    }

    const sessionId = randomUUID();
    const authenticatedUser = await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        activeSessionId: sessionId,
      },
      include: {
        company: {
          select: {
            isActive: true,
            subscriptionStatus: true,
            trialStartsAt: true,
            trialEndsAt: true,
            trialExtendedUntil: true,
            subscriptionEndsAt: true,
          },
        },
      },
    });

    const token = await this.jwtService.signAsync({
      sub: authenticatedUser.id,
      email: authenticatedUser.email,
      companyId: authenticatedUser.companyId,
      role: authenticatedUser.role,
      sessionId,
    });

    return {
      accessToken: token,
      user: buildAuthenticatedUserPayload(authenticatedUser),
    };
  }

  async createAccount(data: CriarContaDto) {
    const name = data.name ? toUpperText(data.name) : '';
    const email = normalizeEmail(data.email || '');
    const password = data.password;
    const companyName = data.companyName ? toUpperText(data.companyName) : '';
    const phoneDigits = (data.phone || '').replace(/\D/g, '');
    const phone = formatPhone(data.phone || '');

    if (!name || !email || !password || !companyName || !phone) {
      throw new BadRequestException(
        'Preencha nome, empresa, telefone, e-mail e senha.',
      );
    }

    if (phoneDigits.length < 10) {
      throw new BadRequestException('Informe um telefone com DDD valido.');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const trialStartsAt = new Date();
    const trialEndsAt = addDays(trialStartsAt, 30);

    let user: AuthenticatedUserWithCompany;

    try {
      const userExists = await this.prisma.user.findUnique({
        where: {
          email,
        },
        select: {
          id: true,
        },
      });

      if (userExists) {
        throw new ConflictException(
          'Este e-mail ja possui uma conta no Contrx.',
        );
      }

      const result = await this.prisma.$transaction(async (tx) => {
        const company = await tx.company.create({
          data: {
            tradeName: companyName,
            companyName,
            phone,
            email,
            subscriptionStatus: 'TRIAL',
            trialStartsAt,
            trialEndsAt,
          },
        });

        const createdUser = await tx.user.create({
          data: {
            companyId: company.id,
            name,
            email,
            passwordHash,
            role: 'ADMIN',
            permissions: [...userToolPermissions],
          },
          include: {
            company: {
              select: {
                isActive: true,
                subscriptionStatus: true,
                trialStartsAt: true,
                trialEndsAt: true,
                trialExtendedUntil: true,
                subscriptionEndsAt: true,
              },
            },
          },
        });

        await tx.appSettings.create({
          data: {
            companyId: company.id,
            userSettings: {
              name,
              email,
            },
            companySettings: {
              companyName,
              tradeName: companyName,
              phone,
              email,
            },
            themeSettings: {
              mode: 'light',
            },
          },
        });

        return {
          company,
          user: createdUser,
        };
      });

      user = result.user;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      console.error('Falha ao criar conta.', error);
      throwDatabaseUnavailable(error);
    }

    const sessionId = randomUUID();
    const authenticatedUser = await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        activeSessionId: sessionId,
      },
      include: {
        company: {
          select: {
            isActive: true,
            subscriptionStatus: true,
            trialStartsAt: true,
            trialEndsAt: true,
            trialExtendedUntil: true,
            subscriptionEndsAt: true,
          },
        },
      },
    });

    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
      sessionId,
    });

    return {
      accessToken: token,
      user: buildAuthenticatedUserPayload(authenticatedUser),
    };
  }

  async findCompanyUsers(user: UsuarioAutenticado) {
    return this.prisma.user.findMany({
      where: {
        companyId: user.companyId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async createCompanyUser(
    user: UsuarioAutenticado,
    data: CriarUsuarioEmpresaDto,
  ) {
    const name = data.name ? toUpperText(data.name) : '';
    const email = normalizeEmail(data.email || '');
    const password = data.password;
    const permissions = normalizePermissions(data.permissions || []);

    if (!name || !email || !password) {
      throw new BadRequestException('Preencha nome, e-mail e senha.');
    }

    if (permissions.length === 0) {
      throw new BadRequestException('Selecione ao menos uma ferramenta.');
    }

    const userExists = await this.prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (userExists) {
      throw new ConflictException('Este e-mail ja possui uma conta no Contrx.');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const createdUser = await this.prisma.user.create({
      data: {
        companyId: user.companyId,
        name,
        email,
        passwordHash,
        role: data.role,
        permissions,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return createdUser;
  }

  async updateCompanyUser(
    user: UsuarioAutenticado,
    userId: string,
    data: AtualizarUsuarioEmpresaDto,
  ) {
    const name = data.name ? toUpperText(data.name) : '';
    const permissions = normalizePermissions(data.permissions || []);
    const password = data.password?.trim();

    if (!name) {
      throw new BadRequestException('Informe o nome do usuario.');
    }

    if (permissions.length === 0) {
      throw new BadRequestException('Selecione ao menos uma ferramenta.');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        id: userId,
        companyId: user.companyId,
      },
      select: {
        id: true,
        role: true,
        isActive: true,
      },
    });

    if (!existingUser) {
      throw new NotFoundException('Usuario nao encontrado nesta empresa.');
    }

    if (existingUser.role === 'SYSTEM_OWNER') {
      throw new BadRequestException(
        'O dono do sistema nao pode ser editado neste cadastro.',
      );
    }

    const currentUserIsCompanyAdmin =
      existingUser.isActive &&
      (existingUser.role === 'OWNER' || existingUser.role === 'ADMIN');
    const nextUserIsCompanyAdmin =
      data.isActive && (data.role === 'OWNER' || data.role === 'ADMIN');

    if (currentUserIsCompanyAdmin && !nextUserIsCompanyAdmin) {
      const activeCompanyAdminsCount = await this.prisma.user.count({
        where: {
          companyId: user.companyId,
          isActive: true,
          role: {
            in: ['OWNER', 'ADMIN'],
          },
        },
      });

      if (activeCompanyAdminsCount <= 1) {
        throw new BadRequestException(
          'Mantenha pelo menos um administrador ativo na empresa.',
        );
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        name,
        role: data.role,
        isActive: data.isActive,
        permissions,
        ...(password
          ? {
              passwordHash: await bcrypt.hash(password, 10),
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async changePassword(user: UsuarioAutenticado, data: AlterarSenhaDto) {
    const currentPassword = data.currentPassword;
    const newPassword = data.newPassword;

    if (!newPassword) {
      throw new BadRequestException('Informe a nova senha.');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        id: user.id,
        companyId: user.companyId,
      },
    });

    if (!existingUser || !existingUser.isActive) {
      throw new UnauthorizedException('Usuario nao encontrado ou inativo.');
    }

    const passwordMatch = await bcrypt.compare(
      currentPassword,
      existingUser.passwordHash,
    );

    if (!passwordMatch) {
      throw new UnauthorizedException('Senha atual invalida.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: {
        id: existingUser.id,
      },
      data: {
        passwordHash,
      },
    });

    return {
      success: true,
    };
  }
}
