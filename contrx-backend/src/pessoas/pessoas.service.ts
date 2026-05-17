import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

import { CriarPessoaDto } from './dto/criar-pessoa.dto';
import { AtualizarPessoaDto } from './dto/atualizar-pessoa.dto';

@Injectable()
export class PessoasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CriarPessoaDto, companyId: string) {
    await this.ensureDocumentIsAvailable(data.document, companyId);

    return this.prisma.person.create({
      data: {
        companyId,
        type: data.type,
        name: data.name,
        document: data.document,
        stateRegistration: data.stateRegistration,
        identityNumber: data.identityNumber,
        email: data.email,
        phone: data.phone,
        isTenant: data.isTenant ?? true,
        zipCode: data.zipCode,
        city: data.city,
        state: data.state,
        address: data.address,
        status: data.status ?? 'ACTIVE',
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
    await this.findOne(id, companyId);

    if (data.document) {
      await this.ensureDocumentIsAvailable(data.document, companyId, id);
    }

    return this.prisma.person.update({
      where: {
        id,
      },
      data: {
        ...data,
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
}
