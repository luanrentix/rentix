import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FinancialAccountStatus, Prisma } from '@prisma/client';
import { toUpperText, uppercaseFields } from '../common/text-normalization';
import { PrismaService } from '../prisma/prisma.service';
import { CriarContaPagarDto, PagarContaDto } from './dto/criar-conta-pagar.dto';
import { AtualizarContaPagarDto } from './dto/atualizar-conta-pagar.dto';

type CriarContaPagarDataWithCompany = CriarContaPagarDto & {
  companyId: string;
};

type AtualizarContaPagarDataWithCompany = AtualizarContaPagarDto & {
  companyId: string;
};

@Injectable()
export class ContasPagarService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CriarContaPagarDto, companyId: string) {
    await this.validateCompany(companyId);
    await this.validatePerson(companyId, data.personId);
    await this.validateProperty(companyId, data.propertyId);

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
    await this.validateProperty(companyId, data.propertyId);

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
    if (data.amountPaid <= 0) {
      throw new BadRequestException('O valor pago deve ser maior que zero.');
    }

    if ((data.interest || 0) < 0 || (data.discount || 0) < 0) {
      throw new BadRequestException(
        'Juros e desconto nao podem ser negativos.',
      );
    }

    const account = await this.ensureExists(id, companyId);

    return this.prisma.$transaction(async (tx) => {
      const currentPaymentSummary = await tx.pagamentoRealizado.aggregate({
        where: { expenseId: id },
        _sum: { amountPaid: true, discount: true, interest: true },
      });
      const currentSettlementAmount = this.getSettlementAmount(
        currentPaymentSummary._sum.amountPaid,
        currentPaymentSummary._sum.discount,
        currentPaymentSummary._sum.interest,
      );

      if (currentSettlementAmount >= Number(account.amount)) {
        throw new BadRequestException('Esta conta a pagar ja esta quitada.');
      }

      const nextSettlementAmount =
        currentSettlementAmount +
        this.getSettlementAmount(
          data.amountPaid,
          data.discount || 0,
          data.interest || 0,
        );

      if (nextSettlementAmount - Number(account.amount) > 0.01) {
        throw new BadRequestException('O valor pago excede o saldo da conta.');
      }

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
          note: data.note ? toUpperText(data.note) : null,
        },
      });

      return tx.contaPagar.update({
        where: { id },
        data: {
          status: this.getStatusAfterPayment(
            Number(account.amount),
            nextSettlementAmount,
          ),
        },
        include: this.defaultInclude,
      });
    });
  }

  async replacePayment(id: string, data: PagarContaDto, companyId: string) {
    if (data.amountPaid <= 0) {
      throw new BadRequestException('O valor pago deve ser maior que zero.');
    }

    if ((data.interest || 0) < 0 || (data.discount || 0) < 0) {
      throw new BadRequestException(
        'Juros e desconto nao podem ser negativos.',
      );
    }

    const account = await this.ensureExists(id, companyId);
    const settlementAmount = this.getSettlementAmount(
      data.amountPaid,
      data.discount || 0,
      data.interest || 0,
    );

    if (settlementAmount - Number(account.amount) > 0.01) {
      throw new BadRequestException('O valor pago excede o saldo da conta.');
    }

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
          note: data.note ? toUpperText(data.note) : null,
        },
      });

      return tx.contaPagar.update({
        where: { id },
        data: {
          status: this.getStatusAfterPayment(
            Number(account.amount),
            settlementAmount,
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
      property: true,
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

  private async validateProperty(
    companyId: string,
    propertyId?: string | null,
  ) {
    if (!propertyId) return;

    const property = await this.prisma.property.findFirst({
      where: {
        id: propertyId,
        companyId,
      },
      select: {
        id: true,
      },
    });

    if (!property) {
      throw new BadRequestException('Imovel nao encontrado para esta empresa.');
    }
  }

  private buildCreateData(
    data: CriarContaPagarDataWithCompany,
  ): Prisma.ContaPagarCreateInput {
    const normalizedData = this.normalizeAccountData(data);

    return {
      company: { connect: { id: normalizedData.companyId } },
      person: normalizedData.personId
        ? { connect: { id: normalizedData.personId } }
        : undefined,
      property: normalizedData.propertyId
        ? { connect: { id: normalizedData.propertyId } }
        : undefined,
      personName: normalizedData.personName || null,
      description: normalizedData.description,
      category: normalizedData.category || null,
      note: normalizedData.note || null,
      amount: new Prisma.Decimal(normalizedData.amount),
      issueDate: this.parseOptionalDate(normalizedData.issueDate),
      dueDate: this.parseDate(
        normalizedData.dueDate,
        'Data de vencimento invalida.',
      ),
      status: normalizedData.status ?? FinancialAccountStatus.PENDING,
      manual: normalizedData.manual ?? true,
      installmentNumber: normalizedData.installmentNumber ?? null,
      installmentTotal: normalizedData.installmentTotal ?? null,
      installmentGroupId: normalizedData.installmentGroupId || null,
    };
  }

  private buildUpdateData(
    data: AtualizarContaPagarDataWithCompany,
  ): Prisma.ContaPagarUpdateInput {
    const normalizedData = this.normalizeAccountData(data);

    return {
      company: normalizedData.companyId
        ? { connect: { id: normalizedData.companyId } }
        : undefined,
      person:
        normalizedData.personId !== undefined
          ? normalizedData.personId
            ? { connect: { id: normalizedData.personId } }
            : { disconnect: true }
          : undefined,
      property:
        normalizedData.propertyId !== undefined
          ? normalizedData.propertyId
            ? { connect: { id: normalizedData.propertyId } }
            : { disconnect: true }
          : undefined,
      personName:
        normalizedData.personName !== undefined
          ? normalizedData.personName || null
          : undefined,
      description: normalizedData.description,
      category:
        normalizedData.category !== undefined
          ? normalizedData.category || null
          : undefined,
      note:
        normalizedData.note !== undefined
          ? normalizedData.note || null
          : undefined,
      amount:
        normalizedData.amount !== undefined
          ? new Prisma.Decimal(normalizedData.amount)
          : undefined,
      issueDate:
        normalizedData.issueDate !== undefined
          ? this.parseOptionalDate(normalizedData.issueDate)
          : undefined,
      dueDate:
        normalizedData.dueDate !== undefined
          ? this.parseDate(
              normalizedData.dueDate,
              'Data de vencimento invalida.',
            )
          : undefined,
      status: normalizedData.status,
      manual: normalizedData.manual,
      installmentNumber: normalizedData.installmentNumber,
      installmentTotal: normalizedData.installmentTotal,
      installmentGroupId:
        normalizedData.installmentGroupId !== undefined
          ? normalizedData.installmentGroupId || null
          : undefined,
    };
  }

  private normalizeAccountData<
    TData extends
      | CriarContaPagarDataWithCompany
      | AtualizarContaPagarDataWithCompany,
  >(data: TData) {
    return uppercaseFields(data, [
      'personName',
      'description',
      'category',
      'note',
    ]);
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

  private getSettlementAmount(
    amountPaid: unknown,
    discount: unknown,
    interest: unknown,
  ) {
    return (
      Number(amountPaid || 0) + Number(discount || 0) - Number(interest || 0)
    );
  }
}
