export type DashboardFinancialPeriod =
  | 'CurrentMonth'
  | 'CurrentYear'
  | 'All'
  | 'Custom';

export type ThemeMode = 'light' | 'black' | 'graphite';

export type DashboardMetrics = {
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
  totalContracts?: number;
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
  agingList?: DashboardAgingList;
};

export type AgingRange = {
  amount: number;
  count: number;
};

export type DashboardAgingList = {
  range1to15: AgingRange;
  range16to30: AgingRange;
  range31to60: AgingRange;
  rangeAbove60: AgingRange;
  totalOverdue: number;
};

export type RevenueMonthItem = {
  month: string;
  expected: number;
  activeContracts: number;
};

export type ContractEvolutionItem = {
  month: string;
  createdContracts: number;
  activeContracts: number;
};

export type DashboardFinancialMovement = {
  id: string;
  title: string;
  subtitle: string;
  dueDate: string;
  amount: number;
  status: 'overdue' | 'today' | 'upcoming';
};

export type DashboardAlert = {
  id: string;
  title: string;
  description: string;
  level: 'critical' | 'warning' | 'info' | 'success';
  actionUrl?: string;
  actionLabel?: string;
  count?: number;
};

export type DashboardOverviewResponse = {
  metrics: DashboardMetrics;
  agingList?: DashboardAgingList;
  charts: {
    revenueEvolutionMonthly: RevenueMonthItem[];
    revenueEvolutionDaily: RevenueMonthItem[];
    contractEvolutionMonthly: ContractEvolutionItem[];
    contractEvolutionDaily: ContractEvolutionItem[];
  };
  financialMovements: {
    todayReceivables: DashboardFinancialMovement[];
    todayPayables: DashboardFinancialMovement[];
    upcomingReceivables: DashboardFinancialMovement[];
    upcomingPayables: DashboardFinancialMovement[];
  };
  alerts: DashboardAlert[];
};
