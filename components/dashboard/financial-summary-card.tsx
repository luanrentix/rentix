"use client";

import type { ReactNode } from "react";

type FinancialSummaryCardProps = {
  title: string;
  value: string;
  detail: string;
  tone: "orange" | "slate" | "green" | "red" | "emerald" | "amber" | "indigo";
  icon?: ReactNode;
  isPrivacyMode?: boolean;
  isLoading?: boolean;
  onClick?: () => void;
};

export function FinancialSummaryCard({
  title,
  value,
  detail,
  tone,
  icon,
  isPrivacyMode = false,
  isLoading,
  onClick,
}: FinancialSummaryCardProps) {
  const toneConfig = {
    orange: {
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400",
      badge: "bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
    },
    slate: {
      color: "text-slate-800 dark:text-slate-200",
      bg: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    },
    green: {
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
      badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    },
    emerald: {
      color: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
      badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    },
    red: {
      color: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400",
      badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
    },
    amber: {
      color: "text-amber-700 dark:text-amber-400",
      bg: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
      badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
    },
    indigo: {
      color: "text-indigo-600 dark:text-indigo-400",
      bg: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400",
      badge: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300",
    },
  }[tone];

  if (isLoading) {
    return (
      <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm animate-pulse dark:border-slate-800 dark:bg-slate-900 min-h-[110px]">
        <div className="flex items-center justify-between">
          <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-6 w-6 rounded-lg bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="mt-3">
          <div className="h-6 w-28 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="mt-1 h-3 w-32 rounded bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  const displayVal = isPrivacyMode ? "R$ ••••••" : value;

  return (
    <div
      onClick={onClick}
      className={`group flex flex-col justify-between rounded-2xl border bg-white p-4 text-left transition-all duration-200 border-slate-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 ${
        onClick ? "cursor-pointer hover:border-orange-300" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate max-w-[85%]">
          {title}
        </span>
        {icon && (
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${toneConfig.bg}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="mt-3">
        <p className={`text-2xl font-black tracking-tight ${toneConfig.color}`}>
          {displayVal}
        </p>
        <p className="mt-1 truncate text-xs font-semibold text-slate-400 dark:text-slate-500">
          {detail}
        </p>
      </div>
    </div>
  );
}
