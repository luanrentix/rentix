"use client";

import React from "react";
import {
  Contract,
  Property,
  ContrxTenant,
  formatCurrency,
  formatDate,
  getDaysUntilDate,
  getDisplayContractStatus,
} from "./contract-types";
import { ContractStatusBadge, ContractRentalTypeBadge } from "./contract-status-badge";
import {
  Eye,
  Printer,
  Edit3,
  RotateCcw,
  CheckCircle2,
  Ban,
  Clock,
  User,
  Calendar,
  Trash2,
  MessageCircle,
} from "lucide-react";

interface ContractMobileCardsProps {
  contracts: Contract[];
  properties: Property[];
  tenants: ContrxTenant[];
  onOpenDetails: (contract: Contract) => void;
  onPrintContract: (contract: Contract) => void;
  onShareWhatsApp?: (contract: Contract) => void;
  onEdit: (contract: Contract) => void;
  onRenew: (contract: Contract) => void;
  onFinish: (contract: Contract) => void;
  onCancel: (contract: Contract) => void;
  onDelete: (contract: Contract) => void;
}

export function ContractMobileCards({
  contracts,
  properties,
  tenants,
  onOpenDetails,
  onPrintContract,
  onShareWhatsApp,
  onEdit,
  onRenew,
  onFinish,
  onCancel,
  onDelete,
}: ContractMobileCardsProps) {
  if (contracts.length === 0) return null;

  return (
    <div className="space-y-3.5 lg:hidden">
      {contracts.map((contract) => {
        const displayStatus = getDisplayContractStatus(contract);
        const property = properties.find((p) => String(p.id) === String(contract.propertyId));
        const tenant = tenants.find((t) => String(t.id) === String(contract.tenantId));

        const daysUntilStart = contract.startDate ? getDaysUntilDate(contract.startDate) : 0;
        const daysUntilEnd = getDaysUntilDate(contract.endDate);
        const canRenew = ["Active", "Expiring", "Expired", "Inactive", "Scheduled"].includes(displayStatus);
        const canFinish = !["Finished", "Deleted", "Canceled"].includes(displayStatus);
        const canCancel = !["Deleted", "Canceled", "Finished"].includes(displayStatus);
        const canDelete = displayStatus !== "Deleted";

        return (
          <div
            key={contract.id}
            className={`rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition ${
              contract.status === "Finished" || contract.status === "Canceled"
                ? "bg-slate-50/50 opacity-80"
                : ""
            }`}
          >
            {/* Cabeçalho do Card */}
            <div className="flex items-start justify-between gap-3">
              <div
                className="group flex flex-col cursor-pointer"
                onClick={() => onOpenDetails(contract)}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDetails(contract);
                  }}
                  className="block text-left text-sm uppercase font-black text-slate-800 hover:text-orange-600 hover:underline transition-all duration-150 cursor-pointer"
                  title="Clique para ver detalhes do contrato"
                >
                  {contract.propertyName || property?.name || "BEM NÃO IDENTIFICADO"}
                </button>
                <span className="text-xs font-semibold text-slate-500">
                  {property?.city && property?.state
                    ? `${property.city}/${property.state}`
                    : property?.street || "Localização não cadastrada"}
                </span>
              </div>

              <ContractStatusBadge
                status={displayStatus}
                onClick={() => onOpenDetails(contract)}
              />
            </div>

            {/* Dados do Inquilino e Modalidade */}
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-bold text-slate-900 truncate max-w-[180px]">
                  {contract.tenantName || tenant?.name || "Não informado"}
                </span>
              </div>
              <ContractRentalTypeBadge isTemporaryRental={contract.isTemporaryRental} />
            </div>

            {/* Vigência e Valor */}
            <div className="mt-2.5 grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-2.5 text-xs">
              <div>
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Vigência
                </span>
                <span className="mt-0.5 flex items-center gap-1 font-bold text-slate-800">
                  <Calendar className="h-3 w-3 text-slate-400" />
                  {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                </span>
                {displayStatus === "Scheduled" ? (
                  <span className="mt-0.5 flex items-center gap-1 text-[11px] font-black text-sky-600">
                    <Calendar className="h-3 w-3" />
                    {daysUntilStart === 1 ? "Inicia amanhã" : `Inicia em ${daysUntilStart}d`}
                  </span>
                ) : displayStatus === "Expiring" ? (
                  <span className="mt-0.5 flex items-center gap-1 text-[11px] font-black text-amber-600">
                    <Clock className="h-3 w-3" />
                    Vence em {daysUntilEnd}d
                  </span>
                ) : displayStatus === "Expired" ? (
                  <span className="mt-0.5 block text-[11px] font-black text-rose-600">
                    Vencido há {Math.abs(daysUntilEnd)}d
                  </span>
                ) : displayStatus === "Active" ? (
                  <span className="mt-0.5 block text-[11px] text-slate-400">
                    {contract.isTemporaryRental
                      ? daysUntilEnd === 0
                        ? "Check-out hoje"
                        : daysUntilEnd === 1
                        ? "Check-out amanhã"
                        : `${daysUntilEnd}d restantes`
                      : daysUntilEnd > 0
                      ? `${daysUntilEnd}d restantes`
                      : "Último dia"}
                  </span>
                ) : null}
              </div>

              <div className="text-right">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Valor {contract.isTemporaryRental ? "Total" : "Aluguel"}
                </span>
                <span className="mt-0.5 block text-sm font-black text-slate-900">
                  {formatCurrency(contract.rentValue)}
                </span>
              </div>
            </div>

            {/* Ações Mobile */}
            <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => onOpenDetails(contract)}
                title="Ficha 360°"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
              >
                <Eye className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => onPrintContract(contract)}
                title="Imprimir Minuta"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-orange-50 hover:text-orange-600"
              >
                <Printer className="h-4 w-4" />
              </button>

              {onShareWhatsApp && (
                <button
                  type="button"
                  onClick={() => onShareWhatsApp(contract)}
                  title="Enviar via WhatsApp"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100"
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => onEdit(contract)}
                title="Editar"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-orange-50 hover:text-orange-600"
              >
                <Edit3 className="h-4 w-4" />
              </button>

              {canRenew && (
                <button
                  type="button"
                  onClick={() => onRenew(contract)}
                  title="Renovar"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              )}

              {canFinish && (
                <button
                  type="button"
                  onClick={() => onFinish(contract)}
                  title="Finalizar"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 transition hover:bg-blue-100"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </button>
              )}

              {canCancel && (
                <button
                  type="button"
                  onClick={() => onCancel(contract)}
                  title="Cancelar"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                >
                  <Ban className="h-4 w-4" />
                </button>
              )}

              {canDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(contract)}
                  title="Excluir Contrato"
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 transition hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
