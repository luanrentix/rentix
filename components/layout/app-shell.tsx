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
  { label: "Pessoas", href: "/inquilinos", icon: "👥" }, // ✅ ALTERADO AQUI
  { label: "Contratos", href: "/contratos", icon: "📄" },
  { label: "Financeiro", href: "/financeiro", icon: "💰" },
  { label: "Contas a Receber", href: "/contas-receber", icon: "📥" },
  { label: "Contas a Pagar", href: "/contas-pagar", icon: "📤" },
  { label: "Agenda", href: "/agenda", icon: "📅" },
];

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isSidebarLocked, setIsSidebarLocked] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  function isActiveRoute(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function handleLogout() {
    localStorage.removeItem("rentix_logged");
    localStorage.removeItem("rentix_user");
    window.location.href = "/";
  }

  function handleCloseMobileSidebar() {
    setIsMobileSidebarOpen(false);
  }

  const isSidebarOpen = isSidebarExpanded || isSidebarLocked;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 lg:flex">
        {isMobileSidebarOpen && (
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={handleCloseMobileSidebar}
            className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          />
        )}

        <aside
          onMouseEnter={() => {
            if (!isSidebarLocked) setIsSidebarExpanded(true);
          }}
          onMouseLeave={() => {
            if (!isSidebarLocked) setIsSidebarExpanded(false);
          }}
          className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-orange-100 bg-white transition-all duration-300 lg:z-30 ${
            isSidebarOpen ? "lg:w-72" : "lg:w-20"
          } ${
            isMobileSidebarOpen
              ? "w-72 translate-x-0"
              : "w-72 -translate-x-full lg:translate-x-0"
          }`}
        >
          <Link href="/dashboard" onClick={handleCloseMobileSidebar}>
            <div className="cursor-pointer border-b border-orange-100 px-4 py-5 transition hover:bg-orange-50">
              <div className="flex items-center justify-center">
                <img
                  src="/logo-rentix.png"
                  alt="Rentix"
                  className="h-24 w-24 object-contain lg:h-32 lg:w-32"
                />
              </div>

              <div
                className={`mt-4 text-center ${
                  isSidebarOpen ? "lg:block" : "lg:hidden"
                }`}
              >
                <h1 className="text-2xl font-black text-slate-950">
                  Rentix
                </h1>
                <p className="text-xs font-semibold text-orange-600">
                  Gestão de Locações
                </p>
              </div>
            </div>
          </Link>

          <div
            className={`border-b border-orange-100 px-4 py-3 ${
              isSidebarOpen ? "lg:block" : "lg:hidden"
            } hidden lg:block`}
          >
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={isSidebarLocked}
                onChange={(event) => {
                  setIsSidebarLocked(event.target.checked);
                  setIsSidebarExpanded(event.target.checked);
                }}
              />
              Fixar
            </label>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto px-2 py-6">
            {menuItems.map((item) => {
              const isActive = isActiveRoute(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={!isSidebarOpen ? item.label : undefined}
                  onClick={handleCloseMobileSidebar}
                  className={`group flex items-center rounded-2xl px-3 py-4 text-sm font-bold transition ${
                    isActive
                      ? "bg-orange-500 text-white shadow-md shadow-orange-100"
                      : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                      isActive
                        ? "bg-white/20"
                        : "bg-slate-100 group-hover:bg-orange-100"
                    }`}
                  >
                    {item.icon}
                  </span>

                  <span
                    className={`ml-4 ${
                      isSidebarOpen ? "lg:inline" : "lg:hidden"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div
          className={`flex min-h-screen flex-1 flex-col transition-all duration-300 ${
            isSidebarOpen ? "lg:ml-72" : "lg:ml-20"
          }`}
        >
          <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:h-24 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-xl font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600 lg:hidden"
              >
                ☰
              </button>

              <div>
                <p className="text-xs font-semibold text-orange-600 lg:text-sm">
                  Bem-vindo
                </p>
                <h2 className="text-xl font-black text-slate-950 lg:text-2xl">
                  Rentix
                </h2>
              </div>
            </div>

            <div className="relative flex items-center gap-3 lg:gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-sm text-slate-500">Olá,</p>
                <p className="font-bold text-slate-900">Luan</p>
              </div>

              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-lg font-black text-white shadow-md transition hover:scale-105 lg:h-12 lg:w-12"
              >
                L
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 top-14 w-64 rounded-3xl border border-orange-100 bg-white p-3 shadow-xl lg:top-16">
                  <div className="mb-2 rounded-2xl bg-orange-50 px-4 py-3">
                    <p className="text-sm font-black text-slate-900">Luan</p>
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

          <main className="flex-1 overflow-x-hidden px-4 py-5 sm:px-5 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}