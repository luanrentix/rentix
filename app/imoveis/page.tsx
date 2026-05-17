"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LoaderCircle, Maximize2, Minimize2, Search, X } from "lucide-react";
import {
  createProperty,
  getProperties,
  updateProperty,
  type Property as ApiProperty,
} from "@/services/properties.service";
import { getContracts, type Contract as ApiContract } from "@/services/contracts.service";
import { getReceivableAccounts, type ReceivableAccount } from "@/services/financial.service";
import {
  createPropertyMovement,
  getPropertyMovements,
  type PropertyMovement as ApiPropertyMovement,
} from "@/services/property-movements.service";
import { getCompanyStorageItem } from "@/services/company-storage";
import { getCachedCompanySettings } from "@/services/settings-cache";



type PropertyStatus = "Available" | "Rented";

type PropertyRegistrationFilterStatus = "All" | "Active" | "Inactive";

type PropertyRentalFilterStatus = "All" | PropertyStatus;

type PropertyType =
  | "Apartment"
  | "House"
  | "Cabin"
  | "Farm"
  | "Commercial"
  | "Land"
  | "Other";

type Property = {
  id: string;
  code: string;
  type: PropertyType;
  name: string;
  zipCode: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  number: string;
  complement: string;
  address: string;
  rentValue: number;
  bedrooms: number;
  bathrooms: number;
  garages: number;
  description: string;
  status: PropertyStatus;
  isActive: boolean;
};

type PropertyMovementType =
  | "Created"
  | "Updated"
  | "Inactivated"
  | "DeletionBlocked"
  | "InactivationBlocked";

type PropertyMovement = {
  id: string;
  propertyId: string;
  propertyName: string;
  type: PropertyMovementType;
  description: string;
  createdAt: string;
};

type RentalHistoryContract = {
  id: string | number;
  propertyId: string;
  property_id?: string;
  property?: string;
  propertyCode?: string;
  property_id_fk?: string;
  propertyName?: string;
  tenantId?: string | number;
  tenantName?: string;
  startDate?: string;
  endDate?: string;
  rentValue?: number;
  status?: string;
};

type RentalCharge = {
  id: string;
  contractId?: string | number | null;
  property?: string;
  tenant?: string;
  amount?: number;
  dueDate?: string;
  paid?: boolean;
  status?: string;
};

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

type CompanySettings = {
  companyName: string;
  tradeName: string;
  document: string;
  phone: string;
  email: string;
  address: string;
  logo: string;
};

const propertyTypes: Array<{ label: string; value: PropertyType }> = [
  { label: "Apartamento", value: "Apartment" },
  { label: "Casa", value: "House" },
  { label: "Chalé", value: "Cabin" },
  { label: "Chácara", value: "Farm" },
  { label: "Comercial", value: "Commercial" },
  { label: "Terreno", value: "Land" },
  { label: "Outro", value: "Other" },
];

const activeRentalStatuses = ["Active", "Expiring"];

function buildAddress(
  propertyStreet: string,
  propertyNumber: string,
  propertyNeighborhood: string,
  propertyCity: string,
  propertyState: string,
  propertyZipCode: string,
) {
  const addressParts = [
    propertyStreet,
    propertyNumber,
    propertyNeighborhood,
    propertyCity,
    propertyState,
    propertyZipCode,
  ].filter(Boolean);

  return toUpperText(addressParts.join(", "));
}

function propertyHasActiveContract(
  propertyId: string,
  contractSource: RentalHistoryContract[],
) {
  return contractSource.some((contract) => {
    const contractPropertyId =
      contract.propertyId ||
      contract.property_id ||
      contract.property ||
      contract.propertyCode ||
      contract.property_id_fk;

    const isSameProperty = String(contractPropertyId || "") === propertyId;
    const isActiveContract =
      !contract.status ||
      activeRentalStatuses.includes(contract.status);

    return isSameProperty && isActiveContract;
  });
}

function normalizeApiProperty(
  property: ApiProperty,
  contractSource: RentalHistoryContract[],
): Property {
  const normalizedType = isValidPropertyType(property.type)
    ? property.type
    : "Other";

  const propertyStatus: PropertyStatus = propertyHasActiveContract(
    property.id,
    contractSource,
  )
    ? "Rented"
    : "Available";

  return {
    id: property.id,
    code: toUpperText(property.code || ""),
    type: normalizedType,
    name: toUpperText(property.title || ""),
    zipCode: property.zipCode || "",
    state: toUpperText(property.state || ""),
    city: toUpperText(property.city || ""),
    neighborhood: toUpperText(property.district || ""),
    street: toUpperText(property.address || ""),
    number: toUpperText(property.number || ""),
    complement: toUpperText(property.complement || ""),
    address: buildAddress(
      property.address || "",
      property.number || "",
      property.district || "",
      property.city || "",
      property.state || "",
      property.zipCode || "",
    ),
    rentValue: Number(property.rentalValue || 0),
    bedrooms: Number(property.bedrooms || 0),
    bathrooms: Number(property.bathrooms || 0),
    garages: Number(property.garages || 0),
    description: property.description || "",
    status: propertyStatus,
    isActive: property.isActive ?? true,
  };
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyMovements, setPropertyMovements] = useState<PropertyMovement[]>([]);
  const [contracts, setContracts] = useState<RentalHistoryContract[]>([]);
  const [rentalCharges, setRentalCharges] = useState<RentalCharge[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFormMinimized, setIsFormMinimized] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [propertyToInactivate, setPropertyToInactivate] = useState<Property | null>(null);
  const [blockedInactiveProperty, setBlockedInactiveProperty] = useState<Property | null>(null);
  const [pendingInactiveConfirmation, setPendingInactiveConfirmation] =
    useState<Property | null>(null);
    const [historyProperty, setHistoryProperty] = useState<Property | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(
    getEmptyCompanySettings()
  );
  const [reportMode, setReportMode] = useState<"General" | "Rental">("General");

  const [code, setCode] = useState("");
  const [type, setType] = useState<PropertyType>("Apartment");
  const [name, setName] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [rentValue, setRentValue] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [garages, setGarages] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSavingProperty, setIsSavingProperty] = useState(false);
  const [isZipCodeLoading, setIsZipCodeLoading] = useState(false);
  const [zipCodeFeedback, setZipCodeFeedback] = useState("");

  const [search, setSearch] = useState("");
  const [registrationFilter, setRegistrationFilter] =
    useState<PropertyRegistrationFilterStatus>("Active");
  const [rentalFilter, setRentalFilter] = useState<PropertyRentalFilterStatus>("All");
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);

  useEffect(() => {
    function applyStoredTheme() {
      const currentCompanyId = getCurrentCompanyId();
      const storedThemeSettings = getCompanyStorageItem(
        currentCompanyId,
        "contrx_theme_settings",
        "contrx_theme_settings",
      );
      const legacyTheme = getCompanyStorageItem(
        currentCompanyId,
        "contrx_theme",
        "contrx_theme",
      );

      try {
        const parsedThemeSettings = storedThemeSettings
          ? (JSON.parse(storedThemeSettings) as { mode?: string })
          : null;

        const isBlackTheme =
          parsedThemeSettings?.mode === "graphite" ||
          legacyTheme === "graphite" ||
          legacyTheme === "grafite" ||
          parsedThemeSettings?.mode === "black" ||
          parsedThemeSettings?.mode === "dark" ||
          legacyTheme === "black" ||
          legacyTheme === "dark";

        document.documentElement.classList.toggle("dark", isBlackTheme);
      } catch {
        document.documentElement.classList.toggle(
          "dark",
          legacyTheme === "graphite" ||
            legacyTheme === "grafite" ||
            legacyTheme === "black" ||
            legacyTheme === "dark"
        );
      }
    }

    applyStoredTheme();

    window.addEventListener("storage", applyStoredTheme);
    window.addEventListener("contrx-theme-change", applyStoredTheme);

    return () => {
      window.removeEventListener("storage", applyStoredTheme);
      window.removeEventListener("contrx-theme-change", applyStoredTheme);
    };
  }, []);

  const filteredProperties = useMemo(() => {
    const normalizedSearch = normalizeSearchText(search);

    return properties.filter((property) => {
      const matchesSearch =
        !normalizedSearch ||
        normalizeSearchText(property.code).includes(normalizedSearch) ||
        normalizeSearchText(property.name).includes(normalizedSearch) ||
        normalizeSearchText(property.address).includes(normalizedSearch) ||
        normalizeSearchText(property.city).includes(normalizedSearch) ||
        normalizeSearchText(property.neighborhood).includes(normalizedSearch);

      const matchesRegistration =
        registrationFilter === "All" ||
        (registrationFilter === "Active" && property.isActive) ||
        (registrationFilter === "Inactive" && !property.isActive);

      const matchesRental =
        rentalFilter === "All" || property.status === rentalFilter;

      return matchesSearch && matchesRegistration && matchesRental;
    });
  }, [properties, registrationFilter, rentalFilter, search]);

  const activeProperties = properties.filter((property) => property.isActive).length;
  const inactiveProperties = properties.filter((property) => !property.isActive).length;
  const rentedProperties = properties.filter(
    (property) => property.status === "Rented" && property.isActive,
  ).length;
  const totalMonthlyRevenue = properties
    .filter((property) => property.status === "Rented" && property.isActive)
    .reduce((total, property) => total + property.rentValue, 0);

  const occupancyRate =
    activeProperties > 0 ? Math.round((rentedProperties / activeProperties) * 100) : 0;

  const visibleTimelineMovements = propertyMovements.filter((movement) => {
    if (!historyProperty) return false;

    return movement.propertyId === historyProperty.id;
  });

  const rentalHistoryRecords = useMemo(() => {
    if (!historyProperty) return [];

    return getRentalHistoryByProperty(historyProperty, contracts);
  }, [historyProperty, contracts]);

  const loadProperties = useCallback(async () => {
    const companyId = getCurrentCompanyId();

    if (!companyId) {
      setProperties([]);
      setIsLoadingProperties(false);
      return;
    }

    try {
      setIsLoadingProperties(true);

      const [response, apiContracts, apiCharges, apiMovements] = await Promise.all([
        getProperties(companyId),
        getContracts(companyId),
        getReceivableAccounts(companyId),
        getPropertyMovements(companyId),
      ]);

      const normalizedContracts = apiContracts.map(mapApiContractToRentalHistory);
      const normalizedProperties = response.map((property) =>
        normalizeApiProperty(property, normalizedContracts),
      );

      setContracts(normalizedContracts);
      setRentalCharges(apiCharges.map(mapApiChargeToRentalCharge));
      setPropertyMovements(apiMovements.map(mapApiPropertyMovementToPropertyMovement));
      setProperties(normalizedProperties);
    } catch (error) {
      console.error("Erro ao carregar imóveis:", error);
      alert("Não foi possível carregar os imóveis.");
    } finally {
      setIsLoadingProperties(false);
    }
  }, []);

  useEffect(() => {
    loadProperties();

    setCompanySettings(getStoredCompanySettings());
  }, [loadProperties]);

  function savePropertyMovements(updatedMovements: PropertyMovement[]) {
    setPropertyMovements(updatedMovements);
  }

  function registerPropertyMovement(
    property: Pick<Property, "id" | "name">,
    typeValue: PropertyMovementType,
    description: string
  ) {
    const movement: PropertyMovement = {
      id: crypto.randomUUID(),
      propertyId: property.id,
      propertyName: property.name,
      type: typeValue,
      description,
      createdAt: new Date().toISOString(),
    };

    savePropertyMovements([movement, ...propertyMovements]);

    const companyId = getCurrentCompanyId();

    if (!companyId) return;

    createPropertyMovement({
      companyId,
      propertyId: property.id,
      propertyName: property.name,
      type: typeValue,
      description,
    }).catch((error) => {
      console.warn("Não foi possível registrar movimentação do imóvel no backend.", error);
    });
  }

  function resetForm() {
    setCode("");
    setType("Apartment");
    setName("");
    setZipCode("");
    setState("");
    setCity("");
    setNeighborhood("");
    setStreet("");
    setNumber("");
    setComplement("");
    setRentValue("");
    setBedrooms("");
    setBathrooms("");
    setGarages("");
    setDescription("");
    setIsActive(true);
    setZipCodeFeedback("");
    setEditingPropertyId(null);
  }

  function handleOpenCreateForm() {
    resetForm();
    setIsFormMinimized(false);
    setIsFormOpen(true);
  }

  function handleCloseForm() {
    resetForm();
    setIsFormMinimized(false);
    setIsFormOpen(false);
  }

  function handleZipCodeChange(value: string) {
    setZipCode(formatZipCode(value));
    setZipCodeFeedback("");
  }

  async function handleZipCodeBlur() {
    await handleZipCodeLookup();
  }

  async function handleZipCodeLookup() {
    const cleanZipCode = zipCode.replace(/\D/g, "");

    if (cleanZipCode.length !== 8 || isZipCodeLoading) return;

    try {
      setIsZipCodeLoading(true);
      setZipCodeFeedback("Consultando CEP...");

      const response = await fetch(`https://viacep.com.br/ws/${cleanZipCode}/json/`);
      const data = (await response.json()) as ViaCepResponse;

      if (data.erro) {
        setZipCodeFeedback("CEP não encontrado.");
        return;
      }

      setZipCode(formatZipCode(data.cep || cleanZipCode));
      setState(toUpperText(data.uf || ""));
      setCity(toUpperText(data.localidade || ""));
      setNeighborhood(toUpperText(data.bairro || ""));
      setStreet(toUpperText(data.logradouro || ""));
      setZipCodeFeedback("Endereço preenchido pelo CEP.");
    } catch {
      setZipCodeFeedback("Não foi possível consultar o CEP no momento.");
    } finally {
      setIsZipCodeLoading(false);
    }
  }

  function getEditingProperty() {
    if (!editingPropertyId) return null;

    return properties.find((property) => property.id === editingPropertyId) || null;
  }

  function handleActiveChange(checked: boolean) {
    if (checked) {
      setIsActive(true);
      setPendingInactiveConfirmation(null);
      return;
    }

    if (!editingPropertyId) {
      setIsActive(false);
      return;
    }

    const property = getEditingProperty();

    if (!property) return;

    if (propertyHasActiveContract(editingPropertyId, contracts)) {
      registerPropertyMovement(
        property,
        "InactivationBlocked",
        "Tentativa de inativação bloqueada porque o imóvel possui contrato ativo."
      );
      setBlockedInactiveProperty(property);
      return;
    }

    setPendingInactiveConfirmation(property);
  }

  function handleCancelInactiveConfirmation() {
    setPendingInactiveConfirmation(null);
    setIsActive(true);
  }

  function handleConfirmInactiveFromForm() {
    if (!pendingInactiveConfirmation) return;

    setIsActive(false);
    setPendingInactiveConfirmation(null);
  }

  async function handleSaveProperty() {
    if (isSavingProperty) return;

    const formattedName = toUpperText(name);
    const formattedCode = toUpperText(code);
    const formattedState = toUpperText(state);
    const formattedCity = toUpperText(city);
    const formattedNeighborhood = toUpperText(neighborhood);
    const formattedStreet = toUpperText(street);
    const formattedNumber = toUpperText(number);
    const formattedComplement = toUpperText(complement);
    const parsedRentValue = parseCurrencyValue(rentValue);
    const parsedBedrooms = parsePositiveInteger(bedrooms);
    const parsedBathrooms = parsePositiveInteger(bathrooms);
    const parsedGarages = parsePositiveInteger(garages);
    if (
      !type ||
      !formattedName ||
      !zipCode ||
      !formattedState ||
      !formattedCity ||
      !formattedNeighborhood ||
      !formattedStreet ||
      !formattedNumber ||
      parsedRentValue <= 0
    ) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    if (!isActive && editingPropertyId && propertyHasActiveContract(editingPropertyId, contracts)) {
      const property = getEditingProperty();

      if (property) {
        registerPropertyMovement(
          property,
          "InactivationBlocked",
          "Tentativa de salvar imóvel inativo bloqueada porque existe contrato ativo."
        );
        setBlockedInactiveProperty(property);
      }

      return;
    }

    const companyId = getCurrentCompanyId();

    if (!companyId) {
      alert("Empresa não identificada. Faça login novamente.");
      return;
    }

    const payload = {
      companyId,
      title: formattedName,
      code: formattedCode,
      type,
      rentalValue: parsedRentValue,
      zipCode,
      state: formattedState,
      city: formattedCity,
      district: formattedNeighborhood,
      address: formattedStreet,
      number: formattedNumber,
      complement: formattedComplement,
      bedrooms: parsedBedrooms,
      bathrooms: parsedBathrooms,
      garages: parsedGarages,
      description: description.trim(),
      isActive,
    };

    try {
      setIsSavingProperty(true);

      const savedProperty = editingPropertyId
        ? await updateProperty(editingPropertyId, payload)
        : await createProperty(payload);

      const normalizedProperty = normalizeApiProperty(savedProperty, contracts);

      setProperties((currentProperties) =>
        editingPropertyId
          ? currentProperties.map((property) =>
              property.id === normalizedProperty.id ? normalizedProperty : property
            )
          : [normalizedProperty, ...currentProperties]
      );

      registerPropertyMovement(
        normalizedProperty,
        editingPropertyId ? "Updated" : "Created",
        editingPropertyId ? "Cadastro do imóvel atualizado." : "Novo imóvel cadastrado.",
      );

      handleCloseForm();
      void loadProperties();
    } catch (error) {
      console.error("Erro ao salvar imóvel:", error);
      alert("Não foi possível salvar o imóvel.");
    } finally {
      setIsSavingProperty(false);
    }
  }

  function handleEditProperty(propertyId: string) {
    const property = properties.find((item) => item.id === propertyId);

    if (!property) return;

    setEditingPropertyId(property.id);
    setCode(property.code);
    setType(property.type);
    setName(property.name);
    setZipCode(property.zipCode);
    setState(property.state);
    setCity(property.city);
    setNeighborhood(property.neighborhood);
    setStreet(property.street);
    setNumber(property.number);
    setComplement(property.complement);
    setRentValue(formatCurrency(property.rentValue));
    setBedrooms(property.bedrooms ? String(property.bedrooms) : "");
    setBathrooms(property.bathrooms ? String(property.bathrooms) : "");
    setGarages(property.garages ? String(property.garages) : "");
    setDescription(property.description);
    setIsActive(property.isActive);
    setIsFormMinimized(false);
    setIsFormOpen(true);
  }

  function handleOpenPropertyHistory(property: Property) {
    setHistoryProperty(property);
    setReportMode("General");
      }

  function handleClosePropertyHistory() {
    setHistoryProperty(null);
      }

  function handleExportPropertyHistoryReport() {
    if (!historyProperty) return;

    document.title =
      reportMode === "Rental"
        ? `RELATORIO_ALUGUEL_IMOVEL_${sanitizeFileName(historyProperty.name)}`
        : `RELATORIO_HISTORICO_GERAL_IMOVEL_${sanitizeFileName(historyProperty.name)}`;

    setTimeout(() => {
      window.print();
    }, 100);
  }

  function handleRequestInactivateProperty(propertyId: string) {
    const property = properties.find((item) => item.id === propertyId);

    if (!property) return;

    if (!property.isActive) return;

    if (propertyHasActiveContract(property.id, contracts)) {
      registerPropertyMovement(
        property,
        "InactivationBlocked",
        "Tentativa de inativação bloqueada porque o imóvel possui contrato ativo."
      );
      setBlockedInactiveProperty(property);
      return;
    }

    setPropertyToInactivate(property);
  }

  function handleCancelInactivateProperty() {
    setPropertyToInactivate(null);
  }

  function handleCloseBlockedInactiveProperty() {
    setBlockedInactiveProperty(null);
  }

  async function handleConfirmInactivateProperty() {
    if (!propertyToInactivate) return;

    const updatedProperty: Property = {
      ...propertyToInactivate,
      isActive: false,
      status: "Available",
    };

    try {
      await updateProperty(propertyToInactivate.id, {
        isActive: false,
      });

      registerPropertyMovement(
        updatedProperty,
        "Inactivated",
        "Imóvel inativado no lugar de exclusão para manter histórico e integridade.",
      );

      await loadProperties();
      setPropertyToInactivate(null);
    } catch (error) {
      console.error("Erro ao inativar imóvel:", error);
      alert("Não foi possível inativar o imóvel.");
    }
  }

  function getPropertyTypeLabel(value: PropertyType) {
    return propertyTypes.find((item) => item.value === value)?.label || "Outro";
  }

  return (
    <>
      <style jsx global>{`
        .dark .contrx-properties-page {
          color: #f8fafc;
        }

        .dark .contrx-properties-page .bg-white {
          background-color: #0f172a !important;
        }

        .dark .contrx-properties-page .bg-slate-50,
        .dark .contrx-properties-page .bg-slate-100 {
          background-color: #111827 !important;
        }

        .dark .contrx-properties-page .bg-orange-50,
        .dark .contrx-properties-page .bg-orange-100,
        .dark .contrx-properties-page .bg-orange-50\/50,
        .dark .contrx-properties-page .bg-orange-50\/60,
        .dark .contrx-properties-page .bg-orange-50\/40 {
          background-color: rgba(249, 115, 22, 0.13) !important;
        }

        .dark .contrx-properties-page .bg-red-50,
        .dark .contrx-properties-page .bg-red-100 {
          background-color: rgba(239, 68, 68, 0.12) !important;
        }

        .dark .contrx-properties-page .bg-emerald-50,
        .dark .contrx-properties-page .bg-emerald-50\/50,
        .dark .contrx-properties-page .bg-emerald-100 {
          background-color: rgba(16, 185, 129, 0.12) !important;
        }

        .dark .contrx-properties-page .bg-amber-100 {
          background-color: rgba(245, 158, 11, 0.14) !important;
        }

        .dark .contrx-properties-page .bg-blue-100 {
          background-color: rgba(59, 130, 246, 0.14) !important;
        }

        .dark .contrx-properties-page .bg-zinc-200 {
          background-color: #334155 !important;
        }

        .dark .contrx-properties-page .text-slate-950,
        .dark .contrx-properties-page .text-slate-900,
        .dark .contrx-properties-page .text-slate-800,
        .dark .contrx-properties-page .text-slate-700 {
          color: #f8fafc !important;
        }

        .dark .contrx-properties-page .text-slate-600,
        .dark .contrx-properties-page .text-slate-500,
        .dark .contrx-properties-page .text-slate-400 {
          color: #cbd5e1 !important;
        }

        .dark .contrx-properties-page .text-orange-600,
        .dark .contrx-properties-page .text-orange-700,
        .dark .contrx-properties-page .text-orange-800 {
          color: #fb923c !important;
        }

        .dark .contrx-properties-page .text-red-600,
        .dark .contrx-properties-page .text-red-700 {
          color: #fca5a5 !important;
        }

        .dark .contrx-properties-page .text-emerald-700,
        .dark .contrx-properties-page .text-emerald-800 {
          color: #6ee7b7 !important;
        }

        .dark .contrx-properties-page .text-amber-700 {
          color: #fcd34d !important;
        }

        .dark .contrx-properties-page .border-orange-100,
        .dark .contrx-properties-page .border-orange-200,
        .dark .contrx-properties-page .border-red-100,
        .dark .contrx-properties-page .border-red-200,
        .dark .contrx-properties-page .border-emerald-200,
        .dark .contrx-properties-page .border-slate-100,
        .dark .contrx-properties-page .border-slate-200,
        .dark .contrx-properties-page .border-slate-300 {
          border-color: #334155 !important;
        }

        .dark .contrx-properties-page input,
        .dark .contrx-properties-page select,
        .dark .contrx-properties-page textarea {
          background-color: #020617 !important;
          border-color: #334155 !important;
          color: #f8fafc !important;
        }

        .dark .contrx-properties-page input::placeholder,
        .dark .contrx-properties-page textarea::placeholder {
          color: #64748b !important;
        }

        .dark .contrx-properties-page table,
        .dark .contrx-properties-page tbody,
        .dark .contrx-properties-page tr {
          background-color: #0f172a !important;
        }

        .dark .contrx-properties-page thead,
        .dark .contrx-properties-page .bg-orange-50 thead {
          background-color: rgba(249, 115, 22, 0.15) !important;
        }

        .dark .contrx-properties-page tbody tr:hover {
          background-color: #1e293b !important;
        }

        .dark .contrx-properties-page .divide-slate-100 > :not([hidden]) ~ :not([hidden]) {
          border-color: #1e293b !important;
        }

        .dark .contrx-properties-page .shadow-sm,
        .dark .contrx-properties-page .shadow-md,
        .dark .contrx-properties-page .shadow-2xl {
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.35) !important;
        }

        .dark .contrx-properties-page .disabled\:cursor-not-allowed:disabled {
          opacity: 0.9;
        }

        .dark .contrx-properties-page #property-history-report,
        .dark .contrx-properties-page #property-history-report .report-page {
          background: #ffffff !important;
          color: #111827 !important;
        }

        .dark .contrx-properties-page #property-history-report .report-section,
        .dark .contrx-properties-page #property-history-report .report-field,
        .dark .contrx-properties-page #property-history-report .report-kpi {
          background: #ffffff !important;
        }

        .dark .contrx-properties-page #property-history-report .report-title,
        .dark .contrx-properties-page #property-history-report .report-value {
          color: #0f172a !important;
        }

        .dark .contrx-properties-page #property-history-report .report-small,
        .dark .contrx-properties-page #property-history-report .report-label {
          color: #475569 !important;
        }

        #property-history-report .report-page {
          background: #ffffff;
        }

        #property-history-report .report-header {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 18px;
          align-items: start;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 24px;
          margin-bottom: 20px;
          background: linear-gradient(135deg, #fff7ed 0%, #ffffff 42%, #f8fafc 100%);
        }

        #property-history-report .report-title {
          font-size: 28px;
          line-height: 1.15;
          font-weight: 900;
          color: #0f172a;
          margin: 2px 0 0 0;
        }

        #property-history-report .report-subtitle {
          font-size: 12px;
          line-height: 1.35;
          color: #ea580c;
          margin: 0;
        }

        #property-history-report .report-small {
          font-size: 13px;
          line-height: 1.45;
          color: #475569;
          margin: 0;
        }

        #property-history-report .report-section {
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 20px;
          margin-top: 18px;
          background: #ffffff;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
        }

        #property-history-report .report-section-title {
          font-size: 18px;
          font-weight: 900;
          color: #0f172a;
          margin: 0 0 16px 0;
          padding-bottom: 12px;
          border-bottom: 1px solid #e2e8f0;
        }

        #property-history-report .report-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }

        #property-history-report .report-field {
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 14px;
          background: #f8fafc;
          min-height: 74px;
        }

        #property-history-report .report-field-wide {
          grid-column: span 2;
        }

        #property-history-report .report-label {
          font-size: 11px;
          line-height: 1.2;
          font-weight: 900;
          letter-spacing: .06em;
          text-transform: uppercase;
          color: #64748b;
          margin: 0 0 6px 0;
        }

        #property-history-report .report-value {
          font-size: 15px;
          line-height: 1.35;
          font-weight: 900;
          color: #0f172a;
          margin: 0;
          word-break: normal;
          overflow-wrap: break-word;
        }

        #property-history-report .report-kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 16px;
        }

        #property-history-report .report-kpi {
          border: 1px solid #fed7aa;
          border-radius: 20px;
          padding: 16px;
          background: #fff7ed;
        }

        #property-history-report .report-kpi-label {
          font-size: 11px;
          font-weight: 900;
          text-transform: uppercase;
          color: #9a3412;
          margin: 0;
        }

        #property-history-report .report-kpi-value {
          font-size: 24px;
          font-weight: 900;
          color: #0f172a;
          margin: 6px 0 0 0;
        }

        #property-history-report table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 13px;
          margin-top: 16px;
          overflow: hidden;
          border-radius: 16px;
        }

        #property-history-report th {
          background: #0f172a;
          border: 1px solid #0f172a;
          color: #ffffff;
          padding: 12px;
          text-align: left;
          font-weight: 900;
          line-height: 1.2;
        }

        #property-history-report td {
          border: 1px solid #e2e8f0;
          color: #334155;
          padding: 12px;
          vertical-align: top;
          line-height: 1.35;
          word-break: normal;
          overflow-wrap: break-word;
        }

        #property-history-report .report-footer {
          margin-top: 18px;
          padding-top: 12px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
        }

        @media (max-width: 900px) {
          #property-history-report .report-header {
            grid-template-columns: 1fr;
          }

          #property-history-report .report-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          #property-history-report .report-kpi-grid {
            grid-template-columns: 1fr;
          }
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }

          html,
          body {
            width: 210mm;
            min-height: auto !important;
            overflow: visible !important;
            background: #ffffff !important;
          }

          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden !important;
          }

          #property-history-report,
          #property-history-report * {
            visibility: visible !important;
          }

          #property-history-report {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 194mm !important;
            max-width: 194mm !important;
            min-height: 0 !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            background: #ffffff !important;
            color: #111827 !important;
            box-shadow: none !important;
            border: 0 !important;
            font-family: Arial, Helvetica, sans-serif !important;
          }

          #property-history-report .report-page {
            width: 194mm !important;
            max-width: 194mm !important;
            min-height: 0 !important;
            height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
          }

          #property-history-report .report-header {
            gap: 14px !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 10px !important;
            padding: 12px !important;
            margin-bottom: 10px !important;
            background: #f8fafc !important;
          }

          #property-history-report .report-title {
            font-size: 18px !important;
            line-height: 1.2 !important;
            margin: 0 !important;
          }

          #property-history-report .report-subtitle,
          #property-history-report .report-small {
            font-size: 10px !important;
            line-height: 1.35 !important;
            color: #475569 !important;
            margin: 0 !important;
          }

          #property-history-report .report-section {
            border: 1px solid #cbd5e1 !important;
            border-radius: 10px !important;
            padding: 10px !important;
            margin-top: 10px !important;
            box-shadow: none !important;
          }

          #property-history-report .report-section-title {
            font-size: 12px !important;
            margin: 0 0 8px 0 !important;
            padding-bottom: 6px !important;
          }

          #property-history-report .report-grid {
            grid-template-columns: repeat(4, 1fr) !important;
            gap: 8px !important;
          }

          #property-history-report .report-field {
            border-radius: 8px !important;
            padding: 7px !important;
            background: #f9fafb !important;
            min-height: 42px !important;
          }

          #property-history-report .report-label {
            font-size: 8px !important;
            margin: 0 0 3px 0 !important;
          }

          #property-history-report .report-value {
            font-size: 10px !important;
            line-height: 1.25 !important;
          }

          #property-history-report .report-kpi-grid {
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 8px !important;
            margin-top: 10px !important;
          }

          #property-history-report .report-kpi {
            border: 1px solid #cbd5e1 !important;
            border-radius: 10px !important;
            padding: 9px !important;
            background: #f8fafc !important;
          }

          #property-history-report .report-kpi-label {
            font-size: 8px !important;
            color: #64748b !important;
          }

          #property-history-report .report-kpi-value {
            font-size: 16px !important;
            margin: 3px 0 0 0 !important;
          }

          #property-history-report table {
            font-size: 9px !important;
            margin-top: 8px !important;
          }

          #property-history-report th {
            padding: 6px !important;
          }

          #property-history-report td {
            padding: 6px !important;
            line-height: 1.25 !important;
          }

          #property-history-report .report-footer {
            margin-top: 10px !important;
            padding-top: 6px !important;
            font-size: 9px !important;
          }

          #property-history-report .screen-only {
            display: none !important;
          }

          .print\:hidden {
            display: none !important;
          }

          .print\:block {
            display: block !important;
          }

          .print\:break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="contrx-properties-page space-y-8 print:space-y-0">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950">
              Imóveis
            </h1>
            <p className="mt-2 text-slate-500">
              Cadastre, acompanhe e gerencie os imóveis disponíveis para locação.
            </p>
          </div>

          <button
            onClick={handleOpenCreateForm}
            className="rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
          >
            + Novo imóvel
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard icon="🏢" title="Cadastrados" value={properties.length} detail="Total no sistema" />
          <SummaryCard icon="✅" title="Ativos" value={activeProperties} detail="Prontos para uso" />
          <SummaryCard icon="🚫" title="Inativos" value={inactiveProperties} detail="Histórico preservado" />
          <SummaryCard icon="🔑" title="Ocupação" value={`${occupancyRate}%`} detail={`${rentedProperties} alugado(s)`} />
          <SummaryCard icon="💰" title="Receita mensal" value={formatCurrency(totalMonthlyRevenue)} detail="Contratos ativos" />
        </div>

        <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                Imóveis cadastrados
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Exibindo {filteredProperties.length} de {properties.length} imóveis.
              </p>
            </div>

            <div className="grid w-full gap-3 md:grid-cols-[minmax(260px,1fr)_180px_190px] xl:max-w-4xl">
              <FormField label="Buscar">
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nome, endereço, cidade ou bairro"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </FormField>

              <FormField label="Cadastro">
                <select
                  value={registrationFilter}
                  onChange={(event) =>
                    setRegistrationFilter(event.target.value as PropertyRegistrationFilterStatus)
                  }
                  className="w-full appearance-auto rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                >
                  <option value="Active">Ativos</option>
                  <option value="Inactive">Inativos</option>
                  <option value="All">Todos</option>
                </select>
              </FormField>

              <FormField label="Locação">
                <select
                  value={rentalFilter}
                  onChange={(event) =>
                    setRentalFilter(event.target.value as PropertyRentalFilterStatus)
                  }
                  className="w-full appearance-auto rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                >
                  <option value="All">Todas</option>
                  <option value="Available">Disponíveis</option>
                  <option value="Rented">Alugados</option>
                </select>
              </FormField>
            </div>
          </div>

          {isLoadingProperties ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-[2fr_1fr_2fr_1fr_1fr_1fr_120px] gap-4 bg-orange-50 px-5 py-4">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div key={`property-loading-head-${index}`} className="h-4 rounded-full bg-orange-100" />
                ))}
              </div>
              <div className="divide-y divide-slate-100 bg-white">
                {Array.from({ length: 5 }).map((_, rowIndex) => (
                  <div
                    key={`property-loading-row-${rowIndex}`}
                    className="grid grid-cols-[2fr_1fr_2fr_1fr_1fr_1fr_120px] gap-4 px-5 py-5"
                  >
                    {Array.from({ length: 7 }).map((__, columnIndex) => (
                      <div
                        key={`property-loading-cell-${rowIndex}-${columnIndex}`}
                        className="h-4 rounded-full bg-slate-100"
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
              <h3 className="text-lg font-black text-slate-800">
                Nenhum imóvel encontrado
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Cadastre um novo imóvel ou ajuste os filtros aplicados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[1050px] border-collapse bg-white text-left">
                <thead className="bg-orange-50">
                  <tr>
                    <th className="px-5 py-4 text-sm font-black text-slate-700">Imóvel</th>
                    <th className="px-5 py-4 text-sm font-black text-slate-700">Tipo</th>
                    <th className="px-5 py-4 text-sm font-black text-slate-700">Localização</th>
                    <th className="px-5 py-4 text-sm font-black text-slate-700">Valor</th>
                    <th className="px-5 py-4 text-sm font-black text-slate-700">Cadastro</th>
                    <th className="px-5 py-4 text-sm font-black text-slate-700">Locação</th>
                    <th className="px-5 py-4 text-right text-sm font-black text-slate-700">Ações</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredProperties.map((property) => {
                    const currentRentalContract = getCurrentRentalContract(property, contracts);

                    return (
                    <tr
                      key={property.id}
                      className={`transition hover:bg-slate-50 ${!property.isActive ? "bg-slate-50 opacity-75" : ""}`}
                    >
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => handleOpenPropertyHistory(property)}
                          className="text-left font-black text-slate-900 transition hover:text-orange-600 hover:underline"
                          title="Clique para ver o histórico deste imóvel"
                        >
                          {property.name}
                        </button>
                        {property.code && (
                          <p className="text-xs font-black text-orange-600">
                            Código: {property.code}
                          </p>
                        )}
                        <p className="text-xs font-semibold text-slate-500">
                          CEP: {property.zipCode || "Não informado"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                        {getPropertyTypeLabel(property.type)}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                        <p>{property.address || "Endereço não informado"}</p>
                        <p className="mt-1 text-xs text-slate-400">{property.city || "-"} / {property.state || "-"}</p>
                      </td>

                      <td className="px-5 py-4 text-sm font-black text-slate-900">
                        {formatCurrency(property.rentValue)}
                      </td>

                      <td className="px-5 py-4">
                        <ActiveBadge isActive={property.isActive} />
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={property.status} />
                        {currentRentalContract && (
                          <p className="mt-2 max-w-[230px] text-xs font-semibold leading-5 text-slate-500">
                            {currentRentalContract.tenantName || "Locatário não informado"}
                            {currentRentalContract.endDate
                              ? ` até ${formatDate(currentRentalContract.endDate)}`
                              : ""}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditProperty(property.id)}
                            className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-orange-50 hover:text-orange-700"
                          >
                            Editar
                          </button>
                          {property.isActive && (
                            <button
                              type="button"
                              onClick={() => handleRequestInactivateProperty(property.id)}
                              className="rounded-xl bg-red-50 px-3 py-2 text-xs font-black text-red-600 transition hover:bg-red-100"
                            >
                              Inativar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {historyProperty && (
          <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-orange-100 bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-8 py-6 print:hidden">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">
                    Relatórios do imóvel
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Consulte o histórico geral ou apenas o histórico de aluguéis.
                  </p>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReportMode("General")}
                    className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
                      reportMode === "General"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Histórico geral
                  </button>

                  <button
                    type="button"
                    onClick={() => setReportMode("Rental")}
                    className={`rounded-2xl px-5 py-3 text-sm font-black transition ${
                      reportMode === "Rental"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Histórico de aluguel
                  </button>

                  <button
                    type="button"
                    onClick={handleExportPropertyHistoryReport}
                    className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
                  >
                    Exportar PDF
                  </button>

                  <button
                    type="button"
                    onClick={handleClosePropertyHistory}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-600 transition hover:bg-orange-50 hover:text-orange-600"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div id="property-history-report" className="bg-white p-8 print:p-0">
                <div className="report-page">
                  <div className="report-header">
                    <div className="flex items-start gap-4">
                      {companySettings.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={companySettings.logo}
                          alt="Logo da empresa"
                          className="h-16 w-16 rounded-2xl object-contain print:h-12 print:w-12 print:rounded-lg"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-300 text-xl font-black text-slate-700 print:h-12 print:w-12 print:rounded-lg print:text-base">
                          R
                        </div>
                      )}

                      <div>
                        <p className="report-subtitle font-black uppercase tracking-[0.18em] text-orange-600">
                          Contrx • Relatório
                        </p>
                        <h1 className="report-title">
                          {reportMode === "Rental"
                            ? "Histórico de Aluguel do Imóvel"
                            : "Histórico Geral do Imóvel"}
                        </h1>
                        <p className="report-small font-black">
                          {getCompanyDisplayName(companySettings)}
                        </p>
                        {companySettings.document && (
                          <p className="report-small">
                            CNPJ/CPF: {companySettings.document}
                          </p>
                        )}
                        {companySettings.address && (
                          <p className="report-small">
                            {companySettings.address}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right text-xs font-bold text-slate-600 print:rounded-lg print:border print:border-slate-300 print:bg-white print:px-3 print:py-2">
                      <p className="report-label">Gerado em</p>
                      <p className="report-value">{formatDateTime(new Date().toISOString())}</p>
                    </div>
                  </div>

                  <div className="report-section">
                    <h2 className="report-section-title">Dados do imóvel</h2>
                    <div className="report-grid">
                      <ReportInfo label="Imóvel" value={historyProperty.name} wide />
                      <ReportInfo label="Código" value={historyProperty.code || "Não informado"} />
                      <ReportInfo label="Valor mensal" value={formatCurrency(historyProperty.rentValue)} />
                      <ReportInfo label="Cadastro" value={historyProperty.isActive ? "Ativo" : "Inativo"} />
                      <ReportInfo label="Locação" value={historyProperty.status === "Rented" ? "Alugado" : "Disponível"} />
                      <ReportInfo
                        label="Características"
                        value={`${historyProperty.bedrooms || 0} quarto(s), ${historyProperty.bathrooms || 0} banheiro(s), ${historyProperty.garages || 0} vaga(s)`}
                      />
                      <ReportInfo label="CEP" value={historyProperty.zipCode || "Não informado"} />
                      <ReportInfo label="Cidade/UF" value={`${historyProperty.city || "-"} / ${historyProperty.state || "-"}`} />
                      <ReportInfo label="Bairro" value={historyProperty.neighborhood || "Não informado"} />
                      <ReportInfo label="Endereço" value={historyProperty.address || "Não informado"} wide />
                      <ReportInfo label="Descrição" value={historyProperty.description || "Não informado"} wide />
                    </div>
                  </div>

                  <div className="report-section">
                    <div className="flex items-center justify-between gap-4 print:block">
                      <h2 className="report-section-title !mb-0 !border-b-0 !pb-0">
                        {reportMode === "Rental" ? "Histórico de aluguel" : "Histórico geral"}
                      </h2>
                      <p className="report-small font-bold">
                        {reportMode === "Rental"
                          ? `${rentalHistoryRecords.length} registro(s) de aluguel`
                          : `${visibleTimelineMovements.length} movimentação(ões)`}
                      </p>
                    </div>

                    {reportMode === "General" ? (
                      <div data-report-section="general">
                        {visibleTimelineMovements.length === 0 ? (
                          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-500">
                            Nenhuma movimentação registrada para este imóvel.
                          </div>
                        ) : (
                          <div className="mt-4 space-y-2">
                            {visibleTimelineMovements.map((movement) => (
                              <div
                                key={movement.id}
                                className="print:break-inside-avoid rounded-2xl border border-slate-200 bg-slate-50 p-4 print:rounded-lg print:p-3"
                              >
                                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                                  <p className="text-sm font-black text-slate-900 print:text-[10px]">
                                    {getMovementTypeLabel(movement.type)}
                                  </p>
                                  <p className="text-xs font-bold text-slate-500 print:text-[9px]">
                                    {formatDateTime(movement.createdAt)}
                                  </p>
                                </div>

                                <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 print:mt-1 print:text-[10px] print:leading-4">
                                  {movement.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div data-report-section="rental">
                        {rentalHistoryRecords.length > 0 && (
                          <div className="report-kpi-grid">
                            <div className="report-kpi">
                              <p className="report-kpi-label">Total de contratos</p>
                              <p className="report-kpi-value">{rentalHistoryRecords.length}</p>
                            </div>
                            <div className="report-kpi">
                              <p className="report-kpi-label">Receita registrada</p>
                              <p className="report-kpi-value">
                                {formatCurrency(
                                  rentalHistoryRecords.reduce(
                                    (total, record) => total + Number(record.rentValue || 0),
                                    0
                                  )
                                )}
                              </p>
                            </div>
                            <div className="report-kpi">
                              <p className="report-kpi-label">Pagamentos pagos</p>
                              <p className="report-kpi-value">
                                {
                                  rentalHistoryRecords.filter(
                                    (record) => getRentalPaymentStatus(record, rentalCharges) === "Paid"
                                  ).length
                                }
                              </p>
                            </div>
                          </div>
                        )}

                        {rentalHistoryRecords.length === 0 ? (
                          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm font-semibold text-slate-500">
                            Nenhum histórico de aluguel encontrado para este imóvel.
                          </div>
                        ) : (
                          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 print:overflow-visible print:rounded-none print:border-0">
                            <table>
                              <thead>
                                <tr>
                                  <th style={{ width: "12%" }}>Início</th>
                                  <th style={{ width: "12%" }}>Fim</th>
                                  <th style={{ width: "28%" }}>Quem alugou</th>
                                  <th style={{ width: "14%" }}>Valor</th>
                                  <th style={{ width: "16%" }}>Contrato</th>
                                  <th style={{ width: "18%" }}>Pagamento</th>
                                </tr>
                              </thead>

                              <tbody>
                                {rentalHistoryRecords.map((record) => (
                                  <tr key={record.id}>
                                    <td>{formatDate(record.startDate || "")}</td>
                                    <td>{formatDate(record.endDate || "")}</td>
                                    <td className="font-black">{record.tenantName || "Não informado"}</td>
                                    <td className="font-black">{formatCurrency(Number(record.rentValue || 0))}</td>
                                    <td>{getRentalStatusLabel(String(record.status || ""))}</td>
                                    <td>{getPaymentStatusLabel(getRentalPaymentStatus(record, rentalCharges))}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="report-footer">
                    <span>
                      {getCompanyDisplayName(companySettings)} • {reportMode === "Rental" ? "Histórico de aluguel do imóvel" : "Histórico geral do imóvel"}
                    </span>
                    <span>
                      Gerado em {formatDateTime(new Date().toISOString())}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isFormOpen && isFormMinimized && (
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
                    {editingPropertyId ? "Editar imóvel" : "Novo imóvel"}
                  </p>
                  <p className="truncate text-sm font-semibold text-slate-500">
                    {name || "Cadastro em andamento"}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFormMinimized(false)}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600"
                    title="Restaurar modal"
                    aria-label="Restaurar modal"
                  >
                    <Maximize2 className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleCloseForm}
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
        )}

        {isFormOpen && !isFormMinimized && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] border border-orange-100 bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-8 py-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">
                    {editingPropertyId ? "Editar imóvel" : "Novo imóvel"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Preencha os dados principais do imóvel para locação.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFormMinimized(true)}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-orange-50 hover:text-orange-600"
                    title="Minimizar modal"
                    aria-label="Minimizar modal"
                  >
                    <Minimize2 className="h-5 w-5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-orange-50 hover:text-orange-600"
                    title="Fechar modal"
                    aria-label="Fechar modal"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="p-8">
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  <FormField label="Código">
                    <input
                      type="text"
                      value={code}
                      onChange={(event) => setCode(toUpperText(event.target.value))}
                      placeholder="Ex: IMV-001"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold uppercase text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </FormField>

                  <FormField label="Tipo de imóvel" required>
                    <select
                      value={type}
                      onChange={(event) => setType(event.target.value as PropertyType)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    >
                      {propertyTypes.map((propertyType) => (
                        <option key={propertyType.value} value={propertyType.value}>
                          {propertyType.label}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Disponibilidade">
                    <div className="min-h-[58px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-black text-slate-700">
                          Status automático
                        </span>
                        <StatusBadge
                          status={
                            editingPropertyId &&
                            propertyHasActiveContract(editingPropertyId, contracts)
                              ? "Rented"
                              : "Available"
                          }
                        />
                      </div>
                      <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                        O imóvel muda para alugado quando existe contrato ativo.
                      </p>
                    </div>
                  </FormField>

                  <FormField label="Situação do cadastro">
                    <div className="space-y-2">
                      <label
                        className={`flex min-h-[58px] cursor-pointer items-center gap-3 rounded-2xl border px-4 py-4 text-sm font-black transition ${
                          isActive
                            ? "border-emerald-200 bg-emerald-50/50 text-emerald-800"
                            : "border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={(event) => handleActiveChange(event.target.checked)}
                          className="h-5 w-5 rounded border-slate-300 accent-orange-500"
                        />
                        {isActive ? "Imóvel ativo" : "Imóvel inativo"}
                      </label>

                      {!isActive && (
                        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-bold leading-5 text-red-700">
                          Atenção: imóvel inativo não poderá ser selecionado em novos contratos.
                          O histórico será preservado para relatórios e auditoria.
                        </div>
                      )}
                    </div>
                  </FormField>

                  <FormField label="Nome do imóvel" required>
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => setName(toUpperText(event.target.value))}
                      placeholder="Ex: APARTAMENTO CENTRO"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold uppercase text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </FormField>

                  <FormField label="CEP" required>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={zipCode}
                          onChange={(event) => handleZipCodeChange(event.target.value)}
                          onBlur={handleZipCodeBlur}
                          placeholder="Ex: 76940-000"
                          inputMode="numeric"
                          maxLength={9}
                          className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        />

                        <button
                          type="button"
                          onClick={handleZipCodeLookup}
                          disabled={isZipCodeLoading || zipCode.replace(/\D/g, "").length !== 8}
                          className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-md shadow-orange-100 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                          title="Buscar CEP"
                          aria-label="Buscar CEP"
                        >
                          {isZipCodeLoading ? (
                            <LoaderCircle className="h-5 w-5 animate-spin" />
                          ) : (
                            <Search className="h-5 w-5" />
                          )}
                        </button>
                      </div>

                      {zipCodeFeedback && (
                        <p className="text-xs font-bold text-slate-500">{zipCodeFeedback}</p>
                      )}
                    </div>
                  </FormField>

                  <FormField label="Estado" required>
                    <input
                      type="text"
                      value={state}
                      onChange={(event) => setState(toUpperText(event.target.value))}
                      placeholder="UF"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold uppercase text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </FormField>

                  <FormField label="Cidade" required>
                    <input
                      type="text"
                      value={city}
                      onChange={(event) => setCity(toUpperText(event.target.value))}
                      placeholder="Cidade"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold uppercase text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </FormField>

                  <FormField label="Bairro" required>
                    <input
                      type="text"
                      value={neighborhood}
                      onChange={(event) => setNeighborhood(toUpperText(event.target.value))}
                      placeholder="Bairro"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold uppercase text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </FormField>

                  <FormField label="Logradouro" required>
                    <input
                      type="text"
                      value={street}
                      onChange={(event) => setStreet(toUpperText(event.target.value))}
                      placeholder="Rua, avenida..."
                      className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold uppercase text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </FormField>

                  <FormField label="Número" required>
                    <input
                      type="text"
                      value={number}
                      onChange={(event) => setNumber(toUpperText(event.target.value))}
                      placeholder="Número"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold uppercase text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </FormField>

                  <FormField label="Complemento">
                    <input
                      type="text"
                      value={complement}
                      onChange={(event) => setComplement(toUpperText(event.target.value))}
                      placeholder="Apartamento, bloco, referência..."
                      className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold uppercase text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </FormField>

                  <FormField label="Valor da locação mensal" required>
                    <input
                      type="text"
                      value={rentValue}
                      onChange={(event) => setRentValue(formatCurrencyInput(event.target.value))}
                      placeholder="R$ 0,00"
                      inputMode="numeric"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </FormField>

                  <FormField label="Quartos">
                    <input
                      type="number"
                      min="0"
                      value={bedrooms}
                      onChange={(event) => setBedrooms(event.target.value)}
                      placeholder="0"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </FormField>

                  <FormField label="Banheiros">
                    <input
                      type="number"
                      min="0"
                      value={bathrooms}
                      onChange={(event) => setBathrooms(event.target.value)}
                      placeholder="0"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </FormField>

                  <FormField label="Vagas">
                    <input
                      type="number"
                      min="0"
                      value={garages}
                      onChange={(event) => setGarages(event.target.value)}
                      placeholder="0"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </FormField>

                  <div className="md:col-span-2 xl:col-span-4">
                    <FormField label="Descrição">
                      <textarea
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Observações internas, características ou referências do imóvel"
                        rows={3}
                        className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      />
                    </FormField>
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-slate-100 bg-white px-8 py-6">
                {isSavingProperty && (
                  <p className="mr-auto text-sm font-black text-orange-600">
                    Salvando alterações...
                  </p>
                )}
                <button
                  onClick={handleCloseForm}
                  disabled={isSavingProperty}
                  className="rounded-2xl bg-slate-100 px-6 py-4 text-sm font-black text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  onClick={handleSaveProperty}
                  disabled={isSavingProperty}
                  className="rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {editingPropertyId ? "Salvar alterações" : "Cadastrar imóvel"}
                </button>
              </div>
            </div>
          </div>
        )}

        {propertyToInactivate && (
          <ConfirmationModal
            icon="🚫"
            title="Inativar imóvel?"
            description="Este imóvel não será excluído. Ele ficará inativo para preservar o histórico e manter a integridade dos relatórios."
            itemTitle={propertyToInactivate.name}
            itemDetail={propertyToInactivate.address || "Endereço não informado"}
            confirmLabel="Sim, inativar"
            onCancel={handleCancelInactivateProperty}
            onConfirm={handleConfirmInactivateProperty}
          />
        )}

        {pendingInactiveConfirmation && (
          <ConfirmationModal
            icon="⚠️"
            title="Confirmar inativação?"
            description="Ao desativar este imóvel, ele não poderá ser utilizado em novos contratos. O cadastro continuará salvo e todo o histórico será mantido para relatórios, auditoria e consultas futuras."
            itemTitle={pendingInactiveConfirmation.name}
            itemDetail={pendingInactiveConfirmation.address || "Endereço não informado"}
            confirmLabel="Confirmar inativação"
            onCancel={handleCancelInactiveConfirmation}
            onConfirm={handleConfirmInactiveFromForm}
          />
        )}

        {blockedInactiveProperty && (
          <AlertModal
            icon="⚠️"
            title="Imóvel vinculado a contrato ativo"
            description="Este imóvel possui contrato ativo e não pode ser inativado. Encerre, cancele ou finalize o contrato antes de alterar a situação do cadastro."
            itemTitle={blockedInactiveProperty.name}
            itemDetail={blockedInactiveProperty.address || "Endereço não informado"}
            onClose={handleCloseBlockedInactiveProperty}
          />
        )}
      </div>
    </>
  );
}

type FormFieldProps = {
  label: string;
  children: React.ReactNode;
  required?: boolean;
};

function FormField({ label, children, required = false }: FormFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-700">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </label>
      {children}
    </div>
  );
}

type SummaryCardProps = {
  icon: string;
  title: string;
  value: string | number;
  detail: string;
};

function SummaryCard({ icon, title, value, detail }: SummaryCardProps) {
  return (
    <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-xl text-orange-600">
        {icon}
      </div>

      <p className="text-sm font-bold text-slate-500">{title}</p>
      <h3 className="mt-3 text-3xl font-black text-slate-950">{value}</h3>
      <p className="mt-3 text-sm font-bold text-orange-600">{detail}</p>
    </div>
  );
}

function ActiveBadge({ isActive }: { isActive: boolean }) {
  const activeConfig = isActive
    ? { label: "Ativo", className: "bg-emerald-100 text-emerald-700" }
    : { label: "Inativo", className: "bg-slate-100 text-slate-600" };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${activeConfig.className}`}>
      {activeConfig.label}
    </span>
  );
}

function StatusBadge({ status }: { status: PropertyStatus }) {
  const statusConfig = {
    Available: { label: "Disponível", className: "bg-emerald-100 text-emerald-700" },
    Rented: { label: "Alugado", className: "bg-orange-100 text-orange-700" },
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${statusConfig[status].className}`}>
      {statusConfig[status].label}
    </span>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function RentalStatusBadge({ status }: { status: string }) {
  const normalizedStatus = status || "Inactive";

  const config: Record<string, { label: string; className: string }> = {
    Active: { label: "Ativo", className: "bg-emerald-100 text-emerald-700" },
    Expiring: { label: "Vencendo", className: "bg-amber-100 text-amber-700" },
    Inactive: { label: "Inativo", className: "bg-slate-100 text-slate-600" },
    Canceled: { label: "Cancelado", className: "bg-red-100 text-red-700" },
    Finished: { label: "Finalizado", className: "bg-blue-100 text-blue-700" },
    Deleted: { label: "Excluído", className: "bg-zinc-200 text-zinc-700" },
  };

  const selectedConfig = config[normalizedStatus] || config.Inactive;

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${selectedConfig.className}`}>
      {selectedConfig.label}
    </span>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PaymentStatusBadge({ status }: { status: "Paid" | "Pending" | "NotGenerated" }) {
  const config = {
    Paid: { label: "Pago", className: "bg-emerald-100 text-emerald-700" },
    Pending: { label: "Pendente", className: "bg-red-100 text-red-700" },
    NotGenerated: { label: "Não gerado", className: "bg-slate-100 text-slate-600" },
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${config[status].className}`}>
      {config[status].label}
    </span>
  );
}

type ReportInfoProps = {
  label: string;
  value: string;
  wide?: boolean;
};

function ReportInfo({ label, value, wide = false }: ReportInfoProps) {
  return (
    <div className={`report-field ${wide ? "report-field-wide" : ""}`}>
      <p className="report-label">
        {label}
      </p>
      <p className="report-value">
        {value}
      </p>
    </div>
  );
}

type ConfirmationModalProps = {
  icon: string;
  title: string;
  description: string;
  itemTitle: string;
  itemDetail: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

function ConfirmationModal({
  icon,
  title,
  description,
  itemTitle,
  itemDetail,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmationModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[2rem] border border-red-100 bg-white p-8 shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-3xl">
          {icon}
        </div>

        <div className="mt-5 text-center">
          <h3 className="text-2xl font-black text-slate-950">{title}</h3>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">{description}</p>

          <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-sm font-black text-slate-900">{itemTitle}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{itemDetail}</p>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            className="rounded-2xl bg-slate-100 px-5 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-200"
          >
            Cancelar
          </button>

          <button
            onClick={onConfirm}
            className="rounded-2xl bg-red-500 px-5 py-4 text-sm font-black text-white shadow-md shadow-red-100 transition hover:bg-red-600"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

type AlertModalProps = {
  icon: string;
  title: string;
  description: string;
  itemTitle: string;
  itemDetail: string;
  onClose: () => void;
};

function AlertModal({ icon, title, description, itemTitle, itemDetail, onClose }: AlertModalProps) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[2rem] border border-orange-100 bg-white p-8 shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-orange-50 text-3xl">
          {icon}
        </div>

        <div className="mt-5 text-center">
          <h3 className="text-2xl font-black text-slate-950">{title}</h3>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">{description}</p>

          <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-sm font-black text-slate-900">{itemTitle}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{itemDetail}</p>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-orange-500 px-5 py-4 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
}

function getRentalStatusLabel(status: string) {
  const labels: Record<string, string> = {
    Active: "Ativo",
    Expiring: "Vencendo",
    Inactive: "Inativo",
    Canceled: "Cancelado",
    Finished: "Finalizado",
    Deleted: "Excluído",
  };

  return labels[status] || "Inativo";
}

function getPaymentStatusLabel(status: "Paid" | "Pending" | "NotGenerated") {
  const labels = {
    Paid: "Pago",
    Pending: "Pendente",
    NotGenerated: "Não gerado",
  };

  return labels[status];
}

function getCurrentRentalContract(
  property: Property,
  contracts: RentalHistoryContract[]
) {
  return contracts
    .filter((contract) => {
      const isSameProperty = String(contract.propertyId || "") === String(property.id);
      const isActiveRental =
        !contract.status ||
        activeRentalStatuses.includes(contract.status);

      return isSameProperty && isActiveRental;
    })
    .sort((firstContract, secondContract) => {
      const firstDate = new Date(firstContract.endDate || "").getTime();
      const secondDate = new Date(secondContract.endDate || "").getTime();

      return secondDate - firstDate;
    })[0];
}

function getRentalHistoryByProperty(
  property: Property,
  contracts: RentalHistoryContract[],
): RentalHistoryContract[] {
  return contracts
    .filter((contract) => String(contract.propertyId || "") === String(property.id))
    .sort((firstContract, secondContract) => {
      const firstDate = new Date(`${firstContract.startDate || ""}T00:00:00`).getTime();
      const secondDate = new Date(`${secondContract.startDate || ""}T00:00:00`).getTime();

      return secondDate - firstDate;
    });
}

function getRentalPaymentStatus(
  contract: RentalHistoryContract,
  charges: RentalCharge[],
): "Paid" | "Pending" | "NotGenerated" {
  const linkedCharges = charges.filter((charge) => {
    if (String(charge.contractId || "") === String(contract.id)) return true;

    const sameProperty =
      normalizeSearchText(charge.property || "") === normalizeSearchText(contract.propertyName || "");
    const sameTenant =
      normalizeSearchText(charge.tenant || "") === normalizeSearchText(contract.tenantName || "");

    return sameProperty && sameTenant;
  });

  if (linkedCharges.length === 0) {
    return "NotGenerated";
  }

  const allChargesPaid = linkedCharges.every((charge) => {
    const chargeStatus = String(charge.status || "").toLowerCase();

    return (
      charge.paid === true ||
      chargeStatus === "paid" ||
      chargeStatus === "pago"
    );
  });

  return allChargesPaid ? "Paid" : "Pending";
}

function mapApiContractToRentalHistory(contract: ApiContract): RentalHistoryContract {
  return {
    id: contract.id,
    propertyId: contract.propertyId,
    propertyName: contract.propertyName || contract.property?.title || "",
    tenantId: contract.tenantId,
    tenantName: contract.tenantName || contract.tenant?.name || "",
    startDate: getDateInputValue(contract.startDate),
    endDate: getDateInputValue(contract.endDate),
    rentValue: Number(contract.rentValue || 0),
    status: mapApiContractStatusToUi(contract.status),
  };
}

function mapApiChargeToRentalCharge(account: ReceivableAccount): RentalCharge {
  return {
    id: account.id,
    contractId: account.contractId || null,
    property: account.propertyName,
    tenant: account.tenantName,
    amount: Number(account.amount || 0),
    dueDate: account.dueDate,
    paid: account.status === "PAID",
    status: account.status === "PAID" ? "Paid" : "Pending",
  };
}

function mapApiPropertyMovementToPropertyMovement(
  movement: ApiPropertyMovement,
): PropertyMovement {
  return {
    id: movement.id,
    propertyId: movement.propertyId,
    propertyName: movement.propertyName,
    type: movement.type as PropertyMovementType,
    description: movement.description,
    createdAt: movement.createdAt,
  };
}

function mapApiContractStatusToUi(status: string) {
  const statusMap: Record<string, string> = {
    ACTIVE: "Active",
    INACTIVE: "Inactive",
    CANCELED: "Canceled",
    FINISHED: "Finished",
    DELETED: "Deleted",
  };

  return statusMap[status] || status;
}

function getDateInputValue(value?: string | null) {
  if (!value) return "";

  return String(value).slice(0, 10);
}

function formatDate(value: string) {
  if (!value) return "-";

  const [year, month, day] = value.split("-");

  if (!year || !month || !day) return "-";

  return `${day}/${month}/${year}`;
}

function getEmptyCompanySettings(): CompanySettings {
  return {
    companyName: "",
    tradeName: "",
    document: "",
    phone: "",
    email: "",
    address: "",
    logo: "",
  };
}

function getStoredCompanySettings(): CompanySettings {
  const emptySettings = getEmptyCompanySettings();
  const cachedCompanySettings = getCachedCompanySettings();

  if (!cachedCompanySettings) {
    return emptySettings;
  }

  return {
    companyName: String(
      cachedCompanySettings.companyName ||
        cachedCompanySettings.name ||
        cachedCompanySettings.razaoSocial ||
        cachedCompanySettings.legalName ||
        ""
    ),
    tradeName: String(
      cachedCompanySettings.tradeName ||
        cachedCompanySettings.fantasyName ||
        cachedCompanySettings.nomeFantasia ||
        ""
    ),
    document: String(
      cachedCompanySettings.document ||
        cachedCompanySettings.cnpj ||
        cachedCompanySettings.cpfCnpj ||
        cachedCompanySettings.taxId ||
        ""
    ),
    phone: String(cachedCompanySettings.phone || cachedCompanySettings.telefone || ""),
    email: String(cachedCompanySettings.email || ""),
    address: String(
      cachedCompanySettings.address ||
        cachedCompanySettings.endereco ||
        cachedCompanySettings.fullAddress ||
        ""
    ),
    logo: String(
      cachedCompanySettings.logo ||
        cachedCompanySettings.logoUrl ||
        cachedCompanySettings.logoBase64 ||
        cachedCompanySettings.companyLogo ||
        ""
    ),
  };
}

function getCompanyDisplayName(companySettings: CompanySettings) {
  return (
    companySettings.tradeName ||
    companySettings.companyName ||
    "Contrx"
  );
}

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function toUpperText(value: string) {
  return value.toLocaleUpperCase("pt-BR").trimStart();
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}


function getCurrentCompanyId() {
  if (typeof window === "undefined") return "";

  const possibleCompanyIdKeys = [
    "contrx_company_id",
    "contrx_companyId",
    "companyId",
  ];

  for (const key of possibleCompanyIdKeys) {
    const value = localStorage.getItem(key);

    if (value) return value;
  }

  const storedUser = localStorage.getItem("contrx_user");

  if (storedUser) {
    try {
      const parsedUser = JSON.parse(storedUser) as { companyId?: string };

      if (parsedUser.companyId) return parsedUser.companyId;
    } catch {
      return "";
    }
  }

  return "";
}

function isValidPropertyType(value: string | null | undefined): value is PropertyType {
  return propertyTypes.some((propertyType) => propertyType.value === value);
}

function getMovementTypeLabel(type: PropertyMovementType) {
  const movementLabels: Record<PropertyMovementType, string> = {
    Created: "Cadastro criado",
    Updated: "Cadastro atualizado",
    Inactivated: "Imóvel inativado",
    DeletionBlocked: "Exclusão bloqueada",
    InactivationBlocked: "Inativação bloqueada",
  };

  return movementLabels[type] || "Movimentação";
}

function formatZipCode(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function parseCurrencyValue(value: string) {
  const onlyDigits = value.replace(/\D/g, "");

  if (!onlyDigits) return 0;

  return Number(onlyDigits) / 100;
}

function parsePositiveInteger(value: string) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) return 0;

  return Math.floor(parsedValue);
}

function formatCurrencyInput(value: string) {
  return formatCurrency(parseCurrencyValue(value));
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateTime(value: string) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
