"use client";

import React from "react";
import {
  Charge,
  formatCurrency,
  formatDateBR,
  Tenant,
} from "./receivable-types";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  MessageCircle,
  Edit2,
  Trash2,
  Share2,
} from "lucide-react";

interface ReceivableMobileCardsProps {
  charges: Charge[];
  tenants: Tenant[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onOpenPaymentModal: (charge: Charge) => void;
  onOpenEditModal: (charge: Charge) => void;
  onOpenDeleteModal: (charge: Charge) => void;
  onShareReport?: (charge: Charge) => void;
  getChargeRemainingAmount: (charge: Charge) => number;
  getChargePaidAmount: (charge: Charge) => number;
}

export function ReceivableMobileCards({
  charges,
  tenants,
  selectedIds,
  onToggleSelect,
  onOpenPaymentModal,
  onOpenEditModal,
  onOpenDeleteModal,
  onShareReport,
  getChargeRemainingAmount,
}: ReceivableMobileCardsProps) {
  function getTenantPhone(tenantId?: string | null): string | null {
    if (!tenantId) return null;
    const t = tenants.find((item) => item.id === tenantId);
    return t?.phone || null;
  }

  function getWhatsAppUrl(phone: string, charge: Charge) {
    const cleanPhone = phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    const msg = `Olá, ${charge.tenantName}! Lembramos sobre a fatura de locação de *${charge.propertyName}* no valor de *${formatCurrency(
      charge.amount
    )}*, com vencimento em *${formatDateBR(charge.dueDate)}*.`;
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {charges.map((charge) => {
        const remaining = getChargeRemainingAmount(charge);
        const isPaid = charge.status === "Paid";
        const isOverdue = charge.status === "Overdue";
        const tenantPhone = getTenantPhone(charge.tenantId);
        const isSelected = selectedIds.includes(charge.id);

        return (
          <div
            key={charge.id}
            className={`flex flex-col justify-between rounded-3xl border bg-white p-4 shadow-sm transition dark:border-slate-800 dark:bg-slate-900 ${
              isSelected ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-200"
            }`}
          >
            <div>
              {/* Header do Card */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(charge.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      {charge.tenantName || "Inquilino não informado"}
                    </h4>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {charge.propertyName}
                    </p>
                  </div>
                </div>

                {isPaid ? (
                  <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Recebido
                  </span>
                ) : isOverdue ? (
                  <span className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
                    <AlertTriangle className="h-3 w-3" />
                    Vencido
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                    <Clock className="h-3 w-3" />
                    Em aberto
                  </span>
                )}
              </div>

              {/* Detalhes intermediários */}
              <div className="mt-3 space-y-1.5 rounded-2xl bg-slate-50 p-3 text-xs dark:bg-slate-800/50">
                <div className="flex justify-between">
                  <span className="text-slate-400">Vencimento:</span>
                  <span
                    className={`font-black ${
                      isOverdue
                        ? "text-red-600 dark:text-red-400"
                        : "text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {formatDateBR(charge.dueDate)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-400">Parcela:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {charge.isDownPayment
                      ? "Sinal / Entrada"
                      : charge.installmentNumber && charge.installmentTotal
                      ? `${charge.installmentNumber}/${charge.installmentTotal}`
                      : "Cobrança Única"}
                  </span>
                </div>

                <div className="flex justify-between border-t border-slate-200/60 pt-1.5 dark:border-slate-700">
                  <span className="font-bold text-slate-500">Saldo a Receber:</span>
                  <span
                    className={`font-black ${
                      isPaid
                        ? "text-emerald-600"
                        : isOverdue
                        ? "text-red-600"
                        : "text-slate-900 dark:text-white"
                    }`}
                  >
                    {formatCurrency(remaining)}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações inferiores */}
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                {tenantPhone && (
                  <a
                    href={getWhatsAppUrl(tenantPhone, charge)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Cobrar
                  </a>
                )}
                {onShareReport && (
                  <button
                    type="button"
                    onClick={() => onShareReport(charge)}
                    className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    title="Link de cobrança"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onOpenEditModal(charge)}
                  className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  title="Editar"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenDeleteModal(charge)}
                  className="rounded-xl border border-slate-200 p-2 text-red-600 hover:bg-red-50 dark:border-slate-700 dark:text-red-400 dark:hover:bg-red-950/40"
                  title="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {!isPaid && (
                <button
                  type="button"
                  onClick={() => onOpenPaymentModal(charge)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Receber
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
