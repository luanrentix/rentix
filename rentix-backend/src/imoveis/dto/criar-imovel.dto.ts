export class CriarImovelDto {
  companyId: string;
  ownerId?: string;

  title: string;
  code?: string;
  type?: string;
  purpose?: string;
  rentalValue?: number;

  zipCode?: string;
  city?: string;
  state?: string;
  address?: string;
  district?: string;
  number?: string;
  complement?: string;

  bedrooms?: number;
  bathrooms?: number;
  garages?: number;

  description?: string;
  isActive?: boolean;
}