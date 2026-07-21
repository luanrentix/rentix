import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CriarContaBancariaDto } from './dto/criar-conta-bancaria.dto';
import { CriarMovimentacaoDto } from './dto/criar-movimentacao.dto';
import { TransferenciaSaldoDto } from './dto/transferencia-saldo.dto';
import { CompartilharExtratoDto } from './dto/compartilhar-extrato.dto';
import {
  BankTransactionType,
  BankTransactionStatus,
  Prisma,
} from '@prisma/client';

@Injectable()
export class BancosService {
  constructor(private readonly prisma: PrismaService) {}

  async createAccount(dto: CriarContaBancariaDto, companyId: string) {
    const initialBalance = dto.initialBalance ?? 0;
    const limit = dto.limit ?? 0;
    return this.prisma.bankAccount.create({
      data: {
        companyId,
        name: dto.name.toUpperCase(),
        type: dto.type,
        agency: dto.agency ? dto.agency.toUpperCase() : null,
        accountNumber: dto.accountNumber
          ? dto.accountNumber.toUpperCase()
          : null,
        bankCode: dto.bankCode,
        bankName: dto.bankName ? dto.bankName.toUpperCase() : null,
        initialBalance,
        currentBalance: initialBalance,
        limit,
        currency: dto.currency ? dto.currency.toUpperCase() : 'BRL',
      },
    });
  }

  async findAllAccounts(companyId: string) {
    return this.prisma.bankAccount.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async findOneAccount(id: string, companyId: string) {
    const account = await this.prisma.bankAccount.findFirst({
      where: { id, companyId, deletedAt: null },
    });
    if (!account) {
      throw new NotFoundException('Conta bancária não encontrada.');
    }
    return account;
  }

  async updateAccount(
    id: string,
    dto: Partial<CriarContaBancariaDto & { active?: boolean }>,
    companyId: string,
  ) {
    const account = await this.findOneAccount(id, companyId);

    if (dto.active === false && Number(account.currentBalance) !== 0) {
      throw new BadRequestException(
        'A conta só pode ser inativada caso o saldo esteja zerado.',
      );
    }

    return this.prisma.bankAccount.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.toUpperCase() : undefined,
        type: dto.type,
        agency:
          dto.agency !== undefined
            ? dto.agency
              ? dto.agency.toUpperCase()
              : null
            : undefined,
        accountNumber:
          dto.accountNumber !== undefined
            ? dto.accountNumber
              ? dto.accountNumber.toUpperCase()
              : null
            : undefined,
        limit: dto.limit,
        currency: dto.currency ? dto.currency.toUpperCase() : undefined,
        bankCode: dto.bankCode,
        bankName:
          dto.bankName !== undefined
            ? dto.bankName
              ? dto.bankName.toUpperCase()
              : null
            : undefined,
        active: dto.active,
      },
    });
  }

  async removeAccount(id: string, companyId: string) {
    const account = await this.findOneAccount(id, companyId);

    const transactionsCount = await this.prisma.bankTransaction.count({
      where: { bankAccountId: id },
    });

    if (transactionsCount > 0) {
      throw new BadRequestException(
        'Não é possível excluir uma conta que possui movimentações registradas. Você pode desativá-la caso o saldo esteja zerado.',
      );
    }

    if (Number(account.currentBalance) !== 0) {
      throw new BadRequestException(
        'Não é possível excluir uma conta com saldo diferente de zero.',
      );
    }

    return this.prisma.bankAccount.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async createTransaction(
    bankAccountId: string,
    dto: CriarMovimentacaoDto,
    companyId: string,
  ) {
    const account = await this.findOneAccount(bankAccountId, companyId);

    if (!account.active) {
      throw new BadRequestException(
        'Não é possível realizar lançamentos em uma conta inativa.',
      );
    }

    const amount = Math.abs(dto.amount);

    // Status resolution
    let status = dto.status;
    if (!status) {
      status = dto.paymentDate
        ? BankTransactionStatus.CONFIRMED
        : BankTransactionStatus.PENDING;
    }

    const currentBalance = Number(account.currentBalance);
    const limit = Number(account.limit);

    // Validate credit limit if confirmed outflow
    if (
      status === BankTransactionStatus.CONFIRMED &&
      dto.type === BankTransactionType.OUTFLOW
    ) {
      if (currentBalance - amount < -limit) {
        throw new BadRequestException(
          'Saldo insuficiente (limite de crédito excedido).',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.bankTransaction.create({
        data: {
          bankAccountId,
          type: dto.type,
          status,
          amount,
          description: dto.description,
          competenceDate: new Date(dto.competenceDate),
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : null,
          category: dto.category,
          referenceType: 'MANUAL',
        },
      });

      // Update balance if confirmed
      if (status === BankTransactionStatus.CONFIRMED) {
        const balanceDiff =
          dto.type === BankTransactionType.INFLOW ? amount : -amount;
        await tx.bankAccount.update({
          where: { id: bankAccountId },
          data: {
            currentBalance: {
              increment: balanceDiff,
            },
          },
        });
      }

      return transaction;
    });
  }

  async reconcileTransaction(
    id: string,
    paymentDateStr: string,
    companyId: string,
  ) {
    const transaction = await this.prisma.bankTransaction.findFirst({
      where: {
        id,
        bankAccount: { companyId, deletedAt: null },
      },
      include: { bankAccount: true },
    });

    if (!transaction) {
      throw new NotFoundException('Movimentação não encontrada.');
    }

    if (!transaction.bankAccount.active) {
      throw new BadRequestException(
        'Não é possível conciliar movimentações em uma conta inativa.',
      );
    }

    if (transaction.status === BankTransactionStatus.CONFIRMED) {
      throw new BadRequestException(
        'Esta movimentação já está conciliada/confirmada.',
      );
    }

    const amount = Number(transaction.amount);
    const currentBalance = Number(transaction.bankAccount.currentBalance);
    const limit = Number(transaction.bankAccount.limit);

    if (
      transaction.type === BankTransactionType.OUTFLOW &&
      currentBalance - amount < -limit
    ) {
      throw new BadRequestException(
        'Saldo insuficiente para conciliar esta saída (limite excedido).',
      );
    }

    const paymentDate = new Date(paymentDateStr || new Date());

    return this.prisma.$transaction(async (tx) => {
      await tx.bankTransaction.update({
        where: { id },
        data: {
          status: BankTransactionStatus.CONFIRMED,
          paymentDate,
        },
      });

      const balanceDiff =
        transaction.type === BankTransactionType.INFLOW ? amount : -amount;
      await tx.bankAccount.update({
        where: { id: transaction.bankAccountId },
        data: {
          currentBalance: {
            increment: balanceDiff,
          },
        },
      });
    });
  }

  async findAllTransactions(
    companyId: string,
    bankAccountId?: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      type?: string;
      status?: string;
      category?: string;
      description?: string;
      skip?: number;
      take?: number;
    },
  ) {
    const where: Prisma.BankTransactionWhereInput = {
      bankAccount: {
        companyId,
        deletedAt: null,
      },
    };

    if (bankAccountId) {
      where.bankAccountId = bankAccountId;
    }

    if (
      filters?.type &&
      Object.values(BankTransactionType).includes(
        filters.type as BankTransactionType,
      )
    ) {
      where.type = filters.type as BankTransactionType;
    }

    if (
      filters?.status &&
      Object.values(BankTransactionStatus).includes(
        filters.status as BankTransactionStatus,
      )
    ) {
      where.status = filters.status as BankTransactionStatus;
    }

    if (filters?.category) {
      where.category = {
        equals: filters.category,
        mode: 'insensitive',
      };
    }

    if (filters?.description) {
      where.description = {
        contains: filters.description,
        mode: 'insensitive',
      };
    }

    if (filters?.startDate || filters?.endDate) {
      where.competenceDate = {};
      if (filters.startDate) {
        where.competenceDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.competenceDate.lte = end;
      }
    }

    return this.prisma.bankTransaction.findMany({
      where,
      orderBy: { competenceDate: 'desc' },
      skip: filters?.skip ? Number(filters.skip) : undefined,
      take: filters?.take ? Number(filters.take) : undefined,
      include: {
        bankAccount: {
          select: { name: true, type: true, currency: true, active: true },
        },
      },
    });
  }

  async deleteTransaction(id: string, companyId: string) {
    const transaction = await this.prisma.bankTransaction.findFirst({
      where: {
        id,
        bankAccount: {
          companyId,
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Movimentação não encontrada.');
    }

    const amount = Number(transaction.amount);

    return this.prisma.$transaction(async (tx) => {
      // Revert balance change only if transaction was confirmed
      if (transaction.status === BankTransactionStatus.CONFIRMED) {
        const balanceDiff =
          transaction.type === BankTransactionType.INFLOW ? -amount : amount;

        await tx.bankAccount.update({
          where: { id: transaction.bankAccountId },
          data: {
            currentBalance: {
              increment: balanceDiff,
            },
          },
        });
      }

      return tx.bankTransaction.delete({
        where: { id },
      });
    });
  }

  async transfer(dto: TransferenciaSaldoDto, companyId: string) {
    const origin = await this.findOneAccount(
      dto.originBankAccountId,
      companyId,
    );
    const destination = await this.findOneAccount(
      dto.destinationBankAccountId,
      companyId,
    );

    if (!origin.active || !destination.active) {
      throw new BadRequestException(
        'Ambas as contas de origem e destino devem estar ativas para realizar transferências.',
      );
    }

    if (origin.id === destination.id) {
      throw new BadRequestException(
        'As contas de origem e destino devem ser diferentes.',
      );
    }

    const amount = Math.abs(dto.amount);
    if (amount <= 0) {
      throw new BadRequestException(
        'O valor de transferência deve ser maior do que zero.',
      );
    }

    const fee = Math.abs(dto.fee ?? 0);
    const totalDebit = amount + fee;
    const date = new Date(dto.date);

    const originBalance = Number(origin.currentBalance);
    const originLimit = Number(origin.limit);

    if (originBalance - totalDebit < -originLimit) {
      throw new BadRequestException(
        'Saldo insuficiente na conta de origem para realizar a transferência e pagar as taxas.',
      );
    }

    const transferGroupId = `transfer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return this.prisma.$transaction(async (tx) => {
      // 1. Debit origin account
      await tx.bankAccount.update({
        where: { id: origin.id },
        data: {
          currentBalance: {
            decrement: totalDebit,
          },
        },
      });

      const outflowTx = await tx.bankTransaction.create({
        data: {
          bankAccountId: origin.id,
          type: BankTransactionType.OUTFLOW,
          status: BankTransactionStatus.CONFIRMED,
          amount,
          fee,
          description: `${dto.description} (Para: ${destination.name})`,
          competenceDate: date,
          paymentDate: date,
          category: 'Transferência',
          referenceType: 'TRANSFER',
          referenceId: destination.id,
          transferGroupId,
        },
      });

      // 2. Credit destination account
      await tx.bankAccount.update({
        where: { id: destination.id },
        data: {
          currentBalance: {
            increment: amount,
          },
        },
      });

      const inflowTx = await tx.bankTransaction.create({
        data: {
          bankAccountId: destination.id,
          type: BankTransactionType.INFLOW,
          status: BankTransactionStatus.CONFIRMED,
          amount,
          fee: 0,
          description: `${dto.description} (De: ${origin.name})`,
          competenceDate: date,
          paymentDate: date,
          category: 'Transferência',
          referenceType: 'TRANSFER',
          referenceId: origin.id,
          transferGroupId,
        },
      });

      return { outflowTx, inflowTx };
    });
  }

  async shareStatement(dto: CompartilharExtratoDto, companyId: string) {
    // Limpa extratos expirados para evitar acúmulo de lixo no banco de dados
    await this.prisma.sharedBankStatement
      .deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      })
      .catch(() => {});

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return this.prisma.sharedBankStatement.create({
      data: {
        companyId,
        bankAccountId: dto.bankAccountId || null,
        filterStartDate: dto.startDate || null,
        filterEndDate: dto.endDate || null,
        filterType: dto.type || null,
        filterStatus: dto.status || null,
        filterCategory: dto.category || null,
        filterDescription: dto.description || null,
        expiresAt,
      },
    });
  }

  async findSharedStatement(id: string) {
    // Limpa extratos expirados para manter a tabela limpa
    await this.prisma.sharedBankStatement
      .deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      })
      .catch(() => {});

    const shared = await this.prisma.sharedBankStatement.findUnique({
      where: { id },
      include: {
        company: true,
      },
    });

    if (!shared) {
      throw new NotFoundException(
        'Extrato compartilhado não encontrado ou expirado.',
      );
    }

    if (new Date() > shared.expiresAt) {
      // Remove o registro da tabela imediatamente se expirou
      await this.prisma.sharedBankStatement
        .delete({ where: { id } })
        .catch(() => {});

      throw new BadRequestException(
        'Este link de extrato compartilhado já expirou (limite de 7 dias).',
      );
    }

    const where: any = {
      bankAccount: {
        companyId: shared.companyId,
      },
    };

    if (shared.bankAccountId) {
      where.bankAccountId = shared.bankAccountId;
    }

    if (shared.filterStartDate || shared.filterEndDate) {
      where.competenceDate = {};
      if (shared.filterStartDate) {
        where.competenceDate.gte = new Date(shared.filterStartDate);
      }
      if (shared.filterEndDate) {
        where.competenceDate.lte = new Date(shared.filterEndDate);
      }
    }

    if (shared.filterType) {
      where.type = shared.filterType as any;
    }

    if (shared.filterStatus) {
      where.status = shared.filterStatus as any;
    }

    if (shared.filterCategory) {
      where.category = {
        equals: shared.filterCategory,
        mode: 'insensitive',
      };
    }

    if (shared.filterDescription) {
      where.description = {
        contains: shared.filterDescription,
        mode: 'insensitive',
      };
    }

    const [transactions, accounts] = await Promise.all([
      this.prisma.bankTransaction.findMany({
        where,
        include: {
          bankAccount: {
            select: {
              name: true,
              type: true,
              currency: true,
            },
          },
        },
        orderBy: {
          competenceDate: 'desc',
        },
      }),
      this.prisma.bankAccount.findMany({
        where: {
          companyId: shared.companyId,
          active: true,
          id: shared.bankAccountId || undefined,
        },
      }),
    ]);

    return {
      companyName: shared.company.tradeName,
      filterStartDate: shared.filterStartDate,
      filterEndDate: shared.filterEndDate,
      filterAccount: shared.bankAccountId,
      transactions,
      accounts,
    };
  }
}
