import { Injectable, UnauthorizedException } from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';

import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { normalizeEmail, toUpperText } from '../common/text-normalization';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(data: RegisterDto) {
    const email = normalizeEmail(data.email) || '';
    const name = toUpperText(data.name || '');
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
        name,
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
    const email = normalizeEmail(data.email) || '';
    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
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
}
