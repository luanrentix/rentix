"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import ProductPhoto from "./product-photo";
import { getSalesPriceOptions } from "@/services/sales-pricing";
import type { SalesProduct } from "@/services/vendas.service";

export default function ProductPicker({
  products,
  onSelect,
  onClose,
  getPrice,
}: {
  products: SalesProduct[];
  onSelect: (product: SalesProduct) => void;
  onClose: () => void;
  getPrice: (product: SalesProduct) => number;
}) {
  const [search, setSearch] = useState("");
  const matches = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return products.filter(
      (product) =>
        product.active &&
        !product.isGridParent &&
        product.showInSale &&
        (!term ||
          [
            product.name,
            product.sku,
            product.barcode,
            product.reference,
            product.supplierName,
            ...(product.variants || []).flatMap((variant) => [
              variant.name,
              variant.barcode,
            ]),
          ]
            .filter(Boolean)
            .join(" ")
            .toLocaleLowerCase("pt-BR")
            .includes(term)),
    );
  }, [products, search]);
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-picker-title"
        className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white dark:bg-slate-900 shadow-xl"
      >
        <header className="flex items-center justify-between border-b p-5">
          <div>
            <h2
              id="product-picker-title"
              className="text-lg font-bold text-slate-900 dark:text-white"
            >
              Selecionar produto
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Escolha um produto para adicionar à venda.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar seleção de produtos"
            className="rounded-xl p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
        </header>
        <div className="p-4">
          <label className="relative block">
            <span className="sr-only">Pesquisar produtos cadastrados</span>
            <Search
              className="absolute left-3 top-3 text-slate-400"
              size={18}
            />
            <input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar por nome, código, código de barras ou variação…"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 pl-10 pr-3 text-sm text-slate-800 dark:text-slate-100"
            />
          </label>
          <p
            role="status"
            className="mt-2 text-xs text-slate-500 dark:text-slate-400"
          >
            {matches.length} produto(s) disponível(is) para seleção
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Produto</th>
                <th className="p-3">Estoque disponível</th>
                <th className="p-3">Preço</th>
                <th className="p-3">Selecionar</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((product) => (
                <tr key={product.id} className="border-t hover:bg-slate-50">
                  <td className="p-3 text-slate-600 dark:text-slate-300">
                    {product.sku || product.reference || product.barcode || "—"}
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => onSelect(product)}
                      className="flex items-center gap-3 text-left font-semibold text-slate-900 dark:text-white hover:text-[var(--primary-color)]"
                    >
                      <ProductPhoto
                        src={product.photoUrl}
                        name={product.name}
                      />
                      {product.name}
                    </button>
                    {Boolean(product.variants?.length) && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Escolha o tamanho/cor na próxima etapa.
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap p-3 text-slate-700 dark:text-slate-200">
                    {product.manageStock
                      ? (
                          Number(product.stock) -
                          Number(product.reservedStock || 0)
                        ).toLocaleString("pt-BR")
                      : "Sem controle"}
                    {product.manageStock &&
                      Number(product.stock) -
                        Number(product.reservedStock || 0) <=
                        0 && (
                        <p className="text-xs text-amber-700">
                          Venda permitida com aviso
                        </p>
                      )}
                  </td>
                  <td className="whitespace-nowrap p-3 text-base font-bold text-slate-800 dark:text-slate-100">
                    <span className="block text-xs font-medium">Normal</span>
                    {getPrice(product).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                    {getSalesPriceOptions(product).promotional !== null && (
                      <div className="mt-2 rounded-lg bg-emerald-50 px-2 py-1 font-bold text-emerald-800">
                        <span className="block text-xs">
                          Promocional · sem desconto
                        </span>
                        {getSalesPriceOptions(
                          product,
                        ).promotional!.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => onSelect(product)}
                      className="rounded-2xl bg-[var(--primary-color)] px-3 py-2 font-semibold text-white shadow-lg shadow-[var(--primary-bg-light)] transition hover:bg-[var(--primary-hover)] active:scale-95"
                    >
                      Selecionar
                    </button>
                  </td>
                </tr>
              ))}
              {!matches.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-8 text-center text-slate-500 dark:text-slate-400"
                  >
                    {search
                      ? "Nenhum produto encontrado para esta pesquisa."
                      : "Nenhum produto ativo e habilitado para venda cadastrado."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
