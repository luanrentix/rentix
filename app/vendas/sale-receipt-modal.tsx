"use client";
import { authorizeAction } from "@/services/authorize-action";

import { useEffect, useMemo, useRef, useState } from "react";
import { Printer, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getCachedCompanySettings } from "@/services/settings-cache";
import {
  buildSalesReceipt,
  type SalesReceiptFormat,
} from "@/services/sales-receipt";
import {
  getSalesOrderDetails,
  type SalesOrder,
} from "@/services/vendas.service";

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
  const [styleNonce, setStyleNonce] = useState("");
  const [format, setFormat] = useState<SalesReceiptFormat>("a4");
  const [printError, setPrintError] = useState("");
  const [printAuthorized, setPrintAuthorized] = useState(false);
  const [authorizingPrint, setAuthorizingPrint] = useState(true);
  const [authorizationError, setAuthorizationError] = useState("");
  const [authorizationAttempt, setAuthorizationAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setPrintAuthorized(false);
    setAuthorizingPrint(true);
    setAuthorizationError("");
    authorizeAction("sales", "print")
      .then((result) => {
        if (!active) return;
        if (!result.allowed)
          throw new Error("Usuário sem permissão para imprimir.");
        setPrintAuthorized(true);
      })
      .catch((cause) => {
        if (active)
          setAuthorizationError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível autorizar a impressão.",
          );
      })
      .finally(() => {
        if (active) setAuthorizingPrint(false);
      });
    return () => {
      active = false;
    };
  }, [order.id, user?.id, user?.companyId, authorizationAttempt]);
  const isQuote = order.saleType === "ORCAMENTO";
  const canChooseFormat = !isQuote && order.saleType !== "CONDICIONAL";
  const needsCustomer = isQuote || order.saleType === "CONDICIONAL";
  const [customer, setCustomer] = useState(order.customer);
  const [loadingCustomer, setLoadingCustomer] = useState(needsCustomer);
  const [validUntil, setValidUntil] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const formatStorageKey = `contrx:sales-receipt-format:v1:${user?.companyId || "local"}`;
  const formStorageKey =
    user?.companyId && user.id
      ? `contrx:sales-receipt-form:v1:${user.companyId}:${order.id}`
      : null;
  const quoteLoading = needsCustomer && loadingCustomer;
  useEffect(() => {
    const nonce = document.querySelector<HTMLMetaElement>(
      'meta[name="csp-nonce"]',
    )?.content;
    setStyleNonce(nonce || "");
  }, []);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(formatStorageKey);
      if (saved === "a4" || saved === "thermal44") setFormat(saved);
    } catch {
      // Preferência local indisponível; mantém A4 como padrão.
    }
  }, [formatStorageKey]);
  useEffect(() => {
    if (!formStorageKey) return;
    try {
      const saved = window.localStorage.getItem(formStorageKey);
      if (!saved) return;
      const draft = JSON.parse(saved) as {
        validUntil?: string;
        deliveryAddress?: string;
      };
      setValidUntil(draft.validUntil || "");
      setDeliveryAddress(draft.deliveryAddress || "");
    } catch {
      // Um rascunho local inválido não impede a emissão do comprovante.
    }
  }, [formStorageKey]);
  useEffect(() => {
    try {
      window.localStorage.setItem(formatStorageKey, format);
    } catch {
      // A impressão continua disponível mesmo sem armazenamento local.
    }
  }, [formatStorageKey, format]);
  function saveQuoteDraft(next: {
    validUntil: string;
    deliveryAddress: string;
  }) {
    setValidUntil(next.validUntil);
    setDeliveryAddress(next.deliveryAddress);
    if (!formStorageKey) return;
    try {
      window.localStorage.setItem(formStorageKey, JSON.stringify(next));
    } catch {
      // A impressão continua disponível mesmo sem armazenamento local.
    }
  }
  useEffect(() => {
    let active = true;
    setCustomer(order.customer);
    setLoadingCustomer(needsCustomer);
    if (needsCustomer) {
      getSalesOrderDetails(order.id)
        .then((details) => {
          if (active) {
            setReady(false);
            setCustomer(details.customer ?? null);
          }
        })
        .catch(() => {
          if (active)
            setPrintError(
              "Não foi possível carregar o endereço do cliente. Feche e abra o documento para tentar novamente.",
            );
        })
        .finally(() => {
          if (active) setLoadingCustomer(false);
        });
    }
    return () => {
      active = false;
    };
  }, [order, needsCustomer]);
  const html = useMemo(
    () =>
      buildSalesReceipt(
        { ...order, customer },
        getCachedCompanySettings(user?.companyId) || {},
        tender,
        { validUntil, deliveryAddress },
        format,
        styleNonce,
      ),
    [
      order,
      customer,
      user?.companyId,
      tender,
      validUntil,
      deliveryAddress,
      format,
      styleNonce,
    ],
  );
  function print() {
    try {
      if (!printAuthorized || !ready || quoteLoading) return;
      if (!frame.current?.contentWindow)
        throw new Error(
          "O comprovante ainda não está pronto. Feche e abra o documento novamente.",
        );
      frame.current.contentWindow.focus();
      frame.current.contentWindow.print();
      setPrintError("");
    } catch (cause) {
      setPrintError(
        cause instanceof Error
          ? cause.message
          : "A venda está gravada. Clique em Imprimir para abrir a impressão novamente.",
      );
    }
  }
  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={isQuote ? "Imprimir orçamento" : "Imprimir comprovante"}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            onClose();
          }
        }}
        className="flex h-[96dvh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <header className="flex justify-end border-b px-3 py-2">
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
        {canChooseFormat && (
          <div className="border-b bg-slate-50 px-4 py-2 dark:bg-slate-800">
            <fieldset className="flex flex-wrap items-center gap-2">
              <legend className="sr-only">Formato de impressão</legend>
              {(
                [
                  ["a4", "Folha A4"],
                  ["thermal44", "Térmica 44 mm"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm font-bold ${format === value ? "border-orange-500 bg-orange-50 text-orange-900" : "border-slate-300 bg-white text-slate-700"}`}
                >
                  <input
                    type="radio"
                    name="receipt-format"
                    value={value}
                    checked={format === value}
                    onChange={() => {
                      setReady(false);
                      setPrintError("");
                      setFormat(value);
                    }}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
          </div>
        )}
        {isQuote && (
          <div className="grid gap-3 border-b bg-slate-50 p-3 dark:bg-slate-800 sm:grid-cols-[180px_1fr]">
            <label className="text-xs font-bold">
              Válido até (opcional)
              <input
                type="date"
                value={validUntil}
                onChange={(event) => {
                  setReady(false);
                  saveQuoteDraft({
                    validUntil: event.target.value,
                    deliveryAddress,
                  });
                }}
                className="mt-1 block w-full rounded-lg border bg-white p-2 text-sm text-slate-900"
              />
            </label>
            <label className="text-xs font-bold">
              Endereço de entrega (opcional)
              <input
                value={deliveryAddress}
                maxLength={500}
                placeholder="Informe se houver entrega"
                onChange={(event) => {
                  setReady(false);
                  saveQuoteDraft({
                    validUntil,
                    deliveryAddress: event.target.value,
                  });
                }}
                className="mt-1 block w-full rounded-lg border bg-white p-2 text-sm text-slate-900"
              />
            </label>
          </div>
        )}
        {quoteLoading && (
          <p role="status" className="p-3 text-sm">
            Carregando dados do orçamento…
          </p>
        )}
        {printError && (
          <p
            role="alert"
            className="m-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"
          >
            {printError}
          </p>
        )}
        {authorizationError && (
          <div
            role="alert"
            className="m-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"
          >
            {authorizationError}
            <button
              type="button"
              className="ml-2 font-bold underline"
              onClick={() => setAuthorizationAttempt((attempt) => attempt + 1)}
            >
              Tentar autorizar novamente
            </button>
          </div>
        )}
        <iframe
          key={`${format}:${styleNonce}`}
          ref={frame}
          title={`${isQuote ? "Orçamento" : "Recibo do pedido"} ${order.number}`}
          srcDoc={html}
          onLoad={() => setReady(true)}
          className="min-h-0 w-full flex-1 bg-white dark:bg-slate-900"
        />
        <footer className="flex flex-wrap justify-end gap-2 border-t bg-slate-50 p-4">
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
            disabled={
              !ready || quoteLoading || !printAuthorized || authorizingPrint
            }
            className="inline-flex items-center gap-2 rounded-2xl bg-[var(--primary-color)] px-5 py-3 text-xs font-black text-white shadow-lg shadow-[var(--primary-bg-light)] transition hover:bg-[var(--primary-hover)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer size={17} />
            {authorizingPrint
              ? "Autorizando impressão..."
              : format === "thermal44"
                ? "Imprimir térmica 44 mm"
                : "Imprimir A4"}
          </button>
        </footer>
      </section>
    </div>
  );
}
