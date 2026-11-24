"use client";

import { useSearchParams } from "next/navigation";
import { Boxes, Package } from "lucide-react";
import StockAdjustmentPanel from "./stock-adjustment-panel";
import StockBulkAdjustmentPanel from "./stock-bulk-adjustment-panel";

export default function EstoquePage() {
  const searchParams = useSearchParams();
  if (searchParams.get("view") !== "COMPRAS") return <StockBulkAdjustmentPanel />;
  return <div className="mx-auto max-w-5xl space-y-5"><header className="rounded-2xl border border-[var(--primary-border-light)] bg-[var(--primary-bg-light)] px-5 py-6 sm:px-7"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[var(--primary-color)] shadow-sm dark:bg-slate-900"><Package className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-wide text-[var(--primary-color)]">Estoque</p><h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">Compras</h1></div></div><p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">Organize aqui as entradas de mercadorias e os processos de compra.</p></header><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-3"><Boxes className="h-5 w-5 text-[var(--primary-color)]" /><p className="text-sm text-slate-500 dark:text-slate-400">A área de compras será disponibilizada em uma próxima etapa.</p></div></section></div>;
}
