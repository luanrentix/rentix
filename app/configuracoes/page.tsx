"use client";

import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { resetTestData } from "@/services/admin.service";
import { changePasswordRequest } from "@/services/auth";
import {
  createCompanyUser,
  getCompanyUsers,
  updateCompanyUser,
  type CompanyUser,
  type CompanyUserRole,
} from "@/services/company-users.service";
import {
  getCompanyStorageItem,
  removeCompanyStorageItem,
  setCompanyStorageItem,
} from "@/services/company-storage";
import { getAppSettings, saveAppSettings } from "@/services/settings.service";
import { setCachedAppSettings } from "@/services/settings-cache";

import {
  type BrasilApiCnpjResponse,
  type CompanyAccessProfileKey,
  type CompanySettings,
  type EditCompanyUserForm,
  type ImportPrintModalState,
  type NewCompanyUserForm,
  type PasswordSettings,
  type PixKeyType,
  type PrintDocumentKey,
  type PrintEditorViewMode,
  type PrintModalMode,
  type PrintModalState,
  type PrintTemplates,
  type ResetModuleKey,
  type ResetOptions,
  type RestorePrintModalState,
  type SettingsTab,
  type SettingsValidationErrors,
  type ThemeSettings,
  type UserSettings,
  type UserToolPermission,
  type ViaCepResponse,
  canResetTestDataRole,
  companyAccessProfiles,
  defaultCompanySettings,
  defaultEditCompanyUserForm,
  defaultNewCompanyUserForm,
  defaultPasswordSettings,
  defaultResetOptions,
  defaultThemeSettings,
  defaultUserSettings,
  isCompanyAdminRole,
  maxCompanyLogoSizeInBytes,
  normalizeThemeMode,
  normalizeThemeSettings,
  pixKeyTypeOptions,
  resetModuleOptions,
  roleLabels,
  settingsStorageKeys,
} from "./types/settings.types";

import {
  buildDocxBlobFromTemplateText,
  defaultPrintTemplates,
  extractTextFromDocx,
  getMissingPrintTemplateVariables,
  getPrintTemplateStats,
  normalizeImportedTemplateText,
  normalizeStoredPrintTemplates,
} from "./constants/print-templates";

import { SettingsSidebar } from "./components/SettingsSidebar";
import { CompanySettingsTab } from "./components/CompanySettingsTab";
import { UserSettingsTab } from "./components/UserSettingsTab";
import { PrintSettingsTab } from "./components/PrintSettingsTab";
import { AppearanceSettingsTab } from "./components/AppearanceSettingsTab";
import { ResetTestDataModal } from "./components/modals/ResetTestDataModal";
import { PrintEditorModal } from "./components/modals/PrintEditorModal";
import { ImportPrintModal } from "./components/modals/ImportPrintModal";
import { RestorePrintModal } from "./components/modals/RestorePrintModal";

function getInitialLetters(name: string) {
  const cleanName = name.trim();
  if (!cleanName) return "L";
  const nameParts = cleanName.split(" ").filter(Boolean);
  if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
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
    return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

function formatZipCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
}

function formatPixKey(value: string, pixKeyType: PixKeyType) {
  if (pixKeyType === "cpf" || pixKeyType === "cnpj") return formatDocument(value);
  if (pixKeyType === "phone") return formatPhone(value);
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

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isValidCpf(value: string) {
  const digits = onlyDigits(value);
  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
  const calculateDigit = (base: string, factor: number) => {
    const total = base.split("").reduce((sum, digit) => sum + Number(digit) * factor--, 0);
    const remainder = (total * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  const firstDigit = calculateDigit(digits.slice(0, 9), 10);
  const secondDigit = calculateDigit(digits.slice(0, 10), 11);
  return digits.endsWith(`${firstDigit}${secondDigit}`);
}

function isValidCnpj(value: string) {
  const digits = onlyDigits(value);
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false;
  const calculateDigit = (base: string, factors: number[]) => {
    const total = base.split("").reduce((sum, digit, index) => sum + Number(digit) * factors[index], 0);
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  const firstDigit = calculateDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondDigit = calculateDigit(digits.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return digits.endsWith(`${firstDigit}${secondDigit}`);
}

function isValidEmail(value: string) {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validateDocument(value: string) {
  const digits = onlyDigits(value);
  if (digits.length === 11) return isValidCpf(digits);
  if (digits.length === 14) return isValidCnpj(digits);
  return false;
}

function validatePixKey(value: string, pixKeyType: PixKeyType) {
  const cleanValue = value.trim();
  if (!cleanValue) return true;
  if (pixKeyType === "cpf") return onlyDigits(cleanValue).length === 11;
  if (pixKeyType === "cnpj") return onlyDigits(cleanValue).length === 14;
  if (pixKeyType === "phone") return onlyDigits(cleanValue).length >= 10;
  if (pixKeyType === "email") return isValidEmail(cleanValue);
  return cleanValue.length >= 8;
}

async function fetchCompanyDataByCnpj(cleanCnpj: string) {
  const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
  if (!response.ok) return null;
  const data = (await response.json()) as BrasilApiCnpjResponse;
  const companyName = data.razao_social?.trim() || "";
  if (!companyName) return null;
  return {
    companyName,
    tradeName: data.nome_fantasia?.trim() || "",
    document: data.cnpj || cleanCnpj,
    phone: data.ddd_telefone_1 || "",
    zipCode: data.cep || "",
    state: data.uf || "",
    city: data.municipio || "",
    address: data.logradouro || "",
    number: data.numero || "",
    neighborhood: data.bairro || "",
  };
}

async function fetchAddressByZipCode(cleanZipCode: string) {
  const response = await fetch(`https://viacep.com.br/ws/${cleanZipCode}/json/`);
  if (!response.ok) return null;
  const data = (await response.json()) as ViaCepResponse;
  if (data.erro) return null;
  return {
    zipCode: data.cep || cleanZipCode,
    state: data.uf || "",
    city: data.localidade || "",
    address: data.logradouro || "",
    neighborhood: data.bairro || "",
  };
}

function renderPrintTemplatePreview(content: string, documentKey: PrintDocumentKey | null) {
  const previewValues: Record<string, string> = {
    companyName: "Contrx Gestão de Locações LTDA",
    tradeName: "Contrx",
    landlordName: "Contrx Gestão de Locações LTDA",
    landlordDocument: "12.345.678/0001-90",
    landlordAddress: "Rua Principal, nº 100, Centro, Rolim de Moura/RO, CEP 76940-000",
    companyEmail: "contato@contrx.com.br",
    companyPhone: "(69) 99999-0000",
    personName: "João da Silva",
    tenantName: "João da Silva",
    tenantDocument: "123.456.789-00",
    tenantAddress: "Rua das Flores, nº 25, Centro, Rolim de Moura/RO, CEP 76940-000",
    tenantEmail: "joao@email.com",
    tenantPhone: "(69) 99999-1111",
    propertyName: "Casa Temporada Centro",
    propertyAddress: "Avenida Norte, nº 500, Bairro Jardim, Rolim de Moura/RO",
    startDate: "10/05/2026",
    endDate: "12/05/2026",
    entryTime: "14:00",
    exitTime: "10:00",
    contractDays: "3",
    contractMonths: "12",
    amount: "R$ 1.200,00",
    dueDate: "10/05/2026",
    pixKey: "pix@contrx.com.br",
    contractNumber: "CTR-0001",
    installmentNumber: "1/3",
    contractCity: "Rolim de Moura/RO",
    currentDate: "02 de maio de 2026",
    contractDefaultNotes: "Observações adicionais do contrato aparecerão neste espaço.",
    reportCategory: "Aluguel / fornecedor",
    reportStatus: "Pendentes",
    reportDueFilter: "Próximos vencimentos",
    reportStartDate: "01/05/2026",
    reportEndDate: "31/05/2026",
    reportCount: "8",
    reportTotal: "R$ 7.800,00",
    reportPaidTotal: "R$ 2.100,00",
    reportPendingTotal: "R$ 4.900,00",
    reportOverdueTotal: "R$ 800,00",
  };

  let previewContent = content;
  Object.entries(previewValues).forEach(([key, value]) => {
    previewContent = previewContent.replace(new RegExp(`{${key}}`, "g"), value);
  });

  if (documentKey === "paymentBooklet") {
    if (/CARN/i.test(previewContent)) return previewContent;
    return `CARNÊ DE PAGAMENTO\n\nEMPRESA: ${previewValues.companyName}\nCLIENTE: ${previewValues.personName}\nCONTRATO: ${previewValues.contractNumber}\nPARCELA: ${previewValues.installmentNumber}\nVENCIMENTO: ${previewValues.dueDate}\nVALOR: ${previewValues.amount}\nPIX: ${previewValues.pixKey}\n\nINSTRUÇÕES:\n${previewContent}`;
  }

  return previewContent;
}

const contrxThemeStyle = `
  [data-contrx-theme="black"] {
    background: #020617 !important;
    color: #f8fafc !important;
  }
  [data-contrx-theme="black"] .bg-white,
  [data-contrx-theme="black"] .bg-slate-50,
  [data-contrx-theme="black"] .bg-slate-100 {
    background-color: #0f172a !important;
  }
  [data-contrx-theme="black"] input,
  [data-contrx-theme="black"] select,
  [data-contrx-theme="black"] textarea {
    background-color: #020617 !important;
    border-color: #334155 !important;
    color: #f8fafc !important;
  }
`;

export default function ConfiguracoesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const companyId = user?.companyId;
  const userEmail = user?.email;

  const [activeSettingsTab, setActiveSettingsTab] = useState<SettingsTab>("company");
  const [userSettings, setUserSettings] = useState<UserSettings>(defaultUserSettings);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(defaultCompanySettings);
  const [initialUserSettings, setInitialUserSettings] = useState<UserSettings>(defaultUserSettings);
  const [initialCompanySettings, setInitialCompanySettings] = useState<CompanySettings>(defaultCompanySettings);
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(defaultThemeSettings);
  const [initialThemeSettings, setInitialThemeSettings] = useState<ThemeSettings>(defaultThemeSettings);
  const [printTemplates, setPrintTemplates] = useState<PrintTemplates>(defaultPrintTemplates);
  const [initialPrintTemplates, setInitialPrintTemplates] = useState<PrintTemplates>(defaultPrintTemplates);

  const [printModalState, setPrintModalState] = useState<PrintModalState>({
    isOpen: false,
    mode: "view",
    documentKey: null,
  });
  const [printEditorViewMode, setPrintEditorViewMode] = useState<PrintEditorViewMode>("split");
  const [isImportingPrintTemplate, setIsImportingPrintTemplate] = useState(false);
  const [downloadingPrintTemplateKey, setDownloadingPrintTemplateKey] = useState<PrintDocumentKey | null>(null);

  const [restorePrintModalState, setRestorePrintModalState] = useState<RestorePrintModalState>({
    isOpen: false,
    documentKey: null,
  });
  const [importPrintModalState, setImportPrintModalState] = useState<ImportPrintModalState>({
    isOpen: false,
    documentKey: null,
  });

  const [passwordSettings, setPasswordSettings] = useState<PasswordSettings>(defaultPasswordSettings);
  const [validationErrors, setValidationErrors] = useState<SettingsValidationErrors>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [logoUploadError, setLogoUploadError] = useState("");
  const [documentLookupError, setDocumentLookupError] = useState("");
  const [zipCodeLookupError, setZipCodeLookupError] = useState("");
  const [isDocumentLookupLoading, setIsDocumentLookupLoading] = useState(false);
  const [isZipCodeLookupLoading, setIsZipCodeLookupLoading] = useState(false);

  const [isSavingCompanySettings, setIsSavingCompanySettings] = useState(false);
  const [isSavingUserSettings, setIsSavingUserSettings] = useState(false);
  const [isSavingAppearanceSettings, setIsSavingAppearanceSettings] = useState(false);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetOptions, setResetOptions] = useState<ResetOptions>(defaultResetOptions);
  const [isResettingData, setIsResettingData] = useState(false);
  const [resetError, setResetError] = useState("");

  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [newCompanyUserForm, setNewCompanyUserForm] = useState<NewCompanyUserForm>(defaultNewCompanyUserForm);
  const [editingCompanyUser, setEditingCompanyUser] = useState<CompanyUser | null>(null);
  const [editCompanyUserForm, setEditCompanyUserForm] = useState<EditCompanyUserForm>(defaultEditCompanyUserForm);
  const [isUserSettingsEditing, setIsUserSettingsEditing] = useState(false);
  const [activeCompanyUsersTab, setActiveCompanyUsersTab] = useState<"list" | "new">("list");
  const [isLoadingCompanyUsers, setIsLoadingCompanyUsers] = useState(false);
  const [isCreatingCompanyUser, setIsCreatingCompanyUser] = useState(false);
  const [isUpdatingCompanyUser, setIsUpdatingCompanyUser] = useState(false);
  const [companyUserError, setCompanyUserError] = useState("");

  const companyLogoInputRef = useRef<HTMLInputElement | null>(null);
  const printTemplateTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const printTemplateDocxInputRef = useRef<HTMLInputElement | null>(null);

  const lockedUserEmail = user?.email || userSettings.email;
  const currentUserRoleLabel = roleLabels[user?.role || ""] || "Usuário";
  const canResetTestData = canResetTestDataRole(user?.role);
  const canManageCompanyUsers = isCompanyAdminRole(user?.role);
  const companyDisplayName = companySettings.tradeName || companySettings.companyName || "Empresa não cadastrada";
  const companyLogoFallbackText = getInitialLetters(
    companySettings.tradeName || companySettings.companyName || userSettings.name,
  );

  const selectedPrintTemplate = printModalState.documentKey
    ? printTemplates[printModalState.documentKey]
    : null;

  const selectedPrintTemplatePreview = useMemo(
    () =>
      selectedPrintTemplate
        ? renderPrintTemplatePreview(selectedPrintTemplate.content, printModalState.documentKey)
        : "",
    [selectedPrintTemplate, printModalState.documentKey]
  );

  const selectedPrintTemplateStats = useMemo(
    () => getPrintTemplateStats(selectedPrintTemplate?.content || ""),
    [selectedPrintTemplate]
  );

  const selectedPrintTemplateMissingVariables = useMemo(
    () =>
      getMissingPrintTemplateVariables(
        selectedPrintTemplate?.content || "",
        printModalState.documentKey,
      ),
    [selectedPrintTemplate, printModalState.documentKey]
  );

  const selectedRestorePrintTemplate = restorePrintModalState.documentKey
    ? printTemplates[restorePrintModalState.documentKey]
    : null;
  const selectedImportPrintTemplate = importPrintModalState.documentKey
    ? printTemplates[importPrintModalState.documentKey]
    : null;

  const selectedResetModulesCount = useMemo(
    () => resetModuleOptions.filter((option) => resetOptions[option.key]).length,
    [resetOptions]
  );

  const hasCompanySettingsChanges = useMemo(
    () => JSON.stringify(companySettings) !== JSON.stringify(initialCompanySettings),
    [companySettings, initialCompanySettings]
  );

  const loadSettingsFromLocalStorage = useCallback(() => {
    const storedUserSettings = getCompanyStorageItem(
      companyId,
      settingsStorageKeys.user,
      settingsStorageKeys.user,
    );
    if (storedUserSettings) {
      const parsedUserSettings = {
        ...defaultUserSettings,
        ...JSON.parse(storedUserSettings),
        email: userEmail || defaultUserSettings.email,
      };
      setUserSettings(parsedUserSettings);
      setInitialUserSettings(parsedUserSettings);
    }

    const storedCompanySettings = getCompanyStorageItem(
      companyId,
      settingsStorageKeys.company,
      settingsStorageKeys.company,
    );
    if (storedCompanySettings) {
      const parsedCompanySettings = {
        ...defaultCompanySettings,
        ...JSON.parse(storedCompanySettings),
      };
      setCompanySettings(parsedCompanySettings);
      setInitialCompanySettings(parsedCompanySettings);
    }

    const storedPrintTemplates = getCompanyStorageItem(
      companyId,
      settingsStorageKeys.print,
      settingsStorageKeys.print,
    );
    if (storedPrintTemplates) {
      const parsedPrintTemplates = normalizeStoredPrintTemplates(
        JSON.parse(storedPrintTemplates) as Partial<PrintTemplates>,
      );
      setPrintTemplates(parsedPrintTemplates);
      setInitialPrintTemplates(parsedPrintTemplates);
    }
  }, [companyId, userEmail]);

  const loadSettings = useCallback(
    async (currentCompanyId: string) => {
      try {
        const settings = await getAppSettings(currentCompanyId);
        setCachedAppSettings(settings);

        const nextUserSettings = {
          ...defaultUserSettings,
          ...(settings.userSettings || {}),
          email: userEmail || defaultUserSettings.email,
        } as UserSettings;

        const storedCompanySettings = (settings.companySettings || {}) as Record<string, unknown>;
        const nextCompanySettings = {
          ...defaultCompanySettings,
          ...storedCompanySettings,
          logo: String(
            storedCompanySettings.logo ||
              storedCompanySettings.logoUrl ||
              storedCompanySettings.logoBase64 ||
              storedCompanySettings.companyLogo ||
              "",
          ),
        } as CompanySettings;

        const nextThemeSettings = normalizeThemeSettings(
          settings.themeSettings as Partial<ThemeSettings> | undefined,
        );
        const nextPrintTemplates = normalizeStoredPrintTemplates(
          (settings.printTemplates || {}) as Partial<PrintTemplates>,
        );

        setUserSettings(nextUserSettings);
        setInitialUserSettings(nextUserSettings);
        setCompanySettings(nextCompanySettings);
        setInitialCompanySettings(nextCompanySettings);
        setThemeSettings(nextThemeSettings);
        setInitialThemeSettings(nextThemeSettings);
        setPrintTemplates(nextPrintTemplates);
        setInitialPrintTemplates(nextPrintTemplates);
      } catch {
        console.warn("Settings API unavailable. Local cached settings loaded.");
        loadSettingsFromLocalStorage();
      }
    },
    [loadSettingsFromLocalStorage, userEmail]
  );

  useEffect(() => {
    if (!companyId) {
      loadSettingsFromLocalStorage();
      return;
    }
    loadSettings(companyId);
  }, [companyId, loadSettings, loadSettingsFromLocalStorage]);

  const loadCompanyUsers = useCallback(async () => {
    if (!canManageCompanyUsers) {
      setCompanyUsers([]);
      return;
    }
    try {
      setIsLoadingCompanyUsers(true);
      setCompanyUserError("");
      setCompanyUsers(await getCompanyUsers());
    } catch (error) {
      setCompanyUserError(
        error instanceof Error ? error.message : "Não foi possível carregar os usuários.",
      );
    } finally {
      setIsLoadingCompanyUsers(false);
    }
  }, [canManageCompanyUsers]);

  useEffect(() => {
    loadCompanyUsers();
  }, [loadCompanyUsers]);

  useEffect(() => {
    const isDarkMode = themeSettings.mode !== "light";
    document.documentElement.classList.toggle("dark", isDarkMode);
    document.body.classList.toggle("dark", isDarkMode);
    document.documentElement.dataset.contrxTheme = themeSettings.mode;
    document.body.dataset.contrxTheme = themeSettings.mode;

    const activeAccent = themeSettings.accent || "orange";
    document.documentElement.dataset.contrxAccent = activeAccent;
    document.body.dataset.contrxAccent = activeAccent;
  }, [themeSettings.mode, themeSettings.accent]);

  // Handlers para Cadastro da Empresa
  function handleSelectCompanyLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoUploadError("Selecione uma imagem válida.");
      event.target.value = "";
      return;
    }
    if (file.size > maxCompanyLogoSizeInBytes) {
      setLogoUploadError("A logo precisa ter no máximo 2 MB.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCompanySettings((prev) => ({ ...prev, logo: reader.result as string }));
        setLogoUploadError("");
      }
      event.target.value = "";
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveCompanyLogo() {
    setCompanySettings((prev) => ({ ...prev, logo: "" }));
    setLogoUploadError("");
    if (companyLogoInputRef.current) companyLogoInputRef.current.value = "";
  }

  async function handleSearchCompanyDocument() {
    const cleanDocument = onlyDigits(companySettings.document);
    if (!cleanDocument || cleanDocument.length !== 14 || !isValidCnpj(cleanDocument)) {
      setDocumentLookupError("CNPJ inválido para busca.");
      return;
    }
    try {
      setIsDocumentLookupLoading(true);
      setDocumentLookupError("");
      const companyData = await fetchCompanyDataByCnpj(cleanDocument);
      if (!companyData) {
        setDocumentLookupError("Empresa não encontrada.");
        return;
      }
      setCompanySettings((prev) => ({
        ...prev,
        companyName: companyData.companyName || prev.companyName,
        tradeName: companyData.tradeName || prev.tradeName,
        document: formatDocument(companyData.document),
        phone: companyData.phone ? formatPhone(companyData.phone) : prev.phone,
        zipCode: companyData.zipCode ? formatZipCode(companyData.zipCode) : prev.zipCode,
        state: companyData.state || prev.state,
        city: companyData.city || prev.city,
        address: companyData.address || prev.address,
        number: companyData.number || prev.number,
        neighborhood: companyData.neighborhood || prev.neighborhood,
      }));
    } catch {
      setDocumentLookupError("Erro ao consultar CNPJ.");
    } finally {
      setIsDocumentLookupLoading(false);
    }
  }

  async function handleSearchCompanyZipCode() {
    const cleanZipCode = onlyDigits(companySettings.zipCode);
    if (!cleanZipCode || cleanZipCode.length !== 8) {
      setZipCodeLookupError("CEP inválido.");
      return;
    }
    try {
      setIsZipCodeLookupLoading(true);
      setZipCodeLookupError("");
      const addressData = await fetchAddressByZipCode(cleanZipCode);
      if (!addressData) {
        setZipCodeLookupError("CEP não encontrado.");
        return;
      }
      setCompanySettings((prev) => ({
        ...prev,
        zipCode: formatZipCode(addressData.zipCode),
        state: addressData.state || prev.state,
        city: addressData.city || prev.city,
        address: addressData.address || prev.address,
        neighborhood: addressData.neighborhood || prev.neighborhood,
      }));
    } catch {
      setZipCodeLookupError("Erro ao consultar CEP.");
    } finally {
      setIsZipCodeLookupLoading(false);
    }
  }

  async function handleSaveCompanySettings() {
    setIsSavingCompanySettings(true);
    setSuccessMessage("");
    try {
      await saveAppSettings({
        companyId: companyId || "",
        userSettings: { ...userSettings, email: lockedUserEmail },
        companySettings,
        printTemplates,
        themeSettings,
      });
      setInitialCompanySettings(companySettings);
      setSuccessMessage("Cadastro da empresa salvo com sucesso!");
    } catch {
      setSuccessMessage("Erro ao salvar cadastro da empresa.");
    } finally {
      setIsSavingCompanySettings(false);
    }
  }

  // Handlers de Usuários
  function handleStartUserSettingsEdit() {
    setIsUserSettingsEditing(true);
    setPasswordError("");
  }

  function handleCancelUserSettingsEdit() {
    setUserSettings({ ...initialUserSettings, email: lockedUserEmail });
    setPasswordSettings(defaultPasswordSettings);
    setPasswordError("");
    setIsUserSettingsEditing(false);
  }

  async function handleSaveUserSettings() {
    setIsSavingUserSettings(true);
    setPasswordError("");
    try {
      if (passwordSettings.newPassword) {
        if (passwordSettings.newPassword !== passwordSettings.confirmPassword) {
          setPasswordError("A confirmação da nova senha não confere.");
          setIsSavingUserSettings(false);
          return;
        }
        await changePasswordRequest({
          currentPassword: passwordSettings.currentPassword,
          newPassword: passwordSettings.newPassword,
        });
      }
      const immutableUserSettings = { ...userSettings, email: lockedUserEmail };
      await saveAppSettings({
        companyId: companyId || "",
        userSettings: immutableUserSettings,
        companySettings,
        printTemplates,
        themeSettings,
      });
      setInitialUserSettings(immutableUserSettings);
      setIsUserSettingsEditing(false);
      setPasswordSettings(defaultPasswordSettings);
      setSuccessMessage("Dados do usuário atualizados!");
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Erro ao atualizar usuário.");
    } finally {
      setIsSavingUserSettings(false);
    }
  }

  // Handlers para Usuários da Empresa
  async function handleCreateCompanyUser(event: React.FormEvent) {
    event.preventDefault();
    if (!canManageCompanyUsers) return;
    try {
      setIsCreatingCompanyUser(true);
      setCompanyUserError("");
      await createCompanyUser(newCompanyUserForm);
      setNewCompanyUserForm(defaultNewCompanyUserForm);
      setActiveCompanyUsersTab("list");
      await loadCompanyUsers();
      setSuccessMessage("Usuário cadastrado com sucesso.");
    } catch (error) {
      setCompanyUserError(error instanceof Error ? error.message : "Erro ao criar usuário.");
    } finally {
      setIsCreatingCompanyUser(false);
    }
  }

  function handleApplyNewUserAccessProfile(profileKey: CompanyAccessProfileKey) {
    const prof = companyAccessProfiles.find((p) => p.key === profileKey);
    if (!prof) return;
    setNewCompanyUserForm((f) => ({
      ...f,
      role: prof.role,
      permissions: [...prof.permissions],
    }));
  }

  function handleToggleCompanyUserPermission(permission: UserToolPermission) {
    setNewCompanyUserForm((f) => {
      const current = new Set(f.permissions);
      if (current.has(permission)) current.delete(permission);
      else current.add(permission);
      return { ...f, permissions: Array.from(current) };
    });
  }

  function handleStartEditCompanyUser(companyUser: CompanyUser) {
    setEditingCompanyUser(companyUser);
    setEditCompanyUserForm({
      name: companyUser.name,
      email: companyUser.email,
      password: "",
      role: companyUser.role as CompanyUserRole,
      isActive: companyUser.isActive,
      permissions: companyUser.permissions || [],
    });
  }

  function handleCancelEditCompanyUser() {
    setEditingCompanyUser(null);
    setEditCompanyUserForm(defaultEditCompanyUserForm);
  }

  async function handleUpdateCompanyUser(event: React.FormEvent) {
    event.preventDefault();
    if (!editingCompanyUser) return;
    try {
      setIsUpdatingCompanyUser(true);
      setCompanyUserError("");
      await updateCompanyUser(editingCompanyUser.id, {
        name: editCompanyUserForm.name,
        role: editCompanyUserForm.role,
        isActive: editCompanyUserForm.isActive,
        permissions: editCompanyUserForm.permissions,
        ...(editCompanyUserForm.password ? { password: editCompanyUserForm.password } : {}),
      });
      handleCancelEditCompanyUser();
      await loadCompanyUsers();
      setSuccessMessage("Usuário da empresa atualizado.");
    } catch (error) {
      setCompanyUserError(error instanceof Error ? error.message : "Erro ao atualizar.");
    } finally {
      setIsUpdatingCompanyUser(false);
    }
  }

  function handleApplyEditUserAccessProfile(profileKey: CompanyAccessProfileKey) {
    const prof = companyAccessProfiles.find((p) => p.key === profileKey);
    if (!prof) return;
    setEditCompanyUserForm((f) => ({
      ...f,
      role: prof.role,
      permissions: [...prof.permissions],
    }));
  }

  function handleToggleEditCompanyUserPermission(permission: UserToolPermission) {
    setEditCompanyUserForm((f) => {
      const current = new Set(f.permissions);
      if (current.has(permission)) current.delete(permission);
      else current.add(permission);
      return { ...f, permissions: Array.from(current) };
    });
  }

  // Handlers para Impressos
  function handleOpenPrintModal(documentKey: PrintDocumentKey, mode: PrintModalMode) {
    setPrintModalState({ isOpen: true, mode, documentKey });
  }

  function handleClosePrintModal() {
    setPrintModalState({ isOpen: false, mode: "view", documentKey: null });
  }

  async function handleDownloadPrintTemplateForEditing(documentKey: PrintDocumentKey) {
    const template = printTemplates[documentKey];
    if (!template) return;
    try {
      setDownloadingPrintTemplateKey(documentKey);
      const blob = await buildDocxBlobFromTemplateText(template.content);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${template.title.toLowerCase().replace(/\s+/g, "_")}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      console.error("Erro ao gerar docx");
    } finally {
      setDownloadingPrintTemplateKey(null);
    }
  }

  function handleOpenImportPrintTutorial(documentKey: PrintDocumentKey) {
    setImportPrintModalState({ isOpen: true, documentKey });
  }

  function handleCloseImportPrintTutorial() {
    setImportPrintModalState({ isOpen: false, documentKey: null });
  }

  async function handleImportPrintTemplateFromDocx(documentKey: PrintDocumentKey, file: File) {
    try {
      setIsImportingPrintTemplate(true);
      const text = await extractTextFromDocx(file);
      const normalized = normalizeImportedTemplateText(text);
      setPrintTemplates((prev) => ({
        ...prev,
        [documentKey]: {
          ...prev[documentKey],
          content: normalized,
          importedFileName: file.name,
          importedAt: new Date().toLocaleDateString("pt-BR"),
        },
      }));
      setSuccessMessage(`Modelo de impresso "${printTemplates[documentKey].title}" importado.`);
    } catch (error) {
      console.error(error);
    } finally {
      setIsImportingPrintTemplate(false);
    }
  }

  function handleOpenRestorePrintModal(documentKey: PrintDocumentKey) {
    setRestorePrintModalState({ isOpen: true, documentKey });
  }

  function handleCloseRestorePrintModal() {
    setRestorePrintModalState({ isOpen: false, documentKey: null });
  }

  function handleConfirmRestorePrintTemplate() {
    if (!restorePrintModalState.documentKey) return;
    const key = restorePrintModalState.documentKey;
    setPrintTemplates((prev) => ({
      ...prev,
      [key]: { ...defaultPrintTemplates[key] },
    }));
    handleCloseRestorePrintModal();
    setSuccessMessage(`Modelo "${defaultPrintTemplates[key].title}" restaurado.`);
  }

  // Handlers para Aparência
  async function handleSaveAppearanceSettings() {
    setIsSavingAppearanceSettings(true);
    try {
      await saveAppSettings({
        companyId: companyId || "",
        userSettings: { ...userSettings, email: lockedUserEmail },
        companySettings,
        printTemplates,
        themeSettings,
      });
      setInitialThemeSettings(themeSettings);
      setSuccessMessage("Preferencia de aparencia salva!");
    } catch {
      setSuccessMessage("Erro ao salvar aparencia.");
    } finally {
      setIsSavingAppearanceSettings(false);
    }
  }

  // Reset de Dados
  function handleOpenResetModal() {
    setResetOptions(defaultResetOptions);
    setResetError("");
    setIsResetModalOpen(true);
  }

  function handleCloseResetModal() {
    setIsResetModalOpen(false);
    setResetOptions(defaultResetOptions);
    setResetError("");
  }

  function handleToggleResetOption(key: ResetModuleKey) {
    setResetOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleSelectAllResetOptions() {
    setResetOptions(
      resetModuleOptions.reduce((acc, opt) => ({ ...acc, [opt.key]: true }), {} as ResetOptions),
    );
  }

  function handleClearResetOptions() {
    setResetOptions(defaultResetOptions);
  }

  async function handleConfirmResetData() {
    const selected = resetModuleOptions.filter((opt) => resetOptions[opt.key]);
    if (selected.length === 0) {
      setResetError("Selecione pelo menos um módulo.");
      return;
    }
    try {
      setIsResettingData(true);
      setResetError("");
      await resetTestData(selected.map((opt) => opt.key));
      selected.forEach((opt) => {
        opt.storageKeys.forEach((key) => removeCompanyStorageItem(companyId, key));
      });
      handleCloseResetModal();
      window.location.reload();
    } catch (error) {
      setResetError(error instanceof Error ? error.message : "Erro ao resetar dados.");
    } finally {
      setIsResettingData(false);
    }
  }

  return (
    <div
      data-contrx-theme={themeSettings.mode}
      className={`min-h-screen px-3 py-3 sm:px-6 sm:py-6 lg:px-8 ${
        themeSettings.mode === "graphite"
          ? "bg-[#07111f] text-slate-100"
          : themeSettings.mode === "black"
            ? "bg-slate-950 text-slate-100"
            : "bg-slate-100"
      }`}
    >
      <style>{contrxThemeStyle}</style>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[2rem] border border-orange-100 bg-white shadow-sm">
          <div className="relative border-b border-slate-100 bg-gradient-to-r from-orange-50 via-white to-white px-4 py-4 pr-16 sm:px-6 sm:py-5 sm:pr-20 lg:px-8 lg:pr-24">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-base font-black text-slate-500 shadow-sm transition hover:bg-orange-50 hover:text-orange-600 sm:right-6 sm:top-5 sm:h-11 sm:w-11 lg:right-8"
              aria-label="Fechar configurações"
              title="Fechar configurações"
            >
              ✕
            </button>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-orange-700">
              ⚙️ Central de Configurações
            </div>
            <h1 className="text-xl font-black leading-tight text-slate-950 sm:text-2xl">
              Configurações do Contrx
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              Gerencie os dados da empresa, usuário, impressos e personalização visual.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr]">
            <SettingsSidebar
              userSettings={userSettings}
              companySettings={companySettings}
              companyDisplayName={companyDisplayName}
              companyLogoFallbackText={companyLogoFallbackText}
              activeSettingsTab={activeSettingsTab}
              setActiveSettingsTab={setActiveSettingsTab}
              canResetTestData={canResetTestData}
              onOpenResetModal={handleOpenResetModal}
            />

            <section className="p-4 sm:p-5 lg:p-8">
              {successMessage && (
                <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                  {successMessage}
                </div>
              )}

              {activeSettingsTab === "company" && (
                <CompanySettingsTab
                  companySettings={companySettings}
                  setCompanySettings={setCompanySettings}
                  logoUploadError={logoUploadError}
                  companyLogoInputRef={companyLogoInputRef}
                  handleSelectCompanyLogo={handleSelectCompanyLogo}
                  handleRemoveCompanyLogo={handleRemoveCompanyLogo}
                  documentLookupError={documentLookupError}
                  setDocumentLookupError={setDocumentLookupError}
                  validationErrors={validationErrors}
                  onlyDigits={onlyDigits}
                  formatDocument={formatDocument}
                  formatPhone={formatPhone}
                  formatZipCode={formatZipCode}
                  formatPixKey={formatPixKey}
                  getPixKeyPlaceholder={getPixKeyPlaceholder}
                  handleSearchCompanyDocument={handleSearchCompanyDocument}
                  isDocumentLookupLoading={isDocumentLookupLoading}
                  zipCodeLookupError={zipCodeLookupError}
                  setZipCodeLookupError={setZipCodeLookupError}
                  handleSearchCompanyZipCode={handleSearchCompanyZipCode}
                  isZipCodeLookupLoading={isZipCodeLookupLoading}
                  isSavingCompanySettings={isSavingCompanySettings}
                  hasCompanySettingsChanges={hasCompanySettingsChanges}
                  handleSaveCompanySettings={handleSaveCompanySettings}
                />
              )}

              {activeSettingsTab === "user" && (
                <UserSettingsTab
                  userSettings={userSettings}
                  setUserSettings={setUserSettings}
                  lockedUserEmail={lockedUserEmail}
                  currentUserRoleLabel={currentUserRoleLabel}
                  companySettingsLogo={companySettings.logo}
                  companyDisplayName={companyDisplayName}
                  companyLogoFallbackText={companyLogoFallbackText}
                  passwordError={passwordError}
                  isUserSettingsEditing={isUserSettingsEditing}
                  handleStartUserSettingsEdit={handleStartUserSettingsEdit}
                  handleCancelUserSettingsEdit={handleCancelUserSettingsEdit}
                  passwordSettings={passwordSettings}
                  setPasswordSettings={setPasswordSettings}
                  validationErrors={validationErrors}
                  isSavingUserSettings={isSavingUserSettings}
                  handleSaveUserSettings={handleSaveUserSettings}
                  canManageCompanyUsers={canManageCompanyUsers}
                  companyUsers={companyUsers}
                  isLoadingCompanyUsers={isLoadingCompanyUsers}
                  companyUserError={companyUserError}
                  activeCompanyUsersTab={activeCompanyUsersTab}
                  setActiveCompanyUsersTab={setActiveCompanyUsersTab}
                  newCompanyUserForm={newCompanyUserForm}
                  setNewCompanyUserForm={setNewCompanyUserForm}
                  isCreatingCompanyUser={isCreatingCompanyUser}
                  handleCreateCompanyUser={handleCreateCompanyUser}
                  handleApplyNewUserAccessProfile={handleApplyNewUserAccessProfile}
                  handleToggleCompanyUserPermission={handleToggleCompanyUserPermission}
                  editingCompanyUser={editingCompanyUser}
                  editCompanyUserForm={editCompanyUserForm}
                  setEditCompanyUserForm={setEditCompanyUserForm}
                  isUpdatingCompanyUser={isUpdatingCompanyUser}
                  handleStartEditCompanyUser={handleStartEditCompanyUser}
                  handleCancelEditCompanyUser={handleCancelEditCompanyUser}
                  handleUpdateCompanyUser={handleUpdateCompanyUser}
                  handleApplyEditUserAccessProfile={handleApplyEditUserAccessProfile}
                  handleToggleEditCompanyUserPermission={handleToggleEditCompanyUserPermission}
                />
              )}

              {activeSettingsTab === "print" && (
                <PrintSettingsTab
                  printTemplates={printTemplates}
                  onOpenPrintModal={handleOpenPrintModal}
                  onOpenImportPrintModal={handleOpenImportPrintTutorial}
                  onOpenRestorePrintModal={handleOpenRestorePrintModal}
                />
              )}

              {activeSettingsTab === "appearance" && (
                <AppearanceSettingsTab
                  themeSettings={themeSettings}
                  setThemeSettings={setThemeSettings}
                  isSaving={isSavingAppearanceSettings}
                  onSave={handleSaveAppearanceSettings}
                />
              )}
            </section>
          </div>
        </div>
      </div>

      <ResetTestDataModal
        isOpen={isResetModalOpen}
        canResetTestData={canResetTestData}
        selectedResetModulesCount={selectedResetModulesCount}
        resetModuleOptions={resetModuleOptions}
        resetOptions={resetOptions}
        resetError={resetError}
        isResettingData={isResettingData}
        onClose={handleCloseResetModal}
        onSelectAll={handleSelectAllResetOptions}
        onClear={handleClearResetOptions}
        onToggleOption={handleToggleResetOption}
        onConfirm={handleConfirmResetData}
      />

      <PrintEditorModal
        printModalState={printModalState}
        selectedPrintTemplate={selectedPrintTemplate}
        selectedPrintTemplatePreview={selectedPrintTemplatePreview}
        selectedPrintTemplateStats={selectedPrintTemplateStats}
        selectedPrintTemplateMissingVariables={selectedPrintTemplateMissingVariables}
        printEditorViewMode={printEditorViewMode}
        setPrintEditorViewMode={setPrintEditorViewMode}
        printTemplateTextareaRef={printTemplateTextareaRef}
        downloadingPrintTemplateKey={downloadingPrintTemplateKey}
        isImportingPrintTemplate={isImportingPrintTemplate}
        onClose={handleClosePrintModal}
        onDownloadForEditing={handleDownloadPrintTemplateForEditing}
        onOpenImportTutorial={handleOpenImportPrintTutorial}
      />

      <ImportPrintModal
        importPrintModalState={importPrintModalState}
        selectedImportPrintTemplate={selectedImportPrintTemplate}
        printTemplateDocxInputRef={printTemplateDocxInputRef}
        isImportingPrintTemplate={isImportingPrintTemplate}
        onClose={handleCloseImportPrintTutorial}
        onSelectDocx={() => printTemplateDocxInputRef.current?.click()}
        onFileSelected={(e) => {
          const file = e.target.files?.[0];
          if (file && importPrintModalState.documentKey) {
            handleCloseImportPrintTutorial();
            handleImportPrintTemplateFromDocx(importPrintModalState.documentKey, file);
          }
        }}
      />

      <RestorePrintModal
        restorePrintModalState={restorePrintModalState}
        selectedRestorePrintTemplate={selectedRestorePrintTemplate}
        onClose={handleCloseRestorePrintModal}
        onConfirm={handleConfirmRestorePrintTemplate}
      />
    </div>
  );
}
