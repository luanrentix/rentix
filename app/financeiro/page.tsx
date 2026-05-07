"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/app-shell";

type FinancialStatus = "Pending" | "Paid" | "Overdue" | "Canceled";
type PeriodShortcut =
  | "CurrentMonth"
  | "CurrentQuarter"
  | "CurrentYear"
  | "All"
  | "Custom";

type RawRecord = Record<string, unknown>;

type NormalizedReceivable = {
  id: string;
  tenantName: string;
  propertyName: string;
  dueDate: string;
  amount: number;
  status: FinancialStatus;
  paymentDate: string | null;
  paidAmount: number;
};

type NormalizedPayable = {
  id: string;
  personName: string;
  description: string;
  category: string;
  dueDate: string;
  amount: number;
  status: FinancialStatus;
  paymentDate: string | null;
  paidAmount: number;
};

type ChargePayment = {
  chargeId: string;
  paidAt?: string;
  amountPaid?: number;
  interest?: number;
  discount?: number;
};

type ExpensePayment = {
  expenseId: string;
  paidAt?: string;
  amountPaid?: number;
  interest?: number;
  discount?: number;
};

type BalanceSummary = {
  totalToReceive: number;
  totalReceived: number;
  totalToPay: number;
  totalPaid: number;
  overdueReceivable: number;
  overduePayable: number;
  operationalResult: number;
  projectedBalance: number;
  openReceivableCount: number;
  receivedCount: number;
  openPayableCount: number;
  paidCount: number;
};

const RECEIVABLE_STORAGE_KEYS = [
  "rentix_manual_charges",
  "rentix_receivables",
  "rentix_accounts_receivable",
  "rentix_accounts_receivables",
  "rentix_receivable_accounts",
  "rentix_contract_receivables",
];

const PAYABLE_STORAGE_KEYS = [
  "rentix_expenses",
  "rentix_payables",
  "rentix_accounts_payable",
  "rentix_accounts_payables",
  "rentix_payable_accounts",
];

const CHARGE_PAYMENTS_STORAGE_KEY = "rentix_charge_payments";
const EXPENSE_PAYMENTS_STORAGE_KEY = "rentix_expense_payments";
const PAID_CHARGES_STORAGE_KEY = "rentix_paid_charges";
const CANCELED_CHARGES_STORAGE_KEY = "rentix_canceled_charges";

export default function FinancialPage() {
  const [receivables, setReceivables] = useState<NormalizedReceivable[]>([]);
  const [payables, setPayables] = useState<NormalizedPayable[]>([]);
  const [periodShortcut, setPeriodShortcut] =
    useState<PeriodShortcut>("CurrentMonth");
  const [startDate, setStartDate] = useState(getStartOfCurrentMonth());
  const [endDate, setEndDate] = useState(getEndOfCurrentMonth());
  const [isBlackTheme, setIsBlackTheme] = useState(false);

  useEffect(() => {
    function applyStoredTheme() {
      const storedThemeSettings = localStorage.getItem("rentix_theme_settings");
      const legacyTheme = localStorage.getItem("rentix_theme");

      try {
        const parsedThemeSettings = storedThemeSettings
          ? (JSON.parse(storedThemeSettings) as { mode?: string })
          : null;

        const isBlackThemeSelected =
          parsedThemeSettings?.mode === "black" ||
          parsedThemeSettings?.mode === "dark" ||
          legacyTheme === "black" ||
          legacyTheme === "dark";

        document.documentElement.classList.toggle("dark", isBlackThemeSelected);
        document.body.classList.toggle("dark", isBlackThemeSelected);
        setIsBlackTheme(isBlackThemeSelected);
      } catch {
        const isLegacyBlackTheme =
          legacyTheme === "black" || legacyTheme === "dark";

        document.documentElement.classList.toggle("dark", isLegacyBlackTheme);
        document.body.classList.toggle("dark", isLegacyBlackTheme);
        setIsBlackTheme(isLegacyBlackTheme);
      }
    }

    applyStoredTheme();
    window.addEventListener("storage", applyStoredTheme);

    return () => {
      window.removeEventListener("storage", applyStoredTheme);
    };
  }, []);

  useEffect(() => {
    function loadFinancialData() {
      const nextReceivables = readReceivablesDirectlyFromStorage();
      const nextPayables = readPayablesDirectlyFromStorage();

      setReceivables(nextReceivables);
      setPayables(nextPayables);
    }

    loadFinancialData();

    const refreshEvents = [
      "storage",
      "rentix-financial-updated",
      "rentix-receivables-updated",
      "rentix-payables-updated",
      "rentix-accounts-receivable-updated",
      "rentix-accounts-payable-updated",
    ];

    refreshEvents.forEach((eventName) => {
      window.addEventListener(eventName, loadFinancialData);
    });

    const interval = window.setInterval(loadFinancialData, 1200);

    return () => {
      refreshEvents.forEach((eventName) => {
        window.removeEventListener(eventName, loadFinancialData);
      });
      window.clearInterval(interval);
    };
  }, []);

  function updatePeriodShortcut(nextShortcut: PeriodShortcut) {
    setPeriodShortcut(nextShortcut);

    if (nextShortcut === "CurrentMonth") {
      setStartDate(getStartOfCurrentMonth());
      setEndDate(getEndOfCurrentMonth());
      return;
    }

    if (nextShortcut === "CurrentQuarter") {
      setStartDate(getStartOfCurrentQuarter());
      setEndDate(getEndOfCurrentQuarter());
      return;
    }

    if (nextShortcut === "CurrentYear") {
      setStartDate(getStartOfCurrentYear());
      setEndDate(getEndOfCurrentYear());
      return;
    }

    if (nextShortcut === "All") {
      setStartDate("");
      setEndDate("");
      return;
    }
  }

  function updateStartDate(value: string) {
    setStartDate(value);
    setPeriodShortcut("Custom");
  }

  function updateEndDate(value: string) {
    setEndDate(value);
    setPeriodShortcut("Custom");
  }

  const periodLabel = getPeriodLabel(periodShortcut, startDate, endDate);

  const balance = useMemo<BalanceSummary>(() => {
    const openReceivables = receivables.filter((receivable) => {
      if (receivable.status === "Canceled" || receivable.status === "Paid") {
        return false;
      }

      return isDateInsideRange(receivable.dueDate, startDate, endDate);
    });

    const receivedReceivables = receivables.filter((receivable) => {
      if (receivable.status !== "Paid") return false;

      return isDateInsideRange(
        receivable.paymentDate || receivable.dueDate,
        startDate,
        endDate,
      );
    });

    const openPayables = payables.filter((payable) => {
      if (payable.status === "Canceled" || payable.status === "Paid") {
        return false;
      }

      return isDateInsideRange(payable.dueDate, startDate, endDate);
    });

    const paidPayables = payables.filter((payable) => {
      if (payable.status !== "Paid") return false;

      return isDateInsideRange(
        payable.paymentDate || payable.dueDate,
        startDate,
        endDate,
      );
    });

    const totalToReceive = sumAmounts(openReceivables, "amount");
    const totalReceived = sumAmounts(receivedReceivables, "paidAmount");
    const totalToPay = sumAmounts(openPayables, "amount");
    const totalPaid = sumAmounts(paidPayables, "paidAmount");
    const overdueReceivable = sumAmounts(
      openReceivables.filter((item) => item.status === "Overdue"),
      "amount",
    );
    const overduePayable = sumAmounts(
      openPayables.filter((item) => item.status === "Overdue"),
      "amount",
    );
    const operationalResult = totalReceived - totalPaid;
    const projectedBalance =
      totalReceived + totalToReceive - totalPaid - totalToPay;

    return {
      totalToReceive,
      totalReceived,
      totalToPay,
      totalPaid,
      overdueReceivable,
      overduePayable,
      operationalResult,
      projectedBalance,
      openReceivableCount: openReceivables.length,
      receivedCount: receivedReceivables.length,
      openPayableCount: openPayables.length,
      paidCount: paidPayables.length,
    };
  }, [receivables, payables, startDate, endDate]);

  const nextReceivables = useMemo(() => {
    return receivables
      .filter((receivable) => receivable.status !== "Canceled")
      .filter((receivable) => receivable.status !== "Paid")
      .filter((receivable) => isDateInsideRange(receivable.dueDate, startDate, endDate))
      .sort(sortByDueDate)
      .slice(0, 6);
  }, [receivables, startDate, endDate]);

  const nextPayables = useMemo(() => {
    return payables
      .filter((payable) => payable.status !== "Canceled")
      .filter((payable) => payable.status !== "Paid")
      .filter((payable) => isDateInsideRange(payable.dueDate, startDate, endDate))
      .sort(sortByDueDate)
      .slice(0, 6);
  }, [payables, startDate, endDate]);

  return (
    <AppShell>
      <style jsx global>{`
        .rentix-financial-page-light,
        .rentix-financial-page-light * {
          color-scheme: light !important;
        }

        .rentix-financial-page-light .bg-white {
          background-color: #ffffff !important;
        }

        .rentix-financial-page-light .bg-slate-50 {
          background-color: #f8fafc !important;
        }

        .rentix-financial-page-light .bg-orange-50 {
          background-color: #fff7ed !important;
        }

        .rentix-financial-page-light .text-slate-950,
        .rentix-financial-page-light .text-slate-900,
        .rentix-financial-page-light .text-slate-800,
        .rentix-financial-page-light .text-slate-700 {
          color: #0f172a !important;
        }

        .rentix-financial-page-light .text-slate-600 {
          color: #475569 !important;
        }

        .rentix-financial-page-light .text-slate-500 {
          color: #64748b !important;
        }

        .rentix-financial-page-light .border-orange-100 {
          border-color: #ffedd5 !important;
        }

        .rentix-financial-page-light .border-slate-200 {
          border-color: #e2e8f0 !important;
        }

        .rentix-financial-page-light input,
        .rentix-financial-page-light select {
          background-color: #ffffff !important;
          border-color: #fed7aa !important;
          color: #0f172a !important;
          color-scheme: light !important;
        }

        .rentix-financial-page-black,
        .rentix-financial-page-black * {
          color-scheme: dark !important;
        }

        .rentix-financial-page-black .bg-white,
        .rentix-financial-page-black .bg-slate-50 {
          background-color: #0f172a !important;
        }

        .rentix-financial-page-black .bg-orange-50 {
          background-color: rgba(249, 115, 22, 0.13) !important;
        }

        .rentix-financial-page-black .text-slate-950,
        .rentix-financial-page-black .text-slate-900,
        .rentix-financial-page-black .text-slate-800,
        .rentix-financial-page-black .text-slate-700 {
          color: #f8fafc !important;
        }

        .rentix-financial-page-black .text-slate-600,
        .rentix-financial-page-black .text-slate-500 {
          color: #cbd5e1 !important;
        }

        .rentix-financial-page-black .border-orange-100,
        .rentix-financial-page-black .border-slate-200 {
          border-color: #334155 !important;
        }

        .rentix-financial-page-black input,
        .rentix-financial-page-black select {
          background-color: #020617 !important;
          border-color: #334155 !important;
          color: #f8fafc !important;
          color-scheme: dark !important;
        }
      `}</style>

      <div
        className={`rentix-financial-page ${
          isBlackTheme
            ? "rentix-financial-page-black"
            : "rentix-financial-page-light"
        } space-y-6`}
      >
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-black text-orange-600"></p>
            <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-950 dark:text-white">
              FINANCEIRO DO DJANHO
            </h1>
            <p className="mt-2 max-w-4xl text-sm font-semibold text-slate-500 dark:text-slate-400">
              Resultado direto das contas a receber, contas a pagar e baixas
              realizadas no período informado.
            </p>
          </div>

          <div className="rounded-3xl border border-orange-100 bg-white p-4 shadow-sm dark:border-orange-500/30 dark:bg-slate-900">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-2 block text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                  Atalho
                </label>
                <select
                  value={periodShortcut}
                  onChange={(event) =>
                    updatePeriodShortcut(event.target.value as PeriodShortcut)
                  }
                  className="h-12 w-full rounded-2xl border px-4 text-sm font-black outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-500/20"
                >
                  <option value="CurrentMonth">Mês atual</option>
                  <option value="CurrentQuarter">Trimestre atual</option>
                  <option value="CurrentYear">Ano atual</option>
                  <option value="All">Todo o período</option>
                  <option value="Custom">Personalizado</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                  Início
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => updateStartDate(event.target.value)}
                  className="h-12 w-full rounded-2xl border px-4 text-sm font-black outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-500/20"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-black uppercase text-slate-500 dark:text-slate-400">
                  Fim
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => updateEndDate(event.target.value)}
                  className="h-12 w-full rounded-2xl border px-4 text-sm font-black outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-500/20"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm dark:border-orange-500/30 dark:bg-slate-900">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-orange-600">
                Resultado {periodLabel}
              </p>
              <h2
                className={`mt-2 text-5xl font-black ${
                  balance.operationalResult >= 0
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(balance.operationalResult)}
              </h2>
              <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                Total recebido menos total pago, usando a data real de baixa.
              </p>
            </div>

            <div className="rounded-2xl bg-orange-50 px-6 py-5 text-left dark:bg-orange-500/10 lg:text-right">
              <p className="text-xs font-black uppercase tracking-wide text-orange-600">
                Saldo projetado
              </p>
              <p
                className={`mt-1 text-3xl font-black ${
                  balance.projectedBalance >= 0
                    ? "text-slate-950 dark:text-white"
                    : "text-red-600"
                }`}
              >
                {formatCurrency(balance.projectedBalance)}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
                Recebido + a receber - pago - a pagar
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <BalanceCard
            icon="📥"
            title="A receber"
            value={formatCurrency(balance.totalToReceive)}
            detail={`${balance.openReceivableCount} conta(s) em aberto`}
          />

          <BalanceCard
            icon="✅"
            title="Recebido"
            value={formatCurrency(balance.totalReceived)}
            detail={`${balance.receivedCount} recebimento(s) baixado(s)`}
          />

          <BalanceCard
            icon="📤"
            title="A pagar"
            value={formatCurrency(balance.totalToPay)}
            detail={`${balance.openPayableCount} conta(s) em aberto`}
            danger
          />

          <BalanceCard
            icon="💳"
            title="Pago"
            value={formatCurrency(balance.totalPaid)}
            detail={`${balance.paidCount} despesa(s) paga(s)`}
          />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <SimpleSummaryCard
            title="Vencidos a receber"
            value={formatCurrency(balance.overdueReceivable)}
            description="Valores vencidos que ainda não foram recebidos."
            danger={balance.overdueReceivable > 0}
          />

          <SimpleSummaryCard
            title="Vencidos a pagar"
            value={formatCurrency(balance.overduePayable)}
            description="Despesas vencidas que ainda não foram pagas."
            danger={balance.overduePayable > 0}
          />

          <SimpleSummaryCard
            title="Leitura do período"
            value={balance.projectedBalance >= 0 ? "Positiva" : "Negativa"}
            description="Resultado considerando entradas e saídas abertas."
            danger={balance.projectedBalance < 0}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <StatementList
            title="Próximos recebimentos"
            emptyMessage="Nenhuma conta a receber em aberto no período."
            items={nextReceivables.map((receivable) => ({
              id: receivable.id,
              title: receivable.tenantName,
              subtitle: receivable.propertyName,
              date: receivable.dueDate,
              amount: receivable.amount,
              status: receivable.status,
              negative: false,
            }))}
          />

          <StatementList
            title="Próximos pagamentos"
            emptyMessage="Nenhuma conta a pagar em aberto no período."
            items={nextPayables.map((payable) => ({
              id: payable.id,
              title: payable.description,
              subtitle: payable.personName || payable.category || "Geral",
              date: payable.dueDate,
              amount: payable.amount,
              status: payable.status,
              negative: true,
            }))}
          />
        </div>
      </div>
    </AppShell>
  );
}

function BalanceCard({
  title,
  value,
  detail,
  icon,
  danger = false,
}: {
  title: string;
  value: string;
  detail: string;
  icon: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm dark:border-orange-500/30 dark:bg-slate-900">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-xl dark:bg-orange-500/10">
        {icon}
      </div>
      <p className="text-sm font-black text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <h3
        className={`mt-3 text-3xl font-black ${
          danger ? "text-red-600" : "text-slate-950 dark:text-white"
        }`}
      >
        {value}
      </h3>
      <p className="mt-3 text-sm font-bold text-orange-600">{detail}</p>
    </div>
  );
}

function SimpleSummaryCard({
  title,
  value,
  description,
  danger = false,
}: {
  title: string;
  value: string;
  description: string;
  danger?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm dark:border-orange-500/30 dark:bg-slate-900">
      <p className="text-sm font-black text-slate-500 dark:text-slate-400">
        {title}
      </p>
      <h3
        className={`mt-3 text-3xl font-black ${
          danger ? "text-red-600" : "text-slate-950 dark:text-white"
        }`}
      >
        {value}
      </h3>
      <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}

function StatementList({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  emptyMessage: string;
  items: Array<{
    id: string;
    title: string;
    subtitle: string;
    date: string;
    amount: number;
    status: FinancialStatus;
    negative: boolean;
  }>;
}) {
  return (
    <div className="rounded-3xl border border-orange-100 bg-white shadow-sm dark:border-orange-500/30 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
        <h2 className="text-xl font-black text-slate-950 dark:text-white">
          {title}
        </h2>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {items.length === 0 ? (
          <div className="px-6 py-8 text-sm font-semibold text-slate-500 dark:text-slate-400">
            {emptyMessage}
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-black text-slate-900 dark:text-slate-100">
                  {item.title}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {item.subtitle} · Vencimento {formatDate(item.date)}
                </p>
              </div>

              <div className="text-left sm:text-right">
                <p
                  className={`text-lg font-black ${
                    item.negative ? "text-red-600" : "text-emerald-600"
                  }`}
                >
                  {item.negative ? "- " : ""}
                  {formatCurrency(item.amount)}
                </p>
                <FinancialStatusBadge status={item.status} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FinancialStatusBadge({ status }: { status: FinancialStatus }) {
  const statusConfig: Record<
    FinancialStatus,
    { label: string; className: string }
  > = {
    Pending: { label: "Pendente", className: "bg-yellow-100 text-yellow-700" },
    Paid: {
      label: "Pago",
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20",
    },
    Overdue: {
      label: "Vencido",
      className: "bg-red-100 text-red-700 dark:bg-red-500/20",
    },
    Canceled: {
      label: "Cancelado",
      className:
        "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    },
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${statusConfig[status].className}`}
    >
      {statusConfig[status].label}
    </span>
  );
}

function readReceivablesDirectlyFromStorage() {
  const paymentRecords = parseStoredArray<ChargePayment>(
    localStorage.getItem(CHARGE_PAYMENTS_STORAGE_KEY),
  );
  const paidChargeIds = parseStoredArray<string>(
    localStorage.getItem(PAID_CHARGES_STORAGE_KEY),
  );
  const canceledChargeIds = parseStoredArray<string>(
    localStorage.getItem(CANCELED_CHARGES_STORAGE_KEY),
  );

  const receivables = RECEIVABLE_STORAGE_KEYS.flatMap((storageKey) =>
    parseStoredArray<RawRecord>(localStorage.getItem(storageKey)).map((record) =>
      normalizeReceivableRecord(record, {
        paymentRecords,
        paidChargeIds,
        canceledChargeIds,
      }),
    ),
  );

  return mergeReceivables(receivables);
}

function readPayablesDirectlyFromStorage() {
  const paymentRecords = parseStoredArray<ExpensePayment>(
    localStorage.getItem(EXPENSE_PAYMENTS_STORAGE_KEY),
  );

  const payables = PAYABLE_STORAGE_KEYS.flatMap((storageKey) =>
    parseStoredArray<RawRecord>(localStorage.getItem(storageKey)).map((record) =>
      normalizePayableRecord(record, paymentRecords),
    ),
  );

  return mergePayables(payables);
}

function normalizeReceivableRecord(
  record: RawRecord,
  context: {
    paymentRecords: ChargePayment[];
    paidChargeIds: string[];
    canceledChargeIds: string[];
  },
): NormalizedReceivable {
  const id =
    getStringValue(record, ["id", "receivableId", "accountId", "chargeId"]) ||
    crypto.randomUUID();
  const dueDate = getDateValue(record, [
    "dueDate",
    "date",
    "installmentDate",
    "expirationDate",
    "maturityDate",
    "vencimento",
  ]);
  const amount = getNumberValue(record, [
    "amount",
    "value",
    "total",
    "rentValue",
    "installmentValue",
  ]);
  const paymentRecord = context.paymentRecords.find(
    (payment) => String(payment.chargeId) === String(id),
  );
  const rawStatus = normalizeStatus(
    getStringValue(record, ["status", "state", "situation"]),
  );
  const isPaid =
    rawStatus === "Paid" ||
    context.paidChargeIds.includes(id) ||
    Boolean(paymentRecord);
  const isCanceled =
    rawStatus === "Canceled" || context.canceledChargeIds.includes(id);
  const paymentDate =
    normalizeDate(paymentRecord?.paidAt) ||
    getNullableDateValue(record, ["paymentDate", "paidAt", "receivedAt"]);

  return {
    id,
    tenantName:
      getStringValue(record, [
        "tenantName",
        "tenant",
        "customerName",
        "personName",
        "payerName",
      ]) || "Pessoa não informada",
    propertyName:
      getStringValue(record, [
        "propertyName",
        "property",
        "realEstateName",
        "assetName",
      ]) || "Sem imóvel vinculado",
    dueDate,
    amount,
    status: getFinancialStatus(dueDate, isPaid, isCanceled),
    paymentDate,
    paidAmount:
      getNumberValue(paymentRecord || {}, ["amountPaid", "amount", "value"]) ||
      getNumberValue(record, ["amountPaid", "paidAmount"]) ||
      amount,
  };
}

function normalizePayableRecord(
  record: RawRecord,
  paymentRecords: ExpensePayment[],
): NormalizedPayable {
  const id =
    getStringValue(record, ["id", "expenseId", "payableId", "accountId"]) ||
    crypto.randomUUID();
  const dueDate = getDateValue(record, [
    "dueDate",
    "date",
    "expirationDate",
    "maturityDate",
    "vencimento",
  ]);
  const amount = getNumberValue(record, [
    "amount",
    "value",
    "total",
    "expenseValue",
  ]);
  const paymentRecord = paymentRecords.find(
    (payment) => String(payment.expenseId) === String(id),
  );
  const rawStatus = normalizeStatus(
    getStringValue(record, ["status", "state", "situation"]),
  );
  const isPaid = rawStatus === "Paid" || Boolean(paymentRecord);
  const isCanceled = rawStatus === "Canceled";
  const paymentDate =
    normalizeDate(paymentRecord?.paidAt) ||
    getNullableDateValue(record, ["paymentDate", "paidAt"]);

  return {
    id,
    personName:
      getStringValue(record, [
        "personName",
        "supplierName",
        "tenantName",
        "name",
        "payerName",
      ]) || "Pessoa não informada",
    description:
      getStringValue(record, ["description", "title", "name"]) ||
      "Conta a pagar",
    category: getStringValue(record, ["category", "group"]) || "Outros",
    dueDate,
    amount,
    status: getFinancialStatus(dueDate, isPaid, isCanceled),
    paymentDate,
    paidAmount:
      getNumberValue(paymentRecord || {}, ["amountPaid", "amount", "value"]) ||
      getNumberValue(record, ["amountPaid", "paidAmount"]) ||
      amount,
  };
}

function mergeReceivables(receivables: NormalizedReceivable[]) {
  const merged = new Map<string, NormalizedReceivable>();

  receivables.forEach((receivable) => {
    if (receivable.amount <= 0) return;

    const current = merged.get(receivable.id);

    if (!current) {
      merged.set(receivable.id, receivable);
      return;
    }

    if (current.status !== "Paid" && receivable.status === "Paid") {
      merged.set(receivable.id, receivable);
      return;
    }

    if (current.status === receivable.status) {
      merged.set(receivable.id, {
        ...current,
        tenantName: current.tenantName || receivable.tenantName,
        propertyName: current.propertyName || receivable.propertyName,
        paymentDate: current.paymentDate || receivable.paymentDate,
        paidAmount: Math.max(current.paidAmount, receivable.paidAmount),
      });
    }
  });

  return Array.from(merged.values()).sort(sortByDueDate);
}

function mergePayables(payables: NormalizedPayable[]) {
  const merged = new Map<string, NormalizedPayable>();

  payables.forEach((payable) => {
    if (payable.amount <= 0) return;

    const current = merged.get(payable.id);

    if (!current) {
      merged.set(payable.id, payable);
      return;
    }

    if (current.status !== "Paid" && payable.status === "Paid") {
      merged.set(payable.id, payable);
      return;
    }

    if (current.status === payable.status) {
      merged.set(payable.id, {
        ...current,
        personName: current.personName || payable.personName,
        description: current.description || payable.description,
        paymentDate: current.paymentDate || payable.paymentDate,
        paidAmount: Math.max(current.paidAmount, payable.paidAmount),
      });
    }
  });

  return Array.from(merged.values()).sort(sortByDueDate);
}

function parseStoredArray<T>(storedValue: string | null): T[] {
  if (!storedValue) return [];

  try {
    const parsedValue = JSON.parse(storedValue);
    return Array.isArray(parsedValue) ? (parsedValue as T[]) : [];
  } catch {
    return [];
  }
}

function getFinancialStatus(
  dueDate: string,
  isPaid: boolean,
  isCanceled: boolean,
): FinancialStatus {
  if (isCanceled) return "Canceled";
  if (isPaid) return "Paid";

  return dueDate < getTodayDate() ? "Overdue" : "Pending";
}

function normalizeStatus(status?: string): FinancialStatus | "" {
  const normalizedStatus = String(status || "")
    .trim()
    .toLowerCase();

  if (
    ["paid", "pago", "received", "recebido", "settled", "baixado"].includes(
      normalizedStatus,
    )
  ) {
    return "Paid";
  }

  if (
    ["canceled", "cancelled", "cancelado", "void"].includes(normalizedStatus)
  ) {
    return "Canceled";
  }

  if (["overdue", "vencido", "late", "atrasado"].includes(normalizedStatus)) {
    return "Overdue";
  }

  if (["pending", "pendente", "open", "aberto"].includes(normalizedStatus)) {
    return "Pending";
  }

  return "";
}

function getStringValue(record: RawRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }

  return "";
}

function getNumberValue(record: RawRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      const rawNumber = String(value).trim();
      const normalizedNumber = rawNumber.includes(",")
        ? rawNumber.replace(/\./g, "").replace(",", ".")
        : rawNumber;
      const numberValue = Number(normalizedNumber);

      if (!Number.isNaN(numberValue)) return numberValue;
    }
  }

  return 0;
}

function getDateValue(record: RawRecord, keys: string[]) {
  for (const key of keys) {
    const normalizedDate = normalizeDate(record[key]);

    if (normalizedDate) return normalizedDate;
  }

  return getTodayDate();
}

function getNullableDateValue(record: RawRecord, keys: string[]) {
  for (const key of keys) {
    const normalizedDate = normalizeDate(record[key]);

    if (normalizedDate) return normalizedDate;
  }

  return null;
}

function normalizeDate(value: unknown) {
  if (!value) return "";

  const rawValue = String(value).trim();

  if (!rawValue) return "";

  if (/^\d{4}-\d{2}-\d{2}/.test(rawValue)) {
    return rawValue.slice(0, 10);
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawValue)) {
    const [day, month, year] = rawValue.split("/");

    return `${year}-${month}-${day}`;
  }

  const parsedDate = new Date(rawValue);

  if (Number.isNaN(parsedDate.getTime())) return "";

  return parsedDate.toISOString().slice(0, 10);
}

function isDateInsideRange(date: string | null, startDate: string, endDate: string) {
  const normalizedDate = normalizeDate(date);

  if (!normalizedDate) return false;
  if (startDate && normalizedDate < startDate) return false;
  if (endDate && normalizedDate > endDate) return false;

  return true;
}

function sortByDueDate<T extends { dueDate: string }>(firstItem: T, secondItem: T) {
  return firstItem.dueDate.localeCompare(secondItem.dueDate);
}

function sumAmounts<T extends Record<string, unknown>>(
  items: T[],
  key: keyof T,
) {
  return items.reduce((total, item) => {
    const amount = Number(item[key] || 0);

    return total + (Number.isFinite(amount) ? amount : 0);
  }, 0);
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getStartOfCurrentMonth() {
  const today = new Date();

  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
    2,
    "0",
  )}-01`;
}

function getEndOfCurrentMonth() {
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(lastDay.getDate()).padStart(2, "0")}`;
}

function getStartOfCurrentQuarter() {
  const today = new Date();
  const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;

  return `${today.getFullYear()}-${String(quarterStartMonth + 1).padStart(
    2,
    "0",
  )}-01`;
}

function getEndOfCurrentQuarter() {
  const today = new Date();
  const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
  const quarterEndDate = new Date(today.getFullYear(), quarterStartMonth + 3, 0);

  return `${quarterEndDate.getFullYear()}-${String(
    quarterEndDate.getMonth() + 1,
  ).padStart(2, "0")}-${String(quarterEndDate.getDate()).padStart(2, "0")}`;
}

function getStartOfCurrentYear() {
  const today = new Date();

  return `${today.getFullYear()}-01-01`;
}

function getEndOfCurrentYear() {
  const today = new Date();

  return `${today.getFullYear()}-12-31`;
}

function getPeriodLabel(
  shortcut: PeriodShortcut,
  startDate: string,
  endDate: string,
) {
  if (shortcut === "CurrentMonth") return "do mês atual";
  if (shortcut === "CurrentQuarter") return "do trimestre atual";
  if (shortcut === "CurrentYear") return "do ano atual";
  if (shortcut === "All") return "de todo o período";

  if (startDate && endDate) {
    return `de ${formatDate(startDate)} a ${formatDate(endDate)}`;
  }

  if (startDate) return `a partir de ${formatDate(startDate)}`;
  if (endDate) return `até ${formatDate(endDate)}`;

  return "personalizado";
}

function formatCurrency(value?: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(date: string) {
  const normalizedDate = normalizeDate(date);

  if (!normalizedDate) return "-";

  return new Date(`${normalizedDate}T00:00:00`).toLocaleDateString("pt-BR");
}
