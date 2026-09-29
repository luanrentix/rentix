"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Property, CompanySettings, getAssetCategoryLabel, sanitizeFileName } from "./asset-types";
import { Printer, QrCode, X } from "lucide-react";
import { getMediaUrl } from "@/services/api";

interface AssetQrLabelModalProps {
  property: Property | null;
  companySettings: CompanySettings;
  onClose: () => void;
}

export function AssetQrLabelModal({
  property,
  companySettings,
  onClose,
}: AssetQrLabelModalProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  useEffect(() => {
    if (!property) return;

    // Gerar payload para o QR Code (identificador estruturado para leitura de câmera)
    const payload = JSON.stringify({
      app: "CONTRX",
      type: "ASSET",
      id: property.id,
      code: property.code || property.patrimonyCode || "",
      name: property.name,
      category: property.assetCategory,
    });

    QRCode.toDataURL(payload, {
      width: 256,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error("Erro ao gerar QR Code:", err));
  }, [property]);

  if (!property) return null;

  function handlePrint() {
    if (!property) return;
    document.title = `ETIQUETA_PATRIMONIAL_${sanitizeFileName(property.name)}`;
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm print:p-0">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl print:m-0 print:border-none print:p-0 print:shadow-none">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Etiqueta Patrimonial
              </h3>
              <p className="text-xs font-semibold text-slate-500">
                Pronta para impressão térmica ou A4
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-orange-50 hover:text-orange-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Card da Etiqueta Física */}
        <div className="my-6 flex justify-center print:m-0">
          <div
            id="printable-asset-label"
            className="w-[340px] rounded-2xl border-2 border-dashed border-slate-300 bg-white p-4 shadow-sm print:w-[320px] print:rounded-none print:border print:border-black print:p-3"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                {companySettings.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={getMediaUrl(companySettings.logo)}
                    alt="Logo"
                    className="h-7 w-7 rounded-md object-contain"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-600 text-xs font-black text-white">
                    C
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-900 line-clamp-1">
                    {companySettings.tradeName || companySettings.companyName || "CONTRX"}
                  </p>
                  <p className="text-[9px] font-bold text-slate-500">
                    CONTROLE PATRIMONIAL
                  </p>
                </div>
              </div>
              <span className="rounded bg-slate-900 px-2 py-0.5 text-[9px] font-black uppercase text-white">
                {getAssetCategoryLabel(property.assetCategory)}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-4">
              <div className="shrink-0 bg-white p-1">
                {qrCodeDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code do Ativo"
                    className="h-24 w-24 object-contain print:h-20 print:w-20"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center bg-slate-100 text-[10px] text-slate-400">
                    Gerando QR...
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-1 text-left">
                <p className="text-xs font-black uppercase text-slate-950 line-clamp-2 leading-tight">
                  {property.name}
                </p>
                {property.code && (
                  <p className="text-[11px] font-bold text-orange-600">
                    CÓD: <span className="font-black">{property.code}</span>
                  </p>
                )}
                {property.patrimonyCode && (
                  <p className="text-[10px] font-semibold text-slate-700">
                    PATR: {property.patrimonyCode}
                  </p>
                )}
                {property.serialNumber && (
                  <p className="text-[10px] font-semibold text-slate-700 truncate">
                    S/N: {property.serialNumber}
                  </p>
                )}
                {property.licensePlate && (
                  <p className="text-[10px] font-semibold text-slate-700">
                    PLACA: {property.licensePlate}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-2 border-t border-slate-150 pt-1.5 text-center">
              <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                NÃO REMOVER ESTA ETIQUETA • ATIVO IDENTIFICADO
              </p>
            </div>
          </div>
        </div>

        {/* Footer Ações */}
        <div className="flex items-center justify-end gap-3 pt-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-2xl bg-orange-600 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-orange-200 transition hover:bg-orange-700 active:scale-95"
          >
            <Printer className="h-4 w-4" />
            Imprimir Etiqueta
          </button>
        </div>
      </div>
    </div>
  );
}
