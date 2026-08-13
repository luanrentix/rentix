import { type ResetTestDataModule } from "@/services/admin.service";
import {
  type CompanyUser,
  type CompanyUserRole,
  type UserToolPermission as CompanyUserToolPermission,
} from "@/services/company-users.service";
import { type ToolPermission } from "@/services/tool-permissions";

export type UserToolPermission = CompanyUserToolPermission | ToolPermission;
export type { CompanyUser, CompanyUserRole };

export type UserSettings = {
  name: string;
  email: string;
};

export type PasswordSettings = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type NewCompanyUserForm = {
  name: string;
  email: string;
  password: string;
  role: CompanyUserRole;
  permissions: UserToolPermission[];
};

export type EditCompanyUserForm = {
  name: string;
  email: string;
  password: string;
  role: CompanyUserRole;
  isActive: boolean;
  permissions: UserToolPermission[];
};

export type SettingsValidationErrorKey =
  | keyof UserSettings
  | keyof CompanySettings
  | "companyEmail"
  | "userEmail";

export type SettingsValidationErrors = Partial<Record<SettingsValidationErrorKey, string>>;

export type PixKeyType = "cpf" | "cnpj" | "email" | "phone" | "random";

export type CompanySettings = {
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
  contractCity: string;
  contractDefaultNotes: string;
};

export type BrasilApiCnpjResponse = {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  cep?: string;
  uf?: string;
  municipio?: string;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  ddd_telefone_1?: string;
};

export type ViaCepResponse = {
  erro?: boolean;
  cep?: string;
  uf?: string;
  localidade?: string;
  logradouro?: string;
  bairro?: string;
};

export type SettingsTab = "company" | "user" | "print" | "appearance";

export type ThemeMode = "light" | "black" | "graphite";

export type ThemeSettings = {
  mode: ThemeMode;
  accent?: string;
};

export type PrintDocumentKey =
  | "temporaryContract"
  | "standardContract"
  | "assetContract"
  | "paymentBooklet"
  | "accountsPayableReport";

export type PrintModalMode = "view" | "edit";

export type PrintDocumentTemplate = {
  title: string;
  description: string;
  moduleName: string;
  icon: string;
  isEditable: boolean;
  content: string;
  importedFileName?: string;
  importedAt?: string;
};

export type PrintTemplates = Record<PrintDocumentKey, PrintDocumentTemplate>;

export type PrintModalState = {
  isOpen: boolean;
  mode: PrintModalMode;
  documentKey: PrintDocumentKey | null;
};

export type RestorePrintModalState = {
  isOpen: boolean;
  documentKey: PrintDocumentKey | null;
};

export type PrintEditorViewMode = "split" | "editor" | "preview";

export type ImportPrintModalState = {
  isOpen: boolean;
  documentKey: PrintDocumentKey | null;
};

export type ResetModuleKey = ResetTestDataModule;

export type ResetOptions = Record<ResetModuleKey, boolean>;

export type ResetModuleOption = {
  key: ResetModuleKey;
  label: string;
  description: string;
  icon: string;
  storageKeys: string[];
};

export type CompanyAccessProfileKey = "admin" | "manager" | "operator" | "readOnly";

export type CompanyAccessProfile = {
  key: CompanyAccessProfileKey;
  label: string;
  description: string;
  role: CompanyUserRole;
  permissions: UserToolPermission[];
};

export function canResetTestDataRole(role?: string | null) {
  return role === "SYSTEM_OWNER" || role === "DONO_SISTEMA";
}

export function isCompanyAdminRole(role?: string | null) {
  return (
    role === "ADMIN" ||
    role === "OWNER" ||
    role === "SYSTEM_OWNER" ||
    role === "DONO_SISTEMA"
  );
}

export function canEditCompanyUser(companyUser: CompanyUser) {
  return companyUser.role !== "SYSTEM_OWNER" && companyUser.role !== "DONO_SISTEMA";
}

export const pixKeyTypeOptions: { label: string; value: PixKeyType }[] = [
  { label: "CPF", value: "cpf" },
  { label: "CNPJ", value: "cnpj" },
  { label: "E-mail", value: "email" },
  { label: "Telefone", value: "phone" },
  { label: "Chave aleatória", value: "random" },
];

export const resetModuleOptions: ResetModuleOption[] = [
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
    storageKeys: ["contrx_receivable_status_filter"],
  },
  {
    key: "accountsPayable",
    label: "Contas a Pagar",
    description: "Remove contas a pagar e pagamentos registrados localmente.",
    icon: "📤",
    storageKeys: ["contrx_payable_status_filter"],
  },
  {
    key: "schedule",
    label: "Agenda",
    description: "Remove compromissos, eventos e agendamentos locais.",
    icon: "📅",
    storageKeys: [],
  },
  {
    key: "masterPanel",
    label: "Painel master",
    description: "Remove usuarios do painel master no banco, preservando o usuario atual e adm@contrx.com.",
    icon: "🛡️",
    storageKeys: [],
  },
];

export const defaultResetOptions: ResetOptions = {
  properties: false,
  people: false,
  contracts: false,
  accountsReceivable: false,
  accountsPayable: false,
  schedule: false,
  masterPanel: false,
};

export const defaultUserSettings: UserSettings = {
  name: "Luan",
  email: "luan@contrx.com.br",
};

export const defaultPasswordSettings: PasswordSettings = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export const companyUserRoleOptions: { label: string; value: CompanyUserRole }[] = [
  { label: "Administrador", value: "ADMIN" },
  { label: "Gerente", value: "MANAGER" },
  { label: "Usuário", value: "USER" },
  { label: "Dono da empresa", value: "OWNER" },
];

export function getCompanyUserRoleOptions(role: CompanyUserRole) {
  if (role === "OWNER") {
    return companyUserRoleOptions;
  }

  return companyUserRoleOptions.filter((option) => option.value !== "OWNER");
}

export const roleLabels: Record<string, string> = {
  SYSTEM_OWNER: "Dono do sistema",
  OWNER: "Dono da empresa",
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  USER: "Usuário",
};

export const defaultNewCompanyUserForm: NewCompanyUserForm = {
  name: "",
  email: "",
  password: "",
  role: "USER",
  permissions: ["dashboard", "settings"],
};

export const defaultEditCompanyUserForm: EditCompanyUserForm = {
  name: "",
  email: "",
  password: "",
  role: "USER",
  isActive: true,
  permissions: ["dashboard", "settings"],
};

export const defaultCompanySettings: CompanySettings = {
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
  contractCity: "",
  contractDefaultNotes: "",
};

export const maxCompanyLogoSizeInBytes = 2 * 1024 * 1024;

export const defaultThemeSettings: ThemeSettings = {
  mode: "light",
  accent: "orange",
};

export const accentColors = [
  { key: "orange", label: "Laranja", desc: "A identidade clássica e marcante do Contrx.", color: "#f97316" },
  { key: "cobalt", label: "Cobalto", desc: "Azul B2B-SaaS limpo — calmo e corporativo.", color: "#2563eb" },
  { key: "emerald", label: "Esmeralda", desc: "Focado em crescimento, amigável e moderno.", color: "#10b981" },
  { key: "violet", label: "Violeta", desc: "Elegante e moderno — tom roxo vibrante.", color: "#8b5cf6" },
  { key: "amber", label: "Âmbar", desc: "Quente e amigável — tom dourado.", color: "#f59e0b" },
  { key: "rose", label: "Rosa", desc: "Ousado e moderno — tom rosa marcante.", color: "#f43f5e" },
];

export const settingsStorageKeys = {
  user: "contrx_user_settings",
  company: "contrx_company_settings",
  print: "contrx_print_templates",
  theme: "contrx_theme_settings",
};

export const companyAccessProfiles: CompanyAccessProfile[] = [
  {
    key: "admin",
    label: "Administrador",
    description: "Libera gestão completa da empresa, usuários e configurações.",
    role: "ADMIN",
    permissions: [
      "dashboard",
      "properties",
      "people",
      "contracts",
      "financial",
      "accountsReceivable",
      "accountsPayable",
      "schedule",
      "settings",
    ],
  },
  {
    key: "manager",
    label: "Gerente",
    description: "Libera operação completa sem gestão administrativa sensível.",
    role: "MANAGER",
    permissions: [
      "dashboard",
      "properties",
      "people",
      "contracts",
      "financial",
      "accountsReceivable",
      "accountsPayable",
      "schedule",
    ],
  },
  {
    key: "operator",
    label: "Operador",
    description: "Foca em cadastros, contratos e agenda do dia a dia.",
    role: "USER",
    permissions: ["dashboard", "properties", "people", "contracts", "schedule"],
  },
  {
    key: "readOnly",
    label: "Consulta",
    description: "Mantém acesso básico para consulta do painel inicial.",
    role: "USER",
    permissions: ["dashboard"],
  },
];

export function normalizeThemeMode(value: unknown): ThemeMode {
  const normalizedValue = String(value || "").toLowerCase();

  if (normalizedValue === "graphite" || normalizedValue === "grafite") {
    return "graphite";
  }

  return normalizedValue === "black" || normalizedValue === "dark"
    ? "black"
    : "light";
}

export function normalizeThemeSettings(settings?: Partial<ThemeSettings> | null): ThemeSettings {
  const allowedAccents = ["orange", "cobalt", "emerald", "violet", "amber", "rose"];
  const accent = settings?.accent && allowedAccents.includes(settings.accent) 
    ? settings.accent 
    : "orange";
  return {
    ...defaultThemeSettings,
    ...(settings || {}),
    mode: normalizeThemeMode(settings?.mode),
    accent,
  };
}
