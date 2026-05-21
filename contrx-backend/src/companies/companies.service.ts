import { Injectable } from '@nestjs/common';

import { normalizeEmail, uppercaseFields } from '../common/text-normalization';
import { PrismaService } from '../prisma/prisma.service';

import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCompanyDto) {
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

  async update(id: string, data: UpdateCompanyDto) {
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

  private normalizeCompanyData<TData extends CreateCompanyDto | UpdateCompanyDto>(
    data: TData,
  ) {
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
