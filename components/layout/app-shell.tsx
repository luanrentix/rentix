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

type PixKeyType = "cpf" | "cnpj" | "email" | "phone" | "random";

type CompanySettings = {
  companyName: string;
  tradeName: string;
  document: string;
  stateRegistration: string;
  municipalRegistration: string;
  phone: string;
  email: string;
  pixKeyType: PixKeyType;
  pixKey: string;
  zipCode: string;
  address: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
};

type ThemeMode = "light" | "black";

type ThemeSettings = {
  mode: ThemeMode;
};

type ResetModuleKey =
  | "properties"
  | "people"
  | "contracts"
  | "accountsReceivable"
  | "accountsPayable"
  | "schedule";

type ResetOptions = Record<ResetModuleKey, boolean>;

type ResetModuleOption = {
  key: ResetModuleKey;
  label: string;
  description: string;
  icon: string;
  storageKeys: string[];
};

const menuItems = [
  { label: "Dashboard", href: "/dashboard", icon: "🏠" },
  { label: "Imóveis", href: "/imoveis", icon: "🏢" },
  { label: "Pessoas", href: "/pessoas", icon: "👥" },
  { label: "Contratos", href: "/contratos", icon: "📄" },
  { label: "Financeiro", href: "/financeiro", icon: "💰" },
  { label: "Contas a Receber", href: "/contas-receber", icon: "📥" },
  { label: "Contas a Pagar", href: "/contas-pagar", icon: "📤" },
  { label: "Agenda", href: "/agenda", icon: "📅" },
];

const pixKeyTypeOptions: { label: string; value: PixKeyType }[] = [
  { label: "CPF", value: "cpf" },
  { label: "CNPJ", value: "cnpj" },
  { label: "E-mail", value: "email" },
  { label: "Telefone", value: "phone" },
  { label: "Chave aleatória", value: "random" },
];

const resetModuleOptions: ResetModuleOption[] = [
  {
    key: "properties",
    label: "Imóveis",
    description: "Remove imóveis cadastrados e seus filtros locais.",
    icon: "🏢",
    storageKeys: ["rentix_properties"],
  },
  {
    key: "people",
    label: "Pessoas",
    description: "Remove pessoas, inquilinos e dados locais relacionados.",
    icon: "👥",
    storageKeys: ["rentix_tenants", "rentix_people"],
  },
  {
    key: "contracts",
    label: "Contratos",
    description: "Remove contratos e pendências de integração com cobranças.",
    icon: "📄",
    storageKeys: ["rentix_contracts", "rentix_new_charge_from_contract"],
  },
  {
    key: "accountsReceivable",
    label: "Contas a Receber",
    description: "Remove cobranças, parcelas, pagamentos recebidos e filtros financeiros.",
    icon: "📥",
    storageKeys: [
      "rentix_manual_charges",
      "rentix_paid_charges",
      "rentix_charge_payments",
      "rentix_receivable_status_filter",
    ],
  },
  {
    key: "accountsPayable",
    label: "Contas a Pagar",
    description: "Remove contas a pagar e pagamentos registrados localmente.",
    icon: "📤",
    storageKeys: [
      "rentix_accounts_payable",
      "rentix_payables",
      "rentix_paid_payables",
      "rentix_payable_payments",
    ],
  },
  {
    key: "schedule",
    label: "Agenda",
    description: "Remove compromissos, eventos e agendamentos locais.",
    icon: "📅",
    storageKeys: ["rentix_schedule", "rentix_agenda", "rentix_calendar_events"],
  },
];

const defaultResetOptions: ResetOptions = {
  properties: false,
  people: false,
  contracts: false,
  accountsReceivable: false,
  accountsPayable: false,
  schedule: false,
};

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
  pixKeyType: "cpf",
  pixKey: "",
  zipCode: "",
  address: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "",
};

const defaultThemeSettings: ThemeSettings = {
  mode: "light",
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

function formatPixKey(value: string, pixKeyType: PixKeyType) {
  if (pixKeyType === "cpf" || pixKeyType === "cnpj") {
    return formatDocument(value);
  }

  if (pixKeyType === "phone") {
    return formatPhone(value);
  }

  return value;
}

function getPixKeyPlaceholder(pixKeyType: PixKeyType) {
  const placeholders: Record<PixKeyType, string> = {
    cpf: "000.000.000-00",
    cnpj: "00.000.000/0000-00",
    email: "pix@empresa.com",
    phone: "(00) 00000-0000",
    random: "Chave aleatória Pix",
  };

  return placeholders[pixKeyType];
}


const rentixThemeStyle = `
  [data-rentix-theme="black"] {
    color-scheme: dark;
    background-color: #020617 !important;
    color: #f8fafc !important;
  }

  [data-rentix-theme="black"] main,
  [data-rentix-theme="black"] header,
  [data-rentix-theme="black"] aside,
  [data-rentix-theme="black"] .min-h-screen,
  [data-rentix-theme="black"] .flex-1 {
    background-color: #020617 !important;
  }

  [data-rentix-theme="black"] [class*="bg-white"],
  [data-rentix-theme="black"] [class*="bg-slate-50"],
  [data-rentix-theme="black"] [class*="bg-slate-100"],
  [data-rentix-theme="black"] [class*="bg-[#f8fafc"],
  [data-rentix-theme="black"] [class*="bg-\[\#f8fafc"],
  [data-rentix-theme="black"] .bg-white,
  [data-rentix-theme="black"] .bg-white\/90,
  [data-rentix-theme="black"] .bg-slate-50,
  [data-rentix-theme="black"] .bg-slate-100 {
    background-color: #0f172a !important;
  }

  [data-rentix-theme="black"] [class*="from-orange-50"],
  [data-rentix-theme="black"] [class*="via-white"],
  [data-rentix-theme="black"] [class*="to-white"] {
    --tw-gradient-from: #0f172a var(--tw-gradient-from-position) !important;
    --tw-gradient-to: #0f172a var(--tw-gradient-to-position) !important;
    --tw-gradient-stops: #0f172a, #0f172a, #0f172a !important;
  }

  [data-rentix-theme="black"] [class*="bg-orange-50"],
  [data-rentix-theme="black"] [class*="bg-orange-100"],
  [data-rentix-theme="black"] [class*="bg-amber-50"] {
    background-color: rgba(249, 115, 22, 0.14) !important;
  }

  [data-rentix-theme="black"] [class*="bg-red-50"],
  [data-rentix-theme="black"] [class*="bg-red-100"] {
    background-color: rgba(239, 68, 68, 0.14) !important;
  }

  [data-rentix-theme="black"] [class*="bg-emerald-50"],
  [data-rentix-theme="black"] [class*="bg-emerald-100"] {
    background-color: rgba(16, 185, 129, 0.14) !important;
  }

  [data-rentix-theme="black"] [class*="bg-blue-50"],
  [data-rentix-theme="black"] [class*="bg-blue-100"],
  [data-rentix-theme="black"] [class*="bg-sky-50"],
  [data-rentix-theme="black"] [class*="bg-sky-100"] {
    background-color: rgba(14, 165, 233, 0.14) !important;
  }

  [data-rentix-theme="black"] [class*="text-slate-950"],
  [data-rentix-theme="black"] [class*="text-slate-900"],
  [data-rentix-theme="black"] [class*="text-slate-800"],
  [data-rentix-theme="black"] [class*="text-slate-700"],
  [data-rentix-theme="black"] .text-slate-950,
  [data-rentix-theme="black"] .text-slate-900,
  [data-rentix-theme="black"] .text-slate-800,
  [data-rentix-theme="black"] .text-slate-700 {
    color: #f8fafc !important;
  }

  [data-rentix-theme="black"] [class*="text-slate-600"],
  [data-rentix-theme="black"] [class*="text-slate-500"],
  [data-rentix-theme="black"] [class*="text-slate-400"],
  [data-rentix-theme="black"] [class*="text-slate-300"],
  [data-rentix-theme="black"] .text-slate-600,
  [data-rentix-theme="black"] .text-slate-500,
  [data-rentix-theme="black"] .text-slate-400,
  [data-rentix-theme="black"] .text-slate-300 {
    color: #cbd5e1 !important;
  }

  [data-rentix-theme="black"] [class*="text-orange-"],
  [data-rentix-theme="black"] .text-orange-500,
  [data-rentix-theme="black"] .text-orange-600,
  [data-rentix-theme="black"] .text-orange-700,
  [data-rentix-theme="black"] .text-orange-800 {
    color: #fb923c !important;
  }

  [data-rentix-theme="black"] [class*="text-red-"] {
    color: #fca5a5 !important;
  }

  [data-rentix-theme="black"] [class*="text-emerald-"] {
    color: #6ee7b7 !important;
  }

  [data-rentix-theme="black"] [class*="text-blue-"],
  [data-rentix-theme="black"] [class*="text-sky-"] {
    color: #7dd3fc !important;
  }

  [data-rentix-theme="black"] [class*="border-slate-"],
  [data-rentix-theme="black"] [class*="border-orange-"],
  [data-rentix-theme="black"] [class*="border-amber-"],
  [data-rentix-theme="black"] [class*="border-red-"],
  [data-rentix-theme="black"] [class*="border-emerald-"],
  [data-rentix-theme="black"] [class*="border-blue-"],
  [data-rentix-theme="black"] [class*="border-sky-"] {
    border-color: #1e293b !important;
  }

  [data-rentix-theme="black"] input,
  [data-rentix-theme="black"] select,
  [data-rentix-theme="black"] textarea {
    background-color: #020617 !important;
    border-color: #334155 !important;
    color: #f8fafc !important;
  }

  [data-rentix-theme="black"] input::placeholder,
  [data-rentix-theme="black"] textarea::placeholder {
    color: #64748b !important;
  }

  [data-rentix-theme="black"] option {
    background-color: #020617 !important;
    color: #f8fafc !important;
  }

  [data-rentix-theme="black"] table {
    background-color: #0f172a !important;
    color: #f8fafc !important;
  }

  [data-rentix-theme="black"] thead,
  [data-rentix-theme="black"] table thead,
  [data-rentix-theme="black"] [class*="bg-orange-50"] table thead {
    background-color: rgba(249, 115, 22, 0.16) !important;
  }

  [data-rentix-theme="black"] tbody tr,
  [data-rentix-theme="black"] tr {
    background-color: #0f172a !important;
    border-color: #1e293b !important;
  }

  [data-rentix-theme="black"] tbody tr:hover,
  [data-rentix-theme="black"] [class*="hover:bg-slate-50"]:hover,
  [data-rentix-theme="black"] [class*="hover:bg-slate-100"]:hover {
    background-color: #111c31 !important;
  }

  [data-rentix-theme="black"] .divide-slate-100 > :not([hidden]) ~ :not([hidden]),
  [data-rentix-theme="black"] .divide-slate-200 > :not([hidden]) ~ :not([hidden]) {
    border-color: #1e293b !important;
  }

  [data-rentix-theme="black"] [class*="shadow-sm"],
  [data-rentix-theme="black"] [class*="shadow-md"],
  [data-rentix-theme="black"] [class*="shadow-lg"],
  [data-rentix-theme="black"] [class*="shadow-xl"],
  [data-rentix-theme="black"] [class*="shadow-2xl"] {
    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.42) !important;
  }

  [data-rentix-theme="black"] .recharts-cartesian-grid line {
    stroke: #334155 !important;
  }

  [data-rentix-theme="black"] .recharts-text {
    fill: #cbd5e1 !important;
  }

  [data-rentix-theme="black"] .recharts-tooltip-wrapper .recharts-default-tooltip {
    background-color: #0f172a !important;
    border-color: #334155 !important;
    color: #f8fafc !important;
  }

  [data-rentix-theme="black"] .recharts-tooltip-label,
  [data-rentix-theme="black"] .recharts-tooltip-item {
    color: #f8fafc !important;
  }
`;

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
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(defaultThemeSettings);
  const [passwordSettings, setPasswordSettings] = useState<PasswordSettings>(defaultPasswordSettings);
  const [successMessage, setSuccessMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetOptions, setResetOptions] = useState<ResetOptions>(defaultResetOptions);
  const [resetConfirmationText, setResetConfirmationText] = useState("");
  const [resetError, setResetError] = useState("");

  const userInitials = useMemo(() => getInitialLetters(userSettings.name), [userSettings.name]);

  useEffect(() => {
    const storedUserSettings = localStorage.getItem("rentix_user_settings");
    const storedCompanySettings = localStorage.getItem("rentix_company_settings");
    const storedThemeSettings = localStorage.getItem("rentix_theme_settings");

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

    if (storedThemeSettings) {
      setThemeSettings({
        ...defaultThemeSettings,
        ...JSON.parse(storedThemeSettings),
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
    handleCloseResetModal();
  }

  function handleOpenResetModal() {
    setResetOptions(defaultResetOptions);
    setResetConfirmationText("");
    setResetError("");
    setIsResetModalOpen(true);
  }

  function handleCloseResetModal() {
    setIsResetModalOpen(false);
    setResetOptions(defaultResetOptions);
    setResetConfirmationText("");
    setResetError("");
  }

  function handleToggleResetOption(key: ResetModuleKey) {
    setResetError("");
    setResetOptions((currentOptions) => ({
      ...currentOptions,
      [key]: !currentOptions[key],
    }));
  }

  function handleConfirmResetData() {
    const selectedModules = resetModuleOptions.filter(
      (option) => resetOptions[option.key]
    );

    if (selectedModules.length === 0) {
      setResetError("Selecione pelo menos um módulo para limpar.");
      return;
    }

    if (resetConfirmationText.trim().toUpperCase() !== "CONFIRMAR") {
      setResetError('Digite "CONFIRMAR" para liberar a limpeza dos dados selecionados.');
      return;
    }

    selectedModules.forEach((moduleOption) => {
      moduleOption.storageKeys.forEach((storageKey) => {
        localStorage.removeItem(storageKey);
      });
    });

    handleCloseResetModal();
    window.location.reload();
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
      <div
        data-rentix-theme={themeSettings.mode}
        className="min-h-screen bg-[#f8fafc] text-slate-900 lg:flex"
      >
        <style>{rentixThemeStyle}</style>
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
                  {companySettings.tradeName || companySettings.companyName || "Rentix"}
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
                <div
                  className={`absolute right-0 top-14 z-50 w-72 rounded-3xl border p-3 shadow-2xl transition lg:top-16 ${
                    themeSettings.mode === "black"
                      ? "border-slate-700 bg-slate-900 shadow-black/40"
                      : "border-orange-100 bg-white shadow-xl"
                  }`}
                >
                  <div
                    className={`mb-2 rounded-2xl px-4 py-3 ${
                      themeSettings.mode === "black"
                        ? "border border-slate-700 bg-slate-800"
                        : "bg-orange-50"
                    }`}
                  >
                    <p
                      className={`text-sm font-black ${
                        themeSettings.mode === "black" ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {userSettings.name}
                    </p>
                    <p
                      className={`text-xs ${
                        themeSettings.mode === "black" ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      {userSettings.email}
                    </p>
                  </div>

                  <Link
                    href="/configuracoes"
                    onClick={() => setIsUserMenuOpen(false)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                      themeSettings.mode === "black"
                        ? "text-slate-200 hover:bg-slate-800 hover:text-orange-400"
                        : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                    }`}
                  >
                    ⚙️ Configurações
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                      themeSettings.mode === "black"
                        ? "text-red-300 hover:bg-red-950/40 hover:text-red-200"
                        : "text-slate-600 hover:bg-red-50 hover:text-red-600"
                    }`}
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

                  <button
                    type="button"
                    onClick={handleOpenResetModal}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-sm font-black text-white shadow-md shadow-red-100 transition hover:bg-red-600"
                  >
                    🗑️ Resetar dados de teste
                  </button>
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

                      <div className="rounded-3xl border border-orange-100 bg-orange-50/60 p-5">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h4 className="text-sm font-black uppercase tracking-wide text-slate-600">
                              Dados Pix da empresa
                            </h4>
                            <p className="mt-1 text-sm font-medium text-slate-500">
                              Informe a chave Pix que será usada em cobranças, recibos e documentos financeiros.
                            </p>
                          </div>

                          <div className="rounded-full bg-white px-3 py-1 text-xs font-black text-orange-700 shadow-sm">
                            Pix
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                          <label className="space-y-2">
                            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                              Tipo da chave Pix
                            </span>
                            <select
                              value={companySettings.pixKeyType}
                              onChange={(event) => {
                                const pixKeyType = event.target.value as PixKeyType;

                                setCompanySettings({
                                  ...companySettings,
                                  pixKeyType,
                                  pixKey: formatPixKey(companySettings.pixKey, pixKeyType),
                                });
                              }}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                            >
                              {pixKeyTypeOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="space-y-2 md:col-span-2">
                            <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                              Chave Pix
                            </span>
                            <input
                              type={companySettings.pixKeyType === "email" ? "email" : "text"}
                              value={companySettings.pixKey}
                              onChange={(event) =>
                                setCompanySettings({
                                  ...companySettings,
                                  pixKey: formatPixKey(event.target.value, companySettings.pixKeyType),
                                })
                              }
                              placeholder={getPixKeyPlaceholder(companySettings.pixKeyType)}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                            />
                          </label>
                        </div>
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

        {isResetModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-red-100 bg-white shadow-2xl">
              <div className="border-b border-red-100 bg-gradient-to-r from-red-50 via-white to-white px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-red-100 text-2xl">
                      🗑️
                    </div>
                    <div>
                      <div className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-red-700">
                        Ação crítica
                      </div>
                      <h2 className="mt-3 text-2xl font-black text-slate-950">
                        Resetar dados de teste
                      </h2>
                      <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                        Selecione os módulos que deseja limpar. Essa ação remove os dados locais do navegador e não pode ser desfeita.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCloseResetModal}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl font-black text-slate-500 shadow-sm transition hover:bg-red-50 hover:text-red-600"
                    aria-label="Fechar reset de dados"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {resetModuleOptions.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => handleToggleResetOption(option.key)}
                      className={`rounded-3xl border p-4 text-left transition ${
                        resetOptions[option.key]
                          ? "border-red-300 bg-red-50 shadow-sm shadow-red-100"
                          : "border-slate-200 bg-white hover:border-red-200 hover:bg-red-50/40"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl ${
                            resetOptions[option.key] ? "bg-red-500 text-white" : "bg-slate-100"
                          }`}
                        >
                          {option.icon}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-black text-slate-900">
                              {option.label}
                            </p>
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded-md border text-xs font-black ${
                                resetOptions[option.key]
                                  ? "border-red-500 bg-red-500 text-white"
                                  : "border-slate-300 bg-white text-transparent"
                              }`}
                            >
                              ✓
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                            {option.description}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="mt-5 rounded-3xl border border-amber-100 bg-amber-50 px-4 py-4">
                  <p className="text-sm font-black text-amber-800">
                    Confirmação obrigatória
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-amber-700">
                    Para evitar exclusão acidental, digite <strong>CONFIRMAR</strong> no campo abaixo.
                  </p>

                  <input
                    type="text"
                    value={resetConfirmationText}
                    onChange={(event) => {
                      setResetConfirmationText(event.target.value);
                      setResetError("");
                    }}
                    placeholder="Digite CONFIRMAR"
                    className="mt-3 w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm font-black uppercase outline-none transition placeholder:normal-case placeholder:font-semibold focus:border-red-400 focus:ring-4 focus:ring-red-100"
                  />
                </div>

                {resetError && (
                  <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    {resetError}
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white px-6 py-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleCloseResetModal}
                  className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmResetData}
                  className="rounded-2xl bg-red-500 px-6 py-3 text-sm font-black text-white shadow-md shadow-red-100 transition hover:bg-red-600"
                >
                  Confirmar limpeza
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AuthGuard>
  );
}
