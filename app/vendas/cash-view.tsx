"use client";

import type { FormEvent } from "react";
import { cashPeriodBalance, cashPreset } from "@/services/cash-period";
import SalesPageHeader from "./sales-page-header";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CreditCard,
  Download,
  Filter,
  History,
  Landmark,
  Loader2,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Wallet,
  WalletCards,
  X,
  type LucideIcon,
} from "lucide-react";
import type { CashData, CashMovement } from "@/services/caixa.service";

type Filters = {
  start: string;
  end: string;
  method: string;
  account: string;
  search: string;
};
type ModalFields = { amount: string; reason: string; cashAccount: string };
type Props = {
  data: CashData | null;
  rows: CashMovement[];
  totals: Record<string, { incoming: number; outgoing: number }>;
  incoming: number;
  outgoing: number;
  filters: Filters;
  onFilter: (key: keyof Filters, value: string) => void;
  busy: boolean;
  saving: boolean;
  error: string;
  message: string;
  page: number;
  onPage: (page: number) => void;
  modal: "IN" | "OUT" | null;
  modalFields: ModalFields;
  onModalField: (key: keyof ModalFields, value: string) => void;
  onOpen: (direction: "IN" | "OUT") => void;
  onClose: () => void;
  onRefresh: () => void;
  onExport: () => void;
  onReport: () => void;
  onSave: (event: FormEvent) => void;
};
const labels: Record<string, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  BANK_TRANSFER: "Transferência",
  BANK_SLIP: "Boleto",
  OTHER: "Outros",
};
const methodIcons: Record<string, LucideIcon> = {
  CASH: Banknote,
  PIX: QrCode,
  CREDIT_CARD: CreditCard,
  DEBIT_CARD: CreditCard,
  BANK_TRANSFER: Landmark,
};
const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const field =
  "h-11 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800 px-3 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none transition focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-bg-light)] dark:border-slate-700";
const secondary =
  "inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:text-slate-200";
const primary =
  "inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--primary-color)] px-5 text-xs font-black text-white shadow-sm transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-40 shadow-lg shadow-[var(--primary-bg-light)] active:scale-95";
const surface =
  "overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm";

export default function CashView(props: Props) {
  const {
    data,
    rows,
    totals,
    incoming,
    outgoing,
    filters,
    busy,
    saving,
    error,
    message,
    page,
    modal,
    modalFields,
  } = props;
  const cashAccounts =
    data?.accounts.filter((a) => a.type === "CASH" && a.active) || [];
  const cashBalance = cashPeriodBalance(rows);
  const currentCash = modalFields.cashAccount ? cashPeriodBalance(data?.movements || [], modalFields.cashAccount) : 0;
  const entered = Number(modalFields.amount.replace(",", "."));
  const projected =
    currentCash +
    (modal === "IN" ? 1 : -1) * (Number.isFinite(entered) ? entered : 0);
  const pages = Math.max(1, Math.ceil(rows.length / 50));
  const currentRows = rows.slice((page - 1) * 50, page * 50);
  function reset() {
    props.onFilter("method", "");
    props.onFilter("account", "");
    props.onFilter("search", "");
  }
  function period(key: "today" | "yesterday" | "week" | "month") {
    const range = cashPreset(key);
    props.onFilter("start", range.start);
    props.onFilter("end", range.end);
  }
  const cards = [
    {
      label: "Dinheiro no período",
      value: cashBalance,
      detail: "Entradas menos saídas em dinheiro",
      icon: Wallet,
      color: "text-[var(--primary-color)]",
      background: "bg-[var(--primary-bg-light)]",
      border: "border-l-[var(--primary-color)]",
    },
    {
      label: "Entradas no período",
      value: incoming,
      detail: "Recebimentos e suprimentos",
      icon: ArrowDownLeft,
      color: "text-emerald-600 dark:text-emerald-400",
      background: "bg-emerald-50 dark:bg-emerald-950/40",
      border: "border-l-emerald-500",
    },
    {
      label: "Saídas no período",
      value: outgoing,
      detail: "Retiradas, devoluções e estornos",
      icon: ArrowUpRight,
      color: "text-rose-600 dark:text-rose-400",
      background: "bg-rose-50 dark:bg-rose-950/40",
      border: "border-l-rose-500",
    },
    {
      label: "Movimento líquido",
      value: incoming - outgoing,
      detail: "Entradas menos saídas dos filtros",
      icon: WalletCards,
      color: "text-slate-700 dark:text-slate-200",
      background: "bg-slate-100 dark:bg-slate-800",
      border: "border-l-slate-400",
    },
  ];
  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-200">
      <SalesPageHeader title="Operação de caixa" description="Acompanhe os recebimentos e controle as movimentações da loja." icon={WalletCards}>
          <button
            type="button"
            className={secondary}
            disabled={busy}
            onClick={props.onRefresh}
          >
            <RefreshCw size={16} className={busy ? "animate-spin" : ""} />
            {busy ? "Atualizando" : "Atualizar"}
          </button>
          <button
            type="button"
            className={secondary}
            disabled={!rows.length || busy}
            onClick={props.onExport}
          >
            <Download size={16} />
            Exportar CSV
          </button>
          <button type="button" className={primary} disabled={busy || !data} onClick={props.onReport}>
            <Printer size={16} />
            Relatório de caixa
          </button>
      </SalesPageHeader>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={primary}
            disabled={busy || !data}
            onClick={() => props.onOpen("IN")}
          >
            <Plus size={17} />
            Entrada em dinheiro
          </button>
          <button
            type="button"
            className={secondary}
            disabled={busy || !data}
            onClick={() => props.onOpen("OUT")}
          >
            <ArrowUpRight size={17} className="text-rose-500" />
            Retirar dinheiro
          </button>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <CalendarDays size={14} />
          Movimentações por data de recebimento
        </span>
      </div>
      {error && !modal && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700"
        >
          <CircleAlert size={18} className="shrink-0" />
          {error}
        </div>
      )}
      {message && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700"
        >
          <CheckCircle2 size={18} />
          {message}
        </div>
      )}
      <section
        aria-label="Resumo do caixa"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {cards.map(
          ({ label, value, detail, icon: Icon, color, background, border }) => (
            <article
              key={label}
              className={`${surface} border-l-4 p-4 ${border}`}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {label}
                </h2>
                <span className={`rounded-xl p-2 ${background} ${color}`}>
                  <Icon size={19} />
                </span>
              </div>
              <p className={`mt-3 text-2xl font-black tabular-nums ${color}`}>
                {data ? money(value) : "—"}
              </p>
              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">{detail}</p>
            </article>
          ),
        )}
      </section>
      <section className={surface} aria-label="Filtros de movimentação">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <SlidersHorizontal
              size={17}
              className="text-[var(--primary-color)]"
            />
            Filtros da movimentação
          </h2>
          <div className="flex flex-wrap gap-1">
            {[
              ["today", "Hoje"],
              ["yesterday", "Ontem"],
              ["week", "Últimos 7 dias"],
              ["month", "Este mês"],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  period(key as "today" | "yesterday" | "week" | "month")
                }
                className="rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 transition hover:bg-[var(--primary-bg-light)] hover:text-[var(--primary-color)]"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1.3fr_1.3fr_1.7fr]">
          <label className="space-y-1.5">
            <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
              Data inicial
            </span>
            <input
              className={field}
              type="date"
              value={filters.start}
              max={filters.end || undefined}
              onChange={(e) => props.onFilter("start", e.target.value)}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
              Data final
            </span>
            <input
              className={field}
              type="date"
              value={filters.end}
              min={filters.start || undefined}
              onChange={(e) => props.onFilter("end", e.target.value)}
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
              Forma de pagamento
            </span>
            <select
              className={field}
              value={filters.method}
              onChange={(e) => props.onFilter("method", e.target.value)}
            >
              <option value="">Todas as formas</option>
              {Object.entries(labels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5">
            <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
              Conta / caixa
            </span>
            <select
              className={field}
              value={filters.account}
              onChange={(e) => props.onFilter("account", e.target.value)}
            >
              <option value="">Todas as contas</option>
              {data?.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1.5 sm:col-span-2 xl:col-span-1">
            <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
              Pesquisar movimentação
            </span>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-3.5 text-slate-400"
              />
              <input
                className={`${field} pl-9 pr-8`}
                placeholder="Venda, cliente, operador…"
                value={filters.search}
                onChange={(e) => props.onFilter("search", e.target.value)}
              />
              {filters.search && (
                <button
                  type="button"
                  aria-label="Limpar pesquisa"
                  onClick={() => props.onFilter("search", "")}
                  className="absolute right-2 top-3 text-slate-400"
                >
                  <X size={17} />
                </button>
              )}
            </div>
          </label>
        </div>
        {(filters.method || filters.account || filters.search) && (
          <div className="flex justify-end px-4 pb-3">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary-color)]"
            >
              <X size={13} />
              Limpar filtros de busca
            </button>
          </div>
        )}
      </section>
      <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className={`${surface} min-w-0`} aria-busy={busy}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <History size={19} className="text-[var(--primary-color)]" />
              <h2 className="text-sm font-black">Histórico de movimentações</h2>
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {rows.length}
              </span>
            </div>
            <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
              {busy ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Atualizando registros
                </>
              ) : (
                "Entradas e saídas confirmadas"
              )}
            </span>
          </div>
          {!rows.length ? (
            <div className="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center">
              <span className="mb-4 rounded-3xl bg-slate-50/75 dark:bg-slate-800/50 p-4 text-slate-300 dark:bg-slate-800">
                {busy ? (
                  <Loader2 size={32} className="animate-spin" />
                ) : (
                  <WalletCards size={32} />
                )}
              </span>
              <h3 className="font-bold text-slate-700 dark:text-slate-200">
                {busy
                  ? "Buscando movimentações"
                  : error
                    ? "Não foi possível carregar o caixa"
                    : "Nenhuma movimentação encontrada"}
              </h3>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
                {busy
                  ? "Aguarde enquanto consultamos os registros do período."
                  : error
                    ? "Tente atualizar para consultar as movimentações novamente."
                    : "Ajuste o período ou os filtros para consultar outros registros."}
              </p>
              {!busy && (
                <button
                  type="button"
                  className={`${secondary} mt-5`}
                  onClick={
                    error
                      ? props.onRefresh
                      : () => {
                          reset();
                          period("month");
                        }
                  }
                >
                  {error ? <RefreshCw size={15} /> : <Filter size={15} />}
                  {error ? "Tentar novamente" : "Ver movimentações deste mês"}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[790px] text-left text-xs">
                  <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Data / hora</th>
                      <th className="px-4 py-3">Movimentação</th>
                      <th className="px-4 py-3">Forma / conta</th>
                      <th className="px-4 py-3">Operador</th>
                      <th className="px-4 py-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {currentRows.map((row) => {
                      const Icon = methodIcons[row.method] || Wallet;
                      return (
                        <tr
                          key={row.id}
                          className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                        >
                          <td className="whitespace-nowrap px-4 py-4">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                              {new Date(row.date).toLocaleDateString("pt-BR")}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              {new Date(row.date).toLocaleTimeString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </td>
                          <td className="max-w-72 px-4 py-4">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[9px] font-black ${row.direction === "IN" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"}`}
                            >
                              {row.direction === "IN" ? (
                                <ArrowDownLeft size={11} />
                              ) : (
                                <ArrowUpRight size={11} />
                              )}
                              {row.kind}
                            </span>
                            <p className="mt-1.5 break-words text-xs font-semibold text-slate-700 dark:text-slate-200">
                              {row.description}
                            </p>
                            {(row.orderNumber || row.customer) && (
                              <p className="mt-1 text-[11px] text-slate-400">
                                {row.orderNumber
                                  ? `Venda #${row.orderNumber}`
                                  : ""}
                                {row.customer ? ` · ${row.customer}` : ""}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 dark:text-slate-200">
                              <Icon size={14} className="text-slate-400" />
                              {labels[row.method] || row.method}
                            </span>
                            <p className="mt-1 text-[11px] text-slate-400">
                              {row.accountName}
                            </p>
                          </td>
                          <td className="px-4 py-4 text-xs text-slate-500 dark:text-slate-400">
                            {row.operator || "—"}
                          </td>
                          <td
                            className={`whitespace-nowrap px-4 py-4 text-right text-sm font-black tabular-nums ${row.direction === "IN" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                          >
                            {row.direction === "IN" ? "+" : "−"}{" "}
                            {money(row.amount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
                {currentRows.map((row) => (
                  <article key={row.id} className="space-y-2 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`text-[10px] font-black ${row.direction === "IN" ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        {row.kind}
                      </span>
                      <strong
                        className={`whitespace-nowrap text-sm tabular-nums ${row.direction === "IN" ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        {row.direction === "IN" ? "+" : "−"} {money(row.amount)}
                      </strong>
                    </div>
                    <p className="text-sm font-semibold">{row.description}</p>
                    {row.orderNumber && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Venda #{row.orderNumber} · {row.customer}
                      </p>
                    )}
                    <div className="flex flex-wrap justify-between gap-2 text-[11px] text-slate-400">
                      <span>
                        {labels[row.method] || row.method} · {row.accountName}
                      </span>
                      <time>{new Date(row.date).toLocaleString("pt-BR")}</time>
                    </div>
                    {row.operator && (
                      <p className="text-[11px] text-slate-400">
                        Operador: {row.operator}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </>
          )}
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-3 dark:border-slate-800">
            <p className="text-[11px] text-slate-400">
              {rows.length
                ? `${(page - 1) * 50 + 1}–${Math.min(page * 50, rows.length)} de ${rows.length} registros`
                : "0 registros"}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Página anterior"
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-2 text-slate-500 dark:text-slate-400 disabled:opacity-30 dark:border-slate-700"
                disabled={page <= 1}
                onClick={() => props.onPage(page - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {page} / {pages}
              </span>
              <button
                type="button"
                aria-label="Próxima página"
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-2 text-slate-500 dark:text-slate-400 disabled:opacity-30 dark:border-slate-700"
                disabled={page >= pages}
                onClick={() => props.onPage(page + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </footer>
        </section>
        <aside className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-1">
          <section className={surface}>
            <div className="flex items-center gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
              <CreditCard size={18} className="text-[var(--primary-color)]" />
              <h2 className="text-sm font-black">Por forma de pagamento</h2>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 px-4">
              {Object.entries(totals).length ? (
                Object.entries(totals).map(([key, value]) => {
                  const Icon = methodIcons[key] || Wallet;
                  return (
                    <div key={key} className="py-4">
                      <div className="flex items-center gap-2">
                        <span className="rounded-xl bg-slate-50/75 dark:bg-slate-800/50 p-2 text-slate-400 dark:bg-slate-800">
                          <Icon size={16} />
                        </span>
                        <span className="flex-1 text-xs font-bold">
                          {labels[key] || key}
                        </span>
                        <strong className="text-xs tabular-nums">
                          {money((value.incoming - value.outgoing) / 100)}
                        </strong>
                      </div>
                      <div className="mt-2 flex justify-between gap-2 text-[10px]">
                        <span className="text-emerald-600">
                          Entradas {money(value.incoming / 100)}
                        </span>
                        <span className="text-rose-500">
                          Saídas {money(value.outgoing / 100)}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="py-8 text-center text-xs leading-6 text-slate-400">
                  Os totais por forma de pagamento aparecerão aqui.
                </p>
              )}
            </div>
            <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-[10px] leading-5 text-slate-400 dark:border-slate-800">
              Valores líquidos conforme o período e os filtros selecionados.
            </div>
          </section>
          <section className={surface}>
            <div className="flex items-center gap-2 border-b border-slate-100 p-4 dark:border-slate-800">
              <Banknote size={18} className="text-[var(--primary-color)]" />
              <h2 className="text-sm font-black">Caixas em dinheiro</h2>
            </div>
            <div className="space-y-3 p-4">
              {cashAccounts.length ? (
                cashAccounts.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {a.name}
                      </p>
                      <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Ativo
                      </span>
                    </div>
                    <p className="mt-2 text-xl font-black tabular-nums text-slate-800 dark:text-slate-100 dark:text-white">
                      {money(cashPeriodBalance(rows, a.id))}
                    </p>
                  </div>
                ))
              ) : (
                <p className="py-3 text-xs leading-6 text-slate-400">
                  A primeira entrada criará o caixa da loja com saldo inicial
                  zero.
                </p>
              )}
              <p className="text-[10px] leading-5 text-slate-400">
                Somente movimentações em dinheiro do período selecionado, sem saldo anterior. Pix e cartões aparecem nos respectivos totais.
              </p>
            </div>
          </section>
        </aside>
      </div>
      {modal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving)
              props.onClose();
          }}
        >
          <form
            onSubmit={props.onSave}
            onKeyDown={(event) => {
              if (event.key === "Escape" && !saving) props.onClose();
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cash-operation-title"
            className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl"
          >
            <header className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
              <div className="flex items-start gap-3">
                <span
                  className={`rounded-xl p-2.5 ${modal === "IN" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}
                >
                  {modal === "IN" ? (
                    <ArrowDownLeft size={23} />
                  ) : (
                    <ArrowUpRight size={23} />
                  )}
                </span>
                <div>
                  <h2 id="cash-operation-title" className="text-lg font-black">
                    {modal === "IN"
                      ? "Entrada em dinheiro"
                      : "Retirada de dinheiro"}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {modal === "IN"
                      ? "Registre um suprimento no caixa da loja."
                      : "Registre uma sangria no caixa da loja."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Fechar operação"
                disabled={saving}
                onClick={props.onClose}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-40"
              >
                <X size={19} />
              </button>
            </header>
            <div className="space-y-4 overflow-y-auto p-5">
              {error && (
                <p
                  role="alert"
                  className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-600"
                >
                  <CircleAlert size={17} />
                  {error}
                </p>
              )}
              <label className="block space-y-1.5">
                <span className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400">
                  Caixa de movimentação
                </span>
                <select
                  className={field}
                  value={modalFields.cashAccount}
                  disabled={saving}
                  onChange={(e) =>
                    props.onModalField("cashAccount", e.target.value)
                  }
                >
                  {!cashAccounts.length && (
                    <option value="">Criar CAIXA LOJA</option>
                  )}
                  {cashAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-100 bg-slate-50/75 dark:bg-slate-800/50 p-3 dark:border-slate-800">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Disponível agora
                  </p>
                  <p className="mt-1 text-lg font-black tabular-nums">
                    {money(currentCash)}
                  </p>
                </div>
                <div className="border-l border-slate-200 dark:border-slate-800 pl-3 dark:border-slate-700">
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Após a operação
                  </p>
                  <p
                    className={`mt-1 text-lg font-black tabular-nums ${projected < 0 ? "text-rose-600" : "text-[var(--primary-color)]"}`}
                  >
                    {money(projected)}
                  </p>
                </div>
              </div>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400">
                  Valor da {modal === "IN" ? "entrada" : "retirada"}{" "}
                  <span className="text-red-500">*</span>
                </span>
                <div className="relative">
                  <span className="absolute left-3 top-3 font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    autoFocus
                    required
                    type="number"
                    min="0.01"
                    max="99999999.99"
                    step="0.01"
                    placeholder="0,00"
                    className={`${field} h-14 pl-10 text-right text-xl font-black`}
                    value={modalFields.amount}
                    disabled={saving}
                    onChange={(e) =>
                      props.onModalField("amount", e.target.value)
                    }
                  />
                </div>
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400">
                  Motivo da operação <span className="text-red-500">*</span>
                </span>
                <textarea
                  required
                  minLength={3}
                  maxLength={500}
                  rows={3}
                  placeholder={
                    modal === "IN"
                      ? "Ex.: suprimento de troco para o atendimento"
                      : "Ex.: retirada para pagamento de despesa"
                  }
                  className={`${field} h-auto resize-none py-3`}
                  value={modalFields.reason}
                  disabled={saving}
                  onChange={(e) => props.onModalField("reason", e.target.value)}
                />
                <span className="block text-right text-[10px] text-slate-400">
                  {modalFields.reason.length}/500
                </span>
              </label>
              <p className="rounded-xl bg-[var(--primary-bg-light)] p-3 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                O saldo será atualizado e o operador ficará registrado no
                histórico. Para corrigir um lançamento, registre a operação de
                sentido contrário com o motivo.
              </p>
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/75 dark:bg-slate-800/50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
              <button
                type="button"
                className={secondary}
                disabled={saving}
                onClick={props.onClose}
              >
                Cancelar
              </button>
              <button type="submit" className={primary} disabled={saving}>
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                {saving ? "Registrando…" : "Registrar operação"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </div>
  );
}
