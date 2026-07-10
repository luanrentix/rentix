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

  private readonly propertyManagementModes = new Set(['OWNED', 'MANAGED']);

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

    this.validateManagedPropertyData(data.managementMode, data.ownerId);

    return this.prisma.property.create({
      data: {
        companyId,
        ownerId: data.ownerId || null,

        title: data.title,
        code: data.code || null,
        type: data.type || null,
        purpose: data.purpose || null,
        assetCategory: data.assetCategory || 'PROPERTY',
        brand: data.brand || null,
        model: data.model || null,
        serialNumber: data.serialNumber || null,
        licensePlate: data.licensePlate || null,
        manufactureYear: data.manufactureYear ?? null,
        condition: data.condition || null,
        patrimonyCode: data.patrimonyCode || null,
        rentalValue:
          data.rentalValue !== undefined && data.rentalValue !== null
            ? new Prisma.Decimal(data.rentalValue)
            : null,
        managementMode: this.normalizeManagementMode(data.managementMode),
        administrationFeePercentage:
          data.administrationFeePercentage !== undefined &&
          data.administrationFeePercentage !== null
            ? new Prisma.Decimal(data.administrationFeePercentage)
            : null,
        ownerPayoutDay: data.ownerPayoutDay ?? null,
        autoCreateOwnerPayable: data.autoCreateOwnerPayable ?? true,

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
        photos: data.photos || null,
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
      throw new NotFoundException('Bem/ativo não encontrado.');
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
      throw new NotFoundException('Bem/ativo não encontrado.');
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

    const nextOwnerId =
      data.ownerId !== undefined ? data.ownerId || null : property.ownerId;
    const nextManagementMode =
      data.managementMode !== undefined
        ? this.normalizeManagementMode(data.managementMode)
        : property.managementMode;

    this.validateManagedPropertyData(nextManagementMode, nextOwnerId);

    return this.prisma.property.update({
      where: { id },
      data: {
        companyId,
        ownerId: nextOwnerId,

        title: data.title ?? property.title,
        code: data.code !== undefined ? data.code || null : property.code,
        type: data.type !== undefined ? data.type || null : property.type,
        purpose:
          data.purpose !== undefined ? data.purpose || null : property.purpose,
        assetCategory:
          data.assetCategory !== undefined
            ? data.assetCategory || 'PROPERTY'
            : property.assetCategory,
        brand: data.brand !== undefined ? data.brand || null : property.brand,
        model: data.model !== undefined ? data.model || null : property.model,
        serialNumber:
          data.serialNumber !== undefined
            ? data.serialNumber || null
            : property.serialNumber,
        licensePlate:
          data.licensePlate !== undefined
            ? data.licensePlate || null
            : property.licensePlate,
        manufactureYear:
          data.manufactureYear !== undefined
            ? data.manufactureYear
            : property.manufactureYear,
        condition:
          data.condition !== undefined
            ? data.condition || null
            : property.condition,
        patrimonyCode:
          data.patrimonyCode !== undefined
            ? data.patrimonyCode || null
            : property.patrimonyCode,
        rentalValue:
          data.rentalValue !== undefined && data.rentalValue !== null
            ? new Prisma.Decimal(data.rentalValue)
            : property.rentalValue,
        managementMode: nextManagementMode,
        administrationFeePercentage:
          data.administrationFeePercentage !== undefined
            ? data.administrationFeePercentage !== null
              ? new Prisma.Decimal(data.administrationFeePercentage)
              : null
            : property.administrationFeePercentage,
        ownerPayoutDay:
          data.ownerPayoutDay !== undefined
            ? data.ownerPayoutDay
            : property.ownerPayoutDay,
        autoCreateOwnerPayable:
          data.autoCreateOwnerPayable ?? property.autoCreateOwnerPayable,

        zipCode:
          data.zipCode !== undefined ? data.zipCode || null : property.zipCode,
        city: data.city !== undefined ? data.city || null : property.city,
        state: data.state !== undefined ? data.state || null : property.state,
        address:
          data.address !== undefined ? data.address || null : property.address,
        district:
          data.district !== undefined
            ? data.district || null
            : property.district,
        number:
          data.number !== undefined ? data.number || null : property.number,
        complement:
          data.complement !== undefined
            ? data.complement || null
            : property.complement,

        bedrooms:
          data.bedrooms !== undefined ? data.bedrooms : property.bedrooms,
        bathrooms:
          data.bathrooms !== undefined ? data.bathrooms : property.bathrooms,
        garages: data.garages !== undefined ? data.garages : property.garages,

        description:
          data.description !== undefined
            ? data.description || null
            : property.description,
        photos:
          data.photos !== undefined
            ? data.photos || null
            : property.photos,
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
      throw new NotFoundException('Bem/ativo não encontrado.');
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
        'Bem/ativo com contrato ativo não pode ser inativado.',
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

  private normalizePropertyData<
    TData extends CriarImovelDto | AtualizarImovelDto,
  >(data: TData) {
    const { photos, ...rest } = data as any;
    const normalized = uppercaseFields(rest, [
      'title',
      'code',
      'type',
      'purpose',
      'assetCategory',
      'brand',
      'model',
      'serialNumber',
      'licensePlate',
      'condition',
      'patrimonyCode',
      'city',
      'state',
      'address',
      'district',
      'number',
      'complement',
      'description',
    ]);
    return { ...normalized, photos };
  }

  private normalizeManagementMode(value?: string | null) {
    const mode = String(value || 'OWNED').toUpperCase();

    if (!this.propertyManagementModes.has(mode)) {
      throw new BadRequestException('Modo de gestao do imovel invalido.');
    }

    return mode;
  }

  private validateManagedPropertyData(
    managementMode?: string | null,
    ownerId?: string | null,
  ) {
    if (this.normalizeManagementMode(managementMode) !== 'MANAGED') {
      return;
    }

    if (!ownerId) {
      throw new BadRequestException(
        'Informe o proprietario para imoveis administrados por imobiliaria.',
      );
    }
  }
}
