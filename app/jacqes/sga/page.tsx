"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import Header from "@/components/Header";
import {
  DollarSign, TrendingUp, Users, BarChart3,
  CheckCircle2, Clock, Info, AlertTriangle,
} from "lucide-react";
import { buData, monthlyRevenue, JACQES_MRR, JACQES_MRR_Q1 } from "@/lib/awq-group-data";
import { revenueData } from "@/lib/data";

// ─── Source of truth ──────────────────────────────────────────────────────────
const _jacqes = buData.find((b) => b.id === "jacqes")!;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  return "R$" + n.toLocaleString("pt-BR");
}

function variance(actual: number, budget: number) {
  if (budget === 0) return 0;
  return ((actual - budget) / budget) * 100;
}

// ─── Clientes (Notion CRM) ────────────────────────────────────────────────────
const clientes = [
  { projeto: "CEM",             tipo: "FEE", fee: 3_200, status: "Pago"     },
  { projeto: "CAROL BERTOLINI", tipo: "FEE", fee: 1_790, status: "Pendente" },
  { projeto: "ANDRÉ VIEIRA",    tipo: "FEE", fee: 1_500, status: "Pendente" },
  { projeto: "TATI SIMÕES",     tipo: "FEE", fee: 1_790, status: "Pago"     },
];
const totalPago = clientes.filter((c) => c.status === "Pago").reduce((s, c) => s + c.fee, 0);
const totalPend = clientes.filter((c) => c.status === "Pendente").reduce((s, c) => s + c.fee, 0);

// ─── Período expandido 2021–2030 ─────────────────────────────────────────────
const YEAR_START = 2021;
const YEAR_END   = 2030;
const ALL_YEARS  = Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, i) => YEAR_START + i);
const MES_PT     = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const TOTAL_MIS  = ALL_YEARS.length * 12; // 120

/** mi = índice global de mês: 0 = Jan/2021 … 119 = Dez/2030 */
function miOf(year: number, mes: number) { return (year - YEAR_START) * 12 + mes; }
function yearOfMi(mi: number) { return YEAR_START + Math.floor(mi / 12); }
function mesOfMi(mi: number)  { return mi % 12; }
function labelMi(mi: number)  { return `${MES_PT[mesOfMi(mi)]}/${String(yearOfMi(mi)).slice(2)}`; }

// Dados reais mapeados por índice global (Notion CRM)
const REAL_BY_MI: Partial<Record<number, number>> = {
  [miOf(2026, 0)]: JACQES_MRR_Q1,  // Jan/26 — 3 clientes
  [miOf(2026, 1)]: JACQES_MRR_Q1,  // Fev/26 — 3 clientes
  [miOf(2026, 2)]: JACQES_MRR_Q1,  // Mar/26 — 3 clientes
  [miOf(2026, 3)]: JACQES_MRR,     // Abr/26 — 4 clientes (Tati)
};
const realRevArr: number[] = Array.from({ length: TOTAL_MIS }, (_, mi) => REAL_BY_MI[mi] ?? 0);
const zeroArr:    number[] = Array(TOTAL_MIS).fill(0);

// ─── DRE Matricial — linhas × meses (Prev | Real) ────────────────────────────
type DreRow = {
  label:  string;
  indent: number;
  bold:   boolean;
  type:   string;
  real:   number[];
  prev:   number[];
};

const dreRows: DreRow[] = [
  { label: "(+) Receita Bruta de Serviços",        indent: 0, bold: false, type: "revenue",   real: realRevArr, prev: zeroArr },
  { label: "    (-) Deduções (ISS · PIS · COFINS)", indent: 1, bold: false, type: "deduction", real: zeroArr,    prev: zeroArr },
  { label: "(=) Receita Líquida",                  indent: 0, bold: true,  type: "subtotal",  real: realRevArr, prev: zeroArr },
  { label: "    (-) Custo dos Serviços (COGS)",    indent: 1, bold: false, type: "cost",      real: zeroArr,    prev: zeroArr },
  { label: "(=) Lucro Bruto",                      indent: 0, bold: true,  type: "subtotal",  real: zeroArr,    prev: zeroArr },
  { label: "    (-) Despesas com Pessoal",         indent: 1, bold: false, type: "cost",      real: zeroArr,    prev: zeroArr },
  { label: "    (-) Despesas Administrativas",     indent: 1, bold: false, type: "cost",      real: zeroArr,    prev: zeroArr },
  { label: "    (-) Vendas & Marketing",           indent: 1, bold: false, type: "cost",      real: zeroArr,    prev: zeroArr },
  { label: "(=) EBITDA",                           indent: 0, bold: true,  type: "ebitda",    real: zeroArr,    prev: zeroArr },
  { label: "    (-) Depreciação e Amortização",    indent: 1, bold: false, type: "cost",      real: zeroArr,    prev: zeroArr },
  { label: "(=) EBIT",                             indent: 0, bold: true,  type: "subtotal",  real: zeroArr,    prev: zeroArr },
  { label: "    (+/-) Resultado Financeiro",       indent: 1, bold: false, type: "financial", real: zeroArr,    prev: zeroArr },
  { label: "(=) LAIR",                             indent: 0, bold: true,  type: "subtotal",  real: zeroArr,    prev: zeroArr },
  { label: "    (-) IR / CSLL",                   indent: 1, bold: false, type: "tax",       real: zeroArr,    prev: zeroArr },
  { label: "(=) Lucro Líquido",                   indent: 0, bold: true,  type: "net",       real: zeroArr,    prev: zeroArr },
];

// ─── Unit Econ ────────────────────────────────────────────────────────────────
const mrrHistory = monthlyRevenue
  .filter((m) => m.jacqes > 0)
  .map((m) => ({ month: m.month, mrr: m.jacqes }));
const latestMrr = mrrHistory[mrrHistory.length - 1];
const prevMrr   = mrrHistory[mrrHistory.length - 2];
const mrrGrowth = prevMrr
  ? (((latestMrr.mrr - prevMrr.mrr) / prevMrr.mrr) * 100).toFixed(1)
  : "0.0";
const arr = latestMrr.mrr * 12;
const maxMrr = Math.max(...mrrHistory.map((r) => r.mrr));

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "receita",   label: "Receita"      },
  { id: "dre",       label: "DRE"          },
  { id: "clientes",  label: "Clientes"     },
  { id: "unit-econ", label: "Unit Econ"    },
  { id: "budget",    label: "Budget"       },
] as const;
type TabId = (typeof TABS)[number]["id"];

// ─── Tooltip do gráfico ───────────────────────────────────────────────────────
function ChartTooltip({
  active, payload, label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg min-w-[140px]">
      <div className="text-[11px] font-semibold text-gray-900 mb-1.5">{label}</div>
      {payload.map((e) => (
        <div key={e.name} className="flex items-center justify-between gap-4 text-xs py-0.5">
          <span className="text-gray-500 capitalize">{e.name}</span>
          <span className="font-semibold text-gray-900">{fmtR(e.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SgaPage() {
  const [tab,     setTab]     = useState<TabId>("receita");
  const [dreView, setDreView] = useState<"both" | "prev" | "real">("both");

  // ── Seletor de período expandido 2021–2030 ──────────────────────────────
  type Granularity = "dia" | "mes" | "ano";
  const [gran,     setGran]     = useState<Granularity>("mes");
  const [miFrom,   setMiFrom]   = useState(miOf(2026, 0));   // Jan/26
  const [miTo,     setMiTo]     = useState(miOf(2026, 3));   // Abr/26
  const [yearFrom, setYearFrom] = useState(2026);
  const [yearTo,   setYearTo]   = useState(2026);
  const [dateFrom, setDateFrom] = useState("2026-01-01");
  const [dateTo,   setDateTo]   = useState("2026-04-30");

  // Índices de mês ativos conforme granularidade
  const activeMIs: number[] = (() => {
    if (gran === "mes") {
      return Array.from({ length: miTo - miFrom + 1 }, (_, i) => miFrom + i);
    }
    if (gran === "ano") {
      const s = miOf(yearFrom, 0);
      const e = miOf(yearTo,   11);
      return Array.from({ length: e - s + 1 }, (_, i) => s + i);
    }
    // dia → converte para intervalo de meses
    const [fy, fm] = dateFrom.split("-").map(Number);
    const [ty, tm] = dateTo.split("-").map(Number);
    const s = miOf(fy, fm - 1);
    const e = miOf(ty, tm - 1);
    return e >= s ? Array.from({ length: e - s + 1 }, (_, i) => s + i) : [s];
  })();

  const activeYears = gran === "ano"
    ? Array.from({ length: yearTo - yearFrom + 1 }, (_, i) => yearFrom + i)
    : [];

  const periodLabel = (() => {
    if (gran === "ano") return yearFrom === yearTo ? String(yearFrom) : `${yearFrom}–${yearTo}`;
    if (gran === "dia") return `${dateFrom.slice(0, 7)} → ${dateTo.slice(0, 7)}`;
    return miFrom === miTo ? labelMi(miFrom) : `${labelMi(miFrom)}–${labelMi(miTo)}`;
  })();

  return (
    <>
      <Header
        title="SG&A — JACQES"
        subtitle="Indicadores financeiros consolidados · Notion CRM · Jan–Abr 2026"
      />
      <div className="page-container">

        {/* ── Tab bar ───────────────────────────────────────────────────────── */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                tab === t.id
                  ? "bg-white text-brand-700 shadow-sm"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════ RECEITA ══════════════════════════════════════════ */}
        {tab === "receita" && (
          <div className="space-y-6">
            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "MRR Atual (Abr/26)",     value: fmtR(JACQES_MRR),           sub: "4 clientes FEE · Notion CRM",   icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Receita YTD (Jan–Abr)",  value: fmtR(_jacqes.revenue),       sub: "6.490×3 + 8.280 · 4 meses",    icon: BarChart3,  color: "text-brand-600",   bg: "bg-brand-50"   },
                { label: "ARR Projetado",           value: fmtR(arr),                   sub: "MRR Abr/26 × 12",              icon: TrendingUp, color: "text-violet-700",  bg: "bg-violet-50"  },
                { label: "Contas Ativas",           value: String(_jacqes.customers),   sub: "CEM · Carol · André · Tati",   icon: Users,      color: "text-cyan-700",    bg: "bg-cyan-50"    },
              ].map((c) => {
                const Icon = c.icon;
                return (
                  <div key={c.label} className="card p-5 flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
                      <Icon size={18} className={c.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
                      <div className="text-xs font-medium text-gray-400 mt-0.5">{c.label}</div>
                      <div className="text-[10px] text-gray-400 mt-1">{c.sub}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Gráfico mensal */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                Receita Mensal — Jan–Abr/26
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">EMPÍRICO</span>
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revenueData} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => fmtR(v)} width={70} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="revenue" name="Receita" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tabela mensal */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Detalhe por Mês</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Mês</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Receita</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Clientes</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueData.map((d) => (
                    <tr key={d.month} className="border-b border-gray-100 hover:bg-gray-50/80">
                      <td className="py-2.5 px-3 text-xs text-gray-500 font-medium">{d.month}</td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-900">{fmtR(d.revenue)}</td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-500">
                        {d.revenue === 8_280 ? "4" : "3"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-300">
                    <td className="py-2.5 px-3 text-xs font-bold text-gray-700">YTD Jan–Abr</td>
                    <td className="py-2.5 px-3 text-right text-xs font-bold text-brand-700">{fmtR(_jacqes.revenue)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════ DRE ══════════════════════════════════════════════ */}
        {tab === "dre" && (
          <div className="space-y-4">
            {/* Aviso */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2">
              <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700">
                Receita Bruta confirmada via Notion CRM.
                Deduções, custos e margens aguardam confirmação contábil — exibidos como R$0.
                Budget 2026 ainda não definido — coluna <strong>Prev</strong> exibe &quot;—&quot;.
              </p>
            </div>

            {/* Tabela DRE matricial */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  DRE — {periodLabel}
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">snapshot</span>
                </h2>

                <div className="flex items-center gap-3 flex-wrap">

                  {/* ── Granularidade: Dia / Mês / Ano ── */}
                  <div className="flex gap-0.5 p-0.5 bg-gray-100 rounded-lg">
                    {(["dia", "mes", "ano"] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => setGran(g)}
                        className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                          gran === g
                            ? "bg-white text-brand-700 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {g === "dia" ? "Dia" : g === "mes" ? "Mês" : "Ano"}
                      </button>
                    ))}
                  </div>

                  {/* ── De / Até ── */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-gray-400 font-medium">De</span>

                    {gran === "dia" && (
                      <input
                        type="date" value={dateFrom} min="2021-01-01" max="2030-12-31"
                        onChange={(e) => { setDateFrom(e.target.value); if (e.target.value > dateTo) setDateTo(e.target.value); }}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-[11px] text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-400 cursor-pointer"
                      />
                    )}
                    {gran === "mes" && (
                      <select
                        value={miFrom}
                        onChange={(e) => { const v = Number(e.target.value); setMiFrom(v); if (v > miTo) setMiTo(v); }}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-[11px] text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-400 cursor-pointer"
                      >
                        {ALL_YEARS.map((y) => (
                          <optgroup key={y} label={String(y)}>
                            {MES_PT.map((m, mi) => (
                              <option key={mi} value={miOf(y, mi)}>{m}/{String(y).slice(2)}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    )}
                    {gran === "ano" && (
                      <select
                        value={yearFrom}
                        onChange={(e) => { const v = Number(e.target.value); setYearFrom(v); if (v > yearTo) setYearTo(v); }}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-[11px] text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-400 cursor-pointer"
                      >
                        {ALL_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    )}

                    <span className="text-[11px] text-gray-400 font-medium">Até</span>

                    {gran === "dia" && (
                      <input
                        type="date" value={dateTo} min={dateFrom} max="2030-12-31"
                        onChange={(e) => { setDateTo(e.target.value); if (e.target.value < dateFrom) setDateFrom(e.target.value); }}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-[11px] text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-400 cursor-pointer"
                      />
                    )}
                    {gran === "mes" && (
                      <select
                        value={miTo}
                        onChange={(e) => { const v = Number(e.target.value); setMiTo(v); if (v < miFrom) setMiFrom(v); }}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-[11px] text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-400 cursor-pointer"
                      >
                        {ALL_YEARS.map((y) => (
                          <optgroup key={y} label={String(y)}>
                            {MES_PT.map((m, mi) => {
                              const idx = miOf(y, mi);
                              return <option key={mi} value={idx} disabled={idx < miFrom}>{m}/{String(y).slice(2)}</option>;
                            })}
                          </optgroup>
                        ))}
                      </select>
                    )}
                    {gran === "ano" && (
                      <select
                        value={yearTo}
                        onChange={(e) => { const v = Number(e.target.value); setYearTo(v); if (v < yearFrom) setYearFrom(v); }}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-[11px] text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-400 cursor-pointer"
                      >
                        {ALL_YEARS.map((y) => <option key={y} value={y} disabled={y < yearFrom}>{y}</option>)}
                      </select>
                    )}
                  </div>

                  {/* ── Prev / Real toggle ── */}
                  <div className="flex gap-0.5 p-0.5 bg-gray-100 rounded-lg">
                    {(["both", "prev", "real"] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setDreView(v)}
                        className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                          dreView === v
                            ? "bg-white text-brand-700 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        {v === "both" ? "Prev + Real" : v === "prev" ? "Só Previsto" : "Só Realizado"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {gran === "dia" && (
                <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 flex items-start gap-2">
                  <Info size={12} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-blue-700">
                    Dados por dia aguardam ingestion. Exibindo agregado por mês no intervalo selecionado.
                  </p>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-xs whitespace-nowrap border-collapse">
                  {/* ── Cabeçalho nível 1: períodos ── */}
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-[11px] font-semibold text-gray-500 min-w-[220px] bg-white sticky left-0 z-10">
                        Linha DRE
                      </th>
                      {gran === "ano"
                        ? activeYears.map((y) => (
                            <th key={y} colSpan={dreView === "both" ? 2 : 1}
                              className="text-center py-2 px-2 text-[10px] font-semibold text-gray-600 border-l border-gray-100 bg-gray-50">
                              {y}
                            </th>
                          ))
                        : activeMIs.map((mi) => (
                            <th key={mi} colSpan={dreView === "both" ? 2 : 1}
                              className="text-center py-2 px-2 text-[10px] font-semibold text-gray-600 border-l border-gray-100 bg-gray-50">
                              {labelMi(mi)}
                            </th>
                          ))
                      }
                      <th colSpan={dreView === "both" ? 2 : 1}
                        className="text-center py-2 px-2 text-[10px] font-bold text-brand-700 border-l border-gray-200 bg-brand-50">
                        Total
                      </th>
                    </tr>
                    {/* ── Cabeçalho nível 2: Prev / Real ── */}
                    <tr className="border-b-2 border-gray-200 bg-gray-50">
                      <th className="sticky left-0 z-10 bg-gray-50" />
                      {(gran === "ano" ? activeYears : activeMIs).flatMap((key) => [
                        ...(dreView !== "real"
                          ? [<th key={`ph${key}`} className="py-1.5 px-3 text-[10px] font-semibold text-center border-l border-gray-100 text-gray-400 w-[88px]">Prev</th>]
                          : []),
                        ...(dreView !== "prev"
                          ? [<th key={`rh${key}`} className="py-1.5 px-3 text-[10px] font-semibold text-center text-gray-700 w-[88px]">Real</th>]
                          : []),
                      ])}
                      {dreView !== "real" && <th className="py-1.5 px-3 text-[10px] font-semibold text-center border-l border-gray-200 text-gray-400 w-[88px]">Prev</th>}
                      {dreView !== "prev" && <th className="py-1.5 px-3 text-[10px] font-semibold text-center text-brand-600 w-[88px]">Real</th>}
                    </tr>
                  </thead>

                  {/* ── Corpo ── */}
                  <tbody>
                    {dreRows.map((row, ri) => {
                      const isSubtotal = row.bold;
                      const isReceita  = row.type === "revenue";
                      const isNet      = row.type === "net";
                      const rowBg      = isNet ? "bg-brand-50/60" : isSubtotal ? "bg-gray-50" : "";
                      const labelClass = isSubtotal
                        ? "font-bold text-gray-800"
                        : row.indent === 1 ? "text-gray-400" : "text-gray-600";

                      // Colunas modo Mês / Dia (um td por mês)
                      const monthCols = (gran !== "ano" ? activeMIs : []).flatMap((mi) => {
                        const rv = row.real[mi];
                        const pv = row.prev[mi];
                        const rc = rv === 0 ? "text-gray-300"
                          : isReceita ? "text-emerald-700 font-semibold"
                          : isSubtotal ? "font-bold text-gray-900"
                          : "text-gray-700";
                        return [
                          ...(dreView !== "real"
                            ? [<td key={`p${mi}`} className="py-2.5 px-3 text-right border-l border-gray-100 text-gray-400">
                                {pv === 0 ? "—" : fmtR(pv)}
                              </td>]
                            : []),
                          ...(dreView !== "prev"
                            ? [<td key={`r${mi}`} className={`py-2.5 px-3 text-right ${rc}`}>{fmtR(rv)}</td>]
                            : []),
                        ];
                      });

                      // Colunas modo Ano (agrega 12 meses por ano)
                      const yearCols = (gran === "ano" ? activeYears : []).flatMap((y) => {
                        const yMIs    = Array.from({ length: 12 }, (_, m) => miOf(y, m));
                        const rv      = yMIs.reduce((s, mi) => s + row.real[mi], 0);
                        const pv      = yMIs.reduce((s, mi) => s + row.prev[mi], 0);
                        const rc = rv === 0 ? "text-gray-300"
                          : isReceita ? "text-emerald-700 font-semibold"
                          : isSubtotal ? "font-bold text-gray-900"
                          : "text-gray-700";
                        return [
                          ...(dreView !== "real"
                            ? [<td key={`py${y}`} className="py-2.5 px-3 text-right border-l border-gray-100 text-gray-400">
                                {pv === 0 ? "—" : fmtR(pv)}
                              </td>]
                            : []),
                          ...(dreView !== "prev"
                            ? [<td key={`ry${y}`} className={`py-2.5 px-3 text-right ${rc}`}>
                                {rv === 0 ? "—" : fmtR(rv)}
                              </td>]
                            : []),
                        ];
                      });

                      // Totais do período selecionado
                      const totalReal = activeMIs.reduce((s, mi) => s + row.real[mi], 0);
                      const totalPrev = activeMIs.reduce((s, mi) => s + row.prev[mi], 0);
                      const totalRc = totalReal === 0 ? "text-gray-300"
                        : isNet ? "font-bold text-brand-700"
                        : isSubtotal ? "font-bold text-gray-900"
                        : isReceita ? "font-semibold text-emerald-700"
                        : "text-gray-700";

                      return (
                        <tr key={ri} className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${rowBg}`}>
                          <td className={`py-2.5 px-3 sticky left-0 z-10 ${rowBg || "bg-white"} ${labelClass}`}
                            style={{ paddingLeft: row.indent === 1 ? 24 : 12 }}>
                            {row.label}
                          </td>

                          {gran === "ano" ? yearCols : monthCols}

                          {dreView !== "real" && (
                            <td className="py-2.5 px-3 text-right border-l border-gray-200 text-gray-400">
                              {totalPrev === 0 ? "—" : fmtR(totalPrev)}
                            </td>
                          )}
                          {dreView !== "prev" && (
                            <td className={`py-2.5 px-3 text-right ${totalRc}`}>
                              {totalReal === 0 ? "—" : fmtR(totalReal)}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ CLIENTES ═════════════════════════════════════════ */}
        {tab === "clientes" && (
          <div className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Contas Ativas",      value: String(clientes.length), sub: "Notion CRM · Abr/2026",   icon: Users,       color: "text-brand-600",   bg: "bg-brand-50"   },
                { label: "MRR Contratado",     value: fmtR(JACQES_MRR),        sub: "Soma dos FEEs mensais",   icon: DollarSign,  color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Recebido no Mês",    value: fmtR(totalPago),          sub: "Status: Pago",           icon: CheckCircle2,color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "A Receber",          value: fmtR(totalPend),          sub: "Status: Pendente",       icon: Clock,       color: "text-amber-700",   bg: "bg-amber-50"   },
              ].map((c) => {
                const Icon = c.icon;
                return (
                  <div key={c.label} className="card p-5 flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
                      <Icon size={18} className={c.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
                      <div className="text-xs font-medium text-gray-400 mt-0.5">{c.label}</div>
                      <div className="text-[10px] text-gray-400 mt-1">{c.sub}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tabela de clientes */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900">Carteira de Clientes</h2>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">NOTION · Abr/2026</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Cliente</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Tipo</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">FEE Mensal</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">% MRR</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((c) => (
                    <tr key={c.projeto} className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-xs font-semibold text-gray-900">{c.projeto}</td>
                      <td className="py-2.5 px-3 text-xs text-gray-400">{c.tipo}</td>
                      <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">{fmtR(c.fee)}</td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-500">
                        {((c.fee / JACQES_MRR) * 100).toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {c.status === "Pago"
                          ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Pago</span>
                          : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Pendente</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-300">
                    <td className="py-2.5 px-3 text-xs font-bold text-gray-700">Total MRR</td>
                    <td />
                    <td className="py-2.5 px-3 text-right text-xs font-bold text-brand-700">{fmtR(JACQES_MRR)}</td>
                    <td className="py-2.5 px-3 text-right text-xs text-gray-400">100%</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════════ UNIT ECON ═════════════════════════════════════════ */}
        {tab === "unit-econ" && (
          <div className="space-y-6">
            {/* KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "MRR Abr/26",          value: fmtR(JACQES_MRR), sub: "Notion CRM · empírico",      icon: DollarSign, color: "text-brand-600",   bg: "bg-brand-50"   },
                { label: "ARR Projetado",        value: fmtR(arr),         sub: "MRR × 12",                  icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Receita YTD",          value: fmtR(_jacqes.revenue), sub: "Jan–Abr/26 · 4 meses", icon: BarChart3,  color: "text-violet-700",  bg: "bg-violet-50"  },
                { label: "MoM (Mar→Abr)",        value: `+${mrrGrowth}%`, sub: "Tati Simões entrou em Abr", icon: TrendingUp, color: "text-amber-700",   bg: "bg-amber-50"   },
              ].map((c) => {
                const Icon = c.icon;
                return (
                  <div key={c.label} className="card p-5 flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
                      <Icon size={18} className={c.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
                      <div className="text-xs font-medium text-gray-400 mt-0.5">{c.label}</div>
                      <div className="text-[10px] text-gray-400 mt-1">{c.sub}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* MRR evolution */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                Evolução do MRR — Jan–Abr/26
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">EMPÍRICO</span>
              </h2>
              <div className="space-y-3">
                {mrrHistory.map((row) => (
                  <div key={row.month} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-14 shrink-0">{row.month}</span>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full"
                        style={{ width: `${(row.mrr / maxMrr) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-900 w-20 text-right shrink-0">{fmtR(row.mrr)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Margens */}
            <div className="card p-5">
              <div className="flex items-start gap-2">
                <Info size={14} className="text-gray-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Margem Bruta, EBITDA e Margem Líquida aguardam confirmação contábil. CAC, LTV e Payback
                  dependem de dados por cliente do CRM/Notion e serão calculados após ingestão real.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ BUDGET ═══════════════════════════════════════════ */}
        {tab === "budget" && (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Receita Budget 2026",   value: "R$0",               sub: "Orçamento anual ainda não definido", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Receita YTD Realizada", value: fmtR(_jacqes.revenue), sub: "Jan–Abr/26 · Notion CRM",         icon: BarChart3,  color: "text-brand-600",   bg: "bg-brand-50"   },
                { label: "% Budget Executado",    value: "—",                  sub: "Budget ainda não definido",         icon: TrendingUp, color: "text-violet-700",  bg: "bg-violet-50"  },
              ].map((c) => {
                const Icon = c.icon;
                return (
                  <div key={c.label} className="card p-5 flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
                      <Icon size={18} className={c.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
                      <div className="text-xs font-medium text-gray-400 mt-0.5">{c.label}</div>
                      <div className="text-[10px] text-gray-400 mt-1">{c.sub}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Budget lines */}
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                Budget vs Realizado — 2026
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">snapshot</span>
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Linha</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Budget Ano</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Realizado YTD</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Var. %</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { category: "Receita de Serviços", budget: 0, actual: _jacqes.revenue,    type: "revenue"  },
                    { category: "COGS",                budget: 0, actual: 0,                  type: "cost"     },
                    { category: "Lucro Bruto",         budget: 0, actual: _jacqes.grossProfit, type: "subtotal" },
                    { category: "EBITDA",              budget: 0, actual: _jacqes.ebitda,      type: "ebitda"   },
                    { category: "Lucro Líquido",       budget: 0, actual: _jacqes.netIncome,   type: "net"      },
                  ].map((row) => {
                    const varPct = variance(row.actual, row.budget);
                    const isSubtotal = ["subtotal", "ebitda", "net"].includes(row.type);
                    return (
                      <tr key={row.category} className={`border-b border-gray-100 ${isSubtotal ? "bg-gray-50" : "hover:bg-gray-50/80"}`}>
                        <td className={`py-2.5 px-3 text-xs ${isSubtotal ? "font-bold text-gray-700" : "text-gray-400"}`}>
                          {row.category}
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs text-gray-400">{fmtR(row.budget)}</td>
                        <td className={`py-2.5 px-3 text-right text-xs font-semibold ${isSubtotal ? "text-gray-900" : "text-gray-900"}`}>
                          {fmtR(row.actual)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs">
                          {row.budget === 0
                            ? <span className="text-gray-400">—</span>
                            : <span className={varPct >= 0 ? "text-emerald-600 font-semibold" : "text-red-600 font-semibold"}>
                                {varPct >= 0 ? "+" : ""}{varPct.toFixed(1)}%
                              </span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
