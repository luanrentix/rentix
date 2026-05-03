"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type UserSettings = {
  name: string;
  email: string;
};

type PasswordSettings = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type SettingsValidationErrors = Partial<Record<keyof UserSettings | keyof CompanySettings, string>>;

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
  contractCity: string;
  contractDefaultNotes: string;
};

type SettingsTab = "company" | "user" | "print" | "appearance";

type ThemeMode = "light" | "black";

type ThemeSettings = {
  mode: ThemeMode;
};

type PrintDocumentKey = "temporaryContract" | "paymentBooklet";

type PrintModalMode = "view" | "edit";

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
  contractCity: "",
  contractDefaultNotes: "",
};

const defaultThemeSettings: ThemeSettings = {
  mode: "light",
};

const legacyTemporaryContractTemplateContent = 'CONTRATO TEMPORÁRIO\n\nLOCADOR: {companyName}\nLOCATÁRIO: {personName}\nIMÓVEL: {propertyName}\nPERÍODO: {startDate} até {endDate}\nHORÁRIO: Entrada {entryTime} / Saída {exitTime}\n\nCLÁUSULAS E CONDIÇÕES:\n1. O presente contrato tem finalidade de locação temporária.\n2. O locatário declara estar ciente das regras de uso do imóvel.\n3. As informações financeiras e condições acordadas deverão constar no documento final.\n\n{contractDefaultNotes}\n\n{contractCity}, {currentDate}.\n\n__________________________________\nLOCADOR\n\n__________________________________\nLOCATÁRIO';

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

const defaultPrintTemplates: PrintTemplates = {
  temporaryContract: {
    title: "Contrato temporário",
    description: "Modelo usado na geração do contrato de locação temporária em PDF.",
    moduleName: "Contratos",
    icon: "📄",
    isEditable: true,
    content: defaultTemporaryContractTemplateContent,
  },
  paymentBooklet: {
    title: "Carnê",
    description: "Modelo usado na geração de carnês e parcelas de cobrança em PDF.",
    moduleName: "Contas a receber",
    icon: "💳",
    isEditable: true,
    content: defaultPaymentBookletTemplateContent,
  },
};

const defaultPrintModalState: PrintModalState = {
  isOpen: false,
  mode: "view",
  documentKey: null,
};

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
  const paymentBooklet = {
    ...defaultPrintTemplates.paymentBooklet,
    ...(storedTemplates.paymentBooklet || {}),
  };

  if (temporaryContract.content.trim() === legacyTemporaryContractTemplateContent.trim()) {
    temporaryContract.content = defaultTemporaryContractTemplateContent;
  }

  if (paymentBooklet.content.trim() === legacyPaymentBookletTemplateContent.trim()) {
    paymentBooklet.content = defaultPaymentBookletTemplateContent;
  }

  paymentBooklet.content = extractPaymentBookletInstructions(paymentBooklet.content);

  return {
    temporaryContract,
    paymentBooklet,
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

function isValidEmail(value: string) {
  if (!value.trim()) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function validateDocument(value: string) {
  const digits = onlyDigits(value);
  return digits.length === 11 || digits.length === 14;
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


function renderPrintTemplatePreview(content: string, documentKey: PrintDocumentKey | null) {
  const previewValues: Record<string, string> = {
    companyName: "Rentix Gestão de Locações LTDA",
    tradeName: "Rentix",
    landlordName: "Rentix Gestão de Locações LTDA",
    landlordDocument: "12.345.678/0001-90",
    landlordAddress: "Rua Principal, nº 100, Centro, Rolim de Moura/RO, CEP 76940-000",
    companyEmail: "contato@rentix.com",
    companyPhone: "(69) 99999-0000",
    personName: "João da Silva",
    tenantName: "João da Silva",
    tenantDocument: "123.456.789-00",
    tenantAddress: "Rua das Flores, nº 25, Centro, Rolim de Moura/RO, CEP 76940-000",
    tenantEmail: "joao@email.com",
    propertyName: "Casa Temporada Centro",
    propertyAddress: "Avenida Norte, nº 500, Bairro Jardim, Rolim de Moura/RO",
    startDate: "10/05/2026",
    endDate: "12/05/2026",
    entryTime: "14:00",
    exitTime: "10:00",
    contractDays: "3",
    amount: "R$ 1.200,00",
    dueDate: "10/05/2026",
    pixKey: "pix@rentix.com",
    contractNumber: "CTR-0001",
    installmentNumber: "1/3",
    contractCity: "Rolim de Moura/RO",
    currentDate: "02 de maio de 2026",
    contractDefaultNotes: "Observações adicionais do contrato aparecerão neste espaço.",
  };

  let previewContent = content;

  Object.entries(previewValues).forEach(([key, value]) => {
    previewContent = previewContent.replace(new RegExp(`{${key}}`, "g"), value);
  });

  if (documentKey === "paymentBooklet") {
    return `CARNÊ DE PAGAMENTO\n\nEMPRESA: ${previewValues.companyName}\nCLIENTE: ${previewValues.personName}\nCONTRATO: ${previewValues.contractNumber}\nPARCELA: ${previewValues.installmentNumber}\nVENCIMENTO: ${previewValues.dueDate}\nVALOR: ${previewValues.amount}\nPIX: ${previewValues.pixKey}\n\nINSTRUÇÕES:\n${previewContent}`;
  }

  return previewContent;
}


const rentixThemeStyle = `
  [data-rentix-theme="black"] {
    background: #020617 !important;
    color: #f8fafc !important;
  }

  [data-rentix-theme="black"] * {
    scrollbar-color: #475569 #020617;
  }

  [data-rentix-theme="black"] .bg-white,
  [data-rentix-theme="black"] .bg-slate-50,
  [data-rentix-theme="black"] .bg-slate-100,
  [data-rentix-theme="black"] .bg-white\\/90 {
    background-color: #0f172a !important;
  }

  [data-rentix-theme="black"] .bg-gradient-to-r {
    background-image: none !important;
    background-color: #0f172a !important;
  }

  [data-rentix-theme="black"] .from-orange-50,
  [data-rentix-theme="black"] .via-white,
  [data-rentix-theme="black"] .to-white,
  [data-rentix-theme="black"] .from-slate-50 {
    background-image: none !important;
  }

  [data-rentix-theme="black"] .bg-orange-50,
  [data-rentix-theme="black"] .bg-orange-50\\/40,
  [data-rentix-theme="black"] .bg-orange-50\\/50,
  [data-rentix-theme="black"] .bg-orange-50\\/60,
  [data-rentix-theme="black"] .bg-orange-100 {
    background-color: rgba(249, 115, 22, 0.16) !important;
  }

  [data-rentix-theme="black"] .bg-amber-50,
  [data-rentix-theme="black"] .bg-amber-100 {
    background-color: rgba(245, 158, 11, 0.16) !important;
  }

  [data-rentix-theme="black"] .bg-red-50,
  [data-rentix-theme="black"] .bg-red-100 {
    background-color: rgba(239, 68, 68, 0.16) !important;
  }

  [data-rentix-theme="black"] .bg-emerald-50,
  [data-rentix-theme="black"] .bg-emerald-100 {
    background-color: rgba(16, 185, 129, 0.16) !important;
  }

  [data-rentix-theme="black"] .bg-slate-900,
  [data-rentix-theme="black"] .bg-slate-950 {
    background-color: #020617 !important;
  }

  [data-rentix-theme="black"] .text-slate-950,
  [data-rentix-theme="black"] .text-slate-900,
  [data-rentix-theme="black"] .text-slate-800,
  [data-rentix-theme="black"] .text-slate-700,
  [data-rentix-theme="black"] .text-slate-600 {
    color: #f8fafc !important;
  }

  [data-rentix-theme="black"] .text-slate-500,
  [data-rentix-theme="black"] .text-slate-400 {
    color: #cbd5e1 !important;
  }

  [data-rentix-theme="black"] .text-orange-600,
  [data-rentix-theme="black"] .text-orange-700,
  [data-rentix-theme="black"] .text-orange-800 {
    color: #fb923c !important;
  }

  [data-rentix-theme="black"] .text-red-600,
  [data-rentix-theme="black"] .text-red-700,
  [data-rentix-theme="black"] .text-red-800 {
    color: #fca5a5 !important;
  }

  [data-rentix-theme="black"] .text-amber-600,
  [data-rentix-theme="black"] .text-amber-700,
  [data-rentix-theme="black"] .text-amber-800 {
    color: #fbbf24 !important;
  }

  [data-rentix-theme="black"] .text-emerald-600,
  [data-rentix-theme="black"] .text-emerald-700 {
    color: #6ee7b7 !important;
  }

  [data-rentix-theme="black"] .border-slate-100,
  [data-rentix-theme="black"] .border-slate-200,
  [data-rentix-theme="black"] .border-orange-100,
  [data-rentix-theme="black"] .border-orange-200,
  [data-rentix-theme="black"] .border-amber-100,
  [data-rentix-theme="black"] .border-red-100,
  [data-rentix-theme="black"] .border-emerald-100 {
    border-color: #1e293b !important;
  }

  [data-rentix-theme="black"] input,
  [data-rentix-theme="black"] select,
  [data-rentix-theme="black"] textarea {
    background-color: #020617 !important;
    border-color: #334155 !important;
    color: #f8fafc !important;
  }

  [data-rentix-theme="black"] input:focus,
  [data-rentix-theme="black"] select:focus,
  [data-rentix-theme="black"] textarea:focus {
    border-color: #f97316 !important;
    box-shadow: 0 0 0 4px rgba(249, 115, 22, 0.16) !important;
  }

  [data-rentix-theme="black"] input::placeholder,
  [data-rentix-theme="black"] textarea::placeholder {
    color: #64748b !important;
  }

  [data-rentix-theme="black"] button:not(.bg-orange-500):not(.bg-red-500):not(.bg-red-600):not(.bg-emerald-600) {
    border-color: #1e293b;
  }

  [data-rentix-theme="black"] .shadow-sm,
  [data-rentix-theme="black"] .shadow-md,
  [data-rentix-theme="black"] .shadow-xl,
  [data-rentix-theme="black"] .shadow-2xl {
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.35) !important;
  }

  [data-rentix-theme="black"] pre {
    color: #e2e8f0 !important;
  }
`;

export default function ConfiguracoesPage() {
  const router = useRouter();
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
  const [passwordSettings, setPasswordSettings] = useState<PasswordSettings>(defaultPasswordSettings);
  const [validationErrors, setValidationErrors] = useState<SettingsValidationErrors>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSaveConfirmModalOpen, setIsSaveConfirmModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetOptions, setResetOptions] = useState<ResetOptions>(defaultResetOptions);
  const [resetConfirmationText, setResetConfirmationText] = useState("");
  const [resetError, setResetError] = useState("");

  const userInitials = useMemo(() => getInitialLetters(userSettings.name), [userSettings.name]);

  const selectedPrintTemplate = printModalState.documentKey
    ? printTemplates[printModalState.documentKey]
    : null;

  const validationErrorMessages = useMemo(
    () => getValidationErrorMessages(validationErrors),
    [validationErrors]
  );

  const selectedResetModulesCount = useMemo(
    () => resetModuleOptions.filter((option) => resetOptions[option.key]).length,
    [resetOptions]
  );

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

  useEffect(() => {
    const storedUserSettings = localStorage.getItem("rentix_user_settings");
    const storedCompanySettings = localStorage.getItem("rentix_company_settings");
    const storedPrintTemplates = localStorage.getItem("rentix_print_templates");
    const storedThemeSettings = localStorage.getItem("rentix_theme_settings");

    if (storedUserSettings) {
      const parsedUserSettings = {
        ...defaultUserSettings,
        ...JSON.parse(storedUserSettings),
      };

      setUserSettings(parsedUserSettings);
      setInitialUserSettings(parsedUserSettings);
    }

    if (storedCompanySettings) {
      const parsedCompanySettings = {
        ...defaultCompanySettings,
        ...JSON.parse(storedCompanySettings),
      };

      setCompanySettings(parsedCompanySettings);
      setInitialCompanySettings(parsedCompanySettings);
    }

    if (storedPrintTemplates) {
      const parsedPrintTemplates = normalizeStoredPrintTemplates(JSON.parse(storedPrintTemplates));

      setPrintTemplates(parsedPrintTemplates);
      setInitialPrintTemplates(parsedPrintTemplates);
    }

    if (storedThemeSettings) {
      const parsedThemeSettings = {
        ...defaultThemeSettings,
        ...JSON.parse(storedThemeSettings),
      };

      setThemeSettings(parsedThemeSettings);
      setInitialThemeSettings(parsedThemeSettings);
    }
  }, []);

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

  function validateSettings() {
    const nextValidationErrors: SettingsValidationErrors = {};

    if (!companySettings.companyName.trim() && !companySettings.tradeName.trim()) {
      nextValidationErrors.companyName = "Informe a razão social ou o nome fantasia.";
    }

    if (!companySettings.document.trim()) {
      nextValidationErrors.document = "Informe o CPF ou CNPJ da empresa.";
    } else if (!validateDocument(companySettings.document)) {
      nextValidationErrors.document = "Informe um CPF ou CNPJ válido.";
    }

    if (companySettings.email.trim() && !isValidEmail(companySettings.email)) {
      nextValidationErrors.email = "Informe um e-mail comercial válido.";
    }

    if (!validatePixKey(companySettings.pixKey, companySettings.pixKeyType)) {
      nextValidationErrors.pixKey = "Informe uma chave Pix válida para o tipo selecionado.";
    }

    if (!companySettings.city.trim()) {
      nextValidationErrors.city = "Informe a cidade da empresa.";
    }

    if (!companySettings.state.trim()) {
      nextValidationErrors.state = "Informe a UF da empresa.";
    } else if (companySettings.state.trim().length !== 2) {
      nextValidationErrors.state = "Informe a UF com 2 letras.";
    }

    if (!companySettings.contractCity.trim()) {
      nextValidationErrors.contractCity = "Informe a cidade padrão de assinatura.";
    }

    if (!userSettings.name.trim()) {
      nextValidationErrors.name = "Informe o nome do usuário.";
    }

    if (!userSettings.email.trim()) {
      nextValidationErrors.email = "Informe o e-mail do usuário.";
    } else if (!isValidEmail(userSettings.email)) {
      nextValidationErrors.email = "Informe um e-mail de usuário válido.";
    }

    setValidationErrors(nextValidationErrors);

    return Object.keys(nextValidationErrors).length === 0;
  }

  function handleOpenPrintModal(documentKey: PrintDocumentKey, mode: PrintModalMode) {
    setPrintModalState({
      isOpen: true,
      mode,
      documentKey,
    });
  }

  function handleClosePrintModal() {
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

  function handleResetPrintTemplate(documentKey: PrintDocumentKey) {
    setPrintTemplates((currentTemplates) => ({
      ...currentTemplates,
      [documentKey]: defaultPrintTemplates[documentKey],
    }));
  }

  function handleBackToDashboard() {
    router.push("/dashboard");
  }

  function handleOpenSaveConfirmModal() {
    setPasswordError("");

    if (!validateSettings()) {
      setActiveSettingsTab("company");
      return;
    }

    if (!validatePasswordChange()) {
      setActiveSettingsTab("user");
      return;
    }

    setIsSaveConfirmModalOpen(true);
  }

  function handleCloseSaveConfirmModal() {
    setIsSaveConfirmModalOpen(false);
  }

  function handleConfirmSaveSettings() {
    localStorage.setItem("rentix_user_settings", JSON.stringify(userSettings));
    localStorage.setItem("rentix_company_settings", JSON.stringify(companySettings));
    localStorage.setItem("rentix_print_templates", JSON.stringify(printTemplates));
    localStorage.setItem("rentix_theme_settings", JSON.stringify(themeSettings));

    if (passwordSettings.newPassword) {
      localStorage.setItem("rentix_user_password_updated", "true");
      setPasswordSettings(defaultPasswordSettings);
    }

    setInitialUserSettings(userSettings);
    setInitialCompanySettings(companySettings);
    setInitialPrintTemplates(printTemplates);
    setInitialThemeSettings(themeSettings);
    setValidationErrors({});
    setSuccessMessage("Configurações salvas com sucesso.");
    localStorage.setItem("rentix_dashboard_success_message", "Configurações salvas com sucesso.");
    setIsSaveConfirmModalOpen(false);

    router.push("/dashboard");
  }

  return (
    <div
      data-rentix-theme={themeSettings.mode}
      className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8"
    >
      <style>{rentixThemeStyle}</style>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[2rem] border border-orange-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-gradient-to-r from-orange-50 via-white to-white px-6 py-5 lg:px-8">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-orange-700">
              ⚙️ Central de configuração
            </div>

            <h1 className="text-2xl font-black text-slate-950">
              Configurações do Rentix
            </h1>

            <p className="mt-1 text-sm font-medium text-slate-500">
              Gerencie os dados do usuário, empresa, contato, endereço e segurança do sistema.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr]">
            <aside className="flex flex-col border-b border-slate-100 bg-slate-50 p-4 lg:border-b-0 lg:border-r">
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

                <button
                  type="button"
                  onClick={() => setActiveSettingsTab("print")}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                    activeSettingsTab === "print"
                      ? "bg-orange-500 text-white shadow-md shadow-orange-100"
                      : "bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                  }`}
                >
                  🖨️ Impresso
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSettingsTab("appearance")}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black transition ${
                    activeSettingsTab === "appearance"
                      ? "bg-orange-500 text-white shadow-md shadow-orange-100"
                      : "bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-600"
                  }`}
                >
                  🎨 Aparência
                </button>
              </div>

              <button
                type="button"
                onClick={handleOpenResetModal}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-sm font-black text-white shadow-md shadow-red-100 transition hover:bg-red-600 lg:mt-auto"
              >
                🗑️ Resetar dados de teste
              </button>
            </aside>

            <section className="p-5 lg:p-8">
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
                      Essas informações serão usadas em contratos, recibos, cobranças e documentos do Rentix.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                        placeholder="Ex: Rentix Gestão de Locações LTDA"
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
                        placeholder="Ex: Rentix"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />
                    </label>

                    <label className="space-y-2">
                      <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                        CPF/CNPJ *
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
                    <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">
                      Endereço da empresa
                    </h3>

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
                          Cidade padrão de assinatura *
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
                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      Dados do usuário
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Atualize os dados exibidos no cabeçalho do sistema e altere a senha de acesso.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                        <h3 className="text-sm font-black uppercase tracking-wide text-slate-600">
                          Alterar senha
                        </h3>
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

              {activeSettingsTab === "appearance" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      Aparência
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Escolha o tema visual do Rentix mantendo o laranja como cor principal do sistema.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setThemeSettings({ mode: "light" })}
                      className={`rounded-3xl border p-5 text-left transition ${
                        themeSettings.mode === "light"
                          ? "border-orange-300 bg-orange-50 shadow-md shadow-orange-100"
                          : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-2xl">
                            ☀️
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
                      className={`rounded-3xl border p-5 text-left transition ${
                        themeSettings.mode === "black"
                          ? "border-orange-400 bg-slate-950 shadow-md shadow-orange-950/30"
                          : "border-slate-200 bg-white hover:border-orange-200 hover:bg-orange-50/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-2xl ring-1 ring-orange-500/40">
                            🌙
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
                  </div>

                  <div className="rounded-3xl border border-orange-100 bg-orange-50 px-5 py-4">
                    <p className="text-sm font-black text-orange-800">
                      Importante
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-orange-700">
                      A alteração será aplicada ao sistema depois de clicar em Salvar configurações. A identidade laranja do Rentix permanece nos dois temas.
                    </p>
                  </div>
                </div>
              )}

              {activeSettingsTab === "print" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      Impressos
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      Visualize e edite os modelos de PDF que já existem no sistema.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {(Object.keys(printTemplates) as PrintDocumentKey[]).map((documentKey) => {
                      const template = printTemplates[documentKey];

                      return (
                        <div
                          key={documentKey}
                          className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm"
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-orange-100 text-2xl">
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

                              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                                <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                                  Modelo atual
                                </p>
                                <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-slate-600">
                                  {template.content}
                                </p>
                              </div>

                              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleOpenPrintModal(documentKey, "view")}
                                  className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                                >
                                  Visualizar
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenPrintModal(documentKey, "edit")}
                                  className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
                                >
                                  Editar modelo
                                </button>
                              </div>
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
                      Use variáveis como {"{companyName}"}, {"{personName}"}, {"{propertyName}"}, {"{dueDate}"}, {"{amount}"} e {"{pixKey}"}.
                      Elas serão substituídas pelos dados reais no momento da geração do PDF.
                    </p>
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
                onClick={handleBackToDashboard}
                className="rounded-2xl bg-slate-100 px-6 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
              >
                Voltar
              </button>

              <button
                type="button"
                onClick={handleOpenSaveConfirmModal}
                className="rounded-2xl bg-orange-500 px-6 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
              >
                Salvar configurações
              </button>
            </div>
          </div>
        </div>

        {isSaveConfirmModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-2xl">
              <div className="bg-gradient-to-r from-orange-50 via-white to-white px-6 py-6">
                <div className="flex flex-col items-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-100 text-3xl">
                    ⚙️
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
                    className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmSaveSettings}
                    className="rounded-2xl bg-orange-500 px-6 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
                  >
                    Confirmar e salvar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {printModalState.isOpen && selectedPrintTemplate && printModalState.documentKey && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-2xl">
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
                    ×
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-6">
                {printModalState.mode === "view" ? (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                    <div className="mx-auto min-h-[620px] max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
                      <pre className="whitespace-pre-wrap font-sans text-sm font-semibold leading-7 text-slate-700">
                        {selectedPrintTemplate.content}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    <div className="space-y-4">
                      <div className="rounded-3xl border border-orange-100 bg-orange-50 px-4 py-4">
                        <p className="text-sm font-black text-orange-800">
                          Edição do modelo
                        </p>
                        <p className="mt-1 text-sm font-semibold leading-6 text-orange-700">
                          Edite somente o texto padrão do impresso. A prévia ao lado será atualizada em tempo real com dados simulados.
                        </p>
                      </div>

                      <textarea
                        value={selectedPrintTemplate.content}
                        onChange={(event) =>
                          handleUpdatePrintTemplateContent(printModalState.documentKey!, event.target.value)
                        }
                        rows={22}
                        className="w-full resize-none rounded-3xl border border-slate-200 bg-white px-5 py-4 font-mono text-sm font-semibold leading-6 text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                      />

                      <button
                        type="button"
                        onClick={() => handleResetPrintTemplate(printModalState.documentKey!)}
                        className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                      >
                        Restaurar modelo padrão
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-sm font-black text-slate-800">
                          Pré-visualização em tempo real
                        </p>
                        <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                          Esta prévia usa dados de exemplo apenas para mostrar como o texto ficará no documento final.
                        </p>
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <div className="mx-auto min-h-[620px] rounded-2xl bg-white p-8 shadow-sm">
                          <pre className="whitespace-pre-wrap font-sans text-sm font-semibold leading-7 text-slate-700">
                            {renderPrintTemplatePreview(
                              selectedPrintTemplate.content,
                              printModalState.documentKey
                            )}
                          </pre>
                        </div>
                      </div>
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
    </div>
  );
}
