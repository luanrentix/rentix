"use client";
import { useEffect, useState } from "react";
import {
  getSalesOrderDetails,
  type SalesOrder,
  type SalesOrderDetails,
} from "@/services/vendas.service";
const money = (value: string | number) =>
  Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export default function SaleDetailsModal({
  order,
  onClose,
  onReceipt,
}: {
  order: SalesOrder;
  onClose: () => void;
  onReceipt: (order: SalesOrder) => void;
}) {
  const [data, setData] = useState<SalesOrderDetails | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    getSalesOrderDetails(order.id)
      .then((result) => {
        if (current) setData(result);
      })
      .catch((cause) => {
        if (current)
          setError(
            cause instanceof Error
              ? cause.message
              : "Falha ao consultar venda.",
          );
      });
    return () => {
      current = false;
    };
  }, [order.id]);
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/60 p-3">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Detalhes da venda ${order.number}`}
        className="flex max-h-[94dvh] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-xl dark:bg-slate-900"
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
      >
        <header className="flex justify-between border-b p-5">
          <h2 className="text-xl font-black">Venda #{order.number}</h2>
          <button autoFocus type="button" onClick={onClose}>
            Fechar
          </button>
        </header>
        <div className="space-y-5 overflow-y-auto p-5">
          {error && (
            <p role="alert" className="text-red-600">
              {error}
            </p>
          )}
          {!data && !error && <p>Carregando detalhes...</p>}
          {data && (
            <>
              <p>
                <b>Cliente:</b> {data.customerName}
                <br />
                <b>Vendedor:</b> {data.sellerName}
                <br />
                <b>Situação:</b> {data.status} · {data.saleType}
                <br />
                <b>Pagamento:</b> {data.paymentMethod}
                <br />
                <b>Total:</b> {money(data.total)}
              </p>
              <h3 className="font-bold">Produtos</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Quantidade</th>
                      <th>Unitário</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item, index) => (
                      <tr key={index}>
                        <td>
                          {item.name} {item.variantName}
                        </td>
                        <td>{item.quantity}</td>
                        <td>{money(item.unitPrice)}</td>
                        <td>{money(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>
                Subtotal: {money(data.subtotal)} · Desconto:{" "}
                {money(data.discount)} · Acréscimo: {money(data.addition)}
              </p>
              <h3 className="font-bold">Pagamentos e parcelas</h3>
              {data.receivables.map((charge) => (
                <div key={charge.id} className="rounded-xl border p-3 text-sm">
                  <p>
                    Parcela {charge.installmentNumber || 1} ·{" "}
                    {money(charge.amount)} · Vencimento{" "}
                    {new Date(charge.dueDate).toLocaleDateString("pt-BR")}{" "}
                    {charge.cancelledAt && "· Cancelada"}
                  </p>
                  {charge.payments.map((payment) => (
                    <p key={payment.id}>
                      {new Date(payment.paidAt).toLocaleDateString("pt-BR")} ·{" "}
                      {payment.method} · {money(payment.amountPaid)}
                    </p>
                  ))}
                </div>
              ))}
              {!data.receivables.length && (
                <p>Sem recebimentos ou parcelas vinculados.</p>
              )}
              <h3 className="font-bold">Trocas e devoluções vinculadas</h3>
              {data.returns.map((item) => (
                <p key={item.id}>
                  #{item.number} · {item.status} · {money(item.total)}
                </p>
              ))}
              <h3 className="font-bold">Histórico</h3>
              {data.events.map((event) => (
                <p key={event.id} className="text-sm">
                  {new Date(event.createdAt).toLocaleString("pt-BR")} ·{" "}
                  {event.action}
                  {typeof event.details.reason === "string"
                    ? ` · ${event.details.reason}`
                    : ""}
                </p>
              ))}
              {data.notes && (
                <p className="whitespace-pre-wrap">{data.notes}</p>
              )}
            </>
          )}
        </div>
        <footer className="flex justify-end gap-3 border-t p-4">
          <button type="button" onClick={onClose}>
            Fechar
          </button>
          <button
            type="button"
            disabled={!data}
            onClick={() => data && onReceipt(data)}
            className="rounded-xl bg-[var(--primary-color)] px-4 py-2 font-bold text-white disabled:opacity-50"
          >
            Visualizar / reimprimir
          </button>
        </footer>
      </section>
    </div>
  );
}
