"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  createProperty,
  getProperties,
  updateProperty,
  setAssetOperationalStatus,
  type Property as ApiProperty,
} from "@/services/properties.service";
import { getPeople, type Person as ApiPerson } from "@/services/people.service";
import { getContracts, type Contract as ApiContract } from "@/services/contracts.service";
import {
  createPropertyMovement,
  getPropertyMovements,
} from "@/services/property-movements.service";
import { api } from "@/services/api";
import { getCachedCompanySettings } from "@/services/settings-cache";
import {
  clearMinimizedModalState,
  setMinimizedModalState,
  CLOSE_MINIMIZED_MODAL_EVENT,
  RESTORE_MINIMIZED_MODAL_EVENT,
} from "@/services/minimized-modal.service";
import { useAuth } from "@/context/AuthContext";

import {
  Property,
  PropertyMovement,
  RentalHistoryContract,
  CompanySettings,
  PropertyCategoryFilterStatus,
  PropertyRegistrationFilterStatus,
  PropertyOperationalFilterStatus,
  normalizeSearchText,
  toUpperText,
  AssetOperationalStatus,
  isContractActive,
} from "@/components/assets/asset-types";
import { AssetKpis } from "@/components/assets/asset-kpis";
import { AssetFilters } from "@/components/assets/asset-filters";
import { AssetTable } from "@/components/assets/asset-table";
import { AssetMobileCards } from "@/components/assets/asset-mobile-cards";
import { AssetQrLabelModal } from "@/components/assets/asset-qr-label-modal";
import { AssetHistoryModal } from "@/components/assets/asset-history-modal";
import { AssetFormModal } from "@/components/assets/asset-form-modal";
import { AssetRentalModal } from "@/components/assets/asset-rental-modal";

function getCurrentCompanyId(): string {
  if (typeof window === "undefined") return "";

  const possibleCompanyIdKeys = [
    "contrx_company_id",
    "contrx_companyId",
    "companyId",
    "contrx_active_company_id",
    "active_company_id",
  ];

  for (const key of possibleCompanyIdKeys) {
    const value = window.localStorage.getItem(key);
    if (value) return value;
  }

  const storedUser = window.localStorage.getItem("contrx_user");
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

function mapApiContract(contract: ApiContract): RentalHistoryContract {
  return {
    id: contract.id,
    propertyId: contract.propertyId,
    propertyName: contract.propertyName || undefined,
    tenantId: contract.tenantId,
    tenantName: contract.tenantName || contract.tenant?.name || undefined,
    tenantDocument: contract.tenant?.document || undefined,
    startDate: contract.startDate,
    endDate: contract.endDate,
    rentValue: Number(contract.rentValue || 0),
    status: contract.status,
    isTemporaryRental: Boolean(contract.isTemporaryRental),
    checkInTime: contract.checkInTime || undefined,
    checkOutTime: contract.checkOutTime || undefined,
  };
}

function normalizeApiProperty(
  property: ApiProperty,
  contractSource: RentalHistoryContract[]
): Property {
  const hasActiveContract = contractSource.some((c) => {
    const cPropId =
      c.propertyId ||
      c.property_id ||
      c.property ||
      c.propertyCode ||
      c.property_id_fk;
    return (
      String(cPropId || "") === property.id &&
      isContractActive(c.status)
    );
  });

  // Determinar status operacional com precisão e coerência contratual
  let opStatus: AssetOperationalStatus = "AVAILABLE";
  if (!property.isActive) {
    opStatus = "INACTIVE";
  } else if (hasActiveContract) {
    opStatus = "RENTED";
  } else if (property.operationalStatus === "MAINTENANCE") {
    opStatus = "MAINTENANCE";
  } else if (property.operationalStatus === "RESERVED") {
    opStatus = "RESERVED";
  } else {
    opStatus = "AVAILABLE";
  }

  const addressParts = [
    property.address,
    property.number,
    property.district,
    property.city,
    property.state,
    property.zipCode,
  ].filter(Boolean);

  return {
    id: property.id,
    code: toUpperText(property.code || ""),
    assetCategory: (property.assetCategory as any) || "PROPERTY",
    type: (property.type as any) || "Apartment",
    name: toUpperText(property.title || ""),
    brand: toUpperText(property.brand || ""),
    model: toUpperText(property.model || ""),
    serialNumber: toUpperText(property.serialNumber || ""),
    licensePlate: toUpperText(property.licensePlate || ""),
    manufactureYear: Number(property.manufactureYear || 0),
    condition: toUpperText(property.condition || ""),
    patrimonyCode: toUpperText(property.patrimonyCode || ""),
    zipCode: property.zipCode || "",
    state: toUpperText(property.state || ""),
    city: toUpperText(property.city || ""),
    neighborhood: toUpperText(property.district || ""),
    street: toUpperText(property.address || ""),
    number: toUpperText(property.number || ""),
    complement: toUpperText(property.complement || ""),
    address: toUpperText(addressParts.join(", ")),
    rentValue: Number(property.rentalValue || 0),
    operationalStatus: opStatus,
    bedrooms: Number(property.bedrooms || 0),
    bathrooms: Number(property.bathrooms || 0),
    garages: Number(property.garages || 0),
    description: property.description || "",
    status: hasActiveContract ? "Rented" : "Available",
    isActive: property.isActive ?? true,
    ownerId: property.ownerId || "",
    ownerName: toUpperText(property.owner?.name || ""),
    managementMode: property.managementMode === "MANAGED" ? "MANAGED" : "OWNED",
    administrationFeePercentage: Number(property.administrationFeePercentage || 0),
    ownerPayoutDay: Number(property.ownerPayoutDay || 0),
    autoCreateOwnerPayable: property.autoCreateOwnerPayable !== false,
    photos: property.photos,
  };
}

export default function PropertiesPage() {
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [allPeople, setAllPeople] = useState<ApiPerson[]>([]);
  const [owners, setOwners] = useState<ApiPerson[]>([]);
  const [contracts, setContracts] = useState<RentalHistoryContract[]>([]);
  const [movements, setMovements] = useState<PropertyMovement[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    companyName: "",
    tradeName: "",
    document: "",
    phone: "",
    email: "",
    address: "",
    logo: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Filtros
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState<PropertyCategoryFilterStatus>("All");
  const [registrationFilter, setRegistrationFilter] =
    useState<PropertyRegistrationFilterStatus>("Active");
  const [operationalStatusFilter, setOperationalStatusFilter] =
    useState<PropertyOperationalFilterStatus>("All");

  // Modais
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isFormMinimized, setIsFormMinimized] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);

  const [historyProperty, setHistoryProperty] = useState<Property | null>(null);
  const [rentalModalData, setRentalModalData] = useState<{
    property: Property;
    contract: RentalHistoryContract | null;
  } | null>(null);
  const [qrLabelProperty, setQrLabelProperty] = useState<Property | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  function handleDeleteSuccess(deletedPropertyId: string) {
    setProperties((prev) => prev.filter((p) => p.id !== deletedPropertyId));
    setToast({
      type: "success",
      message: "Cadastro de bem/ativo excluído com sucesso.",
    });
  }

  function handleInactivateSuccess(updatedProperty: any, isInactive: boolean) {
    void updatedProperty;
    loadData();
    setToast({
      type: "success",
      message: isInactive
        ? "Bem/ativo inativado com sucesso."
        : "Bem/ativo reativado com sucesso.",
    });
  }

  // Carregar dados
  const loadData = useCallback(async () => {
    const companyId = user?.companyId || getCurrentCompanyId();
    if (!companyId) {
      setProperties([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [apiProps, apiContracts, apiMovements, apiPeople] =
        await Promise.all([
          getProperties(companyId),
          getContracts(companyId),
          getPropertyMovements(companyId),
          getPeople(companyId),
        ]);

      const mappedContracts = apiContracts.map(mapApiContract);
      const mappedProps = apiProps.map((p) =>
        normalizeApiProperty(p, mappedContracts)
      );

      setContracts(mappedContracts);
      setProperties(mappedProps);
      setAllPeople(apiPeople);
      setOwners(apiPeople.filter((p) => !p.isTenant));
      setMovements(apiMovements as any);
    } catch (err) {
      console.error("Erro ao carregar bens/ativos:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.companyId]);

  useEffect(() => {
    loadData();

    // Carregar configurações de empresa para impressão de relatórios e etiquetas
    const settings = getCachedCompanySettings() as Record<string, any> | null;
    if (settings) {
      setCompanySettings({
        companyName: String(settings.companyName || ""),
        tradeName: String(settings.tradeName || ""),
        document: String(settings.document || ""),
        phone: String(settings.phone || ""),
        email: String(settings.email || ""),
        address: String(settings.address || ""),
        logo: String(settings.logo || ""),
      });
    }
  }, [loadData]);

  // Listener para restauração e fechamento de modal minimizado
  useEffect(() => {
    function handleRestore() {
      setIsFormMinimized(false);
      setIsFormOpen(true);
    }
    function handleClose() {
      setIsFormMinimized(false);
      setIsFormOpen(false);
      clearMinimizedModalState();
    }

    window.addEventListener(RESTORE_MINIMIZED_MODAL_EVENT, handleRestore);
    window.addEventListener(CLOSE_MINIMIZED_MODAL_EVENT, handleClose);

    return () => {
      window.removeEventListener(RESTORE_MINIMIZED_MODAL_EVENT, handleRestore);
      window.removeEventListener(CLOSE_MINIMIZED_MODAL_EVENT, handleClose);
    };
  }, []);

  // Propriedade sendo editada
  const currentEditingProperty = useMemo(() => {
    if (!editingPropertyId) return null;
    return properties.find((p) => p.id === editingPropertyId) || null;
  }, [editingPropertyId, properties]);

  // Filtros aplicados
  const filteredProperties = useMemo(() => {
    const term = normalizeSearchText(search);

    return properties.filter((property) => {
      const matchesSearch =
        !term ||
        normalizeSearchText(property.name).includes(term) ||
        normalizeSearchText(property.code).includes(term) ||
        normalizeSearchText(property.licensePlate).includes(term) ||
        normalizeSearchText(property.serialNumber).includes(term) ||
        normalizeSearchText(property.patrimonyCode).includes(term) ||
        normalizeSearchText(property.address).includes(term) ||
        normalizeSearchText(property.city).includes(term);

      const matchesCategory =
        categoryFilter === "All" || property.assetCategory === categoryFilter;

      const matchesRegistration =
        registrationFilter === "All" ||
        (registrationFilter === "Active" && property.isActive) ||
        (registrationFilter === "Inactive" && !property.isActive);

      const matchesOperational =
        operationalStatusFilter === "All" ||
        property.operationalStatus === operationalStatusFilter;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesRegistration &&
        matchesOperational
      );
    });
  }, [
    categoryFilter,
    operationalStatusFilter,
    properties,
    registrationFilter,
    search,
  ]);

  const activeTenantPerson = useMemo(() => {
    if (!rentalModalData?.contract?.tenantId) return null;
    return (
      allPeople.find(
        (p) => String(p.id) === String(rentalModalData.contract?.tenantId)
      ) || null
    );
  }, [allPeople, rentalModalData]);

  function handleOpenRentalInfo(
    property: Property,
    contract?: RentalHistoryContract
  ) {
    const activeContract =
      contract ||
      contracts.find((c) => {
        const cPropId =
          c.propertyId ||
          c.property_id ||
          c.property ||
          c.propertyCode ||
          c.property_id_fk;
        return (
          String(cPropId || "") === property.id &&
          isContractActive(c.status)
        );
      }) ||
      null;

    setRentalModalData({ property, contract: activeContract });
  }

  // Ações de formulário
  function handleOpenCreate() {
    setEditingPropertyId(null);
    setIsFormMinimized(false);
    setIsFormOpen(true);
  }

  function handleEditProperty(id: string) {
    setEditingPropertyId(id);
    setIsFormMinimized(false);
    setIsFormOpen(true);
  }

  function handleMinimizeForm() {
    setIsFormMinimized(true);
    setMinimizedModalState({
      tool: "properties",
      href: "/imoveis",
      title: editingPropertyId ? "Editando Bem/Ativo" : "Novo Bem/Ativo",
      subtitle: currentEditingProperty?.name || "Rascunho",
      mode: editingPropertyId ? "edit" : "create",
      updatedAt: Date.now(),
    });
  }

  function handleRestoreForm() {
    setIsFormMinimized(false);
    clearMinimizedModalState();
  }

  function handleCloseForm() {
    setIsFormOpen(false);
    setIsFormMinimized(false);
    setEditingPropertyId(null);
    clearMinimizedModalState();
  }

  async function handleSaveProperty(payload: any, files: File[]) {
    const companyId = user?.companyId || getCurrentCompanyId();
    if (!companyId) return;

    try {
      setIsSaving(true);
      const saved = editingPropertyId
        ? await updateProperty(editingPropertyId, payload)
        : await createProperty(payload);

      // Upload de novas fotos
      if (files.length > 0) {
        await Promise.all(
          files.map((file) => {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("companyId", companyId);
            formData.append("entityType", "PROPERTY");
            formData.append("entityId", saved.id);

            return api.post("/files/upload", formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
          })
        );
      }

      // Registrar movimentação
      createPropertyMovement({
        companyId,
        propertyId: saved.id,
        propertyName: saved.title,
        type: editingPropertyId ? "Updated" : "Created",
        description: editingPropertyId
          ? "Cadastro do bem/ativo atualizado."
          : "Novo bem/ativo cadastrado no sistema.",
      }).catch(console.warn);

      handleCloseForm();
      setToast({
        type: "success",
        message: editingPropertyId
          ? "Bem/ativo atualizado com sucesso."
          : "Novo bem/ativo cadastrado com sucesso.",
      });
      await loadData();
    } finally {
      setIsSaving(false);
    }
  }

  // Alternar rapidamente status de Manutenção
  async function handleToggleMaintenance(property: Property) {
    const nextStatus: AssetOperationalStatus =
      property.operationalStatus === "MAINTENANCE" ? "AVAILABLE" : "MAINTENANCE";

    try {
      await setAssetOperationalStatus(property.id, nextStatus);

      // Registrar movimentação
      const companyId = user?.companyId || getCurrentCompanyId();
      if (companyId) {
        createPropertyMovement({
          companyId,
          propertyId: property.id,
          propertyName: property.name,
          type: "Updated",
          description:
            nextStatus === "MAINTENANCE"
              ? "Bem/ativo colocado em manutenção (bloqueado para novas locações)."
              : "Bem/ativo liberado da manutenção (disponível para locação).",
        }).catch(console.warn);
      }

      await loadData();
    } catch (err) {
      console.error("Erro ao alterar status operacional:", err);
    }
  }



  return (
    <div className="space-y-6">
      {/* Toast Notifier */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 rounded-2xl px-5 py-3 text-sm font-black text-white shadow-xl transition-all duration-300 animate-in slide-in-from-top-3 ${
            toast.type === "success"
              ? "bg-emerald-600 shadow-emerald-500/20"
              : "bg-red-600 shadow-red-500/20"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-950 sm:text-3xl tracking-tight">
            Bens / Ativos
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Controle de máquinas, equipamentos, veículos, ferramentas e imóveis
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 py-3 text-xs font-black text-white shadow-lg shadow-orange-200 transition hover:bg-orange-700 active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Novo Bem / Ativo
        </button>
      </div>

      {/* Cards de Métricas / KPIs */}
      <AssetKpis
        properties={properties}
        selectedFilter={operationalStatusFilter}
        onSelectFilter={setOperationalStatusFilter}
      />

      {/* Filtros e Busca */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <AssetFilters
          search={search}
          onSearchChange={setSearch}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          registrationFilter={registrationFilter}
          onRegistrationFilterChange={setRegistrationFilter}
          operationalStatusFilter={operationalStatusFilter}
          onOperationalStatusFilterChange={setOperationalStatusFilter}
        />
      </div>

      {/* Tabela Desktop */}
      <AssetTable
        properties={filteredProperties}
        contracts={contracts}
        isLoading={isLoading}
        onOpenHistory={setHistoryProperty}
        onOpenRentalInfo={handleOpenRentalInfo}
        onEdit={handleEditProperty}
        onOpenQrLabel={setQrLabelProperty}
        onToggleMaintenance={handleToggleMaintenance}
      />

      {/* Cards Mobile */}
      <AssetMobileCards
        properties={filteredProperties}
        contracts={contracts}
        onOpenHistory={setHistoryProperty}
        onOpenRentalInfo={handleOpenRentalInfo}
        onEdit={handleEditProperty}
        onOpenQrLabel={setQrLabelProperty}
        onToggleMaintenance={handleToggleMaintenance}
      />

      {/* Modais */}
      <AssetFormModal
        isOpen={isFormOpen}
        isMinimized={isFormMinimized}
        editingProperty={currentEditingProperty}
        owners={owners}
        isSaving={isSaving}
        onClose={handleCloseForm}
        onMinimize={handleMinimizeForm}
        onRestore={handleRestoreForm}
        onSave={handleSaveProperty}
        onOwnerCreated={(newOwner) => setOwners((prev) => [newOwner, ...prev])}
        onDeleteSuccess={handleDeleteSuccess}
        onInactivateSuccess={handleInactivateSuccess}
      />

      <AssetHistoryModal
        property={historyProperty}
        companySettings={companySettings}
        contracts={contracts}
        movements={movements}
        onClose={() => setHistoryProperty(null)}
      />

      <AssetRentalModal
        isOpen={Boolean(rentalModalData)}
        property={rentalModalData?.property || null}
        contract={rentalModalData?.contract || null}
        tenantPerson={activeTenantPerson}
        onClose={() => setRentalModalData(null)}
        onOpenHistory={(prop) => {
          setRentalModalData(null);
          setHistoryProperty(prop);
        }}
      />

      <AssetQrLabelModal
        property={qrLabelProperty}
        companySettings={companySettings}
        onClose={() => setQrLabelProperty(null)}
      />
    </div>
  );
}
