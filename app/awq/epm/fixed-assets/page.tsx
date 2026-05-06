// ─── /awq/epm/fixed-assets — Ativo Imobilizado ────────────────────────────────
//
// Fixed Asset Register with:
//   • Asset list with book value, accumulated depreciation
//   • Monthly depreciation schedule (straight-line)
//   • CAPEX tracking by BU and category
//   • Disposal tracking

import Header from "@/components/Header";
import Link from "next/link";
import {
  Building2, TrendingDown, DollarSign, BarChart3,
  AlertTriangle, CheckCircle2, Package,
} from "lucide-react";

function fmtBRL(n: number): string {
  const abs  = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000)     return sign + "R$" + (abs / 1_000).toFixed(0)     + "K";
  return sign + "R$" + abs.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface FixedAsset {
  asset_code:              string;
  asset_name:              string;
  asset_category:          string;
  bu:                      string;
  acquisition_date:        string;
  cost:                    number;
  useful_life_months:      number;
  residual_value:          number;
  accumulated_depreciation:number;
  is_active:               boolean;
}

// ── Mock dataset — mirrors awq_epm_full_schema.sql fixed_assets table ──────────
const ASSETS: FixedAsset[] = [
  { asset_code: "HW-001", asset_name: "MacBook Pro 16\" M3 Max",        asset_category: "HARDWARE",   bu: "JACQES",  acquisition_date: "2025-03-01", cost: 24_800, useful_life_months: 48, residual_value: 2_000, accumulated_depreciation: 5_958, is_active: true },
  { asset_code: "HW-002", asset_name: "MacBook Air M2 (design)",         asset_category: "HARDWARE",   bu: "CAZA",    acquisition_date: "2025-06-01", cost: 14_200, useful_life_months: 48, residual_value: 1_000, accumulated_depreciation: 2_145, is_active: true },
  { asset_code: "HW-003", asset_name: "Monitor LG UltraWide 34\"",       asset_category: "HARDWARE",   bu: "JACQES",  acquisition_date: "2025-03-01", cost:  4_500, useful_life_months: 60, residual_value: 0,     accumulated_depreciation: 1_005, is_active: true },
  { asset_code: "HW-004", asset_name: "iPad Pro 12.9\" + Apple Pencil",  asset_category: "HARDWARE",   bu: "AWQ",     acquisition_date: "2025-09-01", cost:  9_600, useful_life_months: 36, residual_value: 0,     accumulated_depreciation: 1_600, is_active: true },
  { asset_code: "SW-001", asset_name: "Adobe Creative Cloud (anual)",    asset_category: "SOFTWARE",   bu: "CAZA",    acquisition_date: "2026-01-01", cost:  7_200, useful_life_months: 12, residual_value: 0,     accumulated_depreciation: 1_800, is_active: true },
  { asset_code: "SW-002", asset_name: "Figma Organization (anual)",      asset_category: "SOFTWARE",   bu: "CAZA",    acquisition_date: "2026-01-01", cost:  3_600, useful_life_months: 12, residual_value: 0,     accumulated_depreciation:   900, is_active: true },
  { asset_code: "FU-001", asset_name: "Mesa de escritório + cadeira ergo",asset_category: "FURNITURE",  bu: "AWQ",     acquisition_date: "2024-10-01", cost:  6_800, useful_life_months: 60, residual_value: 0,     accumulated_depreciation: 1_360, is_active: true },
  { asset_code: "FU-002", asset_name: "Câmera Sony ZV-E10 + acessórios", asset_category: "EQUIPMENT",  bu: "CAZA",    acquisition_date: "2025-01-01", cost:  8_500, useful_life_months: 60, residual_value: 500,   accumulated_depreciation: 1_600, is_active: true },
  { asset_code: "HW-005", asset_name: "iPhone 15 Pro (corporativo)",     asset_category: "HARDWARE",   bu: "JACQES",  acquisition_date: "2024-11-01", cost:  8_200, useful_life_months: 24, residual_value: 1_000, accumulated_depreciation: 4_267, is_active: true },
  { asset_code: "SW-003", asset_name: "HubSpot CRM Pro (anual)",         asset_category: "SOFTWARE",   bu: "ADVISOR", acquisition_date: "2026-01-01", cost:  5_400, useful_life_months: 12, residual_value: 0,     accumulated_depreciation: 1_350, is_active: true },
];

function bookValue(a: FixedAsset): number {
  return Math.max(a.cost - a.accumulated_depreciation, a.residual_value);
}

function monthlyDepreciation(a: FixedAsset): number {
  return (a.cost - a.residual_value) / a.useful_life_months;
}

function depreciationPct(a: FixedAsset): number {
  return a.cost > 0 ? (a.accumulated_depreciation / a.cost) * 100 : 0;
}

// ── Generate next 12 months depreciation schedule ───────────────────────────
function generateDepSchedule() {
  const today = new Date("2026-05-01");
  return Array.from({ length: 12 }, (_, i) => {
    const d   = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const lbl = d.toISOString().slice(0, 7);
    const total = ASSETS.filter((a) => a.is_active)
      .reduce((s, a) => s + monthlyDepreciation(a), 0);
    return { month: lbl, amount: total };
  });
}

const depSchedule = generateDepSchedule();

// ── CAPEX summary by BU ──────────────────────────────────────────────────────
const BUS = ["AWQ", "JACQES", "CAZA", "ADVISOR", "VENTURE"] as const;

function capexByBU() {
  return BUS.map((bu) => {
    const buAssets = ASSETS.filter((a) => a.bu === bu);
    const totalCost = buAssets.reduce((s, a) => s + a.cost, 0);
    const totalBV   = buAssets.reduce((s, a) => s + bookValue(a), 0);
    const totalDepr = buAssets.reduce((s, a) => s + a.accumulated_depreciation, 0);
    return { bu, count: buAssets.length, totalCost, totalBV, totalDepr };
  }).filter((r) => r.count > 0);
}

// ── CAPEX by category ────────────────────────────────────────────────────────
function capexByCategory() {
  const cats = [...new Set(ASSETS.map((a) => a.asset_category))];
  return cats.map((cat) => {
    const catAssets = ASSETS.filter((a) => a.asset_category === cat);
    return {
      category:  cat,
      count:     catAssets.length,
      totalCost: catAssets.reduce((s, a) => s + a.cost, 0),
      totalBV:   catAssets.reduce((s, a) => s + bookValue(a), 0),
    };
  });
}

const CAT_COLORS: Record<string, string> = {
  HARDWARE:  "bg-brand-100 text-brand-700",
  SOFTWARE:  "bg-violet-100 text-violet-700",
  FURNITURE: "bg-amber-100 text-amber-700",
  EQUIPMENT: "bg-cyan-100 text-cyan-700",
  VEHICLE:   "bg-emerald-100 text-emerald-700",
};

export default function FixedAssetsPage() {
  const activeAssets  = ASSETS.filter((a) => a.is_active);
  const totalCost     = activeAssets.reduce((s, a) => s + a.cost, 0);
  const totalBV       = activeAssets.reduce((s, a) => s + bookValue(a), 0);
  const totalDepr     = activeAssets.reduce((s, a) => s + a.accumulated_depreciation, 0);
  const monthlyDeprTotal = activeAssets.reduce((s, a) => s + monthlyDepreciation(a), 0);

  const buCapex   = capexByBU();
  const catCapex  = capexByCategory();

  return (
    <>
      <Header
        title="Ativo Imobilizado"
        subtitle="EPM · Fixed Assets · Depreciação Straight-Line · CAPEX"
      />
      <div className="page-container">

        {/* ── Summary KPIs ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Custo Total (CAPEX)",    value: fmtBRL(totalCost),         color: "text-gray-900"    },
            { label: "Valor Contábil Líquido", value: fmtBRL(totalBV),           color: "text-brand-700"   },
            { label: "Depreciação Acumulada",  value: fmtBRL(totalDepr),         color: "text-red-700"     },
            { label: "Depr. Mensal Corrente",  value: fmtBRL(monthlyDeprTotal),  color: "text-amber-700"   },
          ].map((card) => (
            <div key={card.label} className="card p-4">
              <div className={`text-xl font-bold tabular-nums ${card.color}`}>{card.value}</div>
              <div className="text-xs text-gray-400 mt-1">{card.label}</div>
            </div>
          ))}
        </div>

        {/* ── Asset Register ────────────────────────────────────────── */}
        <div className="card">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <Package size={14} className="text-brand-600" />
            <span className="text-sm font-semibold text-gray-900">Registro de Ativos</span>
            <span className="ml-auto text-xs text-gray-400">{activeAssets.length} ativos ativos</span>
          </div>
          <div className="table-scroll">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">Código</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">Ativo</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">Categoria</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">BU</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Custo</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Depr. Acum.</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Valor Líquido</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Depr/Mês</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">% Depreciado</th>
                </tr>
              </thead>
              <tbody>
                {ASSETS.map((a) => {
                  const bv   = bookValue(a);
                  const md   = monthlyDepreciation(a);
                  const pct  = depreciationPct(a);
                  const near = pct > 80;
                  return (
                    <tr key={a.asset_code} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3 font-mono text-gray-500">{a.asset_code}</td>
                      <td className="py-2 px-3 text-gray-800 font-medium max-w-[180px] truncate">
                        {a.asset_name}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${CAT_COLORS[a.asset_category] ?? "bg-gray-100 text-gray-600"}`}>
                          {a.asset_category}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-gray-500">{a.bu}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-700">{fmtBRL(a.cost)}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-red-600">{fmtBRL(a.accumulated_depreciation)}</td>
                      <td className="py-2 px-3 text-right tabular-nums font-semibold text-brand-700">{fmtBRL(bv)}</td>
                      <td className="py-2 px-3 text-right tabular-nums text-amber-700">{fmtBRL(md)}</td>
                      <td className="py-2 px-3 w-28">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${near ? "bg-red-400" : "bg-brand-400"}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className={`text-[10px] font-semibold ${near ? "text-red-600" : "text-gray-500"}`}>
                            {pct.toFixed(0)}%
                          </span>
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

        {/* ── Depreciation Schedule (next 12 months) ───────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown size={14} className="text-red-500" />
            <span className="text-sm font-semibold text-gray-900">
              Cronograma de Depreciação — Próximos 12 Meses
            </span>
            <span className="ml-auto text-xs text-gray-400">Método: Linha Reta</span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {depSchedule.map((row, i) => (
              <div key={row.month} className={`rounded-xl p-3 text-center ${i === 0 ? "bg-brand-50 border border-brand-200" : "bg-gray-50"}`}>
                <div className="text-[10px] text-gray-400 font-semibold mb-1">{row.month}</div>
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

        {/* ── CAPEX by BU ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={14} className="text-brand-600" />
              <span className="text-sm font-semibold text-gray-900">CAPEX por Business Unit</span>
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
                    <div className="text-[10px] text-gray-400 mt-0.5">{(100 - deprPct).toFixed(0)}% valor residual restante</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── CAPEX by Category ────────────────────────────────── */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={14} className="text-violet-600" />
              <span className="text-sm font-semibold text-gray-900">CAPEX por Categoria</span>
            </div>
            <div className="table-scroll">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="py-2 px-2 text-gray-500 font-semibold">Categoria</th>
                    <th className="py-2 px-2 text-gray-500 font-semibold text-right">Qtd</th>
                    <th className="py-2 px-2 text-gray-500 font-semibold text-right">Custo Total</th>
                    <th className="py-2 px-2 text-gray-500 font-semibold text-right">Valor Líquido</th>
                  </tr>
                </thead>
                <tbody>
                  {catCapex.map((c) => (
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
        </div>

        {/* ── GL integration notice ─────────────────────────────────── */}
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

        <div className="flex items-center gap-3 text-xs">
          <Link href="/awq/epm" className="text-brand-600 hover:underline">← EPM Overview</Link>
          <span className="text-gray-300">|</span>
          <Link href="/awq/epm/gl" className="text-brand-600 hover:underline">GL →</Link>
          <Link href="/awq/epm/budget" className="text-brand-600 hover:underline">Budget →</Link>
        </div>

      </div>
    </>
  );
}
