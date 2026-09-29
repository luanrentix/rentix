"use client";

import React from "react";
import type { AdminTab } from "./admin-types";
import { Building2, UsersRound, ShieldAlert, Cpu } from "lucide-react";

interface AdminTabsProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  companiesCount: number;
  usersCount: number;
  criticalErrorsCount: number;
}

export function AdminTabs({
  activeTab,
  onTabChange,
  companiesCount,
  usersCount,
  criticalErrorsCount,
}: AdminTabsProps) {
  const tabs = [
    {
      id: "empresas" as AdminTab,
      label: "Empresas",
      icon: Building2,
      count: companiesCount,
    },
    {
      id: "usuarios" as AdminTab,
      label: "Usuários",
      icon: UsersRound,
      count: usersCount,
    },
    {
      id: "logs" as AdminTab,
      label: "Logs do Sistema",
      icon: ShieldAlert,
      badge: criticalErrorsCount > 0 ? `${criticalErrorsCount} falhas` : undefined,
      badgeTone: "danger" as const,
    },
    {
      id: "avancado" as AdminTab,
      label: "Avançado & Diagnóstico",
      icon: Cpu,
    },
  ];

  return (
    <div className="flex border border-slate-200/80 bg-white gap-2 overflow-x-auto p-1.5 rounded-2xl shadow-sm shrink-0">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`py-3 px-5 font-black text-xs sm:text-sm flex items-center gap-2.5 rounded-xl transition shrink-0 active:scale-95 ${
              isActive
                ? "bg-orange-600 text-white shadow-md shadow-orange-200"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-500"}`} />
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            )}
            {tab.badge && (
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-black ${
                  isActive
                    ? "bg-white text-red-600"
                    : "bg-red-50 text-red-600 ring-1 ring-red-200"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
