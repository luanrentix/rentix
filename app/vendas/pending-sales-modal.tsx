"use client";
import { useEffect, useRef, useState } from "react";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { X } from "lucide-react";
import { getSalesOrdersPage, type SalesOrder } from "@/services/vendas.service";

export type SalesListFilter = "ATIVAS" | "ORCAMENTO" | "CONDICIONAL" | "PEDIDO";
const titles = { ATIVAS: "Em andamento", ORCAMENTO: "Orçamentos", CONDICIONAL: "Condicionais", PEDIDO: "Pedidos" };

export default function PendingSalesModal({ onClose, onOpen, hasCurrent, currentId, filter }: { filter: SalesListFilter; hasCurrent: boolean; currentId: string | null; onClose: () => void; onOpen: (order: SalesOrder) => Promise<boolean | undefined> }) {
  const title = titles[filter];
  const [rows, setRows] = useState<SalesOrder[]>([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(true);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const [more, setMore] = useState(false);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<SalesOrder | null>(null);
  const sequence = useRef(0);
  useEffect(() => {
    const current = ++sequence.current;
    setBusy(true);
    setError("");
    setRows([]);
    const timer = setTimeout(() => {
      getSalesOrdersPage({ filter, search }).then(page => {
        if (current !== sequence.current) return;
        setRows(page); setMore(page.length === 100);
      }).catch(cause => { if (current === sequence.current) setError(cause instanceof Error ? cause.message : "Falha ao carregar atendimentos."); })
        .finally(() => { if (current === sequence.current) setBusy(false); });
    }, 250);
    return () => { clearTimeout(timer); sequence.current = current + 1; };
  }, [search, retry, filter]);
  async function loadMore() {
    if (busy || !rows.length) return;
    const current = sequence.current;
    setBusy(true); setError("");
    try {
      const page = await getSalesOrdersPage({ filter, search, before: rows[rows.length - 1].number });
      if (current !== sequence.current) return;
      setRows(previous => [...previous, ...page]); setMore(page.length === 100);
    } catch (cause) { if (current === sequence.current) setError(cause instanceof Error ? cause.message : "Falha ao carregar atendimentos."); }
    finally { if (current === sequence.current) setBusy(false); }
  }
  async function resume(order: SalesOrder) {
    setOpening(true);
    try { if (await onOpen(order)) onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao abrir atendimento."); }
    finally { setOpening(false); }
  }
  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-labelledby="pending-sales-title" aria-busy={busy || opening} className="flex max-h-[85dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-700">
        <h2 id="pending-sales-title" className="text-xl font-bold">{title}</h2>
        <button type="button" aria-label={"Fechar " + title} disabled={opening} onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={22} /></button>
      </header>
      <div className="p-4"><input aria-label={"Pesquisar " + title} placeholder="Pesquisar atendimento..." disabled={opening} value={search} onChange={event => setSearch(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-transparent p-3 text-sm" /></div>
      {error && <div role="alert" className="mx-4 mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error} <button type="button" onClick={() => setRetry(value => value + 1)} className="underline">Tentar novamente</button></div>}
      <div className="min-h-40 overflow-auto px-4 pb-4">
        {rows.map(order => <button type="button" key={order.id} disabled={busy || opening} onClick={async () => {
          if (hasCurrent && currentId !== order.id) { setSelected(order); return; }
          await resume(order);
        }} className="mb-2 flex w-full flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4 text-left hover:border-[var(--primary-color)] hover:bg-[var(--primary-bg-light)] disabled:opacity-50 dark:border-slate-700">
          <span><strong className="block">#{order.number} · {order.customerName}</strong><span className="text-sm text-slate-500">{order.sellerName} · {order.saleType === "ORCAMENTO" ? "Orçamento" : order.saleType === "CONDICIONAL" ? "Condicional" : order.saleType === "PEDIDO" ? "Pedido" : "Venda"}</span></span>
          <span className="font-bold">{Number(order.total).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} <span className="ml-3 text-sm text-[var(--primary-color)]">Continuar</span></span>
        </button>)}
        {!busy && !error && !rows.length && <p className="py-10 text-center text-slate-500">Nenhum atendimento encontrado nesta lista.</p>}
        {busy && <p role="status" className="p-4 text-center">Carregando atendimentos...</p>}
        {more && !error && <button type="button" disabled={busy || opening} onClick={() => void loadMore()} className="w-full rounded-lg border p-3 text-sm font-bold">Carregar mais</button>}
      </div>
    </section>
    {selected && <ConfirmationModal title="Continuar outro atendimento?" description="Os itens ainda não gravados do atendimento atual serão descartados." confirmLabel="Continuar venda selecionada" cancelLabel="Manter atendimento atual" busy={opening} busyLabel="Abrindo..." onCancel={() => { if (!opening) setSelected(null); }} onConfirm={() => { void resume(selected).then(() => setSelected(null)); }} />}
  </div>;
}
