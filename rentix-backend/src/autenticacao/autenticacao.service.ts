import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';

import { RegisterDto } from './dto/registro.dto';
import { LoginDto } from './dto/login.dto';
import { CriarContaDto } from './dto/criar-conta.dto';
import { AlterarSenhaDto } from './dto/alterar-senha.dto';
import { UsuarioAutenticado } from './types/usuario-autenticado.type';

@Injectable()
export class AutenticacaoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(data: RegisterDto) {
    const userExists = await this.prisma.user.findUnique({
      where: {
        email: data.email,
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
        email: data.email,
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
    const user = await this.prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });

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
      },
    };
  }

  async createAccount(data: CriarContaDto) {
    const name = data.name?.trim();
    const email = data.email?.trim().toLowerCase();
    const password = data.password;
    const companyName = data.companyName?.trim();

    if (!name || !email || !password || !companyName) {
      throw new BadRequestException('Preencha nome, e-mail, senha e empresa.');
    }

    if (password.length < 8) {
      throw new BadRequestException(
        'A senha precisa ter pelo menos 8 caracteres.',
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
      throw new ConflictException('Este e-mail ja possui uma conta no Rentix.');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const { user } = await this.prisma.$transaction(async (tx) => {
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
          role: 'OWNER',
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
      },
    };
  }

  async changePassword(user: UsuarioAutenticado, data: AlterarSenhaDto) {
    const currentPassword = data.currentPassword;
    const newPassword = data.newPassword;

    if (newPassword.length < 8) {
      throw new BadRequestException(
        'A nova senha precisa ter pelo menos 8 caracteres.',
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
