import {
  Contract,
  Property,
  ContrxTenant,
  CompanySettings,
  TemplateData,
  ContractRenewalRecord,
  formatCurrency,
  formatDate,
  formatLongDateForPrint,
  getContractDurationInDays,
  getContractDurationInMonths,
  getContractRentDueDay,
  formatDocumentForPrint,
  formatFullAddressForPrint,
  getAssetCategoryLabel,
} from "./contract-types";
import {
  getCachedCompanySettings,
  getCachedPrintTemplates,
} from "@/services/settings-cache";
import {
  getCompanyStorageItem,
  setCompanyStorageItem,
  removeCompanyStorageItem,
} from "@/services/company-storage";
import {
  DEFAULT_SETTINGS_TEMPORARY_CONTRACT_CONTENT,
  ORIGINAL_STANDARD_RESIDENTIAL_CONTRACT_TEMPLATE,
  DEFAULT_ASSET_CONTRACT_TEMPLATE,
} from "@/app/contratos/templates";

export function isRealEstateCategory(assetCategory?: string | null): boolean {
  if (!assetCategory) return true;
  const normalized = assetCategory.trim().toUpperCase();
  return normalized === "PROPERTY" || normalized === "IMOVEL" || normalized === "IMÓVEL";
}

export function resolveContractDocumentKey(
  contract: { isTemporaryRental?: boolean },
  property?: { assetCategory?: string | null }
): "assetContract" | "temporaryContract" | "standardContract" {
  // Regra 1: Contrato de bens e ativo deve ser usado para contratos de bens (não-imobiliários)
  if (!isRealEstateCategory(property?.assetCategory)) {
    return "assetContract";
  }

  // Regra 2: Contrato temporário deve ser usado para aluguéis de imóveis temporários
  if (contract.isTemporaryRental) {
    return "temporaryContract";
  }

  // Regra 3: Contrato padrão é para aluguéis de imóveis onde não é temporário
  return "standardContract";
}

export function isLegacyStandardContractContent(content?: string | null): boolean {
  if (!content) return false;
  const trimmed = content.trim();
  return (
    trimmed.includes("CLÁUSULA DÉCIMA - DO FORO") &&
    !trimmed.includes("CLÁUSULA DÉCIMA PRIMEIRA")
  );
}

export function getEffectiveContractTemplateContent(
  key: "temporaryContract" | "standardContract" | "assetContract",
  fallback: string
): string {
  const isLegacy = (content?: string | null) => {
    if (key === "standardContract") {
      return isLegacyStandardContractContent(content);
    }
    return false;
  };

  const cached = getCachedPrintTemplates();
  if (cached && typeof cached === "object") {
    const template = (cached as Record<string, { content?: string }>)[key];
    if (template?.content?.trim() && !isLegacy(template.content)) {
      return template.content;
    }
  }
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("contrx_print_templates");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed[key]?.content?.trim() && !isLegacy(parsed[key].content)) {
          return parsed[key].content;
        }
      }
    } catch {}
  }
  return fallback;
}

export function escapeHtml(value: string) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function getCompanySettingsForContractPrint(): CompanySettings {
  const cached = getCachedCompanySettings();
  if (cached) {
    const source = getNestedCompanySettingsSource(cached);
    const normalized = normalizeCompanySettingsSource(source);
    if (normalized.name || normalized.legalName || normalized.document) {
      return normalized;
    }
  }
  return {};
}

function getNestedCompanySettingsSource(source: Record<string, unknown>) {
  const nestedKeys = ["company", "companySettings", "companyData", "business", "businessData", "registration"];
  for (const key of nestedKeys) {
    const val = source[key];
    if (val && typeof val === "object" && !Array.isArray(val)) {
      return val as Record<string, unknown>;
    }
  }
  return source;
}

function normalizeCompanySettingsSource(source: Record<string, unknown>): CompanySettings {
  return {
    name: getFirstStringValue(source, ["name", "companyName", "fantasyName", "tradeName", "nomeFantasia", "nome"]),
    legalName: getFirstStringValue(source, ["legalName", "corporateName", "businessName", "razaoSocial", "companyLegalName"]),
    document: getFirstStringValue(source, ["document", "cnpj", "cpfCnpj", "taxId", "companyDocument"]),
    stateRegistration: getFirstStringValue(source, ["stateRegistration", "ie", "inscricaoEstadual"]),
    email: getFirstStringValue(source, ["email", "companyEmail", "contactEmail"]),
    phone: getFirstStringValue(source, ["phone", "companyPhone", "whatsapp", "cellphone", "mobile"]),
    zipCode: getFirstStringValue(source, ["zipCode", "cep", "postalCode"]),
    state: getFirstStringValue(source, ["state", "uf"]),
    city: getFirstStringValue(source, ["city", "cidade", "municipality", "municipio"]),
    street: getFirstStringValue(source, ["street", "logradouro", "address", "endereco"]),
    number: getFirstStringValue(source, ["number", "numero", "addressNumber"]),
    neighborhood: getFirstStringValue(source, ["neighborhood", "bairro", "district"]),
    complement: getFirstStringValue(source, ["complement", "complemento", "addressComplement"]),
    pixKey: getFirstStringValue(source, ["pixKey", "pix", "companyPixKey"]),
    contractCity: getFirstStringValue(source, ["contractCity", "cityForContract", "signatureCity"]),
    contractDefaultNotes: getFirstStringValue(source, ["contractDefaultNotes", "defaultContractNotes", "contractNotes"]),
  };
}

function getFirstStringValue(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

export function renderContractTemplate(templateContent: string, templateData: TemplateData) {
  return Object.entries(templateData).reduce((renderedContent, [key, value]) => {
    return renderedContent.replace(new RegExp(`{${key}}`, "g"), value);
  }, templateContent);
}

export function getSavedContractCustomContent(companyId: string | undefined, contractId: string): string | null {
  if (typeof window === "undefined" || !contractId) return null;
  const key = `contrx_custom_contract_content_${contractId}`;
  const scopedVal = getCompanyStorageItem(companyId, key, key);
  if (scopedVal) return scopedVal;
  return localStorage.getItem(key);
}

export function saveContractCustomContent(companyId: string | undefined, contractId: string, content: string) {
  if (typeof window === "undefined" || !contractId) return;
  const key = `contrx_custom_contract_content_${contractId}`;
  setCompanyStorageItem(companyId, key, content);
  localStorage.setItem(key, content);
}

export function removeSavedContractCustomContent(companyId: string | undefined, contractId: string) {
  if (typeof window === "undefined" || !contractId) return;
  const key = `contrx_custom_contract_content_${contractId}`;
  removeCompanyStorageItem(companyId, key);
  localStorage.removeItem(key);
}

export function getDefaultContractText(
  contract: Contract,
  property?: Property,
  tenant?: ContrxTenant
): string {
  const companySettings = getCompanySettingsForContractPrint();
  const landlordName = companySettings.legalName || companySettings.name || "LOCADOR NÃO INFORMADO";
  const landlordDocument = formatDocumentForPrint(companySettings.document || "");
  const landlordAddress = formatFullAddressForPrint({
    street: companySettings.street,
    number: companySettings.number,
    neighborhood: companySettings.neighborhood,
    city: companySettings.city,
    state: companySettings.state,
    zipCode: companySettings.zipCode,
    complement: companySettings.complement,
  });
  const tenantName = contract.tenantName || tenant?.name || "LOCATÁRIO NÃO INFORMADO";
  const tenantDocument = formatDocumentForPrint(tenant?.cpf || tenant?.document || "");
  const tenantAddress = formatFullAddressForPrint({
    street: tenant?.street,
    number: tenant?.number,
    neighborhood: tenant?.neighborhood,
    city: tenant?.city,
    state: tenant?.state,
    zipCode: tenant?.zipCode,
    complement: tenant?.complement,
  });
  const propertyName = contract.propertyName || property?.name || "BEM/ATIVO NÃO INFORMADO";
  const assetCategory = property ? getAssetCategoryLabel(property.assetCategory) : "Imóvel";
  const propertyAddress = formatFullAddressForPrint({
    street: property?.street,
    number: property?.number,
    neighborhood: property?.neighborhood,
    city: property?.city,
    state: property?.state,
    zipCode: property?.zipCode,
    complement: property?.complement,
  });

  const locationText =
    companySettings.contractCity ||
    (property?.city && property?.state
      ? `${property.city}/${property.state}`
      : companySettings.city && companySettings.state
      ? `${companySettings.city}/${companySettings.state}`
      : "______/__");

  const documentKey = resolveContractDocumentKey(contract, property);

  if (documentKey === "assetContract") {
    const durationInMonths = getContractDurationInMonths(contract.startDate, contract.endDate);
    const durationInDays = getContractDurationInDays(contract.startDate, contract.endDate);
    const formattedAmount = formatCurrency(contract.rentValue);
    const penaltyAmount = formatCurrency(Number(contract.rentValue || 0) * 3);
    const dueDay = getContractRentDueDay(contract.startDate);

    const templateData: TemplateData = {
      companyName: landlordName,
      tradeName: companySettings.name || landlordName,
      landlordName,
      landlordDocument: landlordDocument || "não informado",
      landlordAddress: landlordAddress || "endereço não informado",
      companyEmail: companySettings.email || "não informado",
      companyPhone: companySettings.phone || "não informado",
      personName: tenantName,
      tenantName,
      tenantDocument: tenantDocument || "não informado",
      tenantAddress: tenantAddress || "endereço não informado",
      tenantPhone: tenant?.phone || "não informado",
      tenantEmail: tenant?.email || "não informado",
      propertyName,
      assetCategory,
      propertyAddress: propertyAddress || "endereço não informado",
      startDate: formatDate(contract.startDate),
      endDate: formatDate(contract.endDate),
      contractMonths: String(durationInMonths),
      contractDays: String(durationInDays),
      amount: formattedAmount,
      rentValue: formattedAmount,
      monthlyAmount: formattedAmount,
      penaltyAmount,
      dueDay: String(dueDay),
      pixKey: companySettings.pixKey || "não informado",
      contractCity: locationText,
      currentDate: formatLongDateForPrint(new Date()),
      contractDefaultNotes: companySettings.contractDefaultNotes || "",
    };

    return renderContractTemplate(
      getEffectiveContractTemplateContent("assetContract", DEFAULT_ASSET_CONTRACT_TEMPLATE),
      templateData
    );
  }

  if (documentKey === "temporaryContract") {
    const durationInDays = getContractDurationInDays(contract.startDate, contract.endDate);
    const totalAmount = formatCurrency(contract.rentValue);

    const templateData: TemplateData = {
      companyName: landlordName,
      tradeName: companySettings.name || landlordName,
      landlordName,
      landlordDocument: landlordDocument || "não informado",
      landlordAddress: landlordAddress || "endereço não informado",
      companyEmail: companySettings.email || "não informado",
      companyPhone: companySettings.phone || "não informado",
      personName: tenantName,
      tenantName,
      tenantDocument: tenantDocument || "não informado",
      tenantAddress: tenantAddress || "endereço não informado",
      tenantPhone: tenant?.phone || "não informado",
      tenantEmail: tenant?.email || "não informado",
      propertyName,
      assetCategory,
      propertyAddress: propertyAddress || "endereço não informado",
      startDate: formatDate(contract.startDate),
      endDate: formatDate(contract.endDate),
      contractMonths: "1",
      contractDays: String(durationInDays),
      amount: totalAmount,
      rentValue: totalAmount,
      monthlyAmount: totalAmount,
      penaltyAmount: formatCurrency(Number(contract.rentValue || 0) * 0.2),
      dueDay: getContractRentDueDay(contract.startDate),
      pixKey: companySettings.pixKey || "não informado",
      contractCity: locationText,
      currentDate: formatLongDateForPrint(new Date()),
      contractDefaultNotes: companySettings.contractDefaultNotes || "",
      entryTime: contract.checkInTime || "14:00",
      exitTime: contract.checkOutTime || "12:00",
    };

    return renderContractTemplate(
      getEffectiveContractTemplateContent("temporaryContract", DEFAULT_SETTINGS_TEMPORARY_CONTRACT_CONTENT),
      templateData
    );
  }

  // standardContract: Imóvel não-temporário
  const durationInMonths = getContractDurationInMonths(contract.startDate, contract.endDate);
  const monthlyAmount = formatCurrency(contract.rentValue);
  const penaltyAmount = formatCurrency(Number(contract.rentValue || 0) * 3);
  const dueDay = getContractRentDueDay(contract.startDate);

  const templateData: TemplateData = {
    companyName: landlordName,
    tradeName: companySettings.name || landlordName,
    landlordName,
    landlordDocument: landlordDocument || "não informado",
    landlordAddress: landlordAddress || "endereço não informado",
    companyEmail: companySettings.email || "não informado",
    companyPhone: companySettings.phone || "não informado",
    personName: tenantName,
    tenantName,
    tenantDocument: tenantDocument || "não informado",
    tenantAddress: tenantAddress || "endereço não informado",
    tenantPhone: tenant?.phone || "não informado",
    tenantEmail: tenant?.email || "não informado",
    propertyName,
    assetCategory,
    propertyAddress: propertyAddress || "endereço não informado",
    startDate: formatDate(contract.startDate),
    endDate: formatDate(contract.endDate),
    contractMonths: String(durationInMonths),
    contractDays: String(getContractDurationInDays(contract.startDate, contract.endDate)),
    amount: monthlyAmount,
    rentValue: monthlyAmount,
    monthlyAmount,
    penaltyAmount,
    dueDay: String(dueDay),
    pixKey: companySettings.pixKey || "não informado",
    contractCity: locationText,
    currentDate: formatLongDateForPrint(new Date()),
    contractDefaultNotes: companySettings.contractDefaultNotes || "",
  };

  return renderContractTemplate(
    getEffectiveContractTemplateContent("standardContract", ORIGINAL_STANDARD_RESIDENTIAL_CONTRACT_TEMPLATE),
    templateData
  );
}

export function buildAssetContractHtml(
  contract: Contract,
  property?: Property,
  tenant?: ContrxTenant,
  showToolbar = false
) {
  const companySettings = getCompanySettingsForContractPrint();
  const landlordName = companySettings.legalName || companySettings.name || "LOCADOR NÃO INFORMADO";
  const landlordDocument = formatDocumentForPrint(companySettings.document || "");
  const landlordAddress = formatFullAddressForPrint({
    street: companySettings.street,
    number: companySettings.number,
    neighborhood: companySettings.neighborhood,
    city: companySettings.city,
    state: companySettings.state,
    zipCode: companySettings.zipCode,
    complement: companySettings.complement,
  });
  const tenantName = contract.tenantName || tenant?.name || "LOCATÁRIO NÃO INFORMADO";
  const tenantDocument = formatDocumentForPrint(tenant?.cpf || tenant?.document || "");
  const tenantAddress = formatFullAddressForPrint({
    street: tenant?.street,
    number: tenant?.number,
    neighborhood: tenant?.neighborhood,
    city: tenant?.city,
    state: tenant?.state,
    zipCode: tenant?.zipCode,
    complement: tenant?.complement,
  });
  const propertyName = contract.propertyName || property?.name || "BEM/ATIVO NÃO INFORMADO";
  const assetCategory = property ? getAssetCategoryLabel(property.assetCategory) : "Equipamento/Máquina";
  const propertyAddress = formatFullAddressForPrint({
    street: property?.street,
    number: property?.number,
    neighborhood: property?.neighborhood,
    city: property?.city,
    state: property?.state,
    zipCode: property?.zipCode,
    complement: property?.complement,
  });

  const locationText =
    property?.city && property?.state
      ? `${property.city}/${property.state}`
      : companySettings.city && companySettings.state
      ? `${companySettings.city}/${companySettings.state}`
      : "______/__";

  const durationInMonths = getContractDurationInMonths(contract.startDate, contract.endDate);
  const formattedAmount = formatCurrency(contract.rentValue);
  const penaltyAmount = formatCurrency(Number(contract.rentValue || 0) * 3);
  const dueDay = getContractRentDueDay(contract.startDate);

  const templateData: TemplateData = {
    companyName: landlordName,
    tradeName: companySettings.name || landlordName,
    landlordName,
    landlordDocument: landlordDocument || "não informado",
    landlordAddress: landlordAddress || "endereço não informado",
    companyEmail: companySettings.email || "não informado",
    companyPhone: companySettings.phone || "não informado",
    personName: tenantName,
    tenantName,
    tenantDocument: tenantDocument || "não informado",
    tenantAddress: tenantAddress || "endereço não informado",
    tenantPhone: tenant?.phone || "não informado",
    tenantEmail: tenant?.email || "não informado",
    propertyName,
    assetCategory,
    propertyAddress: propertyAddress || "endereço não informado",
    startDate: formatDate(contract.startDate),
    endDate: formatDate(contract.endDate),
    contractMonths: String(durationInMonths),
    contractDays: String(getContractDurationInDays(contract.startDate, contract.endDate)),
    amount: formattedAmount,
    rentValue: formattedAmount,
    monthlyAmount: formattedAmount,
    penaltyAmount,
    dueDay: String(dueDay),
    pixKey: companySettings.pixKey || "não informado",
    contractCity: companySettings.contractCity || locationText,
    currentDate: formatLongDateForPrint(new Date()),
    contractDefaultNotes: companySettings.contractDefaultNotes || "",
  };

  return buildConfiguredContractHtml(
    getEffectiveContractTemplateContent("assetContract", DEFAULT_ASSET_CONTRACT_TEMPLATE),
    templateData,
    showToolbar
  );
}

export function buildStandardResidentialContractHtml(
  contract: Contract,
  property?: Property,
  tenant?: ContrxTenant,
  showToolbar = false
) {
  const companySettings = getCompanySettingsForContractPrint();
  const landlordName = companySettings.legalName || companySettings.name || "LOCADOR NÃO INFORMADO";
  const landlordDocument = formatDocumentForPrint(companySettings.document || "");
  const landlordAddress = formatFullAddressForPrint({
    street: companySettings.street,
    number: companySettings.number,
    neighborhood: companySettings.neighborhood,
    city: companySettings.city,
    state: companySettings.state,
    zipCode: companySettings.zipCode,
    complement: companySettings.complement,
  });
  const tenantName = contract.tenantName || tenant?.name || "LOCATÁRIO NÃO INFORMADO";
  const tenantDocument = formatDocumentForPrint(tenant?.cpf || tenant?.document || "");
  const tenantAddress = formatFullAddressForPrint({
    street: tenant?.street,
    number: tenant?.number,
    neighborhood: tenant?.neighborhood,
    city: tenant?.city,
    state: tenant?.state,
    zipCode: tenant?.zipCode,
    complement: tenant?.complement,
  });
  const propertyName = contract.propertyName || property?.name || "BEM/ATIVO NÃO INFORMADO";
  const assetCategory = property ? getAssetCategoryLabel(property.assetCategory) : "Imóvel";
  const propertyAddress = formatFullAddressForPrint({
    street: property?.street,
    number: property?.number,
    neighborhood: property?.neighborhood,
    city: property?.city,
    state: property?.state,
    zipCode: property?.zipCode,
    complement: property?.complement,
  });

  const locationText =
    property?.city && property?.state
      ? `${property.city}/${property.state}`
      : companySettings.city && companySettings.state
      ? `${companySettings.city}/${companySettings.state}`
      : "______/__";

  const durationInMonths = getContractDurationInMonths(contract.startDate, contract.endDate);
  const monthlyAmount = formatCurrency(contract.rentValue);
  const penaltyAmount = formatCurrency(Number(contract.rentValue || 0) * 3);
  const dueDay = getContractRentDueDay(contract.startDate);

  const templateData: TemplateData = {
    companyName: landlordName,
    tradeName: companySettings.name || landlordName,
    landlordName,
    landlordDocument: landlordDocument || "não informado",
    landlordAddress: landlordAddress || "endereço não informado",
    companyEmail: companySettings.email || "não informado",
    companyPhone: companySettings.phone || "não informado",
    personName: tenantName,
    tenantName,
    tenantDocument: tenantDocument || "não informado",
    tenantAddress: tenantAddress || "endereço não informado",
    tenantPhone: tenant?.phone || "não informado",
    tenantEmail: tenant?.email || "não informado",
    propertyName,
    assetCategory,
    propertyAddress: propertyAddress || "endereço não informado",
    startDate: formatDate(contract.startDate),
    endDate: formatDate(contract.endDate),
    contractMonths: String(durationInMonths),
    contractDays: String(getContractDurationInDays(contract.startDate, contract.endDate)),
    amount: monthlyAmount,
    rentValue: monthlyAmount,
    monthlyAmount,
    penaltyAmount,
    dueDay: String(dueDay),
    pixKey: companySettings.pixKey || "não informado",
    contractCity: companySettings.contractCity || locationText,
    currentDate: formatLongDateForPrint(new Date()),
    contractDefaultNotes: companySettings.contractDefaultNotes || "",
  };

  return buildConfiguredContractHtml(
    getEffectiveContractTemplateContent("standardContract", ORIGINAL_STANDARD_RESIDENTIAL_CONTRACT_TEMPLATE),
    templateData,
    showToolbar
  );
}

export function buildTemporaryRentalContractHtml(
  contract: Contract,
  property?: Property,
  tenant?: ContrxTenant,
  showToolbar = false
) {
  const companySettings = getCompanySettingsForContractPrint();
  const landlordName = companySettings.legalName || companySettings.name || "LOCADOR NÃO INFORMADO";
  const landlordDocument = formatDocumentForPrint(companySettings.document || "");
  const landlordAddress = formatFullAddressForPrint({
    street: companySettings.street,
    number: companySettings.number,
    neighborhood: companySettings.neighborhood,
    city: companySettings.city,
    state: companySettings.state,
    zipCode: companySettings.zipCode,
    complement: companySettings.complement,
  });
  const tenantName = contract.tenantName || tenant?.name || "LOCATÁRIO NÃO INFORMADO";
  const tenantDocument = formatDocumentForPrint(tenant?.cpf || tenant?.document || "");
  const tenantAddress = formatFullAddressForPrint({
    street: tenant?.street,
    number: tenant?.number,
    neighborhood: tenant?.neighborhood,
    city: tenant?.city,
    state: tenant?.state,
    zipCode: tenant?.zipCode,
    complement: tenant?.complement,
  });
  const propertyName = contract.propertyName || property?.name || "BEM/ATIVO NÃO INFORMADO";
  const assetCategory = property ? getAssetCategoryLabel(property.assetCategory) : "Imóvel";
  const propertyAddress = formatFullAddressForPrint({
    street: property?.street,
    number: property?.number,
    neighborhood: property?.neighborhood,
    city: property?.city,
    state: property?.state,
    zipCode: property?.zipCode,
    complement: property?.complement,
  });

  const locationText =
    companySettings.contractCity ||
    (property?.city && property?.state
      ? `${property.city}/${property.state}`
      : companySettings.city && companySettings.state
      ? `${companySettings.city}/${companySettings.state}`
      : "______/__");

  const durationInDays = getContractDurationInDays(contract.startDate, contract.endDate);
  const totalAmount = formatCurrency(contract.rentValue);

  const templateData: TemplateData = {
    companyName: landlordName,
    tradeName: companySettings.name || landlordName,
    landlordName,
    landlordDocument: landlordDocument || "não informado",
    landlordAddress: landlordAddress || "endereço não informado",
    companyEmail: companySettings.email || "não informado",
    companyPhone: companySettings.phone || "não informado",
    personName: tenantName,
    tenantName,
    tenantDocument: tenantDocument || "não informado",
    tenantAddress: tenantAddress || "endereço não informado",
    tenantPhone: tenant?.phone || "não informado",
    tenantEmail: tenant?.email || "não informado",
    propertyName,
    assetCategory,
    propertyAddress: propertyAddress || "endereço não informado",
    startDate: formatDate(contract.startDate),
    endDate: formatDate(contract.endDate),
    contractMonths: "1",
    contractDays: String(durationInDays),
    amount: totalAmount,
    rentValue: totalAmount,
    monthlyAmount: totalAmount,
    penaltyAmount: formatCurrency(Number(contract.rentValue || 0) * 0.2),
    dueDay: getContractRentDueDay(contract.startDate),
    pixKey: companySettings.pixKey || "não informado",
    contractCity: locationText,
    currentDate: formatLongDateForPrint(new Date()),
    contractDefaultNotes: companySettings.contractDefaultNotes || "",
    entryTime: contract.checkInTime || "14:00",
    exitTime: contract.checkOutTime || "12:00",
  };

  return buildConfiguredContractHtml(
    getEffectiveContractTemplateContent("temporaryContract", DEFAULT_SETTINGS_TEMPORARY_CONTRACT_CONTENT),
    templateData,
    showToolbar
  );
}

export function buildContractHtml(
  contract: Contract,
  property?: Property,
  tenant?: ContrxTenant,
  showToolbar = false
): string {
  const documentKey = resolveContractDocumentKey(contract, property);

  if (documentKey === "assetContract") {
    return buildAssetContractHtml(contract, property, tenant, showToolbar);
  }

  if (documentKey === "temporaryContract") {
    return buildTemporaryRentalContractHtml(contract, property, tenant, showToolbar);
  }

  return buildStandardResidentialContractHtml(contract, property, tenant, showToolbar);
}

export function buildConfiguredContractHtml(
  templateContent: string,
  templateData: TemplateData,
  showToolbar: boolean
) {
  const renderedContent = renderContractTemplate(templateContent, templateData);

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Contrato de Locação</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #e5e7eb; color: #111827; font-family: Arial, Helvetica, sans-serif; }
    .toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: flex-end; gap: 12px; padding: 14px 18px; background: #ffffff; border-bottom: 1px solid #e5e7eb; }
    .toolbar button { border: 0; border-radius: 12px; padding: 10px 18px; font-weight: 800; cursor: pointer; font-size: 13px; }
    .print-button { background: #f97316; color: #ffffff; }
    .close-button { background: #f1f5f9; color: #334155; }
    .page { width: 210mm; min-height: 297mm; margin: 18px auto; background: #ffffff; box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12); }
    .page-inner { padding: 18mm; }
    .content { white-space: pre-wrap; font-size: 12.5px; line-height: 1.65; font-weight: 500; color: #222; }
    @media print {
      body { background: #ffffff; }
      .toolbar { display: none; }
      .page { width: 210mm; min-height: 297mm; margin: 0; box-shadow: none; }
      .page-inner { padding: 18mm; }
    }
  </style>
</head>
<body>
  ${showToolbar ? `<div class="toolbar">
    <button class="close-button" onclick="window.close()">Fechar</button>
    <button class="print-button" onclick="window.print()">Imprimir Contrato</button>
  </div>` : ""}

  <main class="page">
    <div class="page-inner">
      <div class="content" contenteditable="${!showToolbar}" spellcheck="false">${escapeHtml(renderedContent)}</div>
    </div>
  </main>
</body>
</html>`;
}

export function buildCustomContentContractHtml(customContent: string, showToolbar: boolean) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Contrato de Locação Personalizado</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #e5e7eb; color: #111827; font-family: Arial, Helvetica, sans-serif; }
    .toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: flex-end; gap: 12px; padding: 14px 18px; background: #ffffff; border-bottom: 1px solid #e5e7eb; }
    .toolbar button { border: 0; border-radius: 12px; padding: 10px 18px; font-weight: 800; cursor: pointer; font-size: 13px; }
    .print-button { background: #f97316; color: #ffffff; }
    .close-button { background: #f1f5f9; color: #334155; }
    .page { width: 210mm; min-height: 297mm; margin: 18px auto; background: #ffffff; box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12); }
    .page-inner { padding: 18mm; }
    .content { white-space: pre-wrap; font-size: 12.5px; line-height: 1.65; font-weight: 500; color: #222; }
    @media print {
      body { background: #ffffff; }
      .toolbar { display: none; }
      .page { width: 210mm; min-height: 297mm; margin: 0; box-shadow: none; }
      .page-inner { padding: 18mm; }
    }
  </style>
</head>
<body>
  ${showToolbar ? `<div class="toolbar">
    <button class="close-button" onclick="window.close()">Fechar</button>
    <button class="print-button" onclick="window.print()">Imprimir Contrato</button>
  </div>` : ""}

  <main class="page">
    <div class="page-inner">
      <div class="content" contenteditable="${!showToolbar}" spellcheck="false">${escapeHtml(customContent)}</div>
    </div>
  </main>
</body>
</html>`;
}

export function buildPrintableAdendumHtml(
  contract: Contract,
  renewal: ContractRenewalRecord,
  showToolbar = false
) {
  const companySettings = getCompanySettingsForContractPrint();
  const landlordName = companySettings.legalName || companySettings.name || "LOCADOR NÃO INFORMADO";
  const landlordDocument = formatDocumentForPrint(companySettings.document || "");
  const tenantName = contract.tenantName || "LOCATÁRIO NÃO INFORMADO";
  const propertyName = contract.propertyName || "BEM/ATIVO NÃO INFORMADO";

  const content = `ADITIVO DE RENOVAÇÃO DE CONTRATO DE LOCAÇÃO

LOCADOR: ${landlordName}, Documento: ${landlordDocument || "não informado"}
LOCATÁRIO: ${tenantName}
IMÓVEL / BEM: ${propertyName}

As partes acima qualificadas têm entre si, justo e contratado, o presente Termo Aditivo de Renovação de Contrato de Locação, que se regerá pelas seguintes cláusulas e condições:

CLÁUSULA PRIMEIRA - DA RENOVAÇÃO
Fica renovado o prazo de locação do imóvel/bem acima descrito, cujo término anterior era em ${formatDate(renewal.previousEndDate)}, passando o novo término para ${formatDate(renewal.newEndDate)}.

CLÁUSULA SEGUNDA - DO VALOR DO ALUGUEL
O valor do aluguel mensal que era de ${formatCurrency(renewal.previousRentValue)} passa a ser de ${formatCurrency(renewal.newRentValue)}, mantendo-se inalteradas as demais condições e datas de vencimento estabelecidas no contrato original.

CLÁUSULA TERCEIRA - DA RATIFICAÇÃO
Permanecem em pleno vigor e ratificam-se todas as demais cláusulas e condições do Contrato de Locação original que não tenham sido expressamente modificadas por este Aditivo.

E, por estarem assim justas e contratadas, as partes assinam o presente aditivo em 02 (duas) vias de igual teor e forma.

${companySettings.contractCity || "__________________"}, ${formatLongDateForPrint(new Date(renewal.renewedAt || new Date()))}.

_________________________________________________________
LOCADOR: ${landlordName}

_________________________________________________________
LOCATÁRIO: ${tenantName}
`;

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Aditivo de Renovação</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #e5e7eb; color: #111827; font-family: Arial, Helvetica, sans-serif; }
    .toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: flex-end; gap: 12px; padding: 14px 18px; background: #ffffff; border-bottom: 1px solid #e5e7eb; }
    .toolbar button { border: 0; border-radius: 12px; padding: 10px 18px; font-weight: 800; cursor: pointer; }
    .print-button { background: #10b981; color: #ffffff; }
    .close-button { background: #f1f5f9; color: #334155; }
    .page { width: 210mm; min-height: 297mm; margin: 18px auto; background: #ffffff; box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12); }
    .page-inner { padding: 18mm; }
    .content { white-space: pre-wrap; font-size: 13.5px; line-height: 1.8; font-weight: 500; color: #333; }
    @media print {
      body { background: #ffffff; }
      .toolbar { display: none; }
      .page { width: 210mm; min-height: 297mm; margin: 0; box-shadow: none; }
      .page-inner { padding: 18mm; }
    }
  </style>
</head>
<body>
  ${showToolbar ? `<div class="toolbar">
    <button class="close-button" onclick="window.close()">Fechar</button>
    <button class="print-button" onclick="window.print()">Imprimir Aditivo</button>
  </div>` : ""}

  <main class="page">
    <div class="page-inner">
      <div class="content" contenteditable="${!showToolbar}" spellcheck="false">${escapeHtml(content)}</div>
    </div>
  </main>
</body>
</html>`;
}
