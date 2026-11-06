"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, MoreVertical, Printer } from "lucide-react";

export function RecordedSaleStatus({ status }: { status: string }) {
  const styles: Record<string, { label: string; color: string }> = {
    CONCLUIDA: {
      label: "Concluída",
      color:
        "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900",
    },
    CANCELADA: {
      label: "Cancelada",
      color:
        "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900",
    },
    ESTORNADA: {
      label: "Estornada",
      color:
        "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
    },
    EM_ANDAMENTO: {
      label: "Em andamento",
      color:
        "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900",
    },
  };
  const appearance = styles[status] || {
    label: status,
    color:
      "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  };
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${appearance.color}`}
    >
      {appearance.label}
    </span>
  );
}

export default function RecordedSaleActions({
  number,
  onDetails,
  onReceipt,
}: {
  number: number;
  onDetails: () => void;
  onReceipt: () => void;
}) {
  const [menu, setMenu] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const outside = (event: MouseEvent) => {
      if (
        !menuRef.current?.contains(event.target as Node) &&
        !triggerRef.current?.contains(event.target as Node)
      )
        close();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", outside);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", outside);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", key);
    };
  }, [menu]);
  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Ações da venda ${number}`}
        aria-haspopup="menu"
        aria-expanded={Boolean(menu)}
        onClick={() => {
          const rect = triggerRef.current!.getBoundingClientRect();
          setMenu(
            menu
              ? null
              : {
                  left: Math.max(
                    8,
                    Math.min(rect.right - 224, window.innerWidth - 232),
                  ),
                  top:
                    rect.bottom + 100 > window.innerHeight
                      ? Math.max(8, rect.top - 100)
                      : rect.bottom + 4,
                },
          );
        }}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <MoreVertical size={16} />
        Ações
      </button>
      {menu &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={`Ações da venda ${number}`}
            style={menu}
            className="fixed z-[150] w-56 rounded-xl border border-slate-200 bg-white p-1 text-xs shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            {[
              { label: "Detalhes / pagamentos", icon: Eye, run: onDetails },
              {
                label: "Visualizar comprovante",
                icon: Printer,
                run: onReceipt,
              },
            ].map(({ label, icon: Icon, run }, index) => (
              <button
                key={label}
                autoFocus={index === 0}
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => {
                  setMenu(null);
                  run();
                }}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
