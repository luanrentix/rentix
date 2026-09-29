"use client";

import React from "react";
import {
  ContractDisplayStatus,
  getContractStatusLabel,
} from "./contract-types";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Ban,
  Trash2,
  Calendar,
} from "lucide-react";

interface ContractStatusBadgeProps {
  status: ContractDisplayStatus;
  className?: string;
  onClick?: () => void;
  title?: string;
}

export function ContractStatusBadge({
  status,
  className = "",
  onClick,
  title,
}: ContractStatusBadgeProps) {
  const isClickable = Boolean(onClick);
  const Component = isClickable ? "button" : "span";
  const label = getContractStatusLabel(status);

  let badgeStyle = "border-slate-200 bg-slate-100 text-slate-600";
  let dotStyle = "bg-slate-400";
  let Icon = null;

  switch (status) {
    case "Active":
      badgeStyle = "border-emerald-200 bg-emerald-50 text-emerald-700";
      dotStyle = "bg-emerald-500";
      Icon = CheckCircle2;
      break;
    case "Scheduled":
      badgeStyle = "border-sky-200 bg-sky-50 text-sky-700";
      dotStyle = "bg-sky-500";
      Icon = Calendar;
      break;
    case "Expiring":
      badgeStyle = "border-amber-200 bg-amber-50 text-amber-700";
      dotStyle = "bg-amber-500";
      Icon = Clock;
      break;
    case "Expired":
      badgeStyle = "border-rose-200 bg-rose-50 text-rose-700";
      dotStyle = "bg-rose-500";
      Icon = AlertTriangle;
      break;
    case "Finished":
      badgeStyle = "border-blue-200 bg-blue-50 text-blue-700";
      dotStyle = "bg-blue-500";
      Icon = CheckCircle2;
      break;
    case "Canceled":
      badgeStyle = "border-slate-200 bg-slate-100 text-slate-600";
      dotStyle = "bg-slate-400";
      Icon = Ban;
      break;
    case "Deleted":
      badgeStyle = "border-red-200 bg-red-50 text-red-700";
      dotStyle = "bg-red-400";
      Icon = Trash2;
      break;
    default:
      badgeStyle = "border-slate-200 bg-slate-100 text-slate-600";
      dotStyle = "bg-slate-400";
      break;
  }

  return (
    <Component
      type={isClickable ? "button" : undefined}
      onClick={onClick}
      title={title || (isClickable ? `Status: ${label}` : undefined)}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-black tracking-tight transition-all ${badgeStyle} ${
        isClickable
          ? "cursor-pointer hover:shadow-sm hover:scale-105 active:scale-95 hover:brightness-95 select-none"
          : ""
      } ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyle}`} />
      {label}
      {Icon && <Icon className="h-3 w-3 opacity-70 ml-0.5" />}
    </Component>
  );
}

export function ContractRentalTypeBadge({
  isTemporaryRental,
}: {
  isTemporaryRental?: boolean;
}) {
  if (isTemporaryRental) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[11px] font-black text-orange-700">
        Temporada
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-black text-slate-600">
      Padrão
    </span>
  );
}
