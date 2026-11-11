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
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { canPerformAction } from "@/services/tool-permissions";
import { useSalesDialogs } from "@/hooks/use-sales-dialogs";
import {
  addQuantity,
  saleSubtotal,
  quantityAmount,
  saleLineCents,
  saleAdjustmentCents,
  allocateSaleAdjustment,
  adjustmentForSaleTotal,
} from "@/services/sales-numbers";
import DecimalInput from "./decimal-input";
import {
  getSalesPriceOptions,
  type SalesPriceType,
} from "@/services/sales-pricing";
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
  paymentAmount,
  type SalePaymentMethod,
} from "@/services/sales-payment";
import CardPaymentModal from "./card-payment-modal";
import type { SalesCardPayment } from "@/services/sales-cards";
import { paymentBreakdown } from "@/services/sales-payment";
import SaleReceiptModal from "./sale-receipt-modal";
import OrderListFilterBar, { emptyOrderFilters, type OrderListFilters } from "./order-list-filters";
import PendingSaleActions from "./pending-sale-actions";
import PendingSalesModal, { type SalesListFilter } from "./pending-sales-modal";
import RecordedSaleActions, {
  RecordedSaleStatus,
} from "./recorded-sale-actions";
import SaleDetailsModal from "./sale-details-modal";
import CustomerCreditsPanel from "./creditos-panel";
import {
  getSalesOrderDetails,
  getSalesOrderByRequest,
  initializeSalesModule,
  getSalesOrdersPage,
} from "@/services/vendas.service";
import ConfirmationModal from "@/components/ui/confirmation-modal";
import ProductPicker from "./product-picker";
import ProductNamePreview from "./product-name-preview";
import SalesPageHeader from "./sales-page-header";
import SalesCashPanel from "./caixa-panel";
import SalesCustomersPanel from "./clientes-panel";
import SalesReturnModal, { type SalesReturnDecision } from "./troca-modal";
import { getSalesCustomerCredit } from "@/services/vendas.service";
import RetailReportsCenter from "./central-relatorios";
import LegacyReports from "./legacy-reports";
import SalesReversalsPanel from "./estornos-panel";
import SalesProductsPanel from "./produtos-panel";
import SalesSellersPanel from "./vendedores-panel";
import SalesSuppliersPanel from "./fornecedores-panel";
import {
  ChartNoAxesCombined,
  FileText,
  ClipboardList,
  Package,
  Clock3,
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
  priceType?: SalesPriceType;
  originalUnitPrice?: number;
  baseUnitPrice?: number;
  discount?: number;
  addition?: number;
  variantId?: string;
  product: SalesProduct;
  quantity: number;
  unitPrice: number;
};
const cartLineKey = (line: CartLine) =>
  line.product.id +
  ":" +
  (line.variantId || "") +
  ":" +
  [
    line.priceType || "LEGADO",
    line.baseUnitPrice,
    line.discount,
    line.addition,
    line.unitPrice.toFixed(2),
  ].join(":");
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
  const { user } = useAuth();
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
          Carregando módulo de vendas...
        </div>
      }
    >
      <VendasScreen key={`${user?.companyId}:${user?.id}`} />
    </Suspense>
  );
}

function VendasScreen() {
  useSalesDialogs();
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingSalesFilter, setPendingSalesFilter] = useState<SalesListFilter | null>(null);
  const [newSaleConfirmOpen, setNewSaleConfirmOpen] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<{ href: string; newSale: boolean } | null>(null);
  const [cardPayments, setCardPayments] = useState<SalesCardPayment[]>([]);
  const [cardModal, setCardModal] = useState<"DEBITO" | "CREDITO" | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<SalesOrder | null>(null);
  const [detailsOrder, setDetailsOrder] = useState<SalesOrder | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptTender, setReceiptTender] = useState("");
  const [deletingSale, setDeletingSale] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [customerCreditBalance, setCustomerCreditBalance] = useState("0");
  const [creditError, setCreditError] = useState("");
  const [historyBusy, setHistoryBusy] = useState(false);
  const [historyMore, setHistoryMore] = useState(false);
  const [legacyOpen, setLegacyOpen] = useState(false);
  const historySequence = useRef(0);
  const draftReady = useRef(false);
  const live = useRef({ dirty: false, busy: false });
  const [priceChoice, setPriceChoice] = useState<{
    product: SalesProduct;
    variantId?: string;
    targetKey?: string;
  } | null>(null);
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
  const [listFilters, setListFilters] = useState<Record<string, OrderListFilters>>({});
  const [historyRetry, setHistoryRetry] = useState(0);
  const [historyError, setHistoryError] = useState("");
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
  const [, setUnitPrice] = useState("");
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
  const [loadingReceivingAccounts, setLoadingReceivingAccounts] =
    useState(false);
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

  const paymentRef = useRef<HTMLDivElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const initialized = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (!initialized.current && canPerformAction(user, "sales", "create")) {
        await initializeSalesModule();
        initialized.current = true;
      }
      const [p, o] = await Promise.allSettled([
        getSalesProducts(),
        getSalesOrders(),
      ]);
      const failures: string[] = [];
      if (p.status === "fulfilled") setProducts(p.value);
      else failures.push("Catálogo indisponível. Tente atualizar novamente.");
      if (o.status === "fulfilled") {
        setOrders(o.value);
        setHistoryMore(o.value.length === 100);
      } else
        failures.push(
          "Histórico indisponível. O catálogo disponível foi preservado.",
        );
      setError(failures.join(" "));
      try {
        const [sellerResult, customerResult] = await Promise.allSettled([
          getSalesSellers(),
          getSalesCustomers(),
        ]);
        const salesSellers =
          sellerResult.status === "fulfilled" ? sellerResult.value : null;
        const salesCustomers =
          customerResult.status === "fulfilled" ? customerResult.value : null;
        if (
          sellerResult.status === "rejected" ||
          customerResult.status === "rejected"
        )
          setError(
            [
              ...failures,
              "Parte dos cadastros está indisponível. Os dados carregados foram preservados.",
            ].join(" "),
          );
        if (salesCustomers) setRegisteredCustomers(salesCustomers);
        if (salesSellers) {
          setRegisteredSellers(salesSellers);
          setSeller((current) =>
            current && salesSellers.some((item) => item.id === current)
              ? current
              : salesSellers.length === 1
                ? salesSellers[0].id
                : "",
          );
        }
        if (salesCustomers)
          setCustomer((current) =>
            current && salesCustomers.some((item) => item.id === current)
              ? current
              : salesCustomers.find(
                  (item) => item.systemKey === "CONSUMIDOR_FINAL",
                )?.id || "",
          );
      } catch {
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
  }, [user]);
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
          .catch((cause) =>
            setError(
              cause instanceof Error
                ? cause.message
                : "Falha ao atualizar produtos.",
            ),
          );
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
          .catch(() =>
            setError(
              "Falha ao atualizar clientes/vendedores. Os dados anteriores foram preservados.",
            ),
          );
      }
      if (requestedView === "POS" && requestedType === "TROCA") {
        setSaleType("TROCA");
      } else if (requestedView === "CAIXA") setSaleType("VENDA");
    } else if (!requestedView) {
      setActiveView("POS");
      setCatalogOpen(false);
    }
  }, [searchParams, loadReceivingAccounts]);

  live.current = {
    dirty: cart.length > 0 || notes.trim().length > 0,
    busy: saving || deletingSale,
  };
  const draftKey = `contrx-sales-draft:${user?.companyId}:${user?.id}`;
  useEffect(() => {
    if (loading || draftReady.current || !products.length) return;
    draftReady.current = true;
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as {
        at: number;
        lines: {
          productId: string;
          variantId?: string;
          quantity: number;
          unitPrice: number;
          priceType?: SalesPriceType;
          originalUnitPrice?: number;
          baseUnitPrice?: number;
          discount?: number;
          addition?: number;
        }[];
        seller: string;
        customer: string;
        saleType: string;
        discount: string;
        addition: string;
        notes: string;
        payment: PayMethod;
        parts: typeof paymentParts;
        account: string;
        installments: number;
        editId: string | null;
        version?: number;
        requestId: string | null;
        tender: string;
      };
      if (!Number.isFinite(draft.at) || Date.now() - draft.at > 86400000) {
        sessionStorage.removeItem(draftKey);
        return;
      }
      if (
        !Array.isArray(draft.lines) ||
        draft.lines.some(
          (line) =>
            !Number.isFinite(line.quantity) ||
            line.quantity <= 0 ||
            !Number.isFinite(line.unitPrice) ||
            line.unitPrice < 0,
        )
      )
        throw new Error("Rascunho inválido");
      const restored = draft.lines
        .map((line) => ({
          ...line,
          product: products.find((p) => p.id === line.productId),
        }))
        .filter((line): line is typeof line & { product: SalesProduct } =>
          Boolean(line.product),
        );
      if (restored.length !== draft.lines.length) {
        setError(
          "Alguns produtos do rascunho não estão disponíveis. Confira o cadastro antes de retomar.",
        );
        return;
      }
      setCart(restored);
      setSeller(draft.seller);
      setCustomer(draft.customer);
      setSaleType(draft.saleType);
      setDiscountValue(draft.discount);
      setAdditionValue(draft.addition);
      setNotes(draft.notes);
      setPayment(draft.payment);
      setPaymentParts(draft.parts);
      setBankAccountId(draft.account);
      setInstallments(draft.installments);
      setCurrentEditOrderId(draft.editId);
      setOrderVersion(draft.version);
      requestIdRef.current = draft.requestId;
      if (draft.requestId)
        setError(
          "Existe uma tentativa de gravação anterior. Consulte o resultado antes de gravar novamente.",
        );
      setCashTender(draft.tender || "");
    } catch {
      setError(
        "Não foi possível recuperar o rascunho. Nenhum documento foi alterado.",
      );
    }
  }, [loading, products, draftKey]);
  useEffect(() => {
    if (!draftReady.current) return;
    try {
      if (!cart.length && !notes && !requestIdRef.current) {
        sessionStorage.removeItem(draftKey);
        return;
      }
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          at: Date.now(),
          lines: cart.map((line) => ({
            productId: line.product.id,
            variantId: line.variantId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            priceType: line.priceType,
            originalUnitPrice: line.originalUnitPrice,
            baseUnitPrice: line.baseUnitPrice,
            discount: line.discount,
            addition: line.addition,
          })),
          seller,
          customer,
          saleType,
          discount: discountValue,
          addition: additionValue,
          notes,
          payment,
          parts: paymentParts,
          account: bankAccountId,
          installments,
          editId: currentEditOrderId,
          version: orderVersion,
          requestId: requestIdRef.current,
          tender: cashTender,
        }),
      );
    } catch {
      /* Rascunho indisponível: proteção de saída permanece ativa. */
    }
  }, [
    cart,
    notes,
    seller,
    customer,
    saleType,
    discountValue,
    additionValue,
    payment,
    paymentParts,
    bankAccountId,
    installments,
    currentEditOrderId,
    orderVersion,
    cashTender,
    draftKey,
    saving,
  ]);
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => {
      if (live.current.dirty || live.current.busy) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const click = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !anchor ||
        anchor.origin !== location.origin ||
        anchor.target === "_blank" ||
        event.ctrlKey ||
        event.metaKey
      )
        return;
      const next = new URL(anchor.href);
      const newSale =
        next.pathname === "/vendas" &&
        (next.searchParams.get("view") === "POS" ||
          !next.searchParams.get("view"));
      if (live.current.busy) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (
        (newSale || next.pathname !== "/vendas") &&
        live.current.dirty
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (newSale && next.searchParams.get("tipo") !== "TROCA") {
          setError("");
          setNewSaleConfirmOpen(true);
        } else {
          setPendingNavigation({ href: next.pathname + next.search + next.hash, newSale });
        }
        return;
      }
      if (newSale) {
        clearSale();
        if (next.searchParams.get("tipo") === "TROCA") setSaleType("TROCA");
        setActiveView("POS");
      } else if (next.pathname === "/vendas")
        setActiveView(
          (next.searchParams.get("view") || "POS") as typeof activeView,
        );
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
    };
  });
  function navigateView(view: typeof activeView) {
    setActiveView(view);
    router.push(
      `/vendas?view=${view}${view === "ABRIR" ? `&tipo=${openFilter}` : ""}`,
    );
  }

  async function showReceipt(order: SalesOrder) {
    try {
      const fresh = await getSalesOrderDetails(order.id);
      setReceiptOrder(fresh);
      setReceiptTender(fresh.cashTender || "");
      setReceiptOpen(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Falha ao atualizar comprovante.",
      );
    }
  }
  async function recoverAttempt() {
    if (!requestIdRef.current || savingRef.current) return;
    try {
      const recovered = await getSalesOrderByRequest(requestIdRef.current);
      if (
        live.current.dirty &&
        !window.confirm(
          `A tentativa corresponde ao documento #${recovered.number}. Abrir o documento gravado e retirar o atendimento atual da edição?`,
        )
      )
        return;
      clearSale();
      await load();
      setMessage(
        `Documento #${recovered.number} localizado. Nenhuma nova venda foi criada.`,
      );
      if (recovered.status === "CONCLUIDA") await showReceipt(recovered);
      else await openOrder(recovered);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível consultar a tentativa.",
      );
    }
  }

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return term
      ? products.filter(
          (item) =>
            item.active &&
            !item.isGridParent &&
            item.showInSale &&
            `${item.name} ${item.sku || ""} ${item.reference || ""} ${item.barcode || ""} ${(item.variants || []).map((variant) => variant.barcode || "").join(" ")}`
              .toLocaleLowerCase("pt-BR")
              .includes(term),
        )
      : [];
  }, [products, search]);
  const itemAdjustments = cart.reduce(
    (sum, line) => {
      const next = saleAdjustmentCents(line);
      return {
        discount: sum.discount + next.discount,
        addition: sum.addition + next.addition,
        promotion: sum.promotion + next.promotion,
      };
    },
    { discount: 0, addition: 0, promotion: 0 },
  );
  const subtotal = saleSubtotal(cart);
  const discount = parseMoney(discountValue);
  const addition = parseMoney(additionValue);
  const total = Math.max(
    0,
    Math.round((subtotal - discount + addition) * 100) / 100,
  );
  useEffect(() => {
    setDiscountPercent(formatMoney(subtotal ? (discount / subtotal) * 100 : 0));
    setAdditionPercent(formatMoney(subtotal ? (addition / subtotal) * 100 : 0));
  }, [subtotal, discount, addition]);
  const discountBases = cart.map(line => line.priceType === "PROMOCIONAL" || line.product.allowDiscount === false ? 0 : saleLineCents(line.unitPrice, line.quantity));
  const discountEligible = discountBases.reduce((a, b) => a + b, 0) / 100;
  const allocatedDiscounts = allocateSaleAdjustment(discount, discountBases);
  const allocatedAdditions = allocateSaleAdjustment(addition, cart.map(line => line.product.allowAddition === false ? 0 : saleLineCents(line.unitPrice, line.quantity)));
  const itemCount = cart.reduce((count, row) => count + row.quantity, 0);
  const editingOrder = orders.find((order) => order.id === currentEditOrderId);
  const selectedCustomer = registeredCustomers.find(
    (item) => item.id === customer,
  );
  useEffect(() => {
    let current = true;
    setCustomerCreditBalance("0");
    setCreditError("");
    if (!customer) {
      setCustomerCreditBalance("0");
      return;
    }
    void getSalesCustomerCredit(customer)
      .then((result) => {
        if (current) {
          setCustomerCreditBalance(result.balance);
          setCreditError("");
        }
      })
      .catch(() => {
        if (current)
          setCreditError(
            "Saldo de crédito indisponível. Atualize os dados antes de usar crédito do cliente.",
          );
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
    if (savingRef.current || saving || deletingSale || loading) return;
    setCustomerPickerMode(true);
    setMessage("");
    setError("");
  }
  function selectSaleCustomer(selected: SalesCustomer) {
    if (saleType === "CONDICIONAL" && selected.isSystem) {
      setError(
        "Selecione um cliente identificado para o condicional. CONSUMIDOR FINAL não é permitido.",
      );
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
    navigateView("POS");
    if (selected.isSystem && payment === "CREDIARIO") setPayment("DINHEIRO");
    if (selected.isSystem)
      setPaymentParts((current) => ({
        ...current,
        CREDIARIO: "0,00",
        SALDO_CLIENTE: "0,00",
      }));
  }
  const saleNumber = editingOrder
    ? String(editingOrder.number)
    : "Após gravação";
  const today = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Manaus",
  }).format(
    editingOrder
      ? new Date(editingOrder.completedAt || editingOrder.createdAt)
      : new Date(),
  );
  const openSearch = openSearches[openFilter] || "";
  const openDates = listFilters[openFilter] || emptyOrderFilters;
  const { startDate, endDate, status: listStatus } = openDates;
  useEffect(() => {
    if (activeView !== "ABRIR") return;
    const sequence = ++historySequence.current;
    setHistoryBusy(true);
    setHistoryError("");
    setHistoryMore(false);
    if (startDate && endDate && startDate > endDate) { setHistoryBusy(false); return; }
    const timer = setTimeout(() => {
      setHistoryBusy(true);
      getSalesOrdersPage({ filter: openFilter, search: openSearch, startDate, endDate, status: listStatus })
        .then((rows) => {
          if (sequence === historySequence.current) {
            setOrders(rows);
            setHistoryMore(rows.length === 100);
          }
        })
        .catch((cause: Error) => {
          if (sequence === historySequence.current) setHistoryError(cause.message);
        })
        .finally(() => {
          if (sequence === historySequence.current) setHistoryBusy(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      historySequence.current = sequence + 1;
    };
  }, [activeView, openFilter, openSearch, startDate, endDate, listStatus, historyRetry]);
  async function moreOrders() {
    if (historyBusy || !orders.length) return;
    const sequence = ++historySequence.current;
    setHistoryBusy(true);
    try {
      const rows = await getSalesOrdersPage({
        before: orders[orders.length - 1].number,
        filter: openFilter,
        search: openSearch,
        startDate, endDate, status: listStatus,
      });
      if (sequence === historySequence.current) {
        setOrders((current) => [...current, ...rows]);
        setHistoryMore(rows.length === 100);
      }
    } catch (cause) {
      if (sequence === historySequence.current) setHistoryError(
        cause instanceof Error ? cause.message : "Falha ao carregar mais documentos.",
      );
    } finally {
      if (sequence === historySequence.current) setHistoryBusy(false);
    }
  }
  const openSearchTerm = openSearch.trim();
  const visibleOpenOrders = historyBusy || historyError || (startDate && endDate && startDate > endDate) ? [] : orders.filter((order) => {
    if (openFilter === "GRAVADAS")
      return (
        ["VENDA", "TROCA"].includes(order.saleType) &&
        order.status !== "EM_ANDAMENTO"
      );
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
    return getSalesPriceOptions(product, variantId).normal;
  }
  function recalculatePercent(
    value: number,
    base: number,
    setter: (next: string) => void,
  ) {
    setter(base > 0 ? formatMoney((value / base) * 100) : "0,00");
  }
  function addProduct(
    product: SalesProduct,
    variantId?: string,
    selectedType?: SalesPriceType,
    targetKey?: string,
  ) {
    if (savingRef.current || saving) return;
    if (!product.active || !product.showInSale) {
      setError("Este produto está inativo ou indisponível para venda.");
      return;
    }
    if (product.isGridParent) {
      setError(
        "Selecione o cadastro independente do tamanho/cor. A matriz da grade não é vendida diretamente.",
      );
      return;
    }
    setProductPickerOpen(false);
    if (product.variants?.length && !variantId) {
      setVariantPickerProduct(product);
      return;
    }
    setVariantPickerProduct(null);
    const prices = getSalesPriceOptions(product, variantId);
    if (prices.promotional !== null && !selectedType) {
      setPriceChoice({ product, variantId, targetKey });
      return;
    }
    const type = selectedType || "NORMAL";
    const existing = targetKey
      ? cart.find((line) => cartLineKey(line) === targetKey)
      : undefined;
    const amount = existing?.quantity ?? quantityAmount(quantity);
    const enteredPrice =
      type === "PROMOCIONAL" ? prices.promotional! : prices.normal;
    const addedLine: CartLine = {
      product,
      variantId,
      quantity: amount,
      unitPrice: enteredPrice,
      baseUnitPrice: enteredPrice,
      originalUnitPrice: prices.normal,
      priceType: type,
      discount: 0,
      addition: 0,
    };
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
      const remaining = targetKey
        ? current.filter((line) => cartLineKey(line) !== targetKey)
        : current;
      const found = remaining.find(
        (line) => cartLineKey(line) === cartLineKey(addedLine),
      );
      return found
        ? remaining.map((line) =>
            cartLineKey(line) === cartLineKey(addedLine)
              ? { ...line, quantity: addQuantity(line.quantity, amount) }
              : line,
          )
        : [...remaining, addedLine];
    });
    setPriceChoice(null);
    setSearch("");
    setUnitPrice("");
    setQuantity("1,00");
    setError("");
    requestAnimationFrame(() => searchRef.current?.focus());
  }

  function handleProductKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addSearchedProduct();
  }

  function addSearchedProduct() {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    if (!term) {
      setProductPickerOpen(true);
      return;
    }
    const exact = products.find(
      (product) =>
        product.active &&
        !product.isGridParent &&
        product.showInSale &&
        [product.sku, product.barcode, product.reference].some(
          (code) => code?.toLocaleLowerCase("pt-BR") === term,
        ),
    );
    const match =
      exact ||
      (filteredProducts.length === 1 ? filteredProducts[0] : undefined);
    const variantMatch = products
      .filter(
        (product) =>
          !product.isGridParent && product.active && product.showInSale,
      )
      .flatMap((product) =>
        (product.variants || []).map((variant) => ({ product, variant })),
      )
      .find(
        ({ variant }) => variant.barcode?.toLocaleLowerCase("pt-BR") === term,
      );
    if (variantMatch) addProduct(variantMatch.product, variantMatch.variant.id);
    else if (match) addProduct(match);
    else {
      setError(filteredProducts.length > 1 ? "Selecione um produto na lista de resultados ou informe o código exato." : "Nenhum produto encontrado. Confira o código ou pesquise pela lupa.");
      searchRef.current?.focus();
    }
  }

  function setQuantityInCart(lineKey: string, value: string) {
    const amount = quantityAmount(value);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Informe uma quantidade positiva, com até três casas decimais.");
      return;
    }
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
    if (!cart.length && saleType !== "TROCA") {
      setError("Adicione produtos antes de gravar.");
      return;
    }
    if (
      !registeredSellers.some((item) => item.id === seller) ||
      !selectedCustomer
    ) {
      setError("Selecione cliente e vendedor ativos antes de confirmar.");
      return;
    }
    if (
      creditError &&
      (payment === "SALDO_CLIENTE" ||
        (payment === "MISTO" && paymentAmount(paymentParts.SALDO_CLIENTE) > 0))
    ) {
      setError(creditError);
      return;
    }
    if (
      saleType === "CONDICIONAL" &&
      (!selectedCustomer || finalConsumerSelected)
    ) {
      setError(
        "Selecione um cliente identificado para o condicional. CONSUMIDOR FINAL não é permitido.",
      );
      return;
    }
    if (saleType === "TROCA") {
      setReturnModalOpen(true);
      return;
    }
    const amounts = paymentBreakdown(payment, paymentParts, total).amounts;
    if (
      ["VENDA", "TROCA"].includes(saleType) &&
      amounts.CREDIARIO > 0 &&
      selectedCustomer?.referenceOnly
    ) {
      setError(
        "Vendas a prazo exigem cadastro completo. Cliente apenas referência não pode comprar a prazo.",
      );
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
    if (saleType === "TROCA" && status === "EM_ANDAMENTO") {
      setError(
        "Trocas não podem ser colocadas em andamento. Confira a devolução para concluir a operação.",
      );
      return;
    }
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
    if (
      ["VENDA", "TROCA"].includes(saleType) &&
      saleCustomer?.referenceOnly &&
      (payment === "CREDIARIO" ||
        (payment === "MISTO" && parseMoney(paymentParts.CREDIARIO) > 0))
    ) {
      setError(
        "Vendas a prazo exigem cadastro completo. Cliente apenas referência não pode comprar a prazo.",
      );
      return;
    }
    if (
      saleType === "CONDICIONAL" &&
      (!saleCustomer || saleCustomer.isSystem)
    ) {
      setError(
        "Selecione um cliente identificado para o condicional. CONSUMIDOR FINAL não é permitido.",
      );
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
    if (discount > discountEligible) {
      setError("O desconto supera o total dos produtos que permitem desconto.");
      return;
    }
    if (addition > 0 && !cart.some(line => line.product.allowAddition !== false && line.unitPrice > 0)) {
      setError("Os produtos desta venda não permitem acréscimo.");
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
        cashTender:
          !exchange &&
          cashTender.trim() &&
          Number.isFinite(paymentAmount(cashTender))
            ? paymentAmount(cashTender).toFixed(2)
            : undefined,
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
                .map((card) => {
                  const payload = { ...card };
                  delete payload.administratorName;
                  return payload;
                })
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
          priceType: line.priceType,
          discount: line.priceType ? line.discount || 0 : undefined,
          addition: line.priceType ? line.addition || 0 : undefined,
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
      requestIdRef.current = null;
      if (status === "CONCLUIDA") {
        setSaveConfirmOpen(false);
        setReceiptTender(exchange ? "" : cashTender);
        setReceiptOrder(savedOrder);
        setReceiptOpen(true);
      }
      clearSale();
      setMessage(
        savedOrder.saleType === "CONDICIONAL"
          ? "Condicional gravado. Estoque reservado até a devolução ou conversão em venda."
          : status === "EM_ANDAMENTO"
            ? "Venda salva em andamento. Use Abrir para retomá-la depois."
            : "Documento gravado com sucesso.",
      );
      setReturnModalOpen(false);
      await load();
      return true;
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
    setPriceChoice(null);
    setBankAccountId("");
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
    setCustomer(
      registeredCustomers.find((item) => item.systemKey === "CONSUMIDOR_FINAL")
        ?.id || "",
    );
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

  async function openOrder(selected: SalesOrder, discardConfirmed = false) {
    if (
      !discardConfirmed &&
      cart.length &&
      currentEditOrderId !== selected.id &&
      !window.confirm(
        "Substituir o atendimento atual? Os itens ainda não gravados serão descartados.",
      )
    )
      return;
    let order: SalesOrder;
    try {
      order = await getSalesOrderDetails(selected.id);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível recuperar a venda.",
      );
      return;
    }
    if (["ESTORNADA", "CANCELADA"].includes(order.status)) {
      setDetailsOrder(order);
      return;
    }
    setOrders((current) =>
      current.some((item) => item.id === order.id)
        ? current.map((item) => (item.id === order.id ? order : item))
        : [...current, order],
    );
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
          priceType: item.priceType,
          originalUnitPrice: Number(item.originalUnitPrice ?? item.unitPrice),
          baseUnitPrice: Number(item.baseUnitPrice ?? item.unitPrice),
          discount: Number(item.discount || 0),
          addition: Number(item.addition || 0),
        };
      }),
    );
    setCashTender(order.cashTender || "");
    requestIdRef.current = null;
    setCardPayments(order.cardPayments || []);
    setOrderVersion(order.version);
    setBankAccountId(order.bankAccountId || "");
    setInstallments(order.installments ?? 1);
    setCurrentEditOrderId(order.id);
    setSeller(order.sellerId || "");
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
    navigateView("POS");
    setMessage(
      `Venda #${order.number} aberta para continuar.${!registeredSellers.some((item) => item.id === order.sellerId) || !registeredCustomers.some((item) => item.id === order.customerId) ? " Há cadastro inativo ou indisponível. Selecione cliente e vendedor ativos antes de gravar." : ""}`,
    );
    setError("");
    return true;
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
      if (savingRef.current || saving || deletingSale || loading) return;
      if (
        activeView !== "POS" ||
        deleteConfirmOpen ||
        saveConfirmOpen ||
        pendingNavigation ||
        pendingSalesFilter ||
        newSaleConfirmOpen ||
        receiptOpen ||
        returnModalOpen ||
        cardModal ||
        priceChoice
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
        navigateView("ABRIR");
      }
      if (event.key === "F4") {
        event.preventDefault();
        openCustomerPicker();
      }
      if (event.key === "F5") {
        event.preventDefault();
        document
          .querySelector<HTMLInputElement>(
            '[data-item-adjustment="DESCONTO"]:not(:disabled)',
          )
          ?.focus();
      }
      if (event.key === "F6") {
        event.preventDefault();
        document
          .querySelector<HTMLInputElement>(
            '[data-item-adjustment="ACRESCIMO"]:not(:disabled)',
          )
          ?.focus();
      }
      if (event.key === "F8") {
        event.preventDefault();
        paymentRef.current
          ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
          ?.focus();
      }
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
      grid.style.setProperty(
        "--pos-height",
        `${Math.max(360, window.innerHeight - grid.getBoundingClientRect().top - 60)}px`,
      );
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (grid.parentElement) observer.observe(grid.parentElement);
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [activeView, error, message, receivingAccountsError, customerPickerMode]);

  return (
    <div className="min-w-0 space-y-4">
      <div className={activeView === "POS" ? posStyles.surface : "space-y-4"}>
        {activeView === "POS" && !customerPickerMode && (
          <SalesPageHeader
            compact
            title="Venda"
            icon={ShoppingCart}
          />
        )}
        {activeView === "POS" && !customerPickerMode && (
          <nav aria-label="Consultar atendimentos de vendas" className={posStyles.quickNav}>
            <button
              type="button"
              className={posStyles.newSaleButton}
              disabled={saving || loading}
              onClick={() => {
                if (live.current.dirty) {
                  setError("");
                  setNewSaleConfirmOpen(true);
                } else {
                  clearSale();
                  searchRef.current?.focus();
                }
              }}
            >
              <Plus size={18} aria-hidden="true" />Nova venda
            </button>
            {([
              { filter: "ATIVAS", label: "Em andamento", icon: Clock3 },
              { filter: "ORCAMENTO", label: "Orçamentos", icon: FileText },
              { filter: "CONDICIONAL", label: "Condicionais", icon: ClipboardList },
              { filter: "PEDIDO", label: "Pedidos", icon: Package },
            ] as const).map(({ filter, label, icon: Icon }) => (
              <button key={filter} type="button" disabled={saving || loading} aria-haspopup="dialog" onClick={() => setPendingSalesFilter(filter)}>
                <Icon size={18} aria-hidden="true" />{label}
              </button>
            ))}
          </nav>
        )}
        {["ABRIR", "ESTORNOS", "RELATORIOS"].includes(activeView) &&
          !customerPickerMode && (
            <SalesPageHeader
              title={
                activeView === "ABRIR"
                  ? "Abrir vendas"
                  : activeView === "ESTORNOS"
                    ? "Estornos"
                    : activeView === "RELATORIOS"
                      ? "Relatórios de vendas"
                      : saleType === "TROCA"
                        ? "Troca de venda"
                        : "Nova venda"
              }
              description={
                activeView === "ABRIR"
                  ? "Consulte orçamentos, condicionais e vendas para continuar o atendimento."
                  : activeView === "ESTORNOS"
                    ? "Estorne vendas, condicionais, orçamentos e pedidos, preservando o histórico das movimentações."
                    : activeView === "RELATORIOS"
                      ? "Acompanhe as vendas, os recebimentos e as comissões da loja."
                      : "Registre os produtos, confira os valores e finalize o atendimento."
              }
              icon={
                activeView === "ABRIR"
                  ? Clock3
                  : activeView === "ESTORNOS"
                    ? RotateCcw
                    : activeView === "RELATORIOS"
                      ? ChartNoAxesCombined
                      : ShoppingCart
              }
            />
          )}
        {receivingAccountsError && ["POS", "CAIXA"].includes(activeView) && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <div>
              <p className="font-bold">
                Não foi possível carregar as contas de recebimento.
              </p>
              <p className="mt-1 text-xs">{receivingAccountsError}</p>
            </div>
            <button
              type="button"
              disabled={loadingReceivingAccounts}
              onClick={() => {
                setError("");
                void loadReceivingAccounts();
                void getSalesProducts()
                  .then(setProducts)
                  .catch((cause) =>
                    setError(
                      cause instanceof Error
                        ? cause.message
                        : "Falha ao atualizar produtos.",
                    ),
                  );
              }}
              className="shrink-0 rounded-xl border border-red-300 px-3 py-2 text-xs font-bold hover:bg-red-100 disabled:opacity-50"
            >
              {loadingReceivingAccounts ? "Carregando…" : "Tentar novamente"}
            </button>
          </div>
        )}
        {error && ["POS", "ABRIR", "RELATORIOS"].includes(activeView) && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700"
          >
            {error}
          </div>
        )}
        {error && requestIdRef.current && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void recoverAttempt()}
            className="rounded-xl border px-4 py-2 text-sm font-bold"
          >
            Consultar resultado da gravação
          </button>
        )}
        {creditError && activeView === "POS" && (
          <p
            role="alert"
            className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800"
          >
            {creditError}
          </p>
        )}
        {loading && (
          <p role="status" className="p-3 text-sm">
            Atualizando catálogo, cadastros e histórico…
          </p>
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
            <fieldset
              disabled={saving || deletingSale || loading}
              className="min-w-0 border-0 p-0 m-0"
              aria-busy={saving}
            >
              <div ref={posGridRef} className={posStyles.grid}>
                <div className={posStyles.left}>
                  <section
                    className={`${posStyles.metadata} rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm`}
                  >
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
                        {seller &&
                          !registeredSellers.some(
                            (item) => item.id === seller,
                          ) && (
                            <option value={seller} disabled>
                              {editingOrder?.sellerName || seller}{" "}
                              (indisponível)
                            </option>
                          )}
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
                            (customer && editingOrder?.customerId === customer
                              ? `${editingOrder.customerName} (indisponível)`
                              : "") ||
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
                          if (event.target.value === "TROCA") {
                            if (
                              live.current.dirty &&
                              !window.confirm(
                                "Descartar o atendimento atual e iniciar uma troca?",
                              )
                            )
                              return;
                            clearSale();
                          }
                          if (
                            event.target.value === "CONDICIONAL" &&
                            finalConsumerSelected
                          )
                            setCustomer("");
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

                  <section
                    className={`${posStyles.items} rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm`}
                  >
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
                                      .join(" · ") ||
                                      "Sem código ou fornecedor"}
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
                          value="Selecionar preço"
                          readOnly
                          aria-label="O preço será selecionado ao adicionar o produto"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={addSearchedProduct}
                        title="Adicionar produto: informe o código ou abra a lista de produtos"
                        className="inline-flex h-[38px] items-center justify-center gap-2 rounded-xl bg-[var(--primary-color)] px-5 text-xs font-extrabold text-white shadow-sm hover:bg-[var(--primary-hover)] shadow-lg shadow-[var(--primary-bg-light)] transition active:scale-95"
                      >
                        <Plus className="h-4 w-4" />
                        Adicionar
                      </button>
                    </div>
                    {cart.some((line) => {
                      if (!line.product.manageStock) return false;
                      const variant = line.product.variants?.find(
                        (item) => item.id === line.variantId,
                      );
                      const productQuantity = cart
                        .filter((item) => item.product.id === line.product.id)
                        .reduce((sum, item) => sum + item.quantity, 0);
                      return (
                        productQuantity >
                          Number(line.product.stock) -
                            Number(line.product.reservedStock || 0) ||
                        Boolean(
                          variant &&
                          line.quantity >
                            Number(variant.stock) -
                              Number(variant.reservedStock || 0),
                        )
                      );
                    }) && (
                      <p
                        role="alert"
                        className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
                      >
                        Atenção: há produtos com estoque disponível
                        insuficiente, zero ou negativo.{" "}
                        {saleType === "CONDICIONAL"
                          ? "O condicional pode ser gravado e a reserva poderá deixar o saldo disponível negativo."
                          : "A venda pode continuar e o saldo poderá ficar negativo."}
                      </p>
                    )}
                    <div className={posStyles.table}>
                      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                        <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
                          <tr>
                            <th>Código</th>
                            <th>Produto</th>
                            <th>Qtd.</th>
                            <th>Valor original</th>
                            <th>Desconto</th>
                            <th>Valor final</th>
                            <th className="border-b px-2 py-2">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cart.map((line, lineIndex) => (
                            <tr
                              key={cartLineKey(line)}
                              className={
                                line.priceType === "PROMOCIONAL"
                                  ? posStyles.promotionalLine
                                  : "border-b border-slate-100 dark:border-slate-800"
                              }
                            >
                              <td className="text-xs text-slate-600 dark:text-slate-300">{line.product.sku || "—"}</td>
                              <td>
                                <ProductNamePreview name={line.product.name} photoUrl={line.product.photoUrl} />
                                {!!line.product.variants?.length && (
                                  <select
                                    aria-label={
                                      "Variação de " + line.product.name
                                    }
                                    value={line.variantId || ""}
                                    onChange={(event) => {
                                      setPriceChoice({
                                        product: line.product,
                                        variantId: event.target.value,
                                        targetKey: cartLineKey(line),
                                      });
                                    }}
                                    className="mt-1 max-w-full rounded border p-1 text-xs"
                                  >
                                    <option value="" disabled>
                                      Selecione
                                    </option>
                                    {line.product.variants.map((v) => (
                                      <option key={v.id} value={v.id}>
                                        {v.name}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </td>
                              <td>
                                <DecimalInput
                                  aria-label={
                                    "Quantidade de " + line.product.name
                                  }
                                  className={field}
                                  value={line.quantity.toLocaleString("pt-BR", {
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
                              <td
                                className={
                                  line.priceType === "PROMOCIONAL"
                                    ? "text-slate-500 line-through"
                                    : ""
                                }
                              >
                                {money(
                                  saleLineCents(line.originalUnitPrice ?? line.unitPrice, line.quantity) / 100,
                                )}
                              </td>
                              <td>{money((allocatedDiscounts[lineIndex] + saleAdjustmentCents(line).discount) / 100)}</td>
                              <td className="font-bold">{money((saleLineCents(line.unitPrice, line.quantity) - allocatedDiscounts[lineIndex] + allocatedAdditions[lineIndex]) / 100)}</td>
                              <td>
                                <select
                                  aria-label={"Ações de " + line.product.name}
                                  value=""
                                  className={posStyles.lineActions}
                                  onChange={event => {
                                    if (event.target.value === "PRICE") {
                                    const prices = getSalesPriceOptions(
                                      line.product,
                                      line.variantId,
                                    );
                                    if (prices.promotional !== null)
                                      setPriceChoice({
                                        product: line.product,
                                        variantId: line.variantId,
                                        targetKey: cartLineKey(line),
                                      });
                                    else
                                      addProduct(
                                        line.product,
                                        line.variantId,
                                        "NORMAL",
                                        cartLineKey(line),
                                      );
                                    } else if (event.target.value === "REMOVE") {
                                      setCart(current => current.filter(item => cartLineKey(item) !== cartLineKey(line)));
                                    }
                                  }}
                                >
                                  <option value="" disabled>Ações</option>
                                  <option value="PRICE">Alterar preço</option>
                                  <option value="REMOVE">Remover item</option>
                                </select>
                              </td>
                            </tr>
                          ))}
                          {!cart.length && (
                            <tr>
                              <td colSpan={7} className="h-[250px] text-center">
                                <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
                                  <ShoppingCart className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 p-2 text-slate-500 dark:text-slate-400" />
                                  <strong className="text-sm">
                                    Nenhum produto adicionado. Utilize a barra
                                    acima para pesquisar.
                                  </strong>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div
                      className={`${posStyles.actions} bg-slate-50/75 dark:bg-slate-800/50`}
                    >
                      <button type="button" onClick={() => void saveSale("EM_ANDAMENTO")} disabled={!cart.length || saleType === "TROCA" || saving} className="rounded-md border border-blue-300 px-3 py-2 text-xs font-bold text-blue-700 disabled:opacity-50">Salvar em andamento</button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError("");
                          setDeleteConfirmOpen(true);
                        }}
                        disabled={
                          saving || (!cart.length && !currentEditOrderId)
                        }
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

                <aside
                  className={`${posStyles.aside} rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm`}
                >
                  <div className="shrink-0 rounded-lg bg-[var(--primary-color)] px-4 py-4 text-white">
                    <div className="flex items-center justify-between text-sm font-black uppercase">
                      <span>Subtotal</span>
                      <strong className="text-xl">{money(subtotal)}</strong>
                    </div>
                  </div>
                  <div className="mt-4 space-y-3 text-sm">
                    {([
                      { label: "Desconto", kind: "DESCONTO", value: discountValue, percent: discountPercent, setValue: setDiscountValue, setPercent: setDiscountPercent },
                      { label: "Acréscimo", kind: "ACRESCIMO", value: additionValue, percent: additionPercent, setValue: setAdditionValue, setPercent: setAdditionPercent },
                    ] as const).map(adjustment => (
                      <div key={adjustment.kind} className={posStyles.totalAdjustment}>
                        <span>{adjustment.label}</span>
                        <label>
                          <span aria-hidden="true">R$</span>
                          <DecimalInput
                            data-item-adjustment={adjustment.kind}
                            aria-label={adjustment.label + " em reais"}
                            inputMode="decimal"
                            value={parseMoney(adjustment.value) === 0 ? "" : adjustment.value}
                            onChange={event => adjustment.setValue(event.target.value)}
                          />
                        </label>
                        <label>
                          <DecimalInput
                            aria-label={adjustment.label + " em porcentagem"}
                            inputMode="decimal"
                            value={parseMoney(adjustment.percent) === 0 ? "" : adjustment.percent}
                            onChange={event => {
                              const percent = paymentAmount(event.target.value);
                              if (!Number.isFinite(percent) || percent < 0) {
                                setError("Informe um percentual válido e positivo.");
                                return;
                              }
                              adjustment.setPercent(formatMoney(percent));
                              adjustment.setValue(formatMoney(subtotal * percent / 100));
                            }}
                          />
                          <span aria-hidden="true">%</span>
                        </label>
                      </div>
                    ))}
                    {itemAdjustments.discount > 0 && <p>Desconto anterior nos itens: {money(itemAdjustments.discount / 100)}</p>}
                    {itemAdjustments.addition > 0 && <p>Acréscimo anterior nos itens: {money(itemAdjustments.addition / 100)}</p>}
                    {itemAdjustments.promotion > 0 && <p className="text-emerald-700">Economia em promoção: {money(itemAdjustments.promotion / 100)}</p>}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-black uppercase text-slate-800 dark:text-slate-100">
                      Total
                    </span>
                    <label className={posStyles.editableTotal}>
                      <span aria-hidden="true">R$</span>
                      <DecimalInput
                        aria-label="Total da venda em reais"
                        inputMode="decimal"
                        value={formatMoney(total)}
                        disabled={!cart.length}
                        onChange={event => {
                          try {
                            const adjustment = adjustmentForSaleTotal(subtotal, paymentAmount(event.target.value), discountEligible, cart.some(line => line.product.allowAddition !== false && line.unitPrice > 0));
                            setDiscountValue(formatMoney(adjustment.discount));
                            setAdditionValue(formatMoney(adjustment.addition));
                            setError("");
                          } catch (cause) {
                            setError(cause instanceof Error ? cause.message : "Confira o total informado.");
                          }
                        }}
                      />
                    </label>
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
                          const cardCustomer = registeredCustomers.find(
                            (item) => item.systemKey === "CLIENTE_CARTAO",
                          );
                          if (
                            !cardCustomer &&
                            (!selectedCustomer ||
                              selectedCustomer.systemKey === "CONSUMIDOR_FINAL")
                          ) {
                            setError(
                              "Cliente de cartão indisponível. Atualize a página e tente novamente.",
                            );
                            return;
                          }
                          if (
                            cardCustomer &&
                            (!selectedCustomer ||
                              selectedCustomer.systemKey === "CONSUMIDOR_FINAL")
                          )
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
                      onClick={() => {
                        if (receiptOrder) void showReceipt(receiptOrder);
                      }}
                      className="mt-2 text-xs font-bold text-[var(--primary-color)]"
                    >
                      Reimprimir comprovante #{receiptOrder.number}
                    </button>
                  )}
                </aside>
              </div>
            </fieldset>
            <nav aria-label="Atalhos da venda" className={posStyles.footer}>
              <button
                type="button"
                disabled={saving}
                onClick={() => navigateView("ABRIR")}
              >
                <kbd>F2</kbd> Abrir
              </button>
              <button type="button" onClick={() => searchRef.current?.focus()}>
                <kbd>F3</kbd> Produto
              </button>
              <button type="button" onClick={openCustomerPicker}>
                <kbd>F4</kbd> Cliente
              </button>
              <button
                type="button"
                onClick={() =>
                  document
                    .querySelector<HTMLInputElement>(
            '[data-item-adjustment="DESCONTO"]:not(:disabled)',
                    )
                    ?.focus()
                }
              >
                <kbd>F5</kbd> Desconto
              </button>
              <button
                type="button"
                onClick={() =>
                  document
                    .querySelector<HTMLInputElement>(
            '[data-item-adjustment="ACRESCIMO"]:not(:disabled)',
                    )
                    ?.focus()
                }
              >
                <kbd>F6</kbd> Acréscimo
              </button>
              <button
                type="button"
                onClick={() =>
                  paymentRef.current
                    ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
                    ?.focus()
                }
              >
                <kbd>F8</kbd> Forma pagto
              </button>
              <button
                type="button"
                onClick={requestFinalizeSale}
                disabled={saving}
              >
                <kbd>F9</kbd> Gravar
              </button>
              <button type="button" onClick={() => setSearch("")}>
                <kbd>Esc</kbd> Limpar busca
              </button>
              <span>
                Itens: {cart.length} ·{" "}
                {editingOrder
                  ? `Venda #${saleNumber}`
                  : "Número definido ao gravar"}
              </span>
            </nav>
          </>
        ) : activeView === "ABRIR" ? (
          <section className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-800">
              <div className="flex-1">
                <h2 className="text-lg font-black">
                  {
                    openOrderOptions.find(
                      (option) => option.value === openFilter,
                    )?.label
                  }
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {openFilter === "GRAVADAS"
                    ? "Consulte o status, os detalhes e os comprovantes das vendas."
                    : "Selecione um registro para continuar ou consultar."}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                {visibleOpenOrders.length}{historyMore ? "+" : ""} registro(s) carregado(s)
              </span>
              <button type="button" onClick={() => navigateView("RELATORIOS")} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold dark:border-slate-700">Relatórios</button>
            </div>
            <OrderListFilterBar search={openSearch} onSearch={value => setOpenSearches(current => ({ ...current, [openFilter]: value }))} value={openDates} onChange={value => setListFilters(current => ({ ...current, [openFilter]: value }))} category={openFilter} onRefresh={() => setHistoryRetry(value => value + 1)} />
            {historyError && <div role="alert" className="m-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{historyError} <button type="button" className="font-bold underline" onClick={() => setHistoryRetry(value => value + 1)}>Tentar novamente</button></div>}
            <div className="flex flex-wrap justify-between gap-2 border-b border-slate-200 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400"><span>Mais recentes primeiro</span><span>Total dos registros carregados: <strong className="text-slate-900 dark:text-white">{money(visibleOpenOrders.reduce((sum, order) => sum + Number(order.total), 0))}</strong></span></div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {visibleOpenOrders.map((order) => (
                <article
                  key={order.id}
                  className="flex flex-wrap items-center gap-4 px-4 py-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <strong className="text-[var(--primary-color)]">
                    #{order.number}
                  </strong>
                  <span className="min-w-32 flex-1 font-bold">
                    {order.customerName}
                    <small className="block font-normal text-slate-500 dark:text-slate-400">
                      {new Date(order.createdAt).toLocaleString("pt-BR", {
                        timeZone: "America/Manaus",
                      })}{" "}
                      -{" "}
                      {order.status === "EM_ANDAMENTO"
                        ? "Em andamento"
                        : saleTypeOptions.find(
                            (option) => option.value === order.saleType,
                          )?.label}
                    </small>
                    <small className="block text-xs font-normal text-slate-500 dark:text-slate-400">Vendedor: {order.sellerName || "Não informado"}</small>
                  </span>
                  <RecordedSaleStatus status={order.status} />
                  <span className="min-w-24 text-right"><small className="block text-[10px] uppercase text-slate-500">Total</small><strong className="tabular-nums">{money(order.total)}</strong></span>
                  {openFilter === "ATIVAS" ? (
                    <PendingSaleActions
                      order={order}
                      onOpen={() => void openOrder(order)}
                      onDetails={() => setDetailsOrder(order)}
                      onReceipt={() => void showReceipt(order)}
                      onDeleted={(deleted) => {
                        setOrders((current) =>
                          current.map((item) =>
                            item.id === deleted.id ? deleted : item,
                          ),
                        );
                        if (currentEditOrderId === deleted.id) clearSale();
                        setError("");
                        setMessage(
                          `Venda #${deleted.number} excluída de Em andamento.`,
                        );
                      }}
                    />
                  ) : (
                    <RecordedSaleActions number={order.number} onDetails={() => setDetailsOrder(order)} onReceipt={() => void showReceipt(order)} onOpen={openFilter !== "GRAVADAS" ? () => void openOrder(order) : undefined} />
                  )}
                </article>
              ))}
              {historyBusy && (
                <p role="status" className="p-4">
                  Consultando documentos…
                </p>
              )}
              {historyMore && (
                <button
                  type="button"
                  disabled={historyBusy}
                  onClick={() => void moreOrders()}
                  className="m-4 rounded-xl border px-4 py-2 text-sm font-bold"
                >
                  Carregar próximos 100 documentos
                </button>
              )}
              {!historyBusy && !historyError && !(startDate && endDate && startDate > endDate) && visibleOpenOrders.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  {(openSearchTerm || startDate || endDate || listStatus)
                    ? "Nenhum registro encontrado. Ajuste a busca ou o período selecionado."
                    : "Nenhum registro nesta categoria."}
                </p>
              )}
            </div>
          </section>
        ) : activeView === "ESTORNOS" ? (
          <>
            <SalesReversalsPanel
              orders={orders}
              onCompleted={async (message) => {
                setMessage(message);
                setError("");
                await load();
              }}
            />
            <CustomerCreditsPanel
              key={orders
                .map((order) => `${order.id}:${order.version}`)
                .join(",")}
              refundsOnly
            />
          </>
        ) : activeView === "RELATORIOS" ? (
          <section className="space-y-6">
            <RetailReportsCenter />
            <details
              onToggle={(event) => setLegacyOpen(event.currentTarget.open)}
              className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
            >
              <summary className="cursor-pointer text-sm font-bold">
                Relatórios de vendas existentes
              </summary>
              <div className="mt-4">
                {legacyOpen && (
                  <LegacyReports products={products} accounts={bankAccounts} />
                )}
              </div>
            </details>
          </section>
        ) : activeView === "CLIENTES" ? (
          <SalesCustomersPanel
            selectionMode={customerPickerMode}
            requireIdentifiedCustomer={saleType === "CONDICIONAL"}
            onSelectCustomer={selectSaleCustomer}
            onCancelSelection={() => {
              setCustomerPickerMode(false);
              navigateView("POS");
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
                placeholder="Preço unitário"
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
      {pendingSalesFilter && <PendingSalesModal key={pendingSalesFilter} filter={pendingSalesFilter} onClose={() => setPendingSalesFilter(null)} hasCurrent={cart.length > 0} currentId={currentEditOrderId} onOpen={order => openOrder(order, true)} />}
      {newSaleConfirmOpen && (
        <ConfirmationModal
          title="Salvar atendimento e iniciar nova venda?"
          description="O atendimento atual será salvo em andamento e ficará disponível no botão Em andamento. A tela será limpa após a gravação."
          confirmLabel="Salvar e iniciar nova venda"
          cancelLabel="Continuar atendimento"
          tone="primary"
          busy={saving}
          busyLabel="Salvando atendimento..."
          error={error}
          onCancel={() => { if (!savingRef.current) setNewSaleConfirmOpen(false); }}
          onConfirm={async () => {
            const saved = await saveSale("EM_ANDAMENTO");
            if (saved) {
              setNewSaleConfirmOpen(false);
              navigateView("POS");
              searchRef.current?.focus();
            }
          }}
        />
      )}
      {pendingNavigation && (
        <ConfirmationModal
          title={pendingNavigation.newSale ? "Iniciar nova venda?" : "Sair do atendimento?"}
          description={pendingNavigation.newSale ? "Os itens e valores do atendimento atual serão descartados. Deseja iniciar uma nova venda?" : "O rascunho ficará disponível nesta sessão para continuar o atendimento depois."}
          confirmLabel={pendingNavigation.newSale ? "Iniciar nova venda" : "Sair do atendimento"}
          cancelLabel="Continuar atendimento"
          tone={pendingNavigation.newSale ? "danger" : "primary"}
          onCancel={() => setPendingNavigation(null)}
          onConfirm={() => {
            if (savingRef.current) return;
            const destination = pendingNavigation;
            setPendingNavigation(null);
            if (destination.newSale) {
              clearSale();
              if (new URL(destination.href, location.origin).searchParams.get("tipo") === "TROCA") setSaleType("TROCA");
              setActiveView("POS");
            }
            router.push(destination.href);
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
      {detailsOrder && (
        <SaleDetailsModal
          key={detailsOrder.id}
          order={detailsOrder}
          onClose={() => setDetailsOrder(null)}
          onReceipt={(order) => void showReceipt(order)}
        />
      )}
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
      {priceChoice && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Selecionar preço do produto"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">Escolha o preço</h2>
                <p className="mt-1 text-sm">{priceChoice.product.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setPriceChoice(null)}
                aria-label="Cancelar seleção de preço"
              >
                <XCircle />
              </button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="rounded-xl border-2 border-slate-300 p-5 text-left hover:border-[var(--primary-color)]"
                onClick={() =>
                  addProduct(
                    priceChoice.product,
                    priceChoice.variantId,
                    "NORMAL",
                    priceChoice.targetKey,
                  )
                }
              >
                <span className="block font-bold">Preço normal</span>
                <strong className="mt-2 block text-2xl">
                  {money(
                    getSalesPriceOptions(
                      priceChoice.product,
                      priceChoice.variantId,
                    ).normal,
                  )}
                </strong>
              </button>
              {getSalesPriceOptions(priceChoice.product, priceChoice.variantId)
                .promotional !== null && (
                <button
                  type="button"
                  className="rounded-xl border-2 border-emerald-500 bg-emerald-50 p-5 text-left text-emerald-950"
                  onClick={() =>
                    addProduct(
                      priceChoice.product,
                      priceChoice.variantId,
                      "PROMOCIONAL",
                      priceChoice.targetKey,
                    )
                  }
                >
                  <span className="block font-bold">Preço promocional</span>
                  <strong className="mt-2 block text-2xl">
                    {money(
                      getSalesPriceOptions(
                        priceChoice.product,
                        priceChoice.variantId,
                      ).promotional!,
                    )}
                  </strong>
                  <small className="mt-2 block">Sem desconto adicional</small>
                </button>
              )}
            </div>
          </section>
        </div>
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
