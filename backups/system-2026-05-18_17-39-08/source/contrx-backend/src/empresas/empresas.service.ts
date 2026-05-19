import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CriarEmpresaDto } from './dto/criar-empresa.dto';
import { AtualizarEmpresaDto } from './dto/atualizar-empresa.dto';

@Injectable()
export class EmpresasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CriarEmpresaDto) {
    return this.prisma.company.create({
      data,
    });
  }

  async findAll() {
    return this.prisma.company.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.company.findUnique({
      where: {
        id,
      },
    });
  }

  async update(id: string, data: AtualizarEmpresaDto) {
    return this.prisma.company.update({
      where: {
        id,
      },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.company.delete({
      where: {
        id,
      },
    });
  }
}
