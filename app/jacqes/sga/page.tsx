"use client";

import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import Header from "@/components/Header";
import {
  DollarSign, TrendingUp, Users, BarChart3,
  ArrowUpRight, ArrowDownRight, Minus, CheckCircle2, Clock, Info, AlertTriangle,
} from "lucide-react";
import { buData, monthlyRevenue, JACQES_MRR } from "@/lib/awq-group-data";
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

// ─── DRE Matricial — linhas × meses (Prev | Real) ────────────────────────────
// Meses confirmados (Notion CRM). Budget ainda não definido → Prev = 0 → exibe "—".
// Receita Líquida = Receita Bruta (deduções aguardam confirmação fiscal).
// Subtotais derivados: Lucro Bruto = Rec.Liq − COGS; EBITDA = LB − OpEx; etc.

const MONTHS = ["Jan/26", "Fev/26", "Mar/26", "Abr/26"] as const;

// Real por mês: [jan, fev, mar, abr]
const mrrReal = monthlyRevenue.map((m) => m.jacqes) as [number, number, number, number];
const zero4: [number, number, number, number] = [0, 0, 0, 0];

type DreRow = {
  label:  string;
  indent: number;        // 0 = principal, 1 = sub-item
  bold:   boolean;       // subtotais em negrito
  type:   string;
  real:   [number, number, number, number];
  prev:   [number, number, number, number];
};

const dreRows: DreRow[] = [
  { label: "(+) Receita Bruta de Serviços",     indent: 0, bold: false, type: "revenue",    real: mrrReal, prev: zero4 },
  { label: "    (-) Deduções (ISS · PIS · COFINS)", indent: 1, bold: false, type: "deduction", real: zero4,   prev: zero4 },
  { label: "(=) Receita Líquida",               indent: 0, bold: true,  type: "subtotal",   real: mrrReal, prev: zero4 },
  { label: "    (-) Custo dos Serviços (COGS)", indent: 1, bold: false, type: "cost",       real: zero4,   prev: zero4 },
  { label: "(=) Lucro Bruto",                   indent: 0, bold: true,  type: "subtotal",   real: zero4,   prev: zero4 },
  { label: "    (-) Despesas com Pessoal",      indent: 1, bold: false, type: "cost",       real: zero4,   prev: zero4 },
  { label: "    (-) Despesas Administrativas",  indent: 1, bold: false, type: "cost",       real: zero4,   prev: zero4 },
  { label: "    (-) Vendas & Marketing",        indent: 1, bold: false, type: "cost",       real: zero4,   prev: zero4 },
  { label: "(=) EBITDA",                        indent: 0, bold: true,  type: "ebitda",     real: zero4,   prev: zero4 },
  { label: "    (-) Depreciação e Amortização", indent: 1, bold: false, type: "cost",       real: zero4,   prev: zero4 },
  { label: "(=) EBIT",                          indent: 0, bold: true,  type: "subtotal",   real: zero4,   prev: zero4 },
  { label: "    (+/-) Resultado Financeiro",    indent: 1, bold: false, type: "financial",  real: zero4,   prev: zero4 },
  { label: "(=) LAIR",                          indent: 0, bold: true,  type: "subtotal",   real: zero4,   prev: zero4 },
  { label: "    (-) IR / CSLL",                indent: 1, bold: false, type: "tax",        real: zero4,   prev: zero4 },
  { label: "(=) Lucro Líquido",               indent: 0, bold: true,  type: "net",        real: zero4,   prev: zero4 },
];

function ytd(vals: [number, number, number, number]) {
  return vals.reduce((s, v) => s + v, 0);
}

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
  const [tab, setTab] = useState<TabId>("receita");

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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  DRE Anual — 2026
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">snapshot</span>
                </h2>
                <span className="text-[10px] text-gray-400">Prev = Previsto · Real = Realizado</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs whitespace-nowrap border-collapse">
                  {/* ── Cabeçalho nível 1: meses ── */}
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-[11px] font-semibold text-gray-500 min-w-[220px] bg-white sticky left-0 z-10">
                        Linha DRE
                      </th>
                      {MONTHS.map((m) => (
                        <th key={m} colSpan={2}
                          className="text-center py-2 px-2 text-[10px] font-semibold text-gray-600 border-l border-gray-100 bg-gray-50">
                          {m}
                        </th>
                      ))}
                      <th colSpan={2}
                        className="text-center py-2 px-2 text-[10px] font-bold text-brand-700 border-l border-gray-200 bg-brand-50">
                        YTD Total
                      </th>
                    </tr>
                    {/* ── Cabeçalho nível 2: Prev / Real ── */}
                    <tr className="border-b-2 border-gray-200 bg-gray-50">
                      <th className="sticky left-0 z-10 bg-gray-50" />
                      {[...MONTHS.map(() => null), null].map((_, gi) => (
                        [
                          <th key={`p${gi}`}
                            className={`py-1.5 px-3 text-[10px] font-semibold text-center border-l border-gray-100 text-gray-400 w-[88px]`}>
                            Prev
                          </th>,
                          <th key={`r${gi}`}
                            className={`py-1.5 px-3 text-[10px] font-semibold text-center text-gray-700 w-[88px] ${gi === MONTHS.length ? "border-l border-gray-200" : ""}`}>
                            Real
                          </th>,
                        ]
                      ))}
                    </tr>
                  </thead>

                  {/* ── Corpo ── */}
                  <tbody>
                    {dreRows.map((row, ri) => {
                      const ytdReal = ytd(row.real);
                      const ytdPrev = ytd(row.prev);
                      const isSubtotal = row.bold;
                      const isReceita  = row.type === "revenue";
                      const isNet      = row.type === "net";

                      const rowBg = isNet
                        ? "bg-brand-50/60"
                        : isSubtotal
                          ? "bg-gray-50"
                          : "";

                      const labelClass = isSubtotal
                        ? "font-bold text-gray-800"
                        : row.indent === 1
                          ? "text-gray-400"
                          : "text-gray-600";

                      return (
                        <tr key={ri} className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${rowBg}`}>
                          {/* Label — sticky */}
                          <td className={`py-2.5 px-3 sticky left-0 z-10 ${rowBg || "bg-white"} ${labelClass}`}
                            style={{ paddingLeft: row.indent === 1 ? 24 : 12 }}>
                            {row.label}
                          </td>

                          {/* Células por mês */}
                          {row.real.flatMap((realVal, mi) => {
                            const prevVal = row.prev[mi];
                            const borderL = "border-l border-gray-100";
                            const realColor = realVal === 0
                              ? "text-gray-300"
                              : isReceita
                                ? "text-emerald-700 font-semibold"
                                : isSubtotal
                                  ? "font-bold text-gray-900"
                                  : "text-gray-700";
                            return [
                              <td key={`p${mi}`} className={`py-2.5 px-3 text-right ${borderL} text-gray-400`}>
                                {prevVal === 0 ? "—" : fmtR(prevVal)}
                              </td>,
                              <td key={`r${mi}`} className={`py-2.5 px-3 text-right ${realColor}`}>
                                {fmtR(realVal)}
                              </td>,
                            ];
                          })}

                          {/* YTD */}
                          <td className="py-2.5 px-3 text-right border-l border-gray-200 text-gray-400">
                            {ytdPrev === 0 ? "—" : fmtR(ytdPrev)}
                          </td>
                          <td className={`py-2.5 px-3 text-right ${
                            ytdReal === 0
                              ? "text-gray-300"
                              : isNet
                                ? "font-bold text-brand-700"
                                : isSubtotal
                                  ? "font-bold text-gray-900"
                                  : isReceita
                                    ? "font-semibold text-emerald-700"
                                    : "text-gray-700"
                          }`}>
                            {fmtR(ytdReal)}
                          </td>
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
