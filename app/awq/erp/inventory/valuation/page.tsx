"use client";

// ─── /awq/erp/inventory/valuation ─────────────────────────────────────────────
// Avaliação de estoque derivada de erp_inventory_items (fonte única).
// Custo médio = unit_cost cadastrado (assumido WAC; FIFO/LIFO requer histórico
// de movimentos por lote — fora do escopo atual).
//
// Itens "sem movimentação" = items presentes em erp_inventory_items mas sem
// nenhum registro em /api/erp/inventory/movements (manual + PO + SO).

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Search, BarChart3, Package, TrendingUp, RefreshCw, AlertTriangle, Loader2,
} from "lucide-react";

type Item = {
  id:         string;
  sku:       string;
  name:      string;
  category:  string;
  unit:      string;
  unit_cost: number;
  sale_price: number | null;
  stock_qty: number;
  min_stock: number;
};

type Movement = { id: string; description: string; reference: string };

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const fmtBRLCompact = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 }).format(n);

export default function InventoryValuationPage() {
  const [items, setItems]         = useState<Item[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [search, setSearch]       = useState("");
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [itemsRes, movementsRes] = await Promise.all([
        fetch("/api/erp/inventory"),
        fetch("/api/erp/inventory/movements"),
      ]);
      if (!itemsRes.ok) {
        setError(`Erro ${itemsRes.status} ao carregar itens`);
        setItems([]);
      } else {
        setItems(await itemsRes.json());
      }
      if (movementsRes.ok) {
        setMovements((await movementsRes.json()).movements ?? []);
      }
      setLastUpdate(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // Items que aparecem em algum movimento (referência/descrição contém SKU ou nome)
  const movedSkus = useMemo(() => {
    const haystack = movements.map((m) => `${m.description} ${m.reference}`.toLowerCase()).join("\n");
    const moved = new Set<string>();
    for (const it of items) {
      if (haystack.includes(it.sku.toLowerCase()) || haystack.includes(it.name.toLowerCase())) {
        moved.add(it.id);
      }
    }
    return moved;
  }, [items, movements]);

  const enriched = items.map((i) => ({
    ...i,
    totalValue: Number(i.stock_qty) * Number(i.unit_cost),
    moved:      movedSkus.has(i.id),
  }));

  const totalValue   = enriched.reduce((s, i) => s + i.totalValue, 0);
  const totalItems   = enriched.length;
  const noMovement   = enriched.filter((i) => !i.moved && Number(i.stock_qty) > 0).length;
  const byCategory   = enriched.reduce<Record<string, number>>((acc, i) => {
    const k = i.category || "(sem categoria)";
    acc[k] = (acc[k] ?? 0) + i.totalValue;
    return acc;
  }, {});
  const topCategories = Object.entries(byCategory).sort(([, a], [, b]) => b - a).slice(0, 4);

  const filtered = enriched
    .filter((i) => !search || `${i.sku} ${i.name} ${i.category}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.totalValue - a.totalValue);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/erp/inventory" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Avaliação de Estoque</h1>
              <p className="text-xs text-gray-500">ERP · Valorização WAC derivada de itens + movimentações</p>
            </div>
          </div>
          <button onClick={load} disabled={loading} className="flex items-center gap-1.5 text-sm border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors disabled:opacity-50">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Atualizar
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Valor Total",          icon: TrendingUp, color: "text-emerald-600", value: loading ? "—" : fmtBRLCompact(totalValue) },
            { label: "Itens Cadastrados",     icon: Package,    color: "text-brand-600",   value: loading ? "—" : String(totalItems) },
            { label: "Itens sem Movimentação", icon: BarChart3,  color: noMovement > 0 ? "text-amber-600" : "text-emerald-600", value: loading ? "—" : String(noMovement) },
            { label: "Último Update",         icon: RefreshCw,  color: "text-gray-600",    value: lastUpdate ? lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—" },
          ].map(({ label, icon: Icon, color, value }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className={color} />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
              </div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Top categorias */}
        {topCategories.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Valor por Categoria</h2>
            <div className="space-y-2">
              {topCategories.map(([cat, v]) => {
                const pct = totalValue > 0 ? (v / totalValue) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700 font-medium">{cat}</span>
                      <span className="text-gray-500 tabular-nums">{fmtBRL(v)} · {pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 max-w-sm shadow-sm">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar produto…"
            className="flex-1 text-sm focus:outline-none bg-transparent"
          />
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["SKU", "Produto", "Categoria", "Unid.", "Qtd", "Custo Médio", "Valor Total", "Movimento"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-16">
                    <div className="flex items-center justify-center text-gray-400 text-sm">
                      <Loader2 size={16} className="animate-spin mr-2" /> Calculando avaliação…
                    </div>
                  </td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-16">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <BarChart3 size={28} className="text-gray-200" />
                      <p className="text-sm font-medium text-gray-500">Nenhum item</p>
                      <p className="text-xs text-gray-400">Cadastre itens em <Link href="/awq/erp/inventory/items" className="underline">Produtos / Items</Link>.</p>
                    </div>
                  </td></tr>
                ) : filtered.map((i) => (
                  <tr key={i.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3 text-xs font-mono text-gray-600">{i.sku}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-[220px] truncate" title={i.name}>{i.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{i.category || "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{i.unit}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 text-right tabular-nums">{Number(i.stock_qty).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 text-right tabular-nums">{fmtBRL(Number(i.unit_cost))}</td>
                    <td className="px-4 py-3 text-xs font-bold text-emerald-700 text-right tabular-nums whitespace-nowrap">{fmtBRL(i.totalValue)}</td>
                    <td className="px-4 py-3 text-xs">
                      {i.moved ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-semibold">com movimento</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-xs font-semibold">parado</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-gray-400">
          Custo médio = <code className="font-mono bg-gray-100 px-1 rounded">unit_cost</code> cadastrado (WAC).
          FIFO/LIFO requer histórico de lotes — não disponível enquanto{" "}
          <code className="font-mono bg-gray-100 px-1 rounded">erp_inventory_movements</code> não tiver
          line items com custo unitário por entrada.
        </p>
      </div>
    </div>
  );
}
