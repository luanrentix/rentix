"use client";

import React from "react";
import { type CompanySettings, type SettingsTab, type UserSettings } from "../types/settings.types";

interface SettingsSidebarProps {
  userSettings: UserSettings;
  companySettings: CompanySettings;
  companyDisplayName: string;
  companyLogoFallbackText: string;
  activeSettingsTab: SettingsTab;
  setActiveSettingsTab: (tab: SettingsTab) => void;
  canResetTestData: boolean;
  onOpenResetModal: () => void;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  userSettings,
  companySettings,
  companyDisplayName,
  companyLogoFallbackText,
  activeSettingsTab,
  setActiveSettingsTab,
  canResetTestData,
  onOpenResetModal,
}) => {
  return (
    <aside className="flex flex-col border-b border-slate-100 bg-slate-50 p-3 sm:p-4 lg:border-b-0 lg:border-r">
      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-xl font-black text-white">
            {companySettings.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={companySettings.logo}
                alt={`Logo ${companyDisplayName}`}
                className="h-full w-full bg-white object-contain p-1.5"
              />
            ) : (
              companyLogoFallbackText
            )}
          </div>

          <div>
            <p className="text-sm font-black text-slate-900">{userSettings.name}</p>
            <p className="text-xs font-medium text-slate-500">Administrador</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-orange-50 px-3 py-3">
          <p className="text-xs font-bold text-orange-700">Empresa</p>
          <p className="mt-1 truncate text-sm font-black text-slate-900">
            {companySettings.tradeName || companySettings.companyName || "Não cadastrada"}
          </p>
        </div>
      </div>

      <div className="contrx-mobile-scroll-tabs mt-4 space-y-0 lg:block lg:space-y-2">
        <button
          type="button"
          onClick={() => setActiveSettingsTab("company")}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-3 text-center text-sm font-black transition lg:justify-start lg:gap-3 lg:px-4 lg:text-left ${
            activeSettingsTab === "company"
              ? "bg-orange-500 text-white shadow-md shadow-orange-100"
              : "bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-600"
          }`}
        >
          🏢 Cadastro da empresa
        </button>

        <button
          type="button"
          onClick={() => setActiveSettingsTab("user")}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-3 text-center text-sm font-black transition lg:justify-start lg:gap-3 lg:px-4 lg:text-left ${
            activeSettingsTab === "user"
              ? "bg-orange-500 text-white shadow-md shadow-orange-100"
              : "bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-600"
          }`}
        >
          👤 Dados do usuário
        </button>

        <button
          type="button"
          onClick={() => setActiveSettingsTab("print")}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-3 text-center text-sm font-black transition lg:justify-start lg:gap-3 lg:px-4 lg:text-left ${
            activeSettingsTab === "print"
              ? "bg-orange-500 text-white shadow-md shadow-orange-100"
              : "bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-600"
          }`}
        >
          🖨️ Impressos
        </button>

        <button
          type="button"
          onClick={() => setActiveSettingsTab("appearance")}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-3 text-center text-sm font-black transition lg:justify-start lg:gap-3 lg:px-4 lg:text-left ${
            activeSettingsTab === "appearance"
              ? "bg-orange-500 text-white shadow-md shadow-orange-100"
              : "bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-600"
          }`}
        >
          🎨 Aparência
        </button>
      </div>

      {canResetTestData && (
        <button
          type="button"
          onClick={onOpenResetModal}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-sm font-black text-white shadow-md shadow-red-100 transition hover:bg-red-600 lg:mt-auto"
        >
          ⚠️ Resetar dados de teste
        </button>
      )}
    </aside>
  );
};
