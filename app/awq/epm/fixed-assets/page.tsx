"use client";

// ─── /awq/epm/fixed-assets — Ativo Imobilizado ────────────────────────────────
// DATA SOURCE: /api/awq/erp/assets → erp_fixed_assets (Supabase)
// Falls back to seed data when DB is empty so the page always shows content.

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Building2, TrendingDown, DollarSign, BarChart3,
  AlertTriangle, Package,
} from "lucide-react";
import type { FixedAsset } from "@/lib/erp-db";

// ─── Seed data (mirrors DB schema — shown when Supabase is empty) ─────────────
const SEED: FixedAsset[] = [
  { id: "s1",  code: "HW-001", description: "MacBook Pro 16\" M3 Max",         category: "HARDWARE",   location: "Escritório SP", acquisition_value: 24800, acquisition_date: "2025-03-01", useful_life_months: 48, residual_value: 2000,  accumulated_depreciation: 5958,  is_active: true, status: "Ativo", bu: "JACQES",  created_at: "2025-03-01" },
  { id: "s2",  code: "HW-002", description: "MacBook Air M2 (design)",          category: "HARDWARE",   location: "Escritório SP", acquisition_value: 14200, acquisition_date: "2025-06-01", useful_life_months: 48, residual_value: 1000,  accumulated_depreciation: 2145,  is_active: true, status: "Ativo", bu: "CAZA",    created_at: "2025-06-01" },
  { id: "s3",  code: "HW-003", description: "Monitor LG UltraWide 34\"",        category: "HARDWARE",   location: "Escritório SP", acquisition_value: 4500,  acquisition_date: "2025-03-01", useful_life_months: 60, residual_value: 0,     accumulated_depreciation: 1005,  is_active: true, status: "Ativo", bu: "JACQES",  created_at: "2025-03-01" },
  { id: "s4",  code: "HW-004", description: "iPad Pro 12.9\" + Apple Pencil",   category: "HARDWARE",   location: "Remoto",        acquisition_value: 9600,  acquisition_date: "2025-09-01", useful_life_months: 36, residual_value: 0,     accumulated_depreciation: 1600,  is_active: true, status: "Ativo", bu: "AWQ",     created_at: "2025-09-01" },
  { id: "s5",  code: "SW-001", description: "Adobe Creative Cloud (anual)",     category: "SOFTWARE",   location: "Cloud",         acquisition_value: 7200,  acquisition_date: "2026-01-01", useful_life_months: 12, residual_value: 0,     accumulated_depreciation: 1800,  is_active: true, status: "Ativo", bu: "CAZA",    created_at: "2026-01-01" },
  { id: "s6",  code: "SW-002", description: "Figma Organization (anual)",       category: "SOFTWARE",   location: "Cloud",         acquisition_value: 3600,  acquisition_date: "2026-01-01", useful_life_months: 12, residual_value: 0,     accumulated_depreciation: 900,   is_active: true, status: "Ativo", bu: "CAZA",    created_at: "2026-01-01" },
  { id: "s7",  code: "FU-001", description: "Mesa de escritório + cadeira ergo",category: "FURNITURE",  location: "Escritório SP", acquisition_value: 6800,  acquisition_date: "2024-10-01", useful_life_months: 60, residual_value: 0,     accumulated_depreciation: 1360,  is_active: true, status: "Ativo", bu: "AWQ",     created_at: "2024-10-01" },
  { id: "s8",  code: "FU-002", description: "Câmera Sony ZV-E10 + acessórios",  category: "EQUIPMENT",  location: "Escritório SP", acquisition_value: 8500,  acquisition_date: "2025-01-01", useful_life_months: 60, residual_value: 500,   accumulated_depreciation: 1600,  is_active: true, status: "Ativo", bu: "CAZA",    created_at: "2025-01-01" },
  { id: "s9",  code: "HW-005", description: "iPhone 15 Pro (corporativo)",      category: "HARDWARE",   location: "Remoto",        acquisition_value: 8200,  acquisition_date: "2024-11-01", useful_life_months: 24, residual_value: 1000,  accumulated_depreciation: 4267,  is_active: true, status: "Ativo", bu: "JACQES",  created_at: "2024-11-01" },
  { id: "s10", code: "SW-003", description: "HubSpot CRM Pro (anual)",          category: "SOFTWARE",   location: "Cloud",         acquisition_value: 5400,  acquisition_date: "2026-01-01", useful_life_months: 12, residual_value: 0,     accumulated_depreciation: 1350,  is_active: true, status: "Ativo", bu: "ADVISOR", created_at: "2026-01-01" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000)     return sign + "R$" + (abs / 1_000).toFixed(0) + "K";
  return sign + "R$" + abs.toLocaleString("pt-BR", { minimumFractionDigits: 0 });
}

function bookValue(a: FixedAsset): number {
  return Math.max(a.acquisition_value - a.accumulated_depreciation, a.residual_value);
}

function monthlyDepreciation(a: FixedAsset): number {
  return (a.acquisition_value - a.residual_value) / a.useful_life_months;
}

function depreciationPct(a: FixedAsset): number {
  return a.acquisition_value > 0 ? (a.accumulated_depreciation / a.acquisition_value) * 100 : 0;
}

function generateDepSchedule(assets: FixedAsset[]) {
  const today = new Date("2026-05-01");
  const active = assets.filter(a => a.is_active);
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const total = active.reduce((s, a) => s + monthlyDepreciation(a), 0);
    return { month: d.toISOString().slice(0, 7), amount: total };
  });
}

const CAT_COLORS: Record<string, string> = {
  HARDWARE:  "bg-brand-100 text-brand-700",
  SOFTWARE:  "bg-violet-100 text-violet-700",
  FURNITURE: "bg-amber-100 text-amber-700",
  EQUIPMENT: "bg-cyan-100 text-cyan-700",
  VEHICLE:   "bg-emerald-100 text-emerald-700",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FixedAssetsPage() {
  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDB, setFromDB] = useState(false);

  useEffect(() => {
    fetch("/api/awq/erp/assets")
      .then(r => r.json())
      .then(j => {
        if (j.success && j.data?.length > 0) {
          setAssets(j.data);
          setFromDB(true);
        } else {
          setAssets(SEED);
        }
      })
      .catch(() => setAssets(SEED))
      .finally(() => setLoading(false));
  }, []);

  const activeAssets      = assets.filter(a => a.is_active);
  const totalCost         = activeAssets.reduce((s, a) => s + a.acquisition_value, 0);
  const totalBV           = activeAssets.reduce((s, a) => s + bookValue(a), 0);
  const totalDepr         = activeAssets.reduce((s, a) => s + a.accumulated_depreciation, 0);
  const monthlyDeprTotal  = activeAssets.reduce((s, a) => s + monthlyDepreciation(a), 0);
  const depSchedule       = generateDepSchedule(assets);

  const buCapex = [...new Set(assets.map(a => a.bu))].map(bu => {
    const ba = assets.filter(a => a.bu === bu);
    return {
      bu,
      count:     ba.length,
      totalCost: ba.reduce((s, a) => s + a.acquisition_value, 0),
      totalBV:   ba.reduce((s, a) => s + bookValue(a), 0),
      totalDepr: ba.reduce((s, a) => s + a.accumulated_depreciation, 0),
    };
  }).filter(r => r.count > 0);

  const catCapex = [...new Set(assets.map(a => a.category))].map(cat => {
    const ca = assets.filter(a => a.category === cat);
    return {
      category:  cat,
      count:     ca.length,
      totalCost: ca.reduce((s, a) => s + a.acquisition_value, 0),
      totalBV:   ca.reduce((s, a) => s + bookValue(a), 0),
    };
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Carregando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/epm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              ←
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Ativo Imobilizado</h1>
              <p className="text-xs text-gray-500">
                EPM · Fixed Assets · Depreciação Straight-Line · CAPEX
                {!fromDB && <span className="ml-2 text-amber-500 font-medium">(dados de exemplo)</span>}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Custo Total (CAPEX)",    value: fmtBRL(totalCost),        color: "text-gray-900"   },
            { label: "Valor Contábil Líquido", value: fmtBRL(totalBV),          color: "text-brand-700"  },
            { label: "Depreciação Acumulada",  value: fmtBRL(totalDepr),        color: "text-red-700"    },
            { label: "Depr. Mensal Corrente",  value: fmtBRL(monthlyDeprTotal), color: "text-amber-700"  },
          ].map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className={`text-xl font-bold tabular-nums ${c.color}`}>{c.value}</div>
              <div className="text-xs text-gray-400 mt-1">{c.label}</div>
            </div>
          ))}
        </div>

        {/* Asset Register */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <Package size={14} className="text-brand-600" />
            <span className="text-sm font-semibold text-gray-900">Registro de Ativos</span>
            <span className="ml-auto text-xs text-gray-400">{activeAssets.length} ativos</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  {["Código", "Ativo", "Categoria", "BU", "Custo", "Depr. Acum.", "Valor Líquido", "Depr/Mês", "% Depreciado"].map(h => (
                    <th key={h} className="py-2.5 px-3 text-gray-500 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {assets.map(a => {
                  const bv  = bookValue(a);
                  const md  = monthlyDepreciation(a);
                  const pct = depreciationPct(a);
                  const near = pct > 80;
                  return (
                    <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3 font-mono text-gray-500">{a.code}</td>
                      <td className="py-2 px-3 text-gray-800 font-medium max-w-[180px] truncate">{a.description}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${CAT_COLORS[a.category] ?? "bg-gray-100 text-gray-600"}`}>
                          {a.category}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-500">{a.bu}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-700">{fmtBRL(a.acquisition_value)}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-red-600">{fmtBRL(a.accumulated_depreciation)}</td>
                      <td className="py-2 px-3 text-right tabular-nums font-semibold text-brand-700">{fmtBRL(bv)}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-amber-700">{fmtBRL(md)}</td>
                      <td className="py-2 px-3 w-28">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${near ? "bg-red-400" : "bg-brand-400"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className={`text-[10px] font-semibold ${near ? "text-red-600" : "text-gray-500"}`}>{pct.toFixed(0)}%</span>
                          {near && <AlertTriangle size={9} className="text-red-400 shrink-0" />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                  <td className="py-2.5 px-3 text-xs text-gray-700" colSpan={4}>Total</td>
                  <td className="py-2.5 px-3 text-right text-xs tabular-nums text-gray-900">{fmtBRL(totalCost)}</td>
                  <td className="py-2.5 px-3 text-right text-xs tabular-nums text-red-700">{fmtBRL(totalDepr)}</td>
                  <td className="py-2.5 px-3 text-right text-xs tabular-nums text-brand-700">{fmtBRL(totalBV)}</td>
                  <td className="py-2.5 px-3 text-right text-xs tabular-nums text-amber-700">{fmtBRL(monthlyDeprTotal)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Depreciation Schedule */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown size={14} className="text-red-500" />
            <span className="text-sm font-semibold text-gray-900">Cronograma de Depreciação — Próximos 12 Meses</span>
            <span className="ml-auto text-xs text-gray-400">Método: Linha Reta</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {depSchedule.map((row, i) => (
              <div key={row.month} className={`rounded-xl p-3 text-center ${i === 0 ? "bg-brand-50 border border-brand-200" : "bg-gray-50"}`}>
                <div className="text-[10px] text-gray-400 font-semibold mb-1">{row.month}</div>
                <div className={`text-sm font-bold tabular-nums ${i === 0 ? "text-brand-700" : "text-red-600"}`}>{fmtBRL(row.amount)}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-gray-400">
            Total projetado 12 meses:{" "}
            <strong className="text-gray-700">{fmtBRL(depSchedule.reduce((s, r) => s + r.amount, 0))}</strong>
          </div>
        </div>

        {/* CAPEX by BU + Category */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={14} className="text-brand-600" />
              <span className="text-sm font-semibold text-gray-900">CAPEX por Business Unit</span>
            </div>
            <div className="space-y-3">
              {buCapex.map(b => {
                const deprPct = b.totalCost > 0 ? (b.totalDepr / b.totalCost) * 100 : 0;
                return (
                  <div key={b.bu}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-800">{b.bu}</span>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-gray-400">{b.count} ativos</span>
                        <span className="text-gray-700 font-semibold">{fmtBRL(b.totalBV)}</span>
                        <span className="text-gray-400">/ {fmtBRL(b.totalCost)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-400 rounded-full" style={{ width: `${100 - deprPct}%` }} />
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{(100 - deprPct).toFixed(0)}% valor residual restante</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={14} className="text-violet-600" />
              <span className="text-sm font-semibold text-gray-900">CAPEX por Categoria</span>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  {["Categoria", "Qtd", "Custo Total", "Valor Líquido"].map(h => (
                    <th key={h} className="py-2 px-2 text-gray-500 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {catCapex.map(c => (
                  <tr key={c.category} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${CAT_COLORS[c.category] ?? "bg-gray-100 text-gray-600"}`}>
                        {c.category}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right text-gray-500">{c.count}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-gray-700">{fmtBRL(c.totalCost)}</td>
                    <td className="py-2 px-2 text-right tabular-nums font-semibold text-brand-700">{fmtBRL(c.totalBV)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* GL integration notice */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Integração GL:</span>{" "}
            Para registrar a depreciação mensal no Razão Geral, crie um lançamento GL
            debitando <strong>6.1.09 Depreciação e Amortização</strong> e creditando{" "}
            <strong>1.2.01 Imobilizado (líquido)</strong> pelo valor de{" "}
            <strong>{fmtBRL(monthlyDeprTotal)}/mês</strong>.{" "}
            <Link href="/awq/epm/gl/add" className="underline font-semibold ml-1">Criar lançamento →</Link>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <Link href="/awq/epm" className="text-brand-600 hover:underline">← EPM Overview</Link>
          <span className="text-gray-300">|</span>
          <Link href="/awq/epm/gl" className="text-brand-600 hover:underline">GL →</Link>
          <Link href="/awq/epm/budget" className="text-brand-600 hover:underline">Budget →</Link>
        </div>
      </div>
    </div>
  );
}
