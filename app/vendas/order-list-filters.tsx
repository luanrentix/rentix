"use client";

export type OrderListFilters = { startDate: string; endDate: string; status: string };
export const emptyOrderFilters: OrderListFilters = { startDate: "", endDate: "", status: "" };

export default function OrderListFilterBar({ search, onSearch, value, onChange, category, onRefresh }: {
  search: string; onSearch: (value: string) => void; value: OrderListFilters;
  onChange: (value: OrderListFilters) => void; category: string; onRefresh: () => void;
}) {
  const input = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white";
  function period(days: number | "month" | "all") {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Manaus", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const start = new Date(`${today}T12:00:00Z`);
    if (days === "all") { onChange({ ...value, startDate: "", endDate: "" }); return; }
    if (days === "month") start.setUTCDate(1);
    else start.setUTCDate(start.getUTCDate() - days + 1);
    onChange({ ...value, startDate: start.toISOString().slice(0, 10), endDate: today });
  }
  return <div className="space-y-3 border-b border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/30">
    <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(240px,2fr)_1fr_1fr_1fr]">
      <label className="text-xs font-bold">Buscar documentos<input type="search" maxLength={120} className={input} value={search} onChange={event => onSearch(event.target.value)} placeholder="Número, cliente ou vendedor" onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); onSearch(""); } }} /></label>
      <label className="text-xs font-bold">Data inicial<input type="date" className={input} value={value.startDate} max={value.endDate || "9999-12-31"} onChange={event => onChange({ ...value, startDate: event.target.value })} /></label>
      <label className="text-xs font-bold">Data final<input type="date" className={input} value={value.endDate} min={value.startDate || undefined} max="9999-12-31" onChange={event => onChange({ ...value, endDate: event.target.value })} /></label>
      <label className="text-xs font-bold">Situação<select className={input} value={value.status} disabled={category === "ATIVAS"} onChange={event => onChange({ ...value, status: event.target.value })}>
        <option value="">{category === "ATIVAS" ? "Em andamento" : "Todas da categoria"}</option>
        {category !== "GRAVADAS" && <option value="EM_ANDAMENTO">Em andamento</option>}
        <option value="CONCLUIDA">Concluída</option>
        {category === "GRAVADAS" && <><option value="CANCELADA">Cancelada</option><option value="ESTORNADA">Estornada</option></>}
      </select></label>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs text-slate-500">Período:</span>
      {([[1, "Hoje"], [7, "Últimos 7 dias"], [30, "Últimos 30 dias"], ["month", "Este mês"], ["all", "Todo o período"]] as const).map(([days, label]) => <button key={label} type="button" onClick={() => period(days)} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold hover:border-orange-400 dark:border-slate-700 dark:bg-slate-900">{label}</button>)}
      <button type="button" onClick={() => { onSearch(""); onChange(emptyOrderFilters); }} className="px-2 py-1.5 text-xs font-bold text-[var(--primary-color)]">Limpar filtros</button>
      <button type="button" onClick={onRefresh} className="ml-auto rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold dark:border-slate-700">Atualizar</button>
    </div>
    <p className="text-xs text-slate-500 dark:text-slate-400">Data de criação · horário de Manaus. Combine palavras do cliente e do vendedor ou informe o número com #.</p>
    {value.startDate && value.endDate && value.startDate > value.endDate && <p role="alert" className="text-sm text-red-600">A data inicial deve ser anterior ou igual à final.</p>}
  </div>;
}
