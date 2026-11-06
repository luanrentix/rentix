"use client";
import { useEffect, useState } from "react";
import { api } from "@/services/api";

type Values = Record<string, number | null>;
type Entry = { id: string; actorName: string | null; createdAt: string; previous: Values | null; current: Values };
type Result = { records: Entry[]; nextCursor: string | null };
const labels: Record<string, string> = { purchaseCost: "Custo de compra", additionalCost: "Custos adicionais", price: "Preço de venda", promotionalPrice: "Preço promocional", markupMultiplier: "Markup" };
const format = (key: string, value: number | null | undefined) => value == null ? "—" : key === "markupMultiplier" ? `${Number(value).toLocaleString("pt-BR")}x` : Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ProductPriceHistory({ productId }: { productId: string | null }) {
  const [records, setRecords] = useState<Entry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!productId) return;
    let canceled = false;
    setLoading(true); setError("");
    api.get<Result>(`/vendas/produtos/${encodeURIComponent(productId)}/historico-precos`, { skipCache: true })
      .then(({ data }) => { if (!canceled) { setRecords(data.records); setNextCursor(data.nextCursor); } })
      .catch(() => { if (!canceled) setError("Não foi possível carregar o histórico."); })
      .finally(() => { if (!canceled) setLoading(false); });
    return () => { canceled = true; };
  }, [productId, retry]);
  async function loadMore() {
    setLoading(true); setError("");
    try {
      const { data } = await api.get<Result>(`/vendas/produtos/${encodeURIComponent(productId!)}/historico-precos?cursor=${encodeURIComponent(nextCursor!)}`, { skipCache: true });
      setRecords(current => [...current, ...data.records]); setNextCursor(data.nextCursor);
    } catch { setError("Não foi possível carregar mais registros."); }
    finally { setLoading(false); }
  }
  if (!productId) return <p className="py-8 text-center text-sm text-slate-500">O histórico estará disponível depois de gravar o produto.</p>;
  return <section className="space-y-3">
    <p className="text-xs text-slate-500">Alterações registradas a partir da implantação deste histórico, incluindo preços herdados da matriz.</p>
    {error && <div role="alert" className="text-sm text-red-600">{error} <button type="button" onClick={() => setRetry(value => value + 1)} className="font-semibold underline">Tentar novamente</button></div>}
    {!loading && !error && !records.length && <p className="py-8 text-center text-sm text-slate-500">Nenhuma alteração de preço registrada.</p>}
    {records.length > 0 && <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700"><table className="w-full min-w-[600px] text-left text-xs">
      <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800"><tr>{["Data e hora", "Usuário", "Campo", "Anterior", "Atual"].map(label => <th key={label} className="px-3 py-2">{label}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{records.flatMap(entry => Object.keys(labels).filter(key => !entry.previous || entry.previous[key] !== entry.current[key]).map((key, index) => <tr key={`${entry.id}-${key}`}>
        <td className="whitespace-nowrap px-3 py-2">{index === 0 ? new Date(entry.createdAt).toLocaleString("pt-BR") : ""}</td>
        <td className="px-3 py-2">{index === 0 ? entry.actorName || "Sistema" : ""}</td>
        <td className="px-3 py-2">{labels[key]}</td><td className="px-3 py-2 tabular-nums">{format(key, entry.previous?.[key])}</td><td className="px-3 py-2 font-semibold tabular-nums">{format(key, entry.current[key])}</td>
      </tr>))}</tbody>
    </table></div>}
    {loading && <p role="status" className="text-sm text-slate-500">Carregando histórico…</p>}
    {nextCursor && <button type="button" disabled={loading} onClick={() => void loadMore()} className="rounded-lg border border-[var(--primary-color)] px-3 py-2 text-xs font-semibold text-[var(--primary-color)] disabled:opacity-50">Carregar mais</button>}
  </section>;
}
