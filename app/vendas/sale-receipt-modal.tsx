"use client";
import { authorizeAction } from "@/services/authorize-action";

import { useMemo, useRef, useState } from "react";
import { CheckCircle2, Printer, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getCachedCompanySettings } from "@/services/settings-cache";
import { buildSalesReceipt } from "@/services/sales-receipt";
import type { SalesOrder } from "@/services/vendas.service";

export default function SaleReceiptModal({
  order,
  tender,
  onClose,
}: {
  order: SalesOrder;
  tender: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [printError, setPrintError] = useState("");
  const html = useMemo(
    () =>
      buildSalesReceipt(
        order,
        getCachedCompanySettings(user?.companyId) || {},
        tender,
      ),
    [order, user?.companyId, tender],
  );
  async function print() {
    try {
      await authorizeAction("sales", "print");
      if (!frame.current?.contentWindow) throw new Error();
      frame.current.contentWindow.focus();
      frame.current.contentWindow.print();
      setPrintError("");
    } catch (cause) {
      setPrintError(cause instanceof Error ? cause.message : 
        "A venda está gravada. Clique em Imprimir para abrir a impressão novamente.",
      );
    }
  }
  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="sale-receipt-title"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            onClose();
          }
        }}
        className="flex h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl"
      >
        <header className="flex items-center justify-between gap-3 border-b p-4">
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-emerald-50 p-2 text-emerald-600">
              <CheckCircle2 size={24} />
            </span>
            <div>
              <h2 id="sale-receipt-title" className="font-black text-slate-900 dark:text-white">
                Comprovante #{order.number}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Documento gravado. Confira e imprima o recibo / pedido.
              </p>
            </div>
          </div>
          <button
            autoFocus
            type="button"
            aria-label="Fechar comprovante"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </header>
        {printError && (
          <p
            role="alert"
            className="m-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"
          >
            {printError}
          </p>
        )}
        <iframe
          ref={frame}
          title={`Recibo do pedido ${order.number}`}
          srcDoc={html}
          onLoad={() => setReady(true)}
          className="min-h-0 w-full flex-1 bg-white dark:bg-slate-900"
        />
        <footer className="flex justify-end gap-2 border-t bg-slate-50 p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={print}
            disabled={!ready}
            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary-color)] px-5 py-3 text-xs font-black text-white shadow-lg shadow-[var(--primary-bg-light)] transition hover:bg-[var(--primary-hover)] active:scale-95"
          >
            <Printer size={17} />
            Imprimir
          </button>
        </footer>
      </section>
    </div>
  );
}
