"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import AuthGuard from "@/components/auth/auth-guard";

type AppShellProps = {
  children: React.ReactNode;
};

type UserSettings = {
  name: string;
  email: string;
};

type PasswordSettings = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type CompanySettings = {
  companyName: string;
  tradeName: string;
  document: string;
  stateRegistration: string;
  municipalRegistration: string;
  phone: string;
  email: string;
  zipCode: string;
  address: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
};

const menuItems = [
  { label: "Dashboard", href: "/dashboard", icon: "🏠" },
  { label: "Imóveis", href: "/imoveis", icon: "🏢" },
  { label: "Pessoas", href: "/inquilinos", icon: "👥" },
  { label: "Contratos", href: "/contratos", icon: "📄" },
  { label: "Financeiro", href: "/financeiro", icon: "💰" },
  { label: "Contas a Receber", href: "/contas-receber", icon: "📥" },
  { label: "Contas a Pagar", href: "/contas-pagar", icon: "📤" },
  { label: "Agenda", href: "/agenda", icon: "📅" },
];

const defaultUserSettings: UserSettings = {
  name: "Luan",
  email: "luan@Rentix.com",
};

const defaultPasswordSettings: PasswordSettings = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const defaultCompanySettings: CompanySettings = {
  companyName: "",
  tradeName: "",
  document: "",
  stateRegistration: "",
  municipalRegistration: "",
  phone: "",
  email: "",
  zipCode: "",
  address: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "",
};

function getInitialLetters(name: string) {
  const cleanName = name.trim();

  if (!cleanName) {
    return "L";
  }

  const nameParts = cleanName.split(" ").filter(Boolean);

  if (nameParts.length === 1) {
    return nameParts[0].charAt(0).toUpperCase();
  }

  return `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`.toUpperCase();
}

function formatDocument(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 14);

  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function formatZipCode(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isSidebarLocked, setIsSidebarLocked] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<"user" | "company">("company");
  const [userSettings, setUserSettings] = useState<UserSettings>(defaultUserSettings);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(defaultCompanySettings);
  const [passwordSettings, setPasswordSettings] = useState<PasswordSettings>(defaultPasswordSettings);
  const [successMessage, setSuccessMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const userInitials = useMemo(() => getInitialLetters(userSettings.name), [userSettings.name]);

  useEffect(() => {
    const storedUserSettings = localStorage.getItem("rentix_user_settings");
    const storedCompanySettings = localStorage.getItem("rentix_company_settings");

    if (storedUserSettings) {
      setUserSettings({
        ...defaultUserSettings,
        ...JSON.parse(storedUserSettings),
      });
    }

    if (storedCompanySettings) {
      setCompanySettings({
        ...defaultCompanySettings,
        ...JSON.parse(storedCompanySettings),
      });
    }
  }, []);

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

  function handleOpenSettings() {
    setIsSettingsOpen(true);
    setIsUserMenuOpen(false);
    setSuccessMessage("");
    setPasswordError("");
  }

  function handleCloseSettings() {
    setIsSettingsOpen(false);
    setSuccessMessage("");
    setPasswordError("");
    setPasswordSettings(defaultPasswordSettings);
  }

  function validatePasswordChange() {
    const hasAnyPasswordField =
      passwordSettings.currentPassword ||
      passwordSettings.newPassword ||
      passwordSettings.confirmPassword;

    if (!hasAnyPasswordField) {
      return true;
    }

    if (!passwordSettings.currentPassword) {
      setPasswordError("Informe a senha atual.");
      return false;
    }

    if (passwordSettings.newPassword.length < 6) {
      setPasswordError("A nova senha precisa ter no mínimo 6 caracteres.");
      return false;
    }

    if (passwordSettings.newPassword !== passwordSettings.confirmPassword) {
      setPasswordError("A confirmação de senha não confere.");
      return false;
    }

    return true;
  }

  function handleSaveSettings() {
    setPasswordError("");

    if (!validatePasswordChange()) {
      setActiveSettingsTab("user");
      return;
    }

    localStorage.setItem("rentix_user_settings", JSON.stringify(userSettings));
    localStorage.setItem("rentix_company_settings", JSON.stringify(companySettings));

    if (passwordSettings.newPassword) {
      localStorage.setItem("rentix_user_password_updated", "true");
      setPasswordSettings(defaultPasswordSettings);
    }

    setSuccessMessage("Configurações salvas com sucesso.");

    window.setTimeout(() => {
      setSuccessMessage("");
    }, 2500);
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
                <h1 className="text-2xl font-black text-slate-950">Rentix</h1>
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

                  <span className={`ml-4 ${isSidebarOpen ? "lg:inline" : "lg:hidden"}`}>
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
                <p className="font-bold text-slate-900">{userSettings.name}</p>
              </div>

              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-lg font-black text-white shadow-md transition hover:scale-105 lg:h-12 lg:w-12"
              >
                {userInitials}
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 top-14 w-64 rounded-3xl border border-orange-100 bg-white p-3 shadow-xl lg:top-16">
                  <div className="mb-2 rounded-2xl bg-orange-50 px-4 py-3">
                    <p className="text-sm font-black text-slate-900">
                      {userSettings.name}
                    </p>
                    <p className="text-xs text-slate-500">{userSettings.email}</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleOpenSettings}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                  >
                    ⚙️ Configurações
                  </button>

                  <button
                    type="button"
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

        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-2xl">
              <div className="border-b border-slate-100 bg-gradient-to-r from-orange-50 via-white to-white px-6 py-5 lg:px-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-orange-700">
                      ⚙️ Central de configuração
                    </div>
                    <h2 className="text-2xl font-black text-slate-950">
                      Configurações do Rentix
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Gerencie os dados do usuário, empresa, contato, endereço e segurança do sistema.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCloseSettings}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl font-black text-slate-500 shadow-sm transition hover:bg-red-50 hover:text-red-600"
                    aria-label="Fechar configurações"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[260px_1fr]">
                <aside className="border-b border-slate-100 bg-slate-50 p-4 lg:border-b-0 lg:border-r">
                  <div className="rounded-3xl bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-xl font-black text-white">
                        {userInitials}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          {userSettings.name}
                        </p>
                        <p className="text-xs font-medium text-slate-500">
                          Administrador
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-2xl bg-orange-50 px-3 py-3">
                      <p className="text-xs font-bold text-orange-700">Empresa</p>
                      <p className="mt-1 truncate text-sm font-black text-slate-900">
                        {companySettings.tradeName || companySettings.companyName || "Não cadastrada"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <button
                      type="button"
                      onClick={() => setActiveSettingsTab("company")}
                      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                        activeSettingsTab === "company"
                          ? "bg-orange-500 text-white shadow-md shadow-orange-100"
                          : "bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                      }`}
                    >
                      🏢 Cadastro da empresa
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveSettingsTab("user")}
                      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                        activeSettingsTab === "user"
                          ? "bg-orange-500 text-white shadow-md shadow-orange-100"
                          : "bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                      }`}
                    >
                      👤 Dados do usuário
                    </button>
                  </div>
                </aside>

                <section className="min-h-0 overflow-y-auto p-5 lg:p-8">
                  {successMessage && (
                    <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                      {successMessage}
                    </div>
                  )}

                  {activeSettingsTab === "company" && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-black text-slate-950">
                          Cadastro da empresa
                        </h3>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                          Essas informações serão usadas em contratos, recibos, cobranças e documentos do Rentix.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                            Razão social
                          </span>
                          <input
                            type="text"
                            value={companySettings.companyName}
                            onChange={(event) =>
                              setCompanySettings({
                                ...companySettings,
                                companyName: event.target.value,
                              })
                            }
                            placeholder="Ex: Rentix Gestão de Locações LTDA"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                            Nome fantasia
                          </span>
                          <input
                            type="text"
                            value={companySettings.tradeName}
                            onChange={(event) =>
                              setCompanySettings({
                                ...companySettings,
                                tradeName: event.target.value,
                              })
                            }
                            placeholder="Ex: Rentix"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                            CPF/CNPJ
                          </span>
                          <input
                            type="text"
                            value={companySettings.document}
                            onChange={(event) =>
                              setCompanySettings({
                                ...companySettings,
                                document: formatDocument(event.target.value),
                              })
                            }
                            placeholder="00.000.000/0000-00"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                            Inscrição estadual
                          </span>
                          <input
                            type="text"
                            value={companySettings.stateRegistration}
                            onChange={(event) =>
                              setCompanySettings({
                                ...companySettings,
                                stateRegistration: event.target.value,
                              })
                            }
                            placeholder="Isento ou número da inscrição"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                            Inscrição municipal
                          </span>
                          <input
                            type="text"
                            value={companySettings.municipalRegistration}
                            onChange={(event) =>
                              setCompanySettings({
                                ...companySettings,
                                municipalRegistration: event.target.value,
                              })
                            }
                            placeholder="Número da inscrição municipal"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                            Telefone
                          </span>
                          <input
                            type="text"
                            value={companySettings.phone}
                            onChange={(event) =>
                              setCompanySettings({
                                ...companySettings,
                                phone: formatPhone(event.target.value),
                              })
                            }
                            placeholder="(00) 00000-0000"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                          />
                        </label>

                        <label className="space-y-2 md:col-span-2">
                          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                            E-mail comercial
                          </span>
                          <input
                            type="email"
                            value={companySettings.email}
                            onChange={(event) =>
                              setCompanySettings({
                                ...companySettings,
                                email: event.target.value,
                              })
                            }
                            placeholder="empresa@rentix.com"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                          />
                        </label>
                      </div>

                      <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                        <h4 className="text-sm font-black uppercase tracking-wide text-slate-600">
                          Endereço da empresa
                        </h4>

                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                          <label className="space-y-2">
                            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                              CEP
                            </span>
                            <input
                              type="text"
                              value={companySettings.zipCode}
                              onChange={(event) =>
                                setCompanySettings({
                                  ...companySettings,
                                  zipCode: formatZipCode(event.target.value),
                                })
                              }
                              placeholder="00000-000"
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                            />
                          </label>

                          <label className="space-y-2 md:col-span-2">
                            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                              Endereço
                            </span>
                            <input
                              type="text"
                              value={companySettings.address}
                              onChange={(event) =>
                                setCompanySettings({
                                  ...companySettings,
                                  address: event.target.value,
                                })
                              }
                              placeholder="Rua, avenida, travessa..."
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                            />
                          </label>

                          <label className="space-y-2">
                            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                              Número
                            </span>
                            <input
                              type="text"
                              value={companySettings.number}
                              onChange={(event) =>
                                setCompanySettings({
                                  ...companySettings,
                                  number: event.target.value,
                                })
                              }
                              placeholder="Nº"
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                            />
                          </label>

                          <label className="space-y-2">
                            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                              Bairro
                            </span>
                            <input
                              type="text"
                              value={companySettings.neighborhood}
                              onChange={(event) =>
                                setCompanySettings({
                                  ...companySettings,
                                  neighborhood: event.target.value,
                                })
                              }
                              placeholder="Centro"
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                            />
                          </label>

                          <label className="space-y-2 md:col-span-2">
                            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                              Cidade
                            </span>
                            <input
                              type="text"
                              value={companySettings.city}
                              onChange={(event) =>
                                setCompanySettings({
                                  ...companySettings,
                                  city: event.target.value,
                                })
                              }
                              placeholder="Rolim de Moura"
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                            />
                          </label>

                          <label className="space-y-2">
                            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                              UF
                            </span>
                            <input
                              type="text"
                              value={companySettings.state}
                              onChange={(event) =>
                                setCompanySettings({
                                  ...companySettings,
                                  state: event.target.value.toUpperCase().slice(0, 2),
                                })
                              }
                              placeholder="RO"
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSettingsTab === "user" && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-black text-slate-950">
                          Dados do usuário
                        </h3>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                          Atualize os dados exibidos no cabeçalho do sistema e altere a senha de acesso.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                            Nome
                          </span>
                          <input
                            type="text"
                            value={userSettings.name}
                            onChange={(event) =>
                              setUserSettings({
                                ...userSettings,
                                name: event.target.value,
                              })
                            }
                            placeholder="Nome do usuário"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                          />
                        </label>

                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                            E-mail
                          </span>
                          <input
                            type="email"
                            value={userSettings.email}
                            onChange={(event) =>
                              setUserSettings({
                                ...userSettings,
                                email: event.target.value,
                              })
                            }
                            placeholder="usuario@rentix.com"
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                          />
                        </label>
                      </div>

                      <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h4 className="text-sm font-black uppercase tracking-wide text-slate-600">
                              Alterar senha
                            </h4>
                            <p className="mt-1 text-sm font-medium text-slate-500">
                              Preencha os campos abaixo somente quando desejar trocar a senha.
                            </p>
                          </div>

                          <div className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-700">
                            Segurança
                          </div>
                        </div>

                        {passwordError && (
                          <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                            {passwordError}
                          </div>
                        )}

                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                          <label className="space-y-2">
                            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                              Senha atual
                            </span>
                            <input
                              type="password"
                              value={passwordSettings.currentPassword}
                              onChange={(event) =>
                                setPasswordSettings({
                                  ...passwordSettings,
                                  currentPassword: event.target.value,
                                })
                              }
                              placeholder="Digite a senha atual"
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                            />
                          </label>

                          <label className="space-y-2">
                            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                              Nova senha
                            </span>
                            <input
                              type="password"
                              value={passwordSettings.newPassword}
                              onChange={(event) =>
                                setPasswordSettings({
                                  ...passwordSettings,
                                  newPassword: event.target.value,
                                })
                              }
                              placeholder="Mínimo 6 caracteres"
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                            />
                          </label>

                          <label className="space-y-2">
                            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                              Confirmar senha
                            </span>
                            <input
                              type="password"
                              value={passwordSettings.confirmPassword}
                              onChange={(event) =>
                                setPasswordSettings({
                                  ...passwordSettings,
                                  confirmPassword: event.target.value,
                                })
                              }
                              placeholder="Repita a nova senha"
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-8">
                <p className="text-xs font-semibold text-slate-400">
                  As configurações serão mantidas no navegador até integração com backend.
                </p>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseSettings}
                    className="rounded-2xl px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-100"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    className="rounded-2xl bg-orange-500 px-6 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
                  >
                    Salvar configurações
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
