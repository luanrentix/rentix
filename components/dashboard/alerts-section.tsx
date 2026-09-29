"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CircleCheck, Info } from "lucide-react";
import type { DashboardAlert } from "@/types/dashboard.types";

type AlertsSectionProps = {
  alerts: DashboardAlert[];
  isLoading?: boolean;
};

export function AlertsSection({ alerts, isLoading }: AlertsSectionProps) {
  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm xl:col-span-4 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-black text-slate-950 dark:text-white">Central de atenção</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Pontos prioritários que merecem ação imediata na gestão da carteira.
      </p>

      <div className="mt-5 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <p className="text-sm font-semibold text-slate-500">
            Nenhum alerta pendente no momento.
          </p>
        ) : (
          alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
        )}
      </div>
    </section>
  );
}

function AlertCard({ alert }: { alert: DashboardAlert }) {
  const alertStyle = {
    critical: "border-red-100 bg-red-50 text-red-700",
    warning: "border-orange-100 bg-orange-50 text-orange-700",
    info: "border-sky-100 bg-sky-50 text-sky-700",
    success: "border-emerald-100 bg-emerald-50 text-emerald-700",
  }[alert.level];

  const buttonStyle = {
    critical: "bg-red-600 text-white hover:bg-red-700",
    warning: "bg-orange-600 text-white hover:bg-orange-700",
    info: "bg-sky-600 text-white hover:bg-sky-700",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
  }[alert.level];

  const Icon = {
    critical: AlertTriangle,
    warning: AlertTriangle,
    info: Info,
    success: CircleCheck,
  }[alert.level];

  return (
    <div className={`rounded-2xl border p-4 ${alertStyle} transition hover:shadow-sm`}>
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-black leading-snug">{alert.title}</p>
          <p className="mt-1 text-xs opacity-90 leading-relaxed">
            {alert.description}
          </p>

          {alert.actionUrl && alert.actionLabel && (
            <div className="mt-3">
              <Link
                href={alert.actionUrl}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-black shadow-sm transition ${buttonStyle}`}
              >
                {alert.actionLabel}
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
