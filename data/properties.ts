export type PropertyStatus = "Available" | "Rented";

export type Property = {
  id: number;
  name: string;
  address: string;
  status: PropertyStatus;
  price: number;
};

export const initialProperties: Property[] = [
  {
    id: 1,
    name: "Apartamento 401",
    address: "Centro",
    status: "Rented",
    price: 1500,
  },
  {
    id: 2,
    name: "Casa Jardim",
    address: "Bairro Jardim",
    status: "Available",
    price: 2000,
  },
  {
    id: 3,
    name: "Sala Comercial 22",
    address: "Centro",
    status: "Available",
    price: 1200,
  },
];