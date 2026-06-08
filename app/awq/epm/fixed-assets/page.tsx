// ─── /awq/epm/fixed-assets — Ativo Imobilizado ────────────────────────────────
//
// Fixed Asset Register usando erp_assets como fonte de verdade.
// Depreciação calculada straight-line com vidas úteis-padrão por categoria,
// já que erp_assets ainda não tem colunas useful_life_months / residual_value
// / accumulated_depreciation no schema atual.

"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import {
  Building2, TrendingDown, BarChart3,
  AlertTriangle, Package, Loader2,
} from "lucide-react";

function fmtBRL(n: number): string {
  const abs  = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000)     return sign + "R$" + (abs / 1_000).toFixed(0)     + "K";
  return sign + "R$" + abs.toLocaleString("pt-BR", { minimumFractionDigits: 0 });
}

interface RawAsset {
  id:                string;
  code:              string;
  description:       string;
  category:          string;
  bu_code:           string | null;
  location:          string | null;
  acquisition_value: number | null;
  acquisition_date:  string | null;
  status:            string;
}

interface EnrichedAsset extends RawAsset {
  useful_life_months:       number;
  residual_value:           number;
  accumulated_depreciation: number;
  book_value:               number;
  monthly_depreciation:     number;
  depreciation_pct:         number;
  is_active:                boolean;
}

// Vidas úteis-padrão por categoria (meses).
// Alinhado com prática contábil brasileira / IRPJ.
const DEFAULT_USEFUL_LIFE: Record<string, number> = {
  HARDWARE:     60,   // 5 anos
  SOFTWARE:     36,   // 3 anos (assinatura/licença longa) — anuais devem ser opex
  EQUIPMENT:    60,   // 5 anos
  FURNITURE:   120,   // 10 anos
  VEHICLE:      60,   // 5 anos
  IMOVEL:      300,   // 25 anos
  BENFEITORIA: 120,
  OUTROS:       60,
};

function normalizeCategory(cat: string): string {
  return cat.toUpperCase().replace(/\s+/g, "_");
}

function enrich(a: RawAsset): EnrichedAsset {
  const cost = Number(a.acquisition_value ?? 0);
  const catKey = normalizeCategory(a.category || "OUTROS");
  const useful_life_months = DEFAULT_USEFUL_LIFE[catKey] ?? 60;
  const residual_value = 0;
  const monthly_depreciation = cost > 0 ? (cost - residual_value) / useful_life_months : 0;

  let months_elapsed = 0;
  if (a.acquisition_date) {
    const acq = new Date(a.acquisition_date);
    const now = new Date();
    months_elapsed = Math.max(
      0,
      (now.getFullYear() - acq.getFullYear()) * 12 + (now.getMonth() - acq.getMonth()),
    );
  }
  const accumulated_depreciation = Math.min(
    monthly_depreciation * months_elapsed,
    cost - residual_value,
  );
  const book_value = Math.max(cost - accumulated_depreciation, residual_value);
  const depreciation_pct = cost > 0 ? (accumulated_depreciation / cost) * 100 : 0;
  const is_active = a.status === "Ativo" || a.status === "ativo" || !a.status;

  return {
    ...a,
    useful_life_months,
    residual_value,
    accumulated_depreciation,
    book_value,
    monthly_depreciation,
    depreciation_pct,
    is_active,
  };
}

const CAT_COLORS: Record<string, string> = {
  HARDWARE:    "bg-brand-100 text-brand-700",
  SOFTWARE:    "bg-brand-100 text-brand-700",
  FURNITURE:   "bg-amber-100 text-amber-700",
  EQUIPMENT:   "bg-cyan-100 text-cyan-700",
  EQUIPAMENTO: "bg-cyan-100 text-cyan-700",
  VEHICLE:     "bg-emerald-100 text-emerald-700",
  VEICULO:     "bg-emerald-100 text-emerald-700",
  IMOVEL:      "bg-purple-100 text-purple-700",
};

export default function FixedAssetsPage() {
  const [assets, setAssets]   = useState<EnrichedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/erp/assets");
        if (!res.ok) {
          setError(`Erro ${res.status} ao carregar ativos`);
          return;
        }
        const raw: RawAsset[] = await res.json();
        setAssets(raw.map(enrich));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro desconhecido");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeAssets     = assets.filter((a) => a.is_active);
  const totalCost        = activeAssets.reduce((s, a) => s + Number(a.acquisition_value ?? 0), 0);
  const totalBV          = activeAssets.reduce((s, a) => s + a.book_value, 0);
  const totalDepr        = activeAssets.reduce((s, a) => s + a.accumulated_depreciation, 0);
  const monthlyDeprTotal = activeAssets.reduce((s, a) => s + a.monthly_depreciation, 0);

  const depSchedule = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() + i, 1);
    return { month: d.toISOString().slice(0, 7), amount: monthlyDeprTotal };
  });

  const BUS = Array.from(new Set(activeAssets.map((a) => a.bu_code ?? "—")));
  const buCapex = BUS.map((bu) => {
    const ba = activeAssets.filter((a) => (a.bu_code ?? "—") === bu);
    return {
      bu,
      count:     ba.length,
      totalCost: ba.reduce((s, a) => s + Number(a.acquisition_value ?? 0), 0),
      totalBV:   ba.reduce((s, a) => s + a.book_value, 0),
      totalDepr: ba.reduce((s, a) => s + a.accumulated_depreciation, 0),
    };
  }).filter((b) => b.count > 0);

  const CATEGORIES = Array.from(new Set(activeAssets.map((a) => a.category || "—")));
  const catCapex = CATEGORIES.map((cat) => {
    const ca = activeAssets.filter((a) => (a.category || "—") === cat);
    return {
      category:  cat,
      count:     ca.length,
      totalCost: ca.reduce((s, a) => s + Number(a.acquisition_value ?? 0), 0),
      totalBV:   ca.reduce((s, a) => s + a.book_value, 0),
    };
  });

  return (
    <>
      <Header
        title="Ativo Imobilizado"
        subtitle="EPM · Fixed Assets · Depreciação Straight-Line · CAPEX"
      />
      <div className="page-container">

        {/* Source notice */}
        <div className="flex items-start gap-3 p-4 bg-brand-50 border border-brand-200 rounded-xl text-xs text-brand-800">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Fonte de dados:</span>{" "}
            <code className="font-mono bg-white/60 px-1 rounded">erp_assets</code> (gerenciado em{" "}
            <Link href="/awq/erp/assets" className="underline font-semibold">/awq/erp/assets</Link>).
            Depreciação calculada com vidas úteis-padrão por categoria
            (HARDWARE 5y, SOFTWARE 3y, FURNITURE 10y, IMOVEL 25y). Para valores
            definitivos, adicionar colunas <code className="font-mono bg-white/60 px-1 rounded">useful_life_months</code>{" "}
            e <code className="font-mono bg-white/60 px-1 rounded">residual_value</code> na tabela.
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-start gap-2">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* ── Summary KPIs ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Custo Total (CAPEX)",    value: loading ? "—" : fmtBRL(totalCost),        color: "text-gray-900"   },
            { label: "Valor Contábil Líquido", value: loading ? "—" : fmtBRL(totalBV),          color: "text-brand-700"  },
            { label: "Depreciação Acumulada",  value: loading ? "—" : fmtBRL(totalDepr),        color: "text-red-700"    },
            { label: "Depr. Mensal Corrente",  value: loading ? "—" : fmtBRL(monthlyDeprTotal), color: "text-amber-700"  },
          ].map((card) => (
            <div key={card.label} className="card p-5">
              <div className={`text-2xl font-bold tabular-nums ${card.color}`}>{card.value}</div>
              <div className="text-xs text-gray-400 mt-1 font-medium">{card.label}</div>
            </div>
          ))}
        </div>

        {/* ── Asset Register ────────────────────────────────────────── */}
        <div className="card">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <Package size={14} className="text-brand-600" />
            <span className="text-base font-semibold text-gray-900">Registro de Ativos</span>
            <span className="ml-auto text-xs text-gray-400">{activeAssets.length} ativos ativos</span>
          </div>
          <div className="table-scroll">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Código</th>
                  <th className="py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Descrição</th>
                  <th className="py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoria</th>
                  <th className="py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">BU</th>
                  <th className="py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Aquisição</th>
                  <th className="py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Custo</th>
                  <th className="py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Depr. Acum.</th>
                  <th className="py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Valor Líquido</th>
                  <th className="py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Depr/Mês</th>
                  <th className="py-2.5 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">% Depreciado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="py-12 text-center">
                    <div className="flex items-center justify-center text-gray-400 text-xs">
                      <Loader2 size={14} className="animate-spin mr-2" /> Carregando ativos…
                    </div>
                  </td></tr>
                ) : assets.length === 0 ? (
                  <tr><td colSpan={10} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Package size={28} className="text-gray-200" />
                      <p className="text-sm font-medium text-gray-500">Nenhum ativo cadastrado</p>
                      <Link href="/awq/erp/assets" className="text-xs text-brand-600 underline">Ir para /awq/erp/assets</Link>
                    </div>
                  </td></tr>
                ) : assets.map((a) => {
                  const cat = normalizeCategory(a.category || "—");
                  const near = a.depreciation_pct > 80;
                  return (
                    <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3 font-mono text-gray-500">{a.code}</td>
                      <td className="py-2 px-3 text-gray-800 font-medium max-w-[220px] truncate" title={a.description}>{a.description}</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${CAT_COLORS[cat] ?? "bg-gray-100 text-gray-600"}`}>
                          {a.category || "—"}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-500">{a.bu_code ?? "—"}</td>
                      <td className="py-2 px-3 text-gray-500">{a.acquisition_date ?? "—"}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-700">{fmtBRL(Number(a.acquisition_value ?? 0))}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-red-600">{fmtBRL(a.accumulated_depreciation)}</td>
                      <td className="py-2 px-3 text-right tabular-nums font-semibold text-brand-700">{fmtBRL(a.book_value)}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-amber-700">{fmtBRL(a.monthly_depreciation)}</td>
                      <td className="py-2 px-3 w-28">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${near ? "bg-red-400" : "bg-brand-400"}`}
                              style={{ width: `${Math.min(a.depreciation_pct, 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold ${near ? "text-red-600" : "text-gray-500"}`}>
                            {a.depreciation_pct.toFixed(0)}%
                          </span>
                          {near && <AlertTriangle size={9} className="text-red-400 shrink-0" />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {!loading && assets.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                    <td className="py-2.5 px-3 text-xs text-gray-700" colSpan={5}>Total</td>
                    <td className="py-2.5 px-3 text-right text-xs tabular-nums text-gray-900">{fmtBRL(totalCost)}</td>
                    <td className="py-2.5 px-3 text-right text-xs tabular-nums text-red-700">{fmtBRL(totalDepr)}</td>
                    <td className="py-2.5 px-3 text-right text-xs tabular-nums text-brand-700">{fmtBRL(totalBV)}</td>
                    <td className="py-2.5 px-3 text-right text-xs tabular-nums text-amber-700">{fmtBRL(monthlyDeprTotal)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* ── Depreciation Schedule (next 12 months) ───────────────── */}
        {!loading && activeAssets.length > 0 && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown size={14} className="text-red-500" />
              <span className="text-base font-semibold text-gray-900">
                Cronograma de Depreciação — Próximos 12 Meses
              </span>
              <span className="ml-auto text-xs text-gray-400">Método: Linha Reta</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {depSchedule.map((row, i) => (
                <div key={row.month} className={`rounded-xl p-3 text-center ${i === 0 ? "bg-brand-50 border border-brand-200" : "bg-gray-50"}`}>
                  <div className="text-xs text-gray-400 font-semibold mb-1">{row.month}</div>
                  <div className={`text-sm font-bold tabular-nums ${i === 0 ? "text-brand-700" : "text-red-600"}`}>
                    {fmtBRL(row.amount)}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-gray-400">
              Total depreciação projetada 12 meses:{" "}
              <strong className="text-gray-700">
                {fmtBRL(depSchedule.reduce((s, r) => s + r.amount, 0))}
              </strong>
            </div>
          </div>
        )}

        {/* ── CAPEX by BU / Category ──────────────────────────────── */}
        {!loading && activeAssets.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Building2 size={14} className="text-brand-600" />
                <span className="text-base font-semibold text-gray-900">CAPEX por Business Unit</span>
              </div>
              <div className="space-y-3">
                {buCapex.map((b) => {
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
                        <div
                          className="h-full bg-brand-400 rounded-full"
                          style={{ width: `${100 - deprPct}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{(100 - deprPct).toFixed(0)}% valor residual restante</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={14} className="text-brand-600" />
                <span className="text-base font-semibold text-gray-900">CAPEX por Categoria</span>
              </div>
              <div className="table-scroll">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="py-2 px-2 text-gray-500 font-semibold uppercase tracking-wide">Categoria</th>
                      <th className="py-2 px-2 text-gray-500 font-semibold text-right uppercase tracking-wide">Qtd</th>
                      <th className="py-2 px-2 text-gray-500 font-semibold text-right uppercase tracking-wide">Custo Total</th>
                      <th className="py-2 px-2 text-gray-500 font-semibold text-right uppercase tracking-wide">Valor Líquido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catCapex.map((c) => {
                      const cat = normalizeCategory(c.category);
                      return (
                        <tr key={c.category} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2 px-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${CAT_COLORS[cat] ?? "bg-gray-100 text-gray-600"}`}>
                              {c.category}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right text-gray-500">{c.count}</td>
                          <td className="py-2 px-2 text-right tabular-nums text-gray-700">{fmtBRL(c.totalCost)}</td>
                          <td className="py-2 px-2 text-right tabular-nums font-semibold text-brand-700">{fmtBRL(c.totalBV)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── GL integration notice ─────────────────────────────────── */}
        {!loading && monthlyDeprTotal > 0 && (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Integração GL:</span>{" "}
              Para registrar a depreciação mensal no Razão Geral, crie um lançamento GL
              debitando <strong>6.1.09 Depreciação e Amortização</strong> e creditando{" "}
              <strong>1.2.01 Imobilizado (líquido)</strong> pelo valor de{" "}
              <strong>{fmtBRL(monthlyDeprTotal)}/mês</strong>.{" "}
              <Link href="/awq/epm/gl/add" className="underline font-semibold ml-1">
                Criar lançamento →
              </Link>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs">
          <Link href="/awq/epm" className="text-brand-600 hover:underline">← EPM Overview</Link>
          <span className="text-gray-300">|</span>
          <Link href="/awq/erp/assets" className="text-brand-600 hover:underline">ERP Assets →</Link>
          <Link href="/awq/epm/gl" className="text-brand-600 hover:underline">GL →</Link>
          <Link href="/awq/epm/budget" className="text-brand-600 hover:underline">Budget →</Link>
        </div>

      </div>
    </>
  );
}
