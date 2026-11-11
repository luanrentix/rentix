"use client";
import { useEffect, useState } from "react";
import SalesReportsPanel from "./relatorios-panel";
import {
  getSalesOrders,
  type SalesOrder,
  type SalesProduct,
  type SalesReceivingAccount,
} from "@/services/vendas.service";

export default function LegacyReports({
  products,
  accounts,
}: {
  products: SalesProduct[];
  accounts: SalesReceivingAccount[];
}) {
  const [orders, setOrders] = useState<SalesOrder[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getSalesOrders(true)
      .then((rows) => {
        if (active) setOrders(rows);
      })
      .catch((cause: Error) => {
        if (active) setError(cause.message);
      });
    return () => {
      active = false;
    };
  }, []);
  return error ? (
    <p role="alert">{error}</p>
  ) : orders ? (
    <SalesReportsPanel
      orders={orders}
      products={products}
      accounts={accounts}
    />
  ) : (
    <p role="status">
      Carregando histórico completo para os relatórios existentes…
    </p>
  );
}
