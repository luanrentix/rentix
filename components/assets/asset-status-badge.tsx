"use client";

import React from "react";
import {
  AssetOperationalStatus,
  getOperationalStatusConfig,
} from "./asset-types";

import { FileText } from "lucide-react";

interface AssetStatusBadgeProps {
  status: AssetOperationalStatus | string;
  className?: string;
  onClick?: () => void;
  title?: string;
}

export function AssetStatusBadge({
  status,
  className = "",
  onClick,
  title,
}: AssetStatusBadgeProps) {
  const config = getOperationalStatusConfig(status);
  const isClickable = Boolean(onClick);
  const Component = isClickable ? "button" : "span";

  return (
    <Component
      type={isClickable ? "button" : undefined}
      onClick={onClick}
      title={title || (isClickable ? "Clique para ver detalhes" : undefined)}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-black tracking-tight transition-all ${config.badgeClass} ${
        isClickable
          ? "cursor-pointer hover:shadow-sm hover:scale-105 active:scale-95 hover:brightness-95 select-none"
          : ""
      } ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dotClass}`} />
      {config.label}
      {isClickable && (
        <FileText className="h-3 w-3 opacity-70 ml-0.5" />
      )}
    </Component>
  );
}

export function AssetActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-black ${
        isActive
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-500"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isActive ? "bg-emerald-500" : "bg-slate-400"
        }`}
      />
      {isActive ? "Ativo" : "Inativo"}
    </span>
  );
}
