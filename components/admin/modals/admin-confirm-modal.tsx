"use client";

import React from "react";
import { AlertTriangle, X } from "lucide-react";
import type { ConfirmationDialogState } from "../admin-types";

interface AdminConfirmModalProps {
  dialog: ConfirmationDialogState | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AdminConfirmModal({
  dialog,
  onConfirm,
  onCancel,
}: AdminConfirmModalProps) {
  if (!dialog) return null;

  const isDanger = dialog.tone === "danger";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start gap-4 border-b border-slate-100 bg-slate-50/70 p-5">
          <span
            className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
              isDanger
                ? "bg-red-50 text-red-600 ring-1 ring-red-200"
                : "bg-orange-50 text-orange-600 ring-1 ring-orange-200"
            }`}
          >
            <AlertTriangle className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black text-slate-950">
              {dialog.title}
            </h2>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">
              {dialog.message}
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-200 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col-reverse gap-2.5 p-4 sm:flex-row sm:justify-end bg-slate-50/40">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-xs font-black text-slate-700 transition hover:bg-slate-100"
          >
            {dialog.cancelLabel || "Cancelar"}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex h-10 items-center justify-center rounded-2xl px-5 text-xs font-black text-white shadow-md transition active:scale-95 ${
              isDanger
                ? "bg-red-600 hover:bg-red-700 shadow-red-200"
                : "bg-orange-600 hover:bg-orange-700 shadow-orange-200"
            }`}
          >
            {dialog.confirmLabel || "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
