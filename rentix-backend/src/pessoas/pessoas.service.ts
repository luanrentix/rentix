import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CriarPessoaDto } from './dto/criar-pessoa.dto';
import { AtualizarPessoaDto } from './dto/atualizar-pessoa.dto';

@Injectable()
export class PessoasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CriarPessoaDto) {
    return this.prisma.person.create({
      data: {
        companyId: data.companyId,
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

  async findAll(companyId?: string) {
    return this.prisma.person.findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const person = await this.prisma.person.findUnique({
      where: {
        id,
      },
    });

    if (!person) {
      throw new NotFoundException('Person not found');
    }

    return person;
  }

  async update(id: string, data: AtualizarPessoaDto) {
    await this.findOne(id);

    return this.prisma.person.update({
      where: {
        id,
      },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.person.delete({
      where: {
        id,
      },
    });
  }
}
