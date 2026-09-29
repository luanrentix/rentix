"use client";

import type { ReactNode } from "react";

type MetricCardProps = {
  icon: ReactNode;
  title: string;
  value: string | number;
  detail: string;
  trend?: string;
  isPrivacyMode?: boolean;
  isCurrency?: boolean;
  isLoading?: boolean;
  colorClass?: string;
  bgClass?: string;
  onClick?: () => void;
};

export function MetricCard({
  icon,
  title,
  value,
  detail,
  trend,
  isPrivacyMode = false,
  isCurrency = false,
  isLoading,
  colorClass = "text-slate-950 dark:text-white",
  bgClass = "bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400",
  onClick,
}: MetricCardProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm animate-pulse dark:border-slate-800 dark:bg-slate-900 min-h-[120px]">
        <div className="flex items-center justify-between">
          <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="mt-3">
          <div className="h-7 w-32 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="mt-1 h-3 w-40 rounded bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  const displayValue = isPrivacyMode && isCurrency ? "R$ ••••••" : value;

  return (
    <div
      onClick={onClick}
      className={`group flex flex-col justify-between rounded-2xl border bg-white p-4 text-left transition-all duration-200 border-slate-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 ${
        onClick ? "cursor-pointer hover:border-orange-300" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate max-w-[80%]">
          {title}
        </span>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${bgClass}`}>
          {icon}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className={`text-2xl font-black tracking-tight ${colorClass}`}>
            {displayValue}
          </span>
          {trend && (
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {trend}
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-xs font-semibold text-slate-400 dark:text-slate-500">
          {detail}
        </p>
      </div>
    </div>
  );
}
