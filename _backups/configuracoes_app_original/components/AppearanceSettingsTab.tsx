"use client";

import React from "react";
import { Sun, Moon, Palette } from "lucide-react";
import { type ThemeSettings, accentColors } from "../types/settings.types";

interface AppearanceSettingsTabProps {
  themeSettings: ThemeSettings;
  setThemeSettings: React.Dispatch<React.SetStateAction<ThemeSettings>>;
  isSaving: boolean;
  onSave: () => void;
}

export const AppearanceSettingsTab: React.FC<AppearanceSettingsTabProps> = ({
  themeSettings,
  setThemeSettings,
  isSaving,
  onSave,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Aparência e Personalização</h2>
        <p className="mt-1 text-sm font-normal text-slate-500">
          Escolha o tema de visualização e a cor de destaque principal do sistema Contrx.
        </p>
      </div>

      {/* Theme Mode Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold tracking-wider uppercase text-slate-400">
          Modo do Tema
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setThemeSettings((prev) => ({ ...prev, mode: "light" }))}
            className={`flex flex-col items-center justify-center gap-2.5 rounded-xl border p-4 transition ${
              themeSettings.mode === "light"
                ? "border-orange-500 bg-orange-50/40 text-orange-900 ring-2 ring-orange-500/20"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            }`}
          >
            <Sun className="h-6 w-6 text-amber-500" />
            <span className="text-xs font-bold">Modo Claro (Padrão)</span>
          </button>

          <button
            type="button"
            onClick={() => setThemeSettings((prev) => ({ ...prev, mode: "graphite" }))}
            className={`flex flex-col items-center justify-center gap-2.5 rounded-xl border p-4 transition ${
              themeSettings.mode === "graphite"
                ? "border-orange-500 bg-slate-800 text-white ring-2 ring-orange-500/20"
                : "border-slate-200 bg-slate-900 text-slate-300 hover:border-slate-700"
            }`}
          >
            <Moon className="h-6 w-6 text-slate-300" />
            <span className="text-xs font-bold">Grafite / Escuro</span>
          </button>

          <button
            type="button"
            onClick={() => setThemeSettings((prev) => ({ ...prev, mode: "black" }))}
            className={`flex flex-col items-center justify-center gap-2.5 rounded-xl border p-4 transition ${
              themeSettings.mode === "black"
                ? "border-orange-500 bg-slate-950 text-white ring-2 ring-orange-500/20"
                : "border-slate-200 bg-slate-950 text-slate-400 hover:border-slate-800"
            }`}
          >
            <Palette className="h-6 w-6 text-slate-400" />
            <span className="text-xs font-bold">Preto Total (AMOLED)</span>
          </button>
        </div>
      </div>

      {/* Accent Colors Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
        <h3 className="text-xs font-bold tracking-wider uppercase text-slate-400">
          Cor de Destaque
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {accentColors.map((item) => {
            const isSelected = (themeSettings.accent || "orange") === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setThemeSettings((prev) => ({ ...prev, accent: item.key }))}
                className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                  isSelected
                    ? "border-orange-500 bg-orange-50/20 ring-2 ring-orange-500/20"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div
                  className="h-7 w-7 shrink-0 rounded-lg shadow-sm border border-black/10"
                  style={{ backgroundColor: item.color }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900">{item.label}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500 leading-tight">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Save Action */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-orange-600 disabled:opacity-50"
        >
          {isSaving ? "Salvando..." : "Salvar preferência de aparência"}
        </button>
      </div>
    </div>
  );
};

