"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
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
  Upload,
  Trash2,
  LoaderCircle,
  Plus,
  AlertCircle,
  ExternalLink,
  ZoomIn,
} from "lucide-react";
import { getMediaUrl, api } from "@/services/api";
import { compressImageFile } from "@/services/image-compression";
import { MediaLightboxModal } from "@/components/modals/media-lightbox-modal";

interface AssetHistoryModalProps {
  property: Property | null;
  companySettings: CompanySettings;
  contracts: RentalHistoryContract[];
  movements: PropertyMovement[];
  onClose: () => void;
}

interface AssetFile {
  id: string;
  url: string;
  originalName?: string;
  fileType?: string;
}

export function AssetHistoryModal({
  property,
  companySettings,
  contracts,
  movements,
  onClose,
}: AssetHistoryModalProps) {
  const [reportMode, setReportMode] = useState<"Overview" | "Rental" | "General" | "Photos">("Overview");
  const [assetFiles, setAssetFiles] = useState<AssetFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [brokenPhotos, setBrokenPhotos] = useState<Record<string, boolean>>({});
  const [lightboxMedia, setLightboxMedia] = useState<{
    url: string;
    title: string;
    isPdf?: boolean;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!property?.id) {
      setAssetFiles([]);
      return;
    }
    loadPropertyFiles(property.id);
  }, [property?.id]);

  async function loadPropertyFiles(propertyId: string) {
    try {
      setIsLoadingFiles(true);
      const res = await api.get<AssetFile[]>(`/files/entity/PROPERTY/${propertyId}`);
      if (Array.isArray(res.data)) {
        setAssetFiles(res.data);
      }
    } catch {
      setAssetFiles([]);
    } finally {
      setIsLoadingFiles(false);
    }
  }

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

  // Combina fotos da tabela arquivos_sistema e da coluna property.photos (deduplicando)
  const allPhotos = useMemo(() => {
    const list: Array<{ url: string; id?: string; name?: string }> = [];
    const seenUrls = new Set<string>();

    // 1. Fotos cadastradas na tabela de arquivos
    assetFiles.forEach((f) => {
      if (f.url && !seenUrls.has(f.url)) {
        seenUrls.add(f.url);
        list.push({ url: f.url, id: f.id, name: f.originalName });
      }
    });

    // 2. Fotos na coluna JSON property.photos
    if (property?.photos) {
      try {
        const parsed = JSON.parse(property.photos);
        const arrayPhotos = Array.isArray(parsed) ? parsed : [property.photos];
        arrayPhotos.filter(Boolean).forEach((url: string) => {
          if (typeof url === "string" && url && !seenUrls.has(url)) {
            seenUrls.add(url);
            list.push({ url });
          }
        });
      } catch {
        if (typeof property.photos === "string" && property.photos && !seenUrls.has(property.photos)) {
          seenUrls.add(property.photos);
          list.push({ url: property.photos });
        }
      }
    }

    return list;
  }, [property?.photos, assetFiles]);

  async function handleUploadPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0 || !property) return;
    const files = Array.from(e.target.files);

    try {
      setIsUploadingPhoto(true);
      for (const file of files) {
        const compressed = await compressImageFile(file);
        const formData = new FormData();
        formData.append("file", compressed);
        formData.append("entityType", "PROPERTY");
        formData.append("entityId", property.id);

        await api.post("/files/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      await loadPropertyFiles(property.id);
    } catch (err) {
      console.error("Erro ao subir fotos do bem/ativo:", err);
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteFile(fileId?: string, fileUrl?: string) {
    if (!fileId && !fileUrl) return;
    if (!confirm("Tem certeza que deseja remover esta foto?")) return;

    try {
      if (fileId) {
        setDeletingFileId(fileId);
        await api.delete(`/files/${fileId}`);
        setAssetFiles((prev) => prev.filter((f) => f.id !== fileId));
      } else if (fileUrl && property) {
        // Remover apenas da lista local se não tiver id
        setAssetFiles((prev) => prev.filter((f) => f.url !== fileUrl));
      }
    } catch (err) {
      console.error("Erro ao remover foto:", err);
    } finally {
      setDeletingFileId(null);
    }
  }

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
              {allPhotos.length > 0 && !brokenPhotos[allPhotos[0].url] ? (
                <div
                  className="group relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm"
                  onClick={() =>
                    setLightboxMedia({
                      url: getMediaUrl(allPhotos[0].url),
                      title: `${property.name} • Foto Principal`,
                      isPdf: false,
                    })
                  }
                  title="Clique para ampliar a foto principal"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getMediaUrl(allPhotos[0].url)}
                    alt={property.name}
                    className="h-full w-full object-cover transition duration-200 group-hover:scale-110"
                    onError={() =>
                      setBrokenPhotos((prev) => ({
                        ...prev,
                        [allPhotos[0].url]: true,
                      }))
                    }
                  />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <ZoomIn className="h-4 w-4 text-white" />
                  </div>
                </div>
              ) : (
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 shadow-inner">
                  <Building className="h-6 w-6" />
                </div>
              )}
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

              {/* Card de Fotos Rápidas da Ficha Técnica */}
              {allPhotos.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 print:hidden">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5 text-orange-600" />
                      Fotos Registradas ({allPhotos.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setReportMode("Photos")}
                      className="text-xs font-black text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Gerenciar / Ver galeria completa →
                    </button>
                  </div>
                  <div className="flex gap-2.5 overflow-x-auto pb-1">
                    {allPhotos.slice(0, 8).map((photo, pIdx) => {
                      const fullUrl = getMediaUrl(photo.url);
                      return (
                        <div
                          key={pIdx}
                          onClick={() =>
                            setLightboxMedia({
                              url: fullUrl,
                              title: photo.name || `Foto ${pIdx + 1} • ${property.name}`,
                              isPdf: false,
                            })
                          }
                          className="group relative h-20 w-28 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md hover:scale-[1.02]"
                          title="Clique para ampliar"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={fullUrl}
                            alt={photo.name || "Foto"}
                            className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-slate-950/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                            <ZoomIn className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-150 pb-3">
                <div>
                  <h3 className="text-sm font-black uppercase text-slate-900">
                    Galeria de Fotos ({allPhotos.length})
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Fotos armazenadas permanentemente no banco de dados do sistema.
                  </p>
                </div>

                <div className="print:hidden">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleUploadPhotos}
                    accept="image/*"
                    multiple
                    className="hidden"
                    id="asset-photo-upload-input"
                  />
                  <label
                    htmlFor="asset-photo-upload-input"
                    className={`inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-xs font-black text-white shadow-md shadow-orange-500/20 cursor-pointer transition hover:bg-orange-600 active:scale-95 ${
                      isUploadingPhoto ? "opacity-70 pointer-events-none" : ""
                    }`}
                  >
                    {isUploadingPhoto ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Otimizando & Salvando...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Anexar Novas Fotos
                      </>
                    )}
                  </label>
                </div>
              </div>

              {isLoadingFiles ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <LoaderCircle className="h-6 w-6 animate-spin text-orange-500" />
                  <span className="text-xs font-semibold">Carregando galeria...</span>
                </div>
              ) : allPhotos.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                  <ImageIcon className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-2 text-sm font-bold text-slate-700">
                    Nenhuma foto anexada a este bem/ativo.
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Clique em &quot;Anexar Novas Fotos&quot; para adicionar imagens permanentes.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {allPhotos.map((photo, idx) => {
                    const isBroken = brokenPhotos[photo.url];
                    const fullMediaUrl = getMediaUrl(photo.url);

                    return (
                      <div
                        key={photo.id || idx}
                        className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 aspect-video shadow-sm transition hover:shadow-md cursor-pointer"
                        onClick={() => {
                          if (!isBroken) {
                            setLightboxMedia({
                              url: fullMediaUrl,
                              title: photo.name || `Foto ${idx + 1} • ${property.name}`,
                              isPdf: false,
                            });
                          }
                        }}
                      >
                        {idx === 0 && (
                          <div className="absolute top-2 left-2 z-10 rounded-lg bg-slate-900/80 px-2 py-0.5 text-[10px] font-black text-white backdrop-blur-sm">
                            Foto Principal
                          </div>
                        )}

                        {isBroken ? (
                          <div className="flex h-full w-full flex-col items-center justify-center p-3 text-center bg-slate-50">
                            <AlertCircle className="h-7 w-7 text-amber-500 mb-1" />
                            <span className="text-[11px] font-bold text-slate-600">
                              Foto indisponível
                            </span>
                            <span className="text-[9px] text-slate-400 line-clamp-1">
                              {photo.name || "Arquivo não encontrado"}
                            </span>
                          </div>
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={fullMediaUrl}
                            alt={photo.name || `Foto ${idx + 1} de ${property.name}`}
                            onError={() =>
                              setBrokenPhotos((prev) => ({
                                ...prev,
                                [photo.url]: true,
                              }))
                            }
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        )}

                        {/* Barra de ações / Overlay */}
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2 print:hidden pointer-events-none">
                          {!isBroken && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLightboxMedia({
                                  url: fullMediaUrl,
                                  title: photo.name || `Foto ${idx + 1} • ${property.name}`,
                                  isPdf: false,
                                });
                              }}
                              className="pointer-events-auto rounded-xl bg-white px-2.5 py-1.5 text-xs font-black text-slate-900 shadow hover:bg-slate-100 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                            >
                              <ZoomIn className="h-3.5 w-3.5" />
                              Ver
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFile(photo.id, photo.url);
                            }}
                            disabled={deletingFileId === photo.id}
                            className="pointer-events-auto rounded-xl bg-red-600 px-2.5 py-1.5 text-xs font-black text-white shadow hover:bg-red-700 flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                            title="Excluir foto"
                          >
                            {deletingFileId === photo.id ? (
                              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <MediaLightboxModal
        isOpen={Boolean(lightboxMedia)}
        mediaUrl={lightboxMedia?.url || null}
        title={lightboxMedia?.title}
        isPdf={lightboxMedia?.isPdf}
        onClose={() => setLightboxMedia(null)}
      />
    </div>
  );
}
