"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { cancelSalesOrder, reverseSalesOrder, getSalesOrdersPage, type SalesOrder } from "@/services/vendas.service";

const types: Record<string, string> = { VENDA: "Venda", CONDICIONAL: "Condicional", ORCAMENTO: "Orçamento", PEDIDO: "Pedido", TROCA: "Troca / devolução" };
const money = (value: string | number) => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const field = "w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-bg-light)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

export default function SalesReversalsPanel({ orders, onCompleted }: { orders: SalesOrder[]; onCompleted: (message: string) => Promise<void> }) {
  const [type, setType] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SalesOrder | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);
  const [documents, setDocuments] = useState(orders);
  const [loading, setLoading] = useState(false);
  const [more, setMore] = useState(false);
  useEffect(() => { let active = true; const timer = setTimeout(() => { setLoading(true); getSalesOrdersPage({ search: query, filter: type || 'ESTORNAVEIS' }).then((rows) => { if (active) { setDocuments(rows); setMore(rows.length === 100); } }).catch((cause: Error) => { if (active) setError(cause.message); }).finally(() => { if (active) setLoading(false); }); }, 250); return () => { active = false; clearTimeout(timer); }; }, [query, type]);
  async function loadMore() { if (loading || !documents.length) return; setLoading(true); try { const rows = await getSalesOrdersPage({ search: query, filter: type || 'ESTORNAVEIS', before: documents[documents.length - 1].number }); setDocuments((current) => [...current, ...rows]); setMore(rows.length === 100); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao consultar documentos.'); } finally { setLoading(false); } }
  const available = documents.filter((order) => !["ESTORNADA", "CANCELADA"].includes(order.status));
  const term = query.trim().toLocaleLowerCase("pt-BR");
  const filtered = available.filter((order) => (!type || order.saleType === type) && (!term || `${order.number} ${order.customerName}`.toLocaleLowerCase("pt-BR").includes(term)));

  async function confirm() {
    if (!selected || submitting.current) return;
    if (reason.trim().length < 3 || reason.trim().length > 300) { setError("Informe o motivo do estorno com 3 a 300 caracteres."); return; }
    submitting.current = true;
    setBusy(true); setError("");
    try {
      if (selected.status === "EM_ANDAMENTO") await cancelSalesOrder(selected.id, reason.trim());
      else await reverseSalesOrder(selected.id, reason.trim());
      await onCompleted(`${types[selected.saleType] || "Movimentação"} #${selected.number} ${selected.status === "EM_ANDAMENTO" ? "cancelada" : "estornada"} com sucesso.`);
      setDocuments((current) => current.filter((order) => order.id !== selected.id));
      setSelected(null); setReason("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível estornar a movimentação."); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <div className="space-y-5">
    <section className="flex flex-wrap items-end gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <label className="w-full space-y-1 sm:w-60"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">Tipo de movimentação</span><select className={field} value={type} onChange={(event) => setType(event.target.value)}><option value="">Todas as movimentações</option>{Object.entries(types).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="min-w-0 flex-1 space-y-1"><span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">Buscar movimentação</span><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400"/><input className={`${field} pl-9`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Número ou nome do cliente..."/></div></label>
      <span className="pb-3 text-xs text-slate-500">{filtered.length} movimentação(ões)</span>
    </section>
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="flex gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800"><RotateCcw className="h-5 w-5 shrink-0 text-[var(--primary-color)]"/><div><h2 className="text-sm font-black">Movimentações disponíveis para estorno</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Selecione a movimentação e informe o motivo. Estoque, reservas e recebimentos serão revertidos conforme o documento.</p></div></header>
      <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500 dark:bg-slate-800/50"><tr>{["Número", "Tipo", "Cliente", "Data", "Situação", "Total", "Ação"].map((name) => <th key={name} className="px-4 py-3">{name}</th>)}</tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{filtered.map((order) => <tr key={order.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40"><td className="px-4 py-3 font-bold text-[var(--primary-color)]">#{order.number}</td><td className="px-4 py-3"><span className="whitespace-nowrap rounded-lg bg-[var(--primary-bg-light)] px-2 py-1 text-xs font-bold text-[var(--primary-color)]">{types[order.saleType] || order.saleType}</span></td><td className="px-4 py-3 font-semibold">{order.customerName}</td><td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{new Date(order.createdAt).toLocaleString("pt-BR", { timeZone: "America/Manaus" })}</td><td className="px-4 py-3 text-xs">{order.status === "EM_ANDAMENTO" ? "Em andamento" : "Concluída"}</td><td className="whitespace-nowrap px-4 py-3 font-bold">{money(order.total)}</td><td className="px-4 py-3"><button type="button" onClick={() => { setSelected(order); setReason(""); setError(""); }} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"><RotateCcw className="h-3.5 w-3.5"/>Estornar</button></td></tr>)}</tbody></table></div>
      {loading && <p role="status" className="p-4">Consultando documentos…</p>}
      {more && <button type="button" disabled={loading} onClick={() => void loadMore()} className="m-4 rounded-xl border px-4 py-2">Carregar próximos documentos</button>}
      {!loading && !filtered.length && <p className="p-10 text-center text-sm text-slate-500">Nenhuma movimentação disponível para os filtros selecionados.</p>}
    </section>
    {selected && <ConfirmationModal title="Estornar movimentação" description={`${types[selected.saleType] || "Movimentação"} #${selected.number} · ${selected.customerName} · ${money(selected.total)}. ${selected.status === "EM_ANDAMENTO" ? "O documento em andamento será cancelado." : "O documento será marcado como estornado."}`} confirmLabel="Confirmar estorno" busyLabel="Estornando..." busy={busy} error={error} onConfirm={() => void confirm()} onCancel={() => { if (!busy) setSelected(null); }}>
      <p className="mb-4 text-xs leading-relaxed text-slate-500">O estorno devolve o estoque baixado, libera reservas e cancela o saldo a receber. Recebimentos históricos são preservados. A devolução de dinheiro, Pix ou cartão deve ser confirmada separadamente em Devoluções financeiras; você também pode conceder crédito. O cancelamento fiscal deve ser realizado no emissor fiscal.</p>
      <label className="block space-y-1"><span className="text-xs font-bold text-slate-600 dark:text-slate-300">Motivo do estorno <b className="text-red-600">*</b></span><textarea rows={3} maxLength={300} disabled={busy} className={field} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Descreva o motivo do estorno..."/><span className="block text-right text-[10px] text-slate-400">{reason.length}/300</span></label>
    </ConfirmationModal>}
  </div>;
}
