import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FinancialAccountStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CriarContaPagarDto, PagarContaDto } from './dto/criar-conta-pagar.dto';
import { AtualizarContaPagarDto } from './dto/atualizar-conta-pagar.dto';

@Injectable()
export class ContasPagarService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CriarContaPagarDto, companyId: string) {
    await this.validateCompany(companyId);
    await this.validatePerson(companyId, data.personId);

    return this.prisma.contaPagar.create({
      data: this.buildCreateData({
        ...data,
        companyId,
      }),
      include: this.defaultInclude,
    });
  }

  async findAll(companyId?: string) {
    if (!companyId) {
      throw new BadRequestException('O companyId e obrigatorio.');
    }

    return this.prisma.contaPagar.findMany({
      where: { companyId },
      orderBy: { dueDate: 'asc' },
      include: this.defaultInclude,
    });
  }

  async findOne(id: string, companyId: string) {
    const account = await this.prisma.contaPagar.findFirst({
      where: { id, companyId },
      include: this.defaultInclude,
    });

    if (!account) {
      throw new NotFoundException('Conta a pagar nao encontrada.');
    }

    return account;
  }

  async update(id: string, data: AtualizarContaPagarDto, companyId: string) {
    await this.ensureExists(id, companyId);

    await this.validateCompany(companyId);
    await this.validatePerson(companyId, data.personId);

    return this.prisma.contaPagar.update({
      where: { id },
      data: this.buildUpdateData({
        ...data,
        companyId,
      }),
      include: this.defaultInclude,
    });
  }

  async remove(id: string, companyId: string) {
    await this.ensureExists(id, companyId);

    await this.prisma.pagamentoRealizado.deleteMany({
      where: { expenseId: id },
    });

    return this.prisma.contaPagar.delete({
      where: { id },
    });
  }

  async pay(id: string, data: PagarContaDto, companyId: string) {
    const account = await this.ensureExists(id, companyId);

    return this.prisma.$transaction(async (tx) => {
      await tx.pagamentoRealizado.deleteMany({
        where: { expenseId: id },
      });

      await tx.pagamentoRealizado.create({
        data: {
          expense: { connect: { id } },
          paidAt: this.parseDate(data.paidAt, 'Data de pagamento invalida.'),
          method: data.method,
          paymentItems:
            data.paymentItems === undefined
              ? Prisma.JsonNull
              : data.paymentItems,
          interest: new Prisma.Decimal(data.interest || 0),
          discount: new Prisma.Decimal(data.discount || 0),
          amountPaid: new Prisma.Decimal(data.amountPaid),
          note: data.note || null,
        },
      });

      return tx.contaPagar.update({
        where: { id },
        data: {
          status: this.getStatusAfterPayment(
            Number(account.amount),
            data.amountPaid,
          ),
        },
        include: this.defaultInclude,
      });
    });
  }

  async reversePayment(id: string, companyId: string) {
    await this.ensureExists(id, companyId);

    return this.prisma.$transaction(async (tx) => {
      await tx.pagamentoRealizado.deleteMany({
        where: { expenseId: id },
      });

      return tx.contaPagar.update({
        where: { id },
        data: { status: FinancialAccountStatus.PENDING },
        include: this.defaultInclude,
      });
    });
  }

  private get defaultInclude() {
    return {
      payments: true,
      person: true,
    };
  }

  private async ensureExists(id: string, companyId: string) {
    const account = await this.prisma.contaPagar.findFirst({
      where: { id, companyId },
      select: { id: true, amount: true },
    });

    if (!account) {
      throw new NotFoundException('Conta a pagar nao encontrada.');
    }

    return account;
  }

  private async validateCompany(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) {
      throw new BadRequestException('Empresa nao encontrada.');
    }
  }

  private async validatePerson(companyId: string, personId?: string | null) {
    if (!personId) return;

    const person = await this.prisma.person.findFirst({
      where: {
        id: personId,
        companyId,
      },
      select: {
        id: true,
      },
    });

    if (!person) {
      throw new BadRequestException('Pessoa nao encontrada para esta empresa.');
    }
  }

  private buildCreateData(
    data: CriarContaPagarDto,
  ): Prisma.ContaPagarCreateInput {
    return {
      company: { connect: { id: data.companyId } },
      person: data.personId ? { connect: { id: data.personId } } : undefined,
      personName: data.personName || null,
      description: data.description,
      category: data.category || null,
      note: data.note || null,
      amount: new Prisma.Decimal(data.amount),
      issueDate: this.parseOptionalDate(data.issueDate),
      dueDate: this.parseDate(data.dueDate, 'Data de vencimento invalida.'),
      status: data.status ?? FinancialAccountStatus.PENDING,
      manual: data.manual ?? true,
      installmentNumber: data.installmentNumber ?? null,
      installmentTotal: data.installmentTotal ?? null,
      installmentGroupId: data.installmentGroupId || null,
    };
  }

  private buildUpdateData(
    data: AtualizarContaPagarDto,
  ): Prisma.ContaPagarUpdateInput {
    return {
      company: data.companyId ? { connect: { id: data.companyId } } : undefined,
      person:
        data.personId !== undefined
          ? data.personId
            ? { connect: { id: data.personId } }
            : { disconnect: true }
          : undefined,
      personName:
        data.personName !== undefined ? data.personName || null : undefined,
      description: data.description,
      category: data.category !== undefined ? data.category || null : undefined,
      note: data.note !== undefined ? data.note || null : undefined,
      amount:
        data.amount !== undefined ? new Prisma.Decimal(data.amount) : undefined,
      issueDate:
        data.issueDate !== undefined
          ? this.parseOptionalDate(data.issueDate)
          : undefined,
      dueDate:
        data.dueDate !== undefined
          ? this.parseDate(data.dueDate, 'Data de vencimento invalida.')
          : undefined,
      status: data.status,
      manual: data.manual,
      installmentNumber: data.installmentNumber,
      installmentTotal: data.installmentTotal,
      installmentGroupId:
        data.installmentGroupId !== undefined
          ? data.installmentGroupId || null
          : undefined,
    };
  }

  private parseDate(value: string, errorMessage: string) {
    const parsedDate = value.includes('T')
      ? new Date(value)
      : new Date(`${value}T00:00:00`);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException(errorMessage);
    }

    return parsedDate;
  }

  private parseOptionalDate(value?: string | null) {
    if (!value) return null;

    return this.parseDate(value, 'Data invalida.');
  }

  private getStatusAfterPayment(accountAmount: number, amountPaid: number) {
    return amountPaid >= accountAmount
      ? FinancialAccountStatus.PAID
      : FinancialAccountStatus.PENDING;
  }
}
