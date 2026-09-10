import { useState, useMemo, useEffect } from "react";
import { Charge, ChargePayment } from "../printing";

export type StatusFilter = "All" | "Pending" | "Paid" | "Overdue";
export type PeriodShortcut =
  | "CurrentMonth"
  | "NextMonth"
  | "CurrentQuarter"
  | "CurrentYear"
  | "All"
  | "Custom";

interface Tenant {
  id: string | number;
  name: string;
}

interface UseReceivableFiltersParams {
  charges: Charge[];
  tenants: Tenant[];
  getChargeRemainingAmount: (charge: Charge) => number;
  getChargePaidAmount: (charge: Charge) => number;
  getChargePayment?: (chargeId: string) => ChargePayment | undefined;
  initialStatusFilter?: StatusFilter;
}

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getNormalizedDueDate(dueDateStr?: string) {
  if (!dueDateStr) return "";
  if (dueDateStr.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(dueDateStr)) {
    return dueDateStr.slice(0, 10);
  }
  try {
    const d = new Date(dueDateStr);
    if (isNaN(d.getTime())) return "";
    return getLocalDateString(d);
  } catch {
    return "";
  }
}

export function useReceivableFilters(params: UseReceivableFiltersParams) {
  const {
    charges,
    tenants,
    getChargeRemainingAmount,
    getChargePaidAmount,
    getChargePayment,
    initialStatusFilter = "All",
  } = params;

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatusFilter);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [focusedContractId, setFocusedContractId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [periodShortcut, setPeriodShortcut] = useState<PeriodShortcut>("All");

  const updatePeriodShortcut = (nextShortcut: PeriodShortcut) => {
    setPeriodShortcut(nextShortcut);
    const now = new Date();

    if (nextShortcut === "CurrentMonth") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setFilterStartDate(getLocalDateString(start));
      setFilterEndDate(getLocalDateString(end));
    } else if (nextShortcut === "NextMonth") {
      const start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      setFilterStartDate(getLocalDateString(start));
      setFilterEndDate(getLocalDateString(end));
    } else if (nextShortcut === "CurrentQuarter") {
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), quarterMonth, 1);
      const end = new Date(now.getFullYear(), quarterMonth + 3, 0);
      setFilterStartDate(getLocalDateString(start));
      setFilterEndDate(getLocalDateString(end));
    } else if (nextShortcut === "CurrentYear") {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      setFilterStartDate(getLocalDateString(start));
      setFilterEndDate(getLocalDateString(end));
    } else if (nextShortcut === "All") {
      setFilterStartDate("");
      setFilterEndDate("");
    }
  };

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

    if (filterStartDate) {
      result = result.filter((charge) => {
        if (statusFilter === "Paid" && getChargePayment) {
          const payment = getChargePayment(charge.id);
          const targetDate = getNormalizedDueDate(payment?.paidAt) || getNormalizedDueDate(charge.dueDate);
          return !targetDate || targetDate >= filterStartDate;
        }
        const dueDate = getNormalizedDueDate(charge.dueDate);
        return !dueDate || dueDate >= filterStartDate;
      });
    }

    if (filterEndDate) {
      result = result.filter((charge) => {
        if (statusFilter === "Paid" && getChargePayment) {
          const payment = getChargePayment(charge.id);
          const targetDate = getNormalizedDueDate(payment?.paidAt) || getNormalizedDueDate(charge.dueDate);
          return !targetDate || targetDate <= filterEndDate;
        }
        const dueDate = getNormalizedDueDate(charge.dueDate);
        return !dueDate || dueDate <= filterEndDate;
      });
    }

    return result;
  }, [charges, focusedContractId, selectedTenant, statusFilter, filterStartDate, filterEndDate, getChargePayment]);

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
    filterStartDate,
    setFilterStartDate,
    filterEndDate,
    setFilterEndDate,
    periodShortcut,
    setPeriodShortcut,
    updatePeriodShortcut,
    filteredTenants,
    filteredCharges,
    totalReceivable,
    totalPaid,
    totalOverdue,
  };
}
