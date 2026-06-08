"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Search, ArrowLeftRight, ShoppingCart, ShoppingBag, Package, Loader2, AlertTriangle } from "lucide-react";

type MovementType = "Entrada" | "Saída" | "Transferência";
type MovementSource = "manual" | "purchase" | "sale";

interface Movement {
  id:          string;
  date:        string;
  type:        MovementType;
  source:      MovementSource;
  reference:   string;
  description: string;
  quantity:    number | null;
  amount:      number | null;
  origin:      string | null;
  destination: string | null;
  status:      string | null;
}

interface ApiResponse {
  movements: Movement[];
  counts: { total: number; manual: number; entrada: number; saida: number };
}

const TYPE_BADGE: Record<MovementType, string> = {
  Entrada:        "bg-emerald-100 text-emerald-700",
  Saída:          "bg-red-100 text-red-700",
  Transferência:  "bg-blue-100 text-blue-700",
};

const SOURCE_ICON = {
  manual:   ArrowLeftRight,
  purchase: ShoppingCart,
  sale:     ShoppingBag,
} as const;

const SOURCE_LABEL = {
  manual:   "Manual",
  purchase: "PO Recebida",
  sale:     "Venda Faturada",
} as const;

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

const fmtDate = (s: string) => {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y.slice(2)}`;
};

export default function InventoryMovementsPage() {
  const [data, setData]       = useState<ApiResponse | null>(null);
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const qs = search ? `?q=${encodeURIComponent(search)}` : "";
    try {
      const res = await fetch(`/api/erp/inventory/movements${qs}`);
      if (!res.ok) {
        setError(`Erro ${res.status} ao carregar movimentações`);
        setData(null);
      } else {
        setData(await res.json());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const movements = data?.movements ?? [];
  const counts    = data?.counts;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/erp/inventory" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Movimentações de Estoque</h1>
              <p className="text-xs text-gray-500">ERP · Manuais + Compras recebidas + Vendas faturadas</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors shadow-sm">
            <Plus size={14} /> Nova Movimentação
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total",          value: counts?.total   ?? 0, color: "text-gray-900"    },
            { label: "Manuais",        value: counts?.manual  ?? 0, color: "text-blue-600"    },
            { label: "Entradas (PO)",  value: counts?.entrada ?? 0, color: "text-emerald-600" },
            { label: "Saídas (Venda)", value: counts?.saida   ?? 0, color: "text-red-600"     },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 max-w-sm shadow-sm">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar referência ou descrição…"
            className="flex-1 text-sm focus:outline-none bg-transparent"
          />
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Data", "Tipo", "Origem", "Referência", "Descrição", "Qtd", "Valor", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={8} className="px-4 py-16">
                    <div className="flex items-center justify-center text-gray-400 text-sm">
                      <Loader2 size={16} className="animate-spin mr-2" /> Carregando…
                    </div>
                  </td></tr>
                ) : movements.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-16">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <Package size={28} className="text-gray-200" />
                      <p className="text-sm font-medium text-gray-500">Nenhuma movimentação encontrada</p>
                      <p className="text-xs text-gray-400 max-w-sm">
                        Movimentações aparecem aqui quando você marca uma{" "}
                        <Link href="/awq/erp/purchases" className="underline">compra como Recebida</Link>{" "}
                        ou uma{" "}
                        <Link href="/awq/erp/orders/sales" className="underline">venda como Faturada/Entregue</Link>.
                      </p>
                    </div>
                  </td></tr>
                ) : movements.map((m) => {
                  const Icon = SOURCE_ICON[m.source];
                  return (
                    <tr key={m.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{fmtDate(m.date)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_BADGE[m.type]}`}>{m.type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Icon size={11} className="text-gray-400" />
                          {SOURCE_LABEL[m.source]}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-700">{m.reference}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-[220px] truncate" title={m.description}>{m.description}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 text-right">{m.quantity ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap text-right">{m.amount != null ? fmtBRL(m.amount) : "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{m.status ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-gray-400">
          Movimentos com origem <strong>PO Recebida</strong> e <strong>Venda Faturada</strong> são sintéticos,
          derivados automaticamente das seções Compras e Pedidos de Venda. Movimentos manuais ainda não
          disparam baixa em <code className="font-mono bg-gray-100 px-1 rounded">erp_inventory_items.stock_qty</code> —
          requer worker dedicado.
        </p>

      </div>
    </div>
  );
}
