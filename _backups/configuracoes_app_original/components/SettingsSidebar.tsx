"use client";

import React from "react";
import {
  Building2,
  User,
  Printer,
  Palette,
  AlertTriangle,
} from "lucide-react";
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
  const tabs = [
    {
      id: "company" as SettingsTab,
      label: "Cadastro da empresa",
      description: "Dados fiscais, endereço e logo",
      icon: Building2,
    },
    {
      id: "user" as SettingsTab,
      label: "Usuários e equipe",
      description: "Meu perfil e membros com acesso",
      icon: User,
    },
    {
      id: "print" as SettingsTab,
      label: "Impressos e contratos",
      description: "Modelos PDF e minutas padrão",
      icon: Printer,
    },
    {
      id: "appearance" as SettingsTab,
      label: "Aparência e tema",
      description: "Modo escuro e cores de destaque",
      icon: Palette,
    },
  ];

  return (
    <aside className="flex flex-col border-b border-slate-200/80 bg-slate-50/70 p-4 sm:p-5 lg:w-full lg:shrink-0 lg:border-b-0 lg:border-r">
      {/* Profile & Company summary card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-lg font-bold text-white shadow-inner">
            {companySettings.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={companySettings.logo}
                alt={`Logo ${companyDisplayName}`}
                className="h-full w-full bg-white object-contain p-1"
              />
            ) : (
              companyLogoFallbackText
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{userSettings.name}</p>
            <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20">
              Administrador
            </span>
          </div>
        </div>

        <div className="mt-3.5 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
          <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Empresa Ativa</p>
          <p className="mt-0.5 truncate text-xs font-bold text-slate-800">
            {companySettings.tradeName || companySettings.companyName || "Não cadastrada"}
          </p>
        </div>
      </div>

      {/* Nav Tabs */}
      <nav className="contrx-mobile-scroll-tabs mt-5 flex gap-2 overflow-x-auto pb-2 lg:mt-5 lg:flex lg:flex-col lg:gap-1.5 lg:overflow-visible lg:pb-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSettingsTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSettingsTab(tab.id)}
              className={`group flex w-full shrink-0 items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-all duration-150 ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100/80 hover:text-slate-900 lg:bg-transparent"
              }`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 transition-colors ${
                  isActive ? "text-orange-400" : "text-slate-400 group-hover:text-slate-600"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-bold ${isActive ? "text-white" : "text-slate-800 group-hover:text-slate-900"}`}>
                  {tab.label}
                </p>
                <p className={`hidden text-[11px] font-medium lg:block ${isActive ? "text-slate-300" : "text-slate-400"}`}>
                  {tab.description}
                </p>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Danger Reset action */}
      {canResetTestData && (
        <div className="mt-6 pt-4 border-t border-slate-200/60 lg:mt-auto">
          <button
            type="button"
            onClick={onOpenResetModal}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/50 px-3.5 py-2.5 text-xs font-semibold text-red-700 transition hover:bg-red-100/80 hover:text-red-800"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
            <span>Resetar dados de teste</span>
          </button>
        </div>
      )}
    </aside>
  );
};

