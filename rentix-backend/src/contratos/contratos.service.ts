import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ContractStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarContratoDto } from './dto/criar-contrato.dto';
import { AtualizarContratoDto } from './dto/atualizar-contrato.dto';

@Injectable()
export class ContratosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createContractDto: CriarContratoDto, companyId: string) {
    const data = {
      ...createContractDto,
      companyId,
    };

    await this.validateContractRelations(
      data.companyId,
      data.propertyId,
      data.tenantId,
    );

    await this.ensurePropertyHasNoActiveContract(
      data.companyId,
      data.propertyId,
    );

    return this.prisma.contract.create({
      data: this.buildCreateData(data),
      include: this.defaultInclude,
    });
  }

  async findAll(companyId?: string) {
    if (!companyId) {
      throw new BadRequestException('O companyId e obrigatorio.');
    }

    return this.prisma.contract.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: this.defaultInclude,
    });
  }

  async findOne(id: string, companyId: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, companyId },
      include: this.defaultInclude,
    });

    if (!contract) {
      throw new NotFoundException('Contrato nao encontrado.');
    }

    return contract;
  }

  async update(
    id: string,
    updateContractDto: AtualizarContratoDto,
    companyId: string,
  ) {
    const currentContract = await this.prisma.contract.findFirst({
      where: { id, companyId },
    });

    if (!currentContract) {
      throw new NotFoundException('Contrato nao encontrado.');
    }

    const nextCompanyId = companyId;
    const nextPropertyId =
      updateContractDto.propertyId ?? currentContract.propertyId;
    const nextTenantId = updateContractDto.tenantId ?? currentContract.tenantId;

    await this.validateContractRelations(
      nextCompanyId,
      nextPropertyId,
      nextTenantId,
    );

    if (
      nextPropertyId !== currentContract.propertyId ||
      nextCompanyId !== currentContract.companyId
    ) {
      await this.ensurePropertyHasNoActiveContract(
        nextCompanyId,
        nextPropertyId,
        currentContract.id,
      );
    }

    return this.prisma.contract.update({
      where: { id },
      data: this.buildUpdateData({
        ...updateContractDto,
        companyId,
      }),
      include: this.defaultInclude,
    });
  }

  async remove(id: string, companyId: string) {
    const contract = await this.prisma.contract.findFirst({
      where: { id, companyId },
    });

    if (!contract) {
      throw new NotFoundException('Contrato nao encontrado.');
    }

    return this.prisma.contract.update({
      where: { id },
      data: {
        status: ContractStatus.DELETED,
        deletedAt: new Date(),
        statusReasonType: 'DELETED',
        statusReasonAt: new Date(),
      },
      include: this.defaultInclude,
    });
  }

  private get defaultInclude() {
    return {
      property: true,
      tenant: true,
      company: true,
    };
  }

  private async validateContractRelations(
    companyId: string,
    propertyId: string,
    tenantId: string,
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new BadRequestException('Empresa nao encontrada.');
    }

    const property = await this.prisma.property.findFirst({
      where: {
        id: propertyId,
        companyId,
      },
    });

    if (!property) {
      throw new BadRequestException('Imovel nao encontrado.');
    }

    if (!property.isActive) {
      throw new BadRequestException('Imovel inativo nao pode ser alugado.');
    }

    const tenant = await this.prisma.person.findFirst({
      where: {
        id: tenantId,
        companyId,
      },
    });

    if (!tenant) {
      throw new BadRequestException('Inquilino nao encontrado.');
    }

    if (tenant.status !== 'ACTIVE') {
      throw new BadRequestException('Inquilino inativo nao pode ser usado.');
    }
  }

  private async ensurePropertyHasNoActiveContract(
    companyId: string,
    propertyId: string,
    ignoredContractId?: string,
  ) {
    const existingContract = await this.prisma.contract.findFirst({
      where: {
        companyId,
        propertyId,
        status: {
          in: [ContractStatus.ACTIVE],
        },
        id: ignoredContractId ? { not: ignoredContractId } : undefined,
      },
    });

    if (existingContract) {
      throw new BadRequestException('Este imovel ja possui contrato ativo.');
    }
  }

  private buildCreateData(
    createContractDto: CriarContratoDto,
  ): Prisma.ContractCreateInput {
    return {
      company: { connect: { id: createContractDto.companyId } },
      property: { connect: { id: createContractDto.propertyId } },
      tenant: { connect: { id: createContractDto.tenantId } },
      propertyName: createContractDto.propertyName || null,
      tenantName: createContractDto.tenantName || null,
      startDate: this.parseDate(
        createContractDto.startDate,
        'Data inicial invalida.',
      ),
      endDate: this.parseDate(
        createContractDto.endDate,
        'Data final invalida.',
      ),
      rentValue: new Prisma.Decimal(createContractDto.rentValue),
      status: createContractDto.status ?? ContractStatus.ACTIVE,
      deletedAt: this.parseOptionalDate(createContractDto.deletedAt),
      statusReason: createContractDto.statusReason || null,
      statusReasonType: createContractDto.statusReasonType ?? null,
      statusReasonAt: this.parseOptionalDate(createContractDto.statusReasonAt),
      isTemporaryRental: createContractDto.isTemporaryRental ?? false,
      checkInTime: createContractDto.checkInTime || null,
      checkOutTime: createContractDto.checkOutTime || null,
      renewedAt: this.parseOptionalDate(createContractDto.renewedAt),
      renewalHistory:
        createContractDto.renewalHistory === undefined
          ? Prisma.JsonNull
          : createContractDto.renewalHistory,
      finishedAt: this.parseOptionalDate(createContractDto.finishedAt),
      finishReason: createContractDto.finishReason || null,
    };
  }

  private buildUpdateData(
    updateContractDto: AtualizarContratoDto,
  ): Prisma.ContractUpdateInput {
    return {
      company: updateContractDto.companyId
        ? { connect: { id: updateContractDto.companyId } }
        : undefined,
      property: updateContractDto.propertyId
        ? { connect: { id: updateContractDto.propertyId } }
        : undefined,
      tenant: updateContractDto.tenantId
        ? { connect: { id: updateContractDto.tenantId } }
        : undefined,
      propertyName:
        updateContractDto.propertyName !== undefined
          ? updateContractDto.propertyName || null
          : undefined,
      tenantName:
        updateContractDto.tenantName !== undefined
          ? updateContractDto.tenantName || null
          : undefined,
      startDate:
        updateContractDto.startDate !== undefined
          ? this.parseDate(
              updateContractDto.startDate,
              'Data inicial invalida.',
            )
          : undefined,
      endDate:
        updateContractDto.endDate !== undefined
          ? this.parseDate(updateContractDto.endDate, 'Data final invalida.')
          : undefined,
      rentValue:
        updateContractDto.rentValue !== undefined
          ? new Prisma.Decimal(updateContractDto.rentValue)
          : undefined,
      status: updateContractDto.status,
      deletedAt:
        updateContractDto.deletedAt !== undefined
          ? this.parseOptionalDate(updateContractDto.deletedAt)
          : undefined,
      statusReason:
        updateContractDto.statusReason !== undefined
          ? updateContractDto.statusReason || null
          : undefined,
      statusReasonType:
        updateContractDto.statusReasonType !== undefined
          ? updateContractDto.statusReasonType
          : undefined,
      statusReasonAt:
        updateContractDto.statusReasonAt !== undefined
          ? this.parseOptionalDate(updateContractDto.statusReasonAt)
          : undefined,
      isTemporaryRental: updateContractDto.isTemporaryRental,
      checkInTime:
        updateContractDto.checkInTime !== undefined
          ? updateContractDto.checkInTime || null
          : undefined,
      checkOutTime:
        updateContractDto.checkOutTime !== undefined
          ? updateContractDto.checkOutTime || null
          : undefined,
      renewedAt:
        updateContractDto.renewedAt !== undefined
          ? this.parseOptionalDate(updateContractDto.renewedAt)
          : undefined,
      renewalHistory:
        updateContractDto.renewalHistory !== undefined
          ? updateContractDto.renewalHistory
          : undefined,
      finishedAt:
        updateContractDto.finishedAt !== undefined
          ? this.parseOptionalDate(updateContractDto.finishedAt)
          : undefined,
      finishReason:
        updateContractDto.finishReason !== undefined
          ? updateContractDto.finishReason || null
          : undefined,
    };
  }

  private parseDate(value: string, errorMessage: string) {
    const parsedDate = new Date(`${value}T00:00:00`);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(errorMessage);
    }

    return parsedDate;
  }

  private parseOptionalDate(value?: string | null) {
    if (!value) return null;

    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Data invalida.');
    }

    return parsedDate;
  }
}
