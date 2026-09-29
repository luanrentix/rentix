"use client";

import Link from "next/link";
import { FinancialSummaryCard } from "./financial-summary-card";
import type { DashboardFinancialMovement } from "@/types/dashboard.types";

type FinancialOperationsSectionProps = {
  todayReceivables: DashboardFinancialMovement[];
  todayPayables: DashboardFinancialMovement[];
  upcomingReceivables: DashboardFinancialMovement[];
  upcomingPayables: DashboardFinancialMovement[];
  periodLabel: string;
  isPrivacyMode?: boolean;
  isLoading?: boolean;
};

export function FinancialOperationsSection({
  todayReceivables,
  todayPayables,
  upcomingReceivables,
  upcomingPayables,
  periodLabel,
  isPrivacyMode = false,
  isLoading,
}: FinancialOperationsSectionProps) {
  const todayReceivableTotal = todayReceivables.reduce((sum, item) => sum + item.amount, 0);
  const todayPayableTotal = todayPayables.reduce((sum, item) => sum + item.amount, 0);
  const upcomingReceivableTotal = upcomingReceivables.reduce((sum, item) => sum + item.amount, 0);
  const upcomingPayableTotal = upcomingPayables.reduce((sum, item) => sum + item.amount, 0);

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm xl:col-span-4 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-black text-slate-950 dark:text-white">Financeiro operacional</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Contas vencidas, vencendo hoje e próximos lançamentos no {periodLabel}.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <FinancialSummaryCard
          title="Receber atenção"
          value={formatCurrency(todayReceivableTotal)}
          detail={`${todayReceivables.length} vencido(s)/hoje`}
          tone="orange"
          isPrivacyMode={isPrivacyMode}
          isLoading={isLoading}
        />
        <FinancialSummaryCard
          title="Pagar atenção"
          value={formatCurrency(todayPayableTotal)}
          detail={`${todayPayables.length} vencido(s)/hoje`}
          tone="slate"
          isPrivacyMode={isPrivacyMode}
          isLoading={isLoading}
        />
        <FinancialSummaryCard
          title="Próx. recebimentos"
          value={formatCurrency(upcomingReceivableTotal)}
          detail={`${upcomingReceivables.length} item(ns)`}
          tone="green"
          isPrivacyMode={isPrivacyMode}
          isLoading={isLoading}
        />
        <FinancialSummaryCard
          title="Próx. pagamentos"
          value={formatCurrency(upcomingPayableTotal)}
          detail={`${upcomingPayables.length} item(ns)`}
          tone="red"
          isPrivacyMode={isPrivacyMode}
          isLoading={isLoading}
        />
      </div>

      <div className="mt-5 space-y-3">
        <FinancialMovementList
          title="Receber"
          href="/contas-receber"
          emptyMessage="Nenhum recebimento prioritário próximo."
          movements={[...todayReceivables, ...upcomingReceivables].slice(0, 4)}
          isPrivacyMode={isPrivacyMode}
        />

        <FinancialMovementList
          title="Pagar"
          href="/contas-pagar"
          emptyMessage="Nenhum pagamento prioritário próximo."
          movements={[...todayPayables, ...upcomingPayables].slice(0, 4)}
          isPrivacyMode={isPrivacyMode}
        />
      </div>
    </section>
  );
}

function FinancialMovementList({
  title,
  href,
  emptyMessage,
  movements,
  isPrivacyMode,
}: {
  title: string;
  href: string;
  emptyMessage: string;
  movements: DashboardFinancialMovement[];
  isPrivacyMode?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/60">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={href}
          className="rounded-xl px-2 py-1 text-sm font-black text-slate-800 transition hover:bg-white hover:text-orange-600 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-orange-400"
        >
          {title}
        </Link>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-400">
          {movements.length}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {movements.length === 0 ? (
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{emptyMessage}</p>
        ) : (
          movements.map((movement) => (
            <div
              key={movement.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm dark:bg-slate-900"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-black text-slate-800 dark:text-slate-200">
                  {movement.title}
                </p>
                <p className="truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {movement.subtitle} · {formatDateLabel(movement.dueDate)}
                </p>
              </div>

              <div className="text-right shrink-0">
                <p className="text-xs font-black text-slate-900 dark:text-white">
                  {isPrivacyMode ? "R$ ••••••" : formatCurrency(movement.amount)}
                </p>
                <p
                  className={`text-[10px] font-black ${
                    movement.status === "overdue"
                      ? "text-red-600 dark:text-red-400"
                      : movement.status === "today"
                        ? "text-orange-600 dark:text-orange-400"
                        : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {movement.status === "overdue"
                    ? "Atrasado"
                    : movement.status === "today"
                      ? "Hoje"
                      : "Próximo"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function formatCurrency(value?: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateLabel(value: string) {
  if (!value) return "Sem data";
  const parts = value.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return value;
}
