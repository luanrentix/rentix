"use client";

import {
  Banknote,
  CreditCard,
  Layers,
  QrCode,
  WalletCards,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type {
  SalesCustomer,
  SalesReceivingAccount,
} from "@/services/vendas.service";
import {
  installmentPreview,
  paymentAmount,
  paymentBreakdown,
  paymentCents,
  paymentLabels,
  type SalePaymentMethod,
  type SalePaymentParts,
} from "@/services/sales-payment";

const money = (value: number) =>
  Number.isFinite(value)
    ? value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : "—";
const field =
  "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-[var(--primary-color)] disabled:bg-slate-100 disabled:text-slate-400";
const paymentIcons: Record<SalePaymentMethod, LucideIcon> = {
  DINHEIRO: Banknote,
  PIX: QrCode,
  DEBITO: CreditCard,
  CREDITO: CreditCard,
  CREDIARIO: WalletCards,
  SALDO_CLIENTE: Wallet,
  MISTO: Layers,
};
export default function PaymentPanel(props: {
  onCardDetails: (method: "DEBITO" | "CREDITO") => void;
  cardPayments: import("@/services/sales-cards").SalesCardPayment[];
  method: SalePaymentMethod;
  onMethod: (value: SalePaymentMethod) => void;
  parts: SalePaymentParts;
  onParts: (value: SalePaymentParts) => void;
  total: number;
  customer?: SalesCustomer;
  creditBalance: number;
  accounts: SalesReceivingAccount[];
  installments: number;
  onInstallments: (value: number) => void;
  tender: string;
  onTender: (value: string) => void;
  saleType: string;
}) {
  const {
    method,
    parts,
    total,
    customer,
    creditBalance,
    accounts,
    installments,
    tender,
  } = props;
  const { amounts, remaining, immediate } = paymentBreakdown(
    method,
    parts,
    total,
  );
  const creditAllowed = Boolean(
    customer &&
    !customer.isSystem &&
    !customer.referenceOnly &&
    Boolean(customer.document?.trim()) &&
    Boolean(customer.address?.trim()) &&
    !customer.creditBlocked &&
    customer.creditDays &&
    Number(customer.creditLimit) > 0,
  );
  const storeCreditAllowed = Boolean(
    customer && !customer.isSystem && creditBalance > 0,
  );
  const installmentsList = installmentPreview(amounts.CREDIARIO, installments);
  if (["ORCAMENTO", "PEDIDO", "CONDICIONAL"].includes(props.saleType))
    return (
      <div className="my-5 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
        {props.saleType === "CONDICIONAL"
          ? "Os produtos ficarão reservados. O pagamento será definido ao converter este condicional em venda."
          : "O pagamento será definido na conversão em venda. Este documento não gera recebimento."}
      </div>
    );
  if (props.saleType === "TROCA")
    return (
      <p className="my-5 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
        Ao gravar, escolha no modal de troca como pagar ou devolver a diferença.
      </p>
    );
  return (
    <div className="space-y-3">
      <h2 className="text-xs font-black uppercase text-[var(--primary-color)]">
        Forma de pagamento
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(paymentLabels)
          .filter(([key]) => key !== "SALDO_CLIENTE")
          .map(([key, label]) => {
            const Icon = paymentIcons[key as SalePaymentMethod];
            return (
              <button
                key={key}
                type="button"
                aria-pressed={method === key}
                disabled={
                  (key === "CREDIARIO" && !creditAllowed) ||
                  (key === "SALDO_CLIENTE" && !storeCreditAllowed)
                }
                onClick={() => props.onMethod(key as SalePaymentMethod)}
                className={`flex min-h-9 items-center gap-2 rounded-lg border px-2 py-2 text-left text-[11px] font-bold disabled:cursor-not-allowed disabled:opacity-40 ${method === key ? "border-[var(--primary-color)] bg-[var(--primary-bg-light)] text-[var(--primary-color)] ring-1 ring-[var(--primary-color)]" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"}`}
                title={
                  key === "CREDIARIO" && !creditAllowed
                    ? "Exige cliente identificado, liberado, com limite e prazo cadastrados."
                    : key === "SALDO_CLIENTE" && !storeCreditAllowed
                      ? "Exige cliente identificado com crédito disponível."
                      : undefined
                }
              >
                <Icon className="h-4 w-4 shrink-0 text-[var(--primary-color)]" />
                {key === "DEBITO"
                  ? "Débito"
                  : key === "CREDITO"
                    ? "Crédito"
                    : key === "MISTO"
                      ? "Misto"
                      : label}
              </button>
            );
          })}
      </div>
      <section aria-label="Resumo do pagamento" className="space-y-2 pt-5 pb-2">
        <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-100">
          Resumo do pagamento
        </h3>
        {Object.entries(amounts)
          .filter(([, value]) => value > 0)
          .map(([key, value]) => (
            <div
              key={key}
              className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300"
            >
              <span>{paymentLabels[key as SalePaymentMethod]}</span>
              <strong className="whitespace-nowrap">{money(value)}</strong>
            </div>
          ))}
        {total <= 0 && (
          <p className="text-xs text-slate-500">Nenhum valor a receber.</p>
        )}
      </section>
      <details
        key={method}
        open={
          method === "MISTO" ||
          method === "CREDIARIO" ||
          method === "SALDO_CLIENTE" ||
          immediate > 0
        }
        className="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700"
      >
        <summary className="cursor-pointer text-[11px] font-bold text-[var(--primary-color)]">
          Dados do pagamento e recebimento
        </summary>
        <div className="mt-3 space-y-3">
          <button
            type="button"
            disabled={!storeCreditAllowed}
            onClick={() => props.onMethod("SALDO_CLIENTE")}
            className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40 dark:border-slate-700"
          >
            <Wallet className="h-4 w-4" />
            Usar crédito do cliente
          </button>
          {(method === "DEBITO" || method === "CREDITO") && (
            <button
              type="button"
              onClick={() => props.onCardDetails(method)}
              className="w-full rounded-lg border border-[var(--primary-color)] p-3 text-left text-xs text-[var(--primary-color)]"
            >
              {props.cardPayments.find(
                (item) =>
                  item.method ===
                  (method === "DEBITO" ? "CARTAO_DEBITO" : "CARTAO_CREDITO"),
              )?.administratorName ||
                "Selecionar administradora e informar cartão"}{" "}
              · Editar dados
            </button>
          )}
          {method === "MISTO" && (
            <button
              type="button"
              className="text-xs font-semibold text-[var(--primary-color)]"
              onClick={() =>
                props.onParts(
                  Object.fromEntries(
                    Object.keys(parts).map((key) => [key, "0,00"]),
                  ) as SalePaymentParts,
                )
              }
            >
              Limpar divisão
            </button>
          )}
          {method === "MISTO" && (
            <div className="space-y-3 rounded-lg border bg-slate-50/75 dark:bg-slate-800/50 p-3">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Distribua o total. Use “Restante” para completar uma forma.
              </p>
              {Object.entries(parts).map(([key, value]) => {
                const disabled =
                  (key === "CREDIARIO" && !creditAllowed) ||
                  (key === "SALDO_CLIENTE" && !storeCreditAllowed);
                return (
                  <div key={key}>
                    <label
                      className="block text-xs font-semibold text-slate-600 dark:text-slate-300"
                      htmlFor={`pay-${key}`}
                    >
                      {paymentLabels[key as SalePaymentMethod]}
                    </label>
                    <div className="mt-1 flex gap-1">
                      <input
                        id={`pay-${key}`}
                        inputMode="decimal"
                        className={`${field} min-w-0 text-right`}
                        value={value}
                        disabled={disabled}
                        onChange={(event) =>
                          props.onParts({ ...parts, [key]: event.target.value })
                        }
                        onFocus={(event) => event.target.select()}
                        onBlur={() => {
                          const amount = paymentAmount(value);
                          if (Number.isFinite(amount))
                            props.onParts({
                              ...parts,
                              [key]: amount.toFixed(2).replace(".", ","),
                            });
                        }}
                      />
                      <button
                        type="button"
                        className="text-xs font-semibold text-[var(--primary-color)] disabled:opacity-40"
                        disabled={disabled || !Number.isFinite(remaining)}
                        onClick={() => {
                          const others = Object.entries(parts)
                            .filter(([method]) => method !== key)
                            .reduce(
                              (sum, [, amount]) =>
                                sum + paymentCents(paymentAmount(amount)),
                              0,
                            );
                          props.onParts({
                            ...parts,
                            [key]: (
                              Math.max(0, paymentCents(total) - others) / 100
                            )
                              .toFixed(2)
                              .replace(".", ","),
                          });
                        }}
                      >
                        Restante
                      </button>
                    </div>
                    {(key === "DEBITO" || key === "CREDITO") &&
                      paymentAmount(value) > 0 && (
                        <button
                          type="button"
                          className="mt-1 text-xs font-bold text-[var(--primary-color)]"
                          onClick={() => props.onCardDetails(key)}
                        >
                          Administradora / dados do cartão
                        </button>
                      )}
                  </div>
                );
              })}
              <p
                role="status"
                className={`text-sm font-bold ${remaining === 0 ? "text-green-700" : "text-red-700"}`}
              >
                {remaining === 0
                  ? "Total distribuído"
                  : remaining > 0
                    ? `Falta distribuir ${money(remaining)}`
                    : remaining < 0
                      ? `Excesso de ${money(-remaining)}`
                      : "Confira os valores informados"}
              </p>
            </div>
          )}
          {amounts.DINHEIRO > 0 && (
            <div className="space-y-2 rounded-lg border bg-slate-50/75 dark:bg-slate-800/50 p-3">
              <label className="block text-xs font-semibold">
                Dinheiro entregue (R$)
                <input
                  className={`${field} mt-1 text-right`}
                  inputMode="decimal"
                  placeholder={amounts.DINHEIRO.toFixed(2).replace(".", ",")}
                  value={tender}
                  onChange={(event) => props.onTender(event.target.value)}
                />
              </label>
              <p className="text-sm font-bold">
                Troco:{" "}
                {money(
                  Math.max(
                    0,
                    Math.round(
                      ((tender.trim()
                        ? paymentAmount(tender)
                        : amounts.DINHEIRO) -
                        amounts.DINHEIRO) *
                        100,
                    ) / 100,
                  ),
                )}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                O caixa recebe {money(amounts.DINHEIRO)}. O troco não aumenta o
                valor da venda.
              </p>
            </div>
          )}
          {method === "PIX" && (
            <p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
              Confirme o recebimento do Pix antes de gravar a venda.
            </p>
          )}
          {(method === "DEBITO" || method === "CREDITO") && (
            <p className="rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
              Confirme a aprovação na maquininha. O parcelamento do cartão é
              feito na operadora; as parcelas desta tela são exclusivas do
              crediário.
            </p>
          )}
          {immediate > 0 && (
            <div className="rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-700">
              <p className="font-bold">Conta padrão de vendas</p>
              <p className="mt-1 text-slate-600 dark:text-slate-300">
                {accounts[0]?.name || "VENDAS - PADRAO AUTOMATICO"} ·{" "}
                {money(immediate)}
                será registrado automaticamente nesta conta.
              </p>
            </div>
          )}
          {amounts.CREDIARIO > 0 && (
            <div className="space-y-2 rounded-lg border p-3">
              <label className="block text-xs font-bold">
                Parcelas do crediário
                <input
                  className={`${field} mt-1`}
                  type="number"
                  min="1"
                  max="60"
                  value={installments || ""}
                  onChange={(event) =>
                    props.onInstallments(Number(event.target.value))
                  }
                />
              </label>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Prazo entre parcelas: {customer?.creditDays || "não cadastrado"}{" "}
                dias. Limite cadastrado:{" "}
                {money(Number(customer?.creditLimit || 0))}. Débitos existentes
                serão considerados ao gravar.
              </p>
              <ol className="max-h-40 overflow-auto text-xs text-slate-600 dark:text-slate-300">
                {installmentsList.map((amount, index) => {
                  const date = new Date();
                  date.setUTCDate(
                    date.getUTCDate() +
                      (customer?.creditDays || 0) * (index + 1),
                  );
                  return (
                    <li key={index} className="flex justify-between py-1">
                      <span>
                        {index + 1}ª · {date.toLocaleDateString("pt-BR")}
                      </span>
                      <strong>{money(amount)}</strong>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {creditBalance > 0 ? (
              <>
                Este cliente possui <strong>{money(creditBalance)}</strong> de
                crédito disponível para utilização.
              </>
            ) : (
              <>
                Crédito disponível do cliente:{" "}
                <strong>{money(creditBalance)}</strong>
              </>
            )}
          </p>
          {amounts.SALDO_CLIENTE > 0 && (
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Utilizar {money(amounts.SALDO_CLIENTE)} do crédito. Saldo após a
              venda: {money(creditBalance - amounts.SALDO_CLIENTE)}. Esta
              compensação não gera entrada no caixa.
            </p>
          )}
          {!creditAllowed && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {customer?.referenceOnly
                ? "Cliente apenas referência não pode comprar a prazo. Complete o cadastro e desmarque essa opção para liberar o crediário."
                : "Crediário exige cadastro completo e liberado, com prazo e limite cadastrados."}
            </p>
          )}
        </div>
      </details>
    </div>
  );
}
