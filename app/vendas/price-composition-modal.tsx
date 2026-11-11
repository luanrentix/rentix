"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Save, X } from "lucide-react";
import {
  applySalesPriceCompositionTemplate,
  calculatePriceComposition,
  type AcquisitionComponent,
  type SalesPriceComposition,
  type SalesPriceCompositionTemplate,
} from "@/contrx-backend/src/vendas/price-composition";
import {
  getSalesPriceCompositionTemplate,
  getSalesProductPriceComposition,
  saveSalesPriceCompositionTemplate,
  saveSalesProductPriceComposition,
} from "@/services/vendas.service";

type ProductPricingInfo = {
  id: string | null;
  code: string | null;
  name: string;
  unit: string;
  purchaseCost: number;
  additionalCost: number;
  currentPrice: number;
  updatedAt?: string;
  commissionEnabled: boolean;
  commissionType: string;
  commissionRule: string;
  commission: number;
};

type ComponentKey =
  | "freight"
  | "insurance"
  | "otherExpenses"
  | "acquisitionDiscount"
  | "nonRecoverableIpi"
  | "nonRecoverableIcmsSt"
  | "otherNonRecoverableTaxes";
type ExpenseKey = keyof SalesPriceComposition["expenses"];

const money = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    value || 0,
  );
const field =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-bg-light)] disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const zeroComponent = (): AcquisitionComponent => ({
  enabled: false,
  mode: "AMOUNT",
  value: 0,
});

function blankComposition(product: ProductPricingInfo): SalesPriceComposition {
  const commission =
    product.commissionEnabled &&
    product.commissionType === "PERCENTUAL" &&
    product.commissionRule === "PRECO_BRUTO"
      ? product.commission
      : 0;
  const saleExpense = (percentage = 0) => ({
    enabled: percentage > 0,
    percentage,
    basis: "SALE_PRICE" as const,
  });
  return {
    version: 1,
    acquisitionValue: product.purchaseCost,
    freight: zeroComponent(),
    insurance: zeroComponent(),
    otherExpenses: {
      enabled: product.additionalCost > 0,
      mode: "AMOUNT",
      value: product.additionalCost,
    },
    acquisitionDiscount: zeroComponent(),
    nonRecoverableIpi: zeroComponent(),
    nonRecoverableIcmsSt: zeroComponent(),
    otherNonRecoverableTaxes: zeroComponent(),
    recoverableTaxCredits: { enabled: false, amount: 0 },
    expenses: {
      icms: saleExpense(),
      pis: saleExpense(),
      cofins: saleExpense(),
      sellerCommission: saleExpense(commission),
      cardFee: saleExpense(),
      marketplaceFee: saleExpense(),
      administrative: saleExpense(),
      operational: saleExpense(),
      otherVariable: saleExpense(),
    },
    profitMode: "MARGIN",
    desiredMarginPercent: 0,
    desiredProfitAmount: 0,
    priceTableMargins: [10, 15, 20, 25, 30],
  };
}

function mergeTemplate(
  product: ProductPricingInfo,
  template: SalesPriceCompositionTemplate | null,
) {
  const base = blankComposition(product);
  return template ? applySalesPriceCompositionTemplate(base, template) : base;
}

function normalizeLegacy(value: SalesPriceComposition): SalesPriceComposition {
  const next = structuredClone(value);
  for (const key of [
    "freight",
    "insurance",
    "otherExpenses",
    "acquisitionDiscount",
    "nonRecoverableIpi",
    "nonRecoverableIcmsSt",
    "otherNonRecoverableTaxes",
  ] as const) {
    if (!next[key].enabled) next[key].value = 0;
  }
  if (!next.recoverableTaxCredits.enabled)
    next.recoverableTaxCredits.amount = 0;
  next.recoverableTaxCredits.amount = 0;
  for (const expense of Object.values(next.expenses))
    if (!expense.enabled) expense.percentage = 0;
  next.expenses.marketplaceFee.percentage = 0;
  next.expenses.administrative.percentage = 0;
  next.expenses.operational.percentage = 0;
  next.profitMode = "MARGIN";
  next.desiredProfitAmount = 0;
  return next;
}

export default function PriceCompositionModal({
  product,
  onClose,
  onApplyPrice,
}: {
  product: ProductPricingInfo;
  onClose: () => void;
  onApplyPrice: (price: number) => void;
}) {
  const [composition, setComposition] = useState(() =>
    blankComposition(product),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveForNextProducts, setSaveForNextProducts] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    void Promise.all([
      getSalesPriceCompositionTemplate(),
      product.id
        ? getSalesProductPriceComposition(product.id)
        : Promise.resolve(null),
    ])
      .then(([templateResult, productResult]) => {
        if (!active) return;
        setComposition(
          productResult?.composition
            ? normalizeLegacy(productResult.composition)
            : mergeTemplate(product, templateResult.template),
        );
      })
      .catch((cause: unknown) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível carregar os parâmetros de preço.",
          );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [product]);

  const result = useMemo(
    () => calculatePriceComposition(composition),
    [composition],
  );
  function updateComponent(
    key: ComponentKey,
    mode: AcquisitionComponent["mode"],
    value: number,
  ) {
    setComposition((current) => ({
      ...current,
      [key]: { enabled: value > 0, mode, value },
    }));
    setNotice("");
  }
  function updateExpense(key: ExpenseKey, percentage: number) {
    setComposition((current) => ({
      ...current,
      expenses: {
        ...current.expenses,
        [key]: {
          ...current.expenses[key],
          enabled: percentage > 0,
          percentage,
        },
      },
    }));
    setNotice("");
  }
  async function save() {
    if (
      saving ||
      loading ||
      !result.valid ||
      (!product.id && !saveForNextProducts)
    )
      return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (product.id)
        await saveSalesProductPriceComposition(product.id, composition);
      if (saveForNextProducts)
        await saveSalesPriceCompositionTemplate(composition);
      setNotice(
        saveForNextProducts
          ? "Composição e padrão dos próximos produtos salvos."
          : product.id
            ? "Composição salva para este produto."
            : "Padrão salvo para os próximos produtos.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível salvar a composição.",
      );
    } finally {
      setSaving(false);
    }
  }

  const costFields: [ComponentKey, string, "ADD" | "SUBTRACT"][] = [
    ["freight", "Frete", "ADD"],
    ["insurance", "Seguro", "ADD"],
    ["otherExpenses", "Outras despesas", "ADD"],
    ["acquisitionDiscount", "Desconto na compra", "SUBTRACT"],
    ["nonRecoverableIpi", "IPI não recuperável", "ADD"],
    ["nonRecoverableIcmsSt", "ICMS-ST não recuperável", "ADD"],
    ["otherNonRecoverableTaxes", "Outros impostos não recuperáveis", "ADD"],
  ];
  const saleFields: [ExpenseKey, string][] = [
    ["icms", "ICMS"],
    ["pis", "PIS"],
    ["cofins", "COFINS"],
    ["sellerCommission", "Comissão"],
    ["cardFee", "Taxa de cartão"],
    ["otherVariable", "Outras despesas sobre venda"],
  ];

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-5"
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") event.preventDefault();
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="price-composition-title"
        className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <div>
            <h2 id="price-composition-title" className="text-lg font-black">
              Composição de Preços
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {product.name || "Novo produto"} · informe os custos e a margem
              desejada.
            </p>
          </div>
          <button
            type="button"
            aria-label="Fechar composição"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
          >
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {loading && (
            <p role="status" className="text-sm text-slate-500">
              Carregando padrão salvo…
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          )}
          <section className="space-y-3">
            <h3 className="text-sm font-bold">Compra e custos de entrada</h3>
            <label className="block max-w-xs space-y-1 text-xs font-semibold">
              <span>Preço de compra</span>
              <MoneyInput
                value={composition.acquisitionValue}
                onChange={(value) =>
                  setComposition((current) => ({
                    ...current,
                    acquisitionValue: value,
                  }))
                }
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {costFields.map(([key, label, sign]) => (
                <CostInput
                  key={key}
                  label={`${sign === "SUBTRACT" ? "−" : "+"} ${label}`}
                  component={composition[key]}
                  onChange={(mode, value) => updateComponent(key, mode, value)}
                  result={result.acquisitionBreakdown[key] || 0}
                />
              ))}
            </div>
            <div className="rounded-xl bg-slate-100 px-4 py-3 dark:bg-slate-800">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Custo total calculado
              </span>
              <strong className="float-right text-lg">
                {money(result.adjustedCost)}
              </strong>
            </div>
          </section>
          <section className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
            <div>
              <h3 className="text-sm font-bold">
                Impostos e despesas sobre a venda
              </h3>
              <p className="text-xs text-slate-500">
                Informe apenas os percentuais que se aplicam ao seu produto e à
                sua operação.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {saleFields.map(([key, label]) => (
                <label key={key} className="space-y-1 text-xs font-semibold">
                  <span>{label} (%)</span>
                  <PercentInput
                    value={composition.expenses[key].percentage}
                    onChange={(value) => updateExpense(key, value)}
                  />
                  <small className="block font-normal text-slate-500">
                    {money(result.expenseBreakdown[key] || 0)} sobre o preço
                    sugerido
                  </small>
                </label>
              ))}
            </div>
          </section>
          <section className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
            <h3 className="text-sm font-bold">Margem e preço de venda</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-xs font-semibold">
                <span>Lucro sobre o custo (markup %)</span>
                <PercentInput
                  value={composition.desiredMarginPercent}
                  max={100_000_000}
                  onChange={(value) =>
                    setComposition((current) => ({
                      ...current,
                      profitMode: "MARGIN",
                      desiredMarginPercent: value,
                    }))
                  }
                />
              </label>
              <div className="rounded-xl border border-[var(--primary-color)] bg-[var(--primary-bg-light)] p-3">
                <span className="text-xs font-semibold text-slate-600">
                  Preço de venda sugerido
                </span>
                <strong className="mt-1 block text-2xl font-black text-[var(--primary-color)]">
                  {money(result.salePrice)}
                </strong>
              </div>
            </div>
            {result.valid && (
              <p className="text-xs text-slate-500">
                Lucro estimado: {money(result.estimatedProfit)} · margem
                efetiva: {result.effectiveMarginPercent.toFixed(2)}% · preço
                atual: {money(product.currentPrice)}
              </p>
            )}
            {result.error && (
              <p
                role="alert"
                className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"
              >
                {result.error}
              </p>
            )}
          </section>
          {notice && (
            <p
              role="status"
              className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
            >
              {notice}
            </p>
          )}
        </div>
        <footer className="flex flex-wrap items-center gap-3 border-t border-slate-200 px-5 py-4 dark:border-slate-700">
          <label className="mr-auto flex cursor-pointer items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={saveForNextProducts}
              onChange={(event) => setSaveForNextProducts(event.target.checked)}
              className="h-4 w-4 accent-[var(--primary-color)]"
            />
            Salvar como padrão para próximos produtos
          </label>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={
              loading ||
              saving ||
              !result.valid ||
              (!product.id && !saveForNextProducts)
            }
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-[var(--primary-color)] disabled:opacity-50"
          >
            <Save size={15} />
            {saving ? "Salvando…" : "Salvar composição"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (result.valid && result.salePrice > 0) {
                onApplyPrice(result.salePrice);
                onClose();
              }
            }}
            disabled={loading || !result.valid || result.salePrice <= 0}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary-color)] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            <Check size={15} />
            Aplicar preço
          </button>
        </footer>
      </section>
    </div>
  );
}

function CostInput({
  label,
  component,
  onChange,
  result,
}: {
  label: string;
  component: AcquisitionComponent;
  onChange: (mode: AcquisitionComponent["mode"], value: number) => void;
  result: number;
}) {
  return (
    <label className="space-y-1 text-xs font-semibold">
      <span>{label}</span>
      <div className="grid grid-cols-[90px_1fr] gap-2">
        <select
          aria-label={`Unidade de ${label}`}
          className={field}
          value={component.mode}
          onChange={(event) =>
            onChange(
              event.target.value as AcquisitionComponent["mode"],
              component.value,
            )
          }
        >
          <option value="AMOUNT">R$</option>
          <option value="PERCENT">%</option>
        </select>
        {component.mode === "AMOUNT" ? (
          <MoneyInput
            value={component.value}
            onChange={(value) => onChange("AMOUNT", value)}
          />
        ) : (
          <PercentInput
            value={component.value}
            onChange={(value) => onChange("PERCENT", value)}
          />
        )}
      </div>
      <small className="block font-normal text-slate-500">
        No custo: {money(result)}
      </small>
    </label>
  );
}

function MoneyInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="relative">
      <span className="absolute inset-y-0 left-3 flex items-center text-xs text-slate-500">
        R$
      </span>
      <input
        aria-label="Valor em reais"
        className={`${field} pl-10`}
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        value={value === 0 ? "" : value}
        onChange={(event) =>
          onChange(event.target.value === "" ? 0 : Number(event.target.value))
        }
      />
    </div>
  );
}

function PercentInput({
  value,
  onChange,
  max = 100,
}: {
  value: number;
  onChange: (value: number) => void;
  max?: number;
}) {
  return (
    <div className="relative">
      <input
        aria-label="Percentual"
        className={`${field} pr-8`}
        type="number"
        min="0"
        max={max}
        step="0.01"
        inputMode="decimal"
        value={value === 0 ? "" : value}
        onChange={(event) =>
          onChange(event.target.value === "" ? 0 : Number(event.target.value))
        }
      />
      <span className="absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">
        %
      </span>
    </div>
  );
}
