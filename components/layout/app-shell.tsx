"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import AuthGuard from "@/components/auth/auth-guard";

type AppShellProps = {
  children: React.ReactNode;
};

const menuItems = [
  { label: "Dashboard", href: "/dashboard", icon: "🏠" },
  { label: "Imóveis", href: "/imoveis", icon: "🏢" },
  { label: "Inquilinos", href: "/inquilinos", icon: "👥" },
  { label: "Contratos", href: "/contratos", icon: "📄" },
  { label: "Financeiro", href: "/financeiro", icon: "💰" },
  { label: "Contas a Receber", href: "/contas-receber", icon: "📥" },
  { label: "Contas a Pagar", href: "/contas-pagar", icon: "📤" },
];

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  function isActiveRoute(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function handleLogout() {
    localStorage.removeItem("rentix_logged");
    localStorage.removeItem("rentix_user");
    window.location.href = "/";
  }

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-[#f8fafc] text-slate-900">
        <aside className="fixed left-0 top-0 z-30 flex h-screen w-72 flex-col border-r border-orange-100 bg-white">
          <Link href="/dashboard">
            <div className="cursor-pointer border-b border-orange-100 px-5 py-6 transition hover:bg-orange-50">
              <div className="rounded-3xl bg-gradient-to-br from-orange-50 via-white to-orange-100 p-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-md ring-1 ring-orange-100">
                    <img
                      src="/logo.png"
                      alt="Rentix"
                      className="h-16 w-16 object-contain"
                    />
                  </div>

                  <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-950">
                      Rentix
                    </h1>
                    <p className="mt-1 text-sm font-semibold text-orange-600">
                      Gestão de Locações
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Link>

          <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
            {menuItems.map((item) => {
              const isActive = isActiveRoute(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center gap-4 rounded-2xl px-5 py-4 text-sm font-bold transition ${
                    isActive
                      ? "bg-orange-500 text-white shadow-md shadow-orange-100"
                      : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      isActive
                        ? "bg-white/20"
                        : "bg-slate-100 group-hover:bg-orange-100"
                    }`}
                  >
                    {item.icon}
                  </span>

                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="ml-72 flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-24 items-center justify-between border-b border-slate-200 bg-white/90 px-8 backdrop-blur">
            <div>
              <p className="text-sm font-semibold text-orange-600">
                Bem-vindo
              </p>
              <h2 className="text-2xl font-black tracking-tight text-slate-950">
                Rentix
              </h2>
            </div>

            <div className="relative flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-slate-500">Olá,</p>
                <p className="font-bold text-slate-900">Luan</p>
              </div>

              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-lg font-black text-white shadow-md shadow-orange-100 transition hover:scale-105"
              >
                L
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 top-16 w-64 rounded-3xl border border-orange-100 bg-white p-3 shadow-xl shadow-slate-200">
                  <div className="mb-2 rounded-2xl bg-orange-50 px-4 py-3">
                    <p className="text-sm font-black text-slate-900">
                      Luan
                    </p>
                    <p className="text-xs font-semibold text-slate-500">
                      luan@Rentix.com
                    </p>
                  </div>

                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-orange-50 hover:text-orange-600"
                  >
                    <span>⚙️</span>
                    <span>Configurações</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <span>↩️</span>
                    <span>Sair</span>
                  </button>
                </div>
              )}
            </div>
          </header>

          <main className="flex-1 px-8 py-8">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}