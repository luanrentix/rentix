"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, Check, Clock, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { getScheduleItems, updateScheduleItem, type ScheduleItem } from "@/services/schedule.service";

export default function AgendaNotificationListener() {
  const { user } = useAuth();
  const companyId = user?.companyId;

  const [activeNotification, setActiveNotification] = useState<ScheduleItem | null>(null);
  const [snoozedIds, setSnoozedIds] = useState<Record<string, number>>({});
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  // Carrega configurações locais de snooze e descarte
  useEffect(() => {
    try {
      const storedDismissed = localStorage.getItem("contrx_dismissed_reminders");
      if (storedDismissed) {
        setDismissedIds(JSON.parse(storedDismissed));
      }
      const storedSnoozed = localStorage.getItem("contrx_snoozed_reminders");
      if (storedSnoozed) {
        setSnoozedIds(JSON.parse(storedSnoozed));
      }
    } catch (e) {
      console.error("Erro ao carregar estados dos lembretes", e);
    }
  }, []);

  const checkReminders = useCallback(async () => {
    if (!companyId) return;

    try {
      const items = await getScheduleItems();
      const now = Date.now();

      // Encontra o primeiro lembrete ativo que deve ser notificado
      const triggered = items.find((item) => {
        if (item.status !== "scheduled") return false;
        if (item.reminder === "Sem lembrete") return false;
        if (dismissedIds.includes(item.id)) return false;

        // Verifica se está adiado (snooze)
        const snoozeUntil = snoozedIds[item.id];
        if (snoozeUntil && now < snoozeUntil) return false;

        // Calcula o tempo de disparo com base no tipo de lembrete
        const itemDateStr = item.date.split("T")[0];
        const itemDateTime = new Date(`${itemDateStr}T${item.time}:00`).getTime();
        if (isNaN(itemDateTime)) return false;

        let reminderOffsetMs = 0;
        let triggerTime = itemDateTime;

        if (item.reminder === "No início do dia") {
          const dayStart = new Date(`${itemDateStr}T08:00:00`).getTime();
          triggerTime = isNaN(dayStart) ? itemDateTime : dayStart;
        } else {
          if (item.reminder === "15 minutos antes") reminderOffsetMs = 15 * 60 * 1000;
          else if (item.reminder === "30 minutos antes") reminderOffsetMs = 30 * 60 * 1000;
          else if (item.reminder === "1 hora antes") reminderOffsetMs = 60 * 60 * 1000;
          else if (item.reminder === "2 horas antes") reminderOffsetMs = 2 * 60 * 60 * 1000;
          else if (item.reminder === "1 dia antes") reminderOffsetMs = 24 * 60 * 60 * 1000;
          else if (item.reminder === "2 dias antes") reminderOffsetMs = 48 * 60 * 60 * 1000;

          triggerTime = itemDateTime - reminderOffsetMs;
        }

        // Dispara se o horário atual passou do horário do lembrete
        return now >= triggerTime;
      });

      if (triggered) {
        setActiveNotification(triggered);
      } else {
        setActiveNotification(null);
      }
    } catch (error) {
      if (error && typeof error === "object" && "name" in error && error.name === "SessionReplacedError") {
        return;
      }
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes("Nao foi possivel conectar a API")) {
        console.warn("Agenda offline: O servidor backend está inacessível.");
      } else {
        console.error("Erro ao verificar lembretes de agenda:", error);
      }
    }
  }, [companyId, dismissedIds, snoozedIds]);

  // Executa checagem periódica a cada 10 segundos
  useEffect(() => {
    if (!companyId) return;
    
    checkReminders();
    const interval = setInterval(checkReminders, 10000);
    return () => clearInterval(interval);
  }, [companyId, checkReminders]);

  const handleDismiss = () => {
    if (!activeNotification) return;
    const nextDismissed = [...dismissedIds, activeNotification.id];
    setDismissedIds(nextDismissed);
    localStorage.setItem("contrx_dismissed_reminders", JSON.stringify(nextDismissed));
    setActiveNotification(null);
  };

  const handleSnooze = () => {
    if (!activeNotification) return;
    const nextSnoozed = {
      ...snoozedIds,
      [activeNotification.id]: Date.now() + 15 * 60 * 1000, // Adia por 15 minutos
    };
    setSnoozedIds(nextSnoozed);
    localStorage.setItem("contrx_snoozed_reminders", JSON.stringify(nextSnoozed));
    setActiveNotification(null);
  };

  const handleComplete = async () => {
    if (!activeNotification) return;
    try {
      await updateScheduleItem(activeNotification.id, { status: "completed" });
      handleDismiss();
    } catch (error) {
      console.error("Erro ao finalizar compromisso:", error);
      alert("Não foi possível finalizar o compromisso no momento.");
    }
  };

  if (!activeNotification) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 animate-in slide-in-from-bottom duration-300">
      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 dark:bg-orange-950/50 dark:text-orange-400">
            <Bell className="h-5 w-5 animate-bounce" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wide text-orange-500">
                Lembrete de Compromisso
              </span>
              <button
                onClick={handleDismiss}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <h4 className="mt-1 text-sm font-black text-slate-900 dark:text-white truncate">
              {activeNotification.title}
            </h4>

            <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              📅 {new Date(activeNotification.date.split("T")[0]).toLocaleDateString("pt-BR")} às {activeNotification.time}
            </p>

            {activeNotification.customerName && (
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                👤 {activeNotification.customerName}
              </p>
            )}

            {activeNotification.propertyName && (
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                🏢 {activeNotification.propertyName}
              </p>
            )}

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={handleSnooze}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white py-2 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                <Clock className="h-3.5 w-3.5" />
                Adiar 15m
              </button>

              <button
                onClick={handleComplete}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-orange-500 py-2 text-xs font-black text-white hover:bg-orange-600 shadow-sm shadow-orange-100 dark:shadow-none"
              >
                <Check className="h-3.5 w-3.5" />
                Finalizar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
