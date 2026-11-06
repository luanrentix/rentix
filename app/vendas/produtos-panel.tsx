"use client";

import SalesPageHeader from "./sales-page-header";
import ProductPhoto from "./product-photo";
import ToggleSwitch from "@/components/ui/toggle-switch";
import ProductPriceHistory from "./product-price-history";
import { useAuth } from "@/context/AuthContext";
import { getCompanyStorageKey } from "@/services/company-storage";
import { isValidGtin, gtinAliases } from "@/lib/gtin";
import { createPortal } from "react-dom";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import { getSalesProductUnits, createSalesProductUnit } from "@/services/vendas.service";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Barcode,
  Boxes,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Copy,
  FileText,
  ImagePlus,
  MoreVertical,
  Package,
  Pencil,
  Plus,
  Search,
  Tags,
  Trash2,
  Truck,
  UploadCloud,
  X,
} from "lucide-react";
import {
  deleteSalesProduct,
  createSalesProduct,
  createSalesProductBrand,
  createSalesProductCategory,
  createSalesProductGrid,
  getSalesProductBrands,
  getSalesProductCategories,
  getSalesProductGrids,
  getSalesProducts,
  getSalesSuppliers,
  updateSalesProduct,
  type SalesProduct,
  type SalesProductClassification,
  type SalesProductGrid,
  type SalesProductInput,
  type SalesSupplier,
  type SalesVariant,
} from "@/services/vendas.service";
import SalesVariantsEditor from "./variacoes-editor";
import { api, getMediaUrl } from "@/services/api";

type ProductTab =
  | "GERAL"
  | "PRECOS"
  | "ESTOQUE"
  | "VARIACOES"
  | "COMISSAO"
  | "FORNECEDOR"
  | "ANEXOS";
type ClassificationKind = "CATEGORY" | "BRAND" | "UNIT";
type ProductStatusFilter = "TODOS" | "ATIVOS" | "INATIVOS";
type ProductSearchField = "ALL" | "NAME" | "CODE" | "BARCODE" | "REFERENCE";
type ProductColumn =
  | "CODE"
  | "BARCODE"
  | "REFERENCE"
  | "NAME"
  | "PRICE"
  | "STOCK"
  | "BRAND";
type SortDirection = "ASC" | "DESC";
const tabs: { id: ProductTab; label: string; icon: typeof Package }[] = [
  { id: "GERAL", label: "Geral", icon: Package },
  { id: "PRECOS", label: "Preços", icon: Tags },
  { id: "ESTOQUE", label: "Estoque", icon: Boxes },
  { id: "VARIACOES", label: "Grade / Variações", icon: Barcode },
  { id: "COMISSAO", label: "Comissão", icon: Tags },
  { id: "FORNECEDOR", label: "Fornecedores", icon: Truck },
  { id: "ANEXOS", label: "Fotos / Anexos", icon: ImagePlus },
];
const field =
  "w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100 uppercase outline-none transition placeholder:text-slate-400 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-bg-light)]";
const money = (value: string | number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value || 0),
  );
const formatMoneyInput = (value: string | number) =>
  Number(value || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const parseMoney = (value: string) => {
  const normalized = value.replace(/R\$\s?/gi, "").trim();
  return Number(
    normalized.includes(",")
      ? normalized.replace(/\./g, "").replace(",", ".")
      : normalized,
  );
};
const roundToTwo = (value: number) => Number(value.toFixed(2));
function CurrencyInput({
  value,
  onChange,
  required = false,
  placeholder = "",
  prefix = "R$",
}: {
  value: number | string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  prefix?: string;
}) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-slate-500 dark:text-slate-400">
        {prefix}
      </span>
      <input
        required={required}
        type="text"
        inputMode="decimal"
        className={`${field} pl-11`}
        value={focused ? draft : value === "" ? "" : formatMoneyInput(value)}
        onFocus={() => { setDraft(value === "" ? "" : formatMoneyInput(value)); setFocused(true); }}
        placeholder={placeholder}
        onChange={(event) => {
          const next = event.target.value.replace(/[^\d,.\-]/g, "");
          setDraft(next);
          onChange(next);
        }}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
}
type ProductForm = Omit<SalesProductInput, "price" | "purchaseCost" | "additionalCost" | "markupMultiplier"> & {
  price: number | "";
  purchaseCost: number | "";
  additionalCost: number | "";
  markupMultiplier: number | "";
};
const empty: ProductForm = {
  name: "",
  sku: null,
  price: "",
  purchaseCost: "",
  additionalCost: "",
  markupMultiplier: "",
  promotionalPrice: null,
  reference: null,
  barcode: null,
  factoryCode: null,
  unit: "UN",
  kind: "PRODUTO",
  description: null,
  showInSale: true,
  category: null,
  subcategory: null,
  brand: null,
  productType: "REVENDA",
  internalNote: null,
  stock: 0,
  minimumStock: 0,
  manageStock: true,
  variations: null,
  inheritGridPrice: true,
  commission: 0,
  commissionEnabled: true,
  commissionType: "VENDEDOR",
  commissionRule: "PADRAO",
  variants: [],
  supplierId: null,
  supplierName: null,
  active: true,
  allowDiscount: true,
  allowAddition: true,
};
type ProductAttachment = {
  type?: string;
  id: string;
  originalName: string;
  size: number | null;
  url: string;
};
type PendingProductAttachment = { id: string; file: File; preview: string | null };
const isProductImage = (file: ProductAttachment) => file.type === "IMAGE" || file.url.startsWith("data:image/") || /\.(png|jpe?g|gif|webp|avif|bmp)$/i.test(file.originalName);

export default function SalesProductsPanel({
  onChanged,
}: { onChanged?: () => void } = {}) {
  const { user } = useAuth();
  const sortStorageKey = user?.companyId && user.id
    ? getCompanyStorageKey(user.companyId, `contrx_products_sort:${user.id}`)
    : null;
  const [products, setProducts] = useState<SalesProduct[]>([]);
  const [suppliers, setSuppliers] = useState<SalesSupplier[]>([]);
  const [query, setQuery] = useState("");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const listRef = useRef<HTMLDivElement>(null);
  const [statusFilter, setStatusFilter] =
    useState<ProductStatusFilter>("ATIVOS");
  const [searchField, setSearchField] = useState<ProductSearchField>("ALL");
  const [exactSearch, setExactSearch] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<SalesProduct | null>(null);
  const [deletingProduct, setDeletingProduct] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [actionMenuPosition, setActionMenuPosition] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (!actionMenuId) return;
    const dismiss = () => setActionMenuId(null);
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest('[data-product-actions]')) dismiss();
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") dismiss(); };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [actionMenuId]);
  const [visibleColumns, setVisibleColumns] = useState<ProductColumn[]>([
    "CODE",
    "BARCODE",
    "REFERENCE",
    "NAME",
    "PRICE",
    "STOCK",
    "BRAND",
  ]);
  const [sortColumn, setSortColumn] = useState<ProductColumn>("NAME");
  const [sortDirection, setSortDirection] = useState<SortDirection>("ASC");
  useEffect(() => {
    let column: ProductColumn = "NAME";
    let direction: SortDirection = "ASC";
    try {
      const stored = sortStorageKey ? localStorage.getItem(sortStorageKey) : null;
      const saved = stored ? JSON.parse(stored) : null;
      if (saved && ["CODE", "BARCODE", "REFERENCE", "NAME", "PRICE", "STOCK", "BRAND"].includes(saved.column)
        && ["ASC", "DESC"].includes(saved.direction)) {
        column = saved.column;
        direction = saved.direction;
      }
    } catch {
      // Preferencias ausentes ou invalidas mantem a ordenacao padrao.
    }
    setSortColumn(column);
    setSortDirection(direction);
  }, [sortStorageKey]);
  const [categories, setCategories] = useState<SalesProductClassification[]>(
    [],
  );
  const [brands, setBrands] = useState<SalesProductClassification[]>([]);
  const [units, setUnits] = useState<SalesProductClassification[]>([]);
  const [grids, setGrids] = useState<SalesProductGrid[]>([]);
  const [selectedGridId, setSelectedGridId] = useState("");
  const [editingGridParent, setEditingGridParent] = useState(false);
  const [gridOrigin, setGridOrigin] = useState<{ name: string; value: string } | null>(null);
  const variantDrafts = useRef(new Map<string, SalesVariant>());
  const [gridDialogOpen, setGridDialogOpen] = useState(false);
  const [gridName, setGridName] = useState("");
  const [gridValues, setGridValues] = useState("");
  const [savingGrid, setSavingGrid] = useState(false);
  const [classificationOpen, setClassificationOpen] =
    useState<ClassificationKind | null>(null);
  const [classificationSearch, setClassificationSearch] = useState("");
  const [classificationDialog, setClassificationDialog] =
    useState<ClassificationKind | null>(null);
  const [classificationName, setClassificationName] = useState("");
  const [savingClassification, setSavingClassification] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tab, setTab] = useState<ProductTab>("GERAL");
  const [priceTab, setPriceTab] = useState<"VALUES" | "HISTORY">("VALUES");
  const [form, setForm] = useState<ProductForm>(empty);
  const [gtinCheck, setGtinCheck] = useState<{ code: string; id: string | null; available: boolean; message: string } | null>(null);
  const [gtinAttempt, setGtinAttempt] = useState(0);
  const gtin = form.barcode?.trim() || "";
  const gtinValid = !gtin || isValidGtin(gtin);
  const duplicateGtin = gtin && gtinValid ? products.find(product => product.id !== editingId && (
    (product.barcode && gtinAliases(gtin).includes(product.barcode)) || product.variants?.some(variant => variant.barcode && gtinAliases(gtin).includes(variant.barcode))
  )) : undefined;
  const currentGtinCheck = gtinCheck?.code === gtin && gtinCheck.id === editingId ? gtinCheck : null;
  const gtinBlocked = Boolean(gtin && (!gtinValid || duplicateGtin || !currentGtinCheck?.available));
  const gtinMessage = !gtin ? "Opcional. GTIN de 8, 12, 13 ou 14 dígitos." : !gtinValid ? "GTIN inválido: confira o tamanho e o dígito verificador." : duplicateGtin ? `GTIN já cadastrado: ${duplicateGtin.name}.` : currentGtinCheck?.message || "Verificando se o GTIN já está cadastrado…";
  useEffect(() => {
    if (!open || !gtin || !gtinValid || duplicateGtin) return;
    let canceled = false;
    const timeout = window.setTimeout(async () => {
      try {
        const response = await api.get<{ available: boolean; message: string }>(`/vendas/produtos/verificar-gtin?barcode=${encodeURIComponent(gtin)}${editingId ? `&excludeId=${encodeURIComponent(editingId)}` : ""}`, { skipCache: true });
        if (!canceled) setGtinCheck({ code: gtin, id: editingId, ...response.data });
      } catch {
        if (!canceled) setGtinCheck({ code: gtin, id: editingId, available: false, message: "Não foi possível verificar o GTIN. Confira a conexão e tente novamente." });
      }
    }, 350);
    return () => { canceled = true; window.clearTimeout(timeout); };
  }, [open, gtin, gtinValid, duplicateGtin, editingId, gtinAttempt]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<ProductAttachment[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<PendingProductAttachment[]>([]);
  const attachmentRequest = useRef(0);
  const [uploading, setUploading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const [productRows, supplierRows, categoryRows, brandRows, gridRows, unitRows] =
        await Promise.all([
          getSalesProducts(),
          getSalesSuppliers(),
          getSalesProductCategories(),
          getSalesProductBrands(),
          getSalesProductGrids(),
          getSalesProductUnits(),
        ]);
      setProducts(productRows);
      setSuppliers(supplierRows);
      setCategories(categoryRows);
      setBrands(brandRows);
      setUnits(unitRows);
      setGrids(gridRows);
      setError("");
    } catch (cause) {
      setLoadFailed(true);
      setError(
        cause instanceof Error
          ? cause.message
          : "NÃO FOI POSSÍVEL CARREGAR OS PRODUTOS.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const names = [
      ...new Set(
        (form.variations || "")
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean),
      ),
    ];
    setForm((current) => {
      const variants = names.map(
        (name) =>
          current.variants?.find((variant) => variant.name === name) || variantDrafts.current.get(name) || {
            name,
            barcode: null,
            price: null,
            stock: 0,
          },
      );
      return { ...current, variants, ...((editingGridParent || (!editingId && names.length > 0)) ? { stock: variants.reduce((sum, variant) => sum + Number(variant.stock), 0), manageStock: true } : {}) };
    });
  }, [form.variations, editingGridParent, editingId]);
  const productCategories = useMemo(
    () =>
      [
        ...new Set(
          products
            .map((product) => product.category)
            .filter((value): value is string => Boolean(value)),
        ),
      ].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [products],
  );
  const productBrands = useMemo(
    () =>
      [
        ...new Set(
          products
            .map((product) => product.brand)
            .filter((value): value is string => Boolean(value)),
        ),
      ].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [products],
  );
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    const matches = (value: string | null | undefined) => {
      const candidate = (value || "").trim().toLocaleLowerCase("pt-BR");
      return (
        !term || (exactSearch ? candidate === term : candidate.includes(term))
      );
    };
    return products.filter((product) => {
      if (statusFilter === "ATIVOS" && !product.active) return false;
      if (statusFilter === "INATIVOS" && product.active) return false;
      if (categoryFilter && product.category !== categoryFilter) return false;
      if (brandFilter && product.brand !== brandFilter) return false;
      if (!term) return true;
      if (searchField === "NAME") return matches(product.name);
      if (searchField === "CODE") return matches(product.sku);
      if (searchField === "BARCODE") return matches(product.barcode);
      if (searchField === "REFERENCE") return matches(product.reference);
      return [
        product.name,
        product.sku,
        product.barcode,
        product.reference,
      ].some((value) => matches(value));
    });
  }, [
    products,
    query,
    statusFilter,
    searchField,
    exactSearch,
    categoryFilter,
    brandFilter,
  ]);
  const sortedProducts = useMemo(
    () =>
      [...filtered].sort((left, right) => {
        const keys = {
          CODE: "sku",
          BARCODE: "barcode",
          REFERENCE: "reference",
          NAME: "name",
          PRICE: "price",
          STOCK: "stock",
          BRAND: "brand",
        } as const;
        const leftValue = left[keys[sortColumn]];
        const rightValue = right[keys[sortColumn]];
        const comparison =
          sortColumn === "PRICE" || sortColumn === "STOCK"
            ? Number(leftValue || 0) - Number(rightValue || 0)
            : String(leftValue || "").localeCompare(
                String(rightValue || ""),
                "pt-BR",
                { numeric: true, sensitivity: "base" },
              );
        return sortDirection === "ASC" ? comparison : -comparison;
      }),
    [filtered, sortColumn, sortDirection],
  );
  const pageCount = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * pageSize;
  const pageProducts = sortedProducts.slice(pageStart, pageStart + pageSize);
  const pageNumbers = Array.from(new Set([1, currentPage - 1, currentPage, currentPage + 1, pageCount]))
    .filter(value => value >= 1 && value <= pageCount).sort((a, b) => a - b);
  function changePage(value: number) {
    setPage(Math.max(1, Math.min(value, pageCount)));
    setActionMenuId(null);
    listRef.current?.scrollTo({ top: 0 });
  }
  function toggleSort(column: ProductColumn) {
    changePage(1);
    const direction: SortDirection = sortColumn === column && sortDirection === "ASC" ? "DESC" : "ASC";
    setSortColumn(column);
    setSortDirection(direction);
    try {
      if (sortStorageKey) localStorage.setItem(sortStorageKey, JSON.stringify({ column, direction }));
    } catch {
      // A ordenacao continua funcionando se o navegador bloquear o armazenamento.
    }
  }
  function sortIcon(column: ProductColumn) {
    return sortColumn === column ? (
      sortDirection === "ASC" ? (
        <ArrowUp className="h-3.5 w-3.5 text-[var(--primary-color)]" />
      ) : (
        <ArrowDown className="h-3.5 w-3.5 text-[var(--primary-color)]" />
      )
    ) : (
      <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
    );
  }
  function startNew() {
    setPriceTab("VALUES");
    setGtinCheck(null);
    attachmentRequest.current += 1;
    setEditingGridParent(false);
    setGridOrigin(null);
    variantDrafts.current.clear();
    setForm({ ...empty });
    setEditingId(null);
    setAttachments([]);
    setPendingAttachments([]);
    setSelectedGridId("");
    setTab("GERAL");
    setError("");
    setOpen(true);
  }
  function startEdit(product: SalesProduct) {
    setPriceTab("VALUES");
    setGtinCheck(null);
    setAttachments([]);
    setPendingAttachments([]);
    setEditingGridParent(Boolean(product.isGridParent));
    setGridOrigin(product.parentProductId ? { name: product.gridParentName || "Produto principal", value: product.gridValue || "" } : null);
    variantDrafts.current.clear();
    setForm({
      expectedUpdatedAt: product.updatedAt,
      gridId: product.gridId,
      name: product.name,
      sku: product.sku,
      price: Number(product.price),
      purchaseCost: Number(product.purchaseCost),
      additionalCost: Number(product.additionalCost),
      markupMultiplier: Number(product.markupMultiplier),
      promotionalPrice:
        product.promotionalPrice == null
          ? null
          : Number(product.promotionalPrice),
      reference: product.reference,
      barcode: product.barcode,
      factoryCode: product.factoryCode,
      unit: product.unit,
      kind: product.kind,
      description: product.description,
      showInSale: product.showInSale,
      category: product.category,
      subcategory: product.subcategory,
      brand: product.brand,
      productType: product.productType,
      internalNote: product.internalNote,
      stock: Number(product.stock),
      minimumStock: Number(product.minimumStock),
      manageStock: product.manageStock,
      variations: product.variations,
      inheritGridPrice: product.inheritGridPrice,
      commission: Number(product.commission),
      commissionEnabled: product.commissionEnabled,
      commissionType: product.commissionType,
      commissionRule: product.commissionRule,
      variants: product.variants ?? [],
      supplierId: product.supplierId ?? null,
      supplierName: product.supplierName,
      active: product.active,
      allowDiscount: product.allowDiscount ?? true,
      allowAddition: product.allowAddition ?? true,
    });
    setSelectedGridId(
      product.gridId || (grids.find((grid) => grid.values === product.variations) ||
        grids.find((grid) => {
          const names = (product.variations || "").split(",").map((name) => name.trim()).filter(Boolean);
          const options = grid.values.split(",").map((name) => name.trim());
          return names.length > 0 && names.every((name) => options.includes(name));
        }))?.id || "",
    );
    setEditingId(product.id);
    setTab("GERAL");
    setError("");
    setOpen(true);
    void loadAttachments(product.id);
  }
  async function loadAttachments(productId: string) {
    const request = ++attachmentRequest.current;
    try {
      const response = await api.get<ProductAttachment[]>(
        `/files/entity/OTHER/${encodeURIComponent(productId)}`,
      );
      if (request === attachmentRequest.current) setAttachments(response.data);
    } catch (cause) {
      if (request !== attachmentRequest.current) return;
      setError(
        cause instanceof Error
          ? cause.message
          : "NÃO FOI POSSÍVEL CARREGAR OS ANEXOS.",
      );
    }
  }
  async function uploadFiles(files: FileList | null) {
    if (!files?.length || uploading || saving) return;
    setUploading(true);
    setError("");
    try {
      for (const file of Array.from(files)) if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name}: LIMITE DE 10 MB POR ARQUIVO.`);
      if (!editingId) {
        const selected = await Promise.all(Array.from(files).map(async (file) => ({ id: crypto.randomUUID(), file, preview: file.type.startsWith("image/") ? await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error(`Não foi possível ler ${file.name}.`)); reader.readAsDataURL(file); }) : null })));
        setPendingAttachments((current) => [...current, ...selected]);
        return;
      }
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        body.append("entityType", "OTHER");
        body.append("entityId", editingId);
        await api.post("/files/upload", body);
      }
      await loadAttachments(editingId);
      await load();
      onChanged?.();
    } catch (cause) {
      if (editingId) { await loadAttachments(editingId); await load(); onChanged?.(); }
      setError(
        cause instanceof Error
          ? cause.message
          : "NÃO FOI POSSÍVEL ENVIAR O ARQUIVO.",
      );
    } finally {
      setUploading(false);
    }
  }
  async function removeFile(file: ProductAttachment) {
    if (saving || uploading || !editingId || !window.confirm(`EXCLUIR O ANEXO ${file.originalName}?`))
      return;
    setUploading(true);
    try {
      await api.delete(`/files/${encodeURIComponent(file.id)}`);
      await loadAttachments(editingId);
      await load();
      onChanged?.();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "NÃO FOI POSSÍVEL EXCLUIR O ANEXO.",
      );
    } finally {
      setUploading(false);
    }
  }
  const set = (
    key: keyof SalesProductInput,
    value: string | number | boolean | null,
  ) => setForm((current) => ({ ...current, [key]: value }));
  function selectVariations(names: string[]) {
    if (form.variants?.some((variant) => Number(variant.reservedStock || 0) > 0 && !names.includes(variant.name))) {
      setError("Não é possível remover uma variação com peças reservadas em condicional.");
      return false;
    }
    for (const variant of form.variants || []) variantDrafts.current.set(variant.name, variant);
    set("variations", names.join(", ") || null);
    return true;
  }
  const selectedGrid = grids.find((grid) => grid.id === selectedGridId);
  const selectedVariationNames = (form.variations || "").split(",").map((name) => name.trim()).filter(Boolean);
  const gridOptions = [...new Set([
    ...(selectedGrid?.values || "").split(",").map((name) => name.trim()).filter(Boolean),
    ...selectedVariationNames,
  ])];
  function classificationPicker(kind: ClassificationKind, label: string) {
    const options = kind === "CATEGORY" ? categories : kind === "UNIT" ? units : brands;
    const key = kind === "CATEGORY" ? "category" : kind === "UNIT" ? "unit" : "brand";
    const selected = String(form[key] || "");
    const filteredOptions = options.filter((option) =>
      option.name
        .toLocaleLowerCase("pt-BR")
        .includes(classificationSearch.trim().toLocaleLowerCase("pt-BR")),
    );
    return (
      <label className="block space-y-1">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
          {label}
          <b className="text-red-600"> *</b>
        </span>
        <div className="grid grid-cols-[minmax(0,1fr)_36px] gap-1.5">
          <div className="relative">
            <button
              type="button"
              aria-expanded={classificationOpen === kind}
              onClick={() => {
                setClassificationOpen(
                  classificationOpen === kind ? null : kind,
                );
                setClassificationSearch("");
              }}
              className={`${field} flex items-center justify-between text-left`}
            >
              <span
                className={
                  selected ? "truncate text-slate-800 dark:text-slate-100" : "text-slate-400"
                }
              >
                {selected || "Selecionar..."}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-[var(--primary-color)] transition-transform ${classificationOpen === kind ? "rotate-180" : ""}`}
              />
            </button>
            {classificationOpen === kind && (
              <div className="absolute left-0 top-[calc(100%+4px)] z-30 w-full min-w-56 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-xl">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    autoFocus
                    className="w-full rounded-md border border-slate-200 dark:border-slate-700 py-2 pl-8 pr-2 text-xs uppercase outline-none focus:border-[var(--primary-color)]"
                    value={classificationSearch}
                    onChange={(event) =>
                      setClassificationSearch(event.target.value)
                    }
                    placeholder="Pesquisar..."
                  />
                </div>
                <div className="mt-2 max-h-48 overflow-y-auto">
                  {filteredOptions.length ? (
                    filteredOptions.map((option) => (
                      <button
                        type="button"
                        key={option.id}
                        onClick={() => {
                          set(key, option.name);
                          setClassificationOpen(null);
                          setClassificationSearch("");
                        }}
                        className={`block w-full rounded-md px-2.5 py-2 text-left text-xs font-semibold uppercase ${selected === option.name ? "bg-[var(--primary-color)] text-white" : "text-slate-700 dark:text-slate-200 hover:bg-slate-100"}`}
                      >
                        {option.name}
                      </button>
                    ))
                  ) : (
                    <p className="px-2 py-3 text-center text-xs text-slate-500 dark:text-slate-400">
                      Nenhuma opção encontrada.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            title={`Cadastrar ${label.toLocaleLowerCase("pt-BR")}`}
            onClick={() => {
              setClassificationDialog(kind);
              setClassificationName("");
              setError("");
            }}
            className="flex h-10 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-[var(--primary-color)] hover:text-[var(--primary-color)]"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </label>
    );
  }
  async function saveClassification() {
    const name = classificationName.trim().toLocaleUpperCase("pt-BR");
    if (!classificationDialog || !name) return;
    setSavingClassification(true);
    setError("");
    try {
      const created =
        classificationDialog === "CATEGORY"
          ? await createSalesProductCategory(name)
          : classificationDialog === "UNIT" ? await createSalesProductUnit(name) : await createSalesProductBrand(name);
      if (classificationDialog === "CATEGORY") {
        setCategories((current) => [
          ...current.filter((item) => item.name !== created.name),
          created,
        ]);
        set("category", created.name);
      } else if (classificationDialog === "UNIT") {
        setUnits((current) => [...current.filter((item) => item.name !== created.name), created].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
        set("unit", created.name);
      } else {
        setBrands((current) => [
          ...current.filter((item) => item.name !== created.name),
          created,
        ]);
        set("brand", created.name);
      }
      setClassificationDialog(null);
      setClassificationName("");
      setMessage(
        `${classificationDialog === "CATEGORY" ? "CATEGORIA" : classificationDialog === "UNIT" ? "UNIDADE" : "MARCA"} CADASTRADA.`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "NÃO FOI POSSÍVEL CADASTRAR A OPÇÃO.",
      );
    } finally {
      setSavingClassification(false);
    }
  }
  async function saveGrid() {
    const name = gridName.trim().toLocaleUpperCase("pt-BR");
    const values = gridValues
      .split(",")
      .map((value) => value.trim().toLocaleUpperCase("pt-BR"))
      .filter(Boolean);
    if (!name || !values.length) {
      setError("INFORME O NOME DA GRADE E SUAS VARIAÇÕES.");
      return;
    }
    setSavingGrid(true);
    setError("");
    try {
      const created = await createSalesProductGrid(name, values.join(", "));
      setGrids((current) => [
        ...current.filter((item) => item.name !== created.name),
        created,
      ]);
      if (selectVariations(created.values.split(",").map((value) => value.trim()).filter(Boolean)))
        setSelectedGridId(created.id);
      setGridDialogOpen(false);
      setGridName("");
      setGridValues("");
      setMessage("GRADE CADASTRADA.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "NÃO FOI POSSÍVEL CADASTRAR A GRADE.",
      );
    } finally {
      setSavingGrid(false);
    }
  }
  const totalCost =
    Number(form.purchaseCost || 0) + Number(form.additionalCost || 0);
  const profitMargin =
    Number(form.price) > 0
      ? ((Number(form.price) - totalCost) / Number(form.price)) * 100
      : 0;
  function updateProfitMargin(value: string) {
    if (!value.trim()) return;
    const margin = parseMoney(value);
    if (!Number.isFinite(margin) || margin >= 100) return;
    setForm(current => {
      const cost = Number(current.purchaseCost || 0) + Number(current.additionalCost || 0);
      const multiplier = 1 / (1 - margin / 100);
      return { ...current, markupMultiplier: roundToTwo(multiplier), price: cost > 0 ? roundToTwo(cost * multiplier) : "" };
    });
  }
  function updateSalePrice(value: string) {
    const price = value.trim() ? parseMoney(value) || 0 : "";
    setForm((current) => {
      const cost =
        Number(current.purchaseCost || 0) + Number(current.additionalCost || 0);
      return {
        ...current,
        price,
        markupMultiplier: price === "" ? "" : cost > 0 ? roundToTwo(price / cost) : 1,
      };
    });
  }
  function updateMarkup(value: string) {
    const parsed = Number(value);
    const markupMultiplier = value.trim() ? Number.isFinite(parsed) ? roundToTwo(parsed) : 1 : "";
    setForm((current) => {
      const cost =
        Number(current.purchaseCost || 0) + Number(current.additionalCost || 0);
      return {
        ...current,
        markupMultiplier,
        price: markupMultiplier === "" ? "" : Number((cost * markupMultiplier).toFixed(2)),
      };
    });
  }
  function updateCost(key: "purchaseCost" | "additionalCost", value: string) {
    const amount = parseMoney(value) || 0;
    setForm((current) => {
      const purchaseCost =
        key === "purchaseCost" ? amount : Number(current.purchaseCost || 0);
      const additionalCost =
        key === "additionalCost" ? amount : Number(current.additionalCost || 0);
      return {
        ...current,
        [key]: value.trim() ? amount : "",
        price: purchaseCost + additionalCost === 0 ? "" : Number(
          (
            (purchaseCost + additionalCost) *
            Number(current.markupMultiplier === "" ? 1 : current.markupMultiplier)
          ).toFixed(2),
        ),
      };
    });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || uploading) return;
    if (gtinBlocked) { setError(gtinMessage); setTab("GERAL"); return; }
    if (form.purchaseCost === "" || form.price === "") {
      setError("INFORME O CUSTO DE COMPRA E O PREÇO DE VENDA.");
      setTab("PRECOS");
      return;
    }
    if (!Number.isInteger(Number(form.stock)) || !Number.isInteger(Number(form.minimumStock))) {
      setError("O ESTOQUE ATUAL E O ESTOQUE MÍNIMO DEVEM SER NÚMEROS INTEIROS.");
      setTab("ESTOQUE");
      return;
    }
    if (!form.category?.trim() || !form.brand?.trim()) {
      setError("CATEGORIA E MARCA S?O OBRIGAT?RIAS.");
      return;
    }
    const price = roundToTwo(parseMoney(String(form.price)));
    const stock = Number(form.stock);
    const minimumStock = Number(form.minimumStock);
    const commission = roundToTwo(Number(form.commission));
    const purchaseCost = roundToTwo(Number(form.purchaseCost));
    const additionalCost = roundToTwo(Number(form.additionalCost || 0));
    const markupValue = Number(form.markupMultiplier === "" ? 1 : form.markupMultiplier);
    const markupMultiplier = Number.isFinite(markupValue)
      ? roundToTwo(markupValue)
      : 1;
    const promotionalPrice =
      form.promotionalPrice == null
        ? null
        : roundToTwo(Number(form.promotionalPrice));
    if (
      ![
        price,
        stock,
        minimumStock,
        commission,
        purchaseCost,
        additionalCost,
        markupMultiplier,
        ...(promotionalPrice == null ? [] : [promotionalPrice]),
      ].every(Number.isFinite) ||
      price < 0 ||
      stock < 0 ||
      minimumStock < 0 ||
      commission < 0 ||
      (form.commissionEnabled &&
        form.commissionType === "PERCENTUAL" &&
        commission > 100) ||
      purchaseCost < 0 ||
      additionalCost < 0 ||
      markupMultiplier < 0 ||
      (promotionalPrice != null &&
        (promotionalPrice < 0 || promotionalPrice > price))
    ) {
      setError("CONFIRA PREÇO, ESTOQUE E COMISSÃO.");
      return;
    }
    setSaving(true);
    setError("");
    const data = {
      ...form,
      gridId: selectedGridId || null,
      variants: form.variants?.map((variant) => ({
        id: variant.id,
        expectedUpdatedAt: variant.expectedUpdatedAt,
        name: variant.name,
        barcode: variant.barcode,
        price: variant.price == null ? null : Number(variant.price),
        stock: Number(variant.stock),
      })),
      name: form.name.trim().toLocaleUpperCase("pt-BR"),
      sku: form.sku?.trim().toLocaleUpperCase("pt-BR") || null,
      subcategory: null,
      price,
      purchaseCost,
      additionalCost,
      markupMultiplier,
      promotionalPrice,
      stock,
      minimumStock,
      commission,
    };
    let productSaved = false;
    let savedProductId: string | null = null;
    try {
      const saved = editingId ? await updateSalesProduct(editingId, data) : await createSalesProduct(data);
      productSaved = true;
      savedProductId = saved.id;
      setEditingId(saved.id);
      setEditingGridParent(Boolean(saved.isGridParent));
      setForm((current) => ({ ...current, sku: saved.sku, expectedUpdatedAt: saved.updatedAt, variants: saved.variants ?? current.variants }));
      for (const attachment of pendingAttachments) {
        const body = new FormData();
        body.append("file", attachment.file);
        body.append("entityType", "OTHER");
        body.append("entityId", saved.id);
        await api.post("/files/upload", body);
        setPendingAttachments((current) => current.filter((item) => item.id !== attachment.id));
      }
      setMessage(editingId ? "PRODUTO ATUALIZADO." : "PRODUTO CADASTRADO.");
      setOpen(false);
      await load();
      onChanged?.();
    } catch (cause) {
      if (productSaved) { if (savedProductId) await loadAttachments(savedProductId); await load(); onChanged?.(); }
      setError(
        productSaved ? `O produto foi salvo, mas não foi possível enviar todos os anexos. Os arquivos restantes foram mantidos; clique em Gravar Produto para tentar novamente. ${cause instanceof Error ? cause.message : ""}` : cause instanceof Error
          ? cause.message
          : "NÃO FOI POSSÍVEL SALVAR O PRODUTO.",
      );
    } finally {
      setSaving(false);
    }
  }
  function focusNextProductField(event: ReactKeyboardEvent<HTMLFormElement>) {
    if (
      event.key !== "Enter" ||
      !(event.target instanceof HTMLInputElement) ||
      ["checkbox", "radio", "file", "hidden"].includes(event.target.type)
    )
      return;
    event.preventDefault();
    const fields = Array.from(
      event.currentTarget.querySelectorAll<
        HTMLInputElement | HTMLSelectElement
      >(
        'input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]):not(:disabled), select:not(:disabled)',
      ),
    );
    const nextIndex = fields.indexOf(event.target) + 1;
    if (nextIndex > 0 && nextIndex < fields.length) fields[nextIndex].focus();
  }
  async function deleteProduct(product: SalesProduct) {
    if (deletingProduct) return;
    setActionMenuId(null);
    setDeletingProduct(true);
    setDeleteError("");
    try {
      await deleteSalesProduct(product.id);
      setProductToDelete(null);
      setMessage("PRODUTO EXCLUÍDO.");
      await load();
      onChanged?.();
    } catch (cause) {
      setDeleteError(
        cause instanceof Error
          ? cause.message
          : "NÃO FOI POSSÍVEL EXCLUIR O PRODUTO.",
      );
    } finally {
      setDeletingProduct(false);
    }
  }
  function cloneProduct(product: SalesProduct) {
    startNew();
    setSelectedGridId(product.gridId || grids.find((grid) => grid.values === product.variations)?.id || "");
    setForm({
      name: product.name + " - CÓPIA",
      sku: null,
      price: Number(product.price),
      purchaseCost: Number(product.purchaseCost),
      additionalCost: Number(product.additionalCost),
      markupMultiplier: Number(product.markupMultiplier),
      promotionalPrice:
        product.promotionalPrice == null
          ? null
          : Number(product.promotionalPrice),
      reference: product.reference,
      barcode: null,
      factoryCode: product.factoryCode,
      unit: product.unit,
      kind: product.kind,
      description: product.description,
      showInSale: product.showInSale,
      category: product.category,
      subcategory: product.subcategory,
      brand: product.brand,
      productType: product.productType,
      internalNote: product.internalNote,
      stock: 0,
      minimumStock: Number(product.minimumStock),
      manageStock: product.manageStock,
      variations: product.variations,
      inheritGridPrice: product.inheritGridPrice,
      commission: Number(product.commission),
      commissionEnabled: product.commissionEnabled,
      commissionType: product.commissionType,
      commissionRule: product.commissionRule,
      variants: (product.variants ?? []).map((variant) => ({
        name: variant.name,
        barcode: null,
        price: variant.price,
        stock: 0,
      })),
      supplierId: product.supplierId ?? null,
      supplierName: product.supplierName,
      active: true,
      allowDiscount: product.allowDiscount ?? true,
      allowAddition: product.allowAddition ?? true,
    });
    setActionMenuId(null);
  }
  const toggleColumn = (column: ProductColumn) =>
    setVisibleColumns((current) =>
      current.includes(column)
        ? current.filter((value) => value !== column)
        : [...current, column],
    );
  const input = (
    label: string,
    key: keyof SalesProductInput,
    placeholder = "",
    type = "text",
    required = false,
  ) => (
    <label className="block space-y-1">
      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
        {label}
        {required && <b className="text-red-600"> *</b>}
      </span>
      <input
        required={required}
        readOnly={key === "sku" || (key === "stock" && (editingGridParent || (!editingId && Boolean(form.variants?.length))))}
        aria-invalid={key === "barcode" && Boolean(gtin && gtinBlocked)}
        aria-describedby={key === "barcode" ? "product-gtin-message" : undefined}
        inputMode={key === "barcode" ? "numeric" : undefined}
        maxLength={key === "barcode" ? 14 : undefined}
        type={type}
        step={key === "stock" || key === "minimumStock" ? 1 : undefined}
        min={key === "stock" || key === "minimumStock" ? 0 : undefined}
        onKeyDown={event => { if ((key === "stock" || key === "minimumStock") && [".", ",", "e", "E"].includes(event.key)) event.preventDefault(); }}
        className={
          key === "sku"
            ? `${field} cursor-not-allowed bg-slate-100 text-slate-500`
            : field
        }
        value={String(form[key] ?? "")}
        onChange={(e) => {
          if ((key === "stock" || key === "minimumStock") && e.target.value !== "" && !/^\d+$/.test(e.target.value)) return;
          set(key, type === "number" ? Number(e.target.value) : e.target.value);
        }}
        placeholder={placeholder}
      />
      {key === "barcode" && <small id="product-gtin-message" role="status" className={`block text-[11px] normal-case ${gtin && gtinBlocked ? "text-red-600" : gtin ? "text-emerald-700" : "text-slate-500"}`}>{gtinMessage}</small>}
      {key === "barcode" && gtinValid && gtin && currentGtinCheck && !currentGtinCheck.available && !duplicateGtin && <button type="button" onClick={() => { setGtinCheck(null); setGtinAttempt(value => value + 1); }} className="text-xs font-semibold text-[var(--primary-color)] underline">Verificar novamente</button>}
    </label>
  );
  return (
    <div data-products-page className="flex min-h-[540px] flex-col gap-2 lg:h-[calc(100dvh-2rem)]">
      <SalesPageHeader compact title="Produtos" description="Gerencie seu catálogo de produtos." icon={Package} />
      {error && !open && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
        >
          {error}
        </div>
      )}
      {message && (
        <div
          role="status"
          className="rounded-xl border border-[var(--primary-border-light)] bg-[var(--primary-bg-light)] px-4 py-3 text-sm font-semibold text-[var(--primary-color)]"
        >
          {message}
        </div>
      )}
      <section aria-label="Catálogo de produtos" className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div onChangeCapture={() => changePage(1)} className="shrink-0 border-b border-slate-200 p-3 sm:p-4 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5 [&>select]:h-9 [&>select]:min-w-0 [&>select]:rounded-lg [&>select]:px-2 [&>select]:py-1.5 [&>select]:text-xs">
            <button type="button" onClick={startNew} className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[var(--primary-color)] px-3 text-xs font-bold text-white hover:bg-[var(--primary-hover)]">
              <Plus className="h-4 w-4" /> Novo produto
            </button>
            <select aria-label="Situação dos produtos" value={statusFilter} onChange={event => { setStatusFilter(event.target.value as ProductStatusFilter); changePage(1); }} className="rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              <option value="TODOS">Todos</option>
              <option value="ATIVOS">Ativos</option>
              <option value="INATIVOS">Inativos</option>
            </select>
            <label className="relative min-w-56 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                aria-label="Buscar produtos"
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/50 pr-2 pl-8 text-sm text-slate-800 outline-none placeholder:text-slate-500 focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-bg-light)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Busque por nome, código, barras ou referência..."
              />
            </label>
            <select
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
              aria-label="Campo de busca"
              value={searchField}
              onChange={(event) =>
                setSearchField(event.target.value as ProductSearchField)
              }
            >
              <option value="ALL">Todos os campos</option>
              <option value="NAME">Nome do produto</option>
              <option value="CODE">Código</option>
              <option value="BARCODE">Código de barras</option>
              <option value="REFERENCE">Referência</option>
            </select>
            <select
              aria-label="Modo de busca"
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
              value={exactSearch ? "EXACT" : "CONTAINS"}
              onChange={(event) =>
                setExactSearch(event.target.value === "EXACT")
              }
            >
              <option value="CONTAINS">Busca por trecho</option>
              <option value="EXACT">Busca exata</option>
            </select>
            <select
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
              aria-label="Categoria dos produtos"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="">Todas as categorias</option>
              {productCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200"
              aria-label="Marca dos produtos"
              value={brandFilter}
              onChange={(event) => setBrandFilter(event.target.value)}
            >
              <option value="">Todas as marcas</option>
              {productBrands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
            <div className="relative">
              <button
                type="button"
                onClick={() => setColumnsOpen((current) => !current)}
                aria-expanded={columnsOpen}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Columns3 className="h-4 w-4" />
                Colunas
              </button>
              {columnsOpen && (
                <div className="absolute right-0 z-30 mt-2 w-48 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-xl">
                  {(
                    [
                      ["CODE", "Código"],
                      ["BARCODE", "Cód. barras"],
                      ["REFERENCE", "Referência"],
                      ["NAME", "Produto"],
                      ["PRICE", "Venda"],
                      ["STOCK", "Estoque"],
                      ["BRAND", "Marca"],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns.includes(key)}
                        onChange={() => toggleColumn(key)}
                        className="accent-[var(--primary-color)]"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {loading ? (
          <p className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            Carregando produtos...
          </p>
        ) : loadFailed ? (
          <div className="flex min-h-60 flex-1 flex-col items-center justify-center px-6 py-12 text-center">
            <Package className="h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-800 dark:text-slate-100">Não foi possível carregar os produtos</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">A conexão com o servidor falhou. Tente novamente para consultar o catálogo.</p>
            <button type="button" onClick={() => void load()} className="mt-4 rounded-lg bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]">Tentar novamente</button>
          </div>
        ) : filtered.length ? (
          <div ref={listRef} role="region" aria-label="Lista de produtos com rolagem" tabIndex={0} className="min-h-[240px] flex-1 overflow-auto bg-white focus-visible:outline-2 focus-visible:outline-[var(--primary-color)] dark:bg-slate-900">
            <table className="w-full min-w-[960px] text-left text-[13px] leading-snug [&_td]:py-2 [&_th]:py-2.5">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <tr>
                  {visibleColumns.includes("CODE") && (
                    <th className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => toggleSort("CODE")}
                        className="inline-flex items-center gap-1 hover:text-[var(--primary-color)]"
                      >
                        Código {sortIcon("CODE")}
                      </button>
                    </th>
                  )}
                  {visibleColumns.includes("BARCODE") && (
                    <th className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => toggleSort("BARCODE")}
                        className="inline-flex items-center gap-1 hover:text-[var(--primary-color)]"
                      >
                        Cód. barras {sortIcon("BARCODE")}
                      </button>
                    </th>
                  )}
                  {visibleColumns.includes("REFERENCE") && (
                    <th className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => toggleSort("REFERENCE")}
                        className="inline-flex items-center gap-1 hover:text-[var(--primary-color)]"
                      >
                        Referência {sortIcon("REFERENCE")}
                      </button>
                    </th>
                  )}
                  {visibleColumns.includes("NAME") && (
                    <th className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => toggleSort("NAME")}
                        className="inline-flex items-center gap-1 hover:text-[var(--primary-color)]"
                      >
                        Nome do produto {sortIcon("NAME")}
                      </button>
                    </th>
                  )}
                  {visibleColumns.includes("PRICE") && (
                    <th className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggleSort("PRICE")}
                        className="ml-auto inline-flex items-center gap-1 hover:text-[var(--primary-color)]"
                      >
                        Venda {sortIcon("PRICE")}
                      </button>
                    </th>
                  )}
                  {visibleColumns.includes("STOCK") && (
                    <th className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggleSort("STOCK")}
                        className="ml-auto inline-flex items-center gap-1 hover:text-[var(--primary-color)]"
                      >
                        Estoque {sortIcon("STOCK")}
                      </button>
                    </th>
                  )}
                  {visibleColumns.includes("BRAND") && (
                    <th className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => toggleSort("BRAND")}
                        className="inline-flex items-center gap-1 hover:text-[var(--primary-color)]"
                      >
                        Marca {sortIcon("BRAND")}
                      </button>
                    </th>
                  )}
                  <th className="px-3 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pageProducts.map((product) => (
                  <tr
                    key={product.id}
                    tabIndex={0}
                    aria-label={`${product.name}${selectedProductId === product.id ? ", selecionado" : ""}`}
                    onClick={() => setSelectedProductId(product.id)}
                    onKeyDown={event => { if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setSelectedProductId(product.id); } }}
                    className={`h-14 cursor-pointer outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary-color)] ${selectedProductId === product.id ? "bg-[var(--primary-bg-light)] [&>td:first-child]:shadow-[inset_3px_0_0_var(--primary-color)]" : "hover:bg-slate-50 dark:hover:bg-slate-800"} ${Number(product.stock) <= 0 ? "[&>td:not(:last-child)]:!text-red-500 [&>td:not(:last-child)_*]:!text-red-500" : !product.active ? "text-slate-500" : "text-slate-700 dark:text-slate-200"}`}
                  >
                    {visibleColumns.includes("CODE") && (
                      <td className="whitespace-nowrap px-3 py-3 font-semibold text-slate-600 dark:text-slate-300">
                        {product.sku || "—"}
                      </td>
                    )}
                    {visibleColumns.includes("BARCODE") && (
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600 dark:text-slate-300">
                        {product.barcode || "—"}
                      </td>
                    )}
                    {visibleColumns.includes("REFERENCE") && (
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600 dark:text-slate-300">
                        {product.reference || "—"}
                      </td>
                    )}
                    {visibleColumns.includes("NAME") && (
                      <td className="w-[40%] min-w-72 px-3 py-3">
                        <div className="flex items-center gap-2.5 [&>span]:h-9 [&>span]:w-9 [&>span]:rounded-lg">
                        <ProductPhoto src={product.photoUrl} name={product.name} preview />
                        <div className="min-w-0">
                        <span title={[product.name, product.category, product.gridValue ? `Variação: ${product.gridValue}` : ""].filter(Boolean).join(" · ")} className="block max-w-[32rem] truncate font-medium text-slate-800 dark:text-slate-100">
                          {product.name}
                        </span>
                        {!product.active && (
                          <small className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 font-bold uppercase">
                            Inativo
                          </small>
                        )}
                        </div></div>
                      </td>
                    )}
                    {visibleColumns.includes("PRICE") && (
                      <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums">
                        {money(product.price)}
                      </td>
                    )}
                    {visibleColumns.includes("STOCK") && (
                      <td
                        className={`whitespace-nowrap px-3 py-3 text-right tabular-nums ${Number(product.stock) <= 0 ? "font-bold text-red-700 dark:text-red-400" : "font-semibold"}`}
                      >
                        {Number(product.stock).toLocaleString("pt-BR", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 3,
                        })}
                        {Number(product.reservedStock ?? 0) > 0 && (
                          <small className="block text-xs font-semibold text-amber-700">
                            Em condicional:{" "}
                            {Number(product.reservedStock).toLocaleString(
                              "pt-BR",
                            )}
                            <br />
                            Disponível:{" "}
                            {(
                              Number(product.stock) -
                              Number(product.reservedStock)
                            ).toLocaleString("pt-BR")}
                          </small>
                        )}
                      </td>
                    )}
                    {visibleColumns.includes("BRAND") && (
                      <td className="whitespace-nowrap px-3 py-3 text-slate-600 dark:text-slate-300">
                        {product.brand || "—"}
                      </td>
                    )}
                    <td className="px-3 py-3 text-right">
                      <div className="relative inline-block">
                        <button
                          type="button"
                          aria-label={`Ações de ${product.name}`}
                          aria-expanded={actionMenuId === product.id}
                          data-product-actions
                          onClick={(event) => {
                            const rect = event.currentTarget.getBoundingClientRect();
                            setActionMenuPosition({
                              top: rect.bottom + 140 > window.innerHeight ? Math.max(8, rect.top - 136) : rect.bottom + 4,
                              left: Math.max(8, Math.min(rect.right - 176, window.innerWidth - 184)),
                            });
                            setActionMenuId((current) =>
                              current === product.id ? null : product.id,
                            );
                          }}
                          className="rounded-xl border border-slate-200 dark:border-slate-800 p-2 text-slate-500 dark:text-slate-400 hover:border-[var(--primary-color)] hover:text-[var(--primary-color)]"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {actionMenuId === product.id && createPortal(
                          <div data-product-actions style={actionMenuPosition} className="fixed z-[150] w-44 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 text-left shadow-xl">
                            <button
                              type="button"
                              onClick={() => {
                                setActionMenuId(null);
                                startEdit(product);
                              }}
                              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => cloneProduct(product)}
                              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-[var(--primary-bg-light)] hover:text-[var(--primary-color)]"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Clonar
                            </button>
                            <button
                              type="button"
                              onClick={() => { setActionMenuId(null); setError(""); setDeleteError(""); setProductToDelete(product); }}
                              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Excluir
                            </button>
                          </div>, document.body
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex-1 p-12 text-center">
            <Package className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-bold text-slate-700 dark:text-slate-200">
              {query ||
              categoryFilter ||
              brandFilter ||
              statusFilter !== "ATIVOS"
                ? "Nenhum produto encontrado"
                : "Nenhum produto cadastrado"}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {query ||
              categoryFilter ||
              brandFilter ||
              statusFilter !== "ATIVOS"
                ? "Ajuste os filtros ou a busca."
                : "Cadastre produtos para começar a vender."}
            </p>
            {!query &&
              !categoryFilter &&
              !brandFilter &&
              statusFilter === "ATIVOS" && (
                <button
                  type="button"
                  onClick={startNew}
                  className="mt-4 rounded-2xl bg-[var(--primary-color)] px-5 py-2 text-xs font-black text-white shadow-lg shadow-[var(--primary-bg-light)] transition hover:bg-[var(--primary-hover)] active:scale-95"
                >
                  Cadastrar primeiro produto
                </button>
              )}
          </div>
        )}
        {!loadFailed && <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-3">
            <span role="status">{loading ? "Carregando…" : <>Exibindo <strong className="font-medium text-slate-700 dark:text-slate-200">{sortedProducts.length ? pageStart + 1 : 0} a {Math.min(pageStart + pageSize, sortedProducts.length)}</strong> de <strong className="font-medium text-slate-700 dark:text-slate-200">{sortedProducts.length.toLocaleString("pt-BR")}</strong> registros</>}</span>
            <label className="flex items-center gap-2 sm:border-l sm:border-slate-200 sm:pl-3 dark:sm:border-slate-700">Itens por página:
              <select aria-label="Itens por página" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); changePage(1); }} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {[25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>
          </div>
          <nav aria-label="Paginação dos produtos" className="flex items-center gap-1">
            <button type="button" aria-label="Página anterior" disabled={loading || currentPage === 1} onClick={() => changePage(currentPage - 1)} className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-35 dark:border-slate-700 dark:hover:bg-slate-800"><ChevronLeft className="h-4 w-4" /></button>
            {pageNumbers.map((number, index) => <span key={number} className="flex items-center gap-1">
              {index > 0 && number - pageNumbers[index - 1] > 1 && <span className="px-1">…</span>}
              <button type="button" aria-label={`Página ${number}`} aria-current={currentPage === number ? "page" : undefined} disabled={loading} onClick={() => changePage(number)} className={`h-8 min-w-8 rounded-md border px-2 font-medium ${currentPage === number ? "border-[var(--primary-color)] bg-[var(--primary-color)] text-white" : "border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"}`}>{number}</button>
            </span>)}
            <button type="button" aria-label="Próxima página" disabled={loading || currentPage === pageCount} onClick={() => changePage(currentPage + 1)} className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 hover:bg-slate-100 disabled:opacity-35 dark:border-slate-700 dark:hover:bg-slate-800"><ChevronRight className="h-4 w-4" /></button>
          </nav>
        </footer>}
      </section>{" "}
      {productToDelete && <ConfirmationModal title={productToDelete.isGridParent ? "Excluir grade e produtos" : "Excluir produto"} description={`Deseja excluir ${productToDelete.name}? ${productToDelete.isGridParent ? "A matriz e todos os cadastros independentes vinculados serão excluídos juntos. " : ""}A exclusão só é permitida quando não há vínculo com venda, condicional, pedido, orçamento ou outra operação.`} confirmLabel={productToDelete.isGridParent ? "Excluir grade e produtos" : "Excluir produto"} busy={deletingProduct} error={deleteError} onConfirm={() => void deleteProduct(productToDelete)} onCancel={() => { if (!deletingProduct) setProductToDelete(null); }} />}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-2 sm:p-5"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving && !uploading) setOpen(false);
          }}
        >
          <form
            onSubmit={(e) => void submit(e)}
            onKeyDown={focusNextProductField}
            role="dialog"
            aria-modal="true"
            aria-label={editingId ? "Editar produto" : "Novo produto"}
            className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl"
          >
            <header className="flex items-start justify-between border-b px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-[var(--primary-bg-light)] p-2 text-[var(--primary-color)]">
                  <Package className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-black">
                    {editingId ? "Editar Produto" : "Novo Produto"}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Preencha os dados do produto e clique em Gravar.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={saving || uploading}
                onClick={() => setOpen(false)}
                aria-label="Fechar"
              >
                <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              </button>
            </header>
            <nav className="flex overflow-x-auto border-b px-3">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  type="button"
                  key={id}
                  onClick={() => setTab(id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-2.5 py-2.5 text-xs font-bold ${tab === id ? "border-[var(--primary-color)] text-[var(--primary-color)]" : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800"}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </nav>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {error && (
                <p
                  role="alert"
                  className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700"
                >
                  {error}
                </p>
              )}
              {tab === "GERAL" && (
                <div className="space-y-5">
                  <section>
                    <h4 className="mb-3 text-sm font-black text-slate-800 dark:text-slate-100">
                      Identificação do Produto
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                      {input("Código", "sku", "GERADO AO GRAVAR")}
                      {input("Referência", "reference", "REF-0001")}
                      {input(
                        "Código de barras (GTIN)",
                        "barcode",
                        "CÓDIGO DE BARRAS",
                      )}
                      {input(
                        "Código de fábrica",
                        "factoryCode",
                        "CÓDIGO DO FABRICANTE",
                      )}
                      {classificationPicker("UNIT", "Unidade")}
                      <label className="block space-y-1">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          Tipo
                        </span>
                        <select
                          className={field}
                          value={form.kind}
                          onChange={(e) => set("kind", e.target.value)}
                        >
                          <option value="PRODUTO">PRODUTO</option>
                          <option value="SERVICO">SERVIÇO</option>
                        </select>
                      </label>
                      <div className="sm:col-span-2 lg:col-span-3">
                        {input(
                          "Nome do produto",
                          "name",
                          "NOME COMPLETO DO PRODUTO",
                          "text",
                          true,
                        )}
                      </div>
                      <div className="sm:col-span-2 lg:col-span-3">
                        {input(
                          "Descrição",
                          "description",
                          "DESCRIÇÃO ADICIONAL DO PRODUTO",
                        )}
                      </div>
                      <label className="flex items-center gap-2 self-end pb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={form.showInSale}
                          onChange={(e) => set("showInSale", e.target.checked)}
                          className="accent-[var(--primary-color)]"
                        />
                        Mostrar na venda
                      </label>
                    </div>
                  </section>
                  <section className="border-t pt-4">
                    <h4 className="mb-3 text-sm font-black text-slate-800 dark:text-slate-100">
                      Classificação
                    </h4>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {classificationPicker("CATEGORY", "Categoria")}
                      {classificationPicker("BRAND", "Marca")}
                      <label className="block space-y-1">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          Tipo de produto
                        </span>
                        <select
                          className={field}
                          value={form.productType}
                          onChange={(e) => set("productType", e.target.value)}
                        >
                          <option value="REVENDA">
                            MERCADORIA PARA REVENDA
                          </option>
                          <option value="FABRICACAO">PRODUÇÃO PRÓPRIA</option>
                          <option value="USO_CONSUMO">USO E CONSUMO</option>
                          <option value="MATERIA_PRIMA">MATÉRIA-PRIMA</option>
                        </select>
                      </label>
                    </div>
                  </section>
                  <section className="border-t pt-4">
                    {input(
                      "Observação interna",
                      "internalNote",
                      "INFORMAÇÕES ADICIONAIS VISÍVEIS APENAS INTERNAMENTE",
                    )}
                  </section>
                </div>
              )}
              {tab === "PRECOS" && (
                <div className="space-y-4">
                  <div role="tablist" aria-label="Preços do produto" className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
                    {([["VALUES", "Preços e permissões"], ["HISTORY", "Histórico de alterações"]] as const).map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={priceTab === key} aria-controls={`product-price-${key}`} onClick={() => setPriceTab(key)} className={`border-b-2 px-3 py-2 text-xs font-semibold ${priceTab === key ? "border-[var(--primary-color)] text-[var(--primary-color)]" : "border-transparent text-slate-500"}`}>{label}</button>)}
                  </div>
                  {priceTab === "HISTORY" ? <div id="product-price-HISTORY" role="tabpanel"><ProductPriceHistory productId={editingId} /></div> : <div id="product-price-VALUES" role="tabpanel">
                <section className="space-y-5">
                  <div>
                    <h4 className="text-sm font-black">Composição de preços</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Informe os custos e o multiplicador para calcular o preço
                      de venda.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="block space-y-1">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        Custo de compra <b className="text-red-600">*</b>
                      </span>
                      <CurrencyInput
                        required
                        value={form.purchaseCost}
                        onChange={(value) => updateCost("purchaseCost", value)}
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        Custos adicionais (opcional)
                      </span>
                      <CurrencyInput
                        value={form.additionalCost}
                        onChange={(value) =>
                          updateCost("additionalCost", value)
                        }
                      />
                    </label>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 px-3 py-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Custo total
                      </span>
                      <strong className="mt-1 block text-lg">
                        {money(totalCost)}
                      </strong>
                    </div>
                    <label className="block space-y-1">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        Preço de venda *
                      </span>
                      <CurrencyInput
                        required
                        value={form.price}
                        onChange={(value) => updateSalePrice(value)}
                      />
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        Markup (multiplicador)
                      </span>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          className={`${field} pr-8`}
                          value={form.markupMultiplier}
                          min="0"
                          onChange={(e) => updateMarkup(e.target.value)}
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                          x
                        </span>
                      </div>
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        Margem de lucro
                      </span>
                      <CurrencyInput prefix="%" value={form.price === "" ? form.markupMultiplier === "" ? "" : (1 - 1 / Number(form.markupMultiplier)) * 100 : profitMargin} onChange={updateProfitMargin} />
                      <small className="block text-[11px] text-slate-500">Margem sobre a venda, inferior a 100%.</small>
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        Preço promocional
                      </span>
                      <CurrencyInput
                        value={form.promotionalPrice ?? ""}
                        onChange={(value) =>
                          set(
                            "promotionalPrice",
                            value.trim() ? parseMoney(value) : null,
                          )
                        }
                      />
                    </label>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Preço de venda = (custo de compra + custos adicionais) ×
                    multiplicador. O preço promocional fica cadastrado para uso
                    comercial.
                  </p>
                  <div className="flex flex-wrap gap-x-6 gap-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                    <ToggleSwitch label="Permite desconto" checked={form.allowDiscount ?? true} onChange={value => set("allowDiscount", value)} disabled={saving} />
                    <ToggleSwitch label="Permite acréscimo" checked={form.allowAddition ?? true} onChange={value => set("allowAddition", value)} disabled={saving} />
                  </div>
                </section>
                  </div>}
                </div>
              )}
              {tab === "ESTOQUE" && (
                <section className="max-w-3xl space-y-4">
                  <h4 className="text-sm font-black">Controle de estoque</h4>
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={form.manageStock}
                      onChange={(e) => set("manageStock", e.target.checked)}
                    />{" "}
                    Baixar estoque automaticamente ao concluir vendas
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {input("Estoque atual", "stock", "0", "number")}
                    {input("Estoque mínimo", "minimumStock", "0", "number")}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Quando ativado, as vendas concluídas baixam o estoque;
                    cancelamentos e estornos restauram a quantidade. O controle
                    é exclusivo deste módulo.
                  </p>
                </section>
              )}
              {tab === "VARIACOES" && (gridOrigin ? (
                <section className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <h4 className="font-black text-slate-900 dark:text-white">Cadastro independente da grade</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Matriz: <strong>{gridOrigin.name}</strong> · Opção: <strong>{gridOrigin.value}</strong></p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Grade: <strong>{selectedGrid?.name || "Opções da matriz"}</strong></p>
                  <p className="text-xs text-slate-500">Este produto possui código, estoque e preço próprios. Edite as opções e o vínculo da grade no cadastro da matriz.</p>
                </section>
              ) : (
                <section className="space-y-4">
                  <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">
                    Grade de Produtos (Variações)
                  </h4>
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 p-4">
                    <label className="block max-w-xl space-y-1.5">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        Selecione a Grade
                      </span>
                      <div className="flex gap-2">
                        <select
                          className={field}
                          value={selectedGridId}
                          onChange={(event) => {
                            const grid = grids.find(
                              (item) => item.id === event.target.value,
                            );
                            if (selectVariations((grid?.values || "").split(",").map((name) => name.trim()).filter(Boolean)))
                              setSelectedGridId(event.target.value);
                          }}
                        >
                          <option value="">Selecionar...</option>
                          {grids.map((grid) => (
                            <option key={grid.id} value={grid.id}>
                              {grid.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            setGridName("");
                            setGridValues("");
                            setError("");
                            setGridDialogOpen(true);
                          }}
                          aria-label="Cadastrar grade"
                          title="Cadastrar grade"
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-[var(--primary-color)] hover:text-[var(--primary-color)]"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </label>
                    {gridOptions.length > 0 ? (
                      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <h5 className="text-sm font-black uppercase text-slate-800 dark:text-slate-100">{selectedGrid?.name || "Variações do produto"}</h5>
                          <button type="button" aria-label="Remover grade do produto" title="Remover grade do produto" onClick={() => { if (selectVariations([])) setSelectedGridId(""); }} className="rounded p-1 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                          {gridOptions.map((value) => {
                            const reserved = Number(form.variants?.find((variant) => variant.name === value)?.reservedStock || 0) > 0;
                            return (
                              <label key={value} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200" title={reserved ? "Variação com peças reservadas em condicional" : undefined}>
                                <input type="checkbox" checked={selectedVariationNames.includes(value)} disabled={reserved} className="h-4 w-4 accent-[var(--primary-color)] disabled:opacity-50" onChange={(event) => selectVariations(gridOptions.filter((name) => name === value ? event.target.checked : selectedVariationNames.includes(name)))} />
                                {value}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-4 py-3 text-center text-sm text-slate-500 dark:text-slate-400">
                        Nenhuma grade adicionada. Selecione acima.
                      </div>
                    )}
                    <div className="mt-4 border-t border-slate-200 dark:border-slate-800 pt-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                        <input
                          type="checkbox"
                          checked={form.inheritGridPrice}
                          onChange={(event) =>
                            set("inheritGridPrice", event.target.checked)
                          }
                          className="h-5 w-5 accent-[var(--primary-color)]"
                        />
                        Preços iguais na grade (herdar do pai)
                      </label>
                    </div>
                    <SalesVariantsEditor
                      independentInventory={editingGridParent || !editingId}
                      onRemove={(name) => selectVariations(selectedVariationNames.filter((value) => value !== name))}
                      variants={form.variants ?? []}
                      stock={Number(form.stock)}
                      inheritPrice={form.inheritGridPrice}
                      onChange={(variants) =>
                        setForm((current) => ({ ...current, variants, ...((editingGridParent || !editingId) ? { stock: variants.reduce((sum, variant) => sum + Number(variant.stock), 0), manageStock: true } : {}) }))
                      }
                    />

                  </div>
                </section>
              ))}
              {tab === "COMISSAO" && (
                <section className="space-y-5">
                  <div>
                    <h4 className="text-sm font-black">
                      Configuração de Comissão
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Defina como a comissão deste produto será considerada nas
                      vendas.
                    </p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                    <input
                      type="checkbox"
                      checked={form.commissionEnabled}
                      onChange={(e) =>
                        set("commissionEnabled", e.target.checked)
                      }
                      className="h-5 w-5 accent-[var(--primary-color)]"
                    />
                    GERA COMISSÃO
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="block space-y-1">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        Tipo de comissão
                      </span>
                      <select
                        className={field}
                        value={form.commissionType}
                        onChange={(e) => set("commissionType", e.target.value)}
                      >
                        <option value="VENDEDOR">
                          Usar padrão do vendedor
                        </option>
                        <option value="PERCENTUAL">Percentual (%)</option>
                        <option value="FIXO">Valor fixo (R$)</option>
                      </select>
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        Valor / Percentual
                      </span>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max={
                            form.commissionType === "PERCENTUAL"
                              ? 100
                              : undefined
                          }
                          step="0.01"
                          disabled={
                            !form.commissionEnabled ||
                            form.commissionType === "VENDEDOR"
                          }
                          className={field}
                          value={form.commission}
                          onChange={(e) =>
                            set("commission", Number(e.target.value))
                          }
                          placeholder="0,00"
                        />
                        <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">
                          {form.commissionType === "PERCENTUAL"
                            ? "%"
                            : form.commissionType === "FIXO"
                              ? "R$"
                              : ""}
                        </span>
                      </div>
                    </label>
                    <label className="block space-y-1">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                        Regra de aplicação
                      </span>
                      <select
                        className={field}
                        value={form.commissionRule}
                        onChange={(e) => set("commissionRule", e.target.value)}
                      >
                        <option value="PADRAO">Usar padrão</option>
                        <option value="PRECO_BRUTO">
                          Sobre o preço de venda
                        </option>
                        <option value="VALOR_LIQUIDO">
                          Sobre o valor após desconto
                        </option>
                      </select>
                    </label>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No padrão do vendedor, o percentual vem do cadastro do
                    vendedor. A regra escolhida define a base da comissão.
                  </p>
                </section>
              )}
              {tab === "FORNECEDOR" && (
                <section className="max-w-2xl space-y-3">
                  <h4 className="text-sm font-black">Fornecedor principal</h4>
                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                      Fornecedor
                    </span>
                    <select
                      className={field}
                      value={form.supplierId || ""}
                      onChange={(e) => {
                        const supplier = suppliers.find(
                          (item) => item.id === e.target.value,
                        );
                        setForm((current) => ({
                          ...current,
                          supplierId: supplier?.id ?? null,
                          supplierName: supplier?.name ?? null,
                        }));
                      }}
                    >
                      <option value="">SEM FORNECEDOR VINCULADO</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.code} · {supplier.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Gerencie a lista em Cadastros › Fornecedores.
                  </p>
                </section>
              )}
              {tab === "ANEXOS" && (
                <section className="space-y-4">
                  <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/75 dark:bg-slate-800/50 p-6 text-center">
                    <ImagePlus className="mx-auto h-9 w-9 text-slate-400" />
                    <h4 className="mt-2 font-bold">
                      Fotos e anexos do produto
                    </h4>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Imagens e documentos com até 10 MB por arquivo.
                    </p>
                    <label
                      className={`mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--primary-color)] px-4 py-2 text-sm font-bold text-white ${saving || uploading ? "pointer-events-none opacity-50" : ""}`}
                    >
                      <UploadCloud className="h-4 w-4" />
                      {uploading ? "Enviando..." : "Adicionar arquivos"}
                      <input
                        type="file"
                        multiple
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                        className="sr-only"
                        disabled={saving || uploading}
                        onChange={(e) => {
                          void uploadFiles(e.target.files);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                    {!editingId && (
                      <p className="mt-2 text-xs text-amber-700">
                        Selecione as fotos agora. Elas serão enviadas ao gravar o produto.
                      </p>
                    )}
                  </div>
                  <div className="divide-y rounded-xl border border-slate-200 dark:border-slate-800">
                    {pendingAttachments.map((attachment) => <div key={attachment.id} className="flex items-center gap-3 px-3 py-2.5">
                      {attachment.preview ? <ProductPhoto src={attachment.preview} name={attachment.file.name} large/> : <FileText className="h-5 w-5 text-[var(--primary-color)]"/>}
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{attachment.file.name}</p><p className="text-xs text-slate-500">Aguardando envio ao gravar · {(attachment.file.size / 1024).toFixed(0)} KB</p></div>
                      <button type="button" disabled={saving || uploading} aria-label={`Remover ${attachment.file.name}`} className="rounded p-2 text-red-600 disabled:opacity-50" onClick={() => setPendingAttachments((current) => current.filter((item) => item.id !== attachment.id))}><Trash2 size={16}/></button>
                    </div>)}
                    {attachments.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-3 px-3 py-2.5"
                      >
                        {isProductImage(file) ? <ProductPhoto src={file.url} name={file.originalName} large/> : <FileText className="h-4 w-4 text-[var(--primary-color)]" />}
                        <a
                          href={getMediaUrl(file.url)}
                          target="_blank"
                          rel="noreferrer"
                          className="min-w-0 flex-1 truncate text-sm font-semibold"
                        >
                          {file.originalName}
                        </a>
                        <span className="text-xs text-slate-400">
                          {file.size
                            ? `${(file.size / 1024).toFixed(0)} KB`
                            : ""}
                        </span>
                        <button
                          type="button"
                          disabled={saving || uploading}
                          onClick={() => void removeFile(file)}
                          title="Excluir anexo"
                          className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {editingId && attachments.length === 0 && pendingAttachments.length === 0 && (
                      <p className="px-3 py-5 text-center text-sm text-slate-500 dark:text-slate-400">
                        Nenhum arquivo anexado.
                      </p>
                    )}
                  </div>
                </section>
              )}
            </div>
            <footer className="flex flex-wrap items-center gap-3 border-t bg-slate-50 px-5 py-3">
              <div className="mr-auto"><ToggleSwitch label="Produto ativo" checked={form.active} onChange={value => set("active", value)} disabled={saving || uploading} /></div>
              <button
                type="button"
                disabled={saving || uploading}
                onClick={() => { variantDrafts.current.clear(); setSelectedGridId(""); setPendingAttachments([]); setForm({ ...empty }); }}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300"
              >
                Limpar campos
              </button>
              <button
                disabled={saving || uploading || gtinBlocked}
                title={gtinBlocked ? gtinMessage : undefined}
                className="rounded-2xl bg-[var(--primary-color)] px-5 py-3 text-xs font-black text-white disabled:opacity-50 shadow-lg shadow-[var(--primary-bg-light)] transition hover:bg-[var(--primary-hover)] active:scale-95"
              >
                {saving ? "Gravando..." : "Gravar Produto"}
              </button>
            </footer>
          </form>
        </div>
      )}
      {gridDialogOpen && (
        <div
          className="fixed inset-0 z-[125] flex items-center justify-center bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setGridDialogOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="grid-dialog-title"
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl"
          >
            <header className="border-b border-slate-200 dark:border-slate-800 px-5 py-4">
              <h3 id="grid-dialog-title" className="text-lg font-black">
                Nova grade
              </h3>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Informe um nome e as opções de tamanho, cor ou variação.
              </p>
            </header>
            <div className="space-y-3 p-5">
              <label className="block space-y-1">
                <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                  Nome da grade
                </span>
                <input
                  autoFocus
                  maxLength={80}
                  className={field}
                  value={gridName}
                  onChange={(event) =>
                    setGridName(event.target.value.toLocaleUpperCase("pt-BR"))
                  }
                  placeholder="EX.: TAMANHOS"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                  Variações separadas por vírgula
                </span>
                <input
                  maxLength={500}
                  className={field}
                  value={gridValues}
                  onChange={(event) =>
                    setGridValues(event.target.value.toLocaleUpperCase("pt-BR"))
                  }
                  placeholder="EX.: P, M, G, GG"
                />
              </label>
              {error && (
                <p role="alert" className="text-sm font-semibold text-red-600">
                  {error}
                </p>
              )}
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 px-5 py-3">
              <button
                type="button"
                onClick={() => setGridDialogOpen(false)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingGrid || !gridName.trim() || !gridValues.trim()}
                onClick={() => void saveGrid()}
                className="rounded-2xl bg-[var(--primary-color)] px-5 py-3 text-xs font-black text-white disabled:opacity-50 shadow-lg shadow-[var(--primary-bg-light)] transition hover:bg-[var(--primary-hover)] active:scale-95"
              >
                {savingGrid ? "Salvando..." : "Salvar grade"}
              </button>
            </footer>
          </div>
        </div>
      )}
      {classificationDialog && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget)
              setClassificationDialog(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="classification-dialog-title"
            className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl"
          >
            <header className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 px-5 py-4">
              <div>
                <h3
                  id="classification-dialog-title"
                  className="text-lg font-black"
                >
                  Nova{" "}
                  {classificationDialog === "CATEGORY" ? "categoria" : classificationDialog === "UNIT" ? "unidade" : "marca"}
                </h3>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  Cadastre uma opção para classificar os produtos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setClassificationDialog(null)}
                aria-label="Fechar"
                className="rounded-xl p-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="space-y-2 p-5">
              <label
                htmlFor="new-product-classification"
                className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300"
              >
                Nome
              </label>
              <input
                id="new-product-classification"
                autoFocus
                maxLength={classificationDialog === "UNIT" ? 12 : 80}
                className={field}
                value={classificationName}
                onChange={(event) =>
                  setClassificationName(
                    event.target.value.toLocaleUpperCase("pt-BR"),
                  )
                }
                placeholder={
                  classificationDialog === "CATEGORY"
                    ? "NOME DA CATEGORIA"
                    : classificationDialog === "UNIT" ? "SIGLA DA UNIDADE (EX.: DZ)" : "NOME DA MARCA"
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void saveClassification();
                  }
                }}
              />
              {error && (
                <p role="alert" className="text-sm font-semibold text-red-600">
                  {error}
                </p>
              )}
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 px-5 py-3">
              <button
                type="button"
                onClick={() => setClassificationDialog(null)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={savingClassification || !classificationName.trim()}
                onClick={() => void saveClassification()}
                className="rounded-2xl bg-[var(--primary-color)] px-5 py-3 text-xs font-black text-white disabled:opacity-50 shadow-lg shadow-[var(--primary-bg-light)] transition hover:bg-[var(--primary-hover)] active:scale-95"
              >
                {savingClassification ? "Salvando..." : "Salvar"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
