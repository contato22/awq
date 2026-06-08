"use client";

// ─── /awq/erp/inventory — Inventory Hub ───────────────────────────────────────
// Página índice da seção Estoque. Resolve o 404 anterior (não havia page.tsx
// na raiz) e dá uma visão agregada das 4 sub-rotas. Consome o mesmo endpoint
// /api/erp/inventory já usado por /items.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  ArrowLeftRight,
  Warehouse,
  Calculator,
  AlertTriangle,
  Loader2,
  ShoppingCart,
  ShoppingBag,
  Activity,
  type LucideIcon,
} from "lucide-react";

type Item = {
  id:         string;
  sku:       string;
  name:      string;
  category:  string;
  unit_cost: number;
  stock_qty: number;
  min_stock: number;
};

type Movement = {
  id:          string;
  date:        string;
  type:        "Entrada" | "Saída" | "Transferência";
  source:      "manual" | "purchase" | "sale";
  reference:   string;
  description: string;
  amount:      number | null;
};

type SubArea = {
  href:  string;
  title: string;
  desc:  string;
  icon:  LucideIcon;
};

const SUB_AREAS: SubArea[] = [
  { href: "/awq/erp/inventory/items",      title: "Produtos / Items",      desc: "Cadastro de SKUs, custos, estoque mínimo",  icon: Package },
  { href: "/awq/erp/inventory/movements",  title: "Movimentações",         desc: "Entradas, saídas e transferências",         icon: ArrowLeftRight },
  { href: "/awq/erp/inventory/warehouses", title: "Armazéns",              desc: "Localizações físicas e endereços",          icon: Warehouse },
  { href: "/awq/erp/inventory/valuation",  title: "Avaliação de Estoque",  desc: "Custo médio, FIFO e valorização contábil",  icon: Calculator },
];

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);

export default function InventoryIndexPage() {
  const [items, setItems]         = useState<Item[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [itemsRes, movementsRes] = await Promise.all([
          fetch("/api/erp/inventory"),
          fetch("/api/erp/inventory/movements"),
        ]);
        if (itemsRes.ok)     setItems(await itemsRes.json());
        else                 setError(`Erro ${itemsRes.status} ao carregar inventário`);
        if (movementsRes.ok) setMovements((await movementsRes.json()).movements ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalItems   = items.length;
  const categories   = new Set(items.map((i) => i.category).filter(Boolean)).size;
  const lowStock     = items.filter((i) => Number(i.stock_qty) <= Number(i.min_stock)).length;
  const totalValue   = items.reduce((s, i) => s + Number(i.stock_qty) * Number(i.unit_cost), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Estoque</h1>
              <p className="text-xs text-gray-500">ERP · Visão geral do inventário</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Itens",       value: loading ? "—" : String(totalItems),  color: "text-gray-900"    },
            { label: "Categorias",        value: loading ? "—" : String(categories),  color: "text-brand-600"   },
            { label: "Abaixo do Mínimo",  value: loading ? "—" : String(lowStock),    color: lowStock > 0 ? "text-red-600" : "text-emerald-600" },
            { label: "Valor em Estoque",  value: loading ? "—" : fmtBRL(totalValue),  color: "text-emerald-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Sub-areas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SUB_AREAS.map(({ href, title, desc, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:border-brand-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0 group-hover:bg-brand-100 transition-colors">
                  <Icon size={18} className="text-brand-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm font-semibold text-gray-900 group-hover:text-brand-700 transition-colors">{title}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Atividade recente — integração cross-section */}
        {!loading && movements.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Activity size={15} className="text-brand-500" />
                <h2 className="text-sm font-semibold text-gray-900">Atividade Recente</h2>
                <span className="text-xs text-gray-400">· compras + vendas + manuais</span>
              </div>
              <Link href="/awq/erp/inventory/movements" className="text-xs text-brand-600 hover:underline">
                Ver tudo →
              </Link>
            </div>
            <ul className="divide-y divide-gray-100">
              {movements.slice(0, 6).map((m) => {
                const Icon = m.source === "purchase" ? ShoppingCart : m.source === "sale" ? ShoppingBag : ArrowLeftRight;
                const tone = m.type === "Entrada" ? "text-emerald-600" : m.type === "Saída" ? "text-red-600" : "text-blue-600";
                return (
                  <li key={m.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60">
                    <div className={`w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 ${tone}`}>
                      <Icon size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-900 truncate">{m.description}</div>
                      <div className="text-xs text-gray-400 truncate">
                        <span className={`font-medium ${tone}`}>{m.type}</span>
                        <span className="mx-1.5">·</span>
                        <span className="font-mono">{m.reference}</span>
                        <span className="mx-1.5">·</span>
                        <span>{m.date}</span>
                      </div>
                    </div>
                    {m.amount != null && (
                      <div className={`text-xs font-bold whitespace-nowrap ${tone}`}>{fmtBRL(m.amount)}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 size={16} className="animate-spin mr-2" />
            <span className="text-xs">Carregando inventário…</span>
          </div>
        )}

        {!loading && !error && totalItems === 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <Package size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500 mb-1">Nenhum item cadastrado</p>
            <p className="text-xs text-gray-400 mb-4">Comece criando seu primeiro produto em <em>Produtos / Items</em>.</p>
            <Link
              href="/awq/erp/inventory/items"
              className="inline-flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors"
            >
              Ir para Produtos
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
