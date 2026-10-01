"use client";

import type {
  Property as ApiProperty,
  AssetCategory,
  PropertyType,
  PropertyManagementMode,
  AssetOperationalStatus,
  PropertyStatus,
} from "@/services/properties.service";

export type {
  ApiProperty,
  AssetCategory,
  PropertyType,
  PropertyManagementMode,
  AssetOperationalStatus,
  PropertyStatus,
};

export type PropertyRegistrationFilterStatus = "All" | "Active" | "Inactive";
export type PropertyRentalFilterStatus = "All" | PropertyStatus;
export type PropertyCategoryFilterStatus = "All" | AssetCategory;
export type PropertyOperationalFilterStatus = "All" | AssetOperationalStatus;

export type Property = {
  id: string;
  code: string;
  assetCategory: AssetCategory;
  type: PropertyType;
  name: string;
  brand: string;
  model: string;
  serialNumber: string;
  licensePlate: string;
  manufactureYear: number;
  condition: string;
  patrimonyCode: string;
  zipCode: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  number: string;
  complement: string;
  address: string;
  rentValue: number;
  operationalStatus: AssetOperationalStatus;
  bedrooms: number;
  bathrooms: number;
  garages: number;
  description: string;
  status: PropertyStatus;
  isActive: boolean;
  ownerId: string;
  ownerName: string;
  managementMode: PropertyManagementMode;
  administrationFeePercentage: number;
  ownerPayoutDay: number;
  autoCreateOwnerPayable: boolean;
  photos?: string | null;
};

export type PropertyMovementType =
  | "Created"
  | "Updated"
  | "Inactivated"
  | "DeletionBlocked"
  | "InactivationBlocked";

export type PropertyMovement = {
  id: string;
  propertyId: string;
  propertyName: string;
  type: PropertyMovementType;
  description: string;
  createdAt: string;
};

export type RentalHistoryContract = {
  id: string | number;
  propertyId: string;
  property_id?: string;
  property?: string;
  propertyCode?: string;
  property_id_fk?: string;
  propertyName?: string;
  tenantId?: string | number;
  tenantName?: string;
  tenantDocument?: string;
  startDate?: string;
  endDate?: string;
  rentValue?: number;
  status?: string;
  isTemporaryRental?: boolean;
  checkInTime?: string;
  checkOutTime?: string;
};

export type RentalCharge = {
  id: string;
  contractId?: string | number | null;
  property?: string;
  tenant?: string;
  amount?: number;
  dueDate?: string;
  paid?: boolean;
  status?: string;
};

export type CompanySettings = {
  companyName: string;
  tradeName: string;
  document: string;
  phone: string;
  email: string;
  address: string;
  logo: string;
};

export type PropertyModalDraft = {
  editingPropertyId: string | null;
  code: string;
  assetCategory: AssetCategory;
  type: PropertyType;
  name: string;
  brand: string;
  model: string;
  serialNumber: string;
  licensePlate: string;
  manufactureYear: string;
  condition: string;
  patrimonyCode: string;
  zipCode: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  number: string;
  complement: string;
  rentValue: string;
  operationalStatus: AssetOperationalStatus;
  bedrooms: string;
  bathrooms: string;
  garages: string;
  description: string;
  isActive: boolean;
  ownerId: string;
  managementMode: PropertyManagementMode;
  administrationFeePercentage: string;
  ownerPayoutDay: string;
  autoCreateOwnerPayable: boolean;
};

export const assetCategories: Array<{ label: string; value: AssetCategory }> = [
  { label: "Imóvel", value: "PROPERTY" },
  { label: "Equipamento", value: "EQUIPMENT" },
  { label: "Máquina", value: "MACHINE" },
  { label: "Veículo", value: "VEHICLE" },
  { label: "Ferramenta", value: "TOOL" },
  { label: "Outro bem", value: "OTHER" },
];

export const assetTypesByCategory: Record<
  AssetCategory,
  Array<{ label: string; value: string }>
> = {
  PROPERTY: [
    { label: "Apartamento", value: "Apartment" },
    { label: "Casa", value: "House" },
    { label: "Comercial", value: "Commercial" },
    { label: "Galpão / Depósito", value: "Warehouse" },
    { label: "Sala Comercial", value: "Office" },
    { label: "Chalé", value: "Cabin" },
    { label: "Chácara / Sítio", value: "Farm" },
    { label: "Terreno", value: "Land" },
    { label: "Outro", value: "Other" },
  ],
  MACHINE: [
    { label: "Escavadeira", value: "Excavator" },
    { label: "Retroescavadeira", value: "Backhoe" },
    { label: "Pá Carregadeira", value: "WheelLoader" },
    { label: "Motoniveladora", value: "MotorGrader" },
    { label: "Trator", value: "Tractor" },
    { label: "Rolo Compactador", value: "Compactor" },
    { label: "Empilhadeira", value: "Forklift" },
    { label: "Plataforma Elevatória", value: "AerialPlatform" },
    { label: "Guindaste / Munck", value: "Crane" },
    { label: "Betoneira", value: "ConcreteMixer" },
    { label: "Outro", value: "Other" },
  ],
  EQUIPMENT: [
    { label: "Gerador de Energia", value: "Generator" },
    { label: "Compressor de Ar", value: "AirCompressor" },
    { label: "Bomba D'água", value: "WaterPump" },
    { label: "Andaime / Estrutura", value: "Scaffolding" },
    { label: "Compactador de Solo (Sapo)", value: "Rammer" },
    { label: "Placa Vibratória", value: "PlateCompactor" },
    { label: "Lavadora de Alta Pressão", value: "PressureWasher" },
    { label: "Guincho / Talha", value: "Hoist" },
    { label: "Torre de Iluminação", value: "LightTower" },
    { label: "Outro", value: "Other" },
  ],
  VEHICLE: [
    { label: "Caminhão", value: "Truck" },
    { label: "Caminhonete / Picape", value: "Pickup" },
    { label: "Van / Furgão", value: "Van" },
    { label: "Carro de Passeio", value: "Car" },
    { label: "Utilitário", value: "Utility" },
    { label: "Reboque / Carretinha", value: "Trailer" },
    { label: "Moto", value: "Motorcycle" },
    { label: "Outro", value: "Other" },
  ],
  TOOL: [
    { label: "Martelete / Rompedor", value: "DemolitionHammer" },
    { label: "Furadeira / Parafusadeira", value: "Drill" },
    { label: "Esmerilhadeira / Lixadeira", value: "Grinder" },
    { label: "Serra Circular / Mármore", value: "Saw" },
    { label: "Máquina de Solda", value: "Welder" },
    { label: "Nível Laser / Medidor", value: "LaserLevel" },
    { label: "Roçadeira / Cortador", value: "BrushCutter" },
    { label: "Ferramenta Manual", value: "HandTool" },
    { label: "Outro", value: "Other" },
  ],
  OTHER: [
    { label: "Mobiliário", value: "Furniture" },
    { label: "TI / Informática", value: "IT" },
    { label: "Eletrônico / Áudio e Vídeo", value: "Electronics" },
    { label: "Estrutura / Tenda", value: "Structure" },
    { label: "Outro", value: "Other" },
  ],
};

export const propertyTypes: Array<{ label: string; value: PropertyType }> =
  assetTypesByCategory.PROPERTY as Array<{ label: string; value: PropertyType }>;

export function getAssetTypesForCategory(
  category: AssetCategory | string | null | undefined
): Array<{ label: string; value: string }> {
  if (!category || !(category in assetTypesByCategory)) {
    return assetTypesByCategory.PROPERTY;
  }
  return assetTypesByCategory[category as AssetCategory];
}

export const assetConditionOptions = [
  "Novo",
  "Excelente",
  "Bom",
  "Regular",
  "Precisa de manutenção",
];

export const operationalStatusOptions: Array<{
  label: string;
  value: AssetOperationalStatus;
  badgeClass: string;
  dotClass: string;
  icon: string;
}> = [
  {
    label: "Disponível",
    value: "AVAILABLE",
    badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dotClass: "bg-emerald-500",
    icon: "🟢",
  },
  {
    label: "Alugado",
    value: "RENTED",
    badgeClass: "bg-blue-50 text-blue-800 border-blue-200",
    dotClass: "bg-blue-500",
    icon: "🔵",
  },
  {
    label: "Em Manutenção",
    value: "MAINTENANCE",
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200",
    dotClass: "bg-amber-500",
    icon: "🟠",
  },
  {
    label: "Reservado",
    value: "RESERVED",
    badgeClass: "bg-purple-50 text-purple-800 border-purple-200",
    dotClass: "bg-purple-500",
    icon: "🟣",
  },
  {
    label: "Inativo",
    value: "INACTIVE",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
    dotClass: "bg-slate-400",
    icon: "⚪",
  },
];

export function formatCurrency(value: number | string | null | undefined): string {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amount);
}

export function formatDate(value?: string | null): string {
  if (!value) return "-";
  const [year, month, day] = value.split("T")[0].split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export function toUpperText(value: string | null | undefined): string {
  return String(value || "").trim().toUpperCase();
}

export function normalizeSearchText(value: string | null | undefined): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function getAssetCategoryLabel(value: AssetCategory): string {
  return assetCategories.find((item) => item.value === value)?.label || "Outro bem";
}

export function getPropertyTypeLabel(
  value: PropertyType | string | null | undefined,
  category?: AssetCategory | string | null
): string {
  if (!value) return "Outro";

  // Se a categoria foi informada, prioriza a busca nos tipos da categoria
  if (category && category in assetTypesByCategory) {
    const found = assetTypesByCategory[category as AssetCategory].find(
      (item) =>
        item.value === value ||
        item.label.toLowerCase() === String(value).toLowerCase()
    );
    if (found) return found.label;
  }

  // Busca em todas as categorias
  for (const catList of Object.values(assetTypesByCategory)) {
    const found = catList.find(
      (item) =>
        item.value === value ||
        item.label.toLowerCase() === String(value).toLowerCase()
    );
    if (found) return found.label;
  }

  return String(value);
}

export function getOperationalStatusConfig(status: AssetOperationalStatus | string) {
  return (
    operationalStatusOptions.find((item) => item.value === status) || {
      label: status || "Disponível",
      value: (status as AssetOperationalStatus) || "AVAILABLE",
      badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
      dotClass: "bg-slate-400",
      icon: "⚪",
    }
  );
}

export function getAssetTechnicalSummary(property: Property): string {
  const details = [
    property.brand,
    property.model,
    property.serialNumber ? `S/N: ${property.serialNumber}` : "",
    property.licensePlate ? `PLACA: ${property.licensePlate}` : "",
    property.patrimonyCode ? `PATR.: ${property.patrimonyCode}` : "",
  ].filter(Boolean);

  return details.join(" • ");
}

export function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]/g, "_")
    .replace(/_+/g, "_");
}

export function isContractActive(status: string | null | undefined): boolean {
  if (!status) return true;
  const s = String(status).trim().toUpperCase();
  return s === "ACTIVE" || s === "ATIVO";
}

export const ASSET_MAINTENANCE_SCHEDULE_DRAFT_KEY = "contrx_asset_maintenance_schedule_draft";

export type AssetMaintenanceScheduleDraft = {
  propertyId: string;
  propertyName: string;
  code?: string;
  patrimonyCode?: string;
  assetCategory?: string;
  type?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  licensePlate?: string;
  ownerId?: string;
  ownerName?: string;
  address?: string;
  description?: string;
  defaultDate?: string;
  defaultTime?: string;
  reason?: string;
};
