import { useState, useMemo, useEffect } from "react";
import { Charge } from "../printing";

export type StatusFilter = "All" | "Pending" | "Paid" | "Overdue";

interface Tenant {
  id: string | number;
  name: string;
}

interface UseReceivableFiltersParams {
  charges: Charge[];
  tenants: Tenant[];
  getChargeRemainingAmount: (charge: Charge) => number;
  getChargePaidAmount: (charge: Charge) => number;
  initialStatusFilter?: StatusFilter;
}

export function useReceivableFilters(params: UseReceivableFiltersParams) {
  const {
    charges,
    tenants,
    getChargeRemainingAmount,
    getChargePaidAmount,
    initialStatusFilter = "All",
  } = params;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatusFilter);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [focusedContractId, setFocusedContractId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant) =>
      tenant.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [tenants, search]);

  const filteredCharges = useMemo(() => {
    let result = charges;

    if (focusedContractId) {
      result = result.filter(
        (charge) => String(charge.contractId || "") === String(focusedContractId),
      );
    }

    if (selectedTenant) {
      result = result.filter(
        (charge) =>
          String(charge.tenantId || "") === String(selectedTenant.id) ||
          (!charge.tenantId &&
            charge.tenant.toLowerCase() === selectedTenant.name.toLowerCase()),
      );
    }

    if (statusFilter !== "All") {
      result = result.filter((charge) => charge.status === statusFilter);
    }

    return result;
  }, [charges, focusedContractId, selectedTenant, statusFilter]);

  const totalReceivable = useMemo(() => {
    return filteredCharges
      .filter((charge) => charge.status !== "Paid")
      .reduce((total, charge) => total + getChargeRemainingAmount(charge), 0);
  }, [filteredCharges, getChargeRemainingAmount]);

  const totalPaid = useMemo(() => {
    return filteredCharges
      .filter((charge) => charge.status === "Paid")
      .reduce((total, charge) => total + getChargePaidAmount(charge), 0);
  }, [filteredCharges, getChargePaidAmount]);

  const totalOverdue = useMemo(() => {
    return filteredCharges
      .filter((charge) => charge.status === "Overdue")
      .reduce((total, charge) => total + getChargeRemainingAmount(charge), 0);
  }, [filteredCharges, getChargeRemainingAmount]);

  return {
    statusFilter,
    setStatusFilter,
    selectedTenant,
    setSelectedTenant,
    focusedContractId,
    setFocusedContractId,
    search,
    setSearch,
    filteredTenants,
    filteredCharges,
    totalReceivable,
    totalPaid,
    totalOverdue,
  };
}
