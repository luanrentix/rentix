import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CriarPessoaDto } from './dto/criar-pessoa.dto';
import { AtualizarPessoaDto } from './dto/atualizar-pessoa.dto';

@Injectable()
export class PessoasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CriarPessoaDto, companyId: string) {
    return this.prisma.person.create({
      data: {
        companyId,
        type: data.type,
        name: data.name,
        document: data.document,
        email: data.email,
        phone: data.phone,
        city: data.city,
        state: data.state,
        address: data.address,
        status: data.status ?? 'ACTIVE',
      },
    });
  }

  async findAll(companyId: string) {
    return this.prisma.person.findMany({
      where: { companyId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, companyId: string) {
    const person = await this.prisma.person.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!person) {
      throw new NotFoundException('Person not found');
    }

    return person;
  }

  async update(id: string, data: AtualizarPessoaDto, companyId: string) {
    await this.findOne(id, companyId);

    return this.prisma.person.update({
      where: {
        id,
      },
      data: {
        ...data,
        companyId,
      },
    });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);

    return this.prisma.person.delete({
      where: {
        id,
      },
    });
  }
}
