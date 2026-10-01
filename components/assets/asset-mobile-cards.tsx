"use client";

import React from "react";
import {
  Property,
  formatCurrency,
  formatDate,
  getAssetCategoryLabel,
  getPropertyTypeLabel,
  RentalHistoryContract,
  isContractActive,
} from "./asset-types";
import { AssetStatusBadge, AssetActiveBadge } from "./asset-status-badge";
import { QrCode, Wrench, Edit3, CheckCircle2, History } from "lucide-react";

interface AssetMobileCardsProps {
  properties: Property[];
  contracts: RentalHistoryContract[];
  onOpenHistory: (property: Property) => void;
  onOpenRentalInfo: (property: Property, contract?: RentalHistoryContract) => void;
  onEdit: (propertyId: string) => void;
  onOpenQrLabel: (property: Property) => void;
  onToggleMaintenance: (property: Property) => void;
}

export function AssetMobileCards({
  properties,
  contracts,
  onOpenHistory,
  onOpenRentalInfo,
  onEdit,
  onOpenQrLabel,
  onToggleMaintenance,
}: AssetMobileCardsProps) {
  if (properties.length === 0) return null;

  return (
    <div className="space-y-3.5 lg:hidden">
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
          <div
            key={property.id}
            className={`rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition ${
              !property.isActive ? "opacity-75 bg-slate-50/50" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div
                className="asset-name-container group group/asset cursor-pointer"
                onClick={() => onOpenHistory(property)}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenHistory(property);
                  }}
                  className="asset-name-btn block text-sm uppercase text-left font-semibold text-slate-800 dark:text-slate-100 hover:font-black hover:text-orange-600 hover:underline group-hover:font-black group-hover:text-orange-600 group-hover:underline cursor-pointer transition-all duration-150"
                  title="Clique para ver histórico e ficha técnica"
                >
                  {property.name}
                </button>
                {property.code && (
                  <span className="text-[11px] font-black text-orange-600">
                    Cód: #{property.code}
                  </span>
                )}
              </div>
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
            </div>

            <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
              <p>
                <span className="font-bold text-slate-400">Categoria:</span>{" "}
                {getAssetCategoryLabel(property.assetCategory)} (
                {getPropertyTypeLabel(property.type, property.assetCategory)})
              </p>
              <p>
                <span className="font-bold text-slate-400">Local:</span>{" "}
                {property.address || "Não informado"}, {property.city || "-"}/
                {property.state || "-"}
              </p>
              <p>
                <span className="font-bold text-slate-400">Valor de Locação:</span>{" "}
                <span className="font-black text-slate-950">
                  {formatCurrency(property.rentValue)}
                </span>
              </p>

              {currentRentalContract && (
                <button
                  type="button"
                  onClick={() => onOpenRentalInfo(property, currentRentalContract)}
                  className="w-full text-left rounded-xl border border-blue-150 bg-blue-50/60 p-2.5 mt-2 transition hover:bg-blue-100/70"
                  title="Clique para ver informações do aluguel e contrato"
                >
                  <p className="text-[10px] font-black uppercase text-blue-700 flex items-center justify-between">
                    <span>Contrato Ativo</span>
                    <span className="text-[10px] text-blue-600 font-bold">Ver detalhes →</span>
                  </p>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {currentRentalContract.tenantName || "Inquilino"}
                  </p>
                  {currentRentalContract.endDate && (
                    <p className="text-[10px] text-slate-500">
                      Vence em: {formatDate(currentRentalContract.endDate)}
                    </p>
                  )}
                </button>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
              <AssetActiveBadge isActive={property.isActive} />

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onOpenQrLabel(property)}
                  title="Etiqueta QR Code"
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                >
                  <QrCode className="h-4 w-4" />
                </button>

                {property.isActive && (
                  <button
                    type="button"
                    onClick={() => onToggleMaintenance(property)}
                    title={
                      isMaintenance
                        ? "Gerenciar Manutenção / Liberar"
                        : "Colocar em Manutenção (Vincular com Agenda)"
                    }
                    className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                      isMaintenance
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700"
                    }`}
                  >
                    {isMaintenance ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Wrench className="h-4 w-4" />
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onOpenHistory(property)}
                  title="Histórico / Ficha"
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  <History className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onEdit(property.id)}
                  title="Editar"
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
