"use client";

import Link from "next/link";
import { ArrowRight, CircleCheck, X } from "lucide-react";

type OnboardingStep = {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  href: string;
};

type OnboardingChecklistProps = {
  steps: OnboardingStep[];
  onDismiss: () => void;
};

export function OnboardingChecklist({ steps, onDismiss }: OnboardingChecklistProps) {
  const completedStepsCount = steps.filter((step) => step.completed).length;

  return (
    <div className="rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50/70 to-white p-5 shadow-sm md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
            <span>🎯 Primeiros Passos no Contrx</span>
            <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-black text-orange-700">
              {completedStepsCount} de {steps.length} concluído
            </span>
          </h2>
          <p className="text-sm font-semibold text-slate-500">
            Complete as etapas fundamentais para ativar e gerenciar seus contratos de forma profissional.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          title="Ocultar painel"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Barra de progresso */}
      <div className="mt-4 h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full bg-orange-500 rounded-full transition-all duration-500"
          style={{ width: `${(completedStepsCount / steps.length) * 100}%` }}
        />
      </div>

      {/* Cards de etapas */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {steps.map((step, idx) => (
          <div
            key={step.id}
            className={`flex flex-col justify-between rounded-2xl border p-4 transition ${
              step.completed
                ? "border-emerald-100 bg-emerald-50/30"
                : "border-slate-200 bg-white hover:border-orange-200"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {step.completed ? (
                  <CircleCheck className="h-5 w-5 shrink-0 text-emerald-600" />
                ) : (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 text-xs font-bold text-slate-400">
                    {idx + 1}
                  </span>
                )}
                <h3
                  className={`text-sm font-black ${
                    step.completed ? "text-slate-700 line-through" : "text-slate-900"
                  }`}
                >
                  {step.label}
                </h3>
              </div>
              <p className="text-xs font-semibold leading-5 text-slate-500">
                {step.description}
              </p>
            </div>

            {!step.completed && (
              <Link
                href={step.href}
                className="mt-4 inline-flex items-center gap-1 text-xs font-black text-orange-600 hover:text-orange-700 transition"
              >
                Começar etapa
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
