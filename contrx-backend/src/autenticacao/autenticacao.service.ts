import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import * as bcrypt from 'bcrypt';
import type { User } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

import { RegisterDto } from './dto/registro.dto';
import { LoginDto } from './dto/login.dto';
import { CriarContaDto } from './dto/criar-conta.dto';
import { AlterarSenhaDto } from './dto/alterar-senha.dto';
import {
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
        name: data.name,
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
    let user: User | null;
    const email = normalizeEmail(data.email);

    try {
      user = await this.prisma.user.findUnique({
        where: {
          email,
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

    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
    });

    return {
      accessToken: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        companyId: user.companyId,
        role: user.role,
        permissions: user.permissions,
      },
    };
  }

  async createAccount(data: CriarContaDto) {
    const name = data.name?.trim();
    const email = normalizeEmail(data.email || '');
    const password = data.password;
    const companyName = data.companyName?.trim();

    if (!name || !email || !password || !companyName) {
      throw new BadRequestException('Preencha nome, e-mail, senha e empresa.');
    }

    if (password.length < 6) {
      throw new BadRequestException(
        'A senha precisa ter pelo menos 6 caracteres.',
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let user: User;

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
            email,
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

    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
    });

    return {
      accessToken: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        companyId: user.companyId,
        role: user.role,
        permissions: user.permissions,
      },
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
    const name = data.name?.trim();
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

  async changePassword(user: UsuarioAutenticado, data: AlterarSenhaDto) {
    const currentPassword = data.currentPassword;
    const newPassword = data.newPassword;

    if (newPassword.length < 6) {
      throw new BadRequestException(
        'A nova senha precisa ter pelo menos 6 caracteres.',
      );
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
