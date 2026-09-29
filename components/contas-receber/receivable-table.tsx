"use client";

import React, { useState, useEffect } from "react";
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
  MoreVertical,
  Edit2,
  Trash2,
  RotateCcw,
  Printer,
  MessageCircle,
  Building2,
  Receipt,
  Eye,
  Share2,
} from "lucide-react";

interface ReceivableTableProps {
  charges: Charge[];
  tenants: Tenant[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onOpenPaymentModal: (charge: Charge) => void;
  onOpenEditModal: (charge: Charge) => void;
  onOpenDeleteModal: (charge: Charge) => void;
  onOpenReversalModal: (charge: Charge) => void;
  onPrintReceipt: (charge: Charge) => void;
  onPrintCarnet: (charge: Charge) => void;
  onShareReport: (charge: Charge) => void;
  onViewPayments: (charge: Charge) => void;
  getChargeRemainingAmount: (charge: Charge) => number;
  getChargePaidAmount: (charge: Charge) => number;
}

export function ReceivableTable({
  charges,
  tenants,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onOpenPaymentModal,
  onOpenEditModal,
  onOpenDeleteModal,
  onOpenReversalModal,
  onPrintReceipt,
  onPrintCarnet,
  onShareReport,
  onViewPayments,
  getChargeRemainingAmount,
  getChargePaidAmount,
}: ReceivableTableProps) {
  const [menuTarget, setMenuTarget] = useState<{
    charge: Charge;
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    if (!menuTarget) return;

    function handleDismiss() {
      setMenuTarget(null);
    }

    window.addEventListener("scroll", handleDismiss, true);
    window.addEventListener("resize", handleDismiss);

    return () => {
      window.removeEventListener("scroll", handleDismiss, true);
      window.removeEventListener("resize", handleDismiss);
    };
  }, [menuTarget]);

  function handleToggleMenu(
    charge: Charge,
    event: React.MouseEvent<HTMLButtonElement>
  ) {
    event.stopPropagation();
    if (menuTarget?.charge.id === charge.id) {
      setMenuTarget(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 210;
    const estimatedMenuHeight = 250;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < estimatedMenuHeight && rect.top > estimatedMenuHeight;

    const top = openUp
      ? Math.max(10, rect.top - estimatedMenuHeight - 4)
      : Math.min(window.innerHeight - estimatedMenuHeight - 10, rect.bottom + 6);

    const left = Math.min(
      Math.max(10, rect.right - menuWidth),
      window.innerWidth - menuWidth - 10
    );

    setMenuTarget({
      charge,
      top,
      left,
    });
  }

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

  const allSelected = charges.length > 0 && selectedIds.length === charges.length;

  if (charges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
        <Receipt className="h-12 w-12 text-slate-300 dark:text-slate-600" />
        <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
          Nenhuma cobrança a receber encontrada
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Tente ajustar os filtros de busca ou cadastre uma nova cobrança.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="py-4 pl-6 pr-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
              </th>
              <th className="px-3 py-4">Inquilino / Sacado</th>
              <th className="px-3 py-4">Bem / Imóvel</th>
              <th className="px-3 py-4">Parcela / Vencimento</th>
              <th className="px-3 py-4">Status</th>
              <th className="px-3 py-4 text-right">Valor Nominal</th>
              <th className="px-3 py-4 text-right">Saldo Restante</th>
              <th className="py-4 pl-3 pr-6 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {charges.map((charge) => {
              const remaining = getChargeRemainingAmount(charge);
              const paid = getChargePaidAmount(charge);
              const isPaid = charge.status === "Paid";
              const isOverdue = charge.status === "Overdue";
              const tenantPhone = getTenantPhone(charge.tenantId);
              const isSelected = selectedIds.includes(charge.id);

              return (
                <tr
                  key={charge.id}
                  className={`transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30 ${
                    isSelected ? "bg-emerald-50/30 dark:bg-emerald-950/20" : ""
                  }`}
                >
                  {/* Checkbox de Seleção */}
                  <td className="py-3.5 pl-6 pr-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(charge.id)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </td>

                  {/* Sacado / Inquilino */}
                  <td className="px-3 py-3.5">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {charge.tenantName || "Inquilino não informado"}
                    </div>
                    {tenantPhone && (
                      <a
                        href={getWhatsAppUrl(tenantPhone, charge)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                        title="Enviar cobrança pelo WhatsApp"
                      >
                        <MessageCircle className="h-3 w-3" />
                        {tenantPhone}
                      </a>
                    )}
                  </td>

                  {/* Bem / Imóvel */}
                  <td className="px-3 py-3.5">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      <span>{charge.propertyName || "Sem bem vinculado"}</span>
                    </div>
                  </td>

                  {/* Parcela e Vencimento */}
                  <td className="px-3 py-3.5">
                    <div
                      className={`font-black ${
                        isOverdue
                          ? "text-red-600 dark:text-red-400"
                          : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {formatDateBR(charge.dueDate)}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400">
                      {charge.isDownPayment
                        ? "SINAL / ENTRADA"
                        : charge.installmentNumber && charge.installmentTotal
                        ? `PARCELA ${charge.installmentNumber}/${charge.installmentTotal}`
                        : "COBRANÇA ÚNICA"}
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="px-3 py-3.5">
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Recebido
                      </span>
                    ) : isOverdue ? (
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-black text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
                        <AlertTriangle className="h-3 w-3" />
                        Vencido
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                        <Clock className="h-3 w-3" />
                        Em aberto
                      </span>
                    )}
                  </td>

                  {/* Valor Nominal */}
                  <td className="px-3 py-3.5 text-right font-bold text-slate-700 dark:text-slate-300">
                    {formatCurrency(charge.amount)}
                  </td>

                  {/* Saldo Restante */}
                  <td className="px-3 py-3.5 text-right">
                    <span
                      className={`text-sm font-black ${
                        isPaid
                          ? "text-emerald-600 dark:text-emerald-400"
                          : isOverdue
                          ? "text-red-600 dark:text-red-400"
                          : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {formatCurrency(remaining)}
                    </span>
                    {paid > 0 && (
                      <div className="text-[10px] font-bold text-slate-400">
                        Recebido: {formatCurrency(paid)}
                      </div>
                    )}
                  </td>

                  {/* Ações */}
                  <td className="py-3.5 pl-3 pr-6 text-center">
                    <div className="relative inline-flex items-center gap-1.5">
                      {!isPaid && (
                        <button
                          type="button"
                          onClick={() => onOpenPaymentModal(charge)}
                          className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white shadow-sm hover:bg-emerald-700 active:scale-95"
                          title="Efetuar recebimento desta cobrança"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Receber
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleToggleMenu(charge, e)}
                        className={`rounded-xl border p-1.5 transition ${
                          menuTarget?.charge.id === charge.id
                            ? "border-orange-500 bg-orange-50 text-orange-600 dark:border-orange-500/50 dark:bg-orange-950/40 dark:text-orange-400"
                            : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600 dark:border-slate-700 dark:hover:text-slate-200"
                        }`}
                        title="Mais opções"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Menu Flutuante Global (Livre de overflow da tabela) */}
      {menuTarget && (
        <>
          <div
            className="fixed inset-0 z-[998] bg-transparent"
            onClick={() => setMenuTarget(null)}
          />
          <div
            className="fixed z-[999] w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-800 dark:ring-white/5"
            style={{
              top: menuTarget.top,
              left: menuTarget.left,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {menuTarget.charge.payments && menuTarget.charge.payments.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const target = menuTarget.charge;
                  setMenuTarget(null);
                  onViewPayments(target);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Eye className="h-3.5 w-3.5 text-slate-400" />
                Ver histórico
              </button>
            )}

            {menuTarget.charge.status === "Paid" ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const target = menuTarget.charge;
                    setMenuTarget(null);
                    onPrintReceipt(target);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-400" />
                  Imprimir recibo
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const target = menuTarget.charge;
                    setMenuTarget(null);
                    onOpenReversalModal(target);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Estornar recebimento
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const target = menuTarget.charge;
                    setMenuTarget(null);
                    onPrintCarnet(target);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-400" />
                  Imprimir carnê
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const target = menuTarget.charge;
                    setMenuTarget(null);
                    onShareReport(target);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Share2 className="h-3.5 w-3.5 text-slate-400" />
                  Link de cobrança
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const target = menuTarget.charge;
                    setMenuTarget(null);
                    onOpenEditModal(target);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                  Editar cobrança
                </button>
              </>
            )}

            {getTenantPhone(menuTarget.charge.tenantId) && (
              <a
                href={getWhatsAppUrl(
                  getTenantPhone(menuTarget.charge.tenantId)!,
                  menuTarget.charge
                )}
                target="_blank"
                rel="noreferrer"
                onClick={() => setMenuTarget(null)}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Cobrar no WhatsApp
              </a>
            )}

            <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

            <button
              type="button"
              onClick={() => {
                const target = menuTarget.charge;
                setMenuTarget(null);
                onOpenDeleteModal(target);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir cobrança
            </button>
          </div>
        </>
      )}
    </div>
  );
}
