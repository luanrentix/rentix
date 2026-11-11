"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";

export default function ConfirmationModal({
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  tone = "danger",
  busyLabel = "Excluindo…",
  busy = false,
  error,
  onConfirm,
  onCancel,
  children,
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  busyLabel?: string;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    cancelRef.current?.focus();
    return () => previous?.focus();
  }, []);
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-description"
        aria-busy={busy}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            if (!busy) onCancel();
          }
          if (event.key === "Tab") {
            const buttons =
              dialogRef.current?.querySelectorAll<HTMLElement>(
                "button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]",
              );
            if (!buttons?.length) {
              event.preventDefault();
              return;
            }
            const first = buttons[0],
              last = buttons[buttons.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }
        }}
        className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-start gap-4 border-b border-slate-100 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-800/40">
          <span
            className={
              tone === "danger"
                ? "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-200 dark:bg-red-950/40 dark:ring-red-900"
                : "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary-bg-light)] text-[var(--primary-color)]"
            }
          >
            {tone === "danger" ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="confirmation-title"
              className="text-base font-black text-slate-950 dark:text-white"
            >
              {title}
            </h2>
            <p
              id="confirmation-description"
              className="mt-1 text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-400"
            >
              {description}
            </p>
          </div>
          <button
            type="button"
            aria-label="Fechar confirmação"
            disabled={busy}
            onClick={onCancel}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-200 transition hover:bg-slate-100 disabled:opacity-40 dark:bg-slate-900 dark:ring-slate-700"
          >
            <X size={16} />
          </button>
        </div>
        {children && <div className="px-5 py-4">{children}</div>}
        {error && (
          <p
            role="alert"
            className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700"
          >
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2.5 bg-slate-50/40 p-4 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-xs font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={
              "inline-flex h-10 items-center justify-center gap-2 rounded-2xl px-5 text-xs font-black text-white shadow-md transition disabled:opacity-50 dark:shadow-none " +
              (tone === "danger"
                ? "bg-red-600 shadow-red-200 hover:bg-red-700"
                : "bg-[var(--primary-color)] hover:bg-[var(--primary-hover)]")
            }
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
