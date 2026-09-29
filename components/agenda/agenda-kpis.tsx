"use client";

import type { ReactNode } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  XCircle,
} from "lucide-react";

type AgendaKpisProps = {
  todayCount: number;
  scheduledCount: number;
  completedCount: number;
  highPriorityCount: number;
  overdueCount: number;
  isBlackTheme: boolean;
};

export function AgendaKpis({
  todayCount,
  scheduledCount,
  completedCount,
  highPriorityCount,
  overdueCount,
  isBlackTheme,
}: AgendaKpisProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <MetricCard
        title="Hoje"
        value={todayCount}
        description="compromissos do dia"
        icon={<CalendarClock className="h-5 w-5" />}
        isBlackTheme={isBlackTheme}
      />
      <MetricCard
        title="Agendados"
        value={scheduledCount}
        description="em aberto"
        icon={<CalendarDays className="h-5 w-5" />}
        isBlackTheme={isBlackTheme}
      />
      <MetricCard
        title="Concluídos"
        value={completedCount}
        description="finalizados"
        icon={<CheckCircle2 className="h-5 w-5" />}
        tone="green"
        isBlackTheme={isBlackTheme}
      />
      <MetricCard
        title="Alta prioridade"
        value={highPriorityCount}
        description="pedem atenção"
        icon={<AlertTriangle className="h-5 w-5" />}
        tone="red"
        isBlackTheme={isBlackTheme}
      />
      <MetricCard
        title="Atrasados"
        value={overdueCount}
        description="fora do prazo"
        icon={<XCircle className="h-5 w-5" />}
        tone="red"
        isBlackTheme={isBlackTheme}
      />
    </section>
  );
}

function MetricCard({
  description,
  icon,
  isBlackTheme,
  title,
  tone = "orange",
  value,
}: {
  description: string;
  icon: ReactNode;
  isBlackTheme: boolean;
  title: string;
  tone?: "orange" | "green" | "red";
  value: number;
}) {
  const toneClass =
    tone === "green"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "red"
        ? "text-red-600 dark:text-red-400"
        : "text-orange-600 dark:text-orange-400";

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${
        isBlackTheme
          ? "border-[#334155] bg-[#0f172a]"
          : "border-[#e2e8f0] bg-[#ffffff]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <p
          className={`text-sm font-bold ${
            isBlackTheme ? "text-[#cbd5e1]" : "text-[#64748b]"
          }`}
        >
          {title}
        </p>
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${
            isBlackTheme
              ? "bg-[#020617] text-orange-300"
              : "bg-orange-50 text-orange-600"
          }`}
        >
          {icon}
        </span>
      </div>
      <h2 className={`mt-3 text-2xl font-black ${toneClass}`}>{value}</h2>
      <p
        className={`mt-1 text-xs font-bold uppercase tracking-[0.12em] ${
          isBlackTheme ? "text-[#94a3b8]" : "text-[#64748b]"
        }`}
      >
        {description}
      </p>
    </div>
  );
}
