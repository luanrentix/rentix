import { apiFetch } from "./api";

export type SalesVariant = {
  expectedUpdatedAt?: string;
  sku?: string | null;
  id?: string;
  name: string;
  barcode: string | null;
  price: string | number | null;
  stock: string | number;
  reservedStock?: string | number;
};
export type SalesProduct = {
  photoUrl?: string | null;
  isGridParent?: boolean;
  parentProductId?: string | null;
  gridValue?: string | null;
  gridId?: string | null;
  gridParentName?: string | null;
  updatedAt?: string;
  variants?: SalesVariant[];
  id: string;
  name: string;
  sku: string | null;
  price: string | number;
  purchaseCost: string | number;
  additionalCost: string | number;
  markupMultiplier: string | number;
  promotionalPrice: string | number | null;
  reference: string | null;
  barcode: string | null;
  factoryCode: string | null;
  unit: string;
  kind: string;
  description: string | null;
  showInSale: boolean;
  category: string | null;
  subcategory: string | null;
  brand: string | null;
  productType: string;
  internalNote: string | null;
  stock: string | number;
  reservedStock?: string | number;
  minimumStock: string | number;
  manageStock: boolean;
  variations: string | null;
  inheritGridPrice: boolean;
  commission: string | number;
  commissionEnabled: boolean;
  commissionType: "VENDEDOR" | "PERCENTUAL" | "FIXO";
  commissionRule: "PADRAO" | "PRECO_BRUTO" | "VALOR_LIQUIDO";
  supplierId?: string | null;
  supplierName: string | null;
  active: boolean;
  allowDiscount?: boolean;
  allowAddition?: boolean;
};
export type SalesProductInput = Omit<
  SalesProduct,
  | "updatedAt"
  | "id"
  | "price"
  | "purchaseCost"
  | "additionalCost"
  | "markupMultiplier"
  | "promotionalPrice"
  | "stock"
  | "minimumStock"
  | "commission"
> & {
  expectedUpdatedAt?: string;
  price: number;
  purchaseCost: number;
  additionalCost: number;
  markupMultiplier: number;
  promotionalPrice: number | null;
  stock: number;
  minimumStock: number;
  commission: number;
};
export type SalesProductClassification = { id: string; name: string };
export const getSalesProductUnits = () =>
  apiFetch<SalesProductClassification[]>("/vendas/produtos/unidades", { skipCache: true });
export const createSalesProductUnit = (name: string) =>
  apiFetch<SalesProductClassification>("/vendas/produtos/unidades", { method: "POST", body: JSON.stringify({ name }) });
export type SalesProductGrid = { id: string; name: string; values: string };
export const getSalesProductCategories = () =>
  apiFetch<SalesProductClassification[]>("/vendas/produtos/categorias");
export const createSalesProductCategory = (name: string) =>
  apiFetch<SalesProductClassification>("/vendas/produtos/categorias", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
export const getSalesProductBrands = () =>
  apiFetch<SalesProductClassification[]>("/vendas/produtos/marcas");
export const createSalesProductBrand = (name: string) =>
  apiFetch<SalesProductClassification>("/vendas/produtos/marcas", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
export const getSalesProductGrids = () =>
  apiFetch<SalesProductGrid[]>("/vendas/produtos/grades", {
    skipCache: true,
    cacheTtlMs: 0,
  });
export const createSalesProductGrid = (name: string, values: string) =>
  apiFetch<SalesProductGrid>("/vendas/produtos/grades", {
    method: "POST",
    body: JSON.stringify({ name, values }),
  });
export type SalesSupplier = {
  id: string;
  code: number;
  name: string;
  document: string | null;
  contact: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};
export type SalesSupplierInput = Omit<
  SalesSupplier,
  "id" | "code" | "active" | "createdAt" | "updatedAt"
>;
export type SalesSellerProfile = {
  personType?: "INDIVIDUAL" | "COMPANY";
  alias?: string | null; identityNumber?: string | null; issuingAuthority?: string | null;
  birthDate?: string | null; sex?: string | null; phone2?: string | null;
  zipCode?: string | null; address?: string | null; number?: string | null;
  complement?: string | null; neighborhood?: string | null; city?: string | null;
  state?: string | null; notes?: string | null;
};
export type SalesSeller = SalesSellerProfile & {
  id: string;
  code: number;
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  commission: string | number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};
export type SalesSellerInput = SalesSellerProfile & {
  name: string;
  document?: string | null;
  phone?: string | null;
  email?: string | null;
  commission?: number;
};
export type SalesCustomer = {
  referenceOnly?: boolean;
  id: string;
  code: number;
  personType: "INDIVIDUAL" | "COMPANY";
  name: string;
  alias: string | null;
  document: string | null;
  identityNumber: string | null;
  issuingAuthority: string | null;
  birthDate: string | null;
  sex: string | null;
  email: string | null;
  phone: string | null;
  phone2: string | null;
  zipCode: string | null;
  address: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  creditLimit: string | number;
  creditDays: number | null;
  creditBlocked: boolean;
  active: boolean;
  isSystem: boolean;
  systemKey?: string | null;
  createdAt: string;
  updatedAt: string;
};
export type SalesCustomerInput = {
  referenceOnly?: boolean;
  personType: "INDIVIDUAL" | "COMPANY";
  name: string;
  alias?: string | null;
  document: string;
  identityNumber?: string | null;
  issuingAuthority?: string | null;
  birthDate?: string | null;
  sex?: string | null;
  email?: string | null;
  phone?: string | null;
  phone2?: string | null;
  zipCode?: string | null;
  address?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  notes?: string | null;
  creditLimit?: number;
  creditDays?: number | null;
  creditBlocked?: boolean;
};
export type SalesOrderItem = {
  variantId?: string | null;
  variantName?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  productId: string;
  name: string;
  sku: string | null;
  unitPrice: string;
  quantity: number;
  subtotal: string;
};
export type SalesOrder = {
  originType?: string;
  conditionalSummary?: { sent: number; returned: number; sold: number; pending: number };
  operatorId?: string | null;
  cardPayments?: import("./sales-cards").SalesCardPayment[];
  completedAt?: string | null;
  installments?: number;
  returnDisposition?: "REFUND" | "CREDIT" | null;
  originalOrderId?: string | null;
  returnedItems?: ({ itemIndex: number } & SalesOrderItem)[];
  returnTotal?: string | number;
  debtOffset?: string | number;
  id: string;
  version: number;
  bankAccountId: string | null;
  commissionTotal: string | number;
  number: number;
  sellerId: string | null;
  customerId: string | null;
  sellerName: string;
  customerName: string;
  saleType: string;
  items: SalesOrderItem[];
  subtotal: string | number;
  discount: string | number;
  addition: string | number;
  total: string | number;
  paymentMethod: string;
  paymentDetails: Record<string, number> | null;
  status: string;
  notes: string | null;
  createdAt: string;
};
export const getSalesProducts = () =>
  apiFetch<SalesProduct[]>("/vendas/produtos");
export const getSalesCustomers = () =>
  apiFetch<SalesCustomer[]>("/vendas/clientes");
export type SalesCustomerDocumentCheck = { exists: boolean };
export type SalesCompanyLookup = Pick<
  SalesCustomerInput,
  | "name"
  | "alias"
  | "document"
  | "zipCode"
  | "address"
  | "number"
  | "complement"
  | "neighborhood"
  | "city"
  | "state"
  | "phone"
  | "email"
>;
export type SalesAddressLookup = Pick<
  SalesCustomerInput,
  "zipCode" | "address" | "complement" | "neighborhood" | "city" | "state"
>;
export const checkSalesCustomerDocument = (
  document: string,
  excludeId?: string,
) => {
  const params = new URLSearchParams({
    document,
    ...(excludeId ? { excludeId } : {}),
  });
  return apiFetch<SalesCustomerDocumentCheck>(
    `/vendas/clientes/verificar-documento?${params.toString()}`,
    { skipCache: true, cacheTtlMs: 0 },
  );
};
export const lookupSalesCompany = (cnpj: string) =>
  apiFetch<SalesCompanyLookup>(
    `/vendas/clientes/consultar-cnpj/${encodeURIComponent(cnpj)}`,
  );
export async function lookupSalesAddress(
  zipCode: string,
): Promise<SalesAddressLookup> {
  try {
    return await apiFetch<SalesAddressLookup>(
      `/vendas/clientes/consultar-cep?cep=${encodeURIComponent(zipCode)}`,
    );
  } catch (backendError) {
    // A consulta é pública; tenta o navegador quando o backend não alcança o provedor externo.
    let lastError: unknown = backendError;
    for (const provider of [
      {
        url: `https://viacep.com.br/ws/${encodeURIComponent(zipCode)}/json/`,
        map: (data: Record<string, unknown>): SalesAddressLookup => ({
          zipCode: String(data.cep || zipCode),
          address: String(data.logradouro || ""),
          complement: String(data.complemento || ""),
          neighborhood: String(data.bairro || ""),
          city: String(data.localidade || ""),
          state: String(data.uf || ""),
        }),
      },
      {
        url: `https://brasilapi.com.br/api/cep/v2/${encodeURIComponent(zipCode)}`,
        map: (data: Record<string, unknown>): SalesAddressLookup => ({
          zipCode: String(data.cep || zipCode),
          address: String(data.street || ""),
          complement: "",
          neighborhood: String(data.neighborhood || ""),
          city: String(data.city || ""),
          state: String(data.state || ""),
        }),
      },
    ]) {
      try {
        const response = await fetch(provider.url, {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: AbortSignal.timeout(6000),
        });
        if (!response.ok)
          throw new Error(`Consulta de CEP indisponível (${response.status}).`);
        const data = (await response.json()) as Record<string, unknown>;
        if (data.erro === true || data.erro === "true")
          throw new Error("CEP não encontrado.");
        const address = provider.map(data);
        if (!address.city || !address.state)
          throw new Error(
            "O provedor não retornou uma cidade e UF para este CEP.",
          );
        return address;
      } catch (error) {
        lastError = error;
      }
    }
    throw new Error(
      lastError instanceof Error && lastError.message === "CEP não encontrado."
        ? lastError.message
        : "Não foi possível consultar o CEP agora. Preencha o endereço manualmente e grave o cliente.",
    );
  }
}
export const createSalesCustomer = (data: SalesCustomerInput) =>
  apiFetch<SalesCustomer>("/vendas/clientes", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const updateSalesCustomer = (id: string, data: SalesCustomerInput) =>
  apiFetch<SalesCustomer>(`/vendas/clientes/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
export const archiveSalesCustomer = (id: string) =>
  apiFetch<{ success: boolean }>(`/vendas/clientes/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
export const createSalesProduct = (
  data: Partial<SalesProductInput> & Pick<SalesProductInput, "name" | "price">,
) =>
  apiFetch<SalesProduct>("/vendas/produtos", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const updateSalesProduct = (
  id: string,
  data: Partial<SalesProductInput> & Pick<SalesProductInput, "name" | "price">,
) =>
  apiFetch<SalesProduct>(`/vendas/produtos/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
export const deleteSalesProduct = (id: string) =>
  apiFetch<{ success: boolean }>(`/vendas/produtos/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
export const getSalesSellers = () =>
  apiFetch<SalesSeller[]>("/vendas/vendedores");
export const checkSalesSellerDocument = (
  document: string,
  excludeId?: string,
) => {
  const params = new URLSearchParams({
    document,
    ...(excludeId ? { excludeId } : {}),
  });
  return apiFetch<SalesCustomerDocumentCheck>(
    `/vendas/vendedores/verificar-documento?${params.toString()}`,
    { skipCache: true, cacheTtlMs: 0 },
  );
};
export const createSalesSeller = (data: SalesSellerInput) =>
  apiFetch<SalesSeller>("/vendas/vendedores", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const updateSalesSeller = (id: string, data: SalesSellerInput) =>
  apiFetch<SalesSeller>(`/vendas/vendedores/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
export const archiveSalesSeller = (id: string) =>
  apiFetch<{ success: boolean }>(
    `/vendas/vendedores/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
export const getSalesSuppliers = () =>
  apiFetch<SalesSupplier[]>("/vendas/fornecedores");
export const createSalesSupplier = (data: SalesSupplierInput) =>
  apiFetch<SalesSupplier>("/vendas/fornecedores", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const updateSalesSupplier = (id: string, data: SalesSupplierInput) =>
  apiFetch<SalesSupplier>(`/vendas/fornecedores/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
export const archiveSalesSupplier = (id: string) =>
  apiFetch<{ success: boolean }>(
    `/vendas/fornecedores/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
export async function getSalesOrders() {
  const orders: SalesOrder[] = [];
  let before: number | undefined;
  while (true) {
    const page = await apiFetch<SalesOrder[]>(
      `/vendas/pedidos${before ? `?before=${before}` : ""}`,
      { skipCache: true },
    );
    orders.push(...page);
    if (page.length < 100) return orders;
    const next = page[page.length - 1].number;
    if (before !== undefined && next >= before)
      throw new Error("Não foi possível carregar o histórico completo.");
    before = next;
  }
}
export type SaveSalesOrderInput = {
  refundConfirmed?: boolean;
  cardPayments?: import("./sales-cards").SalesCardPayment[];
  expectedTotal?: number;
  originalOrderId?: string;
  returnedItems?: { itemIndex: number; quantity: number }[];
  returnDisposition?: "REFUND" | "CREDIT";
  requestId?: string;
  version?: number;
  bankAccountId?: string;
  installments?: number;
  sellerId?: string;
  customerId?: string;
  sellerName: string;
  customerName: string;
  saleType: string;
  items: {
    productId: string;
    variantId?: string;
    quantity: number;
    unitPrice?: number;
  }[];
  paymentMethod: string;
  discount: number;
  addition: number;
  status: string;
  paymentDetails?: Record<string, number>;
  notes?: string;
};
export const createSalesOrder = (data: SaveSalesOrderInput) =>
  apiFetch<SalesOrder>("/vendas/pedidos", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const updateSalesOrder = (id: string, data: SaveSalesOrderInput) =>
  apiFetch<SalesOrder>(`/vendas/pedidos/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
export const reverseSalesOrder = (id: string, reason: string) =>
  apiFetch<SalesOrder>(`/vendas/pedidos/${encodeURIComponent(id)}/estornar`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
export const cancelSalesOrder = (id: string, reason: string) =>
  apiFetch<SalesOrder>(`/vendas/pedidos/${encodeURIComponent(id)}/cancelar`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });

export const discardSalesOrder = (id: string) =>
  apiFetch<SalesOrder>(`/vendas/pedidos/${encodeURIComponent(id)}/descartar`, {
    method: "POST",
    body: JSON.stringify({ reason: "Venda em andamento excluída pelo operador na lista de atendimento." }),
  });

export type SalesReceivingAccount = { id: string; name: string; type: string };
export const getSalesReceivingAccounts = () =>
  apiFetch<SalesReceivingAccount[]>("/vendas/contas-recebimento");

export type SalesReturnInfo = {
  remainingReturnValue: string;
  order: SalesOrder;
  customer: SalesCustomer;
  items: {
    itemIndex: number;
    name: string;
    variantName: string | null;
    quantity: number;
    available: number;
    unitReturnValue: number;
  }[];
  outstanding: string;
};
export const getSalesReturnInfo = (id: string) =>
  apiFetch<SalesReturnInfo>(
    `/vendas/pedidos/${encodeURIComponent(id)}/devolucao`,
    { skipCache: true },
  );
export const getSalesCustomerCredit = (id: string) =>
  apiFetch<{ balance: string }>(
    `/vendas/clientes/${encodeURIComponent(id)}/saldo`,
    { skipCache: true },
  );

export const lookupSalesSupplierCompany = (cnpj: string) =>
  apiFetch<SalesCompanyLookup>(
    `/vendas/fornecedores/consultar-cnpj/${encodeURIComponent(cnpj)}`,
    { skipCache: true, cacheTtlMs: 0 },
  );

export const deleteSalesCustomer = (id: string) =>
  apiFetch<{ success: boolean }>(`/vendas/clientes/${encodeURIComponent(id)}/excluir`, { method: "DELETE" });

export const deleteSalesSeller = (id: string) =>
  apiFetch<{ success: boolean }>(`/vendas/vendedores/${encodeURIComponent(id)}/excluir`, { method: "DELETE" });

export type SalesOrderDetails = SalesOrder & {
  events: { id: string; action: string; createdAt: string; details: Record<string, unknown> }[];
  receivables: { id: string; amount: string; dueDate: string; cancelledAt: string | null; installmentNumber: number | null; payments: { id: string; amountPaid: string; method: string; paidAt: string }[] }[];
  returns: { id: string; number: number; status: string; total: string }[];
};
export const getSalesOrderDetails = (id: string) => apiFetch<SalesOrderDetails>(`/vendas/pedidos/${encodeURIComponent(id)}`, { skipCache: true });
