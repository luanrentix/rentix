import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CriarPropertyMovementDto } from './dto/criar-property-movement.dto';

@Injectable()
export class PropertyMovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CriarPropertyMovementDto) {
    await this.validateCompanyAndProperty(data.companyId, data.propertyId);

    return this.prisma.propertyMovement.create({
      data: {
        companyId: data.companyId,
        propertyId: data.propertyId,
        propertyName: data.propertyName,
        type: data.type,
        description: data.description,
      },
    });
  }

  findAll(companyId?: string, propertyId?: string) {
    return this.prisma.propertyMovement.findMany({
      where: {
        companyId,
        propertyId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private async validateCompanyAndProperty(companyId: string, propertyId: string) {
    if (!companyId) {
      throw new BadRequestException('O companyId e obrigatorio.');
    }

    if (!propertyId) {
      throw new BadRequestException('O propertyId e obrigatorio.');
    }

    const property = await this.prisma.property.findFirst({
      where: {
        id: propertyId,
        companyId,
      },
      select: { id: true },
    });

    if (!property) {
      throw new BadRequestException('Imovel nao encontrado para esta empresa.');
    }
  }
}
