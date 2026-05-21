import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContractStatus, Prisma } from '@prisma/client';
import { uppercaseFields } from '../common/text-normalization';
import { PrismaService } from '../prisma/prisma.service';
import { CriarImovelDto } from './dto/criar-imovel.dto';
import { AtualizarImovelDto } from './dto/atualizar-imovel.dto';

@Injectable()
export class ImoveisService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPropertyDto: CriarImovelDto, companyId: string) {
    const data = this.normalizePropertyData(createPropertyDto);
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new BadRequestException('Empresa não encontrada.');
    }

    if (data.ownerId) {
      const owner = await this.prisma.person.findFirst({
        where: {
          id: data.ownerId,
          companyId,
        },
      });

      if (!owner) {
        throw new BadRequestException('Proprietário não encontrado.');
      }
    }

    return this.prisma.property.create({
      data: {
        companyId,
        ownerId: data.ownerId || null,

        title: data.title,
        code: data.code || null,
        type: data.type || null,
        purpose: data.purpose || null,
        rentalValue:
          data.rentalValue !== undefined &&
          data.rentalValue !== null
            ? new Prisma.Decimal(data.rentalValue)
            : null,

        zipCode: data.zipCode || null,
        city: data.city || null,
        state: data.state || null,
        address: data.address || null,
        district: data.district || null,
        number: data.number || null,
        complement: data.complement || null,

        bedrooms: data.bedrooms ?? null,
        bathrooms: data.bathrooms ?? null,
        garages: data.garages ?? null,

        description: data.description || null,
        isActive: data.isActive ?? true,
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

  async findOne(id: string, companyId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id, companyId },
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

  async update(
    id: string,
    updatePropertyDto: AtualizarImovelDto,
    companyId: string,
  ) {
    const data = this.normalizePropertyData(updatePropertyDto);
    const property = await this.prisma.property.findFirst({
      where: { id, companyId },
    });

    if (!property) {
      throw new NotFoundException('Imóvel não encontrado.');
    }

    if (data.ownerId) {
      const owner = await this.prisma.person.findFirst({
        where: {
          id: data.ownerId,
          companyId,
        },
      });

      if (!owner) {
        throw new BadRequestException('Proprietário não encontrado.');
      }
    }

    return this.prisma.property.update({
      where: { id },
      data: {
        companyId,
        ownerId:
          data.ownerId !== undefined
            ? data.ownerId || null
            : property.ownerId,

        title: data.title ?? property.title,
        code:
          data.code !== undefined
            ? data.code || null
            : property.code,
        type:
          data.type !== undefined
            ? data.type || null
            : property.type,
        purpose:
          data.purpose !== undefined
            ? data.purpose || null
            : property.purpose,
        rentalValue:
          data.rentalValue !== undefined &&
          data.rentalValue !== null
            ? new Prisma.Decimal(data.rentalValue)
            : property.rentalValue,

        zipCode:
          data.zipCode !== undefined
            ? data.zipCode || null
            : property.zipCode,
        city:
          data.city !== undefined
            ? data.city || null
            : property.city,
        state:
          data.state !== undefined
            ? data.state || null
            : property.state,
        address:
          data.address !== undefined
            ? data.address || null
            : property.address,
        district:
          data.district !== undefined
            ? data.district || null
            : property.district,
        number:
          data.number !== undefined
            ? data.number || null
            : property.number,
        complement:
          data.complement !== undefined
            ? data.complement || null
            : property.complement,

        bedrooms:
          data.bedrooms !== undefined
            ? data.bedrooms
            : property.bedrooms,
        bathrooms:
          data.bathrooms !== undefined
            ? data.bathrooms
            : property.bathrooms,
        garages:
          data.garages !== undefined
            ? data.garages
            : property.garages,

        description:
          data.description !== undefined
            ? data.description || null
            : property.description,
        isActive: data.isActive ?? property.isActive,
      },
      include: {
        owner: true,
        company: true,
      },
    });
  }

  async remove(id: string, companyId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id, companyId },
    });

    if (!property) {
      throw new NotFoundException('Imóvel não encontrado.');
    }

    const activeContract = await this.prisma.contract.findFirst({
      where: {
        companyId,
        propertyId: id,
        status: ContractStatus.ACTIVE,
      },
    });

    if (activeContract) {
      throw new BadRequestException(
        'Imóvel com contrato ativo não pode ser inativado.',
      );
    }

    return this.prisma.property.update({
      where: { id },
      data: {
        isActive: false,
      },
      include: {
        owner: true,
        company: true,
      },
    });
  }

  private normalizePropertyData<TData extends CriarImovelDto | AtualizarImovelDto>(
    data: TData,
  ) {
    return uppercaseFields(data, [
      'title',
      'code',
      'type',
      'purpose',
      'city',
      'state',
      'address',
      'district',
      'number',
      'complement',
      'description',
    ]);
  }
}
