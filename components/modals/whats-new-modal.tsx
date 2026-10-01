"use client";

import React, { useState } from "react";
import {
  Sparkles,
  X,
  Wrench,
  ShieldCheck,
  PlusCircle,
  Calendar,
  Layers,
  ChevronRight,
} from "lucide-react";
import {
  RELEASE_NOTES,
  getReleaseNoteForVersion,
  type ReleaseCategory,
} from "@/constants/release-notes";

interface WhatsNewModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVersion?: string;
}

const CATEGORY_CONFIG: Record<
  ReleaseCategory,
  { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
> = {
  novo: {
    label: "NOVO",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: <PlusCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
  },
  melhoria: {
    label: "MELHORIA",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    icon: <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />,
  },
  correcao: {
    label: "CORREÇÃO",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    icon: <Wrench className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
  },
  seguranca: {
    label: "SEGURANÇA",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
    icon: <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />,
  },
};

export default function WhatsNewModal({
  isOpen,
  onClose,
  currentVersion = "1.0.18",
}: WhatsNewModalProps) {
  const [selectedVersion, setSelectedVersion] = useState<string>(
    currentVersion.replace(/^v/, "")
  );

  if (!isOpen) return null;

  const activeRelease =
    getReleaseNoteForVersion(selectedVersion) || RELEASE_NOTES[0];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="whats-new-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex flex-col w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Header Decorativo */}
        <div className="relative px-6 pt-6 pb-5 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white select-none">
          <button
            onClick={onClose}
            aria-label="Fechar novidades"
            className="absolute top-4 right-4 p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black tracking-wider uppercase bg-white/20 backdrop-blur-md text-white border border-white/30 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
              Novidades do Sistema
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-black/20 text-white/90">
              v{activeRelease.version}
            </span>
          </div>

          <h2
            id="whats-new-title"
            className="text-xl sm:text-2xl font-black text-white tracking-tight"
          >
            {activeRelease.title}
          </h2>

          <p className="mt-1.5 text-xs sm:text-sm text-orange-50/90 leading-relaxed font-medium">
            {activeRelease.subtitle}
          </p>

          <div className="flex items-center gap-2 mt-3 text-[11px] text-orange-100/80 font-semibold">
            <Calendar className="w-3.5 h-3.5" />
            <span>Lançado em {activeRelease.date}</span>
          </div>
        </div>

        {/* Seletor de Versões Anteriores (se houver histórico) */}
        {RELEASE_NOTES.length > 1 && (
          <div className="flex items-center gap-1.5 px-6 py-2.5 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 overflow-x-auto text-xs no-scrollbar">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap mr-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              Versão:
            </span>
            {RELEASE_NOTES.map((note) => {
              const isSelected = note.version === activeRelease.version;
              return (
                <button
                  key={note.version}
                  onClick={() => setSelectedVersion(note.version)}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-all whitespace-nowrap ${
                    isSelected
                      ? "bg-orange-600 text-white shadow-sm"
                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                  }`}
                >
                  v{note.version}
                </button>
              );
            })}
          </div>
        )}

        {/* Lista de Novidades e Melhorias */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Destaques desta versão
          </div>

          <div className="grid gap-3">
            {activeRelease.highlights.map((item, idx) => {
              const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.melhoria;
              return (
                <div
                  key={idx}
                  className="group relative flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800/70 hover:border-orange-200 dark:hover:border-orange-900/50 transition-all shadow-sm"
                >
                  <div
                    className={`mt-0.5 shrink-0 flex items-center justify-center w-7 h-7 rounded-lg border ${config.bg} ${config.border}`}
                    title={config.label}
                  >
                    {config.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide border ${config.bg} ${config.text} ${config.border}`}
                      >
                        {config.label}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        {item.title}
                      </h4>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rodapé Fixo com Ação */}
        <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-900/90 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center sm:text-left">
            💡 Você pode rever as novidades clicando no número da versão no rodapé da barra lateral.
          </p>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 shadow-md shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <span>Entendi, vamos começar!</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
