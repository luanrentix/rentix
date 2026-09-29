"use client";

import React, { useState, useEffect, type FormEvent, type ChangeEvent } from "react";
import {
  X,
  Minus,
  Search,
  LoaderCircle,
  Building2,
  UserRound,
  Upload,
  AlertCircle,
  UserCheck,
  UserX,
  Trash2,
  MapPin,
  Phone,
  Mail,
  Camera,
} from "lucide-react";
import {
  type Person,
  type PersonFormData,
  type PersonType,
  emptyFormData,
  onlyDigits,
  toUpperText,
  formatDocument,
  formatPhone,
  formatZipCode,
  buildPersonAddress,
  parsePersonAddress,
  isValidDocument,
  convertPersonTypeToApiType,
  convertPersonStatusToApiStatus,
  mapApiPersonToPerson,
} from "./person-types";
import { createPerson, updatePerson, deletePerson } from "@/services/people.service";
import { getMediaUrl } from "@/services/api";

interface PersonFormModalProps {
  isOpen: boolean;
  editingPerson: Person | null;
  companyId: string;
  people: Person[];
  initialDraft?: PersonFormData | null;
  onDraftChange?: (draft: PersonFormData) => void;
  onMinimize?: (draft: PersonFormData) => void;
  onClose: () => void;
  onSaveSuccess: (
    person: Person,
    isEdit: boolean,
    actionType?: "create" | "update" | "inactivate" | "reactivate"
  ) => void;
  onDeleteSuccess?: (personId: string) => void;
  zIndex?: string;
}

type TabType = "identificacao" | "contato_endereco" | "perfil_foto";

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

type CnpjApiResponse = {
  cnpj?: string;
  razao_social?: string;
  nome_fantasia?: string;
  email?: string | null;
  ddd_telefone_1?: string | null;
  ddd_telefone_2?: string | null;
  cep?: string | null;
  municipio?: string | null;
  uf?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  descricao_situacao_cadastral?: string | null;
};

export function PersonFormModal({
  isOpen,
  editingPerson,
  companyId,
  people,
  initialDraft,
  onDraftChange,
  onMinimize,
  onClose,
  onSaveSuccess,
  onDeleteSuccess,
  zIndex,
}: PersonFormModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("identificacao");
  const [formData, setFormData] = useState<PersonFormData>(emptyFormData);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isSearchingZipCode, setIsSearchingZipCode] = useState(false);
  const [isSearchingCnpj, setIsSearchingCnpj] = useState(false);
  const [isConfirmingInactivate, setIsConfirmingInactivate] = useState(false);
  const [isInactivating, setIsInactivating] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [formError, setFormError] = useState<string | null>(null);
  const [zipCodeError, setZipCodeError] = useState<string | null>(null);
  const [cnpjError, setCnpjError] = useState<string | null>(null);

  const isEditing = Boolean(editingPerson);

  // Inicialização do formulário ao abrir ou trocar a pessoa
  useEffect(() => {
    if (isOpen) {
      if (initialDraft && initialDraft.name) {
        // Rascunho restaurado de minimização
        setFormData(initialDraft);
        setPhotoPreview(initialDraft.photo ? getMediaUrl(initialDraft.photo) : null);
      } else if (editingPerson) {
        // Modo Edição: carregar dados cadastrais da pessoa
        const parsed = parsePersonAddress(editingPerson.address);
        setFormData({
          name: editingPerson.name || "",
          type: editingPerson.type || "individual",
          document: editingPerson.document || "",
          stateRegistration: editingPerson.stateRegistration || "",
          identityNumber: editingPerson.identityNumber || "",
          email: editingPerson.email || "",
          phone: editingPerson.phone || "",
          zipCode: editingPerson.zipCode || "",
          city: editingPerson.city || "",
          state: editingPerson.state || "",
          address: parsed.address,
          addressNumber: parsed.addressNumber,
          district: parsed.district,
          reference: parsed.reference,
          isTenant: editingPerson.isTenant !== false,
          status: editingPerson.status || "active",
          photo: editingPerson.photo || null,
        });
        setPhotoPreview(editingPerson.photo ? getMediaUrl(editingPerson.photo) : null);
      } else {
        // Novo cadastro limpo
        setFormData(emptyFormData);
        setPhotoPreview(null);
      }

      setSelectedFile(null);
      setActiveTab("identificacao");
      setFormError(null);
      setZipCodeError(null);
      setCnpjError(null);
      setIsConfirmingInactivate(false);
      setIsConfirmingDelete(false);
      setIsDeleting(false);
      setDeleteError(null);
    }
  }, [isOpen, editingPerson, initialDraft]);

  if (!isOpen) return null;

  function updateField<K extends keyof PersonFormData>(field: K, value: PersonFormData[K]) {
    setFormError(null);
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      onDraftChange?.(updated);
      return updated;
    });
  }

  function handleDocumentChange(value: string) {
    const formatted = formatDocument(value, formData.type);
    updateField("document", formatted);
  }

  function handlePhoneChange(value: string) {
    updateField("phone", formatPhone(value));
  }

  function handleZipCodeChange(value: string) {
    updateField("zipCode", formatZipCode(value));
  }

  function handleChangeType(newType: PersonType) {
    setFormData((prev) => {
      const updated: PersonFormData = {
        ...prev,
        type: newType,
        document: "",
        stateRegistration: "",
        identityNumber: "",
      };
      onDraftChange?.(updated);
      return updated;
    });
    setCnpjError(null);
    setFormError(null);
  }

  // Busca de CEP via ViaCEP
  async function handleSearchZipCode() {
    const digits = onlyDigits(formData.zipCode);
    if (digits.length !== 8) {
      setZipCodeError("Informe um CEP válido com 8 dígitos.");
      return;
    }

    try {
      setIsSearchingZipCode(true);
      setZipCodeError(null);

      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = (await res.json()) as ViaCepResponse;

      if (!res.ok || data.erro) {
        setZipCodeError("CEP não encontrado.");
        return;
      }

      setFormData((prev) => {
        const updated: PersonFormData = {
          ...prev,
          city: toUpperText(data.localidade ?? prev.city),
          state: toUpperText(data.uf ?? prev.state).slice(0, 2),
          address: toUpperText(data.logradouro ?? prev.address),
          district: toUpperText(data.bairro ?? prev.district),
        };
        onDraftChange?.(updated);
        return updated;
      });
    } catch {
      setZipCodeError("Não foi possível consultar o CEP no momento.");
    } finally {
      setIsSearchingZipCode(false);
    }
  }

  // Busca de CNPJ via BrasilAPI
  async function handleSearchCnpj() {
    const digits = onlyDigits(formData.document);
    if (formData.type !== "company") {
      setCnpjError("A busca está disponível apenas para Pessoa Jurídica.");
      return;
    }

    if (digits.length !== 14) {
      setCnpjError("Informe um CNPJ válido com 14 dígitos.");
      return;
    }

    try {
      setIsSearchingCnpj(true);
      setCnpjError(null);

      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!res.ok) {
        setCnpjError("CNPJ não encontrado na Receita Federal ou indisponível.");
        return;
      }

      const data = (await res.json()) as CnpjApiResponse;

      setFormData((prev) => {
        const updated: PersonFormData = {
          ...prev,
          name:
            toUpperText(data.razao_social?.trim() || "") ||
            toUpperText(data.nome_fantasia?.trim() || "") ||
            prev.name,
          email: data.email?.trim().toLowerCase() || prev.email,
          phone: data.ddd_telefone_1
            ? formatPhone(data.ddd_telefone_1)
            : data.ddd_telefone_2
              ? formatPhone(data.ddd_telefone_2)
              : prev.phone,
          zipCode: data.cep ? formatZipCode(data.cep) : prev.zipCode,
          city: toUpperText(data.municipio ?? prev.city),
          state: toUpperText(data.uf ?? prev.state).slice(0, 2),
          address: toUpperText(data.logradouro ?? prev.address),
          addressNumber: toUpperText(data.numero ?? prev.addressNumber),
          district: toUpperText(data.bairro ?? prev.district),
          reference: toUpperText(data.complemento ?? prev.reference),
          status:
            data.descricao_situacao_cadastral?.toUpperCase() === "ATIVA"
              ? "active"
              : prev.status,
        };
        onDraftChange?.(updated);
        return updated;
      });
    } catch {
      setCnpjError("Não foi possível consultar o CNPJ agora.");
    } finally {
      setIsSearchingCnpj(false);
    }
  }

  function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const localUrl = URL.createObjectURL(file);
    setPhotoPreview(localUrl);
  }

  function handleRemovePhoto() {
    setSelectedFile(null);
    setPhotoPreview(null);
    updateField("photo", null);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!formData.name.trim() || !formData.document.trim()) {
      setFormError("Informe o nome e o documento para salvar a pessoa.");
      return;
    }

    if (!isValidDocument(formData.document, formData.type)) {
      setFormError(
        formData.type === "company"
          ? "Informe um CNPJ válido com dígitos corretos."
          : "Informe um CPF válido com dígitos corretos."
      );
      return;
    }

    const normDoc = onlyDigits(formData.document);
    const hasDuplicate = people.some(
      (p) =>
        (!editingPerson || p.id !== editingPerson.id) &&
        onlyDigits(p.document) === normDoc
    );

    if (hasDuplicate) {
      setFormError("Já existe uma pessoa cadastrada com este documento.");
      return;
    }

    const payload = {
      type: convertPersonTypeToApiType(formData.type),
      status: convertPersonStatusToApiStatus(formData.status),
      name: toUpperText(formData.name).trim(),
      document: normDoc,
      stateRegistration:
        formData.type === "company"
          ? toUpperText(formData.stateRegistration).trim() || undefined
          : undefined,
      identityNumber:
        formData.type === "individual"
          ? toUpperText(formData.identityNumber).trim() || undefined
          : undefined,
      email: formData.email.trim().toLowerCase() || undefined,
      phone: formData.phone.trim() || undefined,
      zipCode: formData.zipCode.trim() || undefined,
      city: toUpperText(formData.city).trim() || undefined,
      state: toUpperText(formData.state).trim() || undefined,
      address: buildPersonAddress(formData) || undefined,
      isTenant: formData.isTenant,
    };

    try {
      setIsSaving(true);
      setFormError(null);

      let savedPersonApi;
      if (editingPerson) {
        savedPersonApi = await updatePerson(editingPerson.id, payload);
      } else {
        savedPersonApi = await createPerson(payload);
      }

      // Upload de arquivo se houver foto selecionada
      if (selectedFile && companyId) {
        const formDataApi = new FormData();
        formDataApi.append("file", selectedFile);
        formDataApi.append("companyId", companyId);
        formDataApi.append("entityType", "PERSON");
        formDataApi.append("entityId", savedPersonApi.id);

        try {
          const { api } = await import("@/services/api");
          await api.post("/files/upload", formDataApi, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } catch (err) {
          console.error("Erro no upload da foto", err);
        }
      }

      const mappedPerson = mapApiPersonToPerson(savedPersonApi);
      onSaveSuccess(mappedPerson, isEditing, isEditing ? "update" : "create");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível salvar a pessoa.";
      setFormError(msg);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmInactivate() {
    if (!editingPerson) return;
    try {
      setIsInactivating(true);
      const updatedApi = await updatePerson(editingPerson.id, { status: "INACTIVE" });
      const mapped = mapApiPersonToPerson(updatedApi);
      onSaveSuccess(mapped, true, "inactivate");
      setIsConfirmingInactivate(false);
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao inativar a pessoa.");
      setIsConfirmingInactivate(false);
    } finally {
      setIsInactivating(false);
    }
  }

  async function handleDirectReactivate() {
    if (!editingPerson) return;
    try {
      setIsInactivating(true);
      const updatedApi = await updatePerson(editingPerson.id, { status: "ACTIVE" });
      const mapped = mapApiPersonToPerson(updatedApi);
      onSaveSuccess(mapped, true, "reactivate");
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao reativar a pessoa.");
    } finally {
      setIsInactivating(false);
    }
  }

  async function handleConfirmDelete() {
    if (!editingPerson) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await deletePerson(editingPerson.id);
      onDeleteSuccess?.(editingPerson.id);
      setIsConfirmingDelete(false);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível excluir a pessoa.";
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className={`fixed inset-0 ${zIndex || "z-50"} flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm`}>
      <div className="max-h-[92vh] w-full max-w-4xl flex flex-col rounded-3xl border border-orange-100 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-white">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
              {isEditing ? "Editar Pessoa" : "Nova Pessoa"}
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm font-medium text-slate-500">
              {isEditing
                ? `Atualize os dados cadastrais de ${editingPerson?.name || "pessoa"}`
                : "Preencha os dados cadastrais para uso em contratos e financeiro."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onMinimize && (
              <button
                type="button"
                onClick={() => onMinimize(formData)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-orange-50 hover:text-orange-600 transition"
                title="Minimizar formulário"
              >
                <Minus className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
              title="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Abas de Navegação */}
        <div className="flex border-b border-slate-100 bg-slate-50 px-6 gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab("identificacao")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-t-xl transition ${
              activeTab === "identificacao"
                ? "bg-white text-orange-600 border-t-2 border-orange-500 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UserRound className="h-3.5 w-3.5" />
            1. Identificação
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("contato_endereco")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-t-xl transition ${
              activeTab === "contato_endereco"
                ? "bg-white text-orange-600 border-t-2 border-orange-500 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            2. Contato & Endereço
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("perfil_foto")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black rounded-t-xl transition ${
              activeTab === "perfil_foto"
                ? "bg-white text-orange-600 border-t-2 border-orange-500 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            3. Perfil & Foto
          </button>
        </div>

        {/* Formulário com Scroll Interno */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {formError && (
            <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* TAB 1: IDENTIFICAÇÃO */}
          {activeTab === "identificacao" && (
            <div className="space-y-4">
              {/* Seletor Tipo: PF vs PJ */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                  Tipo de Cadastro *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleChangeType("individual")}
                    className={`flex items-center justify-center gap-2 rounded-2xl border p-3.5 text-xs font-black transition ${
                      formData.type === "individual"
                        ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <UserRound className="h-4 w-4" />
                    Pessoa Física (CPF)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleChangeType("company")}
                    className={`flex items-center justify-center gap-2 rounded-2xl border p-3.5 text-xs font-black transition ${
                      formData.type === "company"
                        ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Building2 className="h-4 w-4" />
                    Pessoa Jurídica (CNPJ)
                  </button>
                </div>
              </div>

              {/* Nome Completo ou Razão Social */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                  {formData.type === "company"
                    ? "Razão Social / Nome da Empresa *"
                    : "Nome Completo *"}
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => updateField("name", toUpperText(e.target.value))}
                  placeholder={
                    formData.type === "company"
                      ? "Ex: CONSTRUTORA E IMOBILIARIA SILVA LTDA"
                      : "Ex: JOÃO CARLOS DA SILVA"
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none uppercase transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </div>

              {/* Documento CPF/CNPJ com Busca Automática de CNPJ */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                      {formData.type === "company" ? "CNPJ *" : "CPF *"}
                    </label>

                    {formData.type === "company" && (
                      <button
                        type="button"
                        onClick={handleSearchCnpj}
                        disabled={isSearchingCnpj}
                        className="text-[11px] font-black text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1"
                      >
                        {isSearchingCnpj ? (
                          <LoaderCircle className="h-3 w-3 animate-spin" />
                        ) : (
                          <Search className="h-3 w-3" />
                        )}
                        Consultar Receita
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    required
                    value={formData.document}
                    onChange={(e) => handleDocumentChange(e.target.value)}
                    placeholder={
                      formData.type === "company"
                        ? "00.000.000/0000-00"
                        : "000.000.000-00"
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />

                  {cnpjError && (
                    <p className="text-[11px] font-bold text-red-600">{cnpjError}</p>
                  )}
                </div>

                {/* RG para PF ou Inscrição Estadual para PJ */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                    {formData.type === "company"
                      ? "Inscrição Estadual (IE)"
                      : "RG / Documento de Identidade"}
                  </label>
                  <input
                    type="text"
                    value={
                      formData.type === "company"
                        ? formData.stateRegistration
                        : formData.identityNumber
                    }
                    onChange={(e) =>
                      updateField(
                        formData.type === "company"
                          ? "stateRegistration"
                          : "identityNumber",
                        toUpperText(e.target.value)
                      )
                    }
                    placeholder={
                      formData.type === "company"
                        ? "ISENTO ou número da IE"
                        : "Número do RG ou CNH"
                    }
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none uppercase transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              </div>

              {/* Opção para definir se é Inquilino ou não */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition-all hover:border-orange-200 hover:bg-orange-50/30">
                <label className="flex items-start gap-3.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.isTenant}
                    onChange={(e) => updateField("isTenant", e.target.checked)}
                    className="mt-1 h-5 w-5 rounded-md border-slate-300 text-orange-600 focus:ring-orange-500 accent-orange-500 cursor-pointer shrink-0"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-slate-900">
                        Marcar como Inquilino (Locatário)
                      </span>
                      {formData.isTenant ? (
                        <span className="rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-800 tracking-wide">
                          Ativo para Contratos de Imóveis
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-200 border border-slate-300 px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-600 tracking-wide">
                          Não aparece em Contratos
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold leading-relaxed text-slate-500">
                      {formData.isTenant
                        ? "Marcado: a pessoa fica ativa e disponível para ser selecionada como inquilino/locatário em contratos de locação de bens e imóveis."
                        : "Desmarcado: esta pessoa NÃO aparecerá para seleção em contratos de locação (ficando disponível para demais lançamentos e financeiro)."}
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: CONTATO E ENDEREÇO */}
          {activeTab === "contato_endereco" && (
            <div className="space-y-4">
              {/* Contatos: Telefone e E-mail */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-slate-400" />
                    Telefone / Celular (WhatsApp)
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Mail className="h-3 w-3 text-slate-400" />
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="contato@exemplo.com.br"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              </div>

              {/* CEP com Busca Automática ViaCEP */}
              <div className="grid gap-3 sm:grid-cols-[180px_1fr_100px]">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                      CEP
                    </label>
                    <button
                      type="button"
                      onClick={handleSearchZipCode}
                      disabled={isSearchingZipCode}
                      className="text-[11px] font-black text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1"
                    >
                      {isSearchingZipCode ? (
                        <LoaderCircle className="h-3 w-3 animate-spin" />
                      ) : (
                        <Search className="h-3 w-3" />
                      )}
                      Buscar
                    </button>
                  </div>
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => handleZipCodeChange(e.target.value)}
                    placeholder="00000-000"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                  {zipCodeError && (
                    <p className="text-[11px] font-bold text-red-600">{zipCodeError}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => updateField("city", toUpperText(e.target.value))}
                    placeholder="Cidade"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none uppercase transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                    UF
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formData.state}
                    onChange={(e) =>
                      updateField("state", toUpperText(e.target.value).slice(0, 2))
                    }
                    placeholder="UF"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none uppercase text-center transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              </div>

              {/* Logradouro e Número */}
              <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Logradouro (Rua, Av, Travessa)
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => updateField("address", toUpperText(e.target.value))}
                    placeholder="Ex: RUA DAS PALMEIRAS"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none uppercase transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Número
                  </label>
                  <input
                    type="text"
                    value={formData.addressNumber}
                    onChange={(e) =>
                      updateField("addressNumber", toUpperText(e.target.value))
                    }
                    placeholder="Ex: 120"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none uppercase transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              </div>

              {/* Bairro e Complemento / Referência */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={formData.district}
                    onChange={(e) => updateField("district", toUpperText(e.target.value))}
                    placeholder="Ex: CENTRO"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none uppercase transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                    Complemento / Referência
                  </label>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(e) =>
                      updateField("reference", toUpperText(e.target.value))
                    }
                    placeholder="Ex: APTO 302, BLOCO B"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none uppercase transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PERFIL & FOTO */}
          {activeTab === "perfil_foto" && (
            <div className="space-y-5">
              {/* Classificação para Contratos */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition-all hover:border-orange-200 hover:bg-orange-50/30">
                <label className="flex items-start gap-3.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.isTenant}
                    onChange={(e) => updateField("isTenant", e.target.checked)}
                    className="mt-1 h-5 w-5 rounded-md border-slate-300 text-orange-600 focus:ring-orange-500 accent-orange-500 cursor-pointer shrink-0"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-slate-900">
                        Marcar como Inquilino (Locatário)
                      </span>
                      {formData.isTenant ? (
                        <span className="rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-800 tracking-wide">
                          Ativo para Contratos de Imóveis
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-200 border border-slate-300 px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-600 tracking-wide">
                          Não aparece em Contratos
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold leading-relaxed text-slate-500">
                      {formData.isTenant
                        ? "Marcado: a pessoa fica ativa e disponível para ser selecionada como inquilino/locatário em contratos de locação de bens e imóveis."
                        : "Desmarcado: esta pessoa NÃO aparecerá para seleção em contratos de locação (ficando disponível para demais lançamentos e financeiro)."}
                    </p>
                  </div>
                </label>
              </div>

              {/* Upload de Foto / Documento com Preview */}
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-600">
                  Foto ou Documento de Identificação
                </label>

                <div className="flex items-center gap-4 rounded-3xl border border-dashed border-slate-300 p-4 bg-slate-50/50">
                  {photoPreview ? (
                    <div className="relative h-20 w-20 shrink-0 rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="absolute top-1 right-1 h-5 w-5 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition"
                        title="Remover foto"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 border border-orange-200">
                      <Camera className="h-7 w-7" />
                    </div>
                  )}

                  <div className="flex-1 space-y-1">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-black text-slate-700 shadow-sm hover:bg-slate-50 transition">
                      <Upload className="h-3.5 w-3.5 text-orange-600" />
                      Selecionar Arquivo / Imagem
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileSelected}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] font-semibold text-slate-400">
                      PNG, JPG ou PDF (máx. 10MB). O anexo será vinculado à ficha da pessoa.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Rodapé com Botões de Ação */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2 flex-wrap">
              {isEditing && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.status === "active") {
                        setIsConfirmingInactivate(true);
                      } else {
                        handleDirectReactivate();
                      }
                    }}
                    disabled={isSaving || isInactivating || isDeleting}
                    className={`rounded-2xl px-4 py-2.5 text-xs font-black transition flex items-center gap-1.5 ${
                      formData.status === "active"
                        ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                    }`}
                    title={
                      formData.status === "active"
                        ? "Inativar este cadastro"
                        : "Reativar este cadastro"
                    }
                  >
                    {isInactivating ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : formData.status === "active" ? (
                      <>
                        <UserX className="h-4 w-4" />
                        Inativar cadastro
                      </>
                    ) : (
                      <>
                        <UserCheck className="h-4 w-4" />
                        Reativar cadastro
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

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving || isInactivating || isDeleting}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>

              {activeTab !== "identificacao" && (
                <button
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      activeTab === "perfil_foto"
                        ? "contato_endereco"
                        : "identificacao"
                    )
                  }
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50 transition"
                >
                  Voltar
                </button>
              )}

              {activeTab !== "perfil_foto" ? (
                <button
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      activeTab === "identificacao"
                        ? "contato_endereco"
                        : "perfil_foto"
                    )
                  }
                  className="rounded-2xl bg-slate-900 px-5 py-2.5 text-xs font-black text-white hover:bg-slate-800 transition shadow-sm"
                >
                  Avançar
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSaving || isInactivating || isDeleting}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-2.5 text-xs font-black text-white shadow-md shadow-orange-500/20 hover:bg-orange-600 transition disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : isEditing ? (
                    "Atualizar Pessoa"
                  ) : (
                    "Cadastrar Pessoa"
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Modal de Confirmação para Inativação Direta dentro do Formulário */}
      {isConfirmingInactivate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <UserX className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Inativar cadastro?
              </h3>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                Deseja inativar o cadastro de{" "}
                <span className="font-black text-slate-950 uppercase">
                  {formData.name}
                </span>?
              </p>
            </div>

            <p className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 text-xs font-medium text-slate-600">
              Ao inativar, a pessoa não aparecerá em novos lançamentos ou contratos, mas todo o seu histórico financeiro e contratual continuará preservado.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmingInactivate(false)}
                disabled={isInactivating}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmInactivate}
                disabled={isInactivating}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-black text-white hover:bg-red-700 transition shadow-md shadow-red-500/20"
              >
                {isInactivating ? "Inativando..." : "Sim, Inativar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Exclusão Definitiva */}
      {isConfirmingDelete && editingPerson && (
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
                  {editingPerson.name}
                </span>?
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 text-xs font-medium text-amber-900 leading-relaxed space-y-1">
              <p className="font-bold text-amber-950">
                Regra de integridade do sistema:
              </p>
              <p>
                A exclusão definitiva só é permitida para pessoas que <strong>nunca tiveram nenhuma movimentação</strong> (contratos de locação, contas a pagar, contas a receber ou bens vinculados).
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
                    Inativar cadastro
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
    </div>
  );
}
