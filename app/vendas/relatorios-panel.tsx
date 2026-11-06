"use client";
import { authorizeAction } from "@/services/authorize-action";

import { buildSalesReport, downloadSalesWorkbook } from "@/services/sales-report";
import CashReportModal from "./cash-report-modal";
import { getSalesOrderDetails } from "@/services/vendas.service";
import { useEffect, useMemo, useState } from "react";
import type { SalesOrder, SalesProduct, SalesReceivingAccount } from "@/services/vendas.service";

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const methods = [
  ["DINHEIRO", "Dinheiro"],
  ["PIX", "Pix"],
  ["CARTAO_DEBITO", "Débito"],
  ["CARTAO_CREDITO", "Crédito"],
  ["CREDIARIO", "Crediário"],
  ["SALDO_CLIENTE", "Crédito da loja"],
] as const;
const field = "rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm";

export default function SalesReportsPanel({
  orders,
  products = [],
  accounts = [],
}: {
  orders: SalesOrder[];
  products?: SalesProduct[];
  accounts?: SalesReceivingAccount[];
}) {
  const [kind, setKind] = useState("SALES");
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const [status, setStatus] = useState("");
  const [number, setNumber] = useState("");
  const [method, setMethod] = useState("");
  const [product, setProduct] = useState("");
  const [category, setCategory] = useState("");
  const [account, setAccount] = useState("");
  const [operator, setOperator] = useState("");
  const [minimum, setMinimum] = useState("");
  const [maximum, setMaximum] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("newest");
  const [complete, setComplete] = useState(false);
  const [html, setHtml] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [customer, setCustomer] = useState("");
  const [seller, setSeller] = useState("");
  const [supplier, setSupplier] = useState("");
  const sales = useMemo(
    () =>
      orders.filter((order) => {
        const date = new Date(order.completedAt || order.createdAt);
        const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        return (
          (kind === "SALES" ? ["VENDA", "TROCA"].includes(order.saleType) && order.status !== "EM_ANDAMENTO" : kind === "ACTIVE" ? order.status === "EM_ANDAMENTO" : !kind || order.saleType === kind || order.originType === kind) &&
          (!status || order.status === status) &&
          (!number || String(order.number) === number) &&
          (!method || order.paymentMethod === method || (order.paymentMethod === "MISTO" && Number(order.paymentDetails?.[method] ?? order.paymentDetails?.[method === "CARTAO_DEBITO" ? "DEBITO" : method === "CARTAO_CREDITO" ? "CREDITO" : method]) > 0)) &&
          (!product || order.items.some((item) => item.name.toLocaleLowerCase("pt-BR").includes(product.toLocaleLowerCase("pt-BR")))) &&
          (!category || order.items.some((item) => products.find((product) => product.id === item.productId)?.category === category)) &&
          (!account || order.bankAccountId === account) && (!operator || order.operatorId === operator) &&
          (!minimum || Number(order.total) >= Number(minimum)) && (!maximum || Number(order.total) <= Number(maximum)) &&
          (!start || localDate >= start) &&
          (!end || localDate <= end) &&
          (!customer || order.customerName === customer) &&
          (!seller || order.sellerName === seller) &&
          (!supplier ||
            [...order.items, ...(order.returnedItems || [])].some(
              (item) => item.supplierName === supplier,
            ))
        );
      }),
    [orders, start, end, customer, seller, supplier, kind, status, number, method, product, minimum, maximum, category, account, operator, products],
  );
  const suppliers = [
    ...new Set(
      orders.flatMap((order) =>
        [...order.items, ...(order.returnedItems || [])]
          .map((item) => item.supplierName)
          .filter((name): name is string => Boolean(name)),
      ),
    ),
  ].sort();
  const validSales = sales.filter((order) => !["CANCELADA", "ESTORNADA"].includes(order.status));
  const total = validSales.reduce(
    (sum, order) => sum + Number(order.total) - Number(order.debtOffset || 0),
    0,
  );
  const commission = validSales.reduce(
    (sum, order) => sum + Number(order.commissionTotal || 0),
    0,
  );
  const sortedSales = [...sales].sort((a, b) => sort === "value" ? Number(b.total) - Number(a.total) : sort === "oldest" ? a.number - b.number : b.number - a.number);
  const pages = Math.max(1, Math.ceil(sortedSales.length / 25));
  const currentPage = Math.min(page, pages);
  async function exportReport(excel: boolean) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      await authorizeAction("sales", excel ? "export" : "print");
      if (start && end && start > end) throw new Error("Período inválido.");
      const data: SalesOrder[] = [];
      for (let offset = 0; offset < sortedSales.length; offset += 10) data.push(...(complete ? await Promise.all(sortedSales.slice(offset, offset + 10).map((order) => getSalesOrderDetails(order.id))) : sortedSales.slice(offset, offset + 10)));
      if (excel) await downloadSalesWorkbook(data, complete);
      else setHtml(buildSalesReport(data, complete, [start, end, kind, status, number, customer, seller, supplier, method, product, minimum, maximum, category, account, operator].filter(Boolean).join(" · ")));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível gerar relatório."); }
    finally { setBusy(false); }
  }
  return (
    <section className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <label className="grid gap-1 text-xs font-bold">Categoria atual<select className={field} value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Todas</option>{[...new Set(products.map((product) => product.category).filter((value): value is string => Boolean(value)))].sort().map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-bold">Caixa / conta<select className={field} value={account} onChange={(event) => setAccount(event.target.value)}><option value="">Todos</option>{[...new Set(orders.map((order) => order.bankAccountId).filter((value): value is string => Boolean(value)))].map((id) => <option key={id} value={id}>{accounts.find((account) => account.id === id)?.name || id}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-bold">Último operador (ID)<select className={field} value={operator} onChange={(event) => setOperator(event.target.value)}><option value="">Todos</option>{[...new Set(orders.map((order) => order.operatorId).filter((value): value is string => Boolean(value)))].map((id) => <option key={id}>{id}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-bold">Tipo<select className={field} value={kind} onChange={(event) => { setKind(event.target.value); setPage(1); }}><option value="SALES">Vendas / trocas</option><option value="ORCAMENTO">Orçamentos</option><option value="CONDICIONAL">Condicionais</option><option value="ACTIVE">Em andamento</option><option value="PEDIDO">Pedidos</option><option value="">Todos</option></select></label>
        <label className="grid gap-1 text-xs font-bold">Situação<select className={field} value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todas</option>{["CONCLUIDA", "EM_ANDAMENTO", "CANCELADA", "ESTORNADA"].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-bold">Número<input className={field} value={number} onChange={(event) => setNumber(event.target.value)}/></label>
        <label className="grid gap-1 text-xs font-bold">Pagamento<select className={field} value={method} onChange={(event) => setMethod(event.target.value)}><option value="">Todos</option>{methods.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="grid gap-1 text-xs font-bold">Produto<input className={field} value={product} onChange={(event) => setProduct(event.target.value)}/></label>
        <label className="grid gap-1 text-xs font-bold">Valor mínimo<input className={field} type="number" step="0.01" value={minimum} onChange={(event) => setMinimum(event.target.value)}/></label>
        <label className="grid gap-1 text-xs font-bold">Valor máximo<input className={field} type="number" step="0.01" value={maximum} onChange={(event) => setMaximum(event.target.value)}/></label>
        <label className="grid gap-1 text-xs font-bold">Ordenação<select className={field} value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Mais recentes</option><option value="oldest">Mais antigas</option><option value="value">Maior valor</option></select></label>
      </div>
      <div className="flex flex-wrap items-center gap-3"><label><input type="checkbox" checked={complete} onChange={(event) => setComplete(event.target.checked)}/> Relatório completo</label><button disabled={busy} type="button" className="rounded-xl border px-4 py-2" onClick={() => void exportReport(false)}>{busy ? "Gerando..." : "Visualizar / imprimir / PDF"}</button><button disabled={busy} type="button" className="rounded-xl border px-4 py-2" onClick={() => void exportReport(true)}>Exportar Excel</button></div>
      {error && <p role="alert" className="text-red-600">{error}</p>}
      <p className="text-xs text-slate-500">Cancelados e estornados não integram os totais. Orçamentos e condicionais não representam recebimentos. Conversão, expiração e quantidades históricas não são presumidas quando não registradas.</p>
      {html && <CashReportModal title="Relatório de vendas" html={html} onClose={() => setHtml(null)}/>}

      <div className="flex flex-wrap gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <label className="grid gap-1 text-xs font-bold">
          De
          <input
            type="date"
            className={field}
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-xs font-bold">
          Até
          <input
            type="date"
            className={field}
            value={end}
            min={start}
            onChange={(event) => setEnd(event.target.value)}
          />
        </label>
        <label className="grid gap-1 text-xs font-bold">
          Cliente
          <select
            className={field}
            value={customer}
            onChange={(event) => setCustomer(event.target.value)}
          >
            <option value="">Todos</option>
            {[...new Set(orders.map((order) => order.customerName))]
              .sort()
              .map((name) => (
                <option key={name}>{name}</option>
              ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-bold">
          Vendedor
          <select
            className={field}
            value={seller}
            onChange={(event) => setSeller(event.target.value)}
          >
            <option value="">Todos</option>
            {[...new Set(orders.map((order) => order.sellerName))]
              .sort()
              .map((name) => (
                <option key={name}>{name}</option>
              ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs font-bold">
          Fornecedor
          <select
            className={field}
            value={supplier}
            onChange={(event) => setSupplier(event.target.value)}
          >
            <option value="">Todos</option>
            {suppliers.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
      </div>
      {supplier && (
        <p className="text-xs text-slate-600 dark:text-slate-300">
          O filtro seleciona vendas que contêm produtos do fornecedor. Os totais
          consideram o documento inteiro.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Documentos válidos", String(validSales.length)],
          [kind === "SALES" ? "Total vendido" : "Total dos documentos", money(total)],
          ["Ticket médio", money(validSales.length ? total / validSales.length : 0)],
          ["Descontos", money(validSales.reduce((sum, order) => sum + Number(order.discount), 0))],
          ["Comissão apurada", money(commission)],
        ].map(([label, value]) => (
          <article key={label} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
              {label}
            </p>
            <strong className="mt-2 block text-2xl font-black tracking-tight text-slate-900 dark:text-white">{value}</strong>
          </article>
        ))}
      </div>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {kind === "ORCAMENTO" && <p className="mb-3 text-sm">Conversão registrada: {sales.length ? (sales.filter((order) => order.originType === "ORCAMENTO" && order.saleType === "VENDA" && order.status === "CONCLUIDA").length * 100 / sales.length).toFixed(1) : "0,0"}%. Conversões antigas sem tipo de origem registrado não são incluídas.</p>}
        {kind === "CONDICIONAL" && <p className="mb-3 text-sm">Quantidades registradas — enviadas: {sales.reduce((sum, order) => sum + (order.conditionalSummary?.sent || 0), 0)} · devolvidas: {sales.reduce((sum, order) => sum + (order.conditionalSummary?.returned || 0), 0)} · vendidas: {sales.reduce((sum, order) => sum + (order.conditionalSummary?.sold || 0), 0)} · pendentes: {sales.reduce((sum, order) => sum + (order.conditionalSummary?.pending || 0), 0)}. A apuração depende dos eventos de reserva preservados.</p>}
        <h2 className="font-black">Distribuição por forma de pagamento</h2>
        <div className="mt-3 divide-y">
          {methods.map(([method, label]) => {
            const alias =
              method === "CARTAO_DEBITO"
                ? "DEBITO"
                : method === "CARTAO_CREDITO"
                  ? "CREDITO"
                  : method;
            const amount = validSales.reduce(
              (sum, order) =>
                sum -
                (method === "CREDIARIO" ? Number(order.debtOffset || 0) : 0) +
                (order.paymentMethod === "MISTO"
                  ? Number(
                      order.paymentDetails?.[method] ??
                        order.paymentDetails?.[alias] ??
                        0,
                    )
                  : (
                        Number(order.total) < 0 &&
                        order.returnDisposition === "CREDIT"
                          ? method === "SALDO_CLIENTE"
                          : order.paymentMethod === method
                      )
                    ? Number(order.total)
                    : 0),
              0,
            );
            return (
              <div key={method} className="flex justify-between py-2 text-sm">
                <span>{label}</span>
                <strong>{money(amount)}</strong>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Pagamentos mistos são distribuídos entre suas formas. Valores
          representam a composição da venda; liquidações posteriores do
          crediário são consultadas em Contas a Receber.
        </p>
      </section>
      <section className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-6 py-4">Venda</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Vendedor</th>
              <th className="px-6 py-4">Total</th>
              <th className="px-6 py-4">Comissão</th>
            </tr>
          </thead>
          <tbody>
            {sortedSales.slice((currentPage - 1) * 25, currentPage * 25).map((order) => (
              <tr key={order.id} className="border-t border-slate-100 hover:bg-slate-50/70 dark:border-slate-800 dark:hover:bg-slate-800/50">
                <td className="p-2">
                  #{order.number}
                  <small className="block text-slate-500 dark:text-slate-400">
                    {new Date(
                      order.completedAt || order.createdAt,
                    ).toLocaleDateString("pt-BR")}
                  </small>
                </td>
                <td className="p-2">{order.customerName}<small className="block">{order.saleType} · {order.status}{order.status === "EM_ANDAMENTO" ? ` · ${Math.max(0, Math.floor((clock - Date.parse(order.createdAt)) / 60000))} min em aberto` : ""}</small></td>
                <td className="p-2">{order.sellerName}</td>
                <td className="p-2">
                  {money(Number(order.total) - Number(order.debtOffset || 0))}
                </td>
                <td className="p-2">
                  {money(Number(order.commissionTotal || 0))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!sales.length && (
          <p className="p-5 text-center text-slate-500 dark:text-slate-400">
            Nenhuma venda no período e filtros selecionados.
          </p>
        )}
      </section>
      <div className="flex justify-end gap-3"><span>{sales.length} documentos · Página {currentPage} de {pages}</span><button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Anterior</button><button type="button" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>Próxima</button></div>
    </section>
  );
}
