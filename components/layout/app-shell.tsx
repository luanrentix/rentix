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
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

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
        {/* SIDEBAR */}
        <aside
          onMouseEnter={() => setIsSidebarExpanded(true)}
          onMouseLeave={() => setIsSidebarExpanded(false)}
          className={`fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-orange-100 bg-white transition-all duration-300 ${
            isSidebarExpanded ? "w-72" : "w-20"
          }`}
        >
          {/* LOGO */}
          <Link href="/dashboard">
            <div className="cursor-pointer border-b border-orange-100 px-4 py-5 transition hover:bg-orange-50">
              <div className="flex items-center justify-center">
                <img
                  src="/logo.png"
                  alt="Rentix"
                  className="h-12 w-12 object-contain"
                />
              </div>

              {isSidebarExpanded && (
                <div className="mt-4 text-center">
                  <h1 className="text-2xl font-black text-slate-950">
                    Rentix
                  </h1>
                  <p className="text-xs font-semibold text-orange-600">
                    Gestão de Locações
                  </p>
                </div>
              )}
            </div>
          </Link>

          {/* MENU */}
          <nav className="flex-1 space-y-2 overflow-y-auto px-2 py-6">
            {menuItems.map((item) => {
              const isActive = isActiveRoute(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={!isSidebarExpanded ? item.label : undefined}
                  className={`group flex items-center rounded-2xl px-3 py-4 text-sm font-bold transition ${
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

                  {isSidebarExpanded && (
                    <span className="ml-4">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* CONTENT */}
        <div
          className={`flex min-h-screen flex-1 flex-col transition-all duration-300 ${
            isSidebarExpanded ? "ml-72" : "ml-20"
          }`}
        >
          <header className="sticky top-0 z-20 flex h-24 items-center justify-between border-b border-slate-200 bg-white/90 px-8 backdrop-blur">
            <div>
              <p className="text-sm font-semibold text-orange-600">
                Bem-vindo
              </p>
              <h2 className="text-2xl font-black text-slate-950">
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
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-lg font-black text-white shadow-md transition hover:scale-105"
              >
                L
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 top-16 w-64 rounded-3xl border border-orange-100 bg-white p-3 shadow-xl">
                  <div className="mb-2 rounded-2xl bg-orange-50 px-4 py-3">
                    <p className="text-sm font-black text-slate-900">
                      Luan
                    </p>
                    <p className="text-xs text-slate-500">
                      luan@Rentix.com
                    </p>
                  </div>

                  <button className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 hover:bg-orange-50 hover:text-orange-600">
                    ⚙️ Configurações
                  </button>

                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 hover:bg-red-50 hover:text-red-600"
                  >
                    ↩️ Sair
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