import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCompanyDto) {
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

  async update(id: string, data: UpdateCompanyDto) {
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