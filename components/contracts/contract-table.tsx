"use client";

import React, { useState, useEffect } from "react";
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
  Trash2,
  ChevronDown,
  Calendar,
  MessageCircle,
} from "lucide-react";

interface ContractTableProps {
  contracts: Contract[];
  properties: Property[];
  tenants: ContrxTenant[];
  isLoading: boolean;
  onOpenDetails: (contract: Contract) => void;
  onPrintContract: (contract: Contract) => void;
  onShareWhatsApp?: (contract: Contract) => void;
  onEdit: (contract: Contract) => void;
  onRenew: (contract: Contract) => void;
  onFinish: (contract: Contract) => void;
  onCancel: (contract: Contract) => void;
  onDelete: (contract: Contract) => void;
}

export function ContractTable({
  contracts,
  properties,
  tenants,
  isLoading,
  onOpenDetails,
  onPrintContract,
  onShareWhatsApp,
  onEdit,
  onRenew,
  onFinish,
  onCancel,
  onDelete,
}: ContractTableProps) {
  const [activeMenuContract, setActiveMenuContract] = useState<Contract | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);

  // Fecha o menu de ações ao rolar a página ou redimensionar a tela
  useEffect(() => {
    function handleCloseMenu() {
      if (activeMenuContract) {
        setActiveMenuContract(null);
        setMenuPosition(null);
      }
    }
    window.addEventListener("scroll", handleCloseMenu, true);
    window.addEventListener("resize", handleCloseMenu);
    return () => {
      window.removeEventListener("scroll", handleCloseMenu, true);
      window.removeEventListener("resize", handleCloseMenu);
    };
  }, [activeMenuContract]);

  const handleToggleMenu = (contract: Contract, event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (activeMenuContract?.id === contract.id) {
      setActiveMenuContract(null);
      setMenuPosition(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 220;
    const menuHeight = 290;

    let left = rect.right - menuWidth;
    if (left < 10) left = 10;

    let top = rect.bottom + 6;
    if (top + menuHeight > window.innerHeight && rect.top - menuHeight > 10) {
      top = rect.top - menuHeight - 6;
    }

    setActiveMenuContract(contract);
    setMenuPosition({ top, left });
  };
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="grid grid-cols-[2fr_1.8fr_1.5fr_1.2fr_1fr_1fr_180px] gap-4 bg-orange-50 px-5 py-4">
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              key={`contract-loading-head-${index}`}
              className="h-4 rounded-full bg-orange-100 animate-pulse"
            />
          ))}
        </div>
        <div className="divide-y divide-slate-100 bg-white">
          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <div
              key={`contract-loading-row-${rowIndex}`}
              className="grid grid-cols-[2fr_1.8fr_1.5fr_1.2fr_1fr_1fr_180px] gap-4 px-5 py-5"
            >
              {Array.from({ length: 7 }).map((__, colIndex) => (
                <div
                  key={`contract-loading-cell-${rowIndex}-${colIndex}`}
                  className="h-4 rounded-full bg-slate-100 animate-pulse"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center bg-white">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-2xl text-orange-600">
          📄
        </div>
        <h3 className="mt-4 text-base font-black text-slate-800">
          Nenhum contrato encontrado
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Ajuste os filtros de pesquisa ou cadastre um novo contrato de locação.
        </p>
      </div>
    );
  }

  return (
    <div className="hidden lg:block overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-left">
        <thead className="border-b border-slate-200 bg-slate-50/80">
          <tr>
            <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-600">
              Imóvel / Bem
            </th>
            <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-600">
              Inquilino / Locatário
            </th>
            <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-600">
              Vigência
            </th>
            <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-600">
              Valor
            </th>
            <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-600">
              Modalidade
            </th>
            <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-600">
              Status
            </th>
            <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wider text-slate-600 w-[120px]">
              Ações
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-200">
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
              <tr
                key={contract.id}
                className={`border-b border-slate-200 transition hover:bg-slate-50/80 ${
                  contract.status === "Finished" || contract.status === "Canceled"
                    ? "bg-slate-50/50 opacity-80"
                    : ""
                }`}
              >
                {/* Imóvel / Bem */}
                <td className="px-5 py-4">
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
                      className="block max-w-[280px] truncate text-left text-sm uppercase tracking-tight font-black text-slate-800 hover:text-orange-600 hover:underline transition-all duration-150 cursor-pointer"
                      title="Clique para ver detalhes do contrato"
                    >
                      {contract.propertyName || property?.name || "BEM NÃO IDENTIFICADO"}
                    </button>
                    <span className="mt-0.5 text-xs font-semibold text-slate-500 truncate max-w-[280px]">
                      {property?.city && property?.state
                        ? `${property.city}/${property.state}`
                        : property?.street
                        ? property.street
                        : "Localização não cadastrada"}
                    </span>
                  </div>
                </td>

                {/* Inquilino / Locatário */}
                <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                  <p className="font-black text-slate-900 truncate max-w-[220px]">
                    {contract.tenantName || tenant?.name || "Não informado"}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {tenant?.phone ? tenant.phone : tenant?.cpf || tenant?.document || "-"}
                  </p>
                </td>

                {/* Vigência */}
                <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                  <p className="font-bold text-slate-800">
                    {formatDate(contract.startDate)} até {formatDate(contract.endDate)}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1 text-xs">
                    {displayStatus === "Scheduled" ? (
                      <span className="flex items-center gap-1 font-black text-sky-600">
                        <Calendar className="h-3 w-3" />
                        {daysUntilStart === 1
                          ? "Inicia amanhã"
                          : `Inicia em ${daysUntilStart} dia(s)`}
                      </span>
                    ) : displayStatus === "Expiring" ? (
                      <span className="flex items-center gap-1 font-black text-amber-600">
                        <Clock className="h-3 w-3" />
                        {daysUntilEnd === 0
                          ? "Vence hoje"
                          : daysUntilEnd === 1
                          ? "Vence amanhã"
                          : `Vence em ${daysUntilEnd} dia(s)`}
                      </span>
                    ) : displayStatus === "Expired" ? (
                      <span className="font-black text-rose-600">
                        Vencido há {Math.abs(daysUntilEnd)} dia(s)
                      </span>
                    ) : displayStatus === "Active" ? (
                      <span className="text-slate-400">
                        {contract.isTemporaryRental ? (
                          daysUntilEnd === 0
                            ? "Último dia (Check-out hoje)"
                            : daysUntilEnd === 1
                            ? "Check-out amanhã"
                            : `${daysUntilEnd} dias restantes`
                        ) : daysUntilEnd > 0 ? (
                          `${daysUntilEnd} dias restantes`
                        ) : (
                          "Último dia"
                        )}
                      </span>
                    ) : (
                      <span className="text-slate-400">Encerrado</span>
                    )}
                  </div>
                </td>

                {/* Valor */}
                <td className="px-5 py-4">
                  <span className="text-sm font-black text-slate-900">
                    {formatCurrency(contract.rentValue)}
                  </span>
                  <span className="block text-[11px] font-semibold text-slate-400">
                    {contract.isTemporaryRental ? "total" : "mensal"}
                  </span>
                </td>

                {/* Modalidade */}
                <td className="px-5 py-4">
                  <ContractRentalTypeBadge isTemporaryRental={contract.isTemporaryRental} />
                  {contract.isTemporaryRental && (contract.checkInTime || contract.checkOutTime) && (
                    <span className="mt-1 block text-[10px] font-semibold text-slate-400">
                      Entr: {contract.checkInTime || "--:--"} / Saída: {contract.checkOutTime || "--:--"}
                    </span>
                  )}
                </td>

                {/* Status */}
                <td className="px-5 py-4">
                  <ContractStatusBadge
                    status={displayStatus}
                    onClick={() => onOpenDetails(contract)}
                  />
                </td>

                {/* Ações */}
                <td className="px-5 py-4 text-right">
                  <button
                    type="button"
                    onClick={(e) => handleToggleMenu(contract, e)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-black transition-all ${
                      activeMenuContract?.id === contract.id
                        ? "border-orange-500 bg-orange-50 text-orange-600 shadow-sm ring-2 ring-orange-500/20"
                        : "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 active:scale-95"
                    }`}
                    title="Escolher ação do contrato"
                  >
                    <span>Ações</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform duration-200 ${
                        activeMenuContract?.id === contract.id ? "rotate-180 text-orange-600" : "text-slate-400"
                      }`}
                    />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Menu Flutuante Global de Ações Dropdown */}
      {activeMenuContract && menuPosition && (() => {
        const activeDisplayStatus = getDisplayContractStatus(activeMenuContract);
        const canRenewActive = ["Active", "Expiring", "Expired", "Inactive"].includes(activeDisplayStatus);
        const canFinishActive = !["Finished", "Deleted", "Canceled"].includes(activeDisplayStatus);
        const canCancelActive = !["Deleted", "Canceled", "Finished"].includes(activeDisplayStatus);
        const canDeleteActive = activeDisplayStatus !== "Deleted";

        return (
          <>
            <div
              className="fixed inset-0 z-[998] bg-transparent"
              onClick={() => {
                setActiveMenuContract(null);
                setMenuPosition(null);
              }}
            />
            <div
              className="fixed z-[999] w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100"
              style={{
                top: menuPosition.top,
                left: menuPosition.left,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 1. Detalhes / Ficha 360° */}
              <button
                type="button"
                onClick={() => {
                  const target = activeMenuContract;
                  setActiveMenuContract(null);
                  setMenuPosition(null);
                  onOpenDetails(target);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
              >
                <Eye className="h-4 w-4 text-slate-500" />
                <span>Ver Ficha 360°</span>
              </button>

              {/* 2. Imprimir / Minuta */}
              <button
                type="button"
                onClick={() => {
                  const target = activeMenuContract;
                  setActiveMenuContract(null);
                  setMenuPosition(null);
                  onPrintContract(target);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-orange-50 hover:text-orange-700 transition"
              >
                <Printer className="h-4 w-4 text-orange-500" />
                <span>Imprimir / Minuta</span>
              </button>

              {/* 3. Compartilhar no WhatsApp */}
              {onShareWhatsApp && (
                <button
                  type="button"
                  onClick={() => {
                    const target = activeMenuContract;
                    setActiveMenuContract(null);
                    setMenuPosition(null);
                    onShareWhatsApp(target);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition"
                >
                  <MessageCircle className="h-4 w-4 text-emerald-600" />
                  <span>Enviar via WhatsApp</span>
                </button>
              )}

              {/* 3. Editar */}
              <button
                type="button"
                onClick={() => {
                  const target = activeMenuContract;
                  setActiveMenuContract(null);
                  setMenuPosition(null);
                  onEdit(target);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
              >
                <Edit3 className="h-4 w-4 text-blue-500" />
                <span>Editar Contrato</span>
              </button>

              {/* Divisor */}
              {(canRenewActive || canFinishActive || canCancelActive) && (
                <div className="my-1 border-t border-slate-100" />
              )}

              {/* 4. Renovar */}
              {canRenewActive && (
                <button
                  type="button"
                  onClick={() => {
                    const target = activeMenuContract;
                    setActiveMenuContract(null);
                    setMenuPosition(null);
                    onRenew(target);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition"
                >
                  <RotateCcw className="h-4 w-4 text-emerald-600" />
                  <span>Renovar Contrato</span>
                </button>
              )}

              {/* 5. Finalizar */}
              {canFinishActive && (
                <button
                  type="button"
                  onClick={() => {
                    const target = activeMenuContract;
                    setActiveMenuContract(null);
                    setMenuPosition(null);
                    onFinish(target);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-blue-700 hover:bg-blue-50 transition"
                >
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  <span>Finalizar Contrato</span>
                </button>
              )}

              {/* 6. Cancelar */}
              {canCancelActive && (
                <button
                  type="button"
                  onClick={() => {
                    const target = activeMenuContract;
                    setActiveMenuContract(null);
                    setMenuPosition(null);
                    onCancel(target);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-rose-700 hover:bg-rose-50 transition"
                >
                  <Ban className="h-4 w-4 text-rose-500" />
                  <span>Cancelar Contrato</span>
                </button>
              )}

              {/* 7. Excluir */}
              {canDeleteActive && (
                <>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    type="button"
                    onClick={() => {
                      const target = activeMenuContract;
                      setActiveMenuContract(null);
                      setMenuPosition(null);
                      onDelete(target);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 transition"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                    <span>Excluir Contrato</span>
                  </button>
                </>
              )}
            </div>
          </>
        );
      })()}
    </div>
  );
}
