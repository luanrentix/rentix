import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';
import type { CashOperationDto } from './caixa.controller';

export const cashMethod = (value: string): string =>
  ({
    DINHEIRO: 'CASH',
    CARTAO_CREDITO: 'CREDIT_CARD',
    CARTAO_DEBITO: 'DEBIT_CARD',
    Cash: 'CASH',
    Pix: 'PIX',
    CreditCard: 'CREDIT_CARD',
    DebitCard: 'DEBIT_CARD',
    BankTransfer: 'BANK_TRANSFER',
    BankSlip: 'BANK_SLIP',
  })[value] || value;

@Injectable()
export class CaixaService {
  constructor(private readonly prisma: PrismaService) {}

  async prepareAccount(companyId: string) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM empresas WHERE id = ${companyId} FOR UPDATE`;
      const existing = await tx.bankAccount.findFirst({
        where: { companyId, type: 'CASH', active: true, deletedAt: null },
        orderBy: { createdAt: 'asc' },
      });
      return (
        existing ??
        tx.bankAccount.create({
          data: { companyId, name: 'CAIXA LOJA', type: 'CASH' },
        })
      );
    });
  }

  async list(companyId: string, start?: string, end?: string) {
    const parse = (value: string | undefined) => {
      if (
        !value ||
        !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) ||
        !Number.isFinite(Date.parse(value))
      )
        throw new BadRequestException('Informe o período com fuso horário.');
      return new Date(value);
    };
    const from = parse(start),
      to = parse(end);
    if (from > to || to.getTime() - from.getTime() > 366 * 86400000)
      throw new BadRequestException('Selecione um período de até 366 dias.');
    return this.prisma.$transaction(
      (tx) => this.read(tx, companyId, from, to),
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        timeout: 30000,
      },
    );
  }

  private async read(
    tx: Prisma.TransactionClient,
    companyId: string,
    from: Date,
    to: Date,
  ) {
    const accounts = await tx.bankAccount.findMany({
      where: { companyId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
    // Read source records in one snapshot: receipts and reversals must never be counted twice.
    const records = await tx.bankTransaction.findMany({
      where: {
        bankAccount: { companyId },
        status: 'CONFIRMED',
        OR: [
          { bankAccount: { type: 'CASH' } },
          { paymentDate: { gte: from, lte: to } },
          { paymentDate: null, competenceDate: { gte: from, lte: to } },
        ],
      },
      include: { bankAccount: { select: { name: true, type: true } } },
      orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
    });
    const reversalIds = records
      .filter((r) => r.referenceType === 'SALES_REVERSAL')
      .map((r) => r.referenceId!)
      .filter(Boolean);
    const originals = reversalIds.length
      ? await tx.bankTransaction.findMany({
          where: { id: { in: reversalIds }, bankAccount: { companyId } },
        })
      : [];
    const sources = [...records, ...originals];
    const chargeIds = sources
      .filter((r) => r.referenceType === 'RECEIVABLE')
      .map((r) => r.referenceId!)
      .filter(Boolean);
    const returnIds = sources
      .filter((r) => r.referenceType === 'SALES_RETURN')
      .map((r) => r.referenceId!)
      .filter(Boolean);
    const charges = chargeIds.length
      ? await tx.contaReceber.findMany({
          where: { companyId, id: { in: chargeIds } },
          include: {
            payments: true,
            salesOrder: { select: { number: true, customerName: true } },
          },
        })
      : [];
    const returns = returnIds.length
      ? await tx.salesOrder.findMany({
          where: { companyId, id: { in: returnIds } },
          select: {
            id: true,
            number: true,
            paymentMethod: true,
            customerName: true,
          },
        })
      : [];
    const audits = await tx.commercialHistory.findMany({
      where: {
        companyId,
        action: { in: ['CASH_OPERATION', 'SALES_CASH_RECEIPT'] },
      },
    });
    const receiptBanks = chargeIds.length
      ? await tx.bankTransaction.findMany({
          where: {
            bankAccount: { companyId },
            referenceType: 'RECEIVABLE',
            referenceId: { in: chargeIds },
            status: 'CONFIRMED',
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        })
      : [];
    const matchedPayments = new Map<
      string,
      (typeof charges)[number]['payments'][number]
    >();
    for (const charge of charges) {
      const unused = [...charge.payments].sort(
        (a, b) =>
          a.createdAt.getTime() - b.createdAt.getTime() ||
          a.id.localeCompare(b.id),
      );
      for (const bank of receiptBanks.filter(
        (b) => b.referenceId === charge.id,
      )) {
        const index = unused.findIndex(
          (p) =>
            p.paidAt.getTime() ===
              (bank.paymentDate ?? bank.competenceDate).getTime() &&
            p.amountPaid.eq(bank.amount),
        );
        if (index >= 0)
          matchedPayments.set(bank.id, unused.splice(index, 1)[0]);
      }
    }
    const allMovements = records.flatMap((record) => {
      const source =
        record.referenceType === 'SALES_REVERSAL'
          ? originals.find((o) => o.id === record.referenceId)
          : record;
      const charge = charges.find(
        (c) =>
          c.id === source?.referenceId &&
          source?.referenceType === 'RECEIVABLE',
      );
      const returned = returns.find(
        (r) =>
          r.id === source?.referenceId &&
          source?.referenceType === 'SALES_RETURN',
      );
      if (
        !charge?.salesOrderId &&
        !returned &&
        !record.referenceType?.startsWith('CASH_OPERATION') &&
        record.bankAccount.type !== 'CASH'
      )
        return [];
      const audit = audits.find(
        (a) => (a.metadata as any)?.transactionId === record.id,
      );
      const receiptAudit = audits.find(
        (a) =>
          a.action === 'SALES_CASH_RECEIPT' &&
          (a.metadata as any)?.transactionId === source?.id,
      )?.metadata as { method?: string; paymentItems?: unknown } | undefined;
      const payment = source ? matchedPayments.get(source.id) : undefined;
      const taggedMethod = charge?.salesOrderId
        ? source?.description.split(' · ')[1]
        : undefined;
      let parts = [
        {
          method: taggedMethod
            ? cashMethod(taggedMethod)
            : returned
              ? cashMethod(returned.paymentMethod)
              : receiptAudit?.method ||
                payment?.method ||
                (record.bankAccount.type === 'CASH' ? 'CASH' : 'OTHER'),
          amount: Number(record.amount),
        },
      ];
      const paymentItems = receiptAudit?.paymentItems ?? payment?.paymentItems;
      if (Array.isArray(paymentItems) && paymentItems.length) {
        const items = paymentItems as { method: string; amount: number }[];
        if (
          items.every(
            (i) =>
              i &&
              typeof i === 'object' &&
              typeof i.method === 'string' &&
              Number.isFinite(Number(i.amount)) &&
              Number(i.amount) > 0,
          ) &&
          Math.abs(
            items.reduce((s, i) => s + Number(i.amount), 0) -
              Number(record.amount),
          ) < 0.005
        )
          parts = items.map((i) => ({
            method: cashMethod(i.method),
            amount: Number(i.amount),
          }));
      }
      return parts.map((part, index) => ({
        id: `${record.id}:${index}`,
        date: (record.paymentDate ?? record.competenceDate).toISOString(),
        direction: record.type === 'INFLOW' ? 'IN' : 'OUT',
        amount: part.amount,
        method: part.method,
        kind:
          record.referenceType === 'SALES_REVERSAL'
            ? 'ESTORNO'
            : returned
              ? 'DEVOLUÇÃO'
              : charge?.salesOrderId
                ? 'VENDA / RECEBIMENTO'
                : record.referenceType === 'CASH_OPERATION'
                  ? record.type === 'INFLOW'
                    ? 'SUPRIMENTO'
                    : 'SANGRIA'
                  : 'OUTRA OPERAÇÃO',
        description: record.description,
        accountId: record.bankAccountId,
        accountName: record.bankAccount.name,
        orderNumber: charge?.salesOrder?.number ?? returned?.number ?? null,
        customer:
          charge?.salesOrder?.customerName ?? returned?.customerName ?? null,
        operator: (audit?.metadata as any)?.operatorName || null,
      }));
    });
    const movements = allMovements.filter(
      (m) => new Date(m.date) >= from && new Date(m.date) <= to,
    );
    const methods: Record<
      string,
      { incoming: number; outgoing: number; net: number }
    > = {};
    for (const movement of movements) {
      const totals = (methods[movement.method] ??= {
        incoming: 0,
        outgoing: 0,
        net: 0,
      });
      totals[movement.direction === 'IN' ? 'incoming' : 'outgoing'] +=
        Math.round(movement.amount * 100);
    }
    for (const total of Object.values(methods)) {
      total.incoming /= 100;
      total.outgoing /= 100;
      total.net = total.incoming - total.outgoing;
    }
    return {
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        active: a.active,
        balance: Number(a.currentBalance),
        cashBalance:
          a.type === 'CASH'
            ? (Math.round(Number(a.initialBalance) * 100) +
                allMovements
                  .filter((m) => m.accountId === a.id && m.method === 'CASH')
                  .reduce(
                    (sum, m) =>
                      sum +
                      (m.direction === 'IN' ? 1 : -1) *
                        Math.round(m.amount * 100),
                    0,
                  )) /
              100
            : null,
      })),
      movements,
      methods,
    };
  }

  async create(user: UsuarioAutenticado, body: CashOperationDto) {
    if (body.reason.trim().length < 3)
      throw new BadRequestException('Informe o motivo da operação.');
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM empresas WHERE id = ${user.companyId} FOR UPDATE`;
        const previous = await tx.commercialHistory.findFirst({
          where: {
            companyId: user.companyId,
            action: 'CASH_OPERATION',
            metadata: { path: ['requestId'], equals: body.requestId },
          },
        });
        if (previous) {
          const old = previous.metadata as any;
          if (
            old.amount !== body.amount ||
            old.direction !== body.direction ||
            old.reason !== body.reason.trim() ||
            old.requestedAccountId !== (body.accountId || null)
          )
            throw new BadRequestException(
              'Esta operação já foi utilizada com outros dados.',
            );
          return { id: old.transactionId };
        }
        let account = await tx.bankAccount.findFirst({
          where: {
            companyId: user.companyId,
            type: 'CASH',
            active: true,
            deletedAt: null,
            ...(body.accountId ? { id: body.accountId } : {}),
          },
          orderBy: { createdAt: 'asc' },
        });
        if (!account && body.accountId)
          throw new BadRequestException(
            'Selecione um caixa em dinheiro ativo da empresa.',
          );
        if (!account)
          account = await tx.bankAccount.create({
            data: {
              companyId: user.companyId,
              name: 'CAIXA LOJA',
              type: 'CASH',
            },
          });
        if (body.direction === 'OUT') {
          const summary = await this.read(
            tx,
            user.companyId,
            new Date(),
            new Date(),
          );
          const physical =
            summary.accounts.find((a) => a.id === account.id)?.cashBalance ?? 0;
          if (Math.round(physical * 100) < Math.round(body.amount * 100))
            throw new BadRequestException(
              'Saldo em dinheiro insuficiente para a retirada.',
            );
        }
        const amount = new Prisma.Decimal(body.amount);
        // The company lock serializes cash operations and sales. Physical cash is checked independently of electronic funds.
        const updated = await tx.bankAccount.updateMany({
          where: {
            id: account.id,
            companyId: user.companyId,
            active: true,
            deletedAt: null,
          },
          data: {
            currentBalance:
              body.direction === 'IN'
                ? { increment: amount }
                : { decrement: amount },
          },
        });
        if (!updated.count)
          throw new BadRequestException(
            'Saldo insuficiente para a retirada. Atualize o caixa.',
          );
        const now = new Date();
        const transaction = await tx.bankTransaction.create({
          data: {
            bankAccountId: account.id,
            type: body.direction === 'IN' ? 'INFLOW' : 'OUTFLOW',
            status: 'CONFIRMED',
            amount,
            description: body.reason.trim(),
            competenceDate: now,
            paymentDate: now,
            category: 'OPERAÇÃO DE CAIXA',
            referenceType: 'CASH_OPERATION',
            referenceId: body.requestId,
          },
        });
        await tx.commercialHistory.create({
          data: {
            companyId: user.companyId,
            userId: user.id,
            action: 'CASH_OPERATION',
            description: `${body.direction === 'IN' ? 'SUPRIMENTO' : 'SANGRIA'}: ${body.reason.trim()}`,
            metadata: {
              requestId: body.requestId,
              transactionId: transaction.id,
              amount: body.amount,
              direction: body.direction,
              reason: body.reason.trim(),
              requestedAccountId: body.accountId || null,
              operatorName: user.name,
              accountId: account.id,
            },
          },
        });
        return { id: transaction.id };
      },
      { timeout: 15000 },
    );
  }
}
