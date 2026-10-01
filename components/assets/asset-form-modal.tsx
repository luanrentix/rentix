"use client";

import React, { useState, useEffect } from "react";
import {
  Property,
  AssetCategory,
  PropertyType,
  PropertyManagementMode,
  AssetOperationalStatus,
  assetCategories,
  getAssetTypesForCategory,
  assetConditionOptions,
  operationalStatusOptions,
  toUpperText,
} from "./asset-types";
import {
  X,
  Minus,
  Maximize2,
  Building,
  Upload,
  Trash2,
  Plus,
  LoaderCircle,
  AlertCircle,
  PowerOff,
  CheckCircle2,
  ZoomIn,
} from "lucide-react";
import { PersonCreateModal } from "@/components/people/person-create-modal";
import type { Person as ApiPerson } from "@/services/people.service";
import { deleteProperty, updateProperty } from "@/services/properties.service";
import { getMediaUrl, api } from "@/services/api";
import { MediaLightboxModal } from "@/components/modals/media-lightbox-modal";

interface AssetFormModalProps {
  isOpen: boolean;
  isMinimized: boolean;
  editingProperty: Property | null;
  owners: ApiPerson[];
  isSaving: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onRestore: () => void;
  onSave: (payload: any, files: File[]) => Promise<void>;
  onOwnerCreated?: (person: ApiPerson) => void;
  onDeleteSuccess?: (propertyId: string) => void;
  onInactivateSuccess?: (property: Property, isInactive: boolean) => void;
}

export function AssetFormModal({
  isOpen,
  isMinimized,
  editingProperty,
  owners,
  isSaving,
  onClose,
  onMinimize,
  onRestore,
  onSave,
  onOwnerCreated,
  onDeleteSuccess,
  onInactivateSuccess,
}: AssetFormModalProps) {
  const [activeTab, setActiveTab] = useState<string>("identificacao");

  // Campos do formulário
  const [code, setCode] = useState("");
  const [assetCategory, setAssetCategory] = useState<AssetCategory>("PROPERTY");
  const [type, setType] = useState<PropertyType>("Apartment");
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("Locação");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [manufactureYear, setManufactureYear] = useState("");
  const [condition, setCondition] = useState("");
  const [patrimonyCode, setPatrimonyCode] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [rentValue, setRentValue] = useState("");
  const [operationalStatus, setOperationalStatus] = useState<AssetOperationalStatus>("AVAILABLE");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [garages, setGarages] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [ownerId, setOwnerId] = useState("");
  const [managementMode, setManagementMode] = useState<PropertyManagementMode>("OWNED");
  const [administrationFeePercentage, setAdministrationFeePercentage] = useState("");
  const [ownerPayoutDay, setOwnerPayoutDay] = useState("");
  const [autoCreateOwnerPayable, setAutoCreateOwnerPayable] = useState(true);

  // Estados auxiliares
  const [isOwnerCreateOpen, setIsOwnerCreateOpen] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [cepFeedback, setCepFeedback] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [lightboxMedia, setLightboxMedia] = useState<{
    url: string;
    title: string;
    isPdf?: boolean;
  } | null>(null);

  const [isConfirmingInactivate, setIsConfirmingInactivate] = useState(false);
  const [isInactivating, setIsInactivating] = useState(false);
  const [inactivateError, setInactivateError] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Preencher quando entrar em modo de edição
  useEffect(() => {
    if (editingProperty) {
      setIsConfirmingInactivate(false);
      setIsInactivating(false);
      setInactivateError(null);
      setIsConfirmingDelete(false);
      setIsDeleting(false);
      setDeleteError(null);

      setCode(editingProperty.code || "");
      setAssetCategory(editingProperty.assetCategory || "PROPERTY");
      setType(editingProperty.type || "Apartment");
      setName(editingProperty.name || "");
      setBrand(editingProperty.brand || "");
      setModel(editingProperty.model || "");
      setSerialNumber(editingProperty.serialNumber || "");
      setLicensePlate(editingProperty.licensePlate || "");
      setManufactureYear(editingProperty.manufactureYear ? String(editingProperty.manufactureYear) : "");
      setCondition(editingProperty.condition || "");
      setPatrimonyCode(editingProperty.patrimonyCode || "");
      setZipCode(editingProperty.zipCode || "");
      setState(editingProperty.state || "");
      setCity(editingProperty.city || "");
      setNeighborhood(editingProperty.neighborhood || (editingProperty as any).district || "");
      setStreet(editingProperty.street || (editingProperty as any).address || "");
      setNumber(editingProperty.number || "");
      setComplement(editingProperty.complement || "");
      setRentValue(editingProperty.rentValue ? String(editingProperty.rentValue) : "");
      setOperationalStatus(editingProperty.operationalStatus || "AVAILABLE");
      setBedrooms(editingProperty.bedrooms ? String(editingProperty.bedrooms) : "");
      setBathrooms(editingProperty.bathrooms ? String(editingProperty.bathrooms) : "");
      setGarages(editingProperty.garages ? String(editingProperty.garages) : "");
      setDescription(editingProperty.description || "");
      setIsActive(editingProperty.isActive ?? true);
      setOwnerId(editingProperty.ownerId || "");
      setManagementMode(editingProperty.managementMode || "OWNED");
      setAdministrationFeePercentage(
        editingProperty.administrationFeePercentage
          ? String(editingProperty.administrationFeePercentage)
          : ""
      );
      setOwnerPayoutDay(
        editingProperty.ownerPayoutDay ? String(editingProperty.ownerPayoutDay) : ""
      );
      setAutoCreateOwnerPayable(editingProperty.autoCreateOwnerPayable !== false);

      let initialPhotos: string[] = [];
      if (editingProperty.photos) {
        try {
          const parsed = JSON.parse(editingProperty.photos);
          initialPhotos = Array.isArray(parsed) ? parsed.filter(Boolean) : [editingProperty.photos];
        } catch {
          initialPhotos = [editingProperty.photos];
        }
      }
      setPhotos(initialPhotos);

      // Também buscar fotos da tabela de arquivos do sistema
      if (editingProperty.id) {
        api.get<Array<{ url: string }>>(`/files/entity/PROPERTY/${editingProperty.id}`)
          .then((res) => {
            if (Array.isArray(res.data)) {
              setPhotos((prev) => {
                const combined = [...prev];
                res.data.forEach((f) => {
                  if (f.url && !combined.includes(f.url)) {
                    combined.push(f.url);
                  }
                });
                return combined;
              });
            }
          })
          .catch(() => {});
      }

      setSelectedFiles([]);
    } else {
      resetForm();
    }
  }, [editingProperty, isOpen]);

  function resetForm() {
    setCode("");
    setAssetCategory("PROPERTY");
    setType("Apartment");
    setName("");
    setBrand("");
    setModel("");
    setSerialNumber("");
    setLicensePlate("");
    setManufactureYear("");
    setCondition("");
    setPatrimonyCode("");
    setZipCode("");
    setState("");
    setCity("");
    setNeighborhood("");
    setStreet("");
    setNumber("");
    setComplement("");
    setRentValue("");
    setOperationalStatus("AVAILABLE");
    setBedrooms("");
    setBathrooms("");
    setGarages("");
    setDescription("");
    setIsActive(true);
    setOwnerId("");
    setManagementMode("OWNED");
    setAdministrationFeePercentage("");
    setOwnerPayoutDay("");
    setAutoCreateOwnerPayable(true);
    setCepFeedback("");
    setPhotos([]);
    setSelectedFiles([]);
    setActiveTab("identificacao");
    setErrorMessage("");
    setIsConfirmingInactivate(false);
    setIsInactivating(false);
    setInactivateError(null);
    setIsConfirmingDelete(false);
    setIsDeleting(false);
    setDeleteError(null);
  }

  function handleCategoryChange(newCategory: AssetCategory) {
    setAssetCategory(newCategory);
    const availableTypes = getAssetTypesForCategory(newCategory);
    const stillValid = availableTypes.some((t) => t.value === type);
    if (!stillValid && availableTypes.length > 0) {
      setType(availableTypes[0].value as PropertyType);
    }
  }

  async function handleConfirmDelete() {
    if (!editingProperty) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await deleteProperty(editingProperty.id);
      onDeleteSuccess?.(editingProperty.id);
      setIsConfirmingDelete(false);
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Não foi possível excluir o bem/ativo.";
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleConfirmInactivate() {
    if (!editingProperty) return;
    try {
      setIsInactivating(true);
      setInactivateError(null);
      const updated = await updateProperty(editingProperty.id, {
        isActive: false,
        operationalStatus: "INACTIVE",
      });
      onInactivateSuccess?.(updated as any, true);
      setIsConfirmingInactivate(false);
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erro ao inativar o bem/ativo.";
      setInactivateError(msg);
    } finally {
      setIsInactivating(false);
    }
  }

  async function handleDirectReactivate() {
    if (!editingProperty) return;
    try {
      setIsInactivating(true);
      const updated = await updateProperty(editingProperty.id, {
        isActive: true,
        operationalStatus: "AVAILABLE",
      });
      onInactivateSuccess?.(updated as any, false);
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Erro ao reativar o bem/ativo."
      );
    } finally {
      setIsInactivating(false);
    }
  }

  // Busca de CEP (ViaCEP)
  async function handleSearchCep(inputCep: string) {
    const cleaned = inputCep.replace(/\D/g, "");
    if (cleaned.length !== 8) return;

    try {
      setIsSearchingCep(true);
      setCepFeedback("");
      const res = await fetch('https://viacep.com.br/ws/' + cleaned + '/json/');
      const data = await res.json();

      if (data.erro) {
        setCepFeedback("CEP não encontrado.");
        return;
      }

      setStreet(toUpperText(data.logradouro || ""));
      setNeighborhood(toUpperText(data.bairro || ""));
      setCity(toUpperText(data.localidade || ""));
      setState(toUpperText(data.uf || ""));
      setCepFeedback("Endereço preenchido automaticamente.");
    } catch {
      setCepFeedback("Erro ao consultar CEP.");
    } finally {
      setIsSearchingCep(false);
    }
  }

  function handleFileSelection(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  }

  function handleRemoveSelectedFile(index: number) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleRemoveExistingPhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    if (!name.trim()) {
      setErrorMessage("Informe o nome ou título do bem/ativo.");
      setActiveTab("identificacao");
      return;
    }

    const isRealEstate = assetCategory === "PROPERTY";

    if (isRealEstate && managementMode === "MANAGED" && !ownerId) {
      setErrorMessage("Selecione o proprietário para imóveis administrados de terceiros.");
      setActiveTab("gestao");
      return;
    }

    const payload = {
      title: toUpperText(name),
      code: toUpperText(code),
      assetCategory,
      type,
      purpose: toUpperText(purpose),
      brand: toUpperText(brand),
      model: toUpperText(model),
      serialNumber: toUpperText(serialNumber),
      licensePlate: toUpperText(licensePlate),
      manufactureYear: manufactureYear ? Number(manufactureYear) : null,
      condition: toUpperText(condition),
      patrimonyCode: toUpperText(patrimonyCode),
      rentalValue: rentValue ? Number(rentValue.replace(/[^0-9.,]/g, "").replace(",", ".")) : null,
      operationalStatus,
      managementMode: isRealEstate ? managementMode : "OWNED",
      ownerId: isRealEstate && managementMode === "MANAGED" ? ownerId || null : null,
      administrationFeePercentage:
        isRealEstate && managementMode === "MANAGED" && administrationFeePercentage
          ? Number(administrationFeePercentage)
          : null,
      ownerPayoutDay:
        isRealEstate && managementMode === "MANAGED" && ownerPayoutDay
          ? Number(ownerPayoutDay)
          : null,
      autoCreateOwnerPayable:
        isRealEstate && managementMode === "MANAGED" ? autoCreateOwnerPayable : false,
      zipCode: zipCode || null,
      address: toUpperText(street) || null,
      number: toUpperText(number) || null,
      complement: toUpperText(complement) || null,
      district: toUpperText(neighborhood) || null,
      city: toUpperText(city) || null,
      state: toUpperText(state) || null,
      bedrooms: bedrooms ? Number(bedrooms) : null,
      bathrooms: bathrooms ? Number(bathrooms) : null,
      garages: garages ? Number(garages) : null,
      description: description.trim(),
      isActive,
      photos: JSON.stringify(photos),
    };

    try {
      await onSave(payload, selectedFiles);
    } catch (err: any) {
      setErrorMessage(err?.message || "Erro ao salvar bem/ativo.");
    }
  }

  if (!isOpen) return null;

  // Miniatura quando minimizado
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-2xl border border-orange-200 bg-white p-4 shadow-2xl">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
          <Building className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-black uppercase text-slate-800">
            {editingProperty ? "Editando Bem/Ativo" : "Novo Bem/Ativo"}
          </p>
          <p className="text-[11px] font-bold text-slate-500 line-clamp-1">
            {name || "Rascunho em edição"}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onRestore}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-orange-600"
            title="Restaurar"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-600"
            title="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const isRealEstate = assetCategory === "PROPERTY";

  const tabs = [
    { id: "identificacao", label: "1. Identificação" },
    { id: "dados", label: isRealEstate ? "2. Endereço & Cômodos" : "2. Dados Técnicos" },
    { id: "gestao", label: "3. Gestão & Repasse" },
    { id: "valores", label: "4. Valores & Status" },
    { id: "fotos", label: "5. Fotos & Anexos" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-[2.5rem] border border-orange-100 bg-white shadow-2xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-150 px-8 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 shadow-inner">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-950">
                {editingProperty ? "Editar Bem/Ativo" : "Cadastrar Novo Bem/Ativo"}
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                Preencha as informações patrimoniais e operacionais
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onMinimize}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
              title="Minimizar janela"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-orange-50 hover:text-orange-600"
              title="Fechar janela"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="flex border-b border-slate-100 px-8 pt-3 bg-slate-50/50 overflow-x-auto gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-4 py-2.5 text-xs font-black transition whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-orange-500 text-orange-600 bg-white rounded-t-xl"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Formulário com Scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          {errorMessage && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Aba 1: Identificação */}
          {activeTab === "identificacao" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Categoria do Ativo *
                  </label>
                  <select
                    value={assetCategory}
                    onChange={(e) => handleCategoryChange(e.target.value as AssetCategory)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  >
                    {assetCategories.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Tipo / Subcategoria
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as PropertyType)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  >
                    {getAssetTypesForCategory(assetCategory).map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Nome / Título do Bem/Ativo *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Escavadeira CAT 320D, Apartamento 301, Gerador 50kVA..."
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Código Interno
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Ex: MAQ-001, AP-301..."
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 uppercase"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Finalidade
                  </label>
                  <input
                    type="text"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Ex: Locação, Uso interno..."
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 uppercase"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Aba 2: Dados Técnicos OU Endereço */}
          {activeTab === "dados" && (
            <div className="space-y-4">
              {isRealEstate ? (
                /* Formulário de Imóvel */
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                        CEP
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={zipCode}
                          onChange={(e) => {
                            setZipCode(e.target.value);
                            if (e.target.value.replace(/\D/g, "").length === 8) {
                              handleSearchCep(e.target.value);
                            }
                          }}
                          placeholder="00000-000"
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                        />
                        {isSearchingCep && (
                          <LoaderCircle className="absolute right-3.5 top-3.5 h-4 w-4 animate-spin text-orange-500" />
                        )}
                      </div>
                      {cepFeedback && (
                        <p className="text-[11px] font-bold text-slate-500 mt-1">{cepFeedback}</p>
                      )}
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                        Logradouro / Rua
                      </label>
                      <input
                        type="text"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        placeholder="Rua, Avenida, Praça..."
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 uppercase"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                        Número
                      </label>
                      <input
                        type="text"
                        value={number}
                        onChange={(e) => setNumber(e.target.value)}
                        placeholder="123"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 uppercase"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                        Complemento
                      </label>
                      <input
                        type="text"
                        value={complement}
                        onChange={(e) => setComplement(e.target.value)}
                        placeholder="Apto 42, Bloco B..."
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 uppercase"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                        Bairro
                      </label>
                      <input
                        type="text"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        placeholder="Bairro"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 uppercase"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                        Cidade
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Cidade"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 uppercase"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                        Estado (UF)
                      </label>
                      <input
                        type="text"
                        maxLength={2}
                        value={state}
                        onChange={(e) => setState(e.target.value.toUpperCase())}
                        placeholder="SP"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 uppercase"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs font-black uppercase text-slate-500 mb-3">
                      Características do Imóvel
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600">Quartos</label>
                        <input
                          type="number"
                          min={0}
                          value={bedrooms}
                          onChange={(e) => setBedrooms(e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600">Banheiros</label>
                        <input
                          type="number"
                          min={0}
                          value={bathrooms}
                          onChange={(e) => setBathrooms(e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600">Vagas de Garagem</label>
                        <input
                          type="number"
                          min={0}
                          value={garages}
                          onChange={(e) => setGarages(e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Formulário de Equipamentos / Máquinas / Veículos */
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                      Marca
                    </label>
                    <input
                      type="text"
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      placeholder="Ex: Caterpillar, Bosch, Scania..."
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 uppercase"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                      Modelo
                    </label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder="Ex: 320D, G440, DWE4010..."
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 uppercase"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                      Número de Série
                    </label>
                    <input
                      type="text"
                      value={serialNumber}
                      onChange={(e) => setSerialNumber(e.target.value)}
                      placeholder="Número de série de fábrica"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 uppercase"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                      Código Patrimonial (Plaqueta)
                    </label>
                    <input
                      type="text"
                      value={patrimonyCode}
                      onChange={(e) => setPatrimonyCode(e.target.value)}
                      placeholder="Ex: PATR-1004"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 uppercase"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                      Placa (se veículo)
                    </label>
                    <input
                      type="text"
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                      placeholder="ABC-1234 ou ABC1D23"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 uppercase"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                      Ano de Fabricação
                    </label>
                    <input
                      type="number"
                      value={manufactureYear}
                      onChange={(e) => setManufactureYear(e.target.value)}
                      placeholder="Ex: 2024"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                      Condição de Uso
                    </label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    >
                      <option value="">Selecione a condição...</option>
                      {assetConditionOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Aba 3: Gestão & Repasse */}
          {activeTab === "gestao" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                  Modo de Gestão do Bem/Ativo
                </label>
                <div className="mt-2 flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-800">
                    <input
                      type="radio"
                      name="managementMode"
                      value="OWNED"
                      checked={managementMode === "OWNED"}
                      onChange={() => setManagementMode("OWNED")}
                      className="text-orange-600"
                    />
                    Ativo Próprio (da empresa)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-slate-800">
                    <input
                      type="radio"
                      name="managementMode"
                      value="MANAGED"
                      checked={managementMode === "MANAGED"}
                      onChange={() => setManagementMode("MANAGED")}
                      className="text-orange-600"
                    />
                    Administrado de Terceiro (Gera Repasse ao Proprietário)
                  </label>
                </div>
              </div>

              {managementMode === "MANAGED" && (
                <div className="space-y-4 rounded-2xl border border-orange-200 bg-orange-50/40 p-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-orange-900">
                      Proprietário do Bem *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsOwnerCreateOpen(true)}
                      className="flex items-center gap-1 text-xs font-black text-orange-600 hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Cadastrar Proprietário
                    </button>
                  </div>

                  <select
                    value={ownerId}
                    onChange={(e) => setOwnerId(e.target.value)}
                    className="w-full rounded-2xl border border-orange-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  >
                    <option value="">Selecione o proprietário...</option>
                    {owners.map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {owner.name} ({owner.document || "Sem documento"})
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        Taxa de Administração (%)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step="0.1"
                        value={administrationFeePercentage}
                        onChange={(e) => setAdministrationFeePercentage(e.target.value)}
                        placeholder="Ex: 10"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">
                        Dia do Mês para Repasse
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={ownerPayoutDay}
                        onChange={(e) => setOwnerPayoutDay(e.target.value)}
                        placeholder="Ex: 10"
                        className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 mt-2">
                    <input
                      type="checkbox"
                      checked={autoCreateOwnerPayable}
                      onChange={(e) => setAutoCreateOwnerPayable(e.target.checked)}
                      className="rounded text-orange-600"
                    />
                    Gerar automaticamente Conta a Pagar de repasse ao liquidar recebimento do contrato
                  </label>
                </div>
              )}
            </div>
          )}

          {/* Aba 4: Valores & Status */}
          {activeTab === "valores" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Valor de Locação Base (R$)
                  </label>
                  <input
                    type="text"
                    value={rentValue}
                    onChange={(e) => setRentValue(e.target.value)}
                    placeholder="0,00"
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                  <p className="text-[11px] text-slate-400 font-semibold">
                    Valor sugerido de aluguel por mês/período
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Status Operacional Inicial
                  </label>
                  <select
                    value={operationalStatus}
                    onChange={(e) => setOperationalStatus(e.target.value as AssetOperationalStatus)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  >
                    {operationalStatusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Observações / Descrição Adicional
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detalhes, avarias pré-existentes, instruções de uso..."
                    className="w-full rounded-2xl border border-slate-200 p-4 text-sm font-semibold text-slate-800 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Aba 5: Fotos & Anexos */}
          {activeTab === "fotos" && (
            <div className="space-y-4">
              <div className="rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center hover:border-orange-500 transition">
                <Upload className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-2 text-xs font-black uppercase text-slate-700">
                  Clique ou arraste imagens do bem/ativo
                </p>
                <p className="text-[11px] text-slate-400 font-semibold mt-1">
                  PNG, JPG ou WEBP (até 10MB por arquivo)
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileSelection}
                  className="mt-4 block mx-auto text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer"
                />
              </div>

              {/* Lista de Fotos Existentes */}
              {photos.length > 0 && (
                <div>
                  <p className="text-xs font-black uppercase text-slate-600 mb-2">
                    Fotos Anexadas ({photos.length})
                  </p>
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                    {photos.map((url, idx) => (
                      <div
                        key={idx}
                        onClick={() =>
                          setLightboxMedia({
                            url: getMediaUrl(url),
                            title: `Foto ${idx + 1} • ${name || "Bem/Ativo"}`,
                            isPdf: false,
                          })
                        }
                        className="group relative rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-50 cursor-pointer shadow-sm hover:shadow-md transition"
                        title="Clique para visualizar em tela cheia"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getMediaUrl(url)}
                          alt="Foto"
                          className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                          onError={(e) => {
                            (e.target as HTMLElement).style.opacity = "0.2";
                          }}
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 pointer-events-none p-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightboxMedia({
                                url: getMediaUrl(url),
                                title: `Foto ${idx + 1} • ${name || "Bem/Ativo"}`,
                                isPdf: false,
                              });
                            }}
                            className="pointer-events-auto rounded-lg bg-white px-2 py-1 text-[11px] font-black text-slate-900 shadow hover:bg-slate-100 flex items-center gap-1 transition active:scale-95 cursor-pointer"
                          >
                            <ZoomIn className="h-3 w-3" /> Ver
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveExistingPhoto(idx);
                            }}
                            className="pointer-events-auto h-6 w-6 rounded-lg bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition shadow active:scale-95 cursor-pointer"
                            title="Remover foto"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lista de Novos Arquivos Selecionados */}
              {selectedFiles.length > 0 && (
                <div>
                  <p className="text-xs font-black uppercase text-orange-600 mb-2">
                    Novas Fotos Prontas para Upload ({selectedFiles.length})
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {selectedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          if (file.type.startsWith("image/")) {
                            setLightboxMedia({
                              url: URL.createObjectURL(file),
                              title: `Prévia • ${file.name}`,
                              isPdf: false,
                            });
                          }
                        }}
                        className={`flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50/50 p-2 text-xs transition ${
                          file.type.startsWith("image/") ? "cursor-pointer hover:bg-orange-100/70" : ""
                        }`}
                        title={file.type.startsWith("image/") ? "Clique para visualizar prévia" : file.name}
                      >
                        <span className="truncate max-w-[150px] font-semibold text-slate-700 flex items-center gap-1.5">
                          {file.type.startsWith("image/") && <ZoomIn className="h-3.5 w-3.5 text-orange-600 shrink-0" />}
                          {file.name}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveSelectedFile(idx);
                          }}
                          className="text-red-500 hover:text-red-700 ml-2 cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer do Form */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-150 pt-5">
            <div className="flex items-center gap-2">
              {editingProperty && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (editingProperty.isActive) {
                        setInactivateError(null);
                        setIsConfirmingInactivate(true);
                      } else {
                        handleDirectReactivate();
                      }
                    }}
                    disabled={isSaving || isInactivating || isDeleting}
                    className={`rounded-2xl border px-4 py-2.5 text-xs font-black transition flex items-center gap-1.5 ${
                      editingProperty.isActive
                        ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                        : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    }`}
                    title={
                      editingProperty.isActive
                        ? "Inativar este bem/ativo"
                        : "Reativar este bem/ativo"
                    }
                  >
                    {editingProperty.isActive ? (
                      <>
                        <PowerOff className="h-4 w-4" />
                        Inativar bem/ativo
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Reativar bem/ativo
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError(null);
                      setIsConfirmingDelete(true);
                    }}
                    disabled={isSaving || isInactivating || isDeleting}
                    className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-black text-red-600 hover:bg-red-100 transition flex items-center gap-1.5"
                    title="Excluir este cadastro definitivamente (apenas para cadastros sem movimentação)"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir cadastro
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving || isInactivating || isDeleting}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSaving || isInactivating || isDeleting}
                className="flex items-center gap-2 rounded-2xl bg-orange-600 px-6 py-2.5 text-xs font-black text-white shadow-md shadow-orange-200 transition hover:bg-orange-700 active:scale-95 disabled:opacity-50"
              >
                {isSaving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                {editingProperty ? "Salvar Alterações" : "Cadastrar Bem/Ativo"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Modal Inline para Novo Proprietário */}
      {isOwnerCreateOpen && (
        <PersonCreateModal
          open={isOwnerCreateOpen}
          onClose={() => setIsOwnerCreateOpen(false)}
          onCreated={(newPerson) => {
            setIsOwnerCreateOpen(false);
            setOwnerId(newPerson.id);
            if (onOwnerCreated) {
              onOwnerCreated(newPerson);
            }
          }}
        />
      )}

      {/* Modal de Confirmação para Inativação Direta dentro do Formulário */}
      {isConfirmingInactivate && editingProperty && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-amber-100 bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <PowerOff className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Inativar bem/ativo?
              </h3>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                Deseja inativar o cadastro de{" "}
                <span className="font-black text-slate-950 uppercase">
                  {editingProperty.name}
                </span>?
              </p>
            </div>

            <p className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 text-xs font-medium text-slate-600">
              Ao inativar, o bem/ativo deixará de ser disponibilizado para novos contratos e locações, mas todo o seu histórico financeiro e contratual continuará preservado.
            </p>

            {inactivateError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <span>{inactivateError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmingInactivate(false);
                  setInactivateError(null);
                }}
                disabled={isInactivating}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmInactivate}
                disabled={isInactivating}
                className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-black text-white hover:bg-amber-700 transition shadow-md shadow-amber-500/20"
              >
                {isInactivating ? "Inativando..." : "Sim, Inativar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Exclusão Definitiva */}
      {isConfirmingDelete && editingProperty && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <Trash2 className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Excluir cadastro definitivamente?
              </h3>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                Deseja excluir o cadastro de{" "}
                <span className="font-black text-slate-950 uppercase">
                  {editingProperty.name}
                </span>?
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs font-medium text-amber-900 leading-relaxed space-y-1">
              <p className="font-bold text-amber-950">
                Regra de integridade do sistema:
              </p>
              <p>
                A exclusão definitiva só é permitida para bens/ativos que <strong>nunca tiveram nenhuma movimentação</strong> (contratos de locação, contas a pagar, contas a receber ou movimentações patrimoniais).
              </p>
            </div>

            {deleteError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-2.5">
                <div className="flex items-start gap-2 text-xs font-bold text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
                <div className="pt-2 border-t border-red-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-red-700">
                    Deseja inativar em vez de excluir?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsConfirmingDelete(false);
                      setDeleteError(null);
                      setIsConfirmingInactivate(true);
                    }}
                    className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-black text-white hover:bg-red-700 transition shadow-sm shrink-0"
                  >
                    Inativar bem/ativo
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsConfirmingDelete(false);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white hover:bg-red-700 transition shadow-md shadow-red-500/20 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Sim, Excluir definitivamente
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <MediaLightboxModal
        isOpen={Boolean(lightboxMedia)}
        mediaUrl={lightboxMedia?.url || null}
        title={lightboxMedia?.title}
        isPdf={lightboxMedia?.isPdf}
        onClose={() => setLightboxMedia(null)}
      />
    </div>
  );
}
