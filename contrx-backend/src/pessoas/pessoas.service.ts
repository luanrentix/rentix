import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { normalizeEmail, uppercaseFields } from '../common/text-normalization';

import { CriarPessoaDto } from './dto/criar-pessoa.dto';
import { AtualizarPessoaDto } from './dto/atualizar-pessoa.dto';

@Injectable()
export class PessoasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CriarPessoaDto, companyId: string) {
    const normalizedData = this.normalizePersonData(data);

    await this.ensureDocumentIsAvailable(normalizedData.document, companyId);

    return this.prisma.person.create({
      data: {
        companyId,
        type: normalizedData.type,
        name: normalizedData.name,
        document: normalizedData.document,
        stateRegistration: normalizedData.stateRegistration,
        identityNumber: normalizedData.identityNumber,
        email: normalizeEmail(normalizedData.email),
        phone: normalizedData.phone,
        isTenant: normalizedData.isTenant ?? true,
        zipCode: normalizedData.zipCode,
        city: normalizedData.city,
        state: normalizedData.state,
        address: normalizedData.address,
        status: normalizedData.status ?? 'ACTIVE',
        photo: normalizedData.photo || null,
      },
    });
  }

  async findAll(companyId: string) {
    return this.prisma.person.findMany({
      where: { companyId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, companyId: string) {
    const person = await this.prisma.person.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!person) {
      throw new NotFoundException('Person not found');
    }

    return person;
  }

  async update(id: string, data: AtualizarPessoaDto, companyId: string) {
    const normalizedData = this.normalizePersonData(data);

    await this.findOne(id, companyId);

    if (normalizedData.document) {
      await this.ensureDocumentIsAvailable(
        normalizedData.document,
        companyId,
        id,
      );
    }

    return this.prisma.person.update({
      where: {
        id,
      },
      data: {
        ...normalizedData,
        email:
          normalizedData.email !== undefined
            ? normalizeEmail(normalizedData.email)
            : undefined,
        companyId,
      },
    });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);

    await this.ensurePersonHasNoMovements(id, companyId);

    return this.prisma.person.delete({
      where: {
        id,
      },
    });
  }

  private async ensureDocumentIsAvailable(
    document: string,
    companyId: string,
    ignoredPersonId?: string,
  ) {
    const existingPerson = await this.prisma.person.findFirst({
      where: {
        companyId,
        document,
        id: ignoredPersonId ? { not: ignoredPersonId } : undefined,
      },
    });

    if (existingPerson) {
      throw new BadRequestException('Já existe uma pessoa com este documento.');
    }
  }

  private async ensurePersonHasNoMovements(id: string, companyId: string) {
    const [
      ownedPropertiesCount,
      tenantContractsCount,
      receivableAccountsCount,
      payableAccountsCount,
    ] = await this.prisma.$transaction([
      this.prisma.property.count({
        where: {
          companyId,
          ownerId: id,
        },
      }),
      this.prisma.contract.count({
        where: {
          companyId,
          tenantId: id,
        },
      }),
      this.prisma.contaReceber.count({
        where: {
          companyId,
          tenantId: id,
        },
      }),
      this.prisma.contaPagar.count({
        where: {
          companyId,
          personId: id,
        },
      }),
    ]);

    const movementCount =
      ownedPropertiesCount +
      tenantContractsCount +
      receivableAccountsCount +
      payableAccountsCount;

    if (movementCount > 0) {
      throw new BadRequestException(
        'Esta pessoa possui movimentação no sistema e não pode ser excluída. Utilize a inativação para preservar o histórico.',
      );
    }
  }

  private normalizePersonData<
    TData extends CriarPessoaDto | AtualizarPessoaDto,
  >(data: TData) {
    const { photo, ...rest } = data as any;
    const normalized = uppercaseFields(rest, [
      'name',
      'stateRegistration',
      'identityNumber',
      'city',
      'state',
      'address',
    ]);
    return { ...normalized, photo };
  }
}
