"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useAuth } from "@/context/AuthContext";
import CashReportModal from "@/app/vendas/cash-report-modal";
import {
  getReportCatalog,
  getManagementReport,
  managementReportHtml,
  downloadManagementWorkbook,
  type ManagementReport,
  type ReportDefinition,
} from "@/services/management-reports";

const field =
  "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900";
const button =
  "rounded-xl border px-4 py-2 text-sm font-bold disabled:opacity-50";
function initialFilters() {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Manaus",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return { start: `${today.slice(0, 7)}-01`, end: today };
}
export default function RetailReportsCenter() {
  const { user } = useAuth();
  return <ReportsContent key={`${user?.companyId}:${user?.id}`} />;
}
function ReportsContent() {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState<ReportDefinition[]>([]);
  const [kind, setKind] = useState("");
  const [filters, setFilters] =
    useState<Record<string, string>>(initialFilters);
  const [report, setReport] = useState<ManagementReport | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
  const invalidate = useCallback(() => {
    request.current++;
  }, []);
  useEffect(() => {
    let active = true;
    getReportCatalog()
      .then((items) => {
        if (active) {
          setCatalog(items);
          setKind("");
          setReport(null);
          setHtml(null);
        }
      })
      .catch((e: Error) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
      invalidate();
    };
  }, [user?.companyId, invalidate]);
  const selected = catalog.find((r) => r.id === kind);
  const stock = kind.startsWith("stock");
  const sales = selected?.permission === "sales" && !stock;
  const productReport = ["products", "top-products", "abc"].includes(kind);
  function update(name: string, value: string) {
    request.current++;
    setFilters((f) => ({ ...f, [name]: value }));
    setReport(null);
    setHtml(null);
  }
  async function generate(action = "view", page = 1) {
    const version = ++request.current;
    setBusy(true);
    setError("");
    try {
      const data = await getManagementReport(kind, {
        ...Object.fromEntries(
          Object.entries(filters).filter(([, v]) => v !== ""),
        ),
        action,
        page: String(page),
      });
      if (version !== request.current) return;
      if (action === "export") await downloadManagementWorkbook(data);
      else if (action === "print") setHtml(managementReportHtml(data));
      else setReport(data);
    } catch (e) {
      if (version === request.current)
        setError(
          e instanceof Error
            ? e.message
            : "Não foi possível gerar o relatório.",
        );
    } finally {
      setBusy(false);
    }
  }
  const input = (name: string, label: string, type = "text") => (
    <label key={name} className="grid gap-1 text-xs font-bold">
      {label}
      <input
        className={field}
        type={type}
        value={filters[name] || ""}
        onChange={(e) => update(name, e.target.value)}
      />
    </label>
  );
  const select = (name: string, label: string, options: [string, string][]) => (
    <label className="grid gap-1 text-xs font-bold">
      {label}
      <select
        className={field}
        value={filters[name] || ""}
        onChange={(e) => update(name, e.target.value)}
      >
        {options.map(([value, title]) => (
          <option key={value} value={value}>
            {title}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-black">
          Central de relatórios gerenciais
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Dados da empresa autenticada · consultas de leitura · valores
          monetários em reais · fuso America/Manaus
        </p>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {["Vendas", "Estoque", "Financeiros", "Gerenciais", "Operacionais"].map(
          (group) => (
            <section
              key={group}
              className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <h2 className="mb-3 font-black">{group}</h2>
              <div className="flex flex-wrap gap-2">
                {catalog
                  .filter((r) => r.group === group)
                  .map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      disabled={busy}
                      aria-pressed={kind === r.id}
                      className={`${button} ${kind === r.id ? "bg-[var(--primary-color)] text-white" : ""}`}
                      onClick={() => {
                        request.current++;
                        setKind(r.id);
                        setFilters(initialFilters());
                        setReport(null);
                        setHtml(null);
                        setError("");
                      }}
                    >
                      {r.title}
                    </button>
                  ))}
              </div>
              {group === "Gerenciais" && (
                <p className="text-sm text-slate-500">
                  Lucro, margem, rentabilidade e DRE completos dependem de custo
                  histórico ausente. Consulte vendas por período e cliente para
                  os indicadores disponíveis.
                </p>
              )}
              {group === "Operacionais" && (
                <Link
                  className="mt-3 inline-block text-sm underline"
                  href="/vendas?view=CAIXA"
                >
                  Caixa, livro de movimentos e estornos existentes
                </Link>
              )}
            </section>
          ),
        )}
      </div>
      {selected && (
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-black">{selected.title}</h2>
          <p className="text-xs text-slate-500">
            {stock &&
            !["stock-movements", "stock-balance", "stock-inactive"].includes(
              kind,
            )
              ? "Posição atual: o período identifica a emissão e não reconstitui estoque histórico."
              : "Gere o relatório para consultar os dados e as limitações da fonte."}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {input("start", "Data inicial", "date")}
            {input("end", "Data final", "date")}
            {sales &&
              kind !== "credits" &&
              input("seller", "Vendedor (nome contém)")}
            {(sales || ["receivables", "receipts", "overdue"].includes(kind)) &&
              input("customer", "Cliente (nome contém)")}
            {(stock || (sales && kind !== "credits")) && (
              <>
                {input("product", "Produto (nome contém)")}
                {input("brand", "Marca atual (exata)")}
                {input("productType", "Tipo atual (exato)")}
                {input("category", "Categoria atual (exata)")}
                {input("subcategory", "Subcategoria atual (exata)")}
                {input("supplier", "Fornecedor (nome contém)")}
              </>
            )}
            {sales && kind !== "credits" && (
              <>
                {input("minimum", "Valor mínimo do documento", "number")}
                {input("maximum", "Valor máximo do documento", "number")}
                {select("method", "Forma de pagamento", [
                  ["", "Todas"],
                  ["DINHEIRO", "Dinheiro"],
                  ["PIX", "Pix"],
                  ["CARTAO_DEBITO", "Débito"],
                  ["CARTAO_CREDITO", "Crédito"],
                  ["CREDIARIO", "Crediário"],
                  ["SALDO_CLIENTE", "Crédito de cliente"],
                ])}
              </>
            )}
            {["payables", "payments", "expenses-category"].includes(kind) && (
              <>
                {input("supplier", "Fornecedor (nome contém)")}
                {input("category", "Categoria financeira (exata)")}
              </>
            )}
            {kind === "revenue-category" &&
              input("category", "Categoria bancária (exata)")}
            {[
              "trial-balance",
              "cash-flow",
              "revenue-category",
              "financial-indicators",
            ].includes(kind) &&
              input("account", "Conta bancária (nome contém)")}
            {["receivables", "payables", "overdue"].includes(kind) &&
              select("status", "Situação atual", [
                ["", "Todas"],
                ["PAGO", "Pago"],
                ["PENDENTE", "Pendente"],
                ["PARCIAL", "Parcial"],
                ["VENCIDO", "Vencido"],
              ])}
            {[
              "sales-period",
              "revenue-evolution",
              "cash-flow",
              "projected-flow",
              "financial-indicators",
            ].includes(kind) &&
              select("group", "Agrupar", [
                ["day", "Dia"],
                ["month", "Mês"],
              ])}
            {kind === "sellers" &&
              select("group", "Agrupar", [
                ["seller", "Vendedor"],
                ["day", "Dia e vendedor"],
                ["month", "Mês e vendedor"],
              ])}
            {productReport &&
              select("metric", "Critério", [
                ["revenue", "Faturamento de saída"],
                ["quantity", "Quantidade"],
              ])}
            {kind === "top-products" &&
              select("top", "Limite", [
                ["0", "Todos"],
                ["10", "Top 10"],
                ["20", "Top 20"],
                ["50", "Top 50"],
              ])}
            {kind === "abc" && (
              <>
                {input("abcA", "Limite A (%) — padrão 80", "number")}
                {input("abcB", "Limite B (%) — padrão 95", "number")}
              </>
            )}
            {select("direction", "Ordem de apresentação", [
              ["asc", "Padrão"],
              ["desc", "Inverter"],
            ])}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={button}
              disabled={busy}
              onClick={() => void generate()}
            >
              {busy ? "Gerando…" : "Gerar relatório"}
            </button>
            <button
              className={button}
              disabled={busy || !report}
              onClick={() => void generate("print")}
            >
              Visualizar / imprimir / PDF
            </button>
            <button
              className={button}
              disabled={busy || !report}
              onClick={() => void generate("export")}
            >
              Exportar Excel
            </button>
            <button
              className={button}
              disabled={busy}
              onClick={() => {
                setFilters(initialFilters());
                setReport(null);
                setHtml(null);
                setError("");
              }}
            >
              Limpar filtros
            </button>
          </div>
        </section>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      {report && (
        <section className="space-y-4">
          <header>
            <h2 className="font-black">
              {report.company} · {report.title}
            </h2>
            <p className="text-xs text-slate-500">
              {String(report.filters.start)} a {String(report.filters.end)} ·{" "}
              {report.user} ·{" "}
              {new Date(report.generatedAt).toLocaleString("pt-BR", {
                timeZone: report.timeZone,
              })}
            </p>
          </header>
          {report.warnings?.map((w) => (
            <p
              key={w}
              className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900"
            >
              {w}
            </p>
          ))}
          <div className="overflow-auto rounded-xl border">
            <table className="w-full whitespace-nowrap text-left text-sm">
              <thead>
                <tr>
                  {report.columns.map((c) => (
                    <th key={c} className="border-b p-3">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((value, j) => (
                      <td key={j} className="border-b p-3">
                        {value ?? "Indisponível"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {!report.count && (
              <p className="p-4 text-sm">
                Sem registros para os filtros selecionados.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-4">
            {Object.entries(report.totals || {}).map(([label, value]) => (
              <p key={label} className="font-bold">
                {label}: {value}
              </p>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button
              className={button}
              disabled={busy || report.page <= 1}
              onClick={() => void generate("view", report.page - 1)}
            >
              Anterior
            </button>
            <span className="text-sm">
              Página {report.page} de{" "}
              {Math.max(1, Math.ceil(report.count / report.pageSize))} ·{" "}
              {report.count} linhas
            </span>
            <button
              className={button}
              disabled={busy || report.page * report.pageSize >= report.count}
              onClick={() => void generate("view", report.page + 1)}
            >
              Próxima
            </button>
          </div>
        </section>
      )}
      {report &&
        ["cash-flow", "projected-flow", "financial-indicators"].includes(
          kind,
        ) &&
        report.rows.length > 0 && (
          <section className="rounded-xl border p-4">
            <h2 className="mb-4 font-bold">Evolução do saldo — página atual</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={report.rows.map((row) => ({
                    period: row[0],
                    balance: Number(row[4]),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    name="Saldo em reais"
                    stroke="var(--primary-color)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}
      <aside className="rounded-xl border p-4 text-xs text-slate-500">
        Inventário físico e divergências dependem de contagens não registradas.
        Giro, cobertura, lucro e rentabilidade exigem validação de histórico e
        custo. Grupo/subgrupo e centro de custo não possuem cadastros próprios
        nesta fonte; categoria/subcategoria usam o cadastro atual. PDF
        disponível pelo destino “Salvar como PDF” da impressão.
      </aside>
      {html && selected && (
        <CashReportModal
          html={html}
          title={selected.title}
          permission={selected.permission}
          onClose={() => setHtml(null)}
        />
      )}
    </section>
  );
}
