"use client";

import type { SalesVariant } from "@/services/vendas.service";
import { Trash2 } from "lucide-react";

export default function SalesVariantsEditor({
  variants,
  stock,
  inheritPrice,
  onChange,
  onRemove,
  independentInventory = false,
}: {
  variants: SalesVariant[];
  stock: number;
  inheritPrice: boolean;
  onChange: (variants: SalesVariant[]) => void;
  onRemove: (name: string) => void;
  independentInventory?: boolean;
}) {
  const distributed = variants.reduce(
    (sum, variant) => sum + Number(variant.stock),
    0,
  );
  function update(
    index: number,
    key: keyof SalesVariant,
    value: string | number | null,
  ) {
    onChange(
      variants.map((variant, position) =>
        position === index ? { ...variant, [key]: value } : variant,
      ),
    );
  }
  return (
    <section className="mt-4 space-y-3">
      <h5 className="text-xs font-black uppercase text-slate-800 dark:text-slate-100">Variações geradas</h5>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {independentInventory ? "Estoque total dos cadastros: " : "Estoque físico: "}{(independentInventory ? distributed : stock).toLocaleString("pt-BR")} · Distribuído:{" "}
        {distributed.toLocaleString("pt-BR")} · Não distribuído:{" "}
        {(independentInventory ? 0 : stock - distributed).toLocaleString("pt-BR")}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {independentInventory ? "Cada opção gera um cadastro independente, com código, preço e estoque próprios, vinculado à matriz da grade." : "Distribua manualmente o estoque entre os tamanhos/cores. Cada variação terá saldo e código de barras próprios."}
      </p>
      <div className="overflow-auto">
        <table className="w-full min-w-[550px] text-left text-xs">
          <thead>
            <tr>
              <th className="p-2">Tamanho / cor</th>
              {independentInventory && <th className="p-2">Código</th>}
              <th className="p-2">Código de barras</th>
              <th className="p-2">Estoque</th>
              <th className="p-2">Em condicional</th>
              <th className="p-2">Preço (R$)</th>
              <th className="p-2"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {!variants.length && <tr><td colSpan={independentInventory ? 7 : 6} className="p-5 text-center text-slate-500">Marque as opções da grade para gerar as variações do produto.</td></tr>}
            {variants.map((variant, index) => (
              <tr key={variant.id || variant.name} className="border-t">
                <td className="p-2 font-bold">{variant.name}</td>
                {independentInventory && <td className="p-2 text-slate-500">{variant.sku || "Gerado ao gravar"}</td>}
                <td className="p-2">
                  <input
                    aria-label={`Código de barras ${variant.name}`}
                    className="w-full rounded border p-2"
                    value={variant.barcode || ""}
                    maxLength={80}
                    onChange={(event) =>
                      update(index, "barcode", event.target.value || null)
                    }
                  />
                </td>
                <td className="p-2">
                  <input
                    aria-label={`Estoque ${variant.name}`}
                    className="w-24 rounded border p-2"
                    type="number"
                    min={Number(variant.reservedStock || 0)}
                    step="0.001"
                    value={variant.stock}
                    onChange={(event) =>
                      update(index, "stock", Number(event.target.value))
                    }
                  />
                </td>
                <td className="p-2 text-amber-700">
                  {Number(variant.reservedStock || 0).toLocaleString("pt-BR")}
                </td>
                <td className="p-2">
                  <input
                    aria-label={`Preço ${variant.name}`}
                    disabled={inheritPrice}
                    className="w-28 rounded border p-2 disabled:bg-slate-100"
                    type="number"
                    min="0"
                    step="0.01"
                    value={variant.price ?? ""}
                    placeholder="Preço do produto"
                    onChange={(event) =>
                      update(
                        index,
                        "price",
                        event.target.value ? Number(event.target.value) : null,
                      )
                    }
                  />
                </td>
                <td className="p-2 text-right">
                  <button type="button" aria-label={`Remover variação ${variant.name}`} title={Number(variant.reservedStock || 0) > 0 ? "Variação com peças reservadas em condicional" : "Remover variação"} disabled={Number(variant.reservedStock || 0) > 0} onClick={() => onRemove(variant.name)} className="rounded p-1.5 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
