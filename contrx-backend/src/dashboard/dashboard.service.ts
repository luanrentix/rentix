import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardOverviewQueryDto } from './dto/dashboard-overview-query.dto';

export type DashboardOverviewResponse = {
  metrics: {
    monthlyRevenue: number;
    annualRevenueProjection: number;
    totalPotentialRevenue: number;
    availablePotentialRevenue: number;
    occupancyRate: number;
    vacancyRate: number;
    revenueEfficiency: number;
    totalProperties: number;
    rentedProperties: number;
    availableProperties: number;
    totalContracts: number;
    activeContracts: number;
    finishedContracts: number;
    averageTicket: number;
    openReceivableTotal: number;
    receivedTotal: number;
    overdueReceivableTotal: number;
    openPayableTotal: number;
    paidPayableTotal: number;
    overduePayableTotal: number;
    delinquencyRate: number;
    netCashFlowForecast: number;
    totalBankBalance: number;
    operatingResult?: number;
    operatingMargin?: number;
    cashCoverageRatio?: number;
  };
  agingList?: {
    range1to15: { amount: number; count: number };
    range16to30: { amount: number; count: number };
    range31to60: { amount: number; count: number };
    rangeAbove60: { amount: number; count: number };
    totalOverdue: number;
  };
  charts: {
    revenueEvolutionMonthly: Array<{
      month: string;
      expected: number;
      activeContracts: number;
    }>;
    revenueEvolutionDaily: Array<{
      month: string;
      expected: number;
      activeContracts: number;
    }>;
    contractEvolutionMonthly: Array<{
      month: string;
      createdContracts: number;
      activeContracts: number;
    }>;
    contractEvolutionDaily: Array<{
      month: string;
      createdContracts: number;
      activeContracts: number;
    }>;
  };
  financialMovements: {
    todayReceivables: Array<{
      id: string;
      title: string;
      subtitle: string;
      dueDate: string;
      amount: number;
      status: 'overdue' | 'today' | 'upcoming';
    }>;
    todayPayables: Array<{
      id: string;
      title: string;
      subtitle: string;
      dueDate: string;
      amount: number;
      status: 'overdue' | 'today' | 'upcoming';
    }>;
    upcomingReceivables: Array<{
      id: string;
      title: string;
      subtitle: string;
      dueDate: string;
      amount: number;
      status: 'overdue' | 'today' | 'upcoming';
    }>;
    upcomingPayables: Array<{
      id: string;
      title: string;
      subtitle: string;
      dueDate: string;
      amount: number;
      status: 'overdue' | 'today' | 'upcoming';
    }>;
  };
  alerts: Array<{
    id: string;
    title: string;
    description: string;
    level: 'critical' | 'warning' | 'info' | 'success';
    actionUrl?: string;
    actionLabel?: string;
    count?: number;
  }>;
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(
    companyId: string,
    query: DashboardOverviewQueryDto = {},
  ): Promise<DashboardOverviewResponse> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, tradeName: true, companyName: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada.');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { startDate, endDate } = this.resolveDateRange(query);

    // Consultas paralelas ao banco de dados com isolamento por empresa
    const [
      allProperties,
      allContracts,
      receivablesInPeriod,
      payablesInPeriod,
      bankAccounts,
    ] = await Promise.all([
      this.prisma.property.findMany({
        where: {
          companyId,
          isActive: true,
        },
        select: {
          id: true,
          title: true,
          rentalValue: true,
        },
      }),
      this.prisma.contract.findMany({
        where: {
          companyId,
          deletedAt: null,
          status: {
            notIn: ['DELETED', 'CANCELED'],
          },
        },
        select: {
          id: true,
          propertyId: true,
          startDate: true,
          endDate: true,
          rentValue: true,
          status: true,
        },
        orderBy: { startDate: 'asc' },
      }),
      this.prisma.contaReceber.findMany({
        where: {
          companyId,
          ...(startDate && endDate
            ? {
                dueDate: {
                  gte: startDate,
                  lte: endDate,
                },
              }
            : {}),
        },
        include: {
          payments: {
            select: {
              amountPaid: true,
              discount: true,
              interest: true,
            },
          },
        },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.contaPagar.findMany({
        where: {
          companyId,
          ...(startDate && endDate
            ? {
                dueDate: {
                  gte: startDate,
                  lte: endDate,
                },
              }
            : {}),
        },
        include: {
          payments: {
            select: {
              amountPaid: true,
              discount: true,
              interest: true,
            },
          },
        },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.bankAccount.findMany({
        where: {
          companyId,
          active: true,
          deletedAt: null,
        },
        select: {
          currentBalance: true,
        },
      }),
    ]);

    // 1. Cálculos de Contratos e Patrimônio
    const activeContractsList = allContracts.filter(
      (c) => String(c.status).toUpperCase() === 'ACTIVE',
    );
    const activePropertyIds = new Set(
      activeContractsList.map((c) => c.propertyId).filter(Boolean),
    );

    const totalProperties = allProperties.length;
    const rentedProperties = allProperties.filter((p) =>
      activePropertyIds.has(p.id),
    ).length;
    const availableProperties = Math.max(0, totalProperties - rentedProperties);

    const occupancyRate =
      totalProperties > 0
        ? Math.round((rentedProperties / totalProperties) * 100)
        : 0;
    const vacancyRate = totalProperties > 0 ? 100 - occupancyRate : 0;

    const monthlyRevenue = activeContractsList.reduce(
      (acc, c) => acc + Number(c.rentValue || 0),
      0,
    );
    const annualRevenueProjection = monthlyRevenue * 12;

    const totalPotentialRevenue = allProperties.reduce(
      (acc, p) => acc + Number(p.rentalValue || 0),
      0,
    );
    const availablePotentialRevenue = allProperties
      .filter((p) => !activePropertyIds.has(p.id))
      .reduce((acc, p) => acc + Number(p.rentalValue || 0), 0);

    const revenueEfficiency =
      totalPotentialRevenue > 0
        ? Math.round((monthlyRevenue / totalPotentialRevenue) * 100)
        : 0;

    const activeContractsCount = activeContractsList.length;
    const finishedContractsCount = allContracts.filter(
      (c) => c.status === 'FINISHED',
    ).length;
    const averageTicket =
      activeContractsCount > 0
        ? Math.round(monthlyRevenue / activeContractsCount)
        : 0;

    // 2. Cálculos Financeiros
    let openReceivableTotal = 0;
    let receivedTotal = 0;
    let overdueReceivableTotal = 0;

    let aging1to15Amount = 0;
    let aging1to15Count = 0;
    let aging16to30Amount = 0;
    let aging16to30Count = 0;
    let aging31to60Amount = 0;
    let aging31to60Count = 0;
    let agingAbove60Amount = 0;
    let agingAbove60Count = 0;

    const normalizedReceivables = receivablesInPeriod.map((r) => {
      const amount = Number(r.amount || 0);
      const paidAmount = r.payments.reduce(
        (sum, p) => sum + Number(p.amountPaid || 0),
        0,
      );
      const discount = r.payments.reduce(
        (sum, p) => sum + Number(p.discount || 0),
        0,
      );
      const settlement = paidAmount + discount;
      const remaining = Math.max(0, amount - settlement);

      const dueDate = new Date(r.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      const isPaid = r.status === 'PAID' || remaining <= 0;
      const isOverdue = !isPaid && dueDate < today;

      if (isPaid) {
        receivedTotal += paidAmount > 0 ? paidAmount : amount;
      } else {
        openReceivableTotal += remaining;
        if (isOverdue) {
          overdueReceivableTotal += remaining;
          const diffDays = Math.max(
            0,
            Math.floor(
              (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
            ),
          );
          if (diffDays <= 15) {
            aging1to15Amount += remaining;
            aging1to15Count += 1;
          } else if (diffDays <= 30) {
            aging16to30Amount += remaining;
            aging16to30Count += 1;
          } else if (diffDays <= 60) {
            aging31to60Amount += remaining;
            aging31to60Count += 1;
          } else {
            agingAbove60Amount += remaining;
            agingAbove60Count += 1;
          }
        }
      }

      return {
        id: r.id,
        tenantName: r.tenantName || 'Pessoa não informada',
        propertyName: r.propertyName || 'Sem bem/ativo vinculado',
        dueDate: r.dueDate.toISOString().slice(0, 10),
        amount: remaining > 0 ? remaining : amount,
        isPaid,
        isOverdue,
        dueDateObj: dueDate,
      };
    });

    let openPayableTotal = 0;
    let paidPayableTotal = 0;
    let overduePayableTotal = 0;

    const normalizedPayables = payablesInPeriod.map((p) => {
      const amount = Number(p.amount || 0);
      const paidAmount = p.payments.reduce(
        (sum, pay) => sum + Number(pay.amountPaid || 0),
        0,
      );
      const discount = p.payments.reduce(
        (sum, pay) => sum + Number(pay.discount || 0),
        0,
      );
      const settlement = paidAmount + discount;
      const remaining = Math.max(0, amount - settlement);

      const dueDate = new Date(p.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      const isPaid = p.status === 'PAID' || remaining <= 0;
      const isOverdue = !isPaid && dueDate < today;

      if (isPaid) {
        paidPayableTotal += paidAmount > 0 ? paidAmount : amount;
      } else {
        openPayableTotal += remaining;
        if (isOverdue) {
          overduePayableTotal += remaining;
        }
      }

      return {
        id: p.id,
        personName: p.personName || p.description || 'Conta a pagar',
        description: p.description || p.category || 'Geral',
        dueDate: p.dueDate.toISOString().slice(0, 10),
        amount: remaining > 0 ? remaining : amount,
        isPaid,
        isOverdue,
        dueDateObj: dueDate,
      };
    });

    const totalReceivableBilled = receivedTotal + openReceivableTotal;
    const delinquencyRate =
      totalReceivableBilled > 0
        ? Math.round((overdueReceivableTotal / totalReceivableBilled) * 100)
        : 0;

    const netCashFlowForecast = openReceivableTotal - openPayableTotal;

    const operatingResult = receivedTotal - paidPayableTotal;
    const operatingMargin =
      receivedTotal > 0
        ? Math.round((operatingResult / receivedTotal) * 100)
        : 0;

    const totalBankBalance = bankAccounts.reduce(
      (sum, acc) => sum + Number(acc.currentBalance || 0),
      0,
    );

    const cashCoverageRatio =
      openPayableTotal > 0
        ? Number((totalBankBalance / openPayableTotal).toFixed(2))
        : totalBankBalance > 0
          ? 99
          : 1;

    // 3. Movimentações Próximas e Vencidas (Operacional)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const upcomingLimit = new Date(today);
    upcomingLimit.setDate(upcomingLimit.getDate() + 7);
    upcomingLimit.setHours(23, 59, 59, 999);

    const todayReceivables = normalizedReceivables
      .filter((r) => !r.isPaid && (r.isOverdue || r.dueDateObj < tomorrow))
      .map((r) => ({
        id: r.id,
        title: r.tenantName,
        subtitle: r.propertyName,
        dueDate: r.dueDate,
        amount: r.amount,
        status: r.isOverdue ? ('overdue' as const) : ('today' as const),
      }))
      .slice(0, 6);

    const upcomingReceivables = normalizedReceivables
      .filter(
        (r) =>
          !r.isPaid &&
          r.dueDateObj >= tomorrow &&
          r.dueDateObj <= upcomingLimit,
      )
      .map((r) => ({
        id: r.id,
        title: r.tenantName,
        subtitle: r.propertyName,
        dueDate: r.dueDate,
        amount: r.amount,
        status: 'upcoming' as const,
      }))
      .slice(0, 6);

    const todayPayables = normalizedPayables
      .filter((p) => !p.isPaid && (p.isOverdue || p.dueDateObj < tomorrow))
      .map((p) => ({
        id: p.id,
        title: p.personName,
        subtitle: p.description,
        dueDate: p.dueDate,
        amount: p.amount,
        status: p.isOverdue ? ('overdue' as const) : ('today' as const),
      }))
      .slice(0, 6);

    const upcomingPayables = normalizedPayables
      .filter(
        (p) =>
          !p.isPaid &&
          p.dueDateObj >= tomorrow &&
          p.dueDateObj <= upcomingLimit,
      )
      .map((p) => ({
        id: p.id,
        title: p.personName,
        subtitle: p.description,
        dueDate: p.dueDate,
        amount: p.amount,
        status: 'upcoming' as const,
      }))
      .slice(0, 6);

    // 4. Séries Temporais para Gráficos
    const last6Months = this.getLastSixMonths();
    const last30Days = this.getLastThirtyDays();

    const revenueEvolutionMonthly = last6Months.map((m) => {
      const monthEnd = new Date(
        m.getFullYear(),
        m.getMonth() + 1,
        0,
        23,
        59,
        59,
      );
      const activeInMonth = allContracts.filter((c) => {
        const start = new Date(c.startDate);
        return start <= monthEnd && c.status === 'ACTIVE';
      });

      return {
        month: m
          .toLocaleDateString('pt-BR', { month: 'short' })
          .replace('.', ''),
        expected: activeInMonth.reduce(
          (sum, c) => sum + Number(c.rentValue || 0),
          0,
        ),
        activeContracts: activeInMonth.length,
      };
    });

    const revenueEvolutionDaily = last30Days.map((d) => {
      const dayEnd = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        23,
        59,
        59,
      );
      const activeInDay = allContracts.filter((c) => {
        const start = new Date(c.startDate);
        return start <= dayEnd && c.status === 'ACTIVE';
      });

      return {
        month: d.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        }),
        expected: activeInDay.reduce(
          (sum, c) => sum + Number(c.rentValue || 0),
          0,
        ),
        activeContracts: activeInDay.length,
      };
    });

    const contractEvolutionMonthly = last6Months.map((m) => {
      const monthStart = new Date(m.getFullYear(), m.getMonth(), 1);
      const monthEnd = new Date(
        m.getFullYear(),
        m.getMonth() + 1,
        0,
        23,
        59,
        59,
      );

      const created = allContracts.filter((c) => {
        const start = new Date(c.startDate);
        return start >= monthStart && start <= monthEnd;
      }).length;

      const active = allContracts.filter((c) => {
        const start = new Date(c.startDate);
        return start <= monthEnd && c.status === 'ACTIVE';
      }).length;

      return {
        month: m
          .toLocaleDateString('pt-BR', { month: 'short' })
          .replace('.', ''),
        createdContracts: created,
        activeContracts: active,
      };
    });

    const contractEvolutionDaily = last30Days.map((d) => {
      const dayStart = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        0,
        0,
        0,
      );
      const dayEnd = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        23,
        59,
        59,
      );

      const created = allContracts.filter((c) => {
        const start = new Date(c.startDate);
        return start >= dayStart && start <= dayEnd;
      }).length;

      const active = allContracts.filter((c) => {
        const start = new Date(c.startDate);
        return start <= dayEnd && c.status === 'ACTIVE';
      }).length;

      return {
        month: d.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        }),
        createdContracts: created,
        activeContracts: active,
      };
    });

    // 5. Central de Atenção Acionável (Actionable Alerts)
    const alerts: DashboardOverviewResponse['alerts'] = [];

    // Contratos vencidos ou perto de vencer
    const expiredContracts = allContracts.filter((c) => {
      if (c.status !== 'ACTIVE' || !c.endDate) return false;
      const end = new Date(c.endDate);
      return end < today;
    }).length;

    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);

    const expiringContracts = allContracts.filter((c) => {
      if (c.status !== 'ACTIVE' || !c.endDate) return false;
      const end = new Date(c.endDate);
      return end >= today && end <= in30Days;
    }).length;

    if (expiredContracts > 0) {
      alerts.push({
        id: 'expired-contracts',
        title: `${expiredContracts} contrato(s) vencido(s)`,
        description:
          'Contratos ativos cuja data de término já passou. Providencie a renovação ou encerramento.',
        level: 'critical',
        actionUrl: '/contratos',
        actionLabel: 'Ver Contratos Vencidos',
        count: expiredContracts,
      });
    }

    if (expiringContracts > 0) {
      alerts.push({
        id: 'expiring-contracts',
        title: `${expiringContracts} contrato(s) a vencer em 30 dias`,
        description:
          'Contratos ativos próximos do término. Agende a renovação ou contato com antecedência.',
        level: 'warning',
        actionUrl: '/contratos',
        actionLabel: 'Acompanhar Renovações',
        count: expiringContracts,
      });
    }

    if (totalProperties === 0) {
      alerts.push({
        id: 'no-properties',
        title: 'Nenhum bem/ativo cadastrado',
        description:
          'Cadastre seus primeiros bens/ativos para iniciar a gestão operacional e financeira.',
        level: 'critical',
        actionUrl: '/imoveis',
        actionLabel: 'Cadastrar Bem/Ativo',
      });
    } else if (availableProperties > 0) {
      alerts.push({
        id: 'available-properties',
        title: `${availableProperties} bem(ns) disponível(is)`,
        description: `${this.formatCurrency(availablePotentialRevenue)} em potencial mensal sem contrato ativo gerando receita.`,
        level: 'warning',
        actionUrl: '/imoveis',
        actionLabel: 'Ver Bens Disponíveis',
        count: availableProperties,
      });
    }

    if (todayReceivables.length > 0) {
      alerts.push({
        id: 'receivables-attention',
        title: `${todayReceivables.length} recebimento(s) para atenção`,
        description: `${this.formatCurrency(overdueReceivableTotal)} entre vencimentos de hoje e em atraso na carteira.`,
        level: overdueReceivableTotal > 0 ? 'critical' : 'info',
        actionUrl: '/contas-receber',
        actionLabel: 'Cobrar Inadimplentes',
        count: todayReceivables.length,
      });
    }

    if (todayPayables.length > 0) {
      alerts.push({
        id: 'payables-attention',
        title: `${todayPayables.length} conta(s) a pagar para atenção`,
        description: `${this.formatCurrency(overduePayableTotal)} entre contas vencidas e com vencimento para hoje.`,
        level: overduePayableTotal > 0 ? 'critical' : 'warning',
        actionUrl: '/contas-pagar',
        actionLabel: 'Ver Contas a Pagar',
        count: todayPayables.length,
      });
    }

    if (totalProperties > 0 && occupancyRate >= 90) {
      alerts.push({
        id: 'high-occupancy',
        title: 'Excelente taxa de ocupação',
        description:
          'A carteira está com alta eficiência de ocupação. Momento ideal para expansão de novos bens/ativos.',
        level: 'success',
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        id: 'healthy-operation',
        title: 'Operação estável',
        description:
          'Nenhuma pendência crítica ou urgente identificada no momento.',
        level: 'success',
      });
    }

    return {
      metrics: {
        monthlyRevenue,
        annualRevenueProjection,
        totalPotentialRevenue,
        availablePotentialRevenue,
        occupancyRate,
        vacancyRate,
        revenueEfficiency,
        totalProperties,
        rentedProperties,
        availableProperties,
        totalContracts: allContracts.length,
        activeContracts: activeContractsCount,
        finishedContracts: finishedContractsCount,
        averageTicket,
        openReceivableTotal,
        receivedTotal,
        overdueReceivableTotal,
        openPayableTotal,
        paidPayableTotal,
        overduePayableTotal,
        delinquencyRate,
        netCashFlowForecast,
        totalBankBalance,
        operatingResult,
        operatingMargin,
        cashCoverageRatio,
      },
      agingList: {
        range1to15: { amount: aging1to15Amount, count: aging1to15Count },
        range16to30: { amount: aging16to30Amount, count: aging16to30Count },
        range31to60: { amount: aging31to60Amount, count: aging31to60Count },
        rangeAbove60: { amount: agingAbove60Amount, count: agingAbove60Count },
        totalOverdue: overdueReceivableTotal,
      },
      charts: {
        revenueEvolutionMonthly,
        revenueEvolutionDaily,
        contractEvolutionMonthly,
        contractEvolutionDaily,
      },
      financialMovements: {
        todayReceivables,
        todayPayables,
        upcomingReceivables,
        upcomingPayables,
      },
      alerts: alerts.slice(0, 6),
    };
  }

  private resolveDateRange(query: DashboardOverviewQueryDto): {
    startDate?: Date;
    endDate?: Date;
  } {
    const today = new Date();

    if (query.period === 'Custom' && query.startDate && query.endDate) {
      const start = new Date(`${query.startDate}T00:00:00.000`);
      const end = new Date(`${query.endDate}T23:59:59.999`);
      return { startDate: start, endDate: end };
    }

    if (query.period === 'All') {
      return {};
    }

    if (query.period === 'CurrentYear') {
      const start = new Date(today.getFullYear(), 0, 1, 0, 0, 0, 0);
      const end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { startDate: start, endDate: end };
    }

    // Default: CurrentMonth
    const start = new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );
    const end = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    return { startDate: start, endDate: end };
  }

  private getLastSixMonths(): Date[] {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      return new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    });
  }

  private getLastThirtyDays(): Date[] {
    const now = new Date();
    return Array.from({ length: 30 }, (_, i) => {
      return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 29 + i,
      );
    });
  }

  private formatCurrency(value: number): string {
    return Number(value || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }
}
