"use client";

import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { resetTestData, type ResetTestDataModule } from "@/services/admin.service";
import { changePasswordRequest } from "@/services/auth";
import {
  createCompanyUser,
  getCompanyUsers,
  updateCompanyUser,
  type CompanyUser,
  type CompanyUserRole,
  type UserToolPermission,
} from "@/services/company-users.service";
import {
  getCompanyStorageItem,
  removeCompanyStorageItem,
  setCompanyStorageItem,
} from "@/services/company-storage";
import { getAppSettings, saveAppSettings } from "@/services/settings.service";
import { setCachedAppSettings } from "@/services/settings-cache";
import { toolPermissionOptions } from "@/services/tool-permissions";

type UserSettings = {
  name: string;
  email: string;
};

type PasswordSettings = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type NewCompanyUserForm = {
  name: string;
  email: string;
  password: string;
  role: CompanyUserRole;
  permissions: UserToolPermission[];
};

type EditCompanyUserForm = {
  name: string;
  email: string;
  password: string;
  role: CompanyUserRole;
  isActive: boolean;
  permissions: UserToolPermission[];
};

type SettingsValidationErrorKey =
  | keyof UserSettings
  | keyof CompanySettings
  | "companyEmail"
  | "userEmail";
type SettingsValidationErrors = Partial<Record<SettingsValidationErrorKey, string>>;

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
  contractCity: string;
  contractDefaultNotes: string;
};

type BrasilApiCnpjResponse = {
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

type ViaCepResponse = {
  erro?: boolean;
  cep?: string;
  uf?: string;
  localidade?: string;
  logradouro?: string;
  bairro?: string;
};

type SettingsTab = "company" | "user" | "print" | "appearance";

type ThemeMode = "light" | "black" | "graphite";

type ThemeSettings = {
  mode: ThemeMode;
};

type PrintDocumentKey =
  | "temporaryContract"
  | "standardContract"
  | "assetContract"
  | "paymentBooklet"
  | "accountsPayableReport";

type PrintModalMode = "view" | "edit";
type PrintEditorViewMode = "split" | "editor" | "preview";

type PrintDocumentTemplate = {
  title: string;
  description: string;
  moduleName: string;
  icon: string;
  isEditable: boolean;
  content: string;
};

type PrintTemplates = Record<PrintDocumentKey, PrintDocumentTemplate>;

type PrintModalState = {
  isOpen: boolean;
  mode: PrintModalMode;
  documentKey: PrintDocumentKey | null;
};

type RestorePrintModalState = {
  isOpen: boolean;
  documentKey: PrintDocumentKey | null;
};

type ResetModuleKey = ResetTestDataModule;

type ResetOptions = Record<ResetModuleKey, boolean>;

type ResetModuleOption = {
  key: ResetModuleKey;
  label: string;
  description: string;
  icon: string;
  storageKeys: string[];
};

type CompanyAccessProfileKey = "admin" | "manager" | "operator" | "readOnly";

type CompanyAccessProfile = {
  key: CompanyAccessProfileKey;
  label: string;
  description: string;
  role: CompanyUserRole;
  permissions: UserToolPermission[];
};

function canResetTestDataRole(role?: string | null) {
  return role === "SYSTEM_OWNER" || role === "DONO_SISTEMA";
}

function isCompanyAdminRole(role?: string | null) {
  return (
    role === "ADMIN" ||
    role === "OWNER" ||
    role === "SYSTEM_OWNER" ||
    role === "DONO_SISTEMA"
  );
}

function canEditCompanyUser(companyUser: CompanyUser) {
  return companyUser.role !== "SYSTEM_OWNER" && companyUser.role !== "DONO_SISTEMA";
}

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
  {
    key: "masterPanel",
    label: "Painel master",
    description: "Remove usuarios do painel master no banco, preservando o usuario atual e adm@contrx.com.",
    icon: "🛡️",
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
  masterPanel: false,
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

const companyUserRoleOptions: { label: string; value: CompanyUserRole }[] = [
  { label: "Administrador", value: "ADMIN" },
  { label: "Gerente", value: "MANAGER" },
  { label: "Usuário", value: "USER" },
  { label: "Dono da empresa", value: "OWNER" },
];

const roleLabels: Record<string, string> = {
  SYSTEM_OWNER: "Dono do sistema",
  OWNER: "Dono da empresa",
  ADMIN: "Administrador",
  MANAGER: "Gerente",
  USER: "Usuário",
};

const defaultNewCompanyUserForm: NewCompanyUserForm = {
  name: "",
  email: "",
  password: "",
  role: "USER",
  permissions: ["dashboard", "settings"],
};

const defaultEditCompanyUserForm: EditCompanyUserForm = {
  name: "",
  email: "",
  password: "",
  role: "USER",
  isActive: true,
  permissions: ["dashboard", "settings"],
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
  contractCity: "",
  contractDefaultNotes: "",
};

const maxCompanyLogoSizeInBytes = 2 * 1024 * 1024;

const defaultThemeSettings: ThemeSettings = {
  mode: "light",
};

const settingsStorageKeys = {
  user: "contrx_user_settings",
  company: "contrx_company_settings",
  print: "contrx_print_templates",
  theme: "contrx_theme_settings",
};

const companyAccessProfiles: CompanyAccessProfile[] = [
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

const legacyTemporaryContractTemplateContent = 'CONTRATO TEMPORÁRIO\n\nLOCADOR: {companyName}\nLOCATÁRIO: {personName}\nBEM/ATIVO: {propertyName}\nPERÍODO: {startDate} até {endDate}\nHORÁRIO: Entrada {entryTime} / Saída {exitTime}\n\nCLÁUSULAS E CONDIÇÕES:\n1. O presente contrato tem finalidade de locação temporária.\n2. O locatário declara estar ciente das regras de uso do bem/ativo.\n3. As informações financeiras e condições acordadas deverão constar no documento final.\n\n{contractDefaultNotes}\n\n{contractCity}, {currentDate}.\n\n__________________________________\nLOCADOR\n\n__________________________________\nLOCATÁRIO';

const defaultTemporaryContractTemplateContent = `INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO IMOBILIÁRIA TEMPORÁRIA

I - LOCADOR:
{landlordName}, pessoa jurídica de direito privado, inscrita no CPF/CNPJ nº {landlordDocument}, com endereço em {landlordAddress}, doravante denominada LOCADOR.
E-mail: {companyEmail}
Telefone: {companyPhone}

II - LOCATÁRIO:
{tenantName}, brasileiro(a), estado civil não informado, profissão não informada, inscrito(a) no CPF/CNPJ nº {tenantDocument}, Carteira de Identidade nº __________, residente e domiciliado(a) em {tenantAddress}, doravante denominado(a) LOCATÁRIO.
E-mail: {tenantEmail}

III - OBJETO DA LOCAÇÃO:
{propertyName}, localizado em {propertyAddress}.

IV - PRAZO DE VIGÊNCIA:
O prazo de locação é de {contractDays} dia(s), com entrada (check-in) em {startDate} às {entryTime} e saída (check-out) em {endDate} às {exitTime}, sem prorrogação automática.

V - ATIVIDADE OBRIGATÓRIA:
Durante o período de locação, o locatário compromete-se a utilizar o imóvel exclusivamente para fins recreativos e de lazer, respeitando todas as normas legais e regulamentações aplicáveis. O locatário deverá zelar pela conservação do imóvel e de suas instalações, garantindo sua limpeza e manutenção adequadas. Qualquer dano causado durante o período de locação será de responsabilidade do locatário, que se compromete a ressarcir integralmente o locador pelos prejuízos decorrentes.

VI - ALUGUEL PELO PERÍODO:
Igual a {amount}.

VII - PAGAMENTO DO ALUGUEL:
Pela execução do objeto deste contrato, o LOCATÁRIO pagará ao LOCADOR o valor total de {amount}, conforme forma de pagamento acordada entre as partes.
A liberação das chaves está condicionada à quitação integral de todas as parcelas.
Parágrafo Segundo: O pagamento será efetuado por meio de [PIX/DINHEIRO/TRANSFERÊNCIA], conforme dados a serem informados pelo LOCADOR.

VIII - CONDIÇÕES ESPECIAIS:
Não há.

Pelo presente instrumento, as partes acima identificadas e qualificadas têm entre si justas e acertadas o presente INSTRUMENTO PARTICULAR DE CONTRATO DE LOCAÇÃO, que se regerá pelas cláusulas e condições abaixo pactuadas.

Cláusula Primeira - Da Vistoria e Conservação
1.1. O imóvel é entregue em perfeitas condições de higiene e conservação.
1.2. O LOCATÁRIO tem o prazo de 2 (duas) horas após a entrada para conferir o local e reportar qualquer dano preexistente por escrito, com fotos ou vídeos.
1.3. Caso não haja manifestação no prazo acima, entende-se que o imóvel e seus utensílios foram recebidos em perfeito estado.
1.4. O LOCATÁRIO deverá restituir o imóvel nas mesmas condições em que o recebeu, sob pena de arcar com os custos de reparo ou reposição de itens danificados.

Cláusula Segunda - Do Objeto e Destinação
2.1. O objeto deste contrato é a locação temporária do imóvel identificado neste instrumento.
2.2. O imóvel destina-se exclusivamente para fins recreativos e de lazer, conforme detalhado no preâmbulo.
2.3. É proibido ao LOCATÁRIO sublocar, ceder, emprestar ou transferir a locação a terceiros, total ou parcialmente, sem autorização prévia e por escrito do LOCADOR.
2.4. Após o recebimento das chaves, o LOCATÁRIO assume a posse temporária e a responsabilidade total pela guarda e conservação do imóvel e seus bens.

Cláusula Terceira - Da Utilização e Finalidade
3.1. O imóvel deve ser utilizado exclusivamente para fins recreativos e de lazer.
3.2. É proibida a realização de eventos com venda de ingressos, atividades comerciais ou festas abertas ao público sem autorização prévia por escrito do LOCADOR.

Cláusula Quarta - Do Prazo e da Desocupação
4.1. A locação é firmada por curto prazo, com início em {startDate} às {entryTime} e término em {endDate} às {exitTime}.
4.2. Findo o prazo estipulado, o contrato se encerra automaticamente, devendo o LOCATÁRIO desocupar o imóvel e entregar as chaves, independente de aviso prévio.
4.3. Caso o LOCATÁRIO deseje prorrogar a estadia, deverá consultar a disponibilidade e valores com o LOCADOR com antecedência, sendo necessária a formalização de novo ajuste por escrito.
4.4. O atraso na desocupação do imóvel após o horário de término sujeitará o LOCATÁRIO à multa por hora excedente, sem prejuízo das demais penalidades.

Cláusula Quinta - Do Valor e Pacote Escolhido
5.1. O valor da locação temporária é de {amount}, referente ao período contratado.

Cláusula Sexta - Das Obrigações e Regras de Convivência
6.1. O LOCADOR deverá entregar o imóvel em bom estado de conservação e limpeza.
6.2. O LOCATÁRIO deverá utilizar o imóvel apenas para os fins contratados, responsabilizando-se por danos ocorridos durante a locação, exceto desgaste natural de uso.
6.3. O LOCATÁRIO deverá respeitar os limites de hóspedes e convidados definidos previamente pelas partes.
6.4. Animais de estimação somente serão permitidos mediante autorização do LOCADOR, respondendo o LOCATÁRIO por higiene e eventuais danos.
6.5. O LOCATÁRIO deve respeitar o sossego dos vizinhos, sendo proibidos ruídos excessivos, especialmente em horário noturno.

Cláusula Sétima - Das Comunicações e Notificações
7.1. As partes concordam que comunicações urgentes poderão ser realizadas por WhatsApp ou e-mail, utilizando os contatos fornecidos neste contrato.
7.2. Para notificações formais, as partes elegem os endereços declarados neste instrumento.

Cláusula Oitava - Da Ausência de Garantia e Condição de Acesso
8.1. Esta locação é celebrada sem as modalidades de garantia previstas na Lei 8.245/91.
8.2. O acesso ao imóvel e a entrega das chaves só ocorrerão mediante a quitação integral do valor total da locação e eventuais taxas acordadas.

Cláusula Nona - Do Inadimplemento, Cancelamento e Multas
9.1. O descumprimento de qualquer cláusula deste contrato sujeitará o infrator à multa de 20% sobre o valor total do contrato, sem prejuízo da responsabilidade por eventuais danos materiais comprovados.
9.2. O atraso no pagamento sujeitará o LOCATÁRIO à multa moratória, juros e eventual cancelamento da reserva.
9.3. Em caso de desistência por iniciativa do LOCATÁRIO após a assinatura, não haverá devolução de valor já pago, salvo acordo escrito entre as partes.

Cláusula Décima - Da Rescisão
10.1. O descumprimento de cláusula contratual autoriza a rescisão imediata do instrumento, sem prejuízo da cobrança de perdas e danos.
10.2. Caso o LOCATÁRIO encerre a locação antes do horário previsto, não haverá reembolso proporcional do valor contratado.

Cláusula Décima Primeira - Da Assinatura Eletrônica e Comunicações Digitais
11.1. As partes reconhecem como válida a assinatura deste contrato em formato eletrônico, conforme legislação vigente.
11.2. Os e-mails e números de WhatsApp informados são considerados canais oficiais de comunicação.

Cláusula Décima Segunda - Foro
12.1. As partes elegem o foro da comarca do local do imóvel para dirimir dúvidas ou litígios oriundos deste contrato, renunciando a qualquer outro, por mais privilegiado que seja.

{contractCity}, {currentDate}.

LOCADOR:
__________________________________
{landlordName}

LOCATÁRIO:
__________________________________
{tenantName}

TESTEMUNHA:
__________________________________
Nome: ______________________________
CPF: ______________________________
Email: ______________________________`;

const defaultStandardContractTemplateContent = `CONTRATO DE LOCAÇÃO RESIDENCIAL

I - LOCADOR:
{landlordName}, inscrito(a) no CPF/CNPJ nº {landlordDocument}, com endereço em {landlordAddress}, telefone {companyPhone}, e-mail {companyEmail}, a seguir denominado(a) LOCADOR.

II - LOCATÁRIO:
{tenantName}, inscrito(a) no CPF/CNPJ nº {tenantDocument}, residente e domiciliado(a) em {tenantAddress}, telefone {tenantPhone}, e-mail {tenantEmail}, a seguir denominado(a) LOCATÁRIO.

CLÁUSULA PRIMEIRA - DO IMÓVEL E DO PRAZO
O LOCADOR dá em locação ao LOCATÁRIO o imóvel denominado {propertyName}, localizado em {propertyAddress}, pelo prazo de {contractMonths} mês(es), com início em {startDate} e término em {endDate}. Ao receber o imóvel, o LOCATÁRIO declara tê-lo vistoriado e aceito nas condições em que se encontra, obrigando-se a devolvê-lo livre, desocupado e em perfeito estado de conservação, com contas de água, energia e demais encargos quitados.

Parágrafo Primeiro - Antes do vencimento do prazo ajustado, o LOCADOR não poderá retomar o imóvel, salvo por infração contratual. Caso o LOCATÁRIO devolva o imóvel antes do prazo, ficará sujeito à multa contratual prevista neste instrumento.

Parágrafo Segundo - Na devolução das chaves, o LOCATÁRIO deverá apresentar comprovantes de quitação das contas de água, energia e demais despesas relacionadas ao imóvel.

CLÁUSULA SEGUNDA - DO ALUGUEL E FORMA DE PAGAMENTO
O aluguel mensal será de {amount}, com vencimento conforme acordado entre as partes. O pagamento deverá ser realizado por meio de depósito, transferência, dinheiro ou Pix, utilizando a chave {pixKey}, salvo outra forma expressamente acordada.

Parágrafo Primeiro - O atraso no pagamento autoriza a cobrança de multa, juros, correção monetária e demais despesas necessárias à cobrança, sem prejuízo da rescisão contratual.

Parágrafo Segundo - Decorridos 30 (trinta) dias do vencimento sem pagamento, o débito poderá ser encaminhado para cobrança administrativa, extrajudicial ou judicial.

CLÁUSULA TERCEIRA - DO REAJUSTE
O valor do aluguel poderá ser reajustado ao final do prazo contratual ou em eventual renovação, mediante acordo entre as partes e observando a legislação aplicável.

CLÁUSULA QUARTA - DA CONSERVAÇÃO E VISTORIA
O LOCATÁRIO declara haver visitado e examinado o imóvel locado, obrigando-se a zelar por sua conservação, limpeza, instalações, pintura, telhado, portas, janelas, vidros, fechaduras, torneiras, instalações elétricas, hidráulicas e demais acessórios, devolvendo-o ao final da locação no mesmo estado em que recebeu, salvo desgaste natural de uso.

Parágrafo Primeiro - Fica assegurado ao LOCADOR o direito de vistoriar o imóvel sempre que necessário, mediante aviso prévio ao LOCATÁRIO.

Parágrafo Segundo - Qualquer alteração, reforma ou benfeitoria no imóvel dependerá de autorização prévia e por escrito do LOCADOR.

CLÁUSULA QUINTA - DOS ENCARGOS
Além do aluguel, competem ao LOCATÁRIO as despesas ordinárias de consumo de água, energia elétrica, esgoto, saneamento, taxa de lixo, condomínio quando houver e demais encargos relacionados ao uso do imóvel durante a vigência do contrato.

Parágrafo Único - Caso o LOCADOR efetue o pagamento de qualquer despesa de responsabilidade do LOCATÁRIO, este deverá reembolsar integralmente o valor, acrescido de multa, juros e correção quando aplicáveis.

CLÁUSULA SEXTA - DA DESTINAÇÃO DO IMÓVEL
O imóvel objeto deste contrato destina-se exclusivamente para fim residencial, ficando o LOCATÁRIO proibido de alterar sua destinação, ceder, transferir, sublocar ou emprestar o imóvel, no todo ou em parte, sem autorização expressa do LOCADOR.

CLÁUSULA SÉTIMA - DAS PROIBIÇÕES E RESPONSABILIDADES
O LOCATÁRIO obriga-se a não depositar no imóvel materiais inflamáveis, explosivos, corrosivos ou quaisquer objetos que possam comprometer a segurança do imóvel, dos vizinhos ou de terceiros.

CLÁUSULA OITAVA - DA INADIMPLÊNCIA E RESCISÃO
O descumprimento de qualquer cláusula deste contrato poderá acarretar a rescisão da locação, cobrança dos valores devidos, perdas e danos, além das medidas judiciais cabíveis.

CLÁUSULA NONA - DA MULTA CONTRATUAL
Fica estipulada multa equivalente a 03 (três) meses de aluguel vigente na data da infração, na qual incorrerá a parte que infringir quaisquer cláusulas deste contrato, facultando à parte inocente considerar rescindida a locação.

CLÁUSULA DÉCIMA - DO FORO
As partes elegem o foro da comarca de {contractCity} para dirimir quaisquer dúvidas ou questões oriundas deste contrato, com renúncia de qualquer outro, por mais privilegiado que seja.

{contractDefaultNotes}

E assim, por estarem justas e convencionadas, as partes assinam o presente instrumento particular de CONTRATO DE LOCAÇÃO RESIDENCIAL, em 2 (duas) vias de igual teor, juntamente com as testemunhas abaixo.

{contractCity}, {currentDate}.

LOCADOR:
__________________________________
{landlordName}

LOCATÁRIO:
__________________________________
{tenantName}

TESTEMUNHA:
__________________________________
Nome: ______________________________
CPF: ______________________________

TESTEMUNHA:
__________________________________
Nome: ______________________________
CPF: ______________________________`;

const defaultAssetContractTemplateContent = `CONTRATO DE LOCAÇÃO DE BEM/ATIVO

I - LOCADOR:
{landlordName}, inscrito(a) no CPF/CNPJ nº {landlordDocument}, com endereço em {landlordAddress}, telefone {companyPhone}, e-mail {companyEmail}, a seguir denominado(a) LOCADOR.

II - LOCATÁRIO:
{tenantName}, inscrito(a) no CPF/CNPJ nº {tenantDocument}, residente e domiciliado(a) em {tenantAddress}, telefone {tenantPhone}, e-mail {tenantEmail}, a seguir denominado(a) LOCATÁRIO.

CLÁUSULA PRIMEIRA - DO BEM/ATIVO E DO PRAZO
O LOCADOR dá em locação ao LOCATÁRIO o bem/ativo denominado {propertyName}, classificado como {assetCategory}, pelo prazo de {contractMonths} mês(es), com início em {startDate} e término em {endDate}.

Parágrafo Primeiro - O LOCATÁRIO declara ter recebido o bem/ativo em condições adequadas de uso, comprometendo-se a utilizá-lo exclusivamente para a finalidade contratada e a devolvê-lo ao final da locação no mesmo estado de conservação, salvo desgaste natural de uso.

Parágrafo Segundo - Quando houver local de entrega, guarda ou operação informado, considera-se como referência: {propertyAddress}.

CLÁUSULA SEGUNDA - DO VALOR E FORMA DE PAGAMENTO
O valor da locação será de {amount}, com vencimento conforme acordado entre as partes. O pagamento poderá ser realizado por depósito, transferência, dinheiro ou Pix, utilizando a chave {pixKey}, salvo outra forma expressamente acordada.

CLÁUSULA TERCEIRA - DA GUARDA, USO E CONSERVAÇÃO
O LOCATÁRIO será responsável pela guarda, conservação, uso adequado e segurança do bem/ativo durante todo o período de locação, respondendo por perdas, danos, mau uso, extravio, furto, roubo ou avarias que não decorram de desgaste natural.

CLÁUSULA QUARTA - DA MANUTENÇÃO E DEVOLUÇÃO
O LOCATÁRIO deverá comunicar imediatamente ao LOCADOR qualquer defeito, dano, acidente, perda de desempenho ou necessidade de manutenção. A devolução deverá ocorrer na data final contratada, acompanhada de acessórios, documentos, peças, componentes ou itens entregues junto com o bem/ativo, quando houver.

CLÁUSULA QUINTA - DAS PROIBIÇÕES
É vedado ao LOCATÁRIO ceder, transferir, sublocar, emprestar, vender, modificar, desmontar ou alterar o bem/ativo sem autorização prévia e por escrito do LOCADOR.

CLÁUSULA SEXTA - DA INADIMPLÊNCIA E RESCISÃO
O descumprimento de qualquer obrigação contratual poderá acarretar rescisão, cobrança dos valores devidos, multa, perdas e danos, além das medidas administrativas, extrajudiciais ou judiciais cabíveis.

CLÁUSULA SÉTIMA - DA MULTA CONTRATUAL
Fica estipulada multa equivalente a 03 (três) períodos de locação vigentes na data da infração, facultando à parte inocente considerar rescindido o contrato e cobrar eventuais prejuízos adicionais.

CLÁUSULA OITAVA - DO FORO
As partes elegem o foro da comarca de {contractCity} para dirimir dúvidas ou questões oriundas deste contrato, com renúncia de qualquer outro, por mais privilegiado que seja.

{contractDefaultNotes}

E assim, por estarem justas e contratadas, as partes assinam o presente instrumento particular de CONTRATO DE LOCAÇÃO DE BEM/ATIVO, em 2 (duas) vias de igual teor.

{contractCity}, {currentDate}.

LOCADOR:
__________________________________
{landlordName}

LOCATÁRIO:
__________________________________
{tenantName}

TESTEMUNHA:
__________________________________
Nome: ______________________________
CPF: ______________________________

TESTEMUNHA:
__________________________________
Nome: ______________________________
CPF: ______________________________`;

const legacyPaymentBookletTemplateContent = `CARNÊ DE PAGAMENTO

EMPRESA: {companyName}
CLIENTE: {personName}
CONTRATO: {contractNumber}
PARCELA: {installmentNumber}
VENCIMENTO: {dueDate}
VALOR: {amount}
PIX: {pixKey}

INSTRUÇÕES:
1. Efetue o pagamento até a data de vencimento.
2. Após o vencimento, poderão ser aplicados multa e juros conforme contrato.
3. Guarde este comprovante para controle financeiro.`;

const defaultPaymentBookletTemplateContent = `1. Efetue o pagamento até a data de vencimento.
2. Após o vencimento, poderão ser aplicados multa e juros conforme contrato.
3. Guarde este comprovante para controle financeiro.`;

const defaultAccountsPayableReportTemplateContent = `RELATÓRIO DE CONTAS A PAGAR

EMPRESA: {companyName}
CATEGORIA: {reportCategory}
STATUS: {reportStatus}
VENCIMENTO: {reportDueFilter}
PERÍODO: {reportStartDate} até {reportEndDate}

RESUMO:
Quantidade: {reportCount}
Total geral: {reportTotal}
Total pago: {reportPaidTotal}
Total pendente: {reportPendingTotal}
Total vencido: {reportOverdueTotal}

GERADO EM: {currentDate}`;

const defaultPrintTemplates: PrintTemplates = {
  temporaryContract: {
    title: "Contrato temporário",
    description: "Modelo usado na geração do contrato de locação temporária em PDF.",
    moduleName: "Contratos",
    icon: "📄",
    isEditable: true,
    content: defaultTemporaryContractTemplateContent,
  },
  standardContract: {
    title: "Contrato padrão",
    description: "Modelo usado na geração do contrato residencial padrão em PDF.",
    moduleName: "Contratos",
    icon: "🏠",
    isEditable: true,
    content: defaultStandardContractTemplateContent,
  },
  assetContract: {
    title: "Contrato de bem/ativo",
    description: "Modelo usado quando o contrato é de equipamento, máquina, veículo, ferramenta ou outro bem não imobiliário.",
    moduleName: "Contratos",
    icon: "⚙️",
    isEditable: true,
    content: defaultAssetContractTemplateContent,
  },
  paymentBooklet: {
    title: "Carnê",
    description: "Modelo usado na geração de carnês e parcelas de cobrança em PDF.",
    moduleName: "Contas a receber",
    icon: "💳",
    isEditable: true,
    content: legacyPaymentBookletTemplateContent,
  },
  accountsPayableReport: {
    title: "Relatório contas a pagar",
    description: "Cabeçalho e resumo usados no relatório impresso de contas a pagar.",
    moduleName: "Contas a pagar",
    icon: "CP",
    isEditable: true,
    content: defaultAccountsPayableReportTemplateContent,
  },
};

const defaultPrintModalState: PrintModalState = {
  isOpen: false,
  mode: "view",
  documentKey: null,
};

const defaultRestorePrintModalState: RestorePrintModalState = {
  isOpen: false,
  documentKey: null,
};

const printTemplateVariableGroups = [
  {
    title: "Empresa / Locador",
    variables: [
      { label: "Nome do locador", value: "{landlordName}" },
      { label: "Documento do locador", value: "{landlordDocument}" },
      { label: "Endereço do locador", value: "{landlordAddress}" },
      { label: "E-mail da empresa", value: "{companyEmail}" },
      { label: "Telefone da empresa", value: "{companyPhone}" },
      { label: "Chave Pix", value: "{pixKey}" },
    ],
  },
  {
    title: "Locatário / Pessoa",
    variables: [
      { label: "Nome do locatário", value: "{tenantName}" },
      { label: "Nome da pessoa", value: "{personName}" },
      { label: "Documento do locatário", value: "{tenantDocument}" },
      { label: "Endereço do locatário", value: "{tenantAddress}" },
      { label: "Telefone do locatário", value: "{tenantPhone}" },
      { label: "E-mail do locatário", value: "{tenantEmail}" },
    ],
  },
  {
    title: "Bem/Ativo / Contrato",
    variables: [
      { label: "Nome do bem/ativo", value: "{propertyName}" },
      { label: "Categoria do bem/ativo", value: "{assetCategory}" },
      { label: "Endereço do bem/ativo", value: "{propertyAddress}" },
      { label: "Data inicial", value: "{startDate}" },
      { label: "Data final", value: "{endDate}" },
      { label: "Dias do contrato", value: "{contractDays}" },
      { label: "Meses do contrato", value: "{contractMonths}" },
      { label: "Dia do vencimento", value: "{dueDay}" },
      { label: "Valor", value: "{amount}" },
      { label: "Multa", value: "{penaltyAmount}" },
    ],
  },
  {
    title: "Impressão / Assinatura",
    variables: [
      { label: "Cidade de assinatura", value: "{contractCity}" },
      { label: "Data atual", value: "{currentDate}" },
      { label: "Observações padrão", value: "{contractDefaultNotes}" },
      { label: "Horário entrada", value: "{entryTime}" },
      { label: "Horário saída", value: "{exitTime}" },
      { label: "Número do contrato", value: "{contractNumber}" },
      { label: "Parcela", value: "{installmentNumber}" },
      { label: "Vencimento", value: "{dueDate}" },
    ],
  },
  {
    title: "Relatórios financeiros",
    variables: [
      { label: "Categoria", value: "{reportCategory}" },
      { label: "Status", value: "{reportStatus}" },
      { label: "Filtro vencimento", value: "{reportDueFilter}" },
      { label: "Data inicial", value: "{reportStartDate}" },
      { label: "Data final", value: "{reportEndDate}" },
      { label: "Quantidade", value: "{reportCount}" },
      { label: "Total geral", value: "{reportTotal}" },
      { label: "Total pago", value: "{reportPaidTotal}" },
      { label: "Total pendente", value: "{reportPendingTotal}" },
      { label: "Total vencido", value: "{reportOverdueTotal}" },
    ],
  },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function extractPaymentBookletInstructions(content: string) {
  const cleanContent = String(content || "").trim();

  if (!cleanContent) {
    return defaultPaymentBookletTemplateContent;
  }

  if (!cleanContent.includes("INSTRUÇÕES:")) {
    return cleanContent;
  }

  const instructionsSection = cleanContent.split("INSTRUÇÕES:")[1] || "";
  const instructionsOnly = instructionsSection
    .split("GERADO EM:")[0]
    .trim();

  return instructionsOnly || defaultPaymentBookletTemplateContent;
}

function normalizeStoredPrintTemplates(storedTemplates: Partial<PrintTemplates>): PrintTemplates {
  const temporaryContract = {
    ...defaultPrintTemplates.temporaryContract,
    ...(storedTemplates.temporaryContract || {}),
  };
  const standardContract = {
    ...defaultPrintTemplates.standardContract,
    ...(storedTemplates.standardContract || {}),
  };
  const assetContract = {
    ...defaultPrintTemplates.assetContract,
    ...(storedTemplates.assetContract || {}),
  };
  const paymentBooklet = {
    ...defaultPrintTemplates.paymentBooklet,
    ...(storedTemplates.paymentBooklet || {}),
  };
  const accountsPayableReport = {
    ...defaultPrintTemplates.accountsPayableReport,
    ...(storedTemplates.accountsPayableReport || {}),
  };

  if (temporaryContract.content.trim() === legacyTemporaryContractTemplateContent.trim()) {
    temporaryContract.content = defaultTemporaryContractTemplateContent;
  }

  if (!standardContract.content.trim()) {
    standardContract.content = defaultStandardContractTemplateContent;
  }

  if (!assetContract.content.trim()) {
    assetContract.content = defaultAssetContractTemplateContent;
  }

  if (!paymentBooklet.content.trim()) {
    paymentBooklet.content = legacyPaymentBookletTemplateContent;
  }

  return {
    temporaryContract,
    standardContract,
    assetContract,
    paymentBooklet,
    accountsPayableReport,
  };
}

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

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isValidCpf(value: string) {
  const digits = onlyDigits(value);

  if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) {
    return false;
  }

  const calculateDigit = (base: string, factor: number) => {
    const total = base
      .split("")
      .reduce((sum, digit) => sum + Number(digit) * factor--, 0);
    const remainder = (total * 10) % 11;

    return remainder === 10 ? 0 : remainder;
  };

  const firstDigit = calculateDigit(digits.slice(0, 9), 10);
  const secondDigit = calculateDigit(digits.slice(0, 10), 11);

  return digits.endsWith(`${firstDigit}${secondDigit}`);
}

function isValidCnpj(value: string) {
  const digits = onlyDigits(value);

  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) {
    return false;
  }

  const calculateDigit = (base: string, factors: number[]) => {
    const total = base
      .split("")
      .reduce((sum, digit, index) => sum + Number(digit) * factors[index], 0);
    const remainder = total % 11;

    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calculateDigit(
    digits.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  const secondDigit = calculateDigit(
    digits.slice(0, 13),
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );

  return digits.endsWith(`${firstDigit}${secondDigit}`);
}

function isValidEmail(value: string) {
  if (!value.trim()) {
    return true;
  }

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

  if (!cleanValue) {
    return true;
  }

  if (pixKeyType === "cpf") {
    return onlyDigits(cleanValue).length === 11;
  }

  if (pixKeyType === "cnpj") {
    return onlyDigits(cleanValue).length === 14;
  }

  if (pixKeyType === "phone") {
    return onlyDigits(cleanValue).length >= 10;
  }

  if (pixKeyType === "email") {
    return isValidEmail(cleanValue);
  }

  return cleanValue.length >= 8;
}

async function fetchCompanyDataByCnpj(cleanCnpj: string) {
  const response = await fetch(
    `https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`,
  );

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

function getChangedSections(
  userSettings: UserSettings,
  initialUserSettings: UserSettings,
  companySettings: CompanySettings,
  initialCompanySettings: CompanySettings,
  printTemplates: PrintTemplates,
  initialPrintTemplates: PrintTemplates,
  themeSettings: ThemeSettings,
  initialThemeSettings: ThemeSettings,
  passwordSettings: PasswordSettings
) {
  const changedSections: string[] = [];
  const hasUserChanges = JSON.stringify(userSettings) !== JSON.stringify(initialUserSettings);
  const hasCompanyChanges = JSON.stringify(companySettings) !== JSON.stringify(initialCompanySettings);
  const hasPrintChanges = JSON.stringify(printTemplates) !== JSON.stringify(initialPrintTemplates);
  const hasThemeChanges = JSON.stringify(themeSettings) !== JSON.stringify(initialThemeSettings);
  const hasPasswordChanges = Boolean(passwordSettings.newPassword);

  if (hasCompanyChanges) {
    changedSections.push("Cadastro da empresa, Pix, endereço ou dados de contrato");
  }

  if (hasUserChanges) {
    changedSections.push("Dados do usuário");
  }

  if (hasPrintChanges) {
    changedSections.push("Modelos de impressos");
  }

  if (hasThemeChanges) {
    changedSections.push("Tema e aparência do sistema");
  }

  if (hasPasswordChanges) {
    changedSections.push("Senha de acesso");
  }

  if (changedSections.length === 0) {
    changedSections.push("Nenhuma alteração detectada, mas os dados atuais serão mantidos");
  }

  return changedSections;
}

function getValidationErrorMessages(validationErrors: SettingsValidationErrors) {
  return Array.from(
    new Set(
      Object.values(validationErrors).filter(
        (errorMessage): errorMessage is string => Boolean(errorMessage)
      )
    )
  );
}

function getSettingsErrorTab(validationErrors: SettingsValidationErrors): SettingsTab {
  return validationErrors.name || validationErrors.userEmail ? "user" : "company";
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
    if (/CARN/i.test(previewContent)) {
      return previewContent;
    }

    return `CARNÊ DE PAGAMENTO\n\nEMPRESA: ${previewValues.companyName}\nCLIENTE: ${previewValues.personName}\nCONTRATO: ${previewValues.contractNumber}\nPARCELA: ${previewValues.installmentNumber}\nVENCIMENTO: ${previewValues.dueDate}\nVALOR: ${previewValues.amount}\nPIX: ${previewValues.pixKey}\n\nINSTRUÇÕES:\n${previewContent}`;
  }

  return previewContent;
}

function getPrintTemplateStats(content: string) {
  const cleanContent = String(content || "");
  const words = cleanContent.trim().split(/\s+/).filter(Boolean).length;
  const lines = cleanContent.split(/\r\n|\r|\n/).length;
  const variables = Array.from(new Set(cleanContent.match(/\{[a-zA-Z0-9]+\}/g) || []));

  return {
    characters: cleanContent.length,
    words,
    lines,
    variables,
  };
}

const contrxThemeStyle = `
  [data-contrx-theme="black"] {
    background: #020617 !important;
    color: #f8fafc !important;
  }

  [data-contrx-theme="black"] * {
    scrollbar-color: #475569 #020617;
  }

  [data-contrx-theme="black"] .bg-white,
  [data-contrx-theme="black"] .bg-slate-50,
  [data-contrx-theme="black"] .bg-slate-100,
  [data-contrx-theme="black"] .bg-white\\/90 {
    background-color: #0f172a !important;
  }

  [data-contrx-theme="black"] .bg-gradient-to-r {
    background-image: none !important;
    background-color: #0f172a !important;
  }

  [data-contrx-theme="black"] .from-orange-50,
  [data-contrx-theme="black"] .via-white,
  [data-contrx-theme="black"] .to-white,
  [data-contrx-theme="black"] .from-slate-50 {
    background-image: none !important;
  }

  [data-contrx-theme="black"] .bg-orange-50,
  [data-contrx-theme="black"] .bg-orange-50\\/40,
  [data-contrx-theme="black"] .bg-orange-50\\/50,
  [data-contrx-theme="black"] .bg-orange-50\\/60,
  [data-contrx-theme="black"] .bg-orange-100 {
    background-color: rgba(249, 115, 22, 0.16) !important;
  }

  [data-contrx-theme="black"] .bg-amber-50,
  [data-contrx-theme="black"] .bg-amber-100 {
    background-color: rgba(245, 158, 11, 0.16) !important;
  }

  [data-contrx-theme="black"] .bg-red-50,
  [data-contrx-theme="black"] .bg-red-100 {
    background-color: rgba(239, 68, 68, 0.16) !important;
  }

  [data-contrx-theme="black"] .bg-emerald-50,
  [data-contrx-theme="black"] .bg-emerald-100 {
    background-color: rgba(16, 185, 129, 0.16) !important;
  }

  [data-contrx-theme="black"] .bg-slate-900,
  [data-contrx-theme="black"] .bg-slate-950 {
    background-color: #020617 !important;
  }

  [data-contrx-theme="black"] .text-slate-950,
  [data-contrx-theme="black"] .text-slate-900,
  [data-contrx-theme="black"] .text-slate-800,
  [data-contrx-theme="black"] .text-slate-700,
  [data-contrx-theme="black"] .text-slate-600 {
    color: #f8fafc !important;
  }

  [data-contrx-theme="black"] .text-slate-500,
  [data-contrx-theme="black"] .text-slate-400 {
    color: #cbd5e1 !important;
  }

  [data-contrx-theme="black"] .text-orange-600,
  [data-contrx-theme="black"] .text-orange-700,
  [data-contrx-theme="black"] .text-orange-800 {
    color: #fb923c !important;
  }

  [data-contrx-theme="black"] .text-red-600,
  [data-contrx-theme="black"] .text-red-700,
  [data-contrx-theme="black"] .text-red-800 {
    color: #fca5a5 !important;
  }

  [data-contrx-theme="black"] .text-amber-600,
  [data-contrx-theme="black"] .text-amber-700,
  [data-contrx-theme="black"] .text-amber-800 {
    color: #fbbf24 !important;
  }

  [data-contrx-theme="black"] .text-emerald-600,
  [data-contrx-theme="black"] .text-emerald-700 {
    color: #6ee7b7 !important;
  }

  [data-contrx-theme="black"] .border-slate-100,
  [data-contrx-theme="black"] .border-slate-200,
  [data-contrx-theme="black"] .border-orange-100,
  [data-contrx-theme="black"] .border-orange-200,
  [data-contrx-theme="black"] .border-amber-100,
  [data-contrx-theme="black"] .border-red-100,
  [data-contrx-theme="black"] .border-emerald-100 {
    border-color: #1e293b !important;
  }

  [data-contrx-theme="black"] input,
  [data-contrx-theme="black"] select,
  [data-contrx-theme="black"] textarea {
    background-color: #020617 !important;
    border-color: #334155 !important;
    color: #f8fafc !important;
  }

  [data-contrx-theme="black"] input:focus,
  [data-contrx-theme="black"] select:focus,
  [data-contrx-theme="black"] textarea:focus {
    border-color: #f97316 !important;
    box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.16) !important;
  }

  [data-contrx-theme="black"] input::placeholder,
  [data-contrx-theme="black"] textarea::placeholder {
    color: #64748b !important;
  }

  [data-contrx-theme="black"] button:not(.bg-orange-500):not(.bg-red-500):not(.bg-red-600):not(.bg-emerald-600) {
    border-color: #1e293b;
  }

  [data-contrx-theme="black"] .shadow-sm,
  [data-contrx-theme="black"] .shadow-md,
  [data-contrx-theme="black"] .shadow-xl,
  [data-contrx-theme="black"] .shadow-2xl {
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35) !important;
  }

  [data-contrx-theme="black"] pre {
    color: #e2e8f0 !important;
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
  const [printModalState, setPrintModalState] = useState<PrintModalState>(defaultPrintModalState);
  const [printEditorViewMode, setPrintEditorViewMode] = useState<PrintEditorViewMode>("split");
  const [restorePrintModalState, setRestorePrintModalState] = useState<RestorePrintModalState>(defaultRestorePrintModalState);
  const [passwordSettings, setPasswordSettings] = useState<PasswordSettings>(defaultPasswordSettings);
  const [validationErrors, setValidationErrors] = useState<SettingsValidationErrors>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [logoUploadError, setLogoUploadError] = useState("");
  const [documentLookupError, setDocumentLookupError] = useState("");
  const [zipCodeLookupError, setZipCodeLookupError] = useState("");
  const [isDocumentLookupLoading, setIsDocumentLookupLoading] = useState(false);
  const [isZipCodeLookupLoading, setIsZipCodeLookupLoading] = useState(false);
  const [isSaveConfirmModalOpen, setIsSaveConfirmModalOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isCloseConfirmModalOpen, setIsCloseConfirmModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetOptions, setResetOptions] = useState<ResetOptions>(defaultResetOptions);
  const [isResettingData, setIsResettingData] = useState(false);
  const [resetError, setResetError] = useState("");
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [newCompanyUserForm, setNewCompanyUserForm] = useState<NewCompanyUserForm>(defaultNewCompanyUserForm);
  const [editingCompanyUser, setEditingCompanyUser] = useState<CompanyUser | null>(null);
  const [editCompanyUserForm, setEditCompanyUserForm] = useState<EditCompanyUserForm>(defaultEditCompanyUserForm);
  const [isUserSettingsEditing, setIsUserSettingsEditing] = useState(false);
  const [isNewCompanyUserFormOpen, setIsNewCompanyUserFormOpen] = useState(false);
  const [isLoadingCompanyUsers, setIsLoadingCompanyUsers] = useState(false);
  const [isCreatingCompanyUser, setIsCreatingCompanyUser] = useState(false);
  const [isUpdatingCompanyUser, setIsUpdatingCompanyUser] = useState(false);
  const [companyUserError, setCompanyUserError] = useState("");
  const companyLogoInputRef = useRef<HTMLInputElement | null>(null);
  const printTemplateTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const lockedUserEmail = user?.email || userSettings.email;
  const currentUserRoleLabel = roleLabels[user?.role || ""] || "Usuário";
  const canResetTestData = canResetTestDataRole(user?.role);
  const canManageCompanyUsers = isCompanyAdminRole(user?.role);
  const companyDisplayName =
    companySettings.tradeName || companySettings.companyName || "Empresa não cadastrada";
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

  const selectedRestorePrintTemplate = restorePrintModalState.documentKey
    ? printTemplates[restorePrintModalState.documentKey]
    : null;

  const validationErrorMessages = useMemo(
    () => getValidationErrorMessages(validationErrors),
    [validationErrors]
  );

  const selectedResetModulesCount = useMemo(
    () => resetModuleOptions.filter((option) => resetOptions[option.key]).length,
    [resetOptions]
  );

  function getCompanyUserPermissions(companyUser: CompanyUser) {
    const permissions = companyUser.permissions || [];

    return permissions.length > 0
      ? permissions
      : defaultEditCompanyUserForm.permissions;
  }

  function isCompanyUserAdmin(companyUser: Pick<CompanyUser, "role" | "isActive">) {
    return companyUser.isActive && (companyUser.role === "OWNER" || companyUser.role === "ADMIN");
  }

  function isLastActiveCompanyAdmin(companyUser: CompanyUser) {
    if (!isCompanyUserAdmin(companyUser)) return false;

    return companyUsers.filter(isCompanyUserAdmin).length <= 1;
  }

  function applyAccessProfileToNewUser(profile: CompanyAccessProfile) {
    setCompanyUserError("");
    setNewCompanyUserForm((currentForm) => ({
      ...currentForm,
      role: profile.role,
      permissions: [...profile.permissions],
    }));
  }

  function applyAccessProfileToEditingUser(profile: CompanyAccessProfile) {
    setCompanyUserError("");
    setEditCompanyUserForm((currentForm) => ({
      ...currentForm,
      role: profile.role,
      permissions: [...profile.permissions],
    }));
  }

  const saveChangeSummary = useMemo(
    () =>
      getChangedSections(
        userSettings,
        initialUserSettings,
        companySettings,
        initialCompanySettings,
        printTemplates,
        initialPrintTemplates,
        themeSettings,
        initialThemeSettings,
        passwordSettings
      ),
    [
      userSettings,
      initialUserSettings,
      companySettings,
      initialCompanySettings,
      printTemplates,
      initialPrintTemplates,
      themeSettings,
      initialThemeSettings,
      passwordSettings,
    ]
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

    const parsedThemeSettings = readThemeSettingsFromStorage(companyId);

    setThemeSettings(parsedThemeSettings);
    setInitialThemeSettings(parsedThemeSettings);
  }, [companyId, userEmail]);

  const loadSettings = useCallback(async (currentCompanyId: string) => {
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
      console.warn("Settings API unavailable. Local cached settings were loaded.");
      loadSettingsFromLocalStorage();
    }
  }, [loadSettingsFromLocalStorage, userEmail]);

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
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os usuários da empresa.",
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
  }, [themeSettings.mode]);

  function handleOpenResetModal() {
    if (!canResetTestData) {
      return;
    }

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
    setResetError("");
    setResetOptions((currentOptions) => ({
      ...currentOptions,
      [key]: !currentOptions[key],
    }));
  }

  function handleSelectAllResetOptions() {
    setResetError("");
    setResetOptions(
      resetModuleOptions.reduce((options, option) => {
        return {
          ...options,
          [option.key]: true,
        };
      }, {} as ResetOptions)
    );
  }

  function handleClearResetOptions() {
    setResetError("");
    setResetOptions(defaultResetOptions);
  }

  async function handleConfirmResetData() {
    if (!canResetTestData) {
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

    setIsResettingData(true);
    setResetError("");

    try {
      await resetTestData(selectedModules.map((option) => option.key));

      selectedModules.forEach((moduleOption) => {
        moduleOption.storageKeys.forEach((storageKey) => {
          removeCompanyStorageItem(companyId, storageKey);
        });
      });

      handleCloseResetModal();
      window.location.reload();
    } catch (error) {
      setResetError(
        error instanceof Error
          ? error.message
          : "Não foi possível resetar os dados de teste agora.",
      );
    } finally {
      setIsResettingData(false);
    }
  }

  function handleToggleCompanyUserPermission(permission: UserToolPermission) {
    setCompanyUserError("");
    setNewCompanyUserForm((currentForm) => {
      const currentPermissions = new Set(currentForm.permissions);

      if (currentPermissions.has(permission)) {
        currentPermissions.delete(permission);
      } else {
        currentPermissions.add(permission);
      }

      return {
        ...currentForm,
        permissions: Array.from(currentPermissions),
      };
    });
  }

  function handleToggleEditCompanyUserPermission(permission: UserToolPermission) {
    setCompanyUserError("");
    setEditCompanyUserForm((currentForm) => {
      const currentPermissions = new Set(currentForm.permissions);

      if (currentPermissions.has(permission)) {
        currentPermissions.delete(permission);
      } else {
        currentPermissions.add(permission);
      }

      return {
        ...currentForm,
        permissions: Array.from(currentPermissions),
      };
    });
  }

  function handleStartUserSettingsEdit() {
    setIsUserSettingsEditing(true);
    setPasswordError("");
  }

  function handleCancelUserSettingsEdit() {
    setUserSettings({
      ...initialUserSettings,
      email: lockedUserEmail,
    });
    setPasswordSettings(defaultPasswordSettings);
    setPasswordError("");
    setValidationErrors((currentErrors) => {
      const remainingErrors = { ...currentErrors };
      delete remainingErrors.name;
      delete remainingErrors.userEmail;

      return remainingErrors;
    });
    setIsUserSettingsEditing(false);
  }

  function handleFinishUserSettingsEdit() {
    setPasswordError("");

    if (!validatePasswordChange()) {
      return;
    }

    const nextValidationErrors = getSettingsValidationErrors(false);

    if (nextValidationErrors.name || nextValidationErrors.userEmail) {
      setValidationErrors(nextValidationErrors);
      return;
    }

    setIsUserSettingsEditing(false);
  }

  function handleOpenNewCompanyUserForm() {
    setNewCompanyUserForm(defaultNewCompanyUserForm);
    setCompanyUserError("");
    setIsNewCompanyUserFormOpen(true);
  }

  function handleCancelNewCompanyUserForm() {
    setNewCompanyUserForm(defaultNewCompanyUserForm);
    setCompanyUserError("");
    setIsNewCompanyUserFormOpen(false);
  }

  function handleOpenEditCompanyUserForm(companyUser: CompanyUser) {
    setEditingCompanyUser(companyUser);
    setEditCompanyUserForm({
      name: companyUser.name,
      email: companyUser.email,
      password: "",
      role: companyUser.role as CompanyUserRole,
      isActive: companyUser.isActive,
      permissions: getCompanyUserPermissions(companyUser),
    });
    setCompanyUserError("");
  }

  function handleCancelEditCompanyUserForm() {
    setEditingCompanyUser(null);
    setEditCompanyUserForm(defaultEditCompanyUserForm);
    setCompanyUserError("");
  }

  async function handleCreateCompanyUser() {
    if (!canManageCompanyUsers) {
      setCompanyUserError("Acesso restrito ao administrador.");
      return;
    }

    const name = newCompanyUserForm.name.trim();
    const email = newCompanyUserForm.email.trim().toLowerCase();

    if (!name || !email || !newCompanyUserForm.password) {
      setCompanyUserError("Preencha nome, e-mail e senha do novo usuário.");
      return;
    }

    if (newCompanyUserForm.permissions.length === 0) {
      setCompanyUserError("Selecione pelo menos uma ferramenta para o usuário.");
      return;
    }

    try {
      setIsCreatingCompanyUser(true);
      setCompanyUserError("");

      await createCompanyUser({
        ...newCompanyUserForm,
        name,
        email,
      });

      setNewCompanyUserForm(defaultNewCompanyUserForm);
      setIsNewCompanyUserFormOpen(false);
      await loadCompanyUsers();
      setSuccessMessage("Usuário criado com sucesso.");
    } catch (error) {
      setCompanyUserError(
        error instanceof Error
          ? error.message
          : "Não foi possível criar o usuário agora.",
      );
    } finally {
      setIsCreatingCompanyUser(false);
    }
  }

  async function handleUpdateCompanyUser() {
    if (!canManageCompanyUsers || !editingCompanyUser) {
      setCompanyUserError("Acesso restrito ao administrador.");
      return;
    }

    const name = editCompanyUserForm.name.trim();
    const password = editCompanyUserForm.password.trim();

    if (!name) {
      setCompanyUserError("Informe o nome do usuário.");
      return;
    }

    if (editCompanyUserForm.permissions.length === 0) {
      setCompanyUserError("Selecione pelo menos uma ferramenta para o usuário.");
      return;
    }

    if (
      isLastActiveCompanyAdmin(editingCompanyUser) &&
      (!editCompanyUserForm.isActive ||
        (editCompanyUserForm.role !== "OWNER" && editCompanyUserForm.role !== "ADMIN"))
    ) {
      setCompanyUserError("Mantenha pelo menos um administrador ativo na empresa.");
      return;
    }

    try {
      setIsUpdatingCompanyUser(true);
      setCompanyUserError("");

      await updateCompanyUser(editingCompanyUser.id, {
        name,
        role: editCompanyUserForm.role,
        isActive: editCompanyUserForm.isActive,
        permissions: editCompanyUserForm.permissions,
        ...(password ? { password } : {}),
      });

      handleCancelEditCompanyUserForm();
      await loadCompanyUsers();
      setSuccessMessage("Usuário atualizado com sucesso.");
    } catch (error) {
      setCompanyUserError(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o usuário agora.",
      );
    } finally {
      setIsUpdatingCompanyUser(false);
    }
  }

  async function handleSearchCompanyDocument() {
    const cleanDocument = onlyDigits(companySettings.document);

    if (!cleanDocument) {
      setDocumentLookupError("Informe o CNPJ antes de buscar os dados da empresa.");
      return;
    }

    if (cleanDocument.length !== 14) {
      setDocumentLookupError("A busca automática está disponível apenas para CNPJ.");
      return;
    }

    if (!isValidCnpj(cleanDocument)) {
      setDocumentLookupError("CNPJ inválido. Verifique o número informado.");
      return;
    }

    try {
      setIsDocumentLookupLoading(true);
      setDocumentLookupError("");

      const companyData = await fetchCompanyDataByCnpj(cleanDocument);

      if (!companyData) {
        setDocumentLookupError("Empresa não encontrada para o CNPJ informado.");
        return;
      }

      setCompanySettings((currentSettings) => ({
        ...currentSettings,
        companyName: companyData.companyName || currentSettings.companyName,
        tradeName: companyData.tradeName || currentSettings.tradeName,
        document: formatDocument(companyData.document),
        phone: companyData.phone
          ? formatPhone(companyData.phone)
          : currentSettings.phone,
        zipCode: companyData.zipCode
          ? formatZipCode(companyData.zipCode)
          : currentSettings.zipCode,
        state: companyData.state || currentSettings.state,
        city: companyData.city || currentSettings.city,
        contractCity: currentSettings.contractCity || companyData.city || "",
        address: companyData.address || currentSettings.address,
        number: companyData.number || currentSettings.number,
        neighborhood: companyData.neighborhood || currentSettings.neighborhood,
      }));
    } catch {
      setDocumentLookupError("Não foi possível consultar o CNPJ agora.");
    } finally {
      setIsDocumentLookupLoading(false);
    }
  }

  async function handleSearchZipCode() {
    const cleanZipCode = onlyDigits(companySettings.zipCode);

    if (!cleanZipCode) {
      setZipCodeLookupError("");
      return;
    }

    if (cleanZipCode.length !== 8) {
      setZipCodeLookupError("Informe um CEP válido com 8 números.");
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

      setCompanySettings((currentSettings) => ({
        ...currentSettings,
        zipCode: formatZipCode(addressData.zipCode),
        state: addressData.state || currentSettings.state,
        city: addressData.city || currentSettings.city,
        contractCity: currentSettings.contractCity || addressData.city || "",
        address: addressData.address || currentSettings.address,
        neighborhood: addressData.neighborhood || currentSettings.neighborhood,
      }));
    } catch {
      setZipCodeLookupError("Não foi possível consultar o CEP agora.");
    } finally {
      setIsZipCodeLookupLoading(false);
    }
  }

  function handleSelectCompanyLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setLogoUploadError("Selecione um arquivo de imagem válido.");
      event.target.value = "";
      return;
    }

    if (file.size > maxCompanyLogoSizeInBytes) {
      setLogoUploadError("A logo precisa ter no máximo 2 MB.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => {
      setLogoUploadError("Não foi possível carregar a imagem selecionada.");
      event.target.value = "";
    };

    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setLogoUploadError("Não foi possível carregar a imagem selecionada.");
        event.target.value = "";
        return;
      }

      setCompanySettings((currentSettings) => ({
        ...currentSettings,
        logo: reader.result as string,
      }));
      setLogoUploadError("");
      event.target.value = "";
    };

    reader.readAsDataURL(file);
  }

  function handleRemoveCompanyLogo() {
    setCompanySettings((currentSettings) => ({
      ...currentSettings,
      logo: "",
    }));
    setLogoUploadError("");

    if (companyLogoInputRef.current) {
      companyLogoInputRef.current.value = "";
    }
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

  function getSettingsValidationErrors(validateCompanySettings = true) {
    const nextValidationErrors: SettingsValidationErrors = {};

    if (validateCompanySettings) {
      if (!companySettings.companyName.trim() && !companySettings.tradeName.trim()) {
        nextValidationErrors.companyName = "Informe a razão social ou o nome fantasia.";
      }

      if (!companySettings.document.trim()) {
        nextValidationErrors.document = "Informe o CPF ou CNPJ da empresa.";
      } else if (!validateDocument(companySettings.document)) {
        nextValidationErrors.document = "Informe um CPF ou CNPJ válido.";
      }

      if (companySettings.email.trim() && !isValidEmail(companySettings.email)) {
        nextValidationErrors.companyEmail = "Informe um e-mail comercial válido.";
      }

      if (
        companySettings.phone.trim() &&
        onlyDigits(companySettings.phone).length < 10
      ) {
        nextValidationErrors.phone = "Informe um telefone com DDD válido.";
      }

      if (!validatePixKey(companySettings.pixKey, companySettings.pixKeyType)) {
        nextValidationErrors.pixKey = "Informe uma chave Pix válida para o tipo selecionado.";
      }

      if (
        companySettings.zipCode.trim() &&
        onlyDigits(companySettings.zipCode).length !== 8
      ) {
        nextValidationErrors.zipCode = "Informe um CEP com 8 números ou deixe em branco.";
      }

      if (!companySettings.city.trim()) {
        nextValidationErrors.city = "Informe a cidade da empresa.";
      }

      if (!companySettings.state.trim()) {
        nextValidationErrors.state = "Informe a UF da empresa.";
      } else if (companySettings.state.trim().length !== 2) {
        nextValidationErrors.state = "Informe a UF com 2 letras.";
      }
    }

    if (!userSettings.name.trim()) {
      nextValidationErrors.name = "Informe o nome do usuário.";
    }

    if (!lockedUserEmail.trim()) {
      nextValidationErrors.userEmail = "E-mail do usuário não encontrado. Faça login novamente.";
    } else if (!isValidEmail(lockedUserEmail)) {
      nextValidationErrors.userEmail = "E-mail de acesso inválido. Faça login novamente.";
    }

    return nextValidationErrors;
  }

  function handleOpenPrintModal(documentKey: PrintDocumentKey, mode: PrintModalMode) {
    if (mode === "edit") {
      setPrintEditorViewMode("split");
    }

    setPrintModalState({
      isOpen: true,
      mode,
      documentKey,
    });
  }

  function handleClosePrintModal() {
    setPrintEditorViewMode("split");
    setPrintModalState(defaultPrintModalState);
  }

  function handleUpdatePrintTemplateContent(documentKey: PrintDocumentKey, content: string) {
    setPrintTemplates((currentTemplates) => ({
      ...currentTemplates,
      [documentKey]: {
        ...currentTemplates[documentKey],
        content,
      },
    }));
  }

  function handleInsertPrintTemplateVariable(variableValue: string) {
    if (!printModalState.documentKey) return;

    const textareaElement = printTemplateTextareaRef.current;
    const currentContent = selectedPrintTemplate?.content || "";
    const startPosition = textareaElement?.selectionStart ?? currentContent.length;
    const endPosition = textareaElement?.selectionEnd ?? currentContent.length;
    const contentBeforeSelection = currentContent.slice(0, startPosition);
    const contentAfterSelection = currentContent.slice(endPosition);
    const nextContent = `${contentBeforeSelection}${variableValue}${contentAfterSelection}`;
    const nextCursorPosition = startPosition + variableValue.length;

    handleUpdatePrintTemplateContent(printModalState.documentKey, nextContent);

    window.requestAnimationFrame(() => {
      if (!printTemplateTextareaRef.current) return;

      printTemplateTextareaRef.current.focus();
      printTemplateTextareaRef.current.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  }

  function updateSelectedPrintTemplateText(
    transformSelection: (selectedText: string) => string,
    fallbackText = "",
  ) {
    if (!printModalState.documentKey) return;

    const textareaElement = printTemplateTextareaRef.current;
    const currentContent = selectedPrintTemplate?.content || "";
    const startPosition = textareaElement?.selectionStart ?? currentContent.length;
    const endPosition = textareaElement?.selectionEnd ?? currentContent.length;
    const selectedText = currentContent.slice(startPosition, endPosition) || fallbackText;
    const nextSelectedText = transformSelection(selectedText);
    const nextContent = `${currentContent.slice(0, startPosition)}${nextSelectedText}${currentContent.slice(endPosition)}`;
    const nextCursorPosition = startPosition + nextSelectedText.length;

    handleUpdatePrintTemplateContent(printModalState.documentKey, nextContent);

    window.requestAnimationFrame(() => {
      if (!printTemplateTextareaRef.current) return;

      printTemplateTextareaRef.current.focus();
      printTemplateTextareaRef.current.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  }

  function insertPrintTemplateBlock(blockContent: string) {
    updateSelectedPrintTemplateText(
      (selectedText) => `${selectedText ? `${selectedText}\n\n` : ""}${blockContent}`,
      blockContent,
    );
  }

  function handlePrintEditorAction(action: "title" | "uppercase" | "numbered" | "signature" | "pageBreak") {
    if (action === "title") {
      updateSelectedPrintTemplateText(
        (selectedText) => selectedText.toUpperCase(),
        "NOVO TÍTULO",
      );
      return;
    }

    if (action === "uppercase") {
      updateSelectedPrintTemplateText((selectedText) => selectedText.toUpperCase());
      return;
    }

    if (action === "numbered") {
      updateSelectedPrintTemplateText((selectedText) => {
        const lines = selectedText.split(/\r\n|\r|\n/).filter((line) => line.trim());

        return lines.map((line, index) => `${index + 1}. ${line.trim()}`).join("\n");
      }, "1. Novo item");
      return;
    }

    if (action === "signature") {
      insertPrintTemplateBlock("__________________________________\n{tenantName}\n\n__________________________________\n{landlordName}");
      return;
    }

    insertPrintTemplateBlock("\n\n--- QUEBRA DE PÁGINA ---\n\n");
  }

  function handleOpenRestorePrintModal(documentKey: PrintDocumentKey) {
    setRestorePrintModalState({
      isOpen: true,
      documentKey,
    });
  }

  function handleCloseRestorePrintModal() {
    setRestorePrintModalState(defaultRestorePrintModalState);
  }

  function handleConfirmRestorePrintTemplate() {
    if (!restorePrintModalState.documentKey) return;

    const documentKey = restorePrintModalState.documentKey;

    setPrintTemplates((currentTemplates) => ({
      ...currentTemplates,
      [documentKey]: {
        ...defaultPrintTemplates[documentKey],
      },
    }));

    if (printModalState.documentKey === documentKey) {
      setPrintModalState((currentState) => ({
        ...currentState,
        mode: currentState.mode === "edit" ? "view" : currentState.mode,
      }));
    }

    handleCloseRestorePrintModal();
  }

  function handleBackToDashboard() {
    setIsCloseConfirmModalOpen(true);
  }

  function handleCloseExitConfirmation() {
    setIsCloseConfirmModalOpen(false);
  }

  function handleConfirmExitSettings() {
    setIsCloseConfirmModalOpen(false);
    router.push("/dashboard");
  }

  function handleOpenSaveConfirmModal() {
    if (isSavingSettings) return;

    setPasswordError("");
    setSuccessMessage("");

    if (!validatePasswordChange()) {
      setActiveSettingsTab("user");
      setIsUserSettingsEditing(true);
      return;
    }

    const shouldValidateCompanySettings =
      activeSettingsTab === "company" ||
      JSON.stringify(companySettings) !== JSON.stringify(initialCompanySettings);

    const nextValidationErrors = getSettingsValidationErrors(shouldValidateCompanySettings);

    if (Object.keys(nextValidationErrors).length > 0) {
      setValidationErrors(nextValidationErrors);
      setActiveSettingsTab(getSettingsErrorTab(nextValidationErrors));
      return;
    }

    setIsSaveConfirmModalOpen(true);
  }

  function handleCloseSaveConfirmModal() {
    setIsSaveConfirmModalOpen(false);
  }

  async function handleConfirmSaveSettings() {
    if (isSavingSettings) return;

    if (!companyId) {
      setPasswordError("Empresa do usuário não encontrada. Faça login novamente.");
      setIsSaveConfirmModalOpen(false);
      return;
    }

    setIsSavingSettings(true);
    setPasswordError("");
    setSuccessMessage("");

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
        printTemplates,
        themeSettings,
      });
    } catch (error) {
      setPasswordError(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar as configurações.",
      );
      setActiveSettingsTab(passwordSettings.newPassword ? "user" : "company");
      setIsSaveConfirmModalOpen(false);
      setIsSavingSettings(false);
      return;
    }

    setCompanyStorageItem(
      companyId,
      settingsStorageKeys.user,
      JSON.stringify({
        ...userSettings,
        email: lockedUserEmail,
      }),
    );
    setCompanyStorageItem(
      companyId,
      settingsStorageKeys.company,
      JSON.stringify(companySettings),
    );
    setCompanyStorageItem(
      companyId,
      settingsStorageKeys.print,
      JSON.stringify(printTemplates),
    );
    setCompanyStorageItem(
      companyId,
      settingsStorageKeys.theme,
      JSON.stringify(themeSettings),
    );
    setCachedAppSettings({
      userSettings: {
        ...userSettings,
        email: lockedUserEmail,
      },
      companySettings,
      printTemplates,
      themeSettings,
    });
    window.dispatchEvent(new Event("contrx-theme-change"));

    if (passwordSettings.newPassword) {
      setCompanyStorageItem(companyId, "contrx_user_password_updated", "true");
      setPasswordSettings(defaultPasswordSettings);
    }

    setInitialUserSettings({
      ...userSettings,
      email: lockedUserEmail,
    });
    setInitialCompanySettings(companySettings);
    setInitialPrintTemplates(printTemplates);
    setInitialThemeSettings(themeSettings);
    setValidationErrors({});
    setSuccessMessage("Configurações salvas com sucesso.");
    setCompanyStorageItem(
      companyId,
      "contrx_dashboard_success_message",
      "Configurações salvas com sucesso.",
    );
    setIsSaveConfirmModalOpen(false);
    setIsSavingSettings(false);

    router.push("/dashboard");
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
              onClick={handleBackToDashboard}
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-base font-black text-slate-500 shadow-sm transition hover:bg-orange-50 hover:text-orange-600 sm:right-6 sm:top-5 sm:h-11 sm:w-11 lg:right-8"
              aria-label="Fechar configurações"
              title="Fechar configurações"
            >
              X
            </button>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-orange-700">
              ⚙ Central de configuração
            </div>

            <h1 className="text-xl font-black leading-tight text-slate-950 sm:text-2xl">
              Configurações do Contrx
            </h1>

            <p className="mt-1 text-sm font-medium text-slate-500">
              Gerencie os dados do usuário, empresa, contato, endereço e segurança do sistema.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr]">
            <aside className="flex flex-col border-b border-slate-100 bg-slate-50 p-3 sm:p-4 lg:border-b-0 lg:border-r">
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

              <div className="contrx-mobile-scroll-tabs mt-4 space-y-0 lg:block lg:space-y-2">
                <button
                  type="button"
                  onClick={() => setActiveSettingsTab("company")}
                  className={`flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-3 text-center text-sm font-black transition lg:justify-start lg:gap-3 lg:px-4 lg:text-left ${
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
                  className={`flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-3 text-center text-sm font-black transition lg:justify-start lg:gap-3 lg:px-4 lg:text-left ${
                    activeSettingsTab === "user"
                      ? "bg-orange-500 text-white shadow-md shadow-orange-100"
                      : "bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                  }`}
                >
                  Dados do usuário
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSettingsTab("print")}
                  className={`flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-3 text-center text-sm font-black transition lg:justify-start lg:gap-3 lg:px-4 lg:text-left ${
                    activeSettingsTab === "print"
                      ? "bg-orange-500 text-white shadow-md shadow-orange-100"
                      : "bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                  }`}
                >
                  Impressos
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSettingsTab("appearance")}
                  className={`flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-3 text-center text-sm font-black transition lg:justify-start lg:gap-3 lg:px-4 lg:text-left ${
                    activeSettingsTab === "appearance"
                      ? "bg-orange-500 text-white shadow-md shadow-orange-100"
                      : "bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                  }`}
                >
                  Aparência
                </button>
              </div>

              {canResetTestData && (
                <button
                  type="button"
                  onClick={handleOpenResetModal}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-sm font-black text-white shadow-md shadow-red-100 transition hover:bg-red-600 lg:mt-auto"
                >
                  Resetar dados de teste
                </button>
              )}
            </aside>

            <section className="p-4 sm:p-5 lg:p-8">
              {successMessage && (
                <div className="mb-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                  {successMessage}
                </div>
              )}

              {validationErrorMessages.length > 0 && (
                <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  <p>Revise os campos obrigatórios antes de salvar:</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    {validationErrorMessages.map((errorMessage) => (
                      <li key={errorMessage}>{errorMessage}</li>
                    ))}
                  </ul>
                </div>
              )}

              {activeSettingsTab === "company" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      Cadastro da empresa
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Essas informações serão usadas em contratos, recibos, cobranças e documentos do Contrx.
                    </p>
                  </div>

                  <div className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-slate-50 p-5 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white text-xl font-black text-slate-400">
                        {companySettings.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={companySettings.logo}
                            alt="Logo da empresa"
                            className="h-full w-full object-contain p-2"
                          />
                        ) : (
                          <span>
                            {(companySettings.tradeName || companySettings.companyName || "L")
                              .trim()
                              .charAt(0)
                              .toUpperCase() || "L"}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">
                          Logo da empresa
                        </h3>
                        <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                          Envie uma imagem PNG, JPG ou SVG com ate 2 MB para aparecer nos documentos e relatorios.
                        </p>
                        {logoUploadError && (
                          <p className="mt-2 text-xs font-bold text-red-600">
                            {logoUploadError}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={companyLogoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        onChange={handleSelectCompanyLogo}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => companyLogoInputRef.current?.click()}
                        className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800"
                      >
                        Escolher logo
                      </button>
                      {companySettings.logo && (
                        <button
                          type="button"
                          onClick={handleRemoveCompanyLogo}
                          className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-100"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <label className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Razão social *
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
                        Nome fantasia *
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

                    <div className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                        CPF/CNPJ *
                      </span>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          type="text"
                          value={companySettings.document}
                          onChange={(event) => {
                            setDocumentLookupError("");
                            setCompanySettings({
                              ...companySettings,
                              document: formatDocument(event.target.value),
                            });
                          }}
                          onBlur={() => {
                            if (onlyDigits(companySettings.document).length === 14) {
                              void handleSearchCompanyDocument();
                            }
                          }}
                          placeholder="00.000.000/0000-00"
                          className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        />

                        <button
                          type="button"
                          onClick={handleSearchCompanyDocument}
                          disabled={isDocumentLookupLoading}
                          className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isDocumentLookupLoading ? "Buscando..." : "Buscar CNPJ"}
                        </button>
                      </div>
                      {(documentLookupError || validationErrors.document) && (
                        <p className="text-xs font-bold text-red-600">
                          {documentLookupError || validationErrors.document}
                        </p>
                      )}
                    </div>

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
                        E-mail 
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
                        <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">
                          Dados Pix da empresa
                        </h3>
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
                          Chave Pix opcional
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
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">
                      Endereço da empresa
                    </h3>

                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                      <div className="space-y-2">
                        <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                          CEP opcional
                        </span>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={companySettings.zipCode}
                            onChange={(event) => {
                              setZipCodeLookupError("");
                              setCompanySettings({
                                ...companySettings,
                                zipCode: formatZipCode(event.target.value),
                              });
                            }}
                            onBlur={() => {
                              if (onlyDigits(companySettings.zipCode).length === 8) {
                                void handleSearchZipCode();
                              }
                            }}
                            placeholder="00000-000"
                            className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                          />

                          <button
                            type="button"
                            onClick={handleSearchZipCode}
                            disabled={isZipCodeLookupLoading}
                            className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isZipCodeLookupLoading ? "..." : "Buscar"}
                          </button>
                        </div>
                        {(zipCodeLookupError || validationErrors.zipCode) && (
                          <p className="text-xs font-bold text-red-600">
                            {zipCodeLookupError || validationErrors.zipCode}
                          </p>
                        )}
                      </div>

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
                          Cidade *
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
                          UF *
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

                  <div className="rounded-3xl border border-orange-100 bg-orange-50/60 p-5">
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">
                      Dados para contratos
                    </h3>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Informe os dados padrão que serão usados na geração de contratos.
                    </p>

                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                          Cidade padrão de assinatura
                        </span>
                        <input
                          type="text"
                          value={companySettings.contractCity}
                          onChange={(event) =>
                            setCompanySettings({
                              ...companySettings,
                              contractCity: event.target.value,
                            })
                          }
                          placeholder="Ex: Rolim de Moura"
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        />
                      </label>

                      <label className="space-y-2 md:col-span-2">
                        <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                          Observações padrão do contrato
                        </span>
                        <textarea
                          value={companySettings.contractDefaultNotes}
                          onChange={(event) =>
                            setCompanySettings({
                              ...companySettings,
                              contractDefaultNotes: event.target.value,
                            })
                          }
                          rows={4}
                          placeholder="Informe observações, instruções ou textos padrão para os contratos..."
                          className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                        />
                      </label>
                    </div>
                  </div>

                </div>
              )}

              {activeSettingsTab === "user" && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-xl font-black text-slate-950">
                        Dados do usuário
                      </h2>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        Veja o usuário logado e edite os dados somente quando necessário.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleStartUserSettingsEdit}
                      className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
                    >
                      Editar usuário
                    </button>
                  </div>

                  <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-orange-400 to-orange-600 text-xl font-black text-white">
                          {companySettings.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={companySettings.logo}
                              alt={`Logo ${companyDisplayName}`}
                              className="h-full w-full bg-white object-contain p-2"
                            />
                          ) : (
                            companyLogoFallbackText
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-lg font-black text-slate-950">
                            {userSettings.name || "Usuário sem nome"}
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold text-slate-500">
                            {lockedUserEmail || "E-mail não informado"}
                          </p>
                        </div>
                      </div>

                      <span className="inline-flex w-fit rounded-full bg-orange-50 px-3 py-2 text-xs font-black text-orange-700 ring-1 ring-orange-100">
                        {currentUserRoleLabel}
                      </span>
                    </div>
                  </div>

                  {passwordError && !isUserSettingsEditing && (
                    <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                      {passwordError}
                    </div>
                  )}

                  {isUserSettingsEditing && (
                    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
                      <div className="contrx-modal-panel flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-2xl">
                        <div className="border-b border-slate-100 bg-gradient-to-r from-orange-50 via-white to-white px-6 py-5">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-orange-700">
                                Edição de usuário
                              </div>
                              <h2 className="mt-3 text-2xl font-black text-slate-950">
                                Dados do usuário
                              </h2>
                              <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                                Altere o nome exibido no sistema ou preencha os campos de senha quando precisar trocar o acesso.
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={handleCancelUserSettingsEdit}
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl font-black text-slate-500 shadow-sm transition hover:bg-orange-50 hover:text-orange-600"
                              aria-label="Fechar edição do usuário"
                            >
                              X
                            </button>
                          </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto space-y-5 bg-slate-50 p-6">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                            Nome *
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
                            E-mail *
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

                      <div className="rounded-3xl border border-slate-100 bg-white p-5">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">
                              Alterar senha
                            </h3>
                            <p className="mt-1 text-sm font-medium text-slate-500">
                              Preencha somente se quiser trocar a senha deste usuário.
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

                        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white pt-5 sm:flex-row sm:justify-end">
                          <button
                            type="button"
                            onClick={handleCancelUserSettingsEdit}
                            className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                          >
                            Cancelar
                          </button>

                          <button
                            type="button"
                            onClick={handleFinishUserSettingsEdit}
                            className="rounded-2xl bg-orange-500 px-6 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
                          >
                            Concluir edição
                          </button>
                        </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {canManageCompanyUsers && (
                    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">
                            Usuários da empresa
                          </h3>
                          <p className="mt-1 text-sm font-medium text-slate-500">
                            Consulte os acessos já cadastrados e abra o cadastro somente quando for criar um novo.
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={loadCompanyUsers}
                            disabled={isLoadingCompanyUsers}
                            className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isLoadingCompanyUsers ? "Atualizando..." : "Atualizar lista"}
                          </button>

                          <button
                            type="button"
                            onClick={handleOpenNewCompanyUserForm}
                            className="rounded-2xl bg-orange-500 px-4 py-2 text-xs font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
                          >
                            Novo usuário
                          </button>
                        </div>
                      </div>

                      {companyUserError && (
                        <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                          {companyUserError}
                        </div>
                      )}

                      <div className="mt-5 space-y-3">
                        {companyUsers.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm font-semibold text-slate-500">
                            Nenhum usuário adicional cadastrado nesta empresa.
                          </div>
                        ) : (
                          companyUsers.map((companyUser) => (
                            <div
                              key={companyUser.id}
                              className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 md:flex-row md:items-center md:justify-between"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-black text-slate-950">
                                  {companyUser.name}
                                </p>
                                <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                                  {companyUser.email}
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 ring-1 ring-slate-200">
                                  {roleLabels[companyUser.role] || companyUser.role}
                                </span>
                                <span
                                  className={
                                    companyUser.isActive
                                      ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100"
                                      : "rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200"
                                  }
                                >
                                  {companyUser.isActive ? "Ativo" : "Inativo"}
                                </span>
                                {canEditCompanyUser(companyUser) && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditCompanyUserForm(companyUser)}
                                    className="rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700 ring-1 ring-orange-100 transition hover:bg-orange-100"
                                  >
                                    Editar
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {editingCompanyUser && (
                        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
                          <div className="contrx-modal-panel flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-2xl">
                            <div className="border-b border-slate-100 bg-gradient-to-r from-orange-50 via-white to-white px-6 py-5">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-orange-700">
                                    Editar acesso
                                  </div>
                                  <h2 className="mt-3 text-2xl font-black text-slate-950">
                                    {editingCompanyUser.name}
                                  </h2>
                                  <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                                    Ajuste perfil, status e ferramentas liberadas para este usuário.
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={handleCancelEditCompanyUserForm}
                                  disabled={isUpdatingCompanyUser}
                                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl font-black text-slate-500 shadow-sm transition hover:bg-orange-50 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                                  aria-label="Fechar edição de usuário"
                                >
                                  X
                                </button>
                              </div>
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-6">
                              <div className="mb-5 rounded-3xl border border-slate-200 bg-white p-4">
                                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                                  Perfis rápidos
                                </p>
                                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                                  {companyAccessProfiles.map((profile) => (
                                    <button
                                      key={profile.key}
                                      type="button"
                                      onClick={() => applyAccessProfileToEditingUser(profile)}
                                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-orange-200 hover:bg-orange-50"
                                    >
                                      <span className="block text-sm font-black text-slate-900">
                                        {profile.label}
                                      </span>
                                      <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
                                        {profile.description}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {isLastActiveCompanyAdmin(editingCompanyUser) && (
                                <div className="mb-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                                  Este é o último administrador ativo da empresa. Mantenha o perfil como administrador ou dono e o acesso ativo.
                                </div>
                              )}

                              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <label className="space-y-2">
                                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                                    Nome do usuário
                                  </span>
                                  <input
                                    type="text"
                                    value={editCompanyUserForm.name}
                                    onChange={(event) =>
                                      setEditCompanyUserForm({
                                        ...editCompanyUserForm,
                                        name: event.target.value,
                                      })
                                    }
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                  />
                                </label>

                                <label className="space-y-2">
                                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                                    E-mail de acesso
                                  </span>
                                  <input
                                    type="email"
                                    value={editCompanyUserForm.email}
                                    readOnly
                                    disabled
                                    className="w-full cursor-not-allowed rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500 outline-none"
                                  />
                                </label>

                                <label className="space-y-2">
                                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                                    Nova senha
                                  </span>
                                  <input
                                    type="password"
                                    value={editCompanyUserForm.password}
                                    onChange={(event) =>
                                      setEditCompanyUserForm({
                                        ...editCompanyUserForm,
                                        password: event.target.value,
                                      })
                                    }
                                    placeholder="Deixe em branco para manter a senha"
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                  />
                                </label>

                                <label className="space-y-2">
                                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                                    Perfil
                                  </span>
                                  <select
                                    value={editCompanyUserForm.role}
                                    onChange={(event) =>
                                      setEditCompanyUserForm({
                                        ...editCompanyUserForm,
                                        role: event.target.value as CompanyUserRole,
                                      })
                                    }
                                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                                  >
                                    {companyUserRoleOptions.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </div>

                              <label className="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white px-4 py-4">
                                <div>
                                  <span className="text-sm font-black text-slate-900">
                                    Usuário ativo
                                  </span>
                                  <p className="mt-1 text-xs font-semibold text-slate-500">
                                    Desative para bloquear o login sem remover o cadastro.
                                  </p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={editCompanyUserForm.isActive}
                                  onChange={(event) =>
                                    setEditCompanyUserForm({
                                      ...editCompanyUserForm,
                                      isActive: event.target.checked,
                                    })
                                  }
                                  className="h-5 w-5 accent-orange-500"
                                />
                              </label>

                              <div className="mt-5">
                                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                                  Ferramentas disponíveis
                                </p>
                                <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                                  {toolPermissionOptions.map((tool) => {
                                    const isSelected = editCompanyUserForm.permissions.includes(tool.key);

                                    return (
                                      <button
                                        key={tool.key}
                                        type="button"
                                        onClick={() => handleToggleEditCompanyUserPermission(tool.key)}
                                        className={
                                          isSelected
                                            ? "flex items-center justify-between gap-3 rounded-2xl border border-orange-300 bg-orange-50 px-4 py-3 text-left text-sm font-black text-orange-800 transition"
                                            : "flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-black text-slate-600 transition hover:border-orange-200 hover:bg-orange-50/40"
                                        }
                                      >
                                        <span className="flex min-w-0 items-center gap-2">
                                          <span>{tool.icon}</span>
                                          <span className="truncate">{tool.label}</span>
                                        </span>
                                        <span
                                          className={
                                            isSelected
                                              ? "flex h-5 w-5 items-center justify-center rounded-md border border-orange-500 bg-orange-500 text-xs text-white"
                                              : "flex h-5 w-5 items-center justify-center rounded-md border border-slate-300 text-xs text-transparent"
                                          }
                                        >
                                          ✓
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            <div className="border-t border-slate-100 bg-white px-6 py-5">
                              {companyUserError && (
                                <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                                  {companyUserError}
                                </div>
                              )}

                              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                                <button
                                  type="button"
                                  onClick={handleCancelEditCompanyUserForm}
                                  disabled={isUpdatingCompanyUser}
                                  className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  Cancelar
                                </button>

                                <button
                                  type="button"
                                  onClick={handleUpdateCompanyUser}
                                  disabled={isUpdatingCompanyUser}
                                  className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {isUpdatingCompanyUser ? "Salvando..." : "Salvar usuário"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {isNewCompanyUserFormOpen && (
                        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
                          <div className="contrx-modal-panel flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-2xl">
                            <div className="border-b border-slate-100 bg-gradient-to-r from-orange-50 via-white to-white px-6 py-5">
                              <div className="flex items-start justify-between gap-4">
                            <div>
                                  <div className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-orange-700">
                                    Novo acesso
                                  </div>
                                  <h2 className="mt-3 text-2xl font-black text-slate-950">
                                    Cadastro de novo usuário
                                  </h2>
                                  <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                                Defina login, perfil e ferramentas liberadas para o novo acesso.
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={handleCancelNewCompanyUserForm}
                              disabled={isCreatingCompanyUser}
                                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl font-black text-slate-500 shadow-sm transition hover:bg-orange-50 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                                  aria-label="Fechar cadastro de novo usuário"
                            >
                                  X
                            </button>
                              </div>
                          </div>

                            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-6">
                          <div className="mb-5 rounded-3xl border border-slate-200 bg-white p-4">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                              Perfis rápidos
                            </p>
                            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                              {companyAccessProfiles.map((profile) => (
                                <button
                                  key={profile.key}
                                  type="button"
                                  onClick={() => applyAccessProfileToNewUser(profile)}
                                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:border-orange-200 hover:bg-orange-50"
                                >
                                  <span className="block text-sm font-black text-slate-900">
                                    {profile.label}
                                  </span>
                                  <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
                                    {profile.description}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <label className="space-y-2">
                              <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                                Nome do novo usuário
                              </span>
                              <input
                                type="text"
                                value={newCompanyUserForm.name}
                                onChange={(event) =>
                                  setNewCompanyUserForm({
                                    ...newCompanyUserForm,
                                    name: event.target.value,
                                  })
                                }
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                              />
                            </label>

                            <label className="space-y-2">
                              <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                                E-mail de acesso
                              </span>
                              <input
                                type="email"
                                value={newCompanyUserForm.email}
                                onChange={(event) =>
                                  setNewCompanyUserForm({
                                    ...newCompanyUserForm,
                                    email: event.target.value,
                                  })
                                }
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                              />
                            </label>

                            <label className="space-y-2">
                              <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                                Senha temporária
                              </span>
                              <input
                                type="password"
                                value={newCompanyUserForm.password}
                                onChange={(event) =>
                                  setNewCompanyUserForm({
                                    ...newCompanyUserForm,
                                    password: event.target.value,
                                  })
                                }
                                placeholder="Digite uma senha temporária"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                              />
                            </label>

                            <label className="space-y-2">
                              <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                                Perfil
                              </span>
                              <select
                                value={newCompanyUserForm.role}
                                onChange={(event) =>
                                  setNewCompanyUserForm({
                                    ...newCompanyUserForm,
                                    role: event.target.value as CompanyUserRole,
                                  })
                                }
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                              >
                                {companyUserRoleOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>

                          <div className="mt-5">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                              Ferramentas disponíveis
                            </p>
                            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                              {toolPermissionOptions.map((tool) => {
                                const isSelected = newCompanyUserForm.permissions.includes(tool.key);

                                return (
                                  <button
                                    key={tool.key}
                                    type="button"
                                    onClick={() => handleToggleCompanyUserPermission(tool.key)}
                                    className={
                                      isSelected
                                        ? "flex items-center justify-between gap-3 rounded-2xl border border-orange-300 bg-orange-50 px-4 py-3 text-left text-sm font-black text-orange-800 transition"
                                        : "flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-black text-slate-600 transition hover:border-orange-200 hover:bg-orange-50/40"
                                    }
                                  >
                                    <span className="flex min-w-0 items-center gap-2">
                                      <span>{tool.icon}</span>
                                      <span className="truncate">{tool.label}</span>
                                    </span>
                                    <span
                                      className={
                                        isSelected
                                          ? "flex h-5 w-5 items-center justify-center rounded-md border border-orange-500 bg-orange-500 text-xs text-white"
                                          : "flex h-5 w-5 items-center justify-center rounded-md border border-slate-300 text-xs text-transparent"
                                      }
                                    >
                                      ✓
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                            </div>

                            <div className="border-t border-slate-100 bg-white px-6 py-5">
                              {companyUserError && (
                                <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                                  {companyUserError}
                                </div>
                              )}

                          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                              type="button"
                              onClick={handleCancelNewCompanyUserForm}
                              disabled={isCreatingCompanyUser}
                              className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              Cancelar
                            </button>

                            <button
                              type="button"
                              onClick={handleCreateCompanyUser}
                              disabled={isCreatingCompanyUser}
                              className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isCreatingCompanyUser ? "Criando..." : "Criar usuário"}
                            </button>
                          </div>
                          </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeSettingsTab === "appearance" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      Aparência
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Escolha o tema visual do Contrx mantendo o laranja como cor principal do sistema.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setThemeSettings({ mode: "light" })}
                      className={`contrx-theme-choice rounded-3xl border p-5 text-left transition ${
                        themeSettings.mode === "light"
                          ? "border-orange-300 bg-orange-50 shadow-md shadow-orange-100"
                          : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-sm font-black text-orange-700">
                            Claro
                          </div>
                          <h3 className="mt-4 text-lg font-black text-slate-950">
                            Tema claro
                          </h3>
                          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                            Mantém o padrão atual com fundo claro, cards brancos e detalhes em laranja.
                          </p>
                        </div>

                        <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-black ${
                          themeSettings.mode === "light"
                            ? "border-orange-500 bg-orange-500 text-white"
                            : "border-slate-300 text-transparent"
                        }`}>
                          ✓
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setThemeSettings({ mode: "black" })}
                      className={`contrx-theme-choice rounded-3xl border p-5 text-left transition ${
                        themeSettings.mode === "black"
                          ? "border-orange-400 bg-slate-950 shadow-md shadow-orange-950/30"
                          : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-sm font-black text-orange-300 ring-1 ring-orange-500/40">
                            Black
                          </div>
                          <h3 className={`mt-4 text-lg font-black ${themeSettings.mode === "black" ? "text-white" : "text-slate-950"}`}>
                            Tema black
                          </h3>
                          <p className={`mt-1 text-sm font-semibold leading-6 ${themeSettings.mode === "black" ? "text-slate-300" : "text-slate-500"}`}>
                            Usa fundo preto/cinza escuro, textos claros e mantém o laranja como destaque principal.
                          </p>
                        </div>

                        <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-black ${
                          themeSettings.mode === "black"
                            ? "border-orange-500 bg-orange-500 text-white"
                            : "border-slate-300 text-transparent"
                        }`}>
                          ✓
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setThemeSettings({ mode: "graphite" })}
                      className={`contrx-theme-choice rounded-3xl border p-5 text-left transition ${
                        themeSettings.mode === "graphite"
                          ? "border-[#24405f] bg-[#0d1b2e] shadow-md shadow-slate-950/30"
                          : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#07111f] text-lg font-black text-orange-300 ring-1 ring-[#24405f]">
                            AN
                          </div>
                          <h3 className={`mt-4 text-lg font-black ${themeSettings.mode === "graphite" ? "text-white" : "text-slate-950"}`}>
                            Azul Noturno
                          </h3>
                          <p className={`mt-1 text-sm font-semibold leading-6 ${themeSettings.mode === "graphite" ? "text-[#b6c6dc]" : "text-slate-500"}`}>
                            Usa azul profundo com painéis elegantes, contraste confortável e laranja como ponto de ação.
                          </p>
                        </div>

                        <span className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-black ${
                          themeSettings.mode === "graphite"
                            ? "border-orange-500 bg-orange-500 text-white"
                            : "border-slate-300 text-transparent"
                        }`}>
                          ✓
                        </span>
                      </div>
                    </button>
                  </div>

                  <div className="rounded-3xl border border-orange-100 bg-orange-50 px-5 py-4">
                    <p className="text-sm font-black text-orange-800">
                      Importante
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-orange-700">
                      A alteração será aplicada ao sistema depois de clicar em Salvar configurações. A identidade laranja do Contrx permanece em todos os temas.
                    </p>
                  </div>
                </div>
              )}

              {activeSettingsTab === "print" && (
                <div className="space-y-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <h2 className="text-xl font-black text-slate-950">
                      Impressos
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Visualize e edite os modelos de PDF que já existem no sistema.
                    </p>
                    <div className="grid grid-cols-3 gap-2 rounded-3xl border border-slate-100 bg-slate-50 p-2 text-center">
                      <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                        <p className="text-lg font-black text-slate-950">
                          {Object.keys(printTemplates).length}
                        </p>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          modelos
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                        <p className="text-lg font-black text-orange-600">
                          {Object.values(printTemplates).reduce(
                            (total, template) => total + getPrintTemplateStats(template.content).variables.length,
                            0
                          )}
                        </p>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          campos
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                        <p className="text-lg font-black text-emerald-600">
                          ao vivo
                        </p>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          previa
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {(Object.keys(printTemplates) as PrintDocumentKey[]).map((documentKey) => {
                      const template = printTemplates[documentKey];
                      const templateStats = getPrintTemplateStats(template.content);

                      return (
                        <div
                          key={documentKey}
                          className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm"
                        >
                          <div className="flex items-start gap-4 border-b border-slate-100 bg-gradient-to-r from-orange-50 via-white to-white px-5 py-5">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-orange-100 text-2xl">
                              {template.icon}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <h3 className="text-base font-black text-slate-950">
                                    {template.title}
                                  </h3>
                                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                                    {template.description}
                                  </p>
                                </div>

                                <span className="w-fit rounded-full bg-orange-50 px-3 py-1 text-xs font-black text-orange-700">
                                  {template.moduleName}
                                </span>
                              </div>

                            </div>
                          </div>

                          <div className="space-y-4 p-5">
                            <div className="grid grid-cols-3 gap-2">
                              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                                <p className="text-sm font-black text-slate-900">{templateStats.lines}</p>
                                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">linhas</p>
                              </div>
                              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                                <p className="text-sm font-black text-slate-900">{templateStats.words}</p>
                                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">palavras</p>
                              </div>
                              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                                <p className="text-sm font-black text-slate-900">{templateStats.variables.length}</p>
                                <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">variaveis</p>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 overflow-x-auto">
                              <button
                                type="button"
                                onClick={() => handleOpenPrintModal(documentKey, "view")}
                                className="shrink-0 whitespace-nowrap rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                              >
                                Visualizar
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenPrintModal(documentKey, "edit")}
                                className="shrink-0 whitespace-nowrap rounded-2xl bg-orange-500 px-4 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
                              >
                                Editar modelo
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenRestorePrintModal(documentKey)}
                                className="shrink-0 whitespace-nowrap rounded-2xl bg-red-50 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-100"
                              >
                                Restaurar
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-3xl border border-amber-100 bg-amber-50 px-5 py-4">
                    <p className="text-sm font-black text-amber-800">
                      Campos dinâmicos disponíveis
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-amber-700">
                      Use variáveis como {"{landlordName}"}, {"{tenantName}"}, {"{propertyName}"}, {"{assetCategory}"}, {"{propertyAddress}"}, {"{startDate}"}, {"{endDate}"}, {"{amount}"}, {"{pixKey}"}, {"{contractCity}"} e {"{currentDate}"}.
                      Elas serão substituídas pelos dados reais no momento da geração do PDF.
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5 lg:px-8">
            <p className="text-xs font-semibold text-slate-400">
              As configurações serão mantidas no navegador até integração com backend.
            </p>

            <div className="contrx-mobile-actions flex justify-end gap-3">
              <button
                type="button"
                onClick={handleBackToDashboard}
                className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200 sm:px-6"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={handleOpenSaveConfirmModal}
                disabled={isSavingSettings}
                className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 sm:px-6"
              >
                {isSavingSettings ? "Salvando..." : "Salvar configurações"}
              </button>
            </div>
          </div>
        </div>

        {isSaveConfirmModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
            <div className="contrx-modal-panel w-full max-w-lg overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-2xl">
              <div className="bg-gradient-to-r from-orange-50 via-white to-white px-6 py-6">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-100 text-3xl">
                    ⚙
                  </div>

                  <h2 className="mt-4 text-2xl font-black text-slate-950">
                    Confirmar alterações
                  </h2>

                  <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                    As configurações da empresa e do usuário serão atualizadas no sistema.
                    Deseja confirmar esta alteração?
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 bg-white px-6 py-5">
                <div className="rounded-3xl border border-orange-100 bg-orange-50 px-4 py-4">
                  <p className="text-xs font-black uppercase tracking-wide text-orange-700">
                    Resumo da confirmação
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    {companySettings.tradeName || companySettings.companyName || "Empresa não cadastrada"}
                  </p>

                  <div className="mt-3 space-y-2">
                    {saveChangeSummary.map((summaryItem) => (
                      <div
                        key={summaryItem}
                        className="flex items-start gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-600"
                      >
                        <span className="mt-0.5 text-orange-600">✓</span>
                        <span>{summaryItem}</span>
                      </div>
                    ))}
                  </div>

                  <p className="mt-3 text-xs font-semibold text-slate-500">
                    As informações serão salvas e você será redirecionado para o Dashboard.
                  </p>
                </div>

                <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleCloseSaveConfirmModal}
                    disabled={isSavingSettings}
                    className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmSaveSettings}
                    disabled={isSavingSettings}
                    className="rounded-2xl bg-orange-500 px-6 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingSettings ? "Salvando..." : "Confirmar e salvar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isCloseConfirmModalOpen && (
          <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
            <div className="contrx-modal-panel w-full max-w-lg overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-2xl">
              <div className="bg-gradient-to-r from-orange-50 via-white to-white px-6 py-6">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-100 text-3xl">
                    X
                  </div>

                  <h2 className="mt-4 text-2xl font-black text-slate-950">
                    Fechar configurações?
                  </h2>

                  <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                    {saveChangeSummary.length > 0
                      ? "Existem alterações que ainda não foram salvas. Se sair agora, elas serão descartadas."
                      : "Você será redirecionado para o Dashboard."}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 bg-white px-6 py-5">
                {saveChangeSummary.length > 0 && (
                  <div className="rounded-3xl border border-orange-100 bg-orange-50 px-4 py-4">
                    <p className="text-xs font-black uppercase tracking-wide text-orange-700">
                      Alterações pendentes
                    </p>
                    <div className="mt-3 space-y-2">
                      {saveChangeSummary.map((summaryItem) => (
                        <div
                          key={summaryItem}
                          className="flex items-start gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-600"
                        >
                          <span className="mt-0.5 text-orange-600">!</span>
                          <span>{summaryItem}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleCloseExitConfirmation}
                    className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                  >
                    Continuar editando
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmExitSettings}
                    className="rounded-2xl bg-orange-500 px-6 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
                  >
                    {saveChangeSummary.length > 0 ? "Sair sem salvar" : "Fechar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {printModalState.isOpen && selectedPrintTemplate && printModalState.documentKey && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
            <div className="contrx-modal-panel flex max-h-[96vh] w-full max-w-[96vw] flex-col overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-2xl">
              <div className="border-b border-slate-100 bg-gradient-to-r from-orange-50 via-white to-white px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-orange-100 text-2xl">
                      {selectedPrintTemplate.icon}
                    </div>
                    <div>
                      <div className="inline-flex rounded-full bg-orange-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-orange-700">
                        {printModalState.mode === "edit" ? "Editar impresso" : "Visualizar impresso"}
                      </div>
                      <h2 className="mt-3 text-2xl font-black text-slate-950">
                        {selectedPrintTemplate.title}
                      </h2>
                      <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                        {selectedPrintTemplate.description}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleClosePrintModal}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl font-black text-slate-500 shadow-sm transition hover:bg-orange-50 hover:text-orange-600"
                    aria-label="Fechar impresso"
                  >
                    X
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-6 lg:p-8">
                {printModalState.mode === "view" ? (
                  <div className="grid grid-cols-1 gap-5 xl:grid-cols-[280px_1fr]">
                    <aside className="space-y-3">
                      <div className="rounded-3xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                          Diagnostico
                        </p>
                        <div className="mt-3 grid grid-cols-3 gap-2 xl:grid-cols-1">
                          <div className="rounded-2xl bg-slate-50 px-3 py-3">
                            <p className="text-base font-black text-slate-950">{selectedPrintTemplateStats.lines}</p>
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">linhas</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 px-3 py-3">
                            <p className="text-base font-black text-slate-950">{selectedPrintTemplateStats.words}</p>
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">palavras</p>
                          </div>
                          <div className="rounded-2xl bg-slate-50 px-3 py-3">
                            <p className="text-base font-black text-slate-950">{selectedPrintTemplateStats.variables.length}</p>
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">variaveis</p>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setPrintModalState((currentState) => ({ ...currentState, mode: "edit" }));
                        }}
                        className="w-full rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
                      >
                        Editar este modelo
                      </button>
                    </aside>

                    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                      <div className="mx-auto min-h-[620px] max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
                        <pre className="whitespace-pre-wrap font-sans text-sm font-semibold leading-7 text-slate-700">
                          {selectedPrintTemplatePreview}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="min-h-0 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-slate-100">
                    <div className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-slate-950">
                            Editor do impresso
                          </p>
                          <p className="mt-0.5 text-xs font-semibold text-slate-500">
                            {selectedPrintTemplateStats.words} palavras · {selectedPrintTemplateStats.variables.length} campos
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <div className="inline-flex rounded-xl bg-slate-100 p-1">
                            {[
                              { label: "Lado a lado", value: "split" as const },
                              { label: "Texto", value: "editor" as const },
                              { label: "Previa", value: "preview" as const },
                            ].map((viewMode) => (
                              <button
                                key={viewMode.value}
                                type="button"
                                onClick={() => setPrintEditorViewMode(viewMode.value)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                                  printEditorViewMode === viewMode.value
                                    ? "bg-white text-orange-700 shadow-sm"
                                    : "text-slate-500 hover:text-slate-900"
                                }`}
                              >
                                {viewMode.label}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => handlePrintEditorAction("title")}
                            className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200"
                            title="Transformar seleção em título"
                          >
                            Título
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintEditorAction("uppercase")}
                            className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200"
                            title="Maiúsculas"
                          >
                            AA
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintEditorAction("numbered")}
                            className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200"
                            title="Lista numerada"
                          >
                            1. Lista
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintEditorAction("signature")}
                            className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200"
                            title="Bloco de assinaturas"
                          >
                            Assinaturas
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintEditorAction("pageBreak")}
                            className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200"
                            title="Inserir marca de quebra de página"
                          >
                            Quebra
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenRestorePrintModal(printModalState.documentKey!)}
                            className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100"
                          >
                            Restaurar padrão
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="grid min-h-[70vh] grid-cols-1 gap-0 xl:grid-cols-[minmax(0,1fr)_320px]">
                      <div className="min-w-0 overflow-auto p-3 sm:p-5">
                        <div
                          className={`grid gap-4 ${
                            printEditorViewMode === "split"
                              ? "2xl:grid-cols-2"
                              : "grid-cols-1"
                          }`}
                        >
                          {printEditorViewMode !== "preview" && (
                            <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                              <div className="border-b border-slate-100 px-5 py-4">
                                <p className="text-sm font-black text-slate-950">
                                  Texto do modelo
                                </p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                  {selectedPrintTemplateStats.lines} linhas no modelo
                                </p>
                              </div>

                              <div className="bg-slate-50 p-3 sm:p-5">
                                <div className="mx-auto max-w-[850px] bg-white px-5 py-6 shadow-[0_18px_60px_rgba(15,23,42,0.10)] ring-1 ring-slate-200 sm:px-8">
                                  <textarea
                                    ref={printTemplateTextareaRef}
                                    value={selectedPrintTemplate.content}
                                    onChange={(event) =>
                                      handleUpdatePrintTemplateContent(printModalState.documentKey!, event.target.value)
                                    }
                                    spellCheck={false}
                                    className="min-h-[62vh] w-full resize-y border-0 bg-transparent font-serif text-[15px] font-medium leading-8 text-slate-900 outline-none"
                                  />
                                </div>
                              </div>
                            </section>
                          )}

                          {printEditorViewMode !== "editor" && (
                            <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                              <div className="border-b border-slate-100 px-5 py-4">
                                <p className="text-sm font-black text-slate-950">
                                  Previa do PDF
                                </p>
                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                  Dados de exemplo
                                </p>
                              </div>

                              <div className="overflow-auto bg-slate-50 p-3 sm:p-5">
                                <div className="mx-auto min-h-[62vh] max-w-[850px] bg-white px-5 py-6 shadow-[0_18px_60px_rgba(15,23,42,0.10)] ring-1 ring-slate-200 sm:px-8">
                                  <pre className="whitespace-pre-wrap font-sans text-sm font-semibold leading-7 text-slate-700">
                                    {selectedPrintTemplatePreview}
                                  </pre>
                                </div>
                              </div>
                            </section>
                          )}
                        </div>
                      </div>

                      <aside className="border-t border-slate-200 bg-white px-4 py-4 xl:max-h-[calc(96vh-13rem)] xl:overflow-y-auto xl:border-l xl:border-t-0">
                        <div className="mb-4">
                          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                            Campos do documento
                          </p>
                          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                            Clique para inserir no cursor.
                          </p>
                        </div>

                        <div className="space-y-4">
                          {printTemplateVariableGroups.map((group) => (
                            <div key={group.title}>
                              <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">
                                {group.title}
                              </p>

                              <div className="grid gap-2">
                                {group.variables.map((variable) => (
                                  <button
                                    key={`${group.title}-${variable.value}`}
                                    type="button"
                                    onClick={() => handleInsertPrintTemplateVariable(variable.value)}
                                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-black text-slate-700 transition hover:border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                                    title={`Inserir ${variable.value}`}
                                  >
                                    <span>{variable.label}</span>
                                    <span className="font-mono text-[10px] text-slate-400">
                                      {variable.value}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </aside>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white px-6 py-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleClosePrintModal}
                  className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                >
                  Fechar
                </button>

                {printModalState.mode === "edit" && (
                  <button
                    type="button"
                    onClick={handleClosePrintModal}
                    className="rounded-2xl bg-orange-500 px-6 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
                  >
                    Concluir edição
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {restorePrintModalState.isOpen && selectedRestorePrintTemplate && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
            <div className="contrx-modal-panel w-full max-w-lg overflow-hidden rounded-[2rem] border border-red-100 bg-white shadow-2xl">
              <div className="bg-gradient-to-r from-red-50 via-white to-white px-6 py-6">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-red-100 text-3xl">
                    ↩
                  </div>

                  <h2 className="mt-4 text-2xl font-black text-slate-950">
                    Restaurar impresso padrão
                  </h2>

                  <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                    Esta ação vai substituir o texto atual pelo modelo padrão do Contrx. A alteração só será gravada definitivamente ao clicar em Salvar configurações.
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 bg-white px-6 py-5">
                <div className="rounded-3xl border border-red-100 bg-red-50 px-4 py-4">
                  <p className="text-xs font-black uppercase tracking-wide text-red-700">
                    Impresso selecionado
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    {selectedRestorePrintTemplate.title}
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    {selectedRestorePrintTemplate.description}
                  </p>
                </div>

                <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleCloseRestorePrintModal}
                    className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmRestorePrintTemplate}
                    className="rounded-2xl bg-red-500 px-6 py-3 text-sm font-black text-white shadow-md shadow-red-100 transition hover:bg-red-600"
                  >
                    Restaurar padrão
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isResetModalOpen && canResetTestData && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
            <div className="contrx-modal-panel flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-red-100 bg-white shadow-2xl">
              <div className="border-b border-red-100 bg-gradient-to-r from-red-50 via-white to-white px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-red-100 text-2xl">
                      Reset
                    </div>
                    <div>
                      <div className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-red-700">
                        Ação crítica
                      </div>
                      <h2 className="mt-3 text-2xl font-black text-slate-950">
                        Resetar dados de teste
                      </h2>
                      <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                        Selecione os módulos que deseja limpar. Essa ação remove os dados da empresa atual no banco e também limpa filtros locais do navegador.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCloseResetModal}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl font-black text-slate-500 shadow-sm transition hover:bg-red-50 hover:text-red-600"
                    aria-label="Fechar reset de dados"
                  >
                    X
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                <div className="mb-4 flex flex-col gap-3 rounded-3xl border border-red-100 bg-red-50 px-4 py-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-black text-red-800">
                      {selectedResetModulesCount} módulo(s) selecionado(s)
                    </p>
                    <p className="mt-1 text-xs font-semibold text-red-700">
                      Use os atalhos abaixo para selecionar todos os módulos ou limpar a seleção.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllResetOptions}
                      className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-red-700 shadow-sm transition hover:bg-red-100"
                    >
                      Selecionar todos
                    </button>

                    <button
                      type="button"
                      onClick={handleClearResetOptions}
                      className="rounded-2xl bg-red-100 px-4 py-2 text-xs font-black text-red-700 transition hover:bg-red-200"
                    >
                      Limpar seleção
                    </button>
                  </div>
                </div>

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
                  disabled={isResettingData}
                  className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmResetData}
                  disabled={isResettingData}
                  className="rounded-2xl bg-red-500 px-6 py-3 text-sm font-black text-white shadow-md shadow-red-100 transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isResettingData ? "Limpando..." : "Confirmar limpeza"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
