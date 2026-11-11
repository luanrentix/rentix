import { apiFetch } from "./api";
import { downloadReportWorkbook, escapeReport } from "./sales-report";

export type ReportDefinition = {
  id: string;
  title: string;
  group: string;
  permission: string;
};
export type ManagementReport = {
  title: string;
  company: string;
  user: string;
  generatedAt: string;
  timeZone: string;
  filters: Record<string, string | number>;
  permission: string;
  columns: string[];
  rows: (string | number | null)[][];
  count: number;
  page: number;
  pageSize: number;
  totals?: Record<string, string>;
  warnings?: string[];
};
export const getReportCatalog = () =>
  apiFetch<ReportDefinition[]>("/relatorios-gerenciais", { skipCache: true });
export const getManagementReport = (
  kind: string,
  filters: Record<string, string>,
) =>
  apiFetch<ManagementReport>(
    `/relatorios-gerenciais/${encodeURIComponent(kind)}?${new URLSearchParams(filters)}`,
    { skipCache: true },
  );
export const reportMetadata = (r: ManagementReport) => [
  ["Empresa", r.company],
  ["Relatório", r.title],
  ["Período", `${r.filters.start} a ${r.filters.end}`],
  ["Usuário", r.user],
  [
    "Gerado em",
    new Date(r.generatedAt).toLocaleString("pt-BR", { timeZone: r.timeZone }),
  ],
  [
    "Filtros",
    Object.entries(r.filters)
      .filter(([k]) => !["page", "action"].includes(k))
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · "),
  ],
];
export function managementReportHtml(r: ManagementReport) {
  const e = escapeReport;
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>${e(r.title)}</title><style>@page{size:A4 landscape;margin:12mm}body{font:11px Arial;color:#172033;padding:20px}table{width:100%;border-collapse:collapse}td,th{padding:7px;border-bottom:1px solid #ddd;text-align:left;overflow-wrap:anywhere}thead{display:table-header-group}tr{break-inside:avoid}th{background:#eee}h1{font-size:20px}</style><h1>${e(r.title)}</h1>${reportMetadata(
    r,
  )
    .map(([k, v]) => `<p><strong>${e(k)}:</strong> ${e(v)}</p>`)
    .join(
      "",
    )}${(r.warnings || []).map((w) => `<p>${e(w)}</p>`).join("")}<table><thead><tr>${r.columns.map((c) => `<th>${e(c)}</th>`).join("")}</tr></thead><tbody>${r.rows.map((row) => `<tr>${row.map((v) => `<td>${e(v ?? "Indisponível")}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${r.columns.length}">Sem registros para os filtros.</td></tr>`}</tbody></table>${Object.entries(
    r.totals || {},
  )
    .map(([k, v]) => `<p><strong>${e(k)}:</strong> ${e(v)}</p>`)
    .join(
      "",
    )}<p>Contrx · Documento gerencial, não fiscal · ${r.count} linhas</p></html>`;
}
export function downloadManagementWorkbook(r: ManagementReport) {
  const numeric =
    /quantidade|bruto|líquido|desconto|devoluç|compensaç|unitário|subtotal|total documento|participação|acumulado|estoque|mínimo|custo|lucro|valor|saldo|entradas|saídas|original|principal|ticket|variação|faturamento|acréscimo|juros|1–30|31–60|61–90|acima de 90|total vencido/i;
  const rows = r.rows.map((row) =>
    row.map((value, index) =>
      typeof value === "string" &&
      numeric.test(r.columns[index]) &&
      /^-?\d+(\.\d+)?$/.test(value)
        ? Number(value)
        : value,
    ),
  );
  return downloadReportWorkbook(
    [
      ...reportMetadata(r),
      ...(r.warnings || []).map((w) => ["Observação", w]),
      [],
      r.columns,
      ...rows,
      [],
      ...Object.entries(r.totals || {}).map(([key, value]) => [
        key,
        /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value,
      ]),
    ],
    `relatorio-${r.filters.start}-${r.filters.end}.xlsx`,
  );
}
