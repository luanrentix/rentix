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
import { createHash, randomBytes, randomUUID } from 'crypto';
import nodemailer from 'nodemailer';
import type { Company, User } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { toUpperText } from '../common/text-normalization';
import { getCompanyAccessState } from '../common/company-access-state';

import { RegisterDto } from './dto/registro.dto';
import { LoginDto } from './dto/login.dto';
import { CriarContaDto } from './dto/criar-conta.dto';
import { AlterarSenhaDto } from './dto/alterar-senha.dto';
import { RecuperarSenhaDto } from './dto/recuperar-senha.dto';
import { RedefinirSenhaDto } from './dto/redefinir-senha.dto';
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

function addMinutes(date: Date, minutes: number) {
  const nextDate = new Date(date);
  nextDate.setMinutes(nextDate.getMinutes() + minutes);

  return nextDate;
}

function hashPasswordResetToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function shouldExposePasswordResetToken() {
  return (
    process.env.NODE_ENV !== 'production' &&
    process.env.CONTRX_EXPOSE_PASSWORD_RESET_TOKEN === 'true'
  );
}

function isOwnerRole(role?: string | null) {
  return role === 'OWNER';
}

function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
  );
}

function buildPasswordResetUrl(email: string, token: string) {
  const frontendUrl =
    process.env.CONTRX_FRONTEND_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000';
  const normalizedFrontendUrl = frontendUrl.replace(/\/$/, '');
  const loginUrl = normalizedFrontendUrl.endsWith('/login')
    ? normalizedFrontendUrl
    : `${normalizedFrontendUrl}/login`;

  return `${loginUrl}?resetToken=${token}&email=${encodeURIComponent(email)}`;
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
        lastLoginAt: new Date(),
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
      this.sendWelcomeEmail(email, data.name || name).catch((err) => {
        console.error('Falha ao enviar e-mail de boas-vindas:', err);
      });
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
        lastLoginAt: new Date(),
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

  async requestPasswordReset(data: RecuperarSenhaDto) {
    const email = normalizeEmail(data.email || '');
    const canExposeToken = shouldExposePasswordResetToken();
    const genericResponse = {
      success: true,
      message:
        'Se este e-mail estiver cadastrado, as instrucoes de recuperacao serao enviadas.',
    };

    if (!email) {
      return genericResponse;
    }

    if (!canExposeToken && !isSmtpConfigured()) {
      throw new ServiceUnavailableException(
        'Recuperacao de senha por e-mail nao configurada. Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS e SMTP_FROM.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return genericResponse;
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = addMinutes(new Date(), 30);

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordResetTokenHash: hashPasswordResetToken(token),
        passwordResetExpiresAt: expiresAt,
      },
    });

    const resetUrl = buildPasswordResetUrl(email, token);

    if (!canExposeToken) {
      await this.sendPasswordResetEmail(email, resetUrl);
    } else {
      console.log(
        `\n=== [DESENVOLVIMENTO] LINK DE RECOMPOSIÇÃO DE SENHA ===\nUsuário: ${email}\nLink: ${resetUrl}\n======================================================\n`,
      );
    }

    return {
      ...genericResponse,
      expiresAt,
      ...(canExposeToken
        ? {
            resetToken: token,
            resetUrl,
          }
        : {}),
    };
  }

  private async sendWelcomeEmail(email: string, name: string) {
    if (!isSmtpConfigured()) {
      console.log(
        `[DESENVOLVIMENTO] E-mail de boas-vindas nao enviado (SMTP nao configurado). Destinatario: ${email}`,
      );
      return;
    }
    const smtpPort = process.env.SMTP_PORT
      ? Number(process.env.SMTP_PORT)
      : 587;
    const smtpFrom =
      process.env.SMTP_FROM ||
      process.env.SMTP_USER ||
      'Contrx <no-reply@contrx.com.br>';
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: 'Bem-vindo ao Contrx!',
      text: [
        `Ola, ${name}!`,
        '',
        'Estamos muito felizes em ter voce conosco no Contrx.',
        'Sua conta foi criada com sucesso e seu periodo de teste de 30 dias ja esta ativo.',
        '',
        'Caso tenha qualquer duvida, responda a este e-mail.',
        '',
        'Abracos,',
        'Equipe Contrx',
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
          <h2 style="margin: 0 0 12px; color: #ff4b00;">Bem-vindo ao Contrx, ${name}!</h2>
          <p>Estamos muito felizes em ter voce conosco.</p>
          <p>Sua conta foi criada com sucesso e seu periodo de teste de 30 dias ja esta ativo.</p>
          <p>Para começar, acesse sua conta no link abaixo para configurar sua empresa:</p>
          <p>
            <a href="https://www.contrx.com.br/login" style="display:inline-block;background:#ff4b00;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:700;">
              Acessar minha conta
            </a>
          </p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size:13px;color:#64748b;">Se voce tiver qualquer duvida, basta responder a este e-mail.</p>
        </div>
      `,
    });
  }

  private async sendPasswordResetEmail(email: string, resetUrl: string) {
    const smtpPort = process.env.SMTP_PORT
      ? Number(process.env.SMTP_PORT)
      : 587;
    const smtpFrom =
      process.env.SMTP_FROM ||
      process.env.SMTP_USER ||
      'Contrx <no-reply@contrx.com.br>';
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: 'Recuperacao de senha - Contrx',
      text: [
        'Recebemos uma solicitacao para redefinir sua senha no Contrx.',
        '',
        `Acesse o link abaixo para criar uma nova senha. O link expira em 30 minutos:`,
        resetUrl,
        '',
        'Se voce nao solicitou esta recuperacao, ignore este e-mail.',
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
          <h2 style="margin: 0 0 12px;">Recuperacao de senha - Contrx</h2>
          <p>Recebemos uma solicitacao para redefinir sua senha no Contrx.</p>
          <p>Use o botao abaixo para criar uma nova senha. O link expira em 30 minutos.</p>
          <p>
            <a href="${resetUrl}" style="display:inline-block;background:#ff4b00;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:700;">
              Redefinir senha
            </a>
          </p>
          <p style="font-size:13px;color:#64748b;">Se voce nao solicitou esta recuperacao, ignore este e-mail.</p>
        </div>
      `,
    });
  }

  async resetPassword(data: RedefinirSenhaDto) {
    const token = data.token?.trim();
    const newPassword = data.newPassword;

    if (!token || !newPassword) {
      throw new BadRequestException('Informe o codigo e a nova senha.');
    }

    const tokenHash = hashPasswordResetToken(token);
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: {
          gt: new Date(),
        },
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new BadRequestException(
        'Codigo de recuperacao invalido ou expirado.',
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        activeSessionId: null,
      },
    });

    return {
      success: true,
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

    if (isOwnerRole(data.role)) {
      throw new BadRequestException(
        'O perfil de dono da empresa nao pode ser atribuido por este fluxo.',
      );
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

    if (isOwnerRole(data.role) && existingUser.role !== 'OWNER') {
      throw new BadRequestException(
        'O perfil de dono da empresa nao pode ser atribuido por este fluxo.',
      );
    }

    if (existingUser.role === 'OWNER' && !isOwnerRole(data.role)) {
      throw new BadRequestException(
        'O perfil de dono da empresa nao pode ser alterado por este fluxo.',
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
