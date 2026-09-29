"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RevenueMonthItem } from "@/types/dashboard.types";

type RevenueEvolutionChartProps = {
  data: RevenueMonthItem[];
  viewMode: "month" | "day";
  onViewModeChange: (mode: "month" | "day") => void;
  isPrivacyMode?: boolean;
  isLoading?: boolean;
};

const chartColors = {
  orange: "var(--primary-color, #f97316)",
  slate: "#94a3b8",
};

export function RevenueEvolutionChart({
  data,
  viewMode,
  onViewModeChange,
  isPrivacyMode = false,
  isLoading,
}: RevenueEvolutionChartProps) {
  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm animate-pulse h-80 min-h-[320px] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6 dark:border-slate-800">
          <div className="space-y-2">
            <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3.5 w-64 rounded bg-slate-100 dark:bg-slate-800" />
          </div>
          <div className="h-8 w-24 rounded-full bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="h-56 w-full flex items-end justify-between gap-4 pt-4">
          <div className="h-[30%] w-full rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-[60%] w-full rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-[80%] w-full rounded bg-slate-100 dark:bg-slate-800" />
          <div className="h-[45%] w-full rounded bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  const description =
    viewMode === "month"
      ? "Receita prevista por mês com base nos contratos ativos. Não representa recebimento liquidado."
      : "Projeção diária dos últimos 30 dias com base nos contratos ativos em cada data.";

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm xl:col-span-8 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-950 dark:text-white">
            Evolução da receita contratada
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => onViewModeChange("month")}
              className={`rounded-full px-3 py-2 text-xs font-black transition ${
                viewMode === "month"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
              }`}
            >
              Mês
            </button>

            <button
              type="button"
              onClick={() => onViewModeChange("day")}
              className={`rounded-full px-3 py-2 text-xs font-black transition ${
                viewMode === "day"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
              }`}
            >
              Dia
            </button>
          </div>

          <span className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
            Receita prevista
          </span>
          <span className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
            Contratos
          </span>
        </div>
      </div>

      <div className="h-80 min-h-[320px] min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={320}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="month" tickLine={false} axisLine={false} />
            <YAxis
              yAxisId="revenue"
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => compactCurrency(Number(val))}
            />
            <YAxis
              yAxisId="contracts"
              orientation="right"
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              formatter={(val, name) => {
                if (name === "expected") {
                  return [isPrivacyMode ? "R$ ••••••" : formatCurrency(Number(val)), "Receita prevista"];
                }
                return [Number(val), "Contratos"];
              }}
              labelFormatter={(label) => `${viewMode === "month" ? "Mês" : "Dia"}: ${label}`}
            />
            <Bar
              yAxisId="revenue"
              dataKey="expected"
              radius={[12, 12, 0, 0]}
              fill={chartColors.orange}
              barSize={viewMode === "month" ? 44 : 18}
            />
            <Line
              yAxisId="contracts"
              type="monotone"
              dataKey="activeContracts"
              stroke={chartColors.slate}
              strokeWidth={3}
              dot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function formatCurrency(value?: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function compactCurrency(value: number) {
  if (value >= 1000) {
    return `R$ ${(value / 1000).toLocaleString("pt-BR", {
      maximumFractionDigits: 1,
    })}k`;
  }
  return `R$ ${value}`;
}
