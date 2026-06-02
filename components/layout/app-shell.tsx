"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, CalendarDays, Clock3, Loader2, Maximize2, X } from "lucide-react";
import AuthGuard from "@/components/auth/auth-guard";
import { useAuth } from "@/context/AuthContext";
import { changePasswordRequest } from "@/services/auth";
import {
  getCompanyStorageItem,
  setCompanyStorageItem,
  removeCompanyStorageItem,
} from "@/services/company-storage";
import { getAppSettings, saveAppSettings } from "@/services/settings.service";
import {
  getCachedCompanySettings,
  getCachedThemeSettings,
  getCachedUserSettings,
  setCachedAppSettings,
} from "@/services/settings-cache";
import {
  clearMinimizedModalState,
  dispatchCloseMinimizedModal,
  dispatchRestoreMinimizedModal,
  getMinimizedModalState,
  MINIMIZED_MODAL_CHANGE_EVENT,
  type MinimizedModalState,
} from "@/services/minimized-modal.service";
import { canAccessTool } from "@/services/tool-permissions";
import {
  internalToolRoutes,
  systemOwnerToolRoutes,
  toolKeyByHref,
} from "@/services/app-routes";

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
  logo: string;
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

type ThemeMode = "light" | "black" | "graphite";

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

const menuLinkPrefetch = process.env.NODE_ENV === "production" ? null : false;
let loadedSettingsCompanyId: string | null = null;

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
    label: "Bens/Ativos",
    description: "Remove bens/ativos cadastrados e seus filtros locais.",
    icon: "🏢",
    storageKeys: [],
  },
  {
    key: "people",
    label: "Pessoas",
    description: "Remove pessoas, inquilinos e dados locais relacionados.",
    icon: "👥",
    storageKeys: [],
  },
  {
    key: "contracts",
    label: "Contratos",
    description: "Remove contratos e pendências de integração com cobranças.",
    icon: "📄",
    storageKeys: [],
  },
  {
    key: "accountsReceivable",
    label: "Contas a Receber",
    description: "Remove cobranças, parcelas, pagamentos recebidos e filtros financeiros.",
    icon: "📥",
    storageKeys: [
      "contrx_receivable_status_filter",
    ],
  },
  {
    key: "accountsPayable",
    label: "Contas a Pagar",
    description: "Remove contas a pagar e pagamentos registrados localmente.",
    icon: "📤",
    storageKeys: [
      "contrx_payable_status_filter",
    ],
  },
  {
    key: "schedule",
    label: "Agenda",
    description: "Remove compromissos, eventos e agendamentos locais.",
    icon: "📅",
    storageKeys: [],
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
  email: "luan@contrx.com.br",
};

const defaultPasswordSettings: PasswordSettings = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const defaultCompanySettings: CompanySettings = {
  companyName: "",
  tradeName: "",
  logo: "",
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

function formatTrialDate(value?: string | null) {
  if (!value) return "";

  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getTrialDaysRemaining(user: { trialAccessEndsAt?: string | null; trialDaysRemaining?: number | null }) {
  if (!user.trialAccessEndsAt) return user.trialDaysRemaining ?? null;

  const remainingMilliseconds =
    new Date(user.trialAccessEndsAt).getTime() - new Date().getTime();

  return Math.ceil(remainingMilliseconds / 86_400_000);
}

function getTrialBannerTone(daysRemaining: number | null) {
  if (daysRemaining === null) return "neutral";
  if (daysRemaining <= 3) return "danger";
  if (daysRemaining <= 7) return "warning";
  return "normal";
}

function isSystemOwnerRole(role?: string | null) {
  return role === "SYSTEM_OWNER" || role === "DONO_SISTEMA";
}


function normalizeThemeMode(value: unknown): ThemeMode {
  const normalizedValue = String(value || "").toLowerCase();

  if (normalizedValue === "graphite" || normalizedValue === "grafite") {
    return "graphite";
  }

  return normalizedValue === "black" || normalizedValue === "dark"
    ? "black"
    : "light";
}

function normalizeThemeSettings(settings?: Partial<ThemeSettings> | null): ThemeSettings {
  return {
    ...defaultThemeSettings,
    ...(settings || {}),
    mode: normalizeThemeMode(settings?.mode),
  };
}

function readThemeSettingsFromStorage(companyId?: string): ThemeSettings {
  if (typeof window === "undefined") return defaultThemeSettings;

  const storageKeys = [
    "contrx_theme_settings",
    "contrx_theme",
    "contrx_current_theme",
    "theme",
  ];

  for (const storageKey of storageKeys) {
    const storedValue = getCompanyStorageItem(
      companyId,
      storageKey,
      storageKey,
    );

    if (!storedValue) continue;

    try {
      const parsedValue = JSON.parse(storedValue) as Partial<ThemeSettings> | string;

      if (typeof parsedValue === "string") {
        return { mode: normalizeThemeMode(parsedValue) };
      }

      return normalizeThemeSettings(parsedValue);
    } catch {
      return { mode: normalizeThemeMode(storedValue) };
    }
  }

  return defaultThemeSettings;
}

function GlobalMinimizedModalDock() {
  const pathname = usePathname();
  const router = useRouter();
  const [modalState, setModalState] = useState<MinimizedModalState | null>(null);

  useEffect(() => {
    function syncMinimizedModalState() {
      setModalState(getMinimizedModalState());
    }

    syncMinimizedModalState();

    window.addEventListener("storage", syncMinimizedModalState);
    window.addEventListener(MINIMIZED_MODAL_CHANGE_EVENT, syncMinimizedModalState);

    return () => {
      window.removeEventListener("storage", syncMinimizedModalState);
      window.removeEventListener(MINIMIZED_MODAL_CHANGE_EVENT, syncMinimizedModalState);
    };
  }, []);

  if (!modalState || pathname === modalState.href) {
    return null;
  }

  function handleRestore() {
    if (!modalState) return;

    if (pathname === modalState.href) {
      dispatchRestoreMinimizedModal(modalState.tool);
      return;
    }

    router.push(modalState.href);
  }

  function handleClose() {
    if (!modalState) return;

    dispatchCloseMinimizedModal(modalState.tool);
    clearMinimizedModalState(modalState.tool);
  }

  return (
    <div className="contrx-minimized-modal fixed bottom-6 right-6 z-50 w-[min(28rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border-2 border-orange-300 bg-white shadow-2xl">
      <div className="h-2 bg-orange-500" />
      <div className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-orange-100 px-3 py-1 text-[0.68rem] font-black uppercase tracking-wide text-orange-700">
                Minimizado
              </span>
              <span className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_0_4px_rgb(249_115_22/0.16)]" />
            </div>
            <p className="truncate text-base font-black text-slate-950">
              {modalState.title}
            </p>
            <p className="truncate text-sm font-semibold text-slate-500">
              {modalState.subtitle || "Cadastro em andamento"}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleRestore}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600"
              title="Restaurar modal"
              aria-label="Restaurar modal"
            >
              <Maximize2 className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
              title="Fechar modal"
              aria-label="Fechar modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommercialAccessBlockedPanel({
  status,
  trialEndsAtLabel,
}: {
  status?: string;
  trialEndsAtLabel: string;
}) {
  const title =
    status === "SUSPENDED"
      ? "Acesso suspenso"
      : status === "CANCELED"
        ? "Acesso cancelado"
        : "Período de acesso encerrado";

  const description =
    status === "SUSPENDED"
      ? "Esta empresa está suspensa no controle comercial do Contrx."
      : status === "CANCELED"
        ? "Esta empresa está cancelada no controle comercial do Contrx."
        : `O teste profissional desta empresa foi encerrado${
            trialEndsAtLabel ? ` em ${trialEndsAtLabel}` : ""
          }.`;

  return (
    <section className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center">
      <div className="w-full rounded-[24px] border border-orange-100 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-orange-700 ring-1 ring-orange-100">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-2xl font-black text-slate-950">{title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm font-semibold leading-6 text-slate-500">
          {description} Entre em contato para ativar, prorrogar ou regularizar o
          acesso.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <a
            href="https://wa.me/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#ff4b00] px-5 text-sm font-black text-white transition hover:bg-[#e94400]"
          >
            Falar no WhatsApp
          </a>
          <Link
            href="/configuracoes"
            prefetch={menuLinkPrefetch}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-100 px-5 text-sm font-black text-slate-800 transition hover:bg-slate-200"
          >
            Ver configurações
          </Link>
        </div>
      </div>
    </section>
  );
}
export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const companyId = user?.companyId;
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isSidebarLocked, setIsSidebarLocked] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return false;
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<"user" | "company">("company");
  const [userSettings, setUserSettings] = useState<UserSettings>(defaultUserSettings);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(defaultCompanySettings);
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(defaultThemeSettings);
  const [passwordSettings, setPasswordSettings] = useState<PasswordSettings>(defaultPasswordSettings);
  const [successMessage, setSuccessMessage] = useState("");
  const [settingsErrorMessage, setSettingsErrorMessage] = useState("");
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetOptions, setResetOptions] = useState<ResetOptions>(defaultResetOptions);
  const [resetConfirmationText, setResetConfirmationText] = useState("");
  const [resetError, setResetError] = useState("");
  const [isTrialLoginNoticeOpen, setIsTrialLoginNoticeOpen] = useState(false);

  const lockedUserEmail = user?.email || userSettings.email;
  const companyDisplayName =
    companySettings.tradeName || companySettings.companyName || "Empresa não cadastrada";
  const companyLogoFallbackText = getInitialLetters(
    companySettings.tradeName || companySettings.companyName || userSettings.name,
  );
  const visibleMenuItems = useMemo(
    () => {
      const allowedMenuItems = internalToolRoutes.filter((item) =>
        canAccessTool(user?.role, user?.permissions, toolKeyByHref[item.href]),
      );

      return isSystemOwnerRole(user?.role)
        ? [...allowedMenuItems, ...systemOwnerToolRoutes]
        : allowedMenuItems;
    },
    [user?.permissions, user?.role],
  );
  const isSystemOwner = isSystemOwnerRole(user?.role);

  useEffect(() => {
    if (typeof window === "undefined" || isSystemOwner) {
      return;
    }

    if (user?.subscriptionStatus !== "TRIAL") {
      return;
    }

    const shouldShowTrialNotice = localStorage.getItem(
      "contrx_show_trial_login_notice",
    );

    if (shouldShowTrialNotice !== "true") {
      return;
    }

    localStorage.removeItem("contrx_show_trial_login_notice");
    setIsTrialLoginNoticeOpen(true);
  }, [isSystemOwner, user?.subscriptionStatus]);

  useEffect(() => {
    const currentToolKey = toolKeyByHref[pathname];

    if (!currentToolKey) {
      return;
    }

    if (canAccessTool(user?.role, user?.permissions, currentToolKey)) {
      return;
    }

    router.replace(visibleMenuItems[0]?.href || "/configuracoes");
  }, [pathname, router, user?.permissions, user?.role, visibleMenuItems]);

  const loadSettingsFromLocalStorage = useCallback(() => {
    const storedUserSettings = getCompanyStorageItem(
      companyId,
      "contrx_user_settings",
      "contrx_user_settings",
    );

    if (storedUserSettings) {
      setUserSettings({
        ...defaultUserSettings,
        ...JSON.parse(storedUserSettings),
        email: user?.email || defaultUserSettings.email,
      });
    }

    setThemeSettings(readThemeSettingsFromStorage(companyId));
  }, [companyId, user?.email]);

  const loadSettings = useCallback(async (currentCompanyId: string) => {
    const cachedUserSettings = getCachedUserSettings();
    const cachedCompanySettings = getCachedCompanySettings();
    const cachedThemeSettings = getCachedThemeSettings();

    if (
      loadedSettingsCompanyId === currentCompanyId &&
      (cachedUserSettings || cachedCompanySettings || cachedThemeSettings)
    ) {
      if (cachedUserSettings) {
        setUserSettings({
          ...defaultUserSettings,
          ...cachedUserSettings,
          email: user?.email || defaultUserSettings.email,
        } as UserSettings);
      }

      if (cachedCompanySettings) {
        const normalizedCachedCompanySettings = cachedCompanySettings as Record<string, unknown>;
        setCompanySettings({
          ...defaultCompanySettings,
          ...normalizedCachedCompanySettings,
          logo: String(
            normalizedCachedCompanySettings.logo ||
              normalizedCachedCompanySettings.logoUrl ||
              normalizedCachedCompanySettings.logoBase64 ||
              normalizedCachedCompanySettings.companyLogo ||
              "",
          ),
        } as CompanySettings);
      }

      if (cachedThemeSettings) {
        setThemeSettings(
          normalizeThemeSettings(cachedThemeSettings as Partial<ThemeSettings>),
        );
      }

      return;
    }

    try {
      const settings = await getAppSettings(currentCompanyId);
      setCachedAppSettings(settings);
      loadedSettingsCompanyId = currentCompanyId;

      setUserSettings({
        ...defaultUserSettings,
        ...(settings.userSettings || {}),
        email: user?.email || defaultUserSettings.email,
      } as UserSettings);
      const storedCompanySettings = (settings.companySettings || {}) as Record<string, unknown>;
      setCompanySettings({
        ...defaultCompanySettings,
        ...storedCompanySettings,
        logo: String(
          storedCompanySettings.logo ||
            storedCompanySettings.logoUrl ||
            storedCompanySettings.logoBase64 ||
            storedCompanySettings.companyLogo ||
            "",
        ),
      } as CompanySettings);
      setThemeSettings(
        normalizeThemeSettings(settings.themeSettings as Partial<ThemeSettings> | undefined),
      );
    } catch {
      console.warn("Settings API unavailable. Local cached settings were loaded.");

      if (cachedUserSettings || cachedCompanySettings || cachedThemeSettings) {
        if (cachedUserSettings) {
          setUserSettings({
            ...defaultUserSettings,
            ...cachedUserSettings,
            email: user?.email || defaultUserSettings.email,
          } as UserSettings);
        }

        if (cachedCompanySettings) {
          const normalizedCachedCompanySettings = cachedCompanySettings as Record<string, unknown>;
          setCompanySettings({
            ...defaultCompanySettings,
            ...normalizedCachedCompanySettings,
            logo: String(
              normalizedCachedCompanySettings.logo ||
                normalizedCachedCompanySettings.logoUrl ||
                normalizedCachedCompanySettings.logoBase64 ||
                normalizedCachedCompanySettings.companyLogo ||
                "",
            ),
          } as CompanySettings);
        }

        if (cachedThemeSettings) {
          setThemeSettings(
            normalizeThemeSettings(cachedThemeSettings as Partial<ThemeSettings>),
          );
        }

        return;
      }

      loadSettingsFromLocalStorage();
    }
  }, [loadSettingsFromLocalStorage, user?.email]);

  useEffect(() => {
    if (!companyId) {
      loadSettingsFromLocalStorage();
      return;
    }

    loadSettings(companyId);
  }, [companyId, loadSettings, loadSettingsFromLocalStorage]);

  useEffect(() => {
    const scopedSidebarLock = getCompanyStorageItem(
      companyId,
      "contrx_sidebar_locked",
      "contrx_sidebar_locked",
    );

    setIsSidebarLocked(scopedSidebarLock === "true");
  }, [companyId]);

  useEffect(() => {
    setIsSidebarExpanded(isSidebarLocked);
  }, [isSidebarLocked]);

  useEffect(() => {
    const isDarkMode = themeSettings.mode !== "light";

    document.documentElement.classList.toggle("dark", isDarkMode);
    document.body.classList.toggle("dark", isDarkMode);
    document.documentElement.dataset.contrxTheme = themeSettings.mode;
    document.body.dataset.contrxTheme = themeSettings.mode;
  }, [themeSettings.mode]);

  useEffect(() => {
    function syncThemeFromStorage() {
      const storedTheme = readThemeSettingsFromStorage(companyId);

      setThemeSettings((currentTheme) =>
        currentTheme.mode === storedTheme.mode ? currentTheme : storedTheme
      );
    }

    window.addEventListener("storage", syncThemeFromStorage);
    window.addEventListener("contrx-theme-change", syncThemeFromStorage);

    return () => {
      window.removeEventListener("storage", syncThemeFromStorage);
      window.removeEventListener("contrx-theme-change", syncThemeFromStorage);
    };
  }, [companyId]);

  function isActiveRoute(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function handleLogout() {
    setIsUserMenuOpen(false);
    logout();
  }

  function handleCloseMobileSidebar() {
    setIsMobileSidebarOpen(false);
  }

  function handleCloseSettings() {
    setIsSettingsOpen(false);
    setSuccessMessage("");
    setSettingsErrorMessage("");
    setPasswordError("");
    setIsSettingsSaving(false);
    setPasswordSettings(defaultPasswordSettings);
    handleCloseResetModal();
  }

  function handleOpenResetModal() {
    if (!isSystemOwner) {
      return;
    }

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
    if (!isSystemOwner) {
      setResetError("Acesso restrito ao dono do sistema.");
      return;
    }

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
        removeCompanyStorageItem(companyId, storageKey);
      });
    });

    handleCloseResetModal();
    window.location.reload();
  }

  function validatePasswordChange() {
    setPasswordError("");
    setSettingsErrorMessage("");

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

    if (!passwordSettings.newPassword) {
      setPasswordError("Informe a nova senha.");
      return false;
    }

    if (passwordSettings.newPassword !== passwordSettings.confirmPassword) {
      setPasswordError("A confirmação de senha não confere.");
      return false;
    }

    return true;
  }

  async function handleSaveSettings() {
    if (isSettingsSaving) return;

    setPasswordError("");
    setSettingsErrorMessage("");
    setSuccessMessage("");

    if (!validatePasswordChange()) {
      setActiveSettingsTab("user");
      return;
    }

    if (!companyId) {
      setSettingsErrorMessage("Empresa do usuário não encontrada. Faça login novamente.");
      return;
    }

    setIsSettingsSaving(true);

    try {
      if (passwordSettings.newPassword) {
        await changePasswordRequest({
          currentPassword: passwordSettings.currentPassword,
          newPassword: passwordSettings.newPassword,
        });
      }

      const immutableUserSettings = {
        ...userSettings,
        email: lockedUserEmail,
      };

      await saveAppSettings({
        companyId,
        userSettings: immutableUserSettings,
        companySettings,
        themeSettings,
      });
    } catch (error) {
      setActiveSettingsTab("user");
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível salvar as configurações.";

      setPasswordError(message);
      setSettingsErrorMessage(message);
      return;
    } finally {
      setIsSettingsSaving(false);
    }

    setCompanyStorageItem(
      companyId,
      "contrx_user_settings",
      JSON.stringify({
        ...userSettings,
        email: lockedUserEmail,
      }),
    );
    setCompanyStorageItem(
      companyId,
      "contrx_theme_settings",
      JSON.stringify(themeSettings),
    );
    setCachedAppSettings({
      userSettings: {
        ...userSettings,
        email: lockedUserEmail,
      },
      companySettings,
      themeSettings,
    });
    window.dispatchEvent(new Event("contrx-theme-change"));

    if (passwordSettings.newPassword) {
      setCompanyStorageItem(companyId, "contrx_user_password_updated", "true");
      setPasswordSettings(defaultPasswordSettings);
    }

    setSuccessMessage(
      passwordSettings.newPassword
        ? "Senha alterada e configurações salvas com sucesso."
        : "Configurações salvas com sucesso.",
    );

    window.setTimeout(() => {
      setSuccessMessage("");
    }, 2500);
  }

  const isSidebarOpen = isSidebarExpanded || isSidebarLocked;
  const trialDaysRemaining = user ? getTrialDaysRemaining(user) : null;
  const trialNoticeTone = getTrialBannerTone(trialDaysRemaining);
  const trialEndsAtLabel = formatTrialDate(user?.trialAccessEndsAt);
  const trialLoginNoticeText =
    trialDaysRemaining === null
      ? "Seu teste profissional de 30 dias está ativo."
      : trialDaysRemaining === 0
        ? "Seu teste profissional termina hoje."
        : trialDaysRemaining === 1
          ? "Seu teste profissional termina em 1 dia."
          : `Seu teste profissional termina em ${trialDaysRemaining} dias.`;
  const isTrialExpired =
    user?.subscriptionStatus === "TRIAL" &&
    trialDaysRemaining !== null &&
    trialDaysRemaining < 0;
  const isCommercialAccessBlocked =
    !isSystemOwner &&
    (isTrialExpired ||
      user?.subscriptionStatus === "EXPIRED" ||
      user?.subscriptionStatus === "SUSPENDED" ||
      user?.subscriptionStatus === "CANCELED");
  const shellThemeClass =
    themeSettings.mode === "black"
      ? "bg-slate-950 text-slate-100"
    : themeSettings.mode === "graphite"
        ? "bg-[#07111f] text-slate-100"
        : "bg-[#f8fafc] text-slate-900";
  const darkSurfaceClass =
    themeSettings.mode === "black"
      ? "border-slate-700 bg-slate-900 shadow-black/40"
      : "border-[#24405f] bg-[#0d1b2e] shadow-black/30";
  const darkInsetSurfaceClass =
    themeSettings.mode === "black"
      ? "border border-slate-700 bg-slate-800"
      : "border border-[#24405f] bg-[#07111f]";
  const darkMenuItemClass =
    themeSettings.mode === "black"
      ? "text-slate-200 hover:bg-slate-800 hover:text-orange-400"
      : "text-[#b6c6dc] hover:bg-[#162a44] hover:text-orange-300";
  const darkMobileNavClass =
    themeSettings.mode === "black"
      ? "border-slate-800 bg-slate-950/95"
      : "border-[#24405f] bg-[#07111f]/95";
  const darkMobileItemClass =
    themeSettings.mode === "black"
      ? "bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-orange-300"
      : "bg-[#0d1b2e] text-[#b6c6dc] hover:bg-[#162a44] hover:text-orange-300";
  return (
    <AuthGuard>
      <div
        data-contrx-theme={themeSettings.mode}
        className={`min-h-screen lg:flex ${shellThemeClass}`}
      >
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
          className={`fixed left-0 top-0 z-50 hidden h-dvh max-w-[86vw] flex-col overflow-hidden border-r border-orange-100 bg-white transition-[width,transform] duration-300 ease-in-out lg:z-30 lg:flex lg:h-screen lg:max-w-none ${
            isSidebarOpen ? "lg:w-72" : "lg:w-20"
          } ${
            isMobileSidebarOpen
              ? "w-72 translate-x-0"
              : "w-72 -translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="border-b border-orange-100 px-4 py-5">
            <div className="flex items-center justify-between gap-3 lg:justify-center">
              <Link
                href="/dashboard"
                prefetch={menuLinkPrefetch}
                onClick={handleCloseMobileSidebar}
                className="flex min-w-0 flex-1 items-center justify-center transition hover:opacity-90"
              >
                <Image
                  src={isSidebarOpen ? "/contrx-logo-horizontal.png" : "/contrx-symbol.png"}
                  alt="Contrx"
                  width={2250}
                  height={880}
                  className={`object-contain transition-all duration-300 ease-in-out ${isSidebarOpen ? "h-20 w-56 lg:h-24 lg:w-60" : "h-12 w-14 lg:h-12 lg:w-14"}`}
                />
              </Link>
              <button
                type="button"
                onClick={handleCloseMobileSidebar}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-lg font-black text-slate-600 transition hover:bg-red-50 hover:text-red-600 lg:hidden"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div
            className={`hidden overflow-hidden border-b border-orange-100 px-4 transition-all duration-300 ease-in-out lg:block ${
              isSidebarOpen ? "max-h-14 py-3 opacity-100" : "max-h-0 py-0 opacity-0"
            }`}
          >
            <label className="flex items-center gap-2 whitespace-nowrap text-xs font-semibold text-slate-600">
              <input
                type="checkbox"
                checked={isSidebarLocked}
                onChange={(event) => {
                  const isChecked = event.target.checked;

                  setIsSidebarLocked(isChecked);
                  setIsSidebarExpanded(isChecked);

                  setCompanyStorageItem(
                    companyId,
                    "contrx_sidebar_locked",
                    String(isChecked),
                  );
                }}
              />
              Fixar
            </label>
          </div>

          <nav className="flex-1 space-y-2 overflow-y-auto overflow-x-hidden px-2 py-4 lg:py-6">
            {visibleMenuItems.map((item) => {
              const isActive = isActiveRoute(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={menuLinkPrefetch}
                  title={!isSidebarOpen ? item.label : undefined}
                  onClick={handleCloseMobileSidebar}
                  className={`group flex items-center overflow-hidden rounded-2xl px-3 py-3.5 text-sm font-bold transition-colors duration-200 lg:py-4 ${
                    isActive
                      ? "bg-orange-500 text-white shadow-md shadow-orange-100"
                      : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 ${
                      isActive
                        ? "bg-white/20"
                        : "bg-slate-100 group-hover:bg-orange-100"
                    }`}
                  >
                    {item.icon}
                  </span>

                  <span
                    className={`ml-4 whitespace-nowrap transition-all duration-300 ease-in-out ${
                      isSidebarOpen
                        ? "max-w-48 translate-x-0 opacity-100"
                        : "max-w-0 -translate-x-2 overflow-hidden opacity-0"
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
          className={`flex min-h-screen flex-1 flex-col transition-[margin] duration-300 ease-in-out ${
            isSidebarOpen ? "lg:ml-72" : "lg:ml-20"
          }`}
        >
          <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-3 py-3 backdrop-blur sm:px-4 lg:h-24 lg:px-8 lg:py-0">
            <div className="flex min-w-0 items-center gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-orange-600 lg:text-sm">
                  Bem-vindo
                </p>
                <h2 className="truncate text-base font-black text-slate-950 sm:text-xl lg:text-2xl">
                  {companySettings.tradeName || companySettings.companyName || "Contrx"}
                </h2>
              </div>
            </div>

            <div className="relative flex shrink-0 items-center gap-2 lg:gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-sm text-slate-500">Olá,</p>
                <p className="font-bold text-slate-900">{userSettings.name}</p>
              </div>

              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-lg font-black text-white shadow-md transition hover:scale-105 lg:h-12 lg:w-12"
              >
                {companySettings.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={companySettings.logo}
                    alt={`Logo ${companyDisplayName}`}
                    className="h-full w-full bg-white object-contain p-1.5"
                  />
                ) : (
                  companyLogoFallbackText
                )}
              </button>

              {isUserMenuOpen && (
                <div
                  className={`absolute right-0 top-14 z-50 w-[calc(100vw-1rem)] max-w-72 rounded-3xl border p-3 shadow-2xl transition lg:top-16 ${
                    themeSettings.mode !== "light"
                      ? darkSurfaceClass
                      : "border-orange-100 bg-white shadow-xl"
                  }`}
                >
                  <div
                    className={`mb-2 rounded-2xl px-4 py-3 ${
                      themeSettings.mode !== "light"
                        ? darkInsetSurfaceClass
                        : "bg-orange-50"
                    }`}
                  >
                    <p
                      className={`text-sm font-black ${
                        themeSettings.mode !== "light" ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {userSettings.name}
                    </p>
                    <p
                      className={`text-xs ${
                        themeSettings.mode !== "light" ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      {lockedUserEmail}
                    </p>
                  </div>

                  {canAccessTool(user?.role, user?.permissions, "settings") && (
                    <Link
                    href="/configuracoes"
                    prefetch={menuLinkPrefetch}
                    onClick={() => setIsUserMenuOpen(false)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                      themeSettings.mode !== "light"
                        ? darkMenuItemClass
                        : "text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                    }`}
                  >
                    ⚙️ Configurações
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                      themeSettings.mode !== "light"
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

          <main className="contrx-app-main min-w-0 flex-1 overflow-x-hidden px-3 pb-32 pt-4 sm:px-5 lg:px-8 lg:py-8">
            {isCommercialAccessBlocked ? (
              <CommercialAccessBlockedPanel
                status={user?.subscriptionStatus}
                trialEndsAtLabel={trialEndsAtLabel}
              />
            ) : (
              children
            )}
          </main>

          <nav
            className={`contrx-mobile-bottom-nav fixed inset-x-0 bottom-0 z-30 border-t px-2 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-1.5 shadow-[0_-18px_45px_rgba(15,23,42,0.12)] backdrop-blur lg:hidden ${
              themeSettings.mode !== "light"
                ? darkMobileNavClass
                : "border-orange-100 bg-white/95"
            }`}
            aria-label="Navegação principal mobile"
          >
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {visibleMenuItems.map((item) => {
                const isActive = isActiveRoute(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={menuLinkPrefetch}
                    className={`flex min-w-[4.85rem] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-black transition ${
                      isActive
                        ? "bg-orange-500 text-white shadow-md shadow-orange-100"
                        : themeSettings.mode !== "light"
                          ? darkMobileItemClass
                          : "bg-slate-50 text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                    }`}
                  >
                    <span className="text-base leading-none">{item.icon}</span>
                    <span className="max-w-[4.6rem] text-center leading-tight">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <GlobalMinimizedModalDock />
        </div>

        {isTrialLoginNoticeOpen && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="trial-login-notice-title"
          >
            <div className="w-full max-w-md rounded-[18px] border border-slate-200 bg-white p-6 text-slate-950 shadow-[0_28px_80px_rgba(15,23,42,0.28)]">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl ring-1 ${
                  trialNoticeTone === "danger"
                    ? "bg-red-50 text-red-700 ring-red-100"
                    : trialNoticeTone === "warning"
                      ? "bg-amber-50 text-amber-700 ring-amber-100"
                      : "bg-orange-50 text-orange-700 ring-orange-100"
                }`}
              >
                {trialNoticeTone === "danger" ? (
                  <AlertTriangle className="h-7 w-7" />
                ) : (
                  <Clock3 className="h-7 w-7" />
                )}
              </div>

              <h2
                id="trial-login-notice-title"
                className="mt-5 text-2xl font-black leading-tight text-slate-950"
              >
                Acesso profissional ativo
              </h2>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
                {trialLoginNoticeText}
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                {trialEndsAtLabel
                  ? `Seu acesso está válido até ${trialEndsAtLabel}.`
                  : "Seu acesso é válido por 30 dias a partir do cadastro."}
              </p>

              <div className="mt-5 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="text-sm font-black text-slate-900">
                      Dias disponíveis para uso
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {trialDaysRemaining === null
                        ? "Período de teste em andamento."
                        : `${trialDaysRemaining} dia${trialDaysRemaining === 1 ? "" : "s"} restante${
                            trialDaysRemaining === 1 ? "" : "s"
                          }.`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setIsTrialLoginNoticeOpen(false)}
                  className="flex h-12 items-center justify-center rounded-2xl bg-[#ff4b00] px-5 text-sm font-black text-white shadow-[0_16px_30px_rgba(255,75,0,0.22)] transition hover:bg-[#e94400]"
                >
                  Continuar
                </button>

                <Link
                  href="/configuracoes"
                  prefetch={menuLinkPrefetch}
                  onClick={() => setIsTrialLoginNoticeOpen(false)}
                  className="flex h-12 items-center justify-center rounded-2xl bg-slate-100 px-5 text-sm font-black text-slate-800 transition hover:bg-slate-200"
                >
                  Configurar empresa
                </Link>
              </div>
            </div>
          </div>
        )}

        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
            <div className="contrx-modal-panel flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-2xl">
              <div className="border-b border-slate-100 bg-gradient-to-r from-orange-50 via-white to-white px-6 py-5 lg:px-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-orange-700">
                      ⚙️ Central de configuração
                    </div>
                    <h2 className="text-2xl font-black text-slate-950">
                      Configurações do Contrx
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
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[260px_1fr]">
                <aside className="border-b border-slate-100 bg-slate-50 p-4 lg:border-b-0 lg:border-r">
                  <div className="rounded-3xl bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-xl font-black text-white">
                        {companySettings.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={companySettings.logo}
                            alt={`Logo ${companyDisplayName}`}
                            className="h-full w-full bg-white object-contain p-1.5"
                          />
                        ) : (
                          companyLogoFallbackText
                        )}
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

                  {isSystemOwner && (
                    <button
                      type="button"
                      onClick={handleOpenResetModal}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-sm font-black text-white shadow-md shadow-red-100 transition hover:bg-red-600"
                    >
                      🗑️ Resetar dados de teste
                    </button>
                  )}
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
                          Essas informações serão usadas em contratos, recibos, cobranças e documentos do Contrx.
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
                            placeholder="Ex: Contrx Gestão de Locações LTDA"
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
                            placeholder="Ex: Contrx"
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
                            placeholder="empresa@contrx.com.br"
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
                            value={lockedUserEmail}
                            readOnly
                            disabled
                            placeholder="usuario@contrx.com.br"
                            className="w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500 outline-none"
                          />
                          <span className="text-xs font-semibold text-slate-500">
                            O e-mail de acesso não pode ser alterado após o cadastro.
                          </span>
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
                              placeholder="Digite a nova senha"
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
                <div className="min-w-0">
                  {settingsErrorMessage ? (
                    <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold text-red-700">
                      {settingsErrorMessage}
                    </p>
                  ) : successMessage ? (
                    <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">
                      {successMessage}
                    </p>
                  ) : (
                    <p className="text-xs font-semibold text-slate-400">
                      As configurações serão sincronizadas com o backend ao salvar.
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseSettings}
                    disabled={isSettingsSaving}
                    className="rounded-2xl px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-100"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={isSettingsSaving}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSettingsSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isSettingsSaving ? "Salvando..." : "Salvar configurações"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isResetModalOpen && isSystemOwner && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
            <div className="contrx-modal-panel flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-red-100 bg-white shadow-2xl">
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
                    <X className="h-5 w-5" />
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
