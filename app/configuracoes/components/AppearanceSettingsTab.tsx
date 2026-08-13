"use client";

import React from "react";
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
      <div>
        <h2 className="text-xl font-black text-slate-950">Aparência e Personalização</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">
          Personalize o modo de visualização e a cor de destaque da interface do Contrx.
        </p>
      </div>

      <div className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">
          Modo do Tema
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <button
            type="button"
            onClick={() => setThemeSettings((prev) => ({ ...prev, mode: "light" }))}
            className={`flex flex-col items-center justify-center gap-3 rounded-2xl border p-5 transition ${
              themeSettings.mode === "light"
                ? "border-orange-500 bg-orange-50/50 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <span className="text-2xl">☀️</span>
            <span className="text-sm font-black text-slate-900">Modo Claro (Padrão)</span>
          </button>

          <button
            type="button"
            onClick={() => setThemeSettings((prev) => ({ ...prev, mode: "graphite" }))}
            className={`flex flex-col items-center justify-center gap-3 rounded-2xl border p-5 transition ${
              themeSettings.mode === "graphite"
                ? "border-orange-500 bg-slate-800 text-white shadow-sm"
                : "border-slate-200 bg-slate-900 text-slate-300 hover:border-slate-700"
            }`}
          >
            <span className="text-2xl">🌑</span>
            <span className="text-sm font-black">Grafite / Escuro</span>
          </button>

          <button
            type="button"
            onClick={() => setThemeSettings((prev) => ({ ...prev, mode: "black" }))}
            className={`flex flex-col items-center justify-center gap-3 rounded-2xl border p-5 transition ${
              themeSettings.mode === "black"
                ? "border-orange-500 bg-black text-white shadow-sm"
                : "border-slate-200 bg-slate-950 text-slate-400 hover:border-slate-800"
            }`}
          >
            <span className="text-2xl">🌙</span>
            <span className="text-sm font-black">Preto Total (AMOLED)</span>
          </button>
        </div>
      </div>

      <div className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-black uppercase tracking-wide text-slate-700">
          Cor de Destaque
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accentColors.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setThemeSettings((prev) => ({ ...prev, accent: item.key }))}
              className={`flex items-start gap-4 rounded-2xl border p-4 text-left transition ${
                (themeSettings.accent || "orange") === item.key
                  ? "border-orange-500 bg-slate-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div
                className="h-8 w-8 shrink-0 rounded-xl shadow-sm"
                style={{ backgroundColor: item.color }}
              />
              <div>
                <p className="text-sm font-black text-slate-900">{item.label}</p>
                <p className="mt-0.5 text-xs font-medium text-slate-500">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="rounded-2xl bg-orange-500 px-6 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600 disabled:opacity-50"
        >
          {isSaving ? "Salvando..." : "Salvar preferência de aparência"}
        </button>
      </div>
    </div>
  );
};
