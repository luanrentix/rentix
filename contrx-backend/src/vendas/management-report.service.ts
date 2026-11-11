import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { scalarText } from '../common/text-normalization';
import { assertAccess } from '../autenticacao/access-policy';
import type { UsuarioAutenticado } from '../autenticacao/types/usuario-autenticado.type';
import { PrismaService } from '../prisma/prisma.service';
import { localDate, localMidnight } from './confections-dashboard.service';
import {
  managementReports,
  ReportRow,
  ReportTable,
} from './management-report.catalog';
import { ManagementReportQuery } from './management-report.dto';

const D = (v: Prisma.Decimal.Value = 0) => new Prisma.Decimal(v);
const money = (v: Prisma.Decimal) =>
  v.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toFixed(2);
const pct = (v: Prisma.Decimal, total: Prisma.Decimal) =>
  total.gt(0) ? money(v.div(total).mul(100)) : '0.00';
const LIMIT = 20000;
const ZONE = 'America/Manaus';
const jsonItems = (v: Prisma.JsonValue): Record<string, Prisma.JsonValue>[] =>
  Array.isArray(v)
    ? v.filter(
        (x): x is Record<string, Prisma.JsonValue> =>
          !!x && typeof x === 'object' && !Array.isArray(x),
      )
    : [];

export function abcRows(
  rows: { name: string; value: Prisma.Decimal }[],
  a: number,
  b: number,
): ReportRow[] {
  const sorted = [...rows].sort((x, y) => y.value.comparedTo(x.value));
  const total = sorted.reduce(
    (s, r) => s.add(Prisma.Decimal.max(0, r.value)),
    D(),
  );
  let accumulated = D();
  return sorted.map((r) => {
    const before = total.gt(0) ? accumulated.div(total).mul(100) : D(100);
    accumulated = accumulated.add(Prisma.Decimal.max(0, r.value));
    return [
      r.name,
      r.value.toString(),
      pct(r.value, total),
      pct(accumulated, total),
      before.lt(a) ? 'A' : before.lt(b) ? 'B' : 'C',
    ];
  });
}

@Injectable()
export class ManagementReportService {
  constructor(private readonly prisma: PrismaService) {}
  async assertRetail(companyId: string) {
    const settings = await this.prisma.appSettings.findUnique({
      where: { companyId },
    });
    if (
      (settings?.companySettings as Record<string, unknown> | null)
        ?.ramoAtividade !== 'CONFECCOES'
    )
      throw new ForbiddenException(
        'Relatórios de vendas disponíveis somente na configuração Varejo.',
      );
  }
  catalog(user: UsuarioAutenticado) {
    return managementReports
      .filter((r) => {
        try {
          assertAccess(user, r[3], 'view');
          if (r[0] === 'projected-flow')
            for (const permission of ['accountsReceivable', 'accountsPayable'])
              assertAccess(user, permission, 'view');
          return true;
        } catch {
          return false;
        }
      })
      .map(([id, title, group, permission]) => ({
        id,
        title,
        group,
        permission,
      }));
  }
  async generate(
    user: UsuarioAutenticado,
    kind: string,
    q: ManagementReportQuery,
  ) {
    const definition = managementReports.find((r) => r[0] === kind);
    await this.assertRetail(user.companyId);
    if (!definition) throw new NotFoundException('Relatório não encontrado.');
    assertAccess(user, definition[3], 'view');
    assertAccess(user, definition[3], q.action || 'view');
    if (kind === 'receipts') {
      assertAccess(user, 'accountsReceivable', 'view');
      assertAccess(user, 'accountsReceivable', q.action || 'view');
    }
    if (kind === 'payments' || kind === 'expenses-category') {
      assertAccess(user, 'accountsPayable', 'view');
      assertAccess(user, 'accountsPayable', q.action || 'view');
    }
    if (kind === 'projected-flow')
      for (const permission of ['accountsReceivable', 'accountsPayable']) {
        assertAccess(user, permission, 'view');
        assertAccess(user, permission, q.action || 'view');
      }
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(q.start) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(q.end)
    )
      throw new BadRequestException('Informe datas no formato AAAA-MM-DD.');
    const from = localMidnight(q.start, ZONE);
    const endDay = new Date(`${q.end}T12:00:00Z`);
    endDay.setUTCDate(endDay.getUTCDate() + 1);
    const to = localMidnight(endDay.toISOString().slice(0, 10), ZONE);
    if (from >= to || to.getTime() - from.getTime() > 366 * 86400000)
      throw new BadRequestException('Informe período válido de até 366 dias.');
    if ((q.abcA ?? 80) >= (q.abcB ?? 95))
      throw new BadRequestException('O limite A deve ser menor que B.');
    if (q.minimum != null && q.maximum != null && q.minimum > q.maximum)
      throw new BadRequestException(
        'Valor mínimo deve ser menor ou igual ao máximo.',
      );
    return this.prisma.$transaction(
      async (tx) => {
        const company = await tx.company.findUniqueOrThrow({
          where: { id: user.companyId },
          select: { tradeName: true },
        });
        const table =
          kind === 'projected-flow'
            ? await this.projected(tx, user.companyId, q, from, to)
            : [
                  'trial-balance',
                  'cash-flow',
                  'revenue-category',
                  'financial-indicators',
                ].includes(kind)
              ? await this.banking(tx, user.companyId, kind, q, from, to)
              : kind.startsWith('stock')
                ? await this.stock(tx, user.companyId, kind, q, from, to)
                : [
                      'receivables',
                      'payables',
                      'overdue',
                      'receipts',
                      'payments',
                      'expenses-category',
                    ].includes(kind)
                  ? await this.financial(tx, user.companyId, kind, q, from, to)
                  : await this.sales(tx, user.companyId, kind, q, from, to);
        this.bounded(table.rows);
        const count = table.rows.length;
        if (q.direction === 'desc') table.rows.reverse();
        const page = Math.min(q.page || 1, Math.max(1, Math.ceil(count / 50)));
        return {
          ...table,
          totals: { 'Linhas do relatório': scalarText(count), ...table.totals },
          rows:
            q.action === 'export' || q.action === 'print'
              ? table.rows
              : table.rows.slice((page - 1) * 50, page * 50),
          count,
          page,
          pageSize: 50,
          title: definition[1],
          company: company.tradeName,
          user: user.name,
          generatedAt: new Date().toISOString(),
          timeZone: ZONE,
          filters: q,
          permission: definition[3],
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        timeout: 30000,
      },
    );
  }
  private bounded<T>(rows: T[]): T[] {
    if (rows.length > LIMIT)
      throw new BadRequestException(
        'Mais de 20.000 registros de origem. Restrinja o período ou os filtros; nenhum total parcial foi gerado.',
      );
    return rows;
  }
  private productWhere(
    companyId: string,
    q: ManagementReportQuery,
  ): Prisma.SalesProductWhereInput {
    return {
      companyId,
      isGridParent: false,
      ...(q.product
        ? { name: { contains: q.product, mode: 'insensitive' } }
        : {}),
      ...(q.brand ? { brand: q.brand } : {}),
      ...(q.category ? { category: q.category } : {}),
      ...(q.subcategory ? { subcategory: q.subcategory } : {}),
      ...(q.productType ? { productType: q.productType } : {}),
      ...(q.supplier
        ? { supplierName: { contains: q.supplier, mode: 'insensitive' } }
        : {}),
    };
  }
  private async projected(
    tx: Prisma.TransactionClient,
    companyId: string,
    q: ManagementReportQuery,
    from: Date,
    to: Date,
  ): Promise<ReportTable> {
    const accounts = this.bounded(
      await tx.bankAccount.findMany({
        where: { companyId, deletedAt: null },
        select: { currentBalance: true },
        take: LIMIT + 1,
      }),
    );
    const receivables = this.bounded(
      await tx.contaReceber.findMany({
        where: {
          companyId,
          salesOrderId: { not: null },
          cancelledAt: null,
          dueDate: { gte: from, lt: to },
        },
        include: { payments: true },
        take: LIMIT + 1,
      }),
    );
    const payables = this.bounded(
      await tx.contaPagar.findMany({
        where: {
          companyId,
          salesReturnId: { not: null },
          cancelledAt: null,
          dueDate: { gte: from, lt: to },
        },
        include: { payments: true },
        take: LIMIT + 1,
      }),
    );
    const groups = new Map<
      string,
      { incoming: Prisma.Decimal; outgoing: Prisma.Decimal }
    >();
    for (const [records, direction] of [
      [receivables, 'incoming'],
      [payables, 'outgoing'],
    ] as const)
      for (const r of records) {
        const balance = Prisma.Decimal.max(
          0,
          r.amount.sub(
            r.payments.reduce(
              (s, p) => s.add(p.amountPaid).add(p.discount).sub(p.interest),
              D(),
            ),
          ),
        );
        if (balance.isZero()) continue;
        const day = localDate(r.dueDate, ZONE);
        const key = q.group === 'month' ? day.slice(0, 7) : day;
        const g = groups.get(key) || { incoming: D(), outgoing: D() };
        g[direction] = g[direction].add(balance);
        groups.set(key, g);
      }
    const initial = accounts.reduce((s, a) => s.add(a.currentBalance), D());
    let balance = initial;
    return {
      columns: [
        'Vencimento',
        'Saldo base/projetado',
        'Entradas previstas',
        'Saídas previstas',
        'Saldo projetado',
      ],
      rows: [...groups]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, g]) => {
          const opening = balance;
          balance = balance.add(g.incoming).sub(g.outgoing);
          return [
            key,
            money(opening),
            money(g.incoming),
            money(g.outgoing),
            money(balance),
          ];
        }),
      totals: {
        'Saldo bancário atual usado como base': money(initial),
        'Saldo projetado': money(balance),
      },
      warnings: [
        'Simulação a partir do saldo bancário atual e saldos ainda abertos dos títulos com vencimento no período. Não é reconstrução histórica nem inclui títulos com vencimento fora do período. Pagamentos já registrados reduzem os compromissos e não são somados novamente.',
        'Lançamentos bancários pendentes, compromissos sem título e contas excluídas não integram esta projeção.',
      ],
    };
  }
  private async banking(
    tx: Prisma.TransactionClient,
    companyId: string,
    kind: string,
    q: ManagementReportQuery,
    from: Date,
    to: Date,
  ): Promise<ReportTable> {
    const accountWhere: Prisma.BankAccountWhereInput = {
      companyId,
      ...(q.account
        ? { name: { contains: q.account, mode: 'insensitive' } }
        : {}),
    };
    const accounts = this.bounded(
      await tx.bankAccount.findMany({
        where: accountWhere,
        select: { id: true, name: true, currentBalance: true },
        orderBy: { name: 'asc' },
        take: LIMIT + 1,
      }),
    );
    // Reconstruct from current balances and confirmed entries. Never union titles or sales.
    const movements = this.bounded(
      await tx.bankTransaction.findMany({
        where: {
          bankAccount: accountWhere,
          status: 'CONFIRMED',
          OR: [
            { paymentDate: { gte: from } },
            { paymentDate: null, competenceDate: { gte: from } },
          ],
        },
        orderBy: [{ competenceDate: 'asc' }, { id: 'asc' }],
        take: LIMIT + 1,
      }),
    );
    const signed = (m: (typeof movements)[number]) =>
      m.type === 'INFLOW' ? m.amount : m.amount.add(m.fee).neg();
    const date = (m: (typeof movements)[number]) =>
      m.paymentDate || m.competenceDate;
    const period = movements.filter((m) => date(m) < to);
    const initial = accounts
      .reduce((s, a) => s.add(a.currentBalance), D())
      .sub(movements.reduce((s, m) => s.add(signed(m)), D()));
    const warnings = [
      'Fonte exclusiva: lançamentos bancários confirmados. Não soma vendas nem pagamentos de títulos. Saldos reconstruídos a partir do saldo atual e lançamentos posteriores; dependem da integridade do histórico bancário. Transferências internas aparecem em ambas as contas e não representam receita/despesa operacional.',
      'Sem data de pagamento, utiliza a data de competência registrada. Não constitui balancete contábil formal.',
    ];
    if (kind === 'revenue-category') {
      const groups = new Map<string, Prisma.Decimal>();
      for (const m of period.filter(
        (m) =>
          m.type === 'INFLOW' &&
          !m.transferGroupId &&
          (!q.category || m.category === q.category),
      ))
        groups.set(
          m.category || 'Sem categoria',
          (groups.get(m.category || 'Sem categoria') || D()).add(m.amount),
        );
      const total = [...groups.values()].reduce((s, x) => s.add(x), D());
      return {
        columns: [
          'Categoria bancária',
          'Entradas confirmadas',
          'Participação %',
        ],
        rows: [...groups].map(([name, value]) => [
          name,
          money(value),
          pct(value, total),
        ]),
        totals: { 'Entradas sem transferências internas': money(total) },
        warnings,
      };
    }
    if (kind === 'trial-balance')
      return {
        columns: [
          'Conta',
          'Saldo inicial reconstruído',
          'Entradas',
          'Saídas com taxas',
          'Saldo final reconstruído',
        ],
        rows: accounts.map((a) => {
          const records = movements.filter((m) => m.bankAccountId === a.id);
          const opening = a.currentBalance.sub(
            records.reduce((s, m) => s.add(signed(m)), D()),
          );
          const selected = records.filter((m) => date(m) < to);
          const incoming = selected
            .filter((m) => m.type === 'INFLOW')
            .reduce((s, m) => s.add(m.amount), D());
          const outgoing = selected
            .filter((m) => m.type === 'OUTFLOW')
            .reduce((s, m) => s.add(m.amount).add(m.fee), D());
          return [
            a.name,
            money(opening),
            money(incoming),
            money(outgoing),
            money(opening.add(incoming).sub(outgoing)),
          ];
        }),
        warnings,
      };
    const groups = new Map<
      string,
      { incoming: Prisma.Decimal; outgoing: Prisma.Decimal }
    >();
    for (const m of period) {
      const day = localDate(date(m), ZONE);
      const key = q.group === 'month' ? day.slice(0, 7) : day;
      const g = groups.get(key) || { incoming: D(), outgoing: D() };
      if (m.type === 'INFLOW') g.incoming = g.incoming.add(m.amount);
      else g.outgoing = g.outgoing.add(m.amount).add(m.fee);
      groups.set(key, g);
    }
    let balance = initial;
    return {
      columns: [
        'Período',
        'Saldo inicial reconstruído',
        'Entradas',
        'Saídas com taxas',
        'Saldo final reconstruído',
      ],
      rows: [...groups]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, g]) => {
          const opening = balance;
          balance = balance.add(g.incoming).sub(g.outgoing);
          return [
            key,
            money(opening),
            money(g.incoming),
            money(g.outgoing),
            money(balance),
          ];
        }),
      totals: {
        'Saldo inicial': money(initial),
        'Saldo final': money(balance),
      },
      warnings,
    };
  }
  private async stock(
    tx: Prisma.TransactionClient,
    companyId: string,
    kind: string,
    q: ManagementReportQuery,
    from: Date,
    to: Date,
  ): Promise<ReportTable> {
    const products = this.bounded(
      await tx.salesProduct.findMany({
        where: { ...this.productWhere(companyId, q), manageStock: true },
        orderBy: { name: 'asc' },
        take: LIMIT + 1,
      }),
    );
    const warnings = [
      'Classificações e custo são os atuais do cadastro. Valor cadastral = quantidade × (custo de compra + custo adicional); não representa custo médio histórico.',
    ];
    if (['stock-movements', 'stock-balance', 'stock-inactive'].includes(kind)) {
      const movements = this.bounded(
        await tx.salesStockMovement.findMany({
          where: {
            companyId,
            product: { ...this.productWhere(companyId, q), manageStock: true },
            createdAt: {
              gte: from,
              ...(kind === 'stock-balance' ? {} : { lt: to }),
            },
          },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          take: LIMIT + 1,
        }),
      );
      if (kind === 'stock-movements')
        return {
          columns: [
            'Data/hora',
            'Produto',
            'Natureza registrada',
            'Variação física',
            'Variação reservada',
          ],
          rows: movements.map((m) => [
            m.createdAt.toISOString(),
            products.find((p) => p.id === m.productId)?.name || m.productId,
            m.reason,
            m.stockChange.toString(),
            m.reservedChange.toString(),
          ]),
          warnings: [
            'Documento de origem, operador e saldos anterior/posterior não estão registrados nesta fonte.',
          ],
        };
      if (kind === 'stock-inactive') {
        const changed = new Set(
          movements
            .filter((m) => !m.stockChange.isZero())
            .map((m) => m.productId),
        );
        return {
          columns: ['Código', 'Produto', 'Estoque atual'],
          rows: products
            .filter((p) => !changed.has(p.id))
            .map((p) => [p.sku, p.name, p.stock.toString()]),
          warnings: [
            'Ausência de movimento físico registrado no período; reservas isoladas não contam como movimento físico.',
          ],
        };
      }
      return {
        columns: [
          'Código',
          'Produto',
          'Saldo inicial reconstruído',
          'Entradas',
          'Saídas',
          'Saldo final reconstruído',
        ],
        rows: products.map((p) => {
          const records = movements.filter((m) => m.productId === p.id);
          const initial = p.stock.sub(
            records.reduce((s, m) => s.add(m.stockChange), D()),
          );
          const period = records.filter((m) => m.createdAt < to);
          const input = period.reduce(
            (s, m) => s.add(Prisma.Decimal.max(m.stockChange, 0)),
            D(),
          );
          const output = period.reduce(
            (s, m) => s.add(Prisma.Decimal.max(m.stockChange.neg(), 0)),
            D(),
          );
          return [
            p.sku,
            p.name,
            initial.toString(),
            input.toString(),
            output.toString(),
            initial.add(input).sub(output).toString(),
          ];
        }),
        warnings: [
          'Saldos reconstruídos a partir do estoque atual e variações posteriores. Dependem de histórico completo; não constituem inventário físico. Naturezas de compras/devoluções/ajustes não são presumidas.',
        ],
      };
    }
    const selected = products.filter((p) =>
      kind === 'stock-minimum'
        ? p.stock.lte(p.minimumStock)
        : kind === 'stock-negative'
          ? p.stock.lt(0)
          : true,
    );
    const total = selected.reduce(
      (s, p) => s.add(p.stock.mul(p.purchaseCost.add(p.additionalCost))),
      D(),
    );
    return {
      columns: [
        'Código',
        'Produto',
        'Marca',
        'Tipo',
        'Categoria',
        'Estoque atual',
        'Mínimo',
        'Custo cadastral unitário',
        'Valor cadastral',
      ],
      rows: selected.map((p) => [
        p.sku,
        p.name,
        p.brand,
        p.productType,
        p.category,
        p.stock.toString(),
        p.minimumStock.toString(),
        money(p.purchaseCost.add(p.additionalCost)),
        money(p.stock.mul(p.purchaseCost.add(p.additionalCost))),
      ]),
      totals: { 'Valor cadastral': money(total) },
      warnings,
    };
  }
  private async financial(
    tx: Prisma.TransactionClient,
    companyId: string,
    kind: string,
    q: ManagementReportQuery,
    from: Date,
    to: Date,
  ): Promise<ReportTable> {
    const receiving = ['receivables', 'overdue', 'receipts'].includes(kind);
    const paid = ['receipts', 'payments', 'expenses-category'].includes(kind);
    if (paid) {
      const receipts = receiving
        ? this.bounded(
            await tx.pagamentoRecebido.findMany({
              where: {
                charge: {
                  salesOrderId: { not: null },
                  companyId,
                  cancelledAt: null,
                  ...(q.customer
                    ? {
                        tenantName: {
                          contains: q.customer,
                          mode: 'insensitive',
                        },
                      }
                    : {}),
                },
                paidAt: { gte: from, lt: to },
              },
              include: {
                charge: {
                  select: {
                    id: true,
                    companyId: true,
                    salesOrderId: true,
                    cancelledAt: true,
                    tenantName: true,
                  },
                },
              },
              orderBy: [{ paidAt: 'asc' }, { id: 'asc' }],
              take: LIMIT + 1,
            }),
          )
        : [];
      const payments = !receiving
        ? this.bounded(
            await tx.pagamentoRealizado.findMany({
              where: {
                expense: {
                  salesReturnId: { not: null },
                  companyId,
                  cancelledAt: null,
                  ...(q.category ? { category: q.category } : {}),
                  ...(q.supplier
                    ? {
                        personName: {
                          contains: q.supplier,
                          mode: 'insensitive',
                        },
                      }
                    : {}),
                },
                paidAt: { gte: from, lt: to },
              },
              include: {
                expense: {
                  select: {
                    id: true,
                    companyId: true,
                    salesReturnId: true,
                    cancelledAt: true,
                    category: true,
                    personName: true,
                  },
                },
              },
              orderBy: [{ paidAt: 'asc' }, { id: 'asc' }],
              take: LIMIT + 1,
            }),
          )
        : [];
      if (kind === 'expenses-category') {
        const groups = new Map<string, Prisma.Decimal>();
        for (const p of payments)
          groups.set(
            p.expense.category || 'Sem categoria',
            (groups.get(p.expense.category || 'Sem categoria') || D()).add(
              p.amountPaid,
            ),
          );
        const total = [...groups.values()].reduce((s, v) => s.add(v), D());
        return {
          columns: ['Categoria', 'Valor pago', 'Participação %'],
          rows: [...groups].map(([name, value]) => [
            name,
            money(value),
            pct(value, total),
          ]),
          totals: { Pagamentos: money(total) },
          warnings: [
            'Regime de caixa: pagamentos registrados, sem somar lançamentos bancários. Não representa despesa por competência.',
          ],
        };
      }
      const total = [...receipts, ...payments].reduce(
        (s, p) => s.add(p.amountPaid),
        D(),
      );
      return {
        columns: [
          'Data',
          'Documento',
          receiving ? 'Cliente' : 'Fornecedor',
          'Modalidade',
          'Valor registrado',
          'Juros',
          'Desconto',
        ],
        rows: receiving
          ? receipts.map((p) => [
              p.paidAt.toISOString(),
              p.chargeId,
              p.charge.tenantName,
              p.method,
              money(p.amountPaid),
              money(p.interest),
              money(p.discount),
            ])
          : payments.map((p) => [
              p.paidAt.toISOString(),
              p.expenseId,
              p.expense.personName,
              p.method,
              money(p.amountPaid),
              money(p.interest),
              money(p.discount),
            ]),
        totals: { 'Valor registrado': money(total) },
        warnings: [
          'Valores dos pagamentos dos títulos, sem somar vendas ou lançamentos bancários. Modalidade de crédito do cliente não representa dinheiro físico.',
        ],
      };
    }
    const dateFilter = { gte: from, lt: to };
    const receivables = receiving
      ? this.bounded(
          await tx.contaReceber.findMany({
            where: {
              companyId,
              salesOrderId: { not: null },
              cancelledAt: null,
              dueDate: dateFilter,
              ...(q.customer
                ? { tenantName: { contains: q.customer, mode: 'insensitive' } }
                : {}),
            },
            include: { payments: true },
            orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
            take: LIMIT + 1,
          }),
        )
      : [];
    const payables = !receiving
      ? this.bounded(
          await tx.contaPagar.findMany({
            where: {
              companyId,
              salesReturnId: { not: null },
              cancelledAt: null,
              dueDate: dateFilter,
              ...(q.category ? { category: q.category } : {}),
              ...(q.supplier
                ? { personName: { contains: q.supplier, mode: 'insensitive' } }
                : {}),
            },
            include: { payments: true },
            orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
            take: LIMIT + 1,
          }),
        )
      : [];
    const today = localDate(new Date(), ZONE);
    const titles = [
      ...receivables.map((r) => ({ ...r, name: r.tenantName })),
      ...payables.map((r) => ({ ...r, name: r.personName || '' })),
    ]
      .map((r) => {
        const received = r.payments.reduce(
          (s, p) => s.add(p.amountPaid).add(p.discount).sub(p.interest),
          D(),
        );
        const balance = Prisma.Decimal.max(0, r.amount.sub(received));
        const days = balance.gt(0)
          ? Math.max(
              0,
              Math.floor(
                (Date.parse(today) - Date.parse(localDate(r.dueDate, ZONE))) /
                  86400000,
              ),
            )
          : 0;
        const status = balance.isZero()
          ? 'PAGO'
          : days > 0
            ? 'VENCIDO'
            : received.gt(0)
              ? 'PARCIAL'
              : 'PENDENTE';
        return { ...r, received, balance, days, calculatedStatus: status };
      })
      .filter(
        (r) =>
          (!q.status || r.calculatedStatus === q.status) &&
          (kind !== 'overdue' || r.days > 0),
      );
    if (kind === 'overdue') {
      const groups = new Map<
        string,
        { name: string; count: number; buckets: Prisma.Decimal[]; days: number }
      >();
      for (const r of titles) {
        const key =
          'salesCustomerId' in r
            ? r.salesCustomerId ||
              ('tenantId' in r ? r.tenantId : null) ||
              r.name
            : r.name;
        const g = groups.get(key) || {
          name: r.name,
          count: 0,
          buckets: [D(), D(), D(), D()],
          days: 0,
        };
        g.count++;
        g.days = Math.max(g.days, r.days);
        const index =
          r.days <= 30 ? 0 : r.days <= 60 ? 1 : r.days <= 90 ? 2 : 3;
        g.buckets[index] = g.buckets[index].add(r.balance);
        groups.set(key, g);
      }
      return {
        columns: [
          'Cliente',
          'Títulos',
          'Maior atraso (dias)',
          '1–30',
          '31–60',
          '61–90',
          'Acima de 90',
          'Total vencido',
        ],
        rows: [...groups.values()].map((g) => [
          g.name,
          g.count,
          g.days,
          ...g.buckets.map(money),
          money(g.buckets.reduce((s, x) => s.add(x), D())),
        ]),
        totals: {
          Vencido: money(titles.reduce((s, r) => s.add(r.balance), D())),
        },
        warnings: [
          'Período filtra vencimento. Atraso e saldo refletem a posição atual, não uma posição histórica.',
        ],
      };
    }
    return {
      columns: [
        receiving ? 'Cliente' : 'Fornecedor',
        'Documento',
        'Emissão',
        'Vencimento',
        'Original',
        'Principal liquidado',
        'Saldo atual',
        'Situação',
        'Dias de atraso',
      ],
      rows: titles.map((r) => [
        r.name,
        r.id,
        (r.issueDate || r.createdAt).toISOString(),
        r.dueDate.toISOString(),
        money(r.amount),
        money(r.received),
        money(r.balance),
        r.calculatedStatus,
        r.days,
      ]),
      totals: {
        Original: money(titles.reduce((s, r) => s.add(r.amount), D())),
        Saldo: money(titles.reduce((s, r) => s.add(r.balance), D())),
      },
      warnings: [
        'Período filtra vencimento. Saldo atual considera todos os pagamentos registrados: principal liquidado = valor pago + desconto − juros. Títulos cancelados excluídos.',
      ],
    };
  }
  private async sales(
    tx: Prisma.TransactionClient,
    companyId: string,
    kind: string,
    q: ManagementReportQuery,
    from: Date,
    to: Date,
  ): Promise<ReportTable> {
    if (kind === 'credits') {
      const credits = this.bounded(
        await tx.salesCustomerCredit.findMany({
          where: {
            companyId,
            reversedAt: null,
            customer: {
              companyId,
              ...(q.customer
                ? { name: { contains: q.customer, mode: 'insensitive' } }
                : {}),
            },
            createdAt: { gte: from, lt: to },
          },
          include: { customer: { select: { name: true } } },
          take: LIMIT + 1,
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        }),
      );
      return {
        columns: ['Data', 'Cliente', 'Venda de origem', 'Valor', 'Motivo'],
        rows: credits.map((r) => [
          r.createdAt.toISOString(),
          r.customer.name,
          r.orderId,
          money(r.amount),
          r.reason,
        ]),
        warnings: [
          'Créditos gerados no período, ainda não estornados. Não representa saldo disponível do cliente nem entrada de caixa.',
        ],
      };
    }
    const operational = ['quotes', 'conditional', 'active'].includes(kind);
    const comparisonFrom = new Date(
      from.getTime() - (to.getTime() - from.getTime()),
    );
    const queryFrom = kind === 'comparison' ? comparisonFrom : from;
    const where: Prisma.SalesOrderWhereInput = {
      companyId,
      ...(q.seller
        ? { sellerName: { contains: q.seller, mode: 'insensitive' } }
        : {}),
      ...(q.customer
        ? { customerName: { contains: q.customer, mode: 'insensitive' } }
        : {}),
      ...(operational
        ? {
            createdAt: { gte: from, lt: to },
            ...(kind === 'active'
              ? { status: 'EM_ANDAMENTO' }
              : { saleType: kind === 'quotes' ? 'ORCAMENTO' : 'CONDICIONAL' }),
          }
        : {
            saleType: { in: ['VENDA', 'TROCA'] },
            status:
              kind === 'cancelled'
                ? { in: ['CANCELADA', 'ESTORNADA'] }
                : 'CONCLUIDA',
            OR: [
              { completedAt: { gte: queryFrom, lt: to } },
              { completedAt: null, createdAt: { gte: queryFrom, lt: to } },
            ],
          }),
    };
    if (operational && q.status && kind !== 'active') where.status = q.status;
    const orders = this.bounded(
      await tx.salesOrder.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: LIMIT + 1,
      }),
    );
    const productFilter = !!(
      q.product ||
      q.brand ||
      q.category ||
      q.subcategory ||
      q.productType ||
      q.supplier
    );
    const products = productFilter
      ? this.bounded(
          await tx.salesProduct.findMany({
            where: this.productWhere(companyId, q),
            select: { id: true },
            take: LIMIT + 1,
          }),
        )
      : [];
    const ids = new Set(products.map((p) => p.id));
    const eligible = orders.filter(
      (o) =>
        (!productFilter ||
          [...jsonItems(o.items), ...jsonItems(o.returnedItems || [])].some(
            (i) => ids.has(scalarText(i.productId)),
          )) &&
        (q.minimum == null || o.total.gte(q.minimum)) &&
        (q.maximum == null || o.total.lte(q.maximum)) &&
        (!q.method ||
          o.paymentMethod === q.method ||
          (o.paymentMethod === 'MISTO' &&
            o.paymentDetails &&
            typeof o.paymentDetails === 'object' &&
            !Array.isArray(o.paymentDetails) &&
            Number(o.paymentDetails[q.method]) > 0)),
    );
    const warnings = [
      'Valores comerciais dos documentos; não representam recebimento efetivo. Trocas exibem devoluções e compensações separadamente. Data da conclusão (ou criação quando ausente), fuso America/Manaus.',
      'Custo histórico não é gravado nos itens: CMV, lucro, margem e markup indisponíveis. Não foi utilizado custo cadastral atual.',
    ];
    if (kind === 'cancelled') {
      const events = eligible.length
        ? this.bounded(
            await tx.salesOrderEvent.findMany({
              where: {
                order: { companyId },
                orderId: { in: eligible.map((o) => o.id) },
                action: { in: ['CANCELADA', 'ESTORNADA'] },
              },
              orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
              take: LIMIT + 1,
            }),
          )
        : [];
      const latest = new Map<string, (typeof events)[number]>();
      for (const event of events)
        if (!latest.has(event.orderId)) latest.set(event.orderId, event);
      return {
        columns: [
          'Venda',
          'Data original',
          'Vendedor',
          'Cliente',
          'Total documento',
          'Situação',
          'Data do evento',
          'Motivo',
          'Responsável (ID registrado)',
        ],
        rows: eligible.map((o) => {
          const event = latest.get(o.id);
          const details =
            event?.details &&
            typeof event.details === 'object' &&
            !Array.isArray(event.details)
              ? event.details
              : {};
          return [
            o.number,
            (o.completedAt || o.createdAt).toISOString(),
            o.sellerName,
            o.customerName,
            money(o.total),
            o.status,
            event?.createdAt.toISOString() || null,
            typeof details.reason === 'string' ? details.reason : null,
            typeof details.actorId === 'string' ? details.actorId : null,
          ];
        }),
        totals: {
          'Documentos cancelados/estornados': scalarText(eligible.length),
          'Valor documental (fora do faturamento)': money(
            eligible.reduce((s, o) => s.add(o.total), D()),
          ),
        },
        warnings: [
          'Período seleciona a data original do documento. Data, motivo e responsável do cancelamento/estorno são apresentados quando registrados nos eventos. Valores não integram vendas concluídas.',
        ],
      };
    }
    if (kind === 'partial-dre') {
      const sum = (
        field: 'subtotal' | 'addition' | 'discount' | 'returnTotal',
      ) => eligible.reduce((s, o) => s.add(o[field]), D());
      const net = eligible.reduce(
        (s, o) => s.add(o.total).sub(o.debtOffset),
        D(),
      );
      return {
        columns: ['Estrutura gerencial parcial', 'Valor'],
        rows: [
          ['Receita bruta de vendas', money(sum('subtotal'))],
          ['Acréscimos comerciais', money(sum('addition'))],
          ['(-) Descontos', money(sum('discount'))],
          ['(-) Devoluções registradas', money(sum('returnTotal'))],
          ['Receita líquida comercial', money(net)],
          ['(-) CMV histórico', null],
          ['Lucro bruto', null],
          ['(-) Despesas operacionais por competência', null],
          ['Resultado operacional', null],
          ['Resultado financeiro por competência', null],
          ['Resultado antes dos tributos', null],
          ['Tributos sobre lucro', null],
          ['Resultado líquido', null],
        ],
        warnings: [
          ...warnings,
          'DRE gerencial parcial: apenas a composição comercial está disponível. Cancelados e estornados excluídos. Sem CMV histórico e classificação contábil por competência, não se apura lucro ou resultado líquido. Valores indisponíveis não equivalem a zero.',
        ],
      };
    }
    if (kind === 'comparison') {
      const previous = eligible.filter(
        (o) => (o.completedAt || o.createdAt) < from,
      );
      const current = eligible.filter(
        (o) => (o.completedAt || o.createdAt) >= from,
      );
      const total = (rows: typeof orders) =>
        rows.reduce((s, o) => s.add(o.total).sub(o.debtOffset), D());
      const before = total(previous);
      const after = total(current);
      return {
        columns: [
          'Indicador',
          'Período anterior equivalente',
          'Período consultado',
          'Variação %',
        ],
        rows: [
          [
            'Documentos concluídos',
            previous.length,
            current.length,
            previous.length
              ? money(
                  D(current.length - previous.length)
                    .div(previous.length)
                    .mul(100),
                )
              : null,
          ],
          [
            'Líquido comercial',
            money(before),
            money(after),
            before.isZero()
              ? null
              : money(after.sub(before).div(before.abs()).mul(100)),
          ],
        ],
        warnings: [
          ...warnings,
          `Comparação com intervalo imediatamente anterior: ${localDate(comparisonFrom, ZONE)} a ${localDate(new Date(from.getTime() - 1), ZONE)}. Base zero: variação indisponível.`,
        ],
      };
    }
    if (
      ['sales-detail', 'quotes', 'conditional', 'active', 'cancelled'].includes(
        kind,
      )
    )
      return {
        columns: [
          'Data',
          'Venda',
          'Vendedor',
          'Cliente',
          'Produto',
          'Quantidade',
          'Preço unitário',
          'Subtotal item',
          'Desconto documento',
          'Total documento',
          'Devolução documento',
          'Compensação documento',
          'Modalidade',
          'Situação',
        ],
        rows: eligible.flatMap((o) => {
          const items = jsonItems(o.items).filter(
            (i) => !productFilter || ids.has(scalarText(i.productId)),
          );
          return (items.length ? items : [{}]).map((i, index) => [
            (operational
              ? o.createdAt
              : o.completedAt || o.createdAt
            ).toISOString(),
            o.number,
            o.sellerName,
            o.customerName,
            scalarText(i.name || ''),
            scalarText(i.quantity ?? ''),
            scalarText(i.unitPrice ?? ''),
            scalarText(i.subtotal ?? ''),
            index === 0 ? money(o.discount) : null,
            index === 0 ? money(o.total) : null,
            index === 0 ? money(o.returnTotal) : null,
            index === 0 ? money(o.debtOffset) : null,
            o.paymentMethod,
            o.status,
          ]);
        }),
        warnings: [
          ...warnings,
          'Totais de documento aparecem apenas na primeira linha de cada venda e não são subtotais dos produtos filtrados. Cancelamentos selecionados pela data original do documento, não pela data do evento.',
        ],
      };
    if (['products', 'top-products', 'abc'].includes(kind)) {
      const groups = new Map<
        string,
        {
          name: string;
          sku: string;
          qty: Prisma.Decimal;
          gross: Prisma.Decimal;
          discount: Prisma.Decimal;
          returned: Prisma.Decimal;
          net: Prisma.Decimal;
        }
      >();
      for (const o of eligible)
        for (const i of jsonItems(o.items)) {
          if (productFilter && !ids.has(scalarText(i.productId))) continue;
          const key = scalarText(i.productId);
          const g = groups.get(key) || {
            name: scalarText(i.name || ''),
            sku: scalarText(i.sku || ''),
            qty: D(),
            gross: D(),
            discount: D(),
            returned: D(),
            net: D(),
          };
          const gross = D(scalarText(i.subtotal ?? 0));
          const ratio = o.subtotal.gt(0) ? gross.div(o.subtotal) : D();
          g.qty = g.qty.add(scalarText(i.quantity ?? 0));
          g.gross = g.gross.add(gross);
          g.discount = g.discount.add(o.discount.mul(ratio));
          g.net = g.net.add(
            gross.sub(o.discount.mul(ratio)).add(o.addition.mul(ratio)),
          );
          groups.set(key, g);
        }
      for (const o of eligible) {
        const returnedItems = jsonItems(o.returnedItems || []);
        const weight = returnedItems.reduce(
          (s, i) =>
            s.add(
              D(scalarText(i.unitPrice ?? 0)).mul(scalarText(i.quantity ?? 0)),
            ),
          D(),
        );
        for (const i of returnedItems) {
          if (productFilter && !ids.has(scalarText(i.productId))) continue;
          const key = scalarText(i.productId);
          const g = groups.get(key) || {
            name: scalarText(i.name || ''),
            sku: scalarText(i.sku || ''),
            qty: D(),
            gross: D(),
            discount: D(),
            returned: D(),
            net: D(),
          };
          const share = weight.gt(0)
            ? o.returnTotal
                .mul(
                  D(scalarText(i.unitPrice ?? 0)).mul(
                    scalarText(i.quantity ?? 0),
                  ),
                )
                .div(weight)
            : D();
          g.qty = g.qty.sub(scalarText(i.quantity ?? 0));
          g.returned = g.returned.add(share);
          g.net = g.net.sub(share);
          groups.set(key, g);
        }
        if (o.returnTotal.gt(0) && weight.isZero())
          throw new BadRequestException(
            `Venda ${o.number}: itens devolvidos sem preço histórico suficiente para ratear o valor. Nenhum total parcial foi gerado.`,
          );
      }
      const list = [...groups].map(([id, values]) => ({ id, ...values }));
      const total = list.reduce((s, g) => s.add(g.net), D());
      const notes = [
        ...warnings,
        'Quantidades líquidas das saídas e devoluções concluídas no período. Descontos/acréscimos gerais rateados pelo subtotal; devolução efetiva rateada pelo valor dos itens devolvidos. Rateio gerencial, com arredondamento somente na apresentação. ABC considera somente indicadores positivos e usa participação antes da inclusão do item que cruza o limite.',
      ];
      if (kind === 'abc')
        return {
          columns: [
            'Produto',
            q.metric === 'quantity'
              ? 'Quantidade líquida'
              : 'Faturamento líquido',
            'Participação %',
            'Acumulado %',
            'Classe',
          ],
          rows: abcRows(
            list
              .map((g) => ({
                name: `${g.sku} ${g.name}`,
                value: q.metric === 'quantity' ? g.qty : g.net,
              }))
              .filter((g) => g.value.gt(0)),
            q.abcA ?? 80,
            q.abcB ?? 95,
          ),
          warnings: notes,
        };
      list.sort((a, b) =>
        q.metric === 'quantity'
          ? b.qty.comparedTo(a.qty)
          : b.net.comparedTo(a.net),
      );
      const classifications = list.length
        ? this.bounded(
            await tx.salesProduct.findMany({
              where: { companyId, id: { in: list.map((g) => g.id) } },
              select: {
                id: true,
                brand: true,
                productType: true,
                category: true,
              },
              take: LIMIT + 1,
            }),
          )
        : [];
      const classificationById = new Map(classifications.map((p) => [p.id, p]));
      return {
        columns: [
          'Código',
          'Produto',
          'Quantidade líquida',
          'Bruto',
          'Desconto rateado',
          'Devolução rateada',
          'Líquido',
          'Participação %',
          'Marca atual',
          'Tipo atual',
          'Categoria atual',
          'Custo histórico',
          'Lucro bruto',
        ],
        rows: (q.top ? list.slice(0, q.top) : list).map((g) => [
          g.sku,
          g.name,
          g.qty.toString(),
          money(g.gross),
          money(g.discount),
          money(g.returned),
          money(g.net),
          pct(g.net, total),
          classificationById.get(g.id)?.brand ?? null,
          classificationById.get(g.id)?.productType ?? null,
          classificationById.get(g.id)?.category ?? null,
          null,
          null,
        ]),
        totals: { 'Líquido elegível antes do Top': money(total) },
        warnings: notes,
      };
    }
    if (kind === 'methods') {
      const groups = new Map<
        string,
        { count: number; value: Prisma.Decimal }
      >();
      for (const o of eligible) {
        const details =
          o.paymentDetails &&
          typeof o.paymentDetails === 'object' &&
          !Array.isArray(o.paymentDetails)
            ? o.paymentDetails
            : {};
        const entries =
          o.paymentMethod === 'MISTO'
            ? Object.entries(details)
                .filter(
                  ([, value]) =>
                    typeof value === 'string' || typeof value === 'number',
                )
                .map(([key, value]) => [key, D(scalarText(value))] as const)
                .filter(([, value]) => value.gt(0))
            : [[o.paymentMethod, o.total] as const];
        if (!entries.length) {
          warnings.push(
            `Venda ${o.number}: composição mista ausente; sem distribuição presumida.`,
          );
          continue;
        }
        for (const [key, amount] of entries) {
          const g = groups.get(key) || { count: 0, value: D() };
          g.count++;
          g.value = g.value.add(amount);
          groups.set(key, g);
        }
      }
      const total = [...groups.values()].reduce((s, g) => s.add(g.value), D());
      return {
        columns: [
          'Modalidade',
          'Documentos com a modalidade',
          'Valor atribuído',
          'Participação %',
        ],
        rows: [...groups].map(([key, g]) => [
          key,
          g.count,
          money(g.value),
          pct(g.value, total),
        ]),
        totals: { 'Atribuído às modalidades': money(total) },
        warnings: [
          ...warnings,
          'Vendas mistas usam valores registrados por modalidade. Contagens de documentos por modalidade não são aditivas. Crediário e crédito de cliente não são recebimento de dinheiro.',
        ],
      };
    }
    const groups = new Map<
      string,
      {
        name: string;
        count: number;
        gross: Prisma.Decimal;
        discount: Prisma.Decimal;
        returns: Prisma.Decimal;
        net: Prisma.Decimal;
      }
    >();
    for (const o of eligible) {
      const date = localDate(o.completedAt || o.createdAt, ZONE);
      const byPeriod = ['sales-period', 'revenue-evolution'].includes(kind);
      const sellerPeriod =
        kind === 'sellers' && ['day', 'month'].includes(q.group || '')
          ? `${q.group === 'day' ? date : date.slice(0, 7)} · `
          : '';
      const key =
        kind === 'summary'
          ? 'Resumo do período'
          : kind === 'customers'
            ? o.customerId || o.customerName
            : byPeriod
              ? q.group === 'month'
                ? date.slice(0, 7)
                : date
              : kind === 'commercial-performance'
                ? `${date.slice(0, 7)} · ${o.sellerId || o.sellerName}`
                : sellerPeriod + (o.sellerId || o.sellerName);
      const name =
        kind === 'summary'
          ? key
          : kind === 'customers'
            ? o.customerName
            : byPeriod
              ? key
              : kind === 'commercial-performance'
                ? `${date.slice(0, 7)} · ${o.sellerName}`
                : sellerPeriod + o.sellerName;
      const g = groups.get(key) || {
        name,
        count: 0,
        gross: D(),
        discount: D(),
        returns: D(),
        net: D(),
      };
      g.count++;
      g.gross = g.gross.add(o.subtotal).add(o.addition);
      g.discount = g.discount.add(o.discount);
      g.returns = g.returns.add(o.returnTotal);
      g.net = g.net.add(o.total).sub(o.debtOffset);
      groups.set(key, g);
    }
    const total = [...groups.values()].reduce((s, g) => s.add(g.net), D());
    return {
      columns: [
        kind === 'customers'
          ? 'Cliente'
          : kind === 'sales-period'
            ? 'Período'
            : 'Vendedor',
        'Vendas',
        'Bruto + acréscimos',
        'Desconto',
        'Devoluções registradas',
        'Líquido comercial após compensação',
        'Ticket médio',
        'Participação %',
      ],
      rows: [...groups.values()].map((g) => [
        g.name,
        g.count,
        money(g.gross),
        money(g.discount),
        money(g.returns),
        money(g.net),
        money(g.net.div(g.count)),
        pct(g.net, total),
      ]),
      totals: { 'Líquido comercial': money(total) },
      warnings: [
        ...warnings,
        ...(productFilter
          ? [
              'Filtro de produto seleciona documentos inteiros; totais não são restritos aos itens filtrados.',
            ]
          : []),
      ],
    };
  }
}
