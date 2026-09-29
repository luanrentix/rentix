"use client";

import React, { useState, useMemo } from "react";
import {
  Property,
  CompanySettings,
  RentalHistoryContract,
  PropertyMovement,
  formatCurrency,
  formatDate,
  getAssetCategoryLabel,
  getPropertyTypeLabel,
  sanitizeFileName,
} from "./asset-types";
import { AssetStatusBadge, AssetActiveBadge } from "./asset-status-badge";
import {
  X,
  Printer,
  FileText,
  Clock,
  Image as ImageIcon,
  Building,
  KeyRound,
} from "lucide-react";
import { getMediaUrl } from "@/services/api";

interface AssetHistoryModalProps {
  property: Property | null;
  companySettings: CompanySettings;
  contracts: RentalHistoryContract[];
  movements: PropertyMovement[];
  onClose: () => void;
}

export function AssetHistoryModal({
  property,
  companySettings,
  contracts,
  movements,
  onClose,
}: AssetHistoryModalProps) {
  const [reportMode, setReportMode] = useState<"Overview" | "Rental" | "General" | "Photos">("Overview");

  const rentalHistoryRecords = useMemo(() => {
    if (!property) return [];
    return contracts.filter((c) => {
      const cPropId =
        c.propertyId ||
        c.property_id ||
        c.property ||
        c.propertyCode ||
        c.property_id_fk;
      return String(cPropId || "") === property.id;
    });
  }, [property, contracts]);

  const propertyMovements = useMemo(() => {
    if (!property) return [];
    return movements.filter((m) => m.propertyId === property.id);
  }, [property, movements]);

  const allPhotos = useMemo(() => {
    if (!property?.photos) return [];
    try {
      const parsed = JSON.parse(property.photos);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
      if (typeof parsed === "string" && parsed) return [parsed];
    } catch {
      if (typeof property.photos === "string" && property.photos) {
        return [property.photos];
      }
    }
    return [];
  }, [property]);

  if (!property) return null;

  function handlePrint() {
    if (!property) return;
    document.title =
      reportMode === "Rental"
        ? 'RELATORIO_ALUGUEL_BEM_ATIVO_' + sanitizeFileName(property.name)
        : reportMode === "Photos"
        ? 'RELATORIO_FOTOS_BEM_ATIVO_' + sanitizeFileName(property.name)
        : reportMode === "Overview"
        ? 'FICHA_TECNICA_BEM_ATIVO_' + sanitizeFileName(property.name)
        : 'RELATORIO_HISTORICO_GERAL_BEM_ATIVO_' + sanitizeFileName(property.name);

    setTimeout(() => {
      window.print();
    }, 100);
  }

  const isRealEstate = property.assetCategory === "PROPERTY";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur-sm print:p-0">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2.5rem] border border-orange-100 bg-white shadow-2xl print:max-h-none print:w-full print:rounded-none print:border-none print:shadow-none">
        {/* Header Modal */}
        <div className="sticky top-0 z-20 flex flex-col gap-4 border-b border-slate-150 bg-white/95 px-8 py-5 backdrop-blur-md print:hidden">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 shadow-inner">
                <Building className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black text-slate-950">
                    {property.name}
                  </h2>
                  {property.code && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-black text-slate-600">
                      #{property.code}
                    </span>
                  )}
                  <AssetStatusBadge status={property.operationalStatus} />
                  <AssetActiveBadge isActive={property.isActive} />
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {property.address
                    ? property.address + (property.city ? ' • ' + property.city + '/' + (property.state || '') : '')
                    : "Endereço não informado"}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-2.5 text-xs font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600 active:scale-95"
              >
                <Printer className="h-4 w-4" />
                Imprimir / PDF
              </button>

              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-lg font-black text-slate-500 transition hover:bg-orange-50 hover:text-orange-600"
                title="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Abas de Navegação */}
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setReportMode("Overview")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
                reportMode === "Overview"
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Ficha Técnica & Detalhes
            </button>

            <button
              type="button"
              onClick={() => setReportMode("Rental")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
                reportMode === "Rental"
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              Histórico de Aluguel ({rentalHistoryRecords.length})
            </button>

            <button
              type="button"
              onClick={() => setReportMode("General")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
                reportMode === "General"
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              Histórico de Movimentações ({propertyMovements.length})
            </button>

            <button
              type="button"
              onClick={() => setReportMode("Photos")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition ${
                reportMode === "Photos"
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Galeria de Fotos ({allPhotos.length})
            </button>
          </div>
        </div>

        {/* Conteúdo Imprimível */}
        <div className="p-8 print:p-0">
          {/* Header de Impressão */}
          <div className="hidden border-b-2 border-slate-900 pb-4 print:flex print:items-start print:justify-between">
            <div>
              <p className="text-xs font-black uppercase text-orange-600 tracking-wider">
                CONTRX ERP • CONTROLE PATRIMONIAL
              </p>
              <h1 className="text-xl font-black text-slate-950 mt-1">
                {reportMode === "Overview"
                  ? "Ficha Técnica e Detalhes do Bem/Ativo"
                  : reportMode === "Rental"
                  ? "Histórico de Locações do Bem/Ativo"
                  : reportMode === "Photos"
                  ? "Galeria de Fotos do Bem/Ativo"
                  : "Histórico de Movimentações"}
              </h1>
              <p className="text-xs font-bold text-slate-700 mt-0.5">
                {companySettings.tradeName || companySettings.companyName || "Empresa"}
                {companySettings.document ? ' • CNPJ/CPF: ' + companySettings.document : ""}
              </p>
            </div>
            <div className="text-right text-[11px] text-slate-500">
              <p>Emitido em: {new Date().toLocaleDateString("pt-BR")}</p>
              <p className="font-bold text-slate-800">#{property.code || property.id.slice(0, 8)}</p>
            </div>
          </div>

          {/* Tab 1: Visão Geral */}
          {reportMode === "Overview" && (
            <div className="space-y-6 print:space-y-4">
              {/* Cards de Destaque */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 print:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 print:p-2">
                  <p className="text-[11px] font-bold uppercase text-slate-500">Valor de Locação</p>
                  <p className="text-lg font-black text-slate-950 mt-0.5">
                    {formatCurrency(property.rentValue)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 print:p-2">
                  <p className="text-[11px] font-bold uppercase text-slate-500">Status Operacional</p>
                  <div className="mt-1">
                    <AssetStatusBadge status={property.operationalStatus} />
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 print:p-2">
                  <p className="text-[11px] font-bold uppercase text-slate-500">Total de Locações</p>
                  <p className="text-lg font-black text-slate-950 mt-0.5">
                    {rentalHistoryRecords.length} contratos
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 print:p-2">
                  <p className="text-[11px] font-bold uppercase text-slate-500">Modo de Gestão</p>
                  <p className="text-sm font-black text-slate-950 mt-1">
                    {property.managementMode === "MANAGED" ? "Administrado (Terceiros)" : "Próprio"}
                  </p>
                </div>
              </div>

              {/* Especificações Técnicas / Dados do Bem */}
              <div className="rounded-2xl border border-slate-200 p-6 print:p-4">
                <h3 className="text-sm font-black uppercase text-slate-900 border-b border-slate-150 pb-2">
                  Dados de Identificação & Cadastro
                </h3>

                <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-400">Categoria:</span>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">
                      {getAssetCategoryLabel(property.assetCategory)}
                    </p>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400">Tipo:</span>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">
                      {getPropertyTypeLabel(property.type, property.assetCategory)}
                    </p>
                  </div>
                  {property.code && (
                    <div>
                      <span className="font-bold text-slate-400">Código Interno:</span>
                      <p className="font-black text-orange-600 text-sm mt-0.5">
                        #{property.code}
                      </p>
                    </div>
                  )}

                  {!isRealEstate && (
                    <>
                      {property.brand && (
                        <div>
                          <span className="font-bold text-slate-400">Marca:</span>
                          <p className="font-bold text-slate-800 text-sm mt-0.5">{property.brand}</p>
                        </div>
                      )}
                      {property.model && (
                        <div>
                          <span className="font-bold text-slate-400">Modelo:</span>
                          <p className="font-bold text-slate-800 text-sm mt-0.5">{property.model}</p>
                        </div>
                      )}
                      {property.serialNumber && (
                        <div>
                          <span className="font-bold text-slate-400">Número de Série:</span>
                          <p className="font-bold text-slate-800 text-sm mt-0.5">{property.serialNumber}</p>
                        </div>
                      )}
                      {property.licensePlate && (
                        <div>
                          <span className="font-bold text-slate-400">Placa:</span>
                          <p className="font-bold text-slate-800 text-sm mt-0.5">{property.licensePlate}</p>
                        </div>
                      )}
                      {property.manufactureYear > 0 && (
                        <div>
                          <span className="font-bold text-slate-400">Ano Fabricação:</span>
                          <p className="font-bold text-slate-800 text-sm mt-0.5">{property.manufactureYear}</p>
                        </div>
                      )}
                      {property.condition && (
                        <div>
                          <span className="font-bold text-slate-400">Condição:</span>
                          <p className="font-bold text-slate-800 text-sm mt-0.5">{property.condition}</p>
                        </div>
                      )}
                      {property.patrimonyCode && (
                        <div>
                          <span className="font-bold text-slate-400">Código Patrimonial:</span>
                          <p className="font-bold text-slate-800 text-sm mt-0.5">{property.patrimonyCode}</p>
                        </div>
                      )}
                    </>
                  )}

                  {isRealEstate && (
                    <>
                      <div>
                        <span className="font-bold text-slate-400">Quartos:</span>
                        <p className="font-bold text-slate-800 text-sm mt-0.5">{property.bedrooms || 0}</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-400">Banheiros:</span>
                        <p className="font-bold text-slate-800 text-sm mt-0.5">{property.bathrooms || 0}</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-400">Vagas Garagem:</span>
                        <p className="font-bold text-slate-800 text-sm mt-0.5">{property.garages || 0}</p>
                      </div>
                      <div className="col-span-2 sm:col-span-3">
                        <span className="font-bold text-slate-400">Endereço Completo:</span>
                        <p className="font-bold text-slate-800 text-sm mt-0.5">
                          {property.address || "Não informado"}
                          {property.neighborhood ? ', ' + property.neighborhood : ""}
                          {property.city ? ' - ' + property.city + '/' + (property.state || '') : ""}
                          {property.zipCode ? ' (CEP: ' + property.zipCode + ')' : ""}
                        </p>
                      </div>
                    </>
                  )}

                  {property.description && (
                    <div className="col-span-2 sm:col-span-3 border-t border-slate-100 pt-3">
                      <span className="font-bold text-slate-400">Observações / Descrição:</span>
                      <p className="text-slate-700 mt-1 whitespace-pre-wrap leading-relaxed">
                        {property.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Histórico de Aluguel */}
          {reportMode === "Rental" && (
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase text-slate-900 border-b border-slate-150 pb-2">
                Contratos de Locação Registrados ({rentalHistoryRecords.length})
              </h3>
              {rentalHistoryRecords.length === 0 ? (
                <div className="py-8 text-center text-sm font-semibold text-slate-400">
                  Nenhum contrato de locação registrado para este bem/ativo.
                </div>
              ) : (
                <div className="divide-y divide-slate-150 rounded-2xl border border-slate-200 bg-white">
                  {rentalHistoryRecords.map((c) => (
                    <div key={String(c.id)} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <span className="font-black text-slate-900 text-sm">
                          {c.tenantName || "Locatário não informado"}
                        </span>
                        <p className="text-slate-500 mt-0.5">
                          Período: {formatDate(c.startDate)} até {formatDate(c.endDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-slate-900 text-sm">
                          {formatCurrency(c.rentValue)}
                        </span>
                        <span className="block text-[11px] font-bold text-slate-400">
                          Status: {c.status || "Ativo"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Histórico de Movimentações */}
          {reportMode === "General" && (
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase text-slate-900 border-b border-slate-150 pb-2">
                Linha do Tempo de Movimentações ({propertyMovements.length})
              </h3>
              {propertyMovements.length === 0 ? (
                <div className="py-8 text-center text-sm font-semibold text-slate-400">
                  Nenhuma movimentação registrada para este bem/ativo.
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-200 ml-4 pl-4 space-y-4">
                  {propertyMovements.map((m) => (
                    <div key={m.id} className="relative">
                      <div className="absolute -left-[23px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-orange-500" />
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-slate-800 uppercase">
                            {m.type}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(m.createdAt).toLocaleString("pt-BR")}
                          </span>
                        </div>
                        <p className="mt-1 text-slate-600">{m.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Galeria de Fotos */}
          {reportMode === "Photos" && (
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase text-slate-900 border-b border-slate-150 pb-2">
                Galeria de Fotos ({allPhotos.length})
              </h3>
              {allPhotos.length === 0 ? (
                <div className="py-8 text-center text-sm font-semibold text-slate-400">
                  Nenhuma foto anexada a este bem/ativo.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {allPhotos.map((photoUrl, idx) => (
                    <div key={idx} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 aspect-video">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getMediaUrl(photoUrl)}
                        alt={'Foto ' + (idx + 1) + ' de ' + property.name}
                        className="h-full w-full object-cover transition hover:scale-105"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
