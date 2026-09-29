"use client";

import React, { useEffect, useState } from "react";
import { LogOut, Shield } from "lucide-react";
import { useRouter } from "next/navigation";

export function AdminImpersonateBanner() {
  const router = useRouter();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [userName, setUserName] = useState("");
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    function checkImpersonation() {
      if (typeof window === "undefined") return;
      const backupToken = localStorage.getItem("contrx_impersonator_token");
      const currentUserStr = localStorage.getItem("contrx_user");

      if (backupToken && currentUserStr) {
        try {
          const user = JSON.parse(currentUserStr);
          setIsImpersonating(true);
          setUserName(user.name || "Usuário");
          setCompanyName(user.companyName || user.tradeName || "Empresa");
        } catch {
          setIsImpersonating(false);
        }
      } else {
        setIsImpersonating(false);
      }
    }

    checkImpersonation();
    window.addEventListener("storage", checkImpersonation);
    return () => window.removeEventListener("storage", checkImpersonation);
  }, []);

  if (!isImpersonating) return null;

  function handleExitImpersonation() {
    const backupToken = localStorage.getItem("contrx_impersonator_token");
    const backupUser = localStorage.getItem("contrx_impersonator_user");

    if (backupToken && backupUser) {
      localStorage.setItem("contrx_token", backupToken);
      localStorage.setItem("contrx_user", backupUser);
      localStorage.removeItem("contrx_impersonator_token");
      localStorage.removeItem("contrx_impersonator_user");
      window.location.href = "/admin";
    }
  }

  return (
    <aside
      aria-label="Aviso de personificação de usuário"
      className="sticky top-0 z-[100] flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 px-4 py-2.5 text-xs font-black text-white shadow-lg"
    >
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 shrink-0 text-white animate-pulse" />
        <span>
          Acesso de Suporte Ativo: Navegando como <strong>{userName}</strong> ({companyName})
        </span>
      </div>

      <button
        type="button"
        onClick={handleExitImpersonation}
        className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-black text-slate-900 shadow-sm transition hover:bg-slate-100 active:scale-95"
      >
        <LogOut className="h-3.5 w-3.5 text-red-600" />
        Encerrar e Voltar ao Admin
      </button>
    </aside>
  );
}
