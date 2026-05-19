export type ContractStatus = "Active" | "Finished";

export type Contract = {
  id: number;
  propertyId: number;
  tenantId: number;
  startDate: string;
  value: number;
  status: ContractStatus;
};

export const initialContracts: Contract[] = [
  {
    id: 1,
    propertyId: 1,
    tenantId: 1,
    startDate: "2026-01-10",
    value: 1500,
    status: "Active",
  },
  {
    id: 2,
    propertyId: 2,
    tenantId: 2,
    startDate: "2026-02-05",
    value: 2000,
    status: "Active",
  },
  {
    id: 3,
    propertyId: 3,
    tenantId: 1,
    startDate: "2025-10-01",
    value: 1200,
    status: "Finished",
  },
];