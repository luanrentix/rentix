"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/app-shell";

/* ========= TYPES ========= */
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

  /* ========= NEW STATE (CONFIRM MODAL) ========= */
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);

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
      const parsed = JSON.parse(storedProperties) as Property[];
      setProperties(parsed);
    }
  }, []);

  function saveProperties(updated: Property[]) {
    setProperties(updated);
    localStorage.setItem("rentix_properties", JSON.stringify(updated));
  }

  /* ========= DELETE ========= */
  function handleDeleteProperty(propertyId: string) {
    const property = properties.find((p) => p.id === propertyId);
    if (!property) return;

    if (property.status === "Rented") {
      alert("Este imóvel está alugado e não pode ser excluído.");
      return;
    }

    setPropertyToDelete(property); // 🔥 abre modal
  }

  function confirmDelete() {
    if (!propertyToDelete) return;

    const updated = properties.filter(
      (p) => p.id !== propertyToDelete.id
    );

    saveProperties(updated);
    setPropertyToDelete(null);
  }

  function cancelDelete() {
    setPropertyToDelete(null);
  }

  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.address.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        statusFilter === "All" || p.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [properties, search, statusFilter]);

  return (
    <AppShell>
      <div className="space-y-6">

        {/* ===== TABLE ===== */}
        <div className="bg-white p-6 rounded-3xl shadow">
          <h2 className="text-xl font-bold mb-4">Imóveis cadastrados</h2>

          <table className="w-full">
            <tbody>
              {filteredProperties.map((property) => (
                <tr key={property.id}>
                  <td className="py-4">{property.name}</td>

                  <td>
                    <button
                      onClick={() => handleDeleteProperty(property.id)}
                      className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ========= MODAL ========= */}
        {propertyToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">

              <h3 className="text-xl font-black text-slate-900">
                Confirmar exclusão
              </h3>

              <p className="mt-4 text-sm text-slate-600">
                Deseja realmente excluir o imóvel:
                <span className="block font-bold mt-2 text-slate-900">
                  {propertyToDelete.name}
                </span>
              </p>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={cancelDelete}
                  className="px-5 py-3 rounded-xl bg-slate-100 font-bold text-slate-700 hover:bg-slate-200"
                >
                  Cancelar
                </button>

                <button
                  onClick={confirmDelete}
                  className="px-5 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}