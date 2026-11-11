"use client";
import { authorizeAction } from "@/services/authorize-action";

import { useRef, useState } from "react";
import { Printer, X } from "lucide-react";

export default function CashReportModal({ html, onClose, title = "Relatório de caixa", permission = "sales" }: { html: string; onClose: () => void; title?: string; permission?: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  async function print() {
    try {
      await authorizeAction(permission, "print");
      if (!ready || !frame.current?.contentWindow) return;
      frame.current.contentWindow.focus();
      frame.current.contentWindow.print();
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível abrir a impressão. Tente novamente."); }
  }
  return <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
    <section role="dialog" aria-modal="true" aria-labelledby="cash-report-title" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }} className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
      <header className="flex items-center justify-between gap-3 border-b p-4"><div><h2 id="cash-report-title" className="font-black text-slate-900 dark:text-white">{title}</h2><p className="mt-1 text-xs text-slate-500">Para gerar o PDF, clique em Imprimir / PDF e escolha “Salvar como PDF” no destino da impressão.</p></div><button autoFocus type="button" aria-label="Fechar relatório" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button></header>
      {error && <p role="alert" className="m-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <iframe ref={frame} srcDoc={html} title={`Prévia: ${title}`} onLoad={() => setReady(true)} className="min-h-0 w-full flex-1 border-0 bg-white" />
      <footer className="flex justify-end gap-2 border-t p-4"><button type="button" onClick={onClose} className="rounded-xl border px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300">Fechar</button><button type="button" disabled={!ready} onClick={print} className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary-color)] px-5 py-3 text-xs font-black text-white disabled:opacity-50"><Printer size={17} />Imprimir / PDF</button></footer>
    </section>
  </div>;
}
