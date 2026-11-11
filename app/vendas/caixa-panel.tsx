"use client";
import { authorizeAction } from "@/services/authorize-action";

import CashView from "./cash-view";
import CashReportModal from "./cash-report-modal";
import { buildCashReport } from "@/services/cash-report";
import { cashDay, cashDayBounds } from "@/services/cash-period";
import { useAuth } from "@/context/AuthContext";
import { getCachedCompanySettings } from "@/services/settings-cache";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createCashOperation,
  getCash,
  type CashData,
} from "@/services/caixa.service";

const labels: Record<string, string> = {
  CASH: "Dinheiro",
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  BANK_TRANSFER: "Transferência",
  BANK_SLIP: "Boleto",
  OTHER: "Outros",
};
const today = cashDay;

export default function SalesCashPanel() {
  const { user } = useAuth();
  const [reportHtml, setReportHtml] = useState<string | null>(null);
  const loadSequence = useRef(0);
  const [start, setStart] = useState(today),
    [end, setEnd] = useState(today);
  const lastDay = useRef(today());
  useEffect(() => {
    const checkDay = () => {
      const next = today();
      const previous = lastDay.current;
      if (next === previous) return;
      lastDay.current = next;
      if (start === previous && end === previous) {
        loadSequence.current++;
        setData(null);
        setStart(next);
        setEnd(next);
        setPage(1);
      }
    };
    const timer = window.setInterval(checkDay, 15000);
    const midnight = window.setTimeout(checkDay, Math.max(1, new Date(cashDayBounds(today(), today())[1]).getTime() + 1 - Date.now()));
    window.addEventListener("focus", checkDay);
    document.addEventListener("visibilitychange", checkDay);
    checkDay();
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(midnight);
      window.removeEventListener("focus", checkDay);
      document.removeEventListener("visibilitychange", checkDay);
    };
  }, [start, end]);
  const [data, setData] = useState<CashData | null>(null);
  const [busy, setBusy] = useState(false),
    [saving, setSaving] = useState(false);
  const [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [method, setMethod] = useState(""),
    [account, setAccount] = useState(""),
    [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<null | "IN" | "OUT">(null);
  const [amount, setAmount] = useState(""),
    [reason, setReason] = useState(""),
    [cashAccount, setCashAccount] = useState("");
  const [requestId, setRequestId] = useState("");
  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setBusy(true);
    setData(null);
    setError("");
    try {
      if (!start || !end || start > end)
        throw new Error("Informe um período válido.");
      const result = await getCash(...cashDayBounds(start, end));
      if (sequence === loadSequence.current) setData(result);
    } catch (error) {
      if (sequence === loadSequence.current) {
        setData(null);
        setError(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar o caixa.",
        );
      }
    } finally {
      if (sequence === loadSequence.current) setBusy(false);
    }
  }, [start, end, setData]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    setPage(1);
  }, [start, end, method, account, search]);
  const rows = useMemo(
    () =>
      (data?.movements || []).filter(
        (row) =>
          (!method || row.method === method) &&
          (!account || row.accountId === account) &&
          (!search ||
            `${row.description} ${row.customer || ""} ${row.orderNumber || ""} ${row.operator || ""}`
              .toLocaleLowerCase()
              .includes(search.toLocaleLowerCase())),
      ),
    [data, method, account, search],
  );
  useEffect(() => {
    setPage((current) =>
      Math.min(current, Math.max(1, Math.ceil(rows.length / 50))),
    );
  }, [rows.length]);
  const totals = useMemo(() => {
    const result: Record<string, { incoming: number; outgoing: number }> = {};
    for (const row of rows) {
      const item = (result[row.method] ??= { incoming: 0, outgoing: 0 });
      item[row.direction === "IN" ? "incoming" : "outgoing"] += Math.round(
        row.amount * 100,
      );
    }
    return result;
  }, [rows]);
  const incoming =
    rows
      .filter((r) => r.direction === "IN")
      .reduce((s, r) => s + Math.round(r.amount * 100), 0) / 100;
  const outgoing =
    rows
      .filter((r) => r.direction === "OUT")
      .reduce((s, r) => s + Math.round(r.amount * 100), 0) / 100;
  const cashAccounts =
    data?.accounts.filter((a) => a.type === "CASH" && a.active) || [];
  const open = (direction: "IN" | "OUT") => {
    setError("");
    setMessage("");
    setModal(direction);
    setAmount("");
    setReason("");
    setCashAccount(cashAccounts[0]?.id || "");
    setRequestId(crypto.randomUUID());
  };
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!modal || saving) return;
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0 || reason.trim().length < 3) {
      setError(
        "Informe um valor positivo e o motivo com pelo menos 3 caracteres.",
      );
      return;
    }
    setSaving(true);
    setError("");
    try {
      await createCashOperation({
        requestId,
        accountId: cashAccount || undefined,
        direction: modal,
        amount: value,
        reason: reason.trim(),
      });
      setModal(null);
      setMessage("Operação registrada e saldo atualizado.");
      await load();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível registrar a operação.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function exportCsv() {
    try { await authorizeAction("sales", "export"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Sem permissao para exportar."); return; }
    const values = [
      [
        "Data",
        "Operação",
        "Forma",
        "Entrada",
        "Saída",
        "Conta",
        "Venda",
        "Cliente",
        "Operador",
        "Motivo",
      ],
      ...rows.map((r) => [
        new Date(r.date).toLocaleString("pt-BR"),
        r.kind,
        labels[r.method] || r.method,
        r.direction === "IN" ? r.amount.toFixed(2) : "",
        r.direction === "OUT" ? r.amount.toFixed(2) : "",
        r.accountName,
        r.orderNumber || "",
        r.customer || "",
        r.operator || "",
        r.description,
      ]),
    ];
    const csv =
      "\uFEFF" +
      values
        .map((row) =>
          row
            .map(
              (v) =>
                `"${String(v)
                  .replace(/^[=+@\-\t\r]/, "'$&")
                  .replaceAll('"', '""')}"`,
            )
            .join(";"),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `caixa-${start}-${end}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
  function openReport() {
    if (!data || busy) return;
    setReportHtml(buildCashReport(rows, { start, end, method, account, search }, getCachedCompanySettings(user?.companyId) || {}, account ? data.accounts.find((item) => item.id === account)?.name || "Conta selecionada" : "Todas as contas", new Date()));
  }
  return (
    <>
    <CashView
      data={data}
      rows={rows}
      totals={totals}
      incoming={incoming}
      outgoing={outgoing}
      filters={{ start, end, method, account, search }}
      onFilter={(key, value) =>
        ({
          start: setStart,
          end: setEnd,
          method: setMethod,
          account: setAccount,
          search: setSearch,
        })[key](value)
      }
      busy={busy}
      saving={saving}
      error={error}
      message={message}
      page={page}
      onPage={setPage}
      modal={modal}
      modalFields={{ amount, reason, cashAccount }}
      onModalField={(key, value) =>
        ({ amount: setAmount, reason: setReason, cashAccount: setCashAccount })[
          key
        ](value)
      }
      onOpen={open}
      onClose={() => setModal(null)}
      onRefresh={() => void load()}
      onExport={exportCsv}
      onReport={openReport}
      onSave={save}
    />
    {reportHtml && <CashReportModal html={reportHtml} onClose={() => setReportHtml(null)} />}
    </>
  );
}
