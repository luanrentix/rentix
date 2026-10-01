"use client";

import React, { useState } from "react";
import {
  X,
  Wrench,
  CalendarDays,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Tag,
  Building,
} from "lucide-react";
import {
  Property,
  getAssetCategoryLabel,
  getPropertyTypeLabel,
  RentalHistoryContract,
} from "./asset-types";
import { AssetStatusBadge } from "./asset-status-badge";

interface AssetMaintenanceModalProps {
  property: Property | null;
  activeContract?: RentalHistoryContract | null;
  isOpen: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onLinkWithAgenda: (property: Property, reason: string) => void | Promise<void>;
  onToggleStatusOnly: (property: Property) => void | Promise<void>;
}

export function AssetMaintenanceModal({
  property,
  activeContract,
  isOpen,
  isLoading = false,
  onClose,
  onLinkWithAgenda,
  onToggleStatusOnly,
}: AssetMaintenanceModalProps) {
  const [maintenanceReason, setMaintenanceReason] = useState("");

  if (!isOpen || !property) return null;

  const isMaintenance = property.operationalStatus === "MAINTENANCE";
  const technicalDetails = [
    property.brand,
    property.model,
    property.serialNumber ? `S/N: ${property.serialNumber}` : "",
    property.licensePlate ? `Placa: ${property.licensePlate}` : "",
  ].filter(Boolean);

  const handleLinkClick = () => {
    onLinkWithAgenda(property, maintenanceReason);
  };

  const handleToggleClick = () => {
    onToggleStatusOnly(property);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/80 p-6 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center gap-3.5">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm ${
                isMaintenance
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300"
                  : "bg-orange-100 text-orange-600 dark:bg-orange-950/70 dark:text-orange-300"
              }`}
            >
              {isMaintenance ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : (
                <Wrench className="h-6 w-6" />
              )}
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-100/80 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-orange-700 dark:bg-orange-950/60 dark:text-orange-400">
                Módulo Bens e Ativos
              </div>
              <h3 className="mt-0.5 text-xl font-black text-slate-950 dark:text-white">
                {isMaintenance
                  ? "Gerenciar Manutenção do Bem"
                  : "Colocar Bem em Manutenção"}
              </h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Integração e sincronização direta com o módulo Agenda
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Card do Bem / Ativo */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-850">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {property.code ? `Código: ${property.code}` : "Bem Selecionado"}
                </span>
                <h4 className="truncate text-base font-black text-slate-900 dark:text-white">
                  {property.name}
                </h4>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {getAssetCategoryLabel(property.assetCategory)} •{" "}
                  {getPropertyTypeLabel(property.type, property.assetCategory)}
                </p>
              </div>
              <AssetStatusBadge status={property.operationalStatus} />
            </div>

            {technicalDetails.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 pt-2.5 border-t border-slate-200/80 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:text-slate-400">
                {technicalDetails.map((detail, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[11px] font-bold text-slate-700 shadow-sm border border-slate-150 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                  >
                    <Tag className="h-3 w-3 text-orange-500" />
                    {detail}
                  </span>
                ))}
              </div>
            )}

            {property.address && (
              <p className="mt-2 text-[11px] text-slate-400 flex items-center gap-1 truncate">
                <Building className="h-3 w-3 shrink-0" />
                {property.address}
              </p>
            )}
          </div>

          {/* Aviso se houver contrato ativo */}
          {activeContract && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <span className="font-black">Atenção:</span> Este bem possui contrato de locação ativo com{" "}
                <strong>{activeContract.tenantName || "Inquilino"}</strong>.
              </div>
            </div>
          )}

          {/* Card explicativo */}
          <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4 dark:border-orange-950/40 dark:bg-orange-950/20">
            <div className="text-[11px] font-black uppercase tracking-wider text-orange-800 dark:text-orange-400">
              🗓️ Agendamento Integrado com a Agenda
            </div>
            <p className="mt-1 text-xs text-orange-900/90 dark:text-orange-300 leading-relaxed font-medium">
              Ao clicar em <strong>&quot;Vincular com o módulo Agenda&quot;</strong>, o bem será colocado em manutenção (bloqueado para novas locações) e a tela de agendamento será aberta com todos os dados preenchidos automaticamente (título, bem/ativo, equipe responsável, prioridade e especificações técnicas).
            </p>
          </div>

          {/* Motivo ou detalhes (opcional) */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Motivo ou detalhes da manutenção (opcional):
            </label>
            <input
              type="text"
              value={maintenanceReason}
              onChange={(e) => setMaintenanceReason(e.target.value)}
              placeholder="Ex: Revisão preventiva, troca de peças, vistoria técnica..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-900 placeholder-slate-400 transition focus:border-orange-500 focus:bg-white focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col gap-2.5 border-t border-slate-100 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/90 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="order-3 sm:order-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-100 transition dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>

          <div className="order-1 sm:order-2 flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
            {/* Botão Apenas Alternar Status */}
            <button
              type="button"
              onClick={handleToggleClick}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {isMaintenance ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Liberar da Manutenção (Disponível)
                </>
              ) : (
                <>
                  <Wrench className="h-3.5 w-3.5 text-amber-600" />
                  Apenas Colocar em Manutenção
                </>
              )}
            </button>

            {/* Botão Vincular com o módulo Agenda */}
            <button
              type="button"
              onClick={handleLinkClick}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-700 active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarDays className="h-4 w-4" />
              )}
              <span>Vincular com o módulo Agenda</span>
              <ArrowRight className="h-3.5 w-3.5 opacity-80" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
