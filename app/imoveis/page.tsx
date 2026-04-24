"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/app-shell";

type PropertyStatus = "Available" | "Rented";

type PropertyType =
  | "Apartment"
  | "House"
  | "Cabin"
  | "Farm"
  | "Commercial"
  | "Land"
  | "Other";

type Property = {
  id: string;
  type: PropertyType;
  name: string;
  zipCode: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  number: string;
  complement: string;
  address: string;
  rentValue: number;
  status: PropertyStatus;
};

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

const propertyTypes = [
  { label: "Apartamento", value: "Apartment" },
  { label: "Casa", value: "House" },
  { label: "Chalé", value: "Cabin" },
  { label: "Chácara", value: "Farm" },
  { label: "Comercial", value: "Commercial" },
  { label: "Terreno", value: "Land" },
  { label: "Outro", value: "Other" },
];

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);

  const [type, setType] = useState<PropertyType>("Apartment");
  const [name, setName] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [rentValue, setRentValue] = useState("");
  const [propertyStatus, setPropertyStatus] =
    useState<PropertyStatus>("Available");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | PropertyStatus>(
    "All"
  );

  useEffect(() => {
    const storedProperties = localStorage.getItem("rentix_properties");

    if (storedProperties) {
      const parsedProperties = JSON.parse(storedProperties) as Partial<Property>[];

      const normalizedProperties: Property[] = parsedProperties.map(
        (property) => ({
          id: property.id || crypto.randomUUID(),
          type: property.type || "Other",
          name: property.name || "",
          zipCode: property.zipCode || "",
          state: property.state || "",
          city: property.city || "",
          neighborhood: property.neighborhood || "",
          street: property.street || "",
          number: property.number || "",
          complement: property.complement || "",
          address: property.address || "",
          rentValue: property.rentValue || 0,
          status: property.status || "Available",
        })
      );

      setProperties(normalizedProperties);
      localStorage.setItem(
        "rentix_properties",
        JSON.stringify(normalizedProperties)
      );
    }
  }, []);

  const filteredProperties = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return properties.filter((property) => {
      const matchesSearch =
        property.name.toLowerCase().includes(normalizedSearch) ||
        property.address.toLowerCase().includes(normalizedSearch) ||
        property.city.toLowerCase().includes(normalizedSearch) ||
        property.neighborhood.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "All" || property.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [properties, search, statusFilter]);

  const totalProperties = properties.length;

  const rentedProperties = properties.filter(
    (property) => property.status === "Rented"
  ).length;

  const availableProperties = properties.filter(
    (property) => property.status === "Available"
  ).length;

  const totalMonthlyRevenue = properties
    .filter((property) => property.status === "Rented")
    .reduce((total, property) => total + property.rentValue, 0);

  function saveProperties(updatedProperties: Property[]) {
    setProperties(updatedProperties);
    localStorage.setItem("rentix_properties", JSON.stringify(updatedProperties));
  }

  function resetForm() {
    setType("Apartment");
    setName("");
    setZipCode("");
    setState("");
    setCity("");
    setNeighborhood("");
    setStreet("");
    setNumber("");
    setComplement("");
    setRentValue("");
    setPropertyStatus("Available");
    setEditingPropertyId(null);
  }

  function handleOpenCreateForm() {
    resetForm();
    setIsFormOpen(true);
  }

  function handleCloseForm() {
    resetForm();
    setIsFormOpen(false);
  }

  async function handleZipCodeBlur() {
    const cleanZipCode = zipCode.replace(/\D/g, "");

    if (cleanZipCode.length !== 8) return;

    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${cleanZipCode}/json/`
      );
      const data = (await response.json()) as ViaCepResponse;

      if (data.erro) {
        alert("CEP não encontrado.");
        return;
      }

      setZipCode(data.cep || cleanZipCode);
      setState(data.uf || "");
      setCity(data.localidade || "");
      setNeighborhood(data.bairro || "");
      setStreet(data.logradouro || "");
    } catch {
      alert("Não foi possível consultar o CEP no momento.");
    }
  }

  function buildAddress() {
    const addressParts = [
      street,
      number,
      neighborhood,
      city,
      state,
      zipCode,
    ].filter(Boolean);

    return addressParts.join(", ");
  }

  function handleSaveProperty() {
    if (
      !type ||
      !name ||
      !zipCode ||
      !state ||
      !city ||
      !neighborhood ||
      !street ||
      !number ||
      !rentValue
    ) {
      alert("Preencha todos os campos obrigatórios.");
      return;
    }

    const propertyData: Property = {
      id: editingPropertyId || crypto.randomUUID(),
      type,
      name,
      zipCode,
      state,
      city,
      neighborhood,
      street,
      number,
      complement,
      address: buildAddress(),
      rentValue: Number(rentValue),
      status: propertyStatus,
    };

    const updatedProperties = editingPropertyId
      ? properties.map((property) =>
          property.id === editingPropertyId ? propertyData : property
        )
      : [...properties, propertyData];

    saveProperties(updatedProperties);
    handleCloseForm();
  }

  function handleEditProperty(propertyId: string) {
    const property = properties.find((item) => item.id === propertyId);

    if (!property) return;

    setEditingPropertyId(property.id);
    setType(property.type);
    setName(property.name);
    setZipCode(property.zipCode);
    setState(property.state);
    setCity(property.city);
    setNeighborhood(property.neighborhood);
    setStreet(property.street);
    setNumber(property.number);
    setComplement(property.complement);
    setRentValue(String(property.rentValue));
    setPropertyStatus(property.status);
    setIsFormOpen(true);
  }

  function handleDeleteProperty(propertyId: string) {
    const property = properties.find((item) => item.id === propertyId);

    if (!property) return;

    if (property.status === "Rented") {
      alert("Este imóvel está alugado e não pode ser excluído.");
      return;
    }

    const confirmDelete = confirm("Deseja realmente excluir este imóvel?");

    if (!confirmDelete) return;

    const updatedProperties = properties.filter(
      (item) => item.id !== propertyId
    );

    saveProperties(updatedProperties);
  }

  function getPropertyTypeLabel(value: PropertyType) {
    return propertyTypes.find((item) => item.value === value)?.label || "Outro";
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950">
              Imóveis
            </h1>
            <p className="mt-2 text-slate-500">
              Cadastre e gerencie os imóveis disponíveis para locação.
            </p>
          </div>

          <button
            onClick={handleOpenCreateForm}
            className="rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
          >
            + Novo imóvel
          </button>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon="🏢"
            title="Imóveis cadastrados"
            value={totalProperties}
            detail="Total no sistema"
          />

          <SummaryCard
            icon="🔑"
            title="Alugados"
            value={rentedProperties}
            detail="Com contrato ativo"
          />

          <SummaryCard
            icon="🏠"
            title="Disponíveis"
            value={availableProperties}
            detail="Prontos para locação"
          />

          <SummaryCard
            icon="💰"
            title="Receita mensal"
            value={formatCurrency(totalMonthlyRevenue)}
            detail="Com imóveis alugados"
          />
        </div>

        <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                Imóveis cadastrados
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Exibindo {filteredProperties.length} de {properties.length} imóveis.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <FormField label="Buscar">
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Nome, endereço, cidade ou bairro"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 md:w-80"
                />
              </FormField>

              <FormField label="Status">
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as "All" | PropertyStatus)
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 md:w-48"
                >
                  <option value="All">Todos</option>
                  <option value="Available">Disponíveis</option>
                  <option value="Rented">Alugados</option>
                </select>
              </FormField>
            </div>
          </div>

          {filteredProperties.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center">
              <h3 className="text-lg font-black text-slate-800">
                Nenhum imóvel encontrado
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Cadastre um novo imóvel ou ajuste os filtros aplicados.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full border-collapse bg-white text-left">
                <thead className="bg-orange-50">
                  <tr>
                    <th className="px-5 py-4 text-sm font-black text-slate-700">
                      Imóvel
                    </th>
                    <th className="px-5 py-4 text-sm font-black text-slate-700">
                      Tipo
                    </th>
                    <th className="px-5 py-4 text-sm font-black text-slate-700">
                      Endereço
                    </th>
                    <th className="px-5 py-4 text-sm font-black text-slate-700">
                      Valor
                    </th>
                    <th className="px-5 py-4 text-sm font-black text-slate-700">
                      Status
                    </th>
                    <th className="px-5 py-4 text-sm font-black text-slate-700">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredProperties.map((property) => (
                    <tr key={property.id} className="border-t border-slate-100">
                      <td className="px-5 py-4">
                        <p className="font-black text-slate-900">
                          {property.name}
                        </p>
                        <p className="text-sm font-semibold text-slate-500">
                          CEP: {property.zipCode || "Não informado"}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                        {getPropertyTypeLabel(property.type)}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                        {property.address}
                      </td>

                      <td className="px-5 py-4 text-sm font-black text-slate-900">
                        {formatCurrency(property.rentValue)}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={property.status} />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditProperty(property.id)}
                            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => handleDeleteProperty(property.id)}
                            className="rounded-xl bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8 backdrop-blur-sm">
            <div className="max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[2rem] border border-orange-100 bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-8 py-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-950">
                    {editingPropertyId ? "Editar imóvel" : "Novo imóvel"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Preencha os dados principais do imóvel para locação.
                  </p>
                </div>

                <button
                  onClick={handleCloseForm}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xl font-black text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                >
                  ×
                </button>
              </div>

              <div className="p-8">
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                  <FormField label="Tipo de imóvel">
                    <select
                      value={type}
                      onChange={(event) =>
                        setType(event.target.value as PropertyType)
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    >
                      {propertyTypes.map((propertyType) => (
                        <option
                          key={propertyType.value}
                          value={propertyType.value}
                        >
                          {propertyType.label}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Status do imóvel">
                    <select
                      value={propertyStatus}
                      onChange={(event) =>
                        setPropertyStatus(event.target.value as PropertyStatus)
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    >
                      <option value="Available">Disponível</option>
                      <option value="Rented">Alugado</option>
                    </select>
                  </FormField>

                  <FormField label="Nome do imóvel">
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Ex: Apartamento Centro"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </FormField>

                  <FormField label="CEP">
                    <input
                      type="text"
                      value={zipCode}
                      onChange={(event) => setZipCode(event.target.value)}
                      onBlur={handleZipCodeBlur}
                      placeholder="Ex: 76940-000"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </FormField>

                  <FormField label="Estado">
                    <input
                      type="text"
                      value={state}
                      onChange={(event) => setState(event.target.value)}
                      placeholder="UF"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </FormField>

                  <FormField label="Cidade">
                    <input
                      type="text"
                      value={city}
                      onChange={(event) => setCity(event.target.value)}
                      placeholder="Cidade"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </FormField>

                  <FormField label="Bairro">
                    <input
                      type="text"
                      value={neighborhood}
                      onChange={(event) => setNeighborhood(event.target.value)}
                      placeholder="Bairro"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </FormField>

                  <FormField label="Logradouro">
                    <input
                      type="text"
                      value={street}
                      onChange={(event) => setStreet(event.target.value)}
                      placeholder="Rua, avenida..."
                      className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </FormField>

                  <FormField label="Número">
                    <input
                      type="text"
                      value={number}
                      onChange={(event) => setNumber(event.target.value)}
                      placeholder="Número"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </FormField>

                  <FormField label="Complemento">
                    <input
                      type="text"
                      value={complement}
                      onChange={(event) => setComplement(event.target.value)}
                      placeholder="Apartamento, bloco, referência..."
                      className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </FormField>

                  <FormField label="Valor da locação mensal">
                    <input
                      type="number"
                      value={rentValue}
                      onChange={(event) => setRentValue(event.target.value)}
                      placeholder="Ex: 1500"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </FormField>
                </div>
              </div>

              <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-100 bg-white px-8 py-6">
                <button
                  onClick={handleCloseForm}
                  className="rounded-2xl bg-slate-100 px-6 py-4 text-sm font-black text-slate-600 transition hover:bg-slate-200"
                >
                  Cancelar
                </button>

                <button
                  onClick={handleSaveProperty}
                  className="rounded-2xl bg-orange-500 px-6 py-4 text-sm font-black text-white shadow-md shadow-orange-100 transition hover:bg-orange-600"
                >
                  {editingPropertyId ? "Salvar alterações" : "Cadastrar imóvel"}
                </button>
              </div>
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

type SummaryCardProps = {
  icon: string;
  title: string;
  value: string | number;
  detail: string;
};

function SummaryCard({ icon, title, value, detail }: SummaryCardProps) {
  return (
    <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-xl text-orange-600">
        {icon}
      </div>

      <p className="text-sm font-bold text-slate-500">{title}</p>
      <h3 className="mt-3 text-3xl font-black text-slate-950">{value}</h3>
      <p className="mt-3 text-sm font-bold text-orange-600">{detail}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: PropertyStatus }) {
  const statusConfig = {
    Available: {
      label: "Disponível",
      className: "bg-emerald-100 text-emerald-700",
    },
    Rented: {
      label: "Alugado",
      className: "bg-orange-100 text-orange-700",
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

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}