import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarImovelDto } from './dto/criar-imovel.dto';
import { AtualizarImovelDto } from './dto/atualizar-imovel.dto';

@Injectable()
export class ImoveisService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPropertyDto: CriarImovelDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: createPropertyDto.companyId },
    });

    if (!company) {
      throw new BadRequestException('Empresa não encontrada.');
    }

    if (createPropertyDto.ownerId) {
      const owner = await this.prisma.person.findFirst({
        where: {
          id: createPropertyDto.ownerId,
          companyId: createPropertyDto.companyId,
        },
      });

      if (!owner) {
        throw new BadRequestException('Proprietário não encontrado.');
      }
    }

    return this.prisma.property.create({
      data: {
        companyId: createPropertyDto.companyId,
        ownerId: createPropertyDto.ownerId || null,

        title: createPropertyDto.title,
        code: createPropertyDto.code || null,
        type: createPropertyDto.type || null,
        purpose: createPropertyDto.purpose || null,
        rentalValue:
          createPropertyDto.rentalValue !== undefined &&
          createPropertyDto.rentalValue !== null
            ? new Prisma.Decimal(createPropertyDto.rentalValue)
            : null,

        zipCode: createPropertyDto.zipCode || null,
        city: createPropertyDto.city || null,
        state: createPropertyDto.state || null,
        address: createPropertyDto.address || null,
        district: createPropertyDto.district || null,
        number: createPropertyDto.number || null,
        complement: createPropertyDto.complement || null,

        bedrooms: createPropertyDto.bedrooms ?? null,
        bathrooms: createPropertyDto.bathrooms ?? null,
        garages: createPropertyDto.garages ?? null,

        description: createPropertyDto.description || null,
        isActive: createPropertyDto.isActive ?? true,
      },
      include: {
        owner: true,
        company: true,
      },
    });
  }

  async findAll(companyId?: string) {
    if (!companyId) {
      throw new BadRequestException('O companyId é obrigatório.');
    }

    return this.prisma.property.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        owner: true,
      },
    });
  }

  async findOne(id: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        owner: true,
        company: true,
      },
    });

    if (!property) {
      throw new NotFoundException('Imóvel não encontrado.');
    }

    return property;
  }

  async update(id: string, updatePropertyDto: AtualizarImovelDto) {
    const property = await this.prisma.property.findUnique({
      where: { id },
    });

    if (!property) {
      throw new NotFoundException('Imóvel não encontrado.');
    }

    if (updatePropertyDto.ownerId) {
      const owner = await this.prisma.person.findFirst({
        where: {
          id: updatePropertyDto.ownerId,
          companyId: updatePropertyDto.companyId || property.companyId,
        },
      });

      if (!owner) {
        throw new BadRequestException('Proprietário não encontrado.');
      }
    }

    return this.prisma.property.update({
      where: { id },
      data: {
        companyId: updatePropertyDto.companyId ?? property.companyId,
        ownerId:
          updatePropertyDto.ownerId !== undefined
            ? updatePropertyDto.ownerId || null
            : property.ownerId,

        title: updatePropertyDto.title ?? property.title,
        code:
          updatePropertyDto.code !== undefined
            ? updatePropertyDto.code || null
            : property.code,
        type:
          updatePropertyDto.type !== undefined
            ? updatePropertyDto.type || null
            : property.type,
        purpose:
          updatePropertyDto.purpose !== undefined
            ? updatePropertyDto.purpose || null
            : property.purpose,
        rentalValue:
          updatePropertyDto.rentalValue !== undefined &&
          updatePropertyDto.rentalValue !== null
            ? new Prisma.Decimal(updatePropertyDto.rentalValue)
            : property.rentalValue,

        zipCode:
          updatePropertyDto.zipCode !== undefined
            ? updatePropertyDto.zipCode || null
            : property.zipCode,
        city:
          updatePropertyDto.city !== undefined
            ? updatePropertyDto.city || null
            : property.city,
        state:
          updatePropertyDto.state !== undefined
            ? updatePropertyDto.state || null
            : property.state,
        address:
          updatePropertyDto.address !== undefined
            ? updatePropertyDto.address || null
            : property.address,
        district:
          updatePropertyDto.district !== undefined
            ? updatePropertyDto.district || null
            : property.district,
        number:
          updatePropertyDto.number !== undefined
            ? updatePropertyDto.number || null
            : property.number,
        complement:
          updatePropertyDto.complement !== undefined
            ? updatePropertyDto.complement || null
            : property.complement,

        bedrooms:
          updatePropertyDto.bedrooms !== undefined
            ? updatePropertyDto.bedrooms
            : property.bedrooms,
        bathrooms:
          updatePropertyDto.bathrooms !== undefined
            ? updatePropertyDto.bathrooms
            : property.bathrooms,
        garages:
          updatePropertyDto.garages !== undefined
            ? updatePropertyDto.garages
            : property.garages,

        description:
          updatePropertyDto.description !== undefined
            ? updatePropertyDto.description || null
            : property.description,
        isActive: updatePropertyDto.isActive ?? property.isActive,
      },
      include: {
        owner: true,
        company: true,
      },
    });
  }

  async remove(id: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
    });

    if (!property) {
      throw new NotFoundException('Imóvel não encontrado.');
    }

    await this.prisma.property.delete({
      where: { id },
    });

    return {
      message: 'Imóvel excluído com sucesso.',
    };
  }
}