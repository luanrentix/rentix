"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  getSalesReceivingAccounts,
  type SalesReceivingAccount,
} from "@/services/vendas.service";
import { prepareSalesCashAccount } from "@/services/caixa.service";
import PaymentPanel from "./payment-panel";
import posStyles from "./pos.module.css";
import {
  validateSalePayment,
  paymentLabels,
  type SalePaymentMethod,
} from "@/services/sales-payment";
import CardPaymentModal from "./card-payment-modal";
import type { SalesCardPayment } from "@/services/sales-cards";
import { paymentBreakdown } from "@/services/sales-payment";
import SaleReceiptModal from "./sale-receipt-modal";
import PendingSaleActions from "./pending-sale-actions";
import RecordedSaleActions, { RecordedSaleStatus } from "./recorded-sale-actions";
import SaleDetailsModal from "./sale-details-modal";
import CustomerCreditsPanel from "./creditos-panel";
import { getSalesOrderDetails } from "@/services/vendas.service";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import ProductPicker from "./product-picker";
import ProductPhoto from "./product-photo";
import SalesPageHeader from "./sales-page-header";
import SalesCashPanel from "./caixa-panel";
import SalesCustomersPanel from "./clientes-panel";
import SalesReturnModal, { type SalesReturnDecision } from "./troca-modal";
import { getSalesCustomerCredit } from "@/services/vendas.service";
import SalesReportsPanel from "./relatorios-panel";
import SalesReversalsPanel from "./estornos-panel";
import SalesProductsPanel from "./produtos-panel";
import SalesSellersPanel from "./vendedores-panel";
import SalesSuppliersPanel from "./fornecedores-panel";
import {
  Archive,
  ChartNoAxesCombined,
  Clock3,
  Loader2,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  XCircle,
  Save,
  RotateCcw,
} from "lucide-react";
import {
  deleteSalesProduct,
  cancelSalesOrder,
  createSalesOrder,
  createSalesProduct,
  getSalesCustomers,
  getSalesOrders,
  getSalesProducts,
  getSalesSellers,
  updateSalesOrder,
  type SalesCustomer,
  type SalesOrder,
  type SalesProduct,
  type SalesSeller,
  type SaveSalesOrderInput,
} from "@/services/vendas.service";

type CartLine = {
  variantId?: string;
  product: SalesProduct;
  quantity: number;
  unitPrice: number;
};
const cartLineKey = (line: CartLine) =>
  line.product.id + ":" + (line.variantId || "");
type PayMethod = SalePaymentMethod;
const money = (value: string | number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value || 0),
  );
const field =
  "w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none transition focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-bg-light)]";
const saleTypeOptions = [
  { value: "VENDA", label: "Venda" },
  { value: "ORCAMENTO", label: "Orçamento" },
  { value: "CONDICIONAL", label: "Condicional" },
  { value: "PEDIDO", label: "Pedido" },
  { value: "TROCA", label: "Troca de venda" },
];
const openOrderOptions = [
  { value: "ORCAMENTO", label: "Orçamentos" },
  { value: "CONDICIONAL", label: "Condicionais" },
  { value: "ATIVAS", label: "Em andamento" },
  { value: "GRAVADAS", label: "Vendas gravadas" },
];

export default function VendasPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
          Carregando módulo de vendas...
        </div>
      }
    >
      <VendasScreen />
    </Suspense>
  );
}

function VendasScreen() {
  const searchParams = useSearchParams();
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [cardPayments, setCardPayments] = useState<SalesCardPayment[]>([]);
  const [cardModal, setCardModal] = useState<"DEBITO" | "CREDITO" | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<SalesOrder | null>(null);
  const [detailsOrder, setDetailsOrder] = useState<SalesOrder | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptTender, setReceiptTender] = useState("");
  const [deletingSale, setDeletingSale] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [customerCreditBalance, setCustomerCreditBalance] = useState("0");
  const [variantPickerProduct, setVariantPickerProduct] =
    useState<SalesProduct | null>(null);
  const [products, setProducts] = useState<SalesProduct[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [registeredSellers, setRegisteredSellers] = useState<SalesSeller[]>([]);
  const [registeredCustomers, setRegisteredCustomers] = useState<
    SalesCustomer[]
  >([]);
  const [customerPickerMode, setCustomerPickerMode] = useState(false);
  const [currentEditOrderId, setCurrentEditOrderId] = useState<string | null>(
    null,
  );
  const [activeView, setActiveView] = useState<
    | "POS"
    | "ABRIR"
    | "ESTORNOS"
    | "RELATORIOS"
    | "CAIXA"
    | "CREDITOS"
    | "CLIENTES"
    | "PRODUTOS"
    | "VENDEDORES"
    | "FORNECEDORES"
  >("POS");
  const [openFilter, setOpenFilter] = useState("ORCAMENTO");
  const [openSearches, setOpenSearches] = useState<Record<string, string>>({});
  const [cart, setCart] = useState<CartLine[]>([]);
  const [seller, setSeller] = useState("");
  const [customer, setCustomer] = useState("");
  const [saleType, setSaleType] = useState("VENDA");
  const [bankAccounts, setBankAccounts] = useState<SalesReceivingAccount[]>([]);
  const [bankAccountId, setBankAccountId] = useState("");
  const [installments, setInstallments] = useState(1);
  const [orderVersion, setOrderVersion] = useState<number | undefined>();
  const requestIdRef = useRef<string | null>(null);
  const savingRef = useRef(false);
  const [payment, setPayment] = useState<PayMethod>("DINHEIRO");
  const [cashTender, setCashTender] = useState("");
  const [creatingCashAccount, setCreatingCashAccount] = useState(false);
  const [search, setSearch] = useState("");
  const [quantity, setQuantity] = useState("1,00");
  const [unitPrice, setUnitPrice] = useState("");
  const [discountValue, setDiscountValue] = useState("0,00");
  const [discountPercent, setDiscountPercent] = useState("0,00");
  const [additionValue, setAdditionValue] = useState("0,00");
  const [additionPercent, setAdditionPercent] = useState("0,00");
  const [paymentParts, setPaymentParts] = useState({
    DINHEIRO: "0,00",
    PIX: "0,00",
    DEBITO: "0,00",
    CREDITO: "0,00",
    CREDIARIO: "0,00",
    SALDO_CLIENTE: "0,00",
  });
  const [notes, setNotes] = useState("");
  const [productName, setProductName] = useState("");
  const [productCode, setProductCode] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [productBrand, setProductBrand] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [receivingAccountsError, setReceivingAccountsError] = useState("");
  const [loadingReceivingAccounts, setLoadingReceivingAccounts] = useState(false);
  const loadReceivingAccounts = useCallback(async () => {
    setLoadingReceivingAccounts(true);
    try {
      setBankAccounts(await getSalesReceivingAccounts());
      setReceivingAccountsError("");
    } catch (cause) {
      setReceivingAccountsError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível carregar as contas de recebimento.",
      );
    } finally {
      setLoadingReceivingAccounts(false);
    }
  }, []);
  const searchRef = useRef<HTMLInputElement>(null);
  const discountRef = useRef<HTMLInputElement>(null);
  const additionRef = useRef<HTMLInputElement>(null);
  const paymentRef = useRef<HTMLDivElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, o] = await Promise.all([getSalesProducts(), getSalesOrders()]);
      setProducts(p);
      setOrders(o);
      setError("");
      try {
        const [salesSellers, salesCustomers] = await Promise.all([
          getSalesSellers(),
          getSalesCustomers(),
        ]);
        setRegisteredSellers(salesSellers);
        setRegisteredCustomers(salesCustomers);
        setSeller((current) =>
          current && salesSellers.some((item) => item.id === current)
            ? current
            : salesSellers.length === 1
              ? salesSellers[0].id
              : "",
        );
        setCustomer((current) =>
          current && salesCustomers.some((item) => item.id === current)
            ? current
            : salesCustomers.find((item) => item.systemKey === "CONSUMIDOR_FINAL")?.id || "",
        );
      } catch {
        setRegisteredSellers([]);
        setRegisteredCustomers([]);
        setSeller("");
        setCustomer("");
        setError(
          "Não foi possível carregar clientes e vendedores. Atualize a tela para tentar novamente.",
        );
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível carregar os dados de vendas.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
    void loadReceivingAccounts();
  }, [load, loadReceivingAccounts]);
  useEffect(() => {
    const requestedView = searchParams.get("view");
    const requestedType = searchParams.get("tipo");
    if (
      [
        "POS",
        "ABRIR",
        "ESTORNOS",
        "RELATORIOS",
        "CAIXA",
        "CREDITOS",
        "CLIENTES",
        "PRODUTOS",
        "VENDEDORES",
        "FORNECEDORES",
      ].includes(requestedView || "")
    ) {
      setMessage("");
      setError("");
      setActiveView(requestedView as typeof activeView);
      if (requestedView === "CLIENTES") setCustomerPickerMode(false);
      if (requestedView === "ABRIR")
        setOpenFilter(
          openOrderOptions.some((option) => option.value === requestedType)
            ? requestedType!
            : "ORCAMENTO",
        );
      setCatalogOpen(false);
      if (requestedView === "POS" || requestedView === "CAIXA") {
        void getSalesProducts()
          .then(setProducts)
          .catch((cause) => setError(cause instanceof Error ? cause.message : "Falha ao atualizar produtos."));
        void loadReceivingAccounts();
      }
      if (
        requestedView &&
        ["VENDEDORES", "CLIENTES", "POS", "CAIXA"].includes(requestedView)
      ) {
        void Promise.all([getSalesSellers(), getSalesCustomers()])
          .then(([salesSellers, salesCustomers]) => {
            setRegisteredSellers(salesSellers);
            setRegisteredCustomers(salesCustomers);
          })
          .catch(() => {
            setRegisteredSellers([]);
            setRegisteredCustomers([]);
          });
      }
      if (requestedView === "POS" && requestedType === "TROCA") {
        clearSale();
        setSaleType("TROCA");
      } else if (requestedView === "POS") clearSale();
      else if (requestedView === "CAIXA") setSaleType("VENDA");
    } else if (!requestedView) {
      setActiveView("POS");
      setCatalogOpen(false);
    }
  }, [searchParams, loadReceivingAccounts]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return term
      ? products.filter(
          (item) =>
            item.active && !item.isGridParent &&
            item.showInSale &&
            `${item.name} ${item.sku || ""} ${item.reference || ""} ${item.barcode || ""} ${(item.variants || []).map((variant) => variant.barcode || "").join(" ")}`
              .toLocaleLowerCase("pt-BR")
              .includes(term),
        )
      : [];
  }, [products, search]);
  const subtotal =
    cart.reduce(
      (sum, row) =>
        sum + Math.round((row.unitPrice * row.quantity + Number.EPSILON) * 100),
      0,
    ) / 100;
  const discount = parseMoney(discountValue);
  const addition = parseMoney(additionValue);
  const total = Math.max(
    0,
    Math.round((subtotal - discount + addition) * 100) / 100,
  );
  const itemCount = cart.reduce((count, row) => count + row.quantity, 0);
  const editingOrder = orders.find((order) => order.id === currentEditOrderId);
  const selectedCustomer = registeredCustomers.find(
    (item) => item.id === customer,
  );
  useEffect(() => {
    let current = true;
    setCustomerCreditBalance("0");
    if (!customer) {
      setCustomerCreditBalance("0");
      return;
    }
    void getSalesCustomerCredit(customer)
      .then((result) => {
        if (current) setCustomerCreditBalance(result.balance);
      })
      .catch(() => {
        if (current) setCustomerCreditBalance("0");
      });
    return () => {
      current = false;
    };
  }, [customer, orders]);
  useEffect(() => {
    setCashTender("");
  }, [payment, total, paymentParts.DINHEIRO, customer]);
  useEffect(() => {
    if (bankAccounts.some((account) => account.id === bankAccountId)) return;
    const candidates =
      payment === "DINHEIRO"
        ? bankAccounts.filter((account) => account.type === "CASH")
        : bankAccounts;
    setBankAccountId(candidates.length === 1 ? candidates[0].id : "");
  }, [payment, bankAccounts, bankAccountId]);
  const finalConsumerSelected = Boolean(selectedCustomer?.isSystem);
  function openCustomerPicker() {
    setCustomerPickerMode(true);
    setMessage("");
    setError("");
  }
  function selectSaleCustomer(selected: SalesCustomer) {
    if (saleType === "CONDICIONAL" && selected.isSystem) {
      setError("Selecione um cliente identificado para o condicional. CONSUMIDOR FINAL não é permitido.");
      return;
    }
    setRegisteredCustomers((current) => [
      ...current.filter((item) => item.id !== selected.id),
      selected,
    ]);
    setCustomer(selected.id);
    if (selected.referenceOnly) {
      if (payment === "CREDIARIO") setPayment("DINHEIRO");
      setPaymentParts((current) => ({ ...current, CREDIARIO: "0,00" }));
    }
    setCustomerPickerMode(false);
    setActiveView("POS");
    if (selected.isSystem && payment === "CREDIARIO") setPayment("DINHEIRO");
    if (selected.isSystem)
      setPaymentParts((current) => ({
        ...current,
        CREDIARIO: "0,00",
        SALDO_CLIENTE: "0,00",
      }));
  }
  const saleNumber = String(
    editingOrder?.number ?? (orders[0]?.number ?? 0) + 1,
  );
  const today = new Intl.DateTimeFormat("pt-BR").format(new Date());
  const openSearch = openSearches[openFilter] || "";
  const normalizeOpenSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim().replace(/\s+/g, " ");
  const openSearchTerm = normalizeOpenSearch(openSearch).replace(/^#\s*/, "");
  const visibleOpenOrders = orders.filter((order) => {
    if (openSearchTerm && ![String(order.number), order.customerName, order.sellerName].some((value) => normalizeOpenSearch(value).includes(openSearchTerm))) return false;
    if (openFilter === "GRAVADAS") return ["VENDA", "TROCA"].includes(order.saleType) && order.status !== "EM_ANDAMENTO";
    if (order.status === "ESTORNADA" || order.status === "CANCELADA")
      return false;
    if (openFilter === "ORCAMENTO" || openFilter === "CONDICIONAL")
      return order.saleType === openFilter;
    if (openFilter === "ATIVAS") return order.status === "EM_ANDAMENTO";
    return (
      order.status === "CONCLUIDA" &&
      ["VENDA", "TROCA"].includes(order.saleType)
    );
  });

  function parseMoney(value: string) {
    const trimmed = value.trim().replace(/\s/g, "");
    if (!trimmed) return 0;
    const comma = trimmed.lastIndexOf(",");
    const dot = trimmed.lastIndexOf(".");
    const normalized =
      comma >= 0 && dot >= 0
        ? comma > dot
          ? trimmed.replace(/\./g, "").replace(",", ".")
          : trimmed.replace(/,/g, "")
        : trimmed.replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  function formatMoney(value: number) {
    return value.toFixed(2).replace(".", ",");
  }
  function getProductSalePrice(product: SalesProduct, variantId?: string) {
    const variant = product.variants?.find((item) => item.id === variantId);
    if (!product.inheritGridPrice && variant?.price != null)
      return Number(variant.price);
    const regular = Number(product.price);
    const promotional = Number(product.promotionalPrice);
    return promotional > 0 && promotional <= regular ? promotional : regular;
  }
  function recalculatePercent(
    value: number,
    base: number,
    setter: (next: string) => void,
  ) {
    setter(base > 0 ? formatMoney((value / base) * 100) : "0,00");
  }
  function recalculateValue(
    value: number,
    base: number,
    setter: (next: string) => void,
  ) {
    setter(formatMoney((base * value) / 100));
  }

  function addProduct(product: SalesProduct, variantId?: string) {
    if (product.isGridParent) {
      setError("Selecione o cadastro independente do tamanho/cor. A matriz da grade não é vendida diretamente.");
      return;
    }
    setProductPickerOpen(false);
    if (product.variants?.length && !variantId) {
      setVariantPickerProduct(product);
      return;
    }
    setVariantPickerProduct(null);
    const amount = parseMoney(quantity);
    const enteredPrice = unitPrice.trim()
      ? parseMoney(unitPrice)
      : getProductSalePrice(product, variantId);
    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isFinite(enteredPrice) ||
      enteredPrice < 0
    ) {
      setError("Informe uma quantidade maior que zero e um preço válido.");
      return;
    }
    setCart((current) => {
      const found = current.find(
        (line) =>
          line.product.id === product.id && line.variantId === variantId,
      );
      return found
        ? current.map((line) =>
            line.product.id === product.id && line.variantId === variantId
              ? {
                  ...line,
                  quantity: line.quantity + amount,
                  unitPrice: enteredPrice,
                }
              : line,
          )
        : [
            ...current,
            { product, variantId, quantity: amount, unitPrice: enteredPrice },
          ];
    });
    setSearch("");
    setUnitPrice("");
    setQuantity("1,00");
    setError("");
    requestAnimationFrame(() => searchRef.current?.focus());
  }

  function handleProductKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const term = search.trim().toLocaleLowerCase("pt-BR");
    const exact = products.find(
      (product) =>
        product.active && !product.isGridParent &&
        product.showInSale &&
        [product.sku, product.barcode, product.reference].some(
          (code) => code?.toLocaleLowerCase("pt-BR") === term,
        ),
    );
    const match =
      exact ||
      (filteredProducts.length === 1 ? filteredProducts[0] : undefined);
    const variantMatch = products
      .filter((product) => !product.isGridParent)
      .flatMap((product) =>
        (product.variants || []).map((variant) => ({ product, variant })),
      )
      .find(
        ({ variant }) => variant.barcode?.toLocaleLowerCase("pt-BR") === term,
      );
    if (variantMatch) addProduct(variantMatch.product, variantMatch.variant.id);
    else if (match) addProduct(match);
  }

  function setQuantityInCart(lineKey: string, value: string) {
    const amount = parseMoney(value);
    if (!Number.isFinite(amount) || amount <= 0) return;
    setCart((current) =>
      current.map((line) =>
        cartLineKey(line) === lineKey ? { ...line, quantity: amount } : line,
      ),
    );
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    if (!productCategory.trim() || !productBrand.trim()) {
      setError("Informe a categoria e a marca do produto.");
      setSaving(false);
      return;
    }
    try {
      await createSalesProduct({
        name: productName.trim(),
        sku: productCode.trim() || undefined,
        price: parseMoney(productPrice),
        category: productCategory.trim().toLocaleUpperCase("pt-BR"),
        brand: productBrand.trim().toLocaleUpperCase("pt-BR"),
      });
      setProductName("");
      setProductCode("");
      setProductPrice("");
      setProductCategory("");
      setProductBrand("");
      setMessage("Produto cadastrado no catálogo.");
      await load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível cadastrar o produto.",
      );
    } finally {
      setSaving(false);
    }
  }

  function requestFinalizeSale() {
    if (savingRef.current || saving) return;
    setError("");
    if (saleType === "CONDICIONAL" && (!selectedCustomer || finalConsumerSelected)) {
      setError("Selecione um cliente identificado para o condicional. CONSUMIDOR FINAL não é permitido.");
      return;
    }
    if (saleType === "TROCA") {
      setReturnModalOpen(true);
      return;
    }
    const amounts = paymentBreakdown(payment, paymentParts, total).amounts;
    if (["VENDA", "TROCA"].includes(saleType) && amounts.CREDIARIO > 0 && selectedCustomer?.referenceOnly) {
      setError("Vendas a prazo exigem cadastro completo. Cliente apenas referência não pode comprar a prazo.");
      return;
    }
    if (saleType === "VENDA") {
      const missing = (["DEBITO", "CREDITO"] as const).find(
        (method) =>
          amounts[method] > 0 &&
          !cardPayments.some(
            (card) =>
              card.method ===
                (method === "DEBITO" ? "CARTAO_DEBITO" : "CARTAO_CREDITO") &&
              Math.round(card.amount * 100) ===
                Math.round(amounts[method] * 100),
          ),
      );
      if (missing) {
        setCardModal(missing);
        return;
      }
    }
    setSaveConfirmOpen(true);
  }

  async function saveSale(
    status: "EM_ANDAMENTO" | "CONCLUIDA" = "CONCLUIDA",
    exchange?: SalesReturnDecision,
  ) {
    if (savingRef.current || saving) return;
    if (!registeredSellers.some((item) => item.id === seller)) {
      setError("Selecione um vendedor cadastrado.");
      return;
    }
    if (saleType === "TROCA" && !exchange) {
      setError("");
      setReturnModalOpen(true);
      return;
    }
    const saleCustomer = exchange?.customer ?? selectedCustomer;
    if (["VENDA", "TROCA"].includes(saleType) && saleCustomer?.referenceOnly && (payment === "CREDIARIO" || (payment === "MISTO" && parseMoney(paymentParts.CREDIARIO) > 0))) {
      setError("Vendas a prazo exigem cadastro completo. Cliente apenas referência não pode comprar a prazo.");
      return;
    }
    if (saleType === "CONDICIONAL" && (!saleCustomer || saleCustomer.isSystem)) {
      setError("Selecione um cliente identificado para o condicional. CONSUMIDOR FINAL não é permitido.");
      return;
    }
    if (status === "CONCLUIDA" && saleType === "VENDA") {
      const paymentError = validateSalePayment({
        method: payment,
        parts: paymentParts,
        total,
        accountId: bankAccountId,
        accounts: bankAccounts,
        customer: saleCustomer,
        creditBalance: Number(customerCreditBalance),
        installments,
        tender: cashTender,
      });
      if (paymentError) {
        setError(paymentError);
        return;
      }
    }
    if (
      status === "CONCLUIDA" &&
      saleType === "VENDA" &&
      payment !== "CREDIARIO" &&
      payment !== "SALDO_CLIENTE" &&
      (payment !== "MISTO" ||
        total >
          parseMoney(paymentParts.CREDIARIO) +
            parseMoney(paymentParts.SALDO_CLIENTE)) &&
      total > 0 &&
      !bankAccountId
    ) {
      setError("Selecione a conta ou caixa de recebimento.");
      return;
    }

    if (!saleCustomer) {
      setError("Selecione um cliente cadastrado.");
      return;
    }
    if (
      saleType === "VENDA" &&
      finalConsumerSelected &&
      (payment === "CREDIARIO" ||
        (payment === "MISTO" && parseMoney(paymentParts.CREDIARIO) > 0))
    ) {
      setError("CONSUMIDOR FINAL não pode ser usado em vendas a prazo.");
      return;
    }
    if (!cart.length && saleType !== "TROCA") {
      setError("Adicione pelo menos um produto à venda.");
      return;
    }
    if (
      ![
        discount,
        addition,
        ...cart.flatMap((line) => [line.quantity, line.unitPrice]),
      ].every(Number.isFinite) ||
      discount < 0 ||
      addition < 0 ||
      cart.some((line) => line.quantity <= 0 || line.unitPrice < 0)
    ) {
      setError("Confira quantidades, preços, desconto e acréscimo.");
      return;
    }
    if (discount > subtotal) {
      setError("O desconto não pode ser maior que o subtotal.");
      return;
    }
    if (
      status === "CONCLUIDA" &&
      saleType === "VENDA" &&
      payment === "MISTO" &&
      Object.values(paymentParts).some(
        (value) => !Number.isFinite(parseMoney(value)) || parseMoney(value) < 0,
      )
    ) {
      setError("Informe valores válidos e não negativos no pagamento misto.");
      return;
    }
    const mixedTotal = Object.values(paymentParts).reduce(
      (sum, value) => sum + parseMoney(value),
      0,
    );
    if (
      status === "CONCLUIDA" &&
      saleType === "VENDA" &&
      payment === "MISTO" &&
      Math.abs(mixedTotal - total) > 0.01
    ) {
      setError(
        "No pagamento misto, a soma das formas de pagamento deve ser igual ao total.",
      );
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      requestIdRef.current ??= crypto.randomUUID();
      const orderData: SaveSalesOrderInput = {
        cardPayments:
          exchange?.cardPayments ??
          (saleType === "VENDA"
            ? cardPayments
                .filter((card) => {
                  const amount = paymentBreakdown(payment, paymentParts, total)
                    .amounts[
                    card.method === "CARTAO_DEBITO" ? "DEBITO" : "CREDITO"
                  ];
                  return (
                    amount > 0 &&
                    Math.round(amount * 100) === Math.round(card.amount * 100)
                  );
                })
                .map(({ administratorName, ...card }) => card)
            : undefined),
        originalOrderId: exchange?.originalOrderId,
        returnedItems: exchange?.returnedItems,
        returnDisposition: exchange?.returnDisposition,
        refundConfirmed: exchange?.refundConfirmed,
        expectedTotal: exchange?.difference,
        requestId: requestIdRef.current!,
        version: orderVersion,
        bankAccountId: exchange?.bankAccountId ?? (bankAccountId || undefined),
        installments: exchange?.installments ?? installments,
        sellerId: seller,
        customerId: saleCustomer.id,
        sellerName: registeredSellers.find((item) => item.id === seller)!.name,
        customerName: saleCustomer.name,
        saleType,
        items: cart.map((line) => ({
          productId: line.product.id,
          variantId: line.variantId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
        paymentMethod:
          exchange?.paymentMethod ??
          (payment === "DEBITO"
            ? "CARTAO_DEBITO"
            : payment === "CREDITO"
              ? "CARTAO_CREDITO"
              : payment),
        discount,
        addition,
        status,
        paymentDetails:
          exchange?.paymentDetails ??
          (payment === "MISTO"
            ? Object.fromEntries(
                Object.entries(paymentParts).map(([key, value]) => [
                  key,
                  parseMoney(value),
                ]),
              )
            : undefined),
        notes: notes.trim() || undefined,
      };
      const savedOrder =
        currentEditOrderId && !exchange
          ? await updateSalesOrder(currentEditOrderId, orderData)
          : await createSalesOrder(orderData);
      if (status === "CONCLUIDA") {
        setSaveConfirmOpen(false);
        setReceiptTender(exchange ? "" : cashTender);
        setReceiptOrder(savedOrder);
        setReceiptOpen(true);
      }
      if (status === "EM_ANDAMENTO") {
        clearSale();
      } else if (["ORCAMENTO", "PEDIDO", "CONDICIONAL"].includes(savedOrder.saleType)) {
        setCurrentEditOrderId(savedOrder.id);
        setOrderVersion(savedOrder.version);
      } else {
        setCurrentEditOrderId(null);
        setOrderVersion(undefined);
        requestIdRef.current = null;
        setCart([]);
        setCardPayments([]);
        setCashTender("");
        setNotes("");
        setDiscountValue("0,00");
        setDiscountPercent("0,00");
        setAdditionValue("0,00");
        setAdditionPercent("0,00");
      }
      if (status === "CONCLUIDA")
        setPaymentParts({
          DINHEIRO: "0,00",
          PIX: "0,00",
          DEBITO: "0,00",
          CREDITO: "0,00",
          CREDIARIO: "0,00",
          SALDO_CLIENTE: "0,00",
        });
      setMessage(
        savedOrder.saleType === "CONDICIONAL"
          ? "Condicional gravado. Estoque reservado até a devolução ou conversão em venda."
          : status === "EM_ANDAMENTO"
            ? "Venda salva em andamento. Use Abrir para retomá-la depois."
            : "Documento gravado com sucesso.",
      );
      setReturnModalOpen(false);
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível gravar a venda.",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  function clearSale() {
    requestIdRef.current = null;
    setOrderVersion(undefined);
    setCashTender("");
    setSearch("");
    setQuantity("1,00");
    setUnitPrice("");
    setCustomerCreditBalance("0");
    setProductPickerOpen(false);
    setVariantPickerProduct(null);
    setCardPayments([]);
    setInstallments(1);
    setPaymentParts({
      DINHEIRO: "0,00",
      PIX: "0,00",
      DEBITO: "0,00",
      CREDITO: "0,00",
      CREDIARIO: "0,00",
      SALDO_CLIENTE: "0,00",
    });
    setCart([]);
    setNotes("");
    setDiscountValue("0,00");
    setDiscountPercent("0,00");
    setAdditionValue("0,00");
    setAdditionPercent("0,00");
    setCurrentEditOrderId(null);
    setSeller(registeredSellers.length === 1 ? registeredSellers[0].id : "");
    setCustomer(registeredCustomers.find((item) => item.systemKey === "CONSUMIDOR_FINAL")?.id || "");
    setSaleType("VENDA");
    setPayment("DINHEIRO");
    setMessage("");
    setError("");
  }

  async function deleteCurrentSale() {
    if (savingRef.current || deletingSale) return;
    savingRef.current = true;
    setDeletingSale(true);
    setDeleteError("");
    const editingId = currentEditOrderId;
    try {
      if (editingId)
        await cancelSalesOrder(
          editingId,
          "Cancelada pelo operador no caixa de vendas.",
        );
      clearSale();
      setDeleteConfirmOpen(false);
      if (editingId) await load();
    } catch (e) {
      setDeleteError(
        e instanceof Error ? e.message : "Não foi possível excluir a venda.",
      );
    } finally {
      savingRef.current = false;
      setDeletingSale(false);
    }
  }

  async function openOrder(selected: SalesOrder) {
    if (cart.length && currentEditOrderId !== selected.id && !window.confirm("Substituir o atendimento atual? Os itens ainda não gravados serão descartados.")) return;
    let order: SalesOrder;
    try { order = await getSalesOrderDetails(selected.id); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível recuperar a venda."); return; }
    if (["ESTORNADA", "CANCELADA"].includes(order.status)) { setDetailsOrder(order); return; }
    setOrders((current) => current.some((item) => item.id === order.id) ? current.map((item) => item.id === order.id ? order : item) : [...current, order]);
    const orderItems = Array.isArray(order.items) ? order.items : [];
    setCart(
      orderItems.map((item) => {
        const product = products.find(
          (candidate) => candidate.id === item.productId,
        ) || {
          id: item.productId,
          name: item.name,
          sku: item.sku,
          price: item.unitPrice,
          purchaseCost: 0,
          additionalCost: 0,
          markupMultiplier: 0,
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
          manageStock: false,
          variations: null,
          inheritGridPrice: true,
          commission: 0,
          commissionEnabled: false,
          commissionType: "VENDEDOR",
          commissionRule: "PADRAO",
          supplierName: null,
          active: true,
        };
        return {
          product,
          variantId: item.variantId || undefined,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        };
      }),
    );
    setCashTender("");
    setCardPayments(order.cardPayments || []);
    setOrderVersion(order.version);
    setBankAccountId(order.bankAccountId || "");
    setInstallments(order.installments ?? 1);
    setCurrentEditOrderId(order.id);
    setSeller(
      order.sellerId || "",
    );
    setCustomer(
      order.customerId ||
        registeredCustomers.find((item) => item.name === order.customerName)
          ?.id ||
        "",
    );
    setSaleType(order.saleType);
    setNotes(order.notes || "");
    setDiscountValue(formatMoney(Number(order.discount)));
    setAdditionValue(formatMoney(Number(order.addition)));
    recalculatePercent(
      Number(order.discount),
      Number(order.subtotal),
      setDiscountPercent,
    );
    recalculatePercent(
      Number(order.addition),
      Number(order.subtotal),
      setAdditionPercent,
    );
    setPayment(
      order.paymentMethod === "CARTAO_DEBITO"
        ? "DEBITO"
        : order.paymentMethod === "CARTAO_CREDITO"
          ? "CREDITO"
          : (order.paymentMethod as PayMethod),
    );
    setPaymentParts({
      DINHEIRO: formatMoney(Number(order.paymentDetails?.DINHEIRO ?? 0)),
      PIX: formatMoney(Number(order.paymentDetails?.PIX ?? 0)),
      DEBITO: formatMoney(
        Number(
          order.paymentDetails?.CARTAO_DEBITO ??
            order.paymentDetails?.DEBITO ??
            0,
        ),
      ),
      CREDITO: formatMoney(
        Number(
          order.paymentDetails?.CARTAO_CREDITO ??
            order.paymentDetails?.CREDITO ??
            0,
        ),
      ),
      CREDIARIO: formatMoney(Number(order.paymentDetails?.CREDIARIO ?? 0)),
      SALDO_CLIENTE: formatMoney(
        Number(order.paymentDetails?.SALDO_CLIENTE ?? 0),
      ),
    });
    setActiveView("POS");
    setMessage(`Venda #${order.number} aberta para continuar.${!registeredSellers.some((item) => item.id === order.sellerId) || !registeredCustomers.some((item) => item.id === order.customerId) ? " Há cadastro inativo ou indisponível. Selecione cliente e vendedor ativos antes de gravar." : ""}`);
    setError("");
  }

  async function deleteProduct(product: SalesProduct) {
    if (
      !window.confirm(
        `EXCLUIR ${product.name}? Produtos com movimentacao em vendas nao podem ser excluidos.`,
      )
    )
      return;
    try {
      await deleteSalesProduct(product.id);
      setCart((current) =>
        current.filter((line) => line.product.id !== product.id),
      );
      await load();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "NAO FOI POSSIVEL EXCLUIR O PRODUTO.",
      );
    }
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        activeView !== "POS" ||
        deleteConfirmOpen ||
        saveConfirmOpen ||
        receiptOpen ||
        returnModalOpen ||
        cardModal
      )
        return;
      if (event.key === "F3") {
        event.preventDefault();
        if (!customerPickerMode && !variantPickerProduct)
          searchRef.current?.focus();
      }
      if (
        productPickerOpen ||
        variantPickerProduct ||
        customerPickerMode ||
        deleteConfirmOpen
      )
        return;
      if (event.key === "F9") {
        event.preventDefault();
        requestFinalizeSale();
      }
      if (event.key === "F2") {
        event.preventDefault();
        setActiveView("ABRIR");
      }
      if (event.key === "F4") {
        event.preventDefault();
        openCustomerPicker();
      }
      if (event.key === "F5") { event.preventDefault(); discountRef.current?.focus(); }
      if (event.key === "F6") { event.preventDefault(); additionRef.current?.focus(); }
      if (event.key === "F8") { event.preventDefault(); paymentRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus(); }
      if (event.key === "Escape") setSearch("");
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const posGridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (activeView !== "POS") return;
    const grid = posGridRef.current;
    if (!grid) return;
    const resize = () => {
      grid.style.setProperty("--pos-height", `${Math.max(360, window.innerHeight - grid.getBoundingClientRect().top - 60)}px`);
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (grid.parentElement) observer.observe(grid.parentElement);
    window.addEventListener("resize", resize);
    return () => { observer.disconnect(); window.removeEventListener("resize", resize); };
  }, [activeView, error, message, receivingAccountsError, customerPickerMode]);

  return (
    <div className="min-w-0 space-y-4">
      <div className={activeView === "POS" ? posStyles.surface : "space-y-4"}>
        {activeView === "POS" && !customerPickerMode && (
          <header className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--primary-color)] text-[var(--primary-color)]"><ShoppingCart className="h-5 w-5" /></span>
            <h1 className="text-3xl font-black uppercase tracking-tight text-slate-950 dark:text-white">Venda</h1>
          </header>
        )}
        {["ABRIR", "ESTORNOS", "RELATORIOS"].includes(activeView) && !customerPickerMode && (
          <SalesPageHeader
            title={activeView === "ABRIR" ? "Abrir vendas" : activeView === "ESTORNOS" ? "Estornos" : activeView === "RELATORIOS" ? "Relatórios de vendas" : saleType === "TROCA" ? "Troca de venda" : "Nova venda"}
            description={activeView === "ABRIR" ? "Consulte orçamentos, condicionais e vendas para continuar o atendimento." : activeView === "ESTORNOS" ? "Estorne vendas, condicionais, orçamentos e pedidos, preservando o histórico das movimentações." : activeView === "RELATORIOS" ? "Acompanhe as vendas, os recebimentos e as comissões da loja." : "Registre os produtos, confira os valores e finalize o atendimento."}
            icon={activeView === "ABRIR" ? Clock3 : activeView === "ESTORNOS" ? RotateCcw : activeView === "RELATORIOS" ? ChartNoAxesCombined : ShoppingCart}
          />
        )}
        {receivingAccountsError && ["POS", "CAIXA"].includes(activeView) && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div>
              <p className="font-bold">Não foi possível carregar as contas de recebimento.</p>
              <p className="mt-1 text-xs">{receivingAccountsError}</p>
            </div>
            <button type="button" disabled={loadingReceivingAccounts} onClick={() => {
              setError("");
              void loadReceivingAccounts();
              void getSalesProducts().then(setProducts).catch(cause => setError(cause instanceof Error ? cause.message : "Falha ao atualizar produtos."));
            }} className="shrink-0 rounded-xl border border-red-300 px-3 py-2 text-xs font-bold hover:bg-red-100 disabled:opacity-50">
              {loadingReceivingAccounts ? "Carregando…" : "Tentar novamente"}
            </button>
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700"
          >
            {error}
          </div>
        )}
        {message && (
          <div
            role="status"
            className="rounded-xl border border-[color-mix(in_srgb,var(--primary-color)_25%,white)] bg-[var(--primary-bg-light)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-color)]"
          >
            {message}
          </div>
        )}

        {activeView === "CREDITOS" ? (
          <CustomerCreditsPanel />
        ) : activeView === "CAIXA" ? (
          <SalesCashPanel />
        ) : activeView === "POS" ? (
          <>
          <div ref={posGridRef} className={posStyles.grid}>
            <div className={posStyles.left}>
              <section className={`${posStyles.metadata} rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm`}>
                <label className="space-y-1">
                  <span className="text-xs font-black uppercase text-slate-600 dark:text-slate-300">
                    Vendedor *
                  </span>
                  <select
                    required
                    className={field}
                    value={seller}
                    onChange={(event) => setSeller(event.target.value)}
                  >
                    <option value="">Selecione vendedor cadastrado</option>
                    {seller && !registeredSellers.some((item) => item.id === seller) && <option value={seller} disabled>{editingOrder?.sellerName || seller} (indisponível)</option>}
                    {registeredSellers.map((registeredSeller) => (
                      <option
                        key={registeredSeller.id}
                        value={registeredSeller.id}
                      >
                        {registeredSeller.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="space-y-1">
                  <span className="block text-xs font-black uppercase text-slate-600 dark:text-slate-300">
                    Cliente *
                  </span>
                  <button
                    type="button"
                    onClick={openCustomerPicker}
                    aria-haspopup="dialog"
                    aria-label="Abrir seleção de clientes"
                    className={`${field} flex items-center justify-between gap-2 text-left`}
                  >
                    <span
                      className={
                        selectedCustomer
                          ? "truncate"
                          : "truncate text-slate-400"
                      }
                    >
                      {selectedCustomer?.name ||
                        (customer && editingOrder?.customerId === customer ? `${editingOrder.customerName} (indisponível)` : "") ||
                        "Selecione um cliente cadastrado"}
                    </span>
                    <Search className="h-4 w-4 shrink-0 text-[var(--primary-color)]" />
                  </button>
                </div>
                <label className="space-y-1">
                  <span className="text-xs font-black uppercase text-slate-600 dark:text-slate-300">
                    Tipo
                  </span>
                  <select
                    className={field}
                    value={saleType}
                    onChange={(event) => {
                      if (event.target.value === "TROCA") clearSale();
                      if (event.target.value === "CONDICIONAL" && finalConsumerSelected) setCustomer("");
                      setSaleType(event.target.value);
                    }}
                  >
                    {saleTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="space-y-1">
                  <span className="text-xs font-black uppercase text-slate-600 dark:text-slate-300">
                    Data
                  </span>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm">
                    {today}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-black uppercase text-slate-600 dark:text-slate-300">
                    Nº venda
                  </span>
                  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm">
                    {saleNumber}
                  </div>
                </div>
              </section>

              <section className={`${posStyles.items} rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm`}>
                <div className={posStyles.toolbar}>
                  <label className="relative space-y-1">
                    <span className="text-xs font-black uppercase text-slate-600 dark:text-slate-300">
                      Produto (F3)
                    </span>
                    <input
                      ref={searchRef}
                      aria-label="Produto: digite o código"
                      className={`${field} pr-9`}
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      onKeyDown={handleProductKeyDown}
                      placeholder="Digite o código ou código de barras exato (ENTER)..."
                    />
                    <button
                      type="button"
                      onClick={() => setProductPickerOpen(true)}
                      aria-label="Pesquisar produtos cadastrados"
                      className="absolute right-1 top-[26px] rounded p-2 text-[var(--primary-color)]"
                    >
                      <Search className="h-4 w-4" />
                    </button>
                    {search && filteredProducts.length > 0 && (
                      <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl">
                        {filteredProducts.slice(0, 8).map((product) => (
                          <button
                            type="button"
                            key={product.id}
                            onClick={() => addProduct(product)}
                            className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left last:border-0 hover:bg-[var(--primary-bg-light)]"
                          >
                            <span>
                              <strong className="block text-sm">
                                {product.name}
                              </strong>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {[
                                  product.sku,
                                  product.reference,
                                  product.barcode,
                                  product.supplierName,
                                ]
                                  .filter(Boolean)
                                  .join(" · ") || "Sem código ou fornecedor"}
                              </span>
                            </span>
                            <strong className="text-sm text-[var(--primary-color)]">
                              {money(getProductSalePrice(product))}
                            </strong>
                          </button>
                        ))}
                      </div>
                    )}
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-black uppercase text-slate-600 dark:text-slate-300">
                      Qtd.
                    </span>
                    <input
                      ref={quantityRef}
                      className={`${field} text-right`}
                      value={quantity}
                      onChange={(event) => setQuantity(event.target.value)}
                      onFocus={(event) => event.currentTarget.select()}
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs font-black uppercase text-slate-600 dark:text-slate-300">
                      Vlr. unit.
                    </span>
                    <input
                      className={`${field} text-right`}
                      value={unitPrice}
                      onChange={(event) => setUnitPrice(event.target.value)}
                      placeholder="Automático"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const term = search.trim().toLocaleLowerCase("pt-BR");
                      const match = filteredProducts[0];
                      const variantMatch = products
                        .filter((product) => !product.isGridParent)
                        .flatMap((product) =>
                          (product.variants || []).map((variant) => ({
                            product,
                            variant,
                          })),
                        )
                        .find(
                          ({ variant }) =>
                            variant.barcode?.toLocaleLowerCase("pt-BR") ===
                            term,
                        );
                      if (variantMatch)
                        addProduct(
                          variantMatch.product,
                          variantMatch.variant.id,
                        );
                      else if (match) addProduct(match);
                      else searchRef.current?.focus();
                    }}
                    className="inline-flex h-[38px] items-center justify-center gap-2 rounded-xl bg-[var(--primary-color)] px-5 text-xs font-extrabold text-white shadow-sm hover:bg-[var(--primary-hover)] shadow-lg shadow-[var(--primary-bg-light)] transition active:scale-95"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </button>
                </div>
                {cart.some((line) => {
                  if (!line.product.manageStock) return false;
                  const variant = line.product.variants?.find((item) => item.id === line.variantId);
                  const productQuantity = cart.filter((item) => item.product.id === line.product.id).reduce((sum, item) => sum + item.quantity, 0);
                  return productQuantity > Number(line.product.stock) - Number(line.product.reservedStock || 0) ||
                    Boolean(variant && line.quantity > Number(variant.stock) - Number(variant.reservedStock || 0));
                }) && (
                  <p role="alert" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                    Atenção: há produtos com estoque disponível insuficiente, zero ou negativo.{" "}
                    {saleType === "CONDICIONAL"
                      ? "O condicional pode ser gravado e a reserva poderá deixar o saldo disponível negativo."
                      : "A venda pode continuar e o saldo poderá ficar negativo."}
                  </p>
                )}
                <div className={posStyles.table}>
                  <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                    <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
                      <tr>
                        <th className="border-b px-2 py-2">Código</th>
                        <th className="border-b px-2 py-2">Produto</th>
                        <th className="border-b px-2 py-2">Qtd.</th>
                        <th className="border-b px-2 py-2">Un</th>
                        <th className="border-b px-2 py-2">Vlr. unit.</th>
                        <th className="border-b px-2 py-2">Total</th>
                        <th className="border-b px-2 py-2">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((line) => (
                        <tr
                          key={cartLineKey(line)}
                          className={`border-b last:border-0 ${line === cart[cart.length - 1] ? posStyles.currentLine : ""}`}
                        >
                          <td className="px-2 py-2 text-xs text-slate-500 dark:text-slate-400">
                            {line.product.sku ||
                              line.product.reference ||
                              line.product.barcode ||
                              "—"}
                          </td>
                          <td className="px-2 py-2 font-semibold" title={[line.product.name, `Estoque: ${line.product.stock}`, line.product.supplierName].filter(Boolean).join(" - ")}>
                            <span className="flex items-center gap-2"><ProductPhoto src={line.product.photoUrl} name={line.product.name}/>{line.product.name}</span>
                            {Boolean(line.product.variants?.length) && (
                              <select
                                aria-label={`Tamanho/cor de ${line.product.name}`}
                                className="mt-1 rounded border p-1 text-xs"
                                value={line.variantId || ""}
                                onChange={(event) => {
                                  const variantId = event.target.value;
                                  if (!variantId) return;
                                  setCart((current) =>
                                    current
                                      .map((item) =>
                                        cartLineKey(item) === cartLineKey(line)
                                          ? {
                                              ...item,
                                              variantId,
                                              unitPrice: getProductSalePrice(
                                                item.product,
                                                variantId,
                                              ),
                                            }
                                          : item,
                                      )
                                      .reduce<CartLine[]>((merged, item) => {
                                        const found = merged.find(
                                          (candidate) =>
                                            cartLineKey(candidate) ===
                                            cartLineKey(item),
                                        );
                                        if (found)
                                          found.quantity += item.quantity;
                                        else merged.push({ ...item });
                                        return merged;
                                      }, []),
                                  );
                                }}
                              >
                                <option value="">Selecione tamanho/cor</option>
                                {line.product.variants?.map((variant) => (
                                  <option key={variant.id} value={variant.id}>
                                    {variant.name}
                                  </option>
                                ))}
                              </select>
                            )}
                            {Number(line.product.reservedStock ?? 0) > 0 && (
                              <small className="block text-xs text-amber-700">
                                Em condicional:{" "}
                                {Number(
                                  line.product.reservedStock,
                                ).toLocaleString("pt-BR")}{" "}
                                · Disponível:{" "}
                                {Number(line.product.stock) -
                                  Number(line.product.reservedStock)}
                              </small>
                            )}
                            {line.product.supplierName && (
                              <small className="block text-xs font-normal text-slate-500 dark:text-slate-400">
                                Fornecedor: {line.product.supplierName}
                              </small>
                            )}
                          </td>
                          <td className="w-24 px-2 py-2">
                            <input
                              className={`${field} px-2 py-1 text-right`}
                              value={line.quantity.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 3,
                              })}
                              onChange={(event) =>
                                setQuantityInCart(
                                  cartLineKey(line),
                                  event.target.value,
                                )
                              }
                            />
                          </td>
                          <td className="px-2 py-2 text-slate-500 dark:text-slate-400">
                            {line.product.unit}
                          </td>
                          <td className="w-28 px-2 py-2">
                            <input
                              className={`${field} px-2 py-1 text-right`}
                              value={formatMoney(line.unitPrice)}
                              onChange={(event) => {
                                const next = parseMoney(event.target.value);
                                setCart((current) =>
                                  current.map((item) =>
                                    cartLineKey(item) === cartLineKey(line)
                                      ? { ...item, unitPrice: next }
                                      : item,
                                  ),
                                );
                              }}
                            />
                          </td>
                          <td className="px-2 py-2 font-bold">
                            {money(line.quantity * line.unitPrice)}
                          </td>
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              aria-label={`Remover ${line.product.name}`}
                              onClick={() =>
                                setCart((current) =>
                                  current.filter(
                                    (item) =>
                                      cartLineKey(item) !== cartLineKey(line),
                                  ),
                                )
                              }
                              className="rounded p-1.5 text-slate-500 dark:text-slate-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!cart.length && (
                        <tr>
                          <td colSpan={7} className="h-[250px] text-center">
                            <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
                              <ShoppingCart className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 p-2 text-slate-500 dark:text-slate-400" />
                              <strong className="text-sm">
                                Nenhum produto adicionado. Utilize a barra acima
                                para pesquisar.
                              </strong>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {saleType === "CONDICIONAL" && (
                  <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                    Ao gravar, os itens ficam reservados em condicional. No
                    retorno, retire os produtos devolvidos, altere o tipo para
                    Venda e grave o mesmo documento. Para devolver tudo, cancele
                    o condicional.
                  </p>
                )}
                <div className={`${posStyles.actions} bg-slate-50/75 dark:bg-slate-800/50`}>
                  <button
                    type="button"
                    onClick={() => void saveSale("EM_ANDAMENTO")}
                    disabled={(!cart.length && saleType !== "TROCA") || saving}
                    className="inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 disabled:opacity-50"
                  >
                    <Clock3 className="h-3.5 w-3.5" />
                    Em Andamento
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError("");
                      setDeleteConfirmOpen(true);
                    }}
                    disabled={saving || (!cart.length && !currentEditOrderId)}
                    className="inline-flex items-center gap-1.5 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 disabled:opacity-50"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Excluir Venda
                  </button>
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    disabled={!cart.length}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Excluir Itens
                  </button>
                  <input
                    className={`${field} max-w-xs py-2 text-xs`}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Obs. da Venda"
                  />
                  <span className="ml-auto text-xs font-bold text-slate-500 dark:text-slate-400">
                    Itens: {cart.length}, Qtd:{" "}
                    {itemCount.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </section>
            </div>

            <aside className={`${posStyles.aside} rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm`}>
              <div className="shrink-0 rounded-lg bg-[var(--primary-color)] px-4 py-4 text-white">
                <div className="flex items-center justify-between text-sm font-black uppercase">
                  <span>Subtotal</span>
                  <strong className="text-xl">{money(subtotal)}</strong>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <div className={posStyles.adjustment}>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Desconto
                  </span>
                  <label className="relative">
                    <span className="absolute left-2 top-2 text-xs text-slate-400">
                      R$
                    </span>
                    <input
                      className={`${field} py-2 pl-7 text-right text-xs`}
                      ref={discountRef}
                      aria-label="Desconto em reais"
                      value={discountValue}
                      onChange={(event) => {
                        setDiscountValue(event.target.value);
                        recalculatePercent(
                          parseMoney(event.target.value),
                          subtotal,
                          setDiscountPercent,
                        );
                      }}
                    />
                  </label>
                  <label className="relative">
                    <input
                      className={`${field} py-2 pr-5 text-right text-xs`}
                      value={discountPercent}
                      onChange={(event) => {
                        setDiscountPercent(event.target.value);
                        recalculateValue(
                          parseMoney(event.target.value),
                          subtotal,
                          setDiscountValue,
                        );
                      }}
                    />
                    <span className="absolute right-2 top-2 text-xs text-slate-400">
                      %
                    </span>
                  </label>
                </div>
                <div className="grid grid-cols-[1fr_92px_76px] items-center gap-1.5">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Acréscimo
                  </span>
                  <label className="relative">
                    <span className="absolute left-2 top-2 text-xs text-slate-400">
                      R$
                    </span>
                    <input
                      className={`${field} py-2 pl-7 text-right text-xs`}
                      ref={additionRef}
                      aria-label="Acréscimo em reais"
                      value={additionValue}
                      onChange={(event) => {
                        setAdditionValue(event.target.value);
                        recalculatePercent(
                          parseMoney(event.target.value),
                          subtotal,
                          setAdditionPercent,
                        );
                      }}
                    />
                  </label>
                  <label className="relative">
                    <input
                      className={`${field} py-2 pr-5 text-right text-xs`}
                      value={additionPercent}
                      onChange={(event) => {
                        setAdditionPercent(event.target.value);
                        recalculateValue(
                          parseMoney(event.target.value),
                          subtotal,
                          setAdditionValue,
                        );
                      }}
                    />
                    <span className="absolute right-2 top-2 text-xs text-slate-400">
                      %
                    </span>
                  </label>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-black uppercase text-slate-800 dark:text-slate-100">
                  Total
                </span>
                <strong className="text-2xl font-black text-[var(--primary-color)]">
                  {money(total)}
                </strong>
              </div>
              <div ref={paymentRef} className={posStyles.payment}>
              <PaymentPanel
                creatingAccount={creatingCashAccount}
                onCreateAccount={async () => {
                  if (creatingCashAccount) return;
                  setCreatingCashAccount(true);
                  setError("");
                  try {
                    const account = await prepareSalesCashAccount();
                    setBankAccounts(await getSalesReceivingAccounts());
                    setBankAccountId(account.id);
                  } catch (cause) {
                    setError(
                      cause instanceof Error
                        ? cause.message
                        : "Não foi possível criar o caixa.",
                    );
                  } finally {
                    setCreatingCashAccount(false);
                  }
                }}
                method={payment}
                cardPayments={cardPayments}
                onCardDetails={setCardModal}
                onMethod={(method) => {
                  if (method === "CREDITO" || method === "DEBITO") {
                    const cardCustomer = registeredCustomers.find((item) => item.systemKey === "CLIENTE_CARTAO");
                    if (!cardCustomer) {
                      setError("Cliente de cartão indisponível. Atualize a página e tente novamente.");
                      return;
                    }
                    selectSaleCustomer(cardCustomer);
                    setCardModal(method);
                  }
                  setPayment(method);
                }}
                parts={paymentParts}
                onParts={setPaymentParts}
                total={total}
                customer={selectedCustomer}
                creditBalance={Number(customerCreditBalance)}
                accounts={bankAccounts}
                accountId={bankAccountId}
                onAccount={setBankAccountId}
                installments={installments}
                onInstallments={setInstallments}
                tender={cashTender}
                onTender={setCashTender}
                saleType={saleType}
              />
              </div>
              <button
                type="button"
                onClick={requestFinalizeSale}
                disabled={
                  (!cart.length && saleType !== "TROCA") ||
                  saving ||
                  Boolean(
                    editingOrder?.status === "CONCLUIDA" &&
                    ["VENDA", "TROCA"].includes(editingOrder.saleType),
                  )
                }
                className={`${posStyles.save} mt-3 inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[var(--primary-color)] px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:bg-slate-400`}
              >
                <Save className="h-4 w-4" />
                {saving ? "Gravando..." : "Gravar Venda (F9)"}
              </button>
              {receiptOrder && (
                <button
                  type="button"
                  onClick={() => setReceiptOpen(true)}
                  className="mt-2 text-xs font-bold text-[var(--primary-color)]"
                >
                  Reimprimir comprovante #{receiptOrder.number}
                </button>
              )}
            </aside>
          </div>
          <nav aria-label="Atalhos da venda" className={posStyles.footer}>
            <button type="button" onClick={() => setActiveView("ABRIR")}><kbd>F2</kbd> Abrir</button>
            <button type="button" onClick={() => searchRef.current?.focus()}><kbd>F3</kbd> Produto</button>
            <button type="button" onClick={openCustomerPicker}><kbd>F4</kbd> Cliente</button>
            <button type="button" onClick={() => discountRef.current?.focus()}><kbd>F5</kbd> Desconto</button>
            <button type="button" onClick={() => additionRef.current?.focus()}><kbd>F6</kbd> Acréscimo</button>
            <button type="button" onClick={() => paymentRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus()}><kbd>F8</kbd> Forma pagto</button>
            <button type="button" onClick={requestFinalizeSale} disabled={saving}><kbd>F9</kbd> Gravar</button>
            <button type="button" onClick={() => setSearch("")}><kbd>Esc</kbd> Limpar busca</button>
            <span>Itens: {cart.length} · Venda #{saleNumber}</span>
          </nav>
          </>
        ) : activeView === "ABRIR" ? (
          <section className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
              <button type="button" onClick={() => setActiveView("RELATORIOS")} className="rounded-xl border px-4 py-2 text-sm font-bold">Relatórios</button>
              <div>
                <h2 className="text-lg font-black">
                  {
                    openOrderOptions.find(
                      (option) => option.value === openFilter,
                    )?.label
                  }
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {openFilter === "GRAVADAS" ? "Consulte o status, os detalhes e os comprovantes das vendas." : "Selecione um registro para continuar ou consultar."}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                {visibleOpenOrders.length} registro(s)
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
              <label className="relative w-full sm:max-w-md">
                <span className="sr-only">Buscar por número da venda, cliente ou vendedor</span>
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400"/>
                <input type="search" className={`${field} pl-9`} placeholder="Buscar por número, cliente ou vendedor..." value={openSearch} onChange={(event) => setOpenSearches((current) => ({ ...current, [openFilter]: event.target.value }))} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setOpenSearches((current) => ({ ...current, [openFilter]: "" })); } }}/>
              </label>
              {openSearch && <button type="button" onClick={() => setOpenSearches((current) => ({ ...current, [openFilter]: "" }))} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Limpar busca</button>}
            </div>
            <div className="divide-y">
              {visibleOpenOrders.map((order) => (
                <article
                  key={order.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3"
                >
                  <strong className="text-[var(--primary-color)]">
                    #{order.number}
                  </strong>
                  <span className="min-w-32 flex-1 font-bold">
                    {order.customerName}
                    <small className="block font-normal text-slate-500 dark:text-slate-400">
                      {new Date(order.createdAt).toLocaleString("pt-BR")} -{" "}
                      {order.status === "EM_ANDAMENTO"
                        ? "Em andamento"
                        : saleTypeOptions.find(
                            (option) => option.value === order.saleType,
                          )?.label}
                    </small>
                  </span>
                  {openFilter === "GRAVADAS" && <RecordedSaleStatus status={order.status}/>}
                  <strong>{money(order.total)}</strong>
                  {openFilter === "ATIVAS" ? <PendingSaleActions order={order} onOpen={() => void openOrder(order)} onDetails={() => setDetailsOrder(order)} onReceipt={() => { setReceiptOrder(order); setReceiptTender(""); setReceiptOpen(true); }} onDeleted={(deleted) => {
                    setOrders((current) => current.map((item) => item.id === deleted.id ? deleted : item));
                    if (currentEditOrderId === deleted.id) clearSale();
                    setError("");
                    setMessage(`Venda #${deleted.number} excluída de Em andamento.`);
                  }}/> : openFilter === "GRAVADAS" ? <RecordedSaleActions number={order.number} onDetails={() => setDetailsOrder(order)} onReceipt={() => { setReceiptOrder(order); setReceiptTender(""); setReceiptOpen(true); }}/> : <>
                  <button type="button" onClick={() => setDetailsOrder(order)} className="rounded-xl border px-3 py-2 text-xs font-bold">Detalhes / pagamentos</button>
                  <button type="button" onClick={() => { setReceiptOrder(order); setReceiptTender(""); setReceiptOpen(true); }} className="rounded-xl border px-3 py-2 text-xs font-bold">Comprovante</button>
                  <button
                    disabled={["CANCELADA", "ESTORNADA"].includes(order.status) || (order.status === "CONCLUIDA" && ["VENDA", "TROCA"].includes(order.saleType))}
                    onClick={() => openOrder(order)}
                    className="rounded-2xl bg-[var(--primary-color)] px-5 py-2 text-xs font-black text-white shadow-lg shadow-[var(--primary-bg-light)] transition hover:bg-[var(--primary-hover)] active:scale-95"
                  >
                    Abrir
                  </button>
                  </>}
                </article>
              ))}
              {visibleOpenOrders.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  {openSearchTerm ? "Nenhum registro encontrado para esta busca." : "Nenhum registro nesta categoria."}
                </p>
              )}
            </div>
          </section>
        ) : activeView === "ESTORNOS" ? (
          <><SalesReversalsPanel orders={orders} onCompleted={async (message) => { setMessage(message); setError(""); await load(); }} /><CustomerCreditsPanel key={orders.map((order) => `${order.id}:${order.version}`).join(",")} refundsOnly /></>
        ) : activeView === "RELATORIOS" ? (
          <SalesReportsPanel orders={orders} products={products} accounts={bankAccounts} />
        ) : activeView === "CLIENTES" ? (
          <SalesCustomersPanel
            selectionMode={customerPickerMode}
            requireIdentifiedCustomer={saleType === "CONDICIONAL"}
            onSelectCustomer={selectSaleCustomer}
            onCancelSelection={() => {
              setCustomerPickerMode(false);
              setActiveView("POS");
            }}
          />
        ) : activeView === "PRODUTOS" ? (
          <SalesProductsPanel
            onChanged={() => {
              void getSalesProducts()
                .then(setProducts)
                .catch((cause) =>
                  setError(
                    cause instanceof Error
                      ? cause.message
                      : "Falha ao atualizar catálogo.",
                  ),
                );
            }}
          />
        ) : activeView === "VENDEDORES" ? (
          <SalesSellersPanel />
        ) : activeView === "FORNECEDORES" ? (
          <SalesSuppliersPanel />
        ) : null}

        {catalogOpen && (
          <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-extrabold text-slate-900 dark:text-white">
                  Cadastro rápido de produtos
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Este catálogo pertence somente ao módulo Vendas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCatalogOpen(false)}
                aria-label="Fechar catálogo"
                className="rounded-xl p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
            <form
              onSubmit={(event) => void saveProduct(event)}
              className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]"
            >
              <input
                required
                maxLength={120}
                className={field}
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                placeholder="Nome do produto"
              />
              <input
                maxLength={40}
                className={field}
                value={productCode}
                onChange={(event) => setProductCode(event.target.value)}
                placeholder="Código / código de barras"
              />
              <input
                required
                type="text"
                inputMode="decimal"
                className={field}
                value={productPrice}
                onChange={(event) => setProductPrice(event.target.value)}
                placeholder="Pre?o unit?rio"
              />
              <input
                required
                className={field}
                value={productCategory}
                onChange={(event) => setProductCategory(event.target.value)}
                placeholder="Categoria"
              />
              <input
                required
                className={field}
                value={productBrand}
                onChange={(event) => setProductBrand(event.target.value)}
                placeholder="Marca"
              />
              <button
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--primary-color)] px-5 py-3 text-xs font-black text-white disabled:opacity-50 shadow-lg shadow-[var(--primary-bg-light)] transition hover:bg-[var(--primary-hover)] active:scale-95"
              >
                <Plus className="h-4 w-4" />
                Cadastrar produto
              </button>
            </form>
            <div className="mt-4 divide-y rounded-xl border border-slate-200 dark:border-slate-800">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 px-3 py-2.5"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {product.sku || "—"} · {product.name}
                  </span>
                  <strong className="text-sm">{money(product.price)}</strong>
                  <button
                    type="button"
                    title="Excluir produto"
                    onClick={() => void deleteProduct(product)}
                    className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
      {cardModal && (
        <CardPaymentModal
          key={cardModal}
          method={cardModal === "DEBITO" ? "CARTAO_DEBITO" : "CARTAO_CREDITO"}
          amount={
            paymentBreakdown(payment, paymentParts, total).amounts[cardModal]
          }
          initial={cardPayments.find(
            (card) =>
              card.method ===
              (cardModal === "DEBITO" ? "CARTAO_DEBITO" : "CARTAO_CREDITO"),
          )}
          onClose={() => setCardModal(null)}
          onSave={(card) => {
            setCardPayments((current) => [
              ...current.filter((item) => item.method !== card.method),
              card,
            ]);
            setCardModal(null);
          }}
        />
      )}
      {saveConfirmOpen && (
        <ConfirmationModal
          tone="primary"
          title="Confirmar gravação"
          description={
            (saleTypeOptions.find((option) => option.value === saleType)
              ?.label || "Venda") +
            " para " +
            (selectedCustomer?.name || "cliente não selecionado") +
            ". Total: " +
            money(total) +
            (saleType === "VENDA"
              ? ". Pagamento: " + paymentLabels[payment]
              : "") +
            ". Após confirmar, o sistema gravará o documento e abrirá a visualização do comprovante."
          }
          confirmLabel="Confirmar e visualizar"
          busyLabel="Gravando…"
          busy={saving}
          error={error}
          onConfirm={() => void saveSale("CONCLUIDA")}
          onCancel={() => {
            if (!saving) setSaveConfirmOpen(false);
          }}
        />
      )}
      {receiptOpen && receiptOrder && (
        <SaleReceiptModal
          key={receiptOrder.id + ":" + receiptOrder.version}
          order={receiptOrder}
          tender={receiptTender}
          onClose={() => setReceiptOpen(false)}
        />
      )}
      {detailsOrder && <SaleDetailsModal key={detailsOrder.id} order={detailsOrder} onClose={() => setDetailsOrder(null)} onReceipt={(order) => { setReceiptOrder(order); setReceiptTender(""); setReceiptOpen(true); }}/>} 
      {deleteConfirmOpen && (
        <ConfirmationModal
          title="Excluir venda"
          description={
            currentEditOrderId
              ? "Deseja cancelar a venda atual? O cancelamento ficará registrado no histórico."
              : "Deseja excluir a venda atual? Os itens e dados deste atendimento serão descartados."
          }
          confirmLabel="Excluir venda"
          busy={deletingSale}
          error={deleteError}
          onCancel={() => {
            if (!deletingSale) setDeleteConfirmOpen(false);
          }}
          onConfirm={() => void deleteCurrentSale()}
        />
      )}
      {customerPickerMode && activeView === "POS" && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-3 sm:p-6">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Selecionar cliente"
            className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-3xl bg-white dark:bg-slate-900 shadow-xl"
          >
            <div className="flex justify-end border-b px-4 py-2">
              <button
                autoFocus
                type="button"
                aria-label="Fechar seleção de clientes"
                onClick={() => setCustomerPickerMode(false)}
                className="rounded-xl p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
              <SalesCustomersPanel
                selectionMode
                onSelectCustomer={selectSaleCustomer}
                onCancelSelection={() => setCustomerPickerMode(false)}
              />
            </div>
          </section>
        </div>
      )}
      {productPickerOpen && (
        <ProductPicker
          products={products}
          getPrice={getProductSalePrice}
          onSelect={addProduct}
          onClose={() => {
            setProductPickerOpen(false);
            requestAnimationFrame(() => searchRef.current?.focus());
          }}
        />
      )}
      {returnModalOpen && (
        <SalesReturnModal
          orders={orders}
          merchandiseTotal={total}
          accounts={bankAccounts}
          saving={saving}
          error={error}
          onClose={() => {
            setReturnModalOpen(false);
            setError("");
          }}
          onConfirm={async (decision) => {
            await saveSale("CONCLUIDA", decision);
          }}
        />
      )}
      {variantPickerProduct && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Escolher tamanho e cor"
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-xl"
          >
            <div className="flex justify-between">
              <h2 className="font-black">
                {variantPickerProduct.name} · Tamanho / cor
              </h2>
              <button
                type="button"
                onClick={() => setVariantPickerProduct(null)}
              >
                Fechar
              </button>
            </div>
            <div className="mt-4 max-h-96 space-y-2 overflow-auto">
              {variantPickerProduct.variants?.map((variant) => (
                <button
                  type="button"
                  key={variant.id}
                  onClick={() => addProduct(variantPickerProduct, variant.id)}
                  className="flex w-full items-center justify-between rounded-xl border p-3 text-left hover:bg-slate-50"
                >
                  <span className="font-bold">
                    {variant.name}
                    <small className="block font-normal text-slate-500 dark:text-slate-400">
                      {variant.barcode || "Sem código de barras"} · Disponível:{" "}
                      {Number(variant.stock) -
                        Number(variant.reservedStock || 0)}{" "}
                      · Em condicional: {Number(variant.reservedStock || 0)}
                    </small>
                  </span>
                  <strong>
                    {money(
                      getProductSalePrice(variantPickerProduct, variant.id),
                    )}
                  </strong>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
