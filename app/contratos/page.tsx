"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/app-shell";
import { Tenant, initialTenants } from "@/data/tenants";

const CONTRACTS_STORAGE_KEY = "rentix_contracts";
const PROPERTIES_STORAGE_KEY = "rentix_properties";
const TENANTS_STORAGE_KEY = "rentix_tenants";
const RECEIVABLE_FROM_CONTRACT_STORAGE_KEY = "rentix_new_charge_from_contract";
const MANUAL_CHARGES_STORAGE_KEY = "rentix_manual_charges";
const PAID_CHARGES_STORAGE_KEY = "rentix_paid_charges";
const CHARGE_PAYMENTS_STORAGE_KEY = "rentix_charge_payments";
const EXPIRING_CONTRACT_DAYS_LIMIT = 30;

type PropertyStatus = "Available" | "Rented";

type Property = {
  id: string;
  name: string;
  rentValue?: number;
  status: PropertyStatus;
  isActive?: boolean;
};

type RentixTenant = Tenant & {
  isTenant?: boolean;
  isActive?: boolean;
};

type ContractStatus =
  | "Active"
  | "Inactive"
  | "Canceled"
  | "Finished"
  | "Deleted";

type ContractDisplayStatus = ContractStatus | "Expiring";

type ContractFilterStatus = "All" | ContractStatus | "Expiring";

type Contract = {
  id: number;
  propertyId: string;
  propertyName: string;
  tenantId: number;
  tenantName: string;
  startDate: string;
  endDate: string;
  rentValue: number;
  status?: ContractStatus;
  deletedAt?: string | null;
  statusReason?: string | null;
  statusReasonType?: "Canceled" | "Deleted" | null;
  statusReasonAt?: string | null;
};

type ReceivableCharge = {
  id: string;
  contractId?: string | number | null;
  property?: string;
  tenant?: string;
  dueDate?: string;
  amount?: number;
  manual?: boolean;
  issueDate?: string;
  installmentNumber?: number;
  installmentTotal?: number;
  installmentGroupId?: string;
};

type ChargePaymentRecord = {
  chargeId: string;
  [key: string]: unknown;
};

type PendingStatusChange = {
  contract: Contract;
  nextStatus: "Canceled" | "Deleted";
};

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<RentixTenant[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingContractId, setEditingContractId] = useState<number | null>(
    null
  );
  const [statusFilter, setStatusFilter] =
    useState<ContractFilterStatus>("Active");
  const [searchTerm, setSearchTerm] = useState("");

  const [propertyId, setPropertyId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rentValue, setRentValue] = useState("");
  const [contractStatus, setContractStatus] =
    useState<ContractStatus>("Active");
  const [pendingStatusChange, setPendingStatusChange] =
    useState<PendingStatusChange | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [statusReasonError, setStatusReasonError] = useState("");

  const isEditing = editingContractId !== null;

  useEffect(() => {
    const storedContracts = localStorage.getItem(CONTRACTS_STORAGE_KEY);
    const storedProperties = localStorage.getItem(PROPERTIES_STORAGE_KEY);
    const storedTenants = localStorage.getItem(TENANTS_STORAGE_KEY);

    if (storedContracts) {
      const parsedContracts = JSON.parse(storedContracts) as Partial<Contract>[];

      const normalizedContracts: Contract[] = parsedContracts.map(
        (contract) => ({
          id: contract.id || Date.now(),
          propertyId: contract.propertyId || "",
          propertyName: contract.propertyName || "",
          tenantId: contract.tenantId || 0,
          tenantName: contract.tenantName || "",
          startDate: contract.startDate || "",
          endDate: contract.endDate || "",
          rentValue: Number(contract.rentValue || 0),
          status:
            contract.status ||
            getAutomaticContractStatus(contract.endDate || ""),
          deletedAt: contract.deletedAt || null,
          statusReason: contract.statusReason || null,
          statusReasonType: contract.statusReasonType || null,
          statusReasonAt: contract.statusReasonAt || null,
        })
      );

      setContracts(normalizedContracts);
    }

    if (storedProperties) {
      setProperties(JSON.parse(storedProperties) as Property[]);
    }

    if (storedTenants) {
      const parsedTenants = JSON.parse(storedTenants) as RentixTenant[];
      setTenants(parsedTenants.length > 0 ? parsedTenants : initialTenants);
    } else {
      setTenants(initialTenants);
    }

    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    localStorage.setItem(CONTRACTS_STORAGE_KEY, JSON.stringify(contracts));

    setProperties((currentProperties) => {
      const updatedProperties = syncPropertiesWithContracts(
        contracts,
        currentProperties
      );

      localStorage.setItem(
        PROPERTIES_STORAGE_KEY,
        JSON.stringify(updatedProperties)
      );

      return updatedProperties;
    });
  }, [contracts, isLoaded]);

  const availableProperties = useMemo(() => {
    return properties.filter((property) => {
      const hasActiveContract = contracts.some(
        (contract) =>
          String(contract.propertyId) === String(property.id) &&
          ["Active", "Expiring"].includes(getDisplayContractStatus(contract)) &&
          contract.status !== "Deleted"
      );

      const isCurrentEditingProperty =
        isEditing && String(property.id) === String(propertyId);

      const isPropertyActive = property.isActive !== false;

      return (
        (isPropertyActive && property.status === "Available" && !hasActiveContract) ||
        isCurrentEditingProperty
      );
    });
  }, [properties, contracts, isEditing, propertyId]);

  const availableTenants = useMemo(() => {
    return tenants.filter((tenant) => {
      const isTenant = tenant.isTenant !== false;
      const isActive = tenant.isActive !== false;
      return isTenant && isActive;
    });
  }, [tenants]);

  const filteredContracts = useMemo(() => {
    const normalizedSearchTerm = normalizeSearchText(searchTerm);

    return contracts.filter((contract) => {
      const displayStatus = getDisplayContractStatus(contract);
      const matchesStatus =
        statusFilter === "All" ||
        displayStatus === statusFilter ||
        (statusFilter === "Active" && displayStatus === "Expiring");
      const matchesSearch =
        !normalizedSearchTerm ||
        normalizeSearchText(contract.propertyName).includes(normalizedSearchTerm) ||
        normalizeSearchText(contract.tenantName).includes(normalizedSearchTerm);

      return matchesStatus && matchesSearch;
    });
  }, [contracts, statusFilter, searchTerm]);

  function resetForm() {
    setPropertyId("");
    setTenantId("");
    setStartDate("");
    setEndDate("");
    setRentValue("");
    setContractStatus("Active");
    setFormError("");
    setEditingContractId(null);
    setPendingStatusChange(null);
    setStatusReason("");
    setStatusReasonError("");
    setIsFormOpen(false);
  }

  function handleOpenCreateForm() {
    resetForm();
    setIsFormOpen(true);
  }

  function handleEditContract(contract: Contract) {
    setEditingContractId(contract.id);
    setPropertyId(contract.propertyId);
    setTenantId(String(contract.tenantId));
    setStartDate(contract.startDate);
    setEndDate(contract.endDate);
    setRentValue(String(contract.rentValue || ""));
    setContractStatus(
      contract.status || getAutomaticContractStatus(contract.endDate)
    );
    setFormError("");
    setIsFormOpen(true);
  }

  function getFirstDueDateFromStartDate(dateValue: string) {
    if (!dateValue) return "";

    const dueDate = new Date(`${dateValue}T00:00:00`);

    if (Number.isNaN(dueDate.getTime())) {
      return "";
    }

    dueDate.setMonth(dueDate.getMonth() + 1);

    const year = dueDate.getFullYear();
    const month = String(dueDate.getMonth() + 1).padStart(2, "0");
    const day = String(dueDate.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getContractInstallmentQuantity(startDateValue: string, endDateValue: string) {
    if (!startDateValue || !endDateValue) return 1;

    const start = new Date(`${startDateValue}T00:00:00`);
    const end = new Date(`${endDateValue}T00:00:00`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return 1;
    }

    const monthDifference =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());

    return Math.max(monthDifference, 1);
  }

  function applyEditedContract(updatedContract: Contract, reason?: string) {
    const shouldRemoveReceivables =
      updatedContract.status === "Canceled" || updatedContract.status === "Deleted";
    const cleanReason = reason?.trim() || updatedContract.statusReason || null;

    const contractToSave: Contract = {
      ...updatedContract,
      deletedAt:
        updatedContract.status === "Deleted"
          ? updatedContract.deletedAt || new Date().toISOString()
          : null,
      statusReason: shouldRemoveReceivables
        ? cleanReason
        : updatedContract.statusReason || null,
      statusReasonType: shouldRemoveReceivables
        ? updatedContract.status === "Deleted"
          ? "Deleted"
          : "Canceled"
        : null,
      statusReasonAt:
        shouldRemoveReceivables && cleanReason
          ? new Date().toISOString()
          : updatedContract.statusReasonAt || null,
    };

    if (shouldRemoveReceivables) {
      removeReceivableChargesFromContract(contractToSave);
    }

    setContracts((currentContracts) =>
      currentContracts.map((contract) =>
        contract.id === contractToSave.id ? contractToSave : contract,
      ),
    );

    resetForm();
  }

  function handleConfirmStatusReason() {
    const cleanReason = statusReason.trim();

    if (!pendingStatusChange) return;

    if (cleanReason.length < 5) {
      setStatusReasonError(
        "Informe um motivo com pelo menos 5 caracteres para continuar.",
      );
      return;
    }

    applyEditedContract(pendingStatusChange.contract, cleanReason);
    setPendingStatusChange(null);
    setStatusReason("");
    setStatusReasonError("");
  }

  function handleCancelStatusReason() {
    setPendingStatusChange(null);
    setStatusReason("");
    setStatusReasonError("");
  }

  function removeReceivableChargesFromContract(contract: Contract) {
    const storedManualCharges = localStorage.getItem(MANUAL_CHARGES_STORAGE_KEY);
    const storedPaidCharges = localStorage.getItem(PAID_CHARGES_STORAGE_KEY);
    const storedPaymentRecords = localStorage.getItem(CHARGE_PAYMENTS_STORAGE_KEY);

    const manualCharges = safeParseLocalStorageArray<ReceivableCharge>(storedManualCharges);
    const paidCharges = safeParseLocalStorageArray<string>(storedPaidCharges);
    const paymentRecords = safeParseLocalStorageArray<ChargePaymentRecord>(storedPaymentRecords);
    const removedChargeIds = new Set<string>();
    const automaticChargePrefix = String(contract.id);

    const updatedManualCharges = manualCharges.filter((charge) => {
      const isLinked = isReceivableChargeLinkedToContract(charge, contract);

      if (isLinked) {
        removedChargeIds.add(String(charge.id));
        return false;
      }

      return true;
    });

    const updatedPaidCharges = paidCharges.filter((chargeId) => {
      const normalizedChargeId = String(chargeId);
      const isLinked =
        removedChargeIds.has(normalizedChargeId) ||
        normalizedChargeId.startsWith(automaticChargePrefix + "-");

      return !isLinked;
    });

    const updatedPaymentRecords = paymentRecords.filter((paymentRecord) => {
      const normalizedChargeId = String(paymentRecord.chargeId);
      const isLinked =
        removedChargeIds.has(normalizedChargeId) ||
        normalizedChargeId.startsWith(automaticChargePrefix + "-");

      return !isLinked;
    });

    localStorage.setItem(MANUAL_CHARGES_STORAGE_KEY, JSON.stringify(updatedManualCharges));
    localStorage.setItem(PAID_CHARGES_STORAGE_KEY, JSON.stringify(updatedPaidCharges));
    localStorage.setItem(CHARGE_PAYMENTS_STORAGE_KEY, JSON.stringify(updatedPaymentRecords));
  }

  function openReceivableChargeFromContract(contract: Contract) {
    const installmentQuantity = getContractInstallmentQuantity(
      contract.startDate,
      contract.endDate
    );
    const monthlyRentAmount = Number(contract.rentValue || 0);
    const totalContractAmount = monthlyRentAmount * installmentQuantity;

    localStorage.setItem(
      RECEIVABLE_FROM_CONTRACT_STORAGE_KEY,
      JSON.stringify({
        contractId: String(contract.id),
        tenantId: String(contract.tenantId),
        propertyId: String(contract.propertyId),
        amount: totalContractAmount,
        monthlyAmount: monthlyRentAmount,
        totalAmount: totalContractAmount,
        issueDate: contract.startDate,
        dueDate: getFirstDueDateFromStartDate(contract.startDate),
        endDate: contract.endDate,
        installmentQuantity,
      })
    );

    window.location.href = "/contas-receber";
  }

  function handleSubmitContract(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const selectedProperty = properties.find(
      (property) => String(property.id) === String(propertyId)
    );

    const selectedTenant = tenants.find(
      (tenant) => String(tenant.id) === String(tenantId)
    );

    if (!selectedProperty) {
      setFormError("Selecione um imóvel válido.");
      return;
    }

    if (selectedProperty.isActive === false) {
      setFormError(
        "Este imóvel está inativo e não pode ser utilizado para criar ou alterar um contrato."
      );
      return;
    }

    if (!selectedTenant) {
      setFormError("Selecione um inquilino válido.");
      return;
    }

    if (selectedTenant.isTenant === false) {
      setFormError("Esta pessoa não está marcada como inquilino.");
      return;
    }

    if (selectedTenant.isActive === false) {
      setFormError(
        "Esta pessoa está inativa e não pode ser utilizada para criar ou alterar um contrato."
      );
      return;
    }

    if (!startDate || !endDate) {
      setFormError("Informe a data de início e a data de fim do contrato.");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setFormError("A data de fim não pode ser menor que a data de início.");
      return;
    }

    if (!rentValue || Number(rentValue) <= 0) {
      setFormError("Informe um valor de aluguel válido.");
      return;
    }

    if (isEditing) {
      const currentContract = contracts.find(
        (contract) => contract.id === editingContractId,
      );

      if (!currentContract) {
        setFormError("Contrato não encontrado para edição.");
        return;
      }

      const updatedContract: Contract = {
        ...currentContract,
        propertyId: selectedProperty.id,
        propertyName: selectedProperty.name,
        tenantId: selectedTenant.id,
        tenantName: selectedTenant.name,
        startDate,
        endDate,
        rentValue: Number(rentValue),
        status: contractStatus,
        deletedAt:
          contractStatus === "Deleted"
            ? currentContract.deletedAt || new Date().toISOString()
            : null,
      };

      const statusRequiresReason =
        (contractStatus === "Canceled" || contractStatus === "Deleted") &&
        currentContract.status !== contractStatus;

      if (statusRequiresReason) {
        setPendingStatusChange({
          contract: updatedContract,
          nextStatus: contractStatus,
        });
        setStatusReason("");
        setStatusReasonError("");
        return;
      }

      applyEditedContract(updatedContract);
      return;
    }

    const newContract: Contract = {
      id: Date.now(),
      propertyId: selectedProperty.id,
      propertyName: selectedProperty.name,
      tenantId: selectedTenant.id,
      tenantName: selectedTenant.name,
      startDate,
      endDate,
      rentValue: Number(rentValue),
      status: contractStatus,
      deletedAt: contractStatus === "Deleted" ? new Date().toISOString() : null,
      statusReason: null,
      statusReasonType: null,
      statusReasonAt: null,
    };

    const updatedContracts = [newContract, ...contracts];

    setContracts(updatedContracts);
    localStorage.setItem(CONTRACTS_STORAGE_KEY, JSON.stringify(updatedContracts));
    resetForm();
    openReceivableChargeFromContract(newContract);
  }

  function handlePropertyChange(selectedPropertyId: string) {
    setPropertyId(selectedPropertyId);
    setFormError("");

    const selectedProperty = properties.find(
      (property) => String(property.id) === String(selectedPropertyId)
    );

    if (selectedProperty) {
      setRentValue(String(selectedProperty.rentValue || ""));
    }
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950">
              Contratos
            </h1>
            <p className="mt-2 text-slate-500">
              Gerencie os contratos de locação.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateForm}
            className="rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
          >
            + Novo contrato
          </button>
        </div>

        <div className="rounded-3xl border border-orange-100 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                Contratos cadastrados
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Exibindo {filteredContracts.length} de {contracts.length}{" "}
                contrato(s)
              </p>
            </div>

            <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-[1fr_240px] xl:max-w-3xl">
              <FormField label="Buscar contrato">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por imóvel ou inquilino"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />
              </FormField>

              <FormField label="Status">
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as ContractFilterStatus)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                >
                  <option value="Active">Ativos</option>
                  <option value="Expiring">Vencendo</option>
                  <option value="Inactive">Inativos</option>
                  <option value="Canceled">Cancelados</option>
                  <option value="Finished">Finalizados</option>
                  <option value="Deleted">Excluídos</option>
                  <option value="All">Todos</option>
                </select>
              </FormField>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-orange-50">
                <tr>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">
                    Imóvel
                  </th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">
                    Inquilino
                  </th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">
                    Início
                  </th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">
                    Fim
                  </th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">
                    Valor
                  </th>
                  <th className="px-6 py-4 text-sm font-black text-slate-700">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-black text-slate-700">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredContracts.map((contract) => {
                  const displayStatus = getDisplayContractStatus(contract);

                  return (
                    <tr
                      key={contract.id}
                      className={`transition hover:bg-slate-50 ${
                        displayStatus === "Deleted"
                          ? "bg-slate-50 opacity-70"
                          : displayStatus === "Expiring"
                            ? "bg-amber-50/60"
                            : ""
                      }`}
                    >
                      <td className="px-6 py-4 font-black text-slate-900">
                        {contract.propertyName || "Não informado"}
                      </td>

                      <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                        {contract.tenantName || "Não informado"}
                      </td>

                      <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                        {formatDate(contract.startDate)}
                      </td>

                      <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                        <div className="flex flex-col gap-1">
                          <span>{formatDate(contract.endDate)}</span>
                          {displayStatus === "Expiring" && (
                            <span className="text-xs font-black text-amber-700">
                              Vence em {getDaysUntilDate(contract.endDate)} dia(s)
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-sm font-black text-slate-900">
                        {formatCurrency(contract.rentValue)}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={displayStatus} />
                          {(displayStatus === "Canceled" ||
                            displayStatus === "Deleted") &&
                            contract.statusReason && (
                              <span className="max-w-[220px] text-xs font-semibold text-slate-500">
                                Motivo: {contract.statusReason}
                              </span>
                            )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditContract(contract)}
                            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
                          >
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredContracts.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-10 text-center text-sm font-semibold text-slate-500"
                    >
                      Nenhum contrato encontrado para este filtro.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {pendingStatusChange && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-[2rem] border border-red-100 bg-white p-8 shadow-2xl">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-3xl">
                {pendingStatusChange.nextStatus === "Deleted" ? "🗑️" : "🚫"}
              </div>

              <div className="mt-5 text-center">
                <h3 className="text-2xl font-black text-slate-950">
                  {pendingStatusChange.nextStatus === "Deleted"
                    ? "Motivo da exclusão"
                    : "Motivo do cancelamento"}
                </h3>

                <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
                  Ao confirmar, as parcelas em aberto vinculadas a este contrato serão removidas do Contas a Receber para manter o financeiro consistente.
                </p>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-sm font-black text-slate-900">
                  {pendingStatusChange.contract.propertyName || "Contrato"}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {pendingStatusChange.contract.tenantName || "Inquilino não informado"}
                </p>
              </div>

              <div className="mt-5">
                <label className="mb-2 block text-sm font-black text-slate-700">
                  Motivo
                </label>
                <textarea
                  value={statusReason}
                  onChange={(event) => {
                    setStatusReason(event.target.value);
                    setStatusReasonError("");
                  }}
                  placeholder={
                    pendingStatusChange.nextStatus === "Deleted"
                      ? "Descreva o motivo da exclusão do contrato"
                      : "Descreva o motivo do cancelamento do contrato"
                  }
                  rows={4}
                  className="w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                />

                {statusReasonError && (
                  <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    {statusReasonError}
                  </div>
                )}
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleCancelStatusReason}
                  className="rounded-2xl bg-slate-100 px-5 py-4 text-sm font-black text-slate-700 transition hover:bg-slate-200"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmStatusReason}
                  className="rounded-2xl bg-red-500 px-5 py-4 text-sm font-black text-white shadow-md shadow-red-100 transition hover:bg-red-600"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}

        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] border border-orange-100 bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-8 py-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">
                    {isEditing ? "Editar contrato" : "Novo contrato"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Preencha os dados do contrato.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetForm}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmitContract}>
                <div className="p-8">
                  {formError && (
                    <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-600">
                      {formError}
                    </div>
                  )}

                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    <FormField label="Imóvel">
                      <select
                        value={propertyId}
                        onChange={(event) =>
                          handlePropertyChange(event.target.value)
                        }
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      >
                        <option value="">Selecione um imóvel</option>

                        {availableProperties.map((property) => (
                          <option key={property.id} value={property.id}>
                            {property.name}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    <FormField label="Inquilino">
                      <select
                        value={tenantId}
                        onChange={(event) => {
                          setTenantId(event.target.value);
                          setFormError("");
                        }}
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      >
                        <option value="">Selecione um inquilino</option>
                        {availableTenants.map((tenant) => (
                          <option key={tenant.id} value={tenant.id}>
                            {tenant.name}
                          </option>
                        ))}
                      </select>
                    </FormField>

                    <FormField label="Valor aluguel">
                      <input
                        type="number"
                        value={rentValue}
                        onChange={(event) => {
                          setRentValue(event.target.value);
                          setFormError("");
                        }}
                        placeholder="Ex: 1800"
                        required
                        className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      />
                    </FormField>

                    <FormField label="Data início">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(event) => {
                          setStartDate(event.target.value);
                          setFormError("");
                        }}
                        required
                        className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      />
                    </FormField>

                    <FormField label="Data fim">
                      <input
                        type="date"
                        value={endDate}
                        onChange={(event) => {
                          setEndDate(event.target.value);
                          setFormError("");
                        }}
                        required
                        className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      />
                    </FormField>

                    <FormField label="Status">
                      <select
                        value={contractStatus}
                        onChange={(event) =>
                          setContractStatus(event.target.value as ContractStatus)
                        }
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                      >
                        <option value="Active">Ativo</option>
                        <option value="Inactive">Inativo</option>
                        <option value="Canceled">Cancelado</option>
                        <option value="Finished">Finalizado</option>
                        <option value="Deleted">Excluído</option>
                      </select>
                    </FormField>
                  </div>
                </div>

                <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-100 bg-white px-8 py-6">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-2xl bg-slate-100 px-6 py-4 text-sm font-black text-slate-600 transition hover:bg-slate-200"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className="rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
                  >
                    {isEditing ? "Salvar alterações" : "Criar contrato"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

type FormFieldProps = {
  label: string;
  children: React.ReactNode;
};

function FormField({ label, children }: FormFieldProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-slate-700">
        {label}
      </label>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: ContractDisplayStatus }) {
  const statusConfig = {
    Active: {
      label: "Ativo",
      className: "bg-emerald-100 text-emerald-700",
    },
    Expiring: {
      label: "Vencendo",
      className: "bg-amber-100 text-amber-700",
    },
    Inactive: {
      label: "Inativo",
      className: "bg-slate-100 text-slate-600",
    },
    Canceled: {
      label: "Cancelado",
      className: "bg-red-100 text-red-700",
    },
    Finished: {
      label: "Finalizado",
      className: "bg-blue-100 text-blue-700",
    },
    Deleted: {
      label: "Excluído",
      className: "bg-zinc-200 text-zinc-700",
    },
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${statusConfig[status].className}`}
    >
      {statusConfig[status].label}
    </span>
  );
}

function syncPropertiesWithContracts(
  contracts: Contract[],
  properties: Property[]
): Property[] {
  return properties.map((property) => {
    const hasActiveContract = contracts.some(
      (contract) =>
        String(contract.propertyId) === String(property.id) &&
        ["Active", "Expiring"].includes(getDisplayContractStatus(contract)) &&
        contract.status !== "Deleted"
    );

    return {
      ...property,
      status: hasActiveContract ? "Rented" : "Available",
    };
  });
}

function getDisplayContractStatus(contract: Contract): ContractDisplayStatus {
  if (contract.status === "Deleted") return "Deleted";
  if (contract.status === "Canceled") return "Canceled";
  if (contract.status === "Finished") return "Finished";
  if (contract.status === "Inactive") return "Inactive";

  const automaticStatus = getAutomaticContractStatus(contract.endDate);

  if (automaticStatus === "Active" && isContractExpiring(contract.endDate)) {
    return "Expiring";
  }

  return automaticStatus;
}

function getAutomaticContractStatus(endDate: string): ContractStatus {
  if (!endDate) return "Inactive";

  const today = new Date();
  const contractEndDate = new Date(`${endDate}T23:59:59`);

  return contractEndDate >= today ? "Active" : "Inactive";
}

function isContractExpiring(endDate: string) {
  const daysUntilEndDate = getDaysUntilDate(endDate);

  return (
    daysUntilEndDate >= 0 &&
    daysUntilEndDate <= EXPIRING_CONTRACT_DAYS_LIMIT
  );
}

function getDaysUntilDate(value: string) {
  if (!value) return -1;

  const today = new Date();
  const endDate = new Date(`${value}T23:59:59`);
  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  today.setHours(0, 0, 0, 0);

  return Math.ceil((endDate.getTime() - today.getTime()) / millisecondsPerDay);
}

function safeParseLocalStorageArray<T>(value: string | null): T[] {
  if (!value) return [];

  try {
    const parsedValue = JSON.parse(value);
    return Array.isArray(parsedValue) ? (parsedValue as T[]) : [];
  } catch {
    return [];
  }
}

function isReceivableChargeLinkedToContract(
  charge: ReceivableCharge,
  contract: Contract,
) {
  if (String(charge.contractId || "") === String(contract.id)) {
    return true;
  }

  const chargeTenant = normalizeSearchText(charge.tenant || "");
  const chargeProperty = normalizeSearchText(charge.property || "");
  const contractTenant = normalizeSearchText(contract.tenantName || "");
  const contractProperty = normalizeSearchText(contract.propertyName || "");

  if (!chargeTenant || !contractTenant || chargeTenant !== contractTenant) {
    return false;
  }

  if (!chargeProperty || !contractProperty || chargeProperty !== contractProperty) {
    return false;
  }

  const chargeAmount = Number(charge.amount || 0);
  const contractRentValue = Number(contract.rentValue || 0);

  if (Math.abs(chargeAmount - contractRentValue) > 0.01) {
    return false;
  }

  if (!charge.dueDate || !contract.startDate || !contract.endDate) {
    return false;
  }

  const chargeDueDate = new Date(charge.dueDate);
  const contractStartDate = new Date(contract.startDate + "T00:00:00");
  const contractEndDate = new Date(contract.endDate + "T23:59:59");

  if (
    Number.isNaN(chargeDueDate.getTime()) ||
    Number.isNaN(contractStartDate.getTime()) ||
    Number.isNaN(contractEndDate.getTime())
  ) {
    return false;
  }

  const lowerLimit = new Date(contractStartDate);
  lowerLimit.setDate(lowerLimit.getDate() - 5);

  const upperLimit = new Date(contractEndDate);
  upperLimit.setDate(upperLimit.getDate() + 45);

  return chargeDueDate >= lowerLimit && chargeDueDate <= upperLimit;
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function formatCurrency(value?: number) {
  const safeValue = Number(value || 0);

  return safeValue.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(value: string) {
  if (!value) return "-";

  const [year, month, day] = value.split("-");

  return `${day}/${month}/${year}`;
}
