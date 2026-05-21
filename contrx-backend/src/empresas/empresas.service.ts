import { Injectable } from '@nestjs/common';

import { normalizeEmail, uppercaseFields } from '../common/text-normalization';
import { PrismaService } from '../prisma/prisma.service';

import { CriarEmpresaDto } from './dto/criar-empresa.dto';
import { AtualizarEmpresaDto } from './dto/atualizar-empresa.dto';

@Injectable()
export class EmpresasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CriarEmpresaDto) {
    return this.prisma.company.create({
      data: this.normalizeCompanyData(data),
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
      data: this.normalizeCompanyData(data),
    });
  }

  async remove(id: string) {
    return this.prisma.company.delete({
      where: {
        id,
      },
    });
  }

  private normalizeCompanyData<
    TData extends CriarEmpresaDto | AtualizarEmpresaDto,
  >(data: TData) {
    const normalizedData = uppercaseFields(data, [
      'companyName',
      'tradeName',
      'document',
      'phone',
    ]);

    return {
      ...normalizedData,
      email:
        normalizedData.email !== undefined
          ? normalizeEmail(normalizedData.email)
          : undefined,
    };
  }
}
