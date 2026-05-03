export type PrintTemplates = {
  contract: string;
  carne: string;
};

const DEFAULT_TEMPLATES: PrintTemplates = {
  contract: `CONTRATO TEMPORÁRIO

LOCADOR: {companyName}
LOCATÁRIO: {personName}
IMÓVEL: {propertyName}

VALOR: {amount}
VENCIMENTO: {dueDate}

CHAVE PIX: {pixKey}
`,
  carne: `CARNÊ DE PAGAMENTO

EMPRESA: {companyName}
CLIENTE: {personName}

VALOR: {amount}
VENCIMENTO: {dueDate}
`
};

export function getPrintTemplates(): PrintTemplates {
  if (typeof window === "undefined") return DEFAULT_TEMPLATES;

  const data = localStorage.getItem("rentix_print_templates");

  if (!data) return DEFAULT_TEMPLATES;

  try {
    return JSON.parse(data);
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

export function savePrintTemplates(templates: PrintTemplates) {
  localStorage.setItem("rentix_print_templates", JSON.stringify(templates));
}

export function parseTemplate(template: string, data: Record<string, string>) {
  let result = template;

  Object.keys(data).forEach((key) => {
    const regex = new RegExp(`{${key}}`, "g");
    result = result.replace(regex, data[key]);
  });

  return result;
}