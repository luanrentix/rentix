"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { reportSystemErrorLog } from "@/services/system-logs.service";

const DEDUPLICATION_WINDOW_MS = 30_000;

export default function SystemErrorReporter() {
  const { user } = useAuth();
  const recent = useRef(new Map<string, number>());

  useEffect(() => {
    if (!user || typeof window === "undefined") return;

    const report = (message: string, stackTrace?: string) => {
      const normalizedMessage = message.trim().slice(0, 2000) || "Erro inesperado no navegador";
      const key = `${window.location.pathname}:${normalizedMessage}`;
      const now = Date.now();
      if ((recent.current.get(key) || 0) + DEDUPLICATION_WINDOW_MS > now) return;
      recent.current.set(key, now);

      void reportSystemErrorLog({
        level: "ERROR",
        module: "CLIENT",
        message: normalizedMessage,
        stackTrace: stackTrace?.slice(0, 4000),
        httpMethod: "CLIENT",
        endpoint: window.location.pathname,
      });
    };

    const onError = (event: ErrorEvent) => {
      report(event.message || "Erro inesperado no navegador", event.error?.stack);
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      report(
        reason instanceof Error ? reason.message : String(reason || "Promessa rejeitada sem tratamento"),
        reason instanceof Error ? reason.stack : undefined,
      );
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, [user]);

  return null;
}
