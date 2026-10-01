"use client";

import React from "react";
import {
  Property,
  formatCurrency,
  formatDate,
  getAssetCategoryLabel,
  getPropertyTypeLabel,
  getAssetTechnicalSummary,
  RentalHistoryContract,
  isContractActive,
} from "./asset-types";
import { AssetStatusBadge, AssetActiveBadge } from "./asset-status-badge";
import { QrCode, Wrench, Edit3, CheckCircle2, History } from "lucide-react";

interface AssetTableProps {
  properties: Property[];
  contracts: RentalHistoryContract[];
  isLoading: boolean;
  onOpenHistory: (property: Property) => void;
  onOpenRentalInfo: (property: Property, contract?: RentalHistoryContract) => void;
  onEdit: (propertyId: string) => void;
  onOpenQrLabel: (property: Property) => void;
  onToggleMaintenance: (property: Property) => void;
}

export function AssetTable({
  properties,
  contracts,
  isLoading,
  onOpenHistory,
  onOpenRentalInfo,
  onEdit,
  onOpenQrLabel,
  onToggleMaintenance,
}: AssetTableProps) {
  if (isLoading) {
    return (
      <div className="w-full max-w-full min-w-0 overflow-hidden rounded-3xl border border-slate-200">
        <div className="grid grid-cols-[2fr_1fr_2fr_1fr_1fr_1fr_120px] gap-4 bg-orange-50 px-5 py-4">
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              key={`asset-loading-head-${index}`}
              className="h-4 rounded-full bg-orange-100 animate-pulse"
            />
          ))}
        </div>
        <div className="divide-y divide-slate-100 bg-white">
          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <div
              key={`asset-loading-row-${rowIndex}`}
              className="grid grid-cols-[2fr_1fr_2fr_1fr_1fr_1fr_120px] gap-4 px-5 py-5"
            >
              {Array.from({ length: 7 }).map((__, colIndex) => (
                <div
                  key={`asset-loading-cell-${rowIndex}-${colIndex}`}
                  className="h-4 rounded-full bg-slate-100 animate-pulse"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 p-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-2xl text-orange-600">
          🏢
        </div>
        <h3 className="mt-4 text-base font-black text-slate-800">
          Nenhum bem/ativo encontrado
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Ajuste os filtros de pesquisa ou cadastre um novo bem/ativo.
        </p>
      </div>
    );
  }

  return (
    <div className="hidden lg:block w-full max-w-full min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto w-full">
        <table className="w-full min-w-[940px] border-collapse text-left">
          <thead className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/50">
            <tr>
              <th className="px-4 py-3.5 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Bem/Ativo
              </th>
              <th className="px-3.5 py-3.5 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 whitespace-nowrap">
                Categoria
              </th>
              <th className="px-3.5 py-3.5 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                Localização
              </th>
              <th className="px-3.5 py-3.5 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 whitespace-nowrap">
                Valor Locação
              </th>
              <th className="px-3.5 py-3.5 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 whitespace-nowrap">
                Status Operacional
              </th>
              <th className="px-3.5 py-3.5 text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 whitespace-nowrap">
                Cadastro
              </th>
              <th className="px-4 py-3.5 text-right text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 whitespace-nowrap w-[150px]">
                Ações
              </th>
            </tr>
          </thead>

        <tbody className="divide-y divide-slate-200">
          {properties.map((property) => {
            const currentRentalContract = contracts.find((c) => {
              const cPropId =
                c.propertyId ||
                c.property_id ||
                c.property ||
                c.propertyCode ||
                c.property_id_fk;
              return (
                String(cPropId || "") === property.id &&
                isContractActive(c.status)
              );
            });

            const isMaintenance = property.operationalStatus === "MAINTENANCE";

            return (
              <tr
                key={property.id}
                className={`border-b border-slate-200 transition hover:bg-slate-50/80 ${
                  !property.isActive ? "bg-slate-50/60 opacity-75" : ""
                }`}
              >
                {/* Bem / Ativo */}
                <td className="px-4 py-3.5">
                  <div
                    className="asset-name-container group group/asset flex flex-col cursor-pointer"
                    onClick={() => onOpenHistory(property)}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenHistory(property);
                      }}
                      className="asset-name-btn block max-w-[260px] truncate text-left text-sm uppercase tracking-tight font-semibold text-slate-800 dark:text-slate-100 hover:font-black hover:text-orange-600 hover:underline group-hover:font-black group-hover:text-orange-600 group-hover:underline cursor-pointer transition-all duration-150"
                      title="Clique para ver o histórico e ficha técnica do ativo"
                    >
                      {property.name}
                    </button>
                    {property.code && (
                      <span className="text-[11px] font-black text-orange-600">
                        Código: #{property.code}
                      </span>
                    )}
                    <span className="mt-0.5 text-xs font-semibold text-slate-500 truncate max-w-[260px]">
                      {getAssetTechnicalSummary(property) ||
                        (property.zipCode ? `CEP: ${property.zipCode}` : "Sem dados adicionais")}
                    </span>
                  </div>
                </td>

                {/* Categoria */}
                <td className="px-3.5 py-3.5 text-sm font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                  <p className="font-black text-slate-900 dark:text-white">
                    {getAssetCategoryLabel(property.assetCategory)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {getPropertyTypeLabel(property.type, property.assetCategory)}
                  </p>
                </td>

                {/* Localização */}
                <td className="px-3.5 py-3.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <p className="truncate max-w-[190px]" title={property.address}>
                    {property.address || "Endereço não informado"}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                    {property.city || "-"} / {property.state || "-"}
                  </p>
                </td>

                {/* Valor Locação */}
                <td className="px-3.5 py-3.5 text-sm font-black text-slate-900 dark:text-white whitespace-nowrap">
                  {formatCurrency(property.rentValue)}
                </td>

                {/* Status Operacional */}
                <td className="px-3.5 py-3.5 min-w-[150px]">
                  <AssetStatusBadge
                    status={property.operationalStatus}
                    onClick={
                      property.operationalStatus === "RENTED" ||
                      property.status === "Rented" ||
                      Boolean(currentRentalContract)
                        ? () => onOpenRentalInfo(property, currentRentalContract)
                        : undefined
                    }
                    title={
                      property.operationalStatus === "RENTED" ||
                      property.status === "Rented" ||
                      Boolean(currentRentalContract)
                        ? "Clique para ver informações do aluguel e do contrato"
                        : undefined
                    }
                  />
                  {currentRentalContract && (
                    <button
                      type="button"
                      onClick={() => onOpenRentalInfo(property, currentRentalContract)}
                      className="mt-1.5 block max-w-[180px] truncate text-left text-xs font-semibold text-slate-500 transition hover:text-orange-600 hover:underline cursor-pointer"
                      title="Clique para ver informações da locação e do contrato"
                    >
                      Locatário: {currentRentalContract.tenantName || "Inquilino"}
                      {currentRentalContract.endDate && (
                        <span className="block text-[10px] text-slate-400">
                          Até {formatDate(currentRentalContract.endDate)}
                        </span>
                      )}
                    </button>
                  )}
                </td>

                {/* Cadastro */}
                <td className="px-3.5 py-3.5 whitespace-nowrap">
                  <AssetActiveBadge isActive={property.isActive} />
                </td>

                {/* Ações */}
                <td className="px-4 py-3.5 whitespace-nowrap w-[150px]">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Botão QR Code */}
                    <button
                      type="button"
                      onClick={() => onOpenQrLabel(property)}
                      title="Gerar Etiqueta Patrimonial com QR Code"
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-orange-50 hover:text-orange-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <QrCode className="h-4 w-4" />
                    </button>

                    {/* Botão Alternar Manutenção */}
                    {property.isActive && (
                      <button
                        type="button"
                        onClick={() => onToggleMaintenance(property)}
                        title={
                          isMaintenance
                            ? "Gerenciar Manutenção (Vincular com Agenda ou Liberar)"
                            : "Colocar bem Em Manutenção (Vincular com módulo Agenda)"
                        }
                        className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${
                          isMaintenance
                            ? "bg-amber-100 text-amber-800 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-amber-950/60 dark:text-amber-300"
                            : "bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        }`}
                      >
                        {isMaintenance ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Wrench className="h-4 w-4" />
                        )}
                      </button>
                    )}

                    {/* Botão Histórico / Ficha */}
                    <button
                      type="button"
                      onClick={() => onOpenHistory(property)}
                      title="Ficha Técnica & Histórico"
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <History className="h-4 w-4" />
                    </button>

                    {/* Botão Editar */}
                    <button
                      type="button"
                      onClick={() => onEdit(property.id)}
                      title="Editar cadastro do bem"
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-orange-50 hover:text-orange-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
