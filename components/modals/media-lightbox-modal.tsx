"use client";

import React, { useEffect, useCallback, useState } from "react";
import { X, Download, ExternalLink, FileText, Image as ImageIcon } from "lucide-react";
import { openMediaInNewTab, downloadMediaFile, dataUrlToBlob } from "@/services/api";

interface MediaLightboxModalProps {
  isOpen: boolean;
  mediaUrl: string | null;
  title?: string;
  isPdf?: boolean;
  onClose: () => void;
}

export function MediaLightboxModal({
  isOpen,
  mediaUrl,
  title = "Visualização de Imagem",
  isPdf = false,
  onClose,
}: MediaLightboxModalProps) {
  // Fechar com tecla ESC
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  const [resolvedSrc, setResolvedSrc] = useState<string>("");

  useEffect(() => {
    if (!mediaUrl) {
      setResolvedSrc("");
      return;
    }

    if (mediaUrl.startsWith("data:")) {
      try {
        const blob = dataUrlToBlob(mediaUrl);
        const objectUrl = URL.createObjectURL(blob);
        setResolvedSrc(objectUrl);
        return () => {
          URL.revokeObjectURL(objectUrl);
        };
      } catch (e) {
        console.error("Erro ao converter dataUrl em blob:", e);
        setResolvedSrc(mediaUrl);
      }
    } else {
      setResolvedSrc(mediaUrl);
    }
  }, [mediaUrl]);

  if (!isOpen || !mediaUrl) return null;

  const detectedIsPdf =
    isPdf ||
    mediaUrl.startsWith("data:application/pdf") ||
    mediaUrl.toLowerCase().includes(".pdf");

  const effectiveSrc = resolvedSrc || mediaUrl;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 p-3 sm:p-6 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col max-h-[94vh] w-full max-w-5xl rounded-3xl border border-slate-700/60 bg-slate-900/95 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header do Lightbox */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-slate-900/90 text-white">
          <div className="flex items-center gap-2.5 min-w-0 pr-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400">
              {detectedIsPdf ? <FileText className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
            </div>
            <span className="truncate text-sm font-bold text-slate-200" title={title}>
              {title}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Botão Baixar */}
            <button
              type="button"
              onClick={() => downloadMediaFile(mediaUrl, title || "arquivo")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 transition shadow-sm active:scale-95 cursor-pointer"
              title="Baixar arquivo"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Baixar</span>
            </button>

            {/* Botão Abrir em Nova Aba (seguro com Blob) */}
            <button
              type="button"
              onClick={() => openMediaInNewTab(mediaUrl, title)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 transition shadow-sm active:scale-95 cursor-pointer"
              title="Abrir em nova aba do navegador"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Nova aba</span>
            </button>

            {/* Botão Fechar */}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition cursor-pointer"
              title="Fechar (Esc)"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Corpo do Lightbox */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[300px] max-h-[82vh] bg-slate-950/60">
          {detectedIsPdf ? (
            <div className="w-full h-[75vh] flex flex-col items-center justify-center">
              <iframe
                src={effectiveSrc}
                title={title}
                className="w-full h-full rounded-2xl border border-slate-800 bg-white"
              />
            </div>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={effectiveSrc}
              alt={title}
              className="max-h-[78vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl transition hover:scale-[1.01]"
            />
          )}
        </div>
      </div>
    </div>
  );
}
