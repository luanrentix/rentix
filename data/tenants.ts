export type Tenant = {
  id: number;
  name: string;
  phone: string;
  document: string;
};

export const initialTenants: Tenant[] = [
  {
    id: 1,
    name: "João Silva",
    phone: "69 99999-0001",
    document: "123.456.789-00",
  },
  {
    id: 2,
    name: "Maria Souza",
    phone: "69 99999-0002",
    document: "987.654.321-00",
  },
];