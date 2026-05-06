"use client";

import { useState } from "react";
import Header from "@/components/Header";
import {
  DollarSign, TrendingUp, Users, BarChart3,
  AlertTriangle, Info, Activity,
} from "lucide-react";
import { buData, monthlyRevenue, JACQES_MRR, JACQES_MRR_Q1 } from "@/lib/awq-group-data";
import { JACQES_CLIENTS } from "@/lib/jacqes-customers";

// ─── Source of truth ──────────────────────────────────────────────────────────
const _jacqes = buData.find((b) => b.id === "jacqes")!;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  return "R$" + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const SEL_CLS =
  "border border-gray-200 rounded-lg px-2 py-1.5 text-[11px] text-gray-700 bg-white " +
  "focus:outline-none focus:ring-1 focus:ring-brand-400 cursor-pointer";

// ─── Clientes — fonte única: lib/jacqes-customers.ts ─────────────────────────
const clientes = JACQES_CLIENTS;
const totalPago = clientes.filter((c) => c.status === "Pago").reduce((s, c) => s + c.fee, 0);
const totalPend = clientes.filter((c) => c.status === "Pendente").reduce((s, c) => s + c.fee, 0);

// ─── Período expandido 2021–2030 ─────────────────────────────────────────────
const YEAR_START = 2021;
const YEAR_END   = 2030;
const ALL_YEARS  = Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, i) => YEAR_START + i);
const MES_PT     = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const TOTAL_MIS  = ALL_YEARS.length * 12;

function miOf(year: number, mes: number) { return (year - YEAR_START) * 12 + mes; }
function yearOfMi(mi: number) { return YEAR_START + Math.floor(mi / 12); }
function mesOfMi(mi: number)  { return mi % 12; }
function labelMi(mi: number)  { return MES_PT[mesOfMi(mi)] + "/" + String(yearOfMi(mi)).slice(2); }

const REAL_BY_MI: Partial<Record<number, number>> = {
  [miOf(2026, 0)]: JACQES_MRR_Q1,
  [miOf(2026, 1)]: JACQES_MRR_Q1,
  [miOf(2026, 2)]: JACQES_MRR_Q1,
  [miOf(2026, 3)]: JACQES_MRR,
};
const realRevArr: number[] = Array.from({ length: TOTAL_MIS }, (_, mi) => REAL_BY_MI[mi] ?? 0);
const zeroArr: number[]    = Array(TOTAL_MIS).fill(0);

// ─── DRE rows ─────────────────────────────────────────────────────────────────
type DreRow = { label: string; indent: number; bold: boolean; type: string; real: number[]; prev: number[] };
const dreRows: DreRow[] = [
  { label: "(+) Receita Bruta de Serviços",        indent:0, bold:false, type:"revenue",   real:realRevArr, prev:zeroArr },
  { label: "    (-) Deduções (ISS · PIS · COFINS)", indent:1, bold:false, type:"deduction", real:zeroArr,    prev:zeroArr },
  { label: "(=) Receita Líquida",                  indent:0, bold:true,  type:"subtotal",  real:realRevArr, prev:zeroArr },
  { label: "    (-) Custo dos Serviços (COGS)",    indent:1, bold:false, type:"cost",      real:zeroArr,    prev:zeroArr },
  { label: "(=) Lucro Bruto",                      indent:0, bold:true,  type:"subtotal",  real:zeroArr,    prev:zeroArr },
  { label: "    (-) Despesas com Pessoal",         indent:1, bold:false, type:"cost",      real:zeroArr,    prev:zeroArr },
  { label: "    (-) Despesas Administrativas",     indent:1, bold:false, type:"cost",      real:zeroArr,    prev:zeroArr },
  { label: "    (-) Vendas & Marketing",           indent:1, bold:false, type:"cost",      real:zeroArr,    prev:zeroArr },
  { label: "(=) EBITDA",                           indent:0, bold:true,  type:"ebitda",    real:zeroArr,    prev:zeroArr },
  { label: "    (-) Depreciação e Amortização",    indent:1, bold:false, type:"cost",      real:zeroArr,    prev:zeroArr },
  { label: "(=) EBIT",                             indent:0, bold:true,  type:"subtotal",  real:zeroArr,    prev:zeroArr },
  { label: "    (+/-) Resultado Financeiro",       indent:1, bold:false, type:"financial", real:zeroArr,    prev:zeroArr },
  { label: "(=) LAIR",                             indent:0, bold:true,  type:"subtotal",  real:zeroArr,    prev:zeroArr },
  { label: "    (-) IR / CSLL",                   indent:1, bold:false, type:"tax",       real:zeroArr,    prev:zeroArr },
  { label: "(=) Lucro Líquido",                   indent:0, bold:true,  type:"net",       real:zeroArr,    prev:zeroArr },
];

// ─── Unit econ ────────────────────────────────────────────────────────────────
const mrrHistory = monthlyRevenue.filter((m) => m.jacqes > 0).map((m) => ({ month: m.month, mrr: m.jacqes }));
const latestMrr  = mrrHistory[mrrHistory.length - 1];
const prevMrrRow = mrrHistory[mrrHistory.length - 2];
const mrrGrowth  = prevMrrRow ? (((latestMrr.mrr - prevMrrRow.mrr) / prevMrrRow.mrr) * 100).toFixed(1) : "0.0";
const arr        = latestMrr.mrr * 12;
const maxMrr     = Math.max(...mrrHistory.map((r) => r.mrr));

// ─── Sections ─────────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: "receita",      label: "1 · Receita"         },
  { id: "cogs",         label: "2 · COGS"             },
  { id: "lucro-bruto",  label: "3 · Lucro Bruto"      },
  { id: "contribuicao", label: "4 · Contribuição"     },
  { id: "opex",         label: "5 · Opex BU"          },
  { id: "sga-aloc",     label: "6 · SG&A Alocado"     },
  { id: "resultado",    label: "7 · Resultado"        },
  { id: "caixa",        label: "8 · Caixa"            },
  { id: "cap-giro",     label: "9 · Capital de Giro"  },
  { id: "unit-econ",    label: "10 · Unit Econ"       },
  { id: "cap-alloc",    label: "11 · Capital Alloc."  },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

// ─── Reusable: pending section ────────────────────────────────────────────────
function PendingSection({ title, lines, source }: { title: string; lines: string[]; source: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-400 border border-gray-200">
          sem dado confirmado
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Categoria</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400">Valor</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400">Estado</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-2 px-3 text-xs text-gray-400">{line}</td>
              <td className="py-2 px-3 text-right text-xs text-gray-300">—</td>
              <td className="py-2 px-3 text-right">
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-gray-50 text-gray-400">pendente</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-start gap-2 pt-3 border-t border-gray-100">
        <Info size={11} className="text-gray-300 shrink-0 mt-0.5" />
        <p className="text-[10px] text-gray-300 leading-relaxed">{source}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function FpaPage() {
  const [section,  setSection]  = useState<SectionId>("receita");
  const [dreView,  setDreView]  = useState<"both" | "prev" | "real">("both");
  type Granularity = "dia" | "mes" | "ano";
  const [gran,     setGran]     = useState<Granularity>("mes");
  const [miFrom,   setMiFrom]   = useState(miOf(2026, 0));
  const [miTo,     setMiTo]     = useState(miOf(2026, 3));
  const [yearFrom, setYearFrom] = useState(2026);
  const [yearTo,   setYearTo]   = useState(2026);
  const [dateFrom, setDateFrom] = useState("2026-01-01");
  const [dateTo,   setDateTo]   = useState("2026-04-30");

  const activeMIs: number[] = (() => {
    if (gran === "mes") return Array.from({ length: miTo - miFrom + 1 }, (_, i) => miFrom + i);
    if (gran === "ano") {
      const s = miOf(yearFrom, 0), e = miOf(yearTo, 11);
      return Array.from({ length: e - s + 1 }, (_, i) => s + i);
    }
    const [fy, fm] = dateFrom.split("-").map(Number);
    const [ty, tm] = dateTo.split("-").map(Number);
    const s = miOf(fy, fm - 1), e = miOf(ty, tm - 1);
    return e >= s ? Array.from({ length: e - s + 1 }, (_, i) => s + i) : [s];
  })();

  const activeYears = gran === "ano"
    ? Array.from({ length: yearTo - yearFrom + 1 }, (_, i) => yearFrom + i)
    : [];

  const periodLabel = (() => {
    if (gran === "ano") return yearFrom === yearTo ? String(yearFrom) : yearFrom + "–" + yearTo;
    if (gran === "dia") return dateFrom.slice(0, 7) + " → " + dateTo.slice(0, 7);
    return miFrom === miTo ? labelMi(miFrom) : labelMi(miFrom) + "–" + labelMi(miTo);
  })();

  return (
    <>
      <Header
        title="FP&A — JACQES"
        subtitle="Hub canônico · Leitura econômico-financeira · Jan–Abr 2026"
      />
      <div className="page-container">

        {/* ── Section navigator ────────────────────────────────────────────── */}
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-max">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className={`px-3 py-2 text-[11px] font-medium rounded-lg whitespace-nowrap transition-all ${
                  section === s.id
                    ? "bg-white text-brand-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* ══ 1. RECEITA ══════════════════════════════════════════════════════ */}
        {section === "receita" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "MRR Atual (Abr/26)",    value: fmtR(JACQES_MRR),           sub: "4 clientes · Notion CRM",    icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Receita YTD (Jan–Abr)", value: fmtR(_jacqes.revenue),       sub: "6.490×3 + 8.280 confirmado", icon: BarChart3,  color: "text-brand-600",   bg: "bg-brand-50"   },
                { label: "ARR Projetado",          value: fmtR(arr),                   sub: "MRR × 12 · referência",      icon: TrendingUp, color: "text-violet-700",  bg: "bg-violet-50"  },
                { label: "Clientes Ativos",        value: String(_jacqes.customers),   sub: "CEM · Carol · André · Tati", icon: Users,      color: "text-cyan-700",    bg: "bg-cyan-50"    },
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

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* 1.1 Receita Bruta */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">1.1 Receita Bruta</h3>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">Notion CRM · Abr/26</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Tipo</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400">MRR</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400">YTD</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { tipo: "Recorrente (FEE)", mrr: JACQES_MRR, ytd: _jacqes.revenue, ok: true },
                      { tipo: "Não recorrente",   mrr: 0, ytd: 0, ok: false },
                      { tipo: "Setup",            mrr: 0, ytd: 0, ok: false },
                      { tipo: "Projeto",          mrr: 0, ytd: 0, ok: false },
                      { tipo: "Estratégica",      mrr: 0, ytd: 0, ok: false },
                    ].map((row) => (
                      <tr key={row.tipo} className="border-b border-gray-100">
                        <td className="py-2 px-3 text-xs text-gray-700">{row.tipo}</td>
                        <td className={`py-2 px-3 text-right text-xs ${row.ok ? "font-semibold text-emerald-700" : "text-gray-300"}`}>
                          {row.ok ? fmtR(row.mrr) : "—"}
                        </td>
                        <td className={`py-2 px-3 text-right text-xs ${row.ok ? "font-semibold text-gray-900" : "text-gray-300"}`}>
                          {row.ok ? fmtR(row.ytd) : "—"}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {row.ok
                            ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">real</span>
                            : <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">pendente</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200">
                      <td className="py-2.5 px-3 text-xs font-bold text-gray-700">Total Bruto</td>
                      <td className="py-2.5 px-3 text-right text-xs font-bold text-brand-700">{fmtR(JACQES_MRR)}</td>
                      <td className="py-2.5 px-3 text-right text-xs font-bold text-brand-700">{fmtR(_jacqes.revenue)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* 1.2 Deduções */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">1.2 Deduções</h3>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">parcial</span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Tipo</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400">Valor</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { tipo: "Impostos (ISS · PIS · COFINS)", valor: 0,         estado: "pendente contábil" },
                      { tipo: "Descontos concedidos",           valor: 0,         estado: "pendente"          },
                      { tipo: "Estornos",                       valor: 0,         estado: "pendente"          },
                      { tipo: "Inadimplência / provisões",      valor: totalPend, estado: "parcial CRM"       },
                    ].map((row) => (
                      <tr key={row.tipo} className="border-b border-gray-100">
                        <td className="py-2 px-3 text-xs text-gray-700">{row.tipo}</td>
                        <td className={`py-2 px-3 text-right text-xs ${row.valor > 0 ? "font-semibold text-amber-700" : "text-gray-300"}`}>
                          {row.valor > 0 ? fmtR(row.valor) : "—"}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                            row.estado === "parcial CRM" ? "bg-amber-50 text-amber-600" : "bg-gray-100 text-gray-400"
                          }`}>{row.estado}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200">
                      <td className="py-2.5 px-3 text-xs font-bold text-gray-700">Total Deduções *</td>
                      <td className="py-2.5 px-3 text-right text-xs font-bold text-amber-700">{fmtR(totalPend)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
                <p className="text-[10px] text-gray-400 mt-2 pl-3">* Apenas inadimplência CRM. Impostos aguardam classificação fiscal.</p>
              </div>
            </div>

            {/* 1.3 Receita Líquida */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">1.3 Receita Líquida</h3>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">parcial — impostos pendentes</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Por cliente</p>
                  <table className="w-full text-sm">
                    <tbody>
                      {clientes.map((c) => (
                        <tr key={c.nome} className="border-b border-gray-100">
                          <td className="py-1.5 px-3 text-xs text-gray-700">{c.nome}</td>
                          <td className={`py-1.5 px-3 text-right text-xs font-semibold ${c.status === "Pago" ? "text-emerald-700" : "text-amber-700"}`}>
                            {fmtR(c.fee)}
                          </td>
                          <td className="py-1.5 px-3 text-right">
                            {c.status === "Pago"
                              ? <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-emerald-100 text-emerald-700">pago</span>
                              : <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-amber-100 text-amber-700">pendente</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-200">
                        <td className="py-2 px-3 text-xs font-bold text-gray-700">Total</td>
                        <td className="py-2 px-3 text-right text-xs font-bold text-brand-700">{fmtR(JACQES_MRR)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {[
                  { label: "Por produto",  note: "Catálogo de serviços não classificado" },
                  { label: "Por canal",    note: "Canal de aquisição não registrado"     },
                ].map((c) => (
                  <div key={c.label}>
                    <p className="text-xs font-semibold text-gray-500 mb-2">{c.label}</p>
                    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-8 text-center">
                      <p className="text-[11px] text-gray-400">Pendente de classificação</p>
                      <p className="text-[10px] text-gray-300 mt-1">{c.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* MRR evolution */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                Evolução MRR — Jan–Abr/26
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">EMPÍRICO</span>
              </h3>
              <div className="space-y-3">
                {mrrHistory.map((row) => (
                  <div key={row.month} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-14 shrink-0">{row.month}</span>
                    <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full"
                        style={{ width: `${(row.mrr / maxMrr) * 100}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-900 w-20 text-right shrink-0">{fmtR(row.mrr)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ 2. COGS ═════════════════════════════════════════════════════════ */}
        {section === "cogs" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-start gap-3">
              <Info size={14} className="text-gray-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-gray-500">
                COGS deve conter apenas custo direto de entrega. Não contamina Opex da BU nem SG&A alocado.
                Aguarda classificação contábil por centro de custo.
              </p>
            </div>
            <PendingSection
              title="2. COGS — Custo dos Serviços"
              lines={[
                "2.1 Mão de obra direta",
                "2.2 Terceiros diretos",
                "2.3 Ferramentas diretas",
                "2.4 Custos variáveis diretos",
                "2.5 COGS total",
              ]}
              source="Pendente de classificação contábil por centro de custo. Aguardar base real — não inventar."
            />
          </div>
        )}

        {/* ══ 3. LUCRO BRUTO ══════════════════════════════════════════════════ */}
        {section === "lucro-bruto" && (
          <div className="space-y-4">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">3. Lucro Bruto</h3>
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-4 mb-4 font-mono text-xs text-gray-600 space-y-1">
                <p>Lucro Bruto = Receita Líquida − COGS</p>
                <p>= {fmtR(JACQES_MRR)} (MRR) − <span className="text-gray-400">[COGS pendente]</span></p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "3.1 Lucro Bruto R$", note: "pendente de COGS" },
                  { label: "3.2 Margem Bruta %", note: "pendente de COGS" },
                ].map((c) => (
                  <div key={c.label} className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-4">
                    <p className="text-xs text-gray-400 mb-1">{c.label}</p>
                    <p className="text-2xl font-bold text-gray-400">—</p>
                    <span className="mt-2 inline-block text-[9px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">{c.note}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-start gap-2">
                <Info size={12} className="text-gray-300 shrink-0 mt-0.5" />
                <p className="text-[10px] text-gray-300">
                  Referência de mercado para consultorias B2B: margem bruta típica de 50–70%. Calculará automaticamente quando COGS for classificado.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══ 4. CONTRIBUIÇÃO ══════════════════════════════════════════════════ */}
        {section === "contribuicao" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-start gap-3">
              <Info size={14} className="text-gray-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-gray-500">
                Contribuição = Receita Líquida − COGS − Custos Semi-variáveis. Distinção entre Lucro Bruto e
                Contribuição depende da identificação dos custos semi-variáveis da BU.
              </p>
            </div>
            <PendingSection
              title="4. Contribuição"
              lines={["4.1 Custos semi-variáveis", "4.2 Margem de contribuição"]}
              source="Pendente de classificação de custos semi-variáveis (ex: comissões, custos variáveis de projeto)."
            />
          </div>
        )}

        {/* ══ 5. OPEX BU ════════════════════════════════════════════════════════ */}
        {section === "opex" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-start gap-3">
              <Info size={14} className="text-gray-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-gray-500">
                Opex próprio da BU ≠ COGS e ≠ SG&A alocado. São despesas operacionais da JACQES não atribuídas diretamente a clientes.
              </p>
            </div>
            <PendingSection
              title="5. Opex próprio da BU"
              lines={[
                "5.1 Gestão da BU (remuneração não-direta)",
                "5.2 Ferramentas da BU",
                "5.3 Suporte operacional indireto",
                "5.4 Opex próprio total",
              ]}
              source="Pendente de lançamento de despesas por centro de custo da JACQES."
            />
          </div>
        )}

        {/* ══ 6. SG&A ALOCADO ════════════════════════════════════════════════ */}
        {section === "sga-aloc" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-start gap-3">
              <Info size={14} className="text-gray-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-gray-500">
                SG&A alocado = parcela do overhead corporativo (holding) alocada à BU JACQES. Distinto do Opex próprio.
                Critério de rateio ainda não definido.
              </p>
            </div>
            <PendingSection
              title="6. SG&A Alocado (da Holding)"
              lines={[
                "6.1 Financeiro / controladoria",
                "6.2 Jurídico / contábil / admin",
                "6.3 Infra corporativa",
                "6.4 SG&A alocado total",
              ]}
              source="Pendente de definição do critério de rateio do overhead corporativo entre as BUs."
            />
          </div>
        )}

        {/* ══ 7. RESULTADO (DRE) ══════════════════════════════════════════════ */}
        {section === "resultado" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "EBITDA",          note: "COGS + Opex pendentes" },
                { label: "EBITDA Ajustado", note: "ajustes não classificados" },
                { label: "Break-even",      note: "depende de Opex + COGS" },
              ].map((c) => (
                <div key={c.label} className="card p-5">
                  <p className="text-xs text-gray-400 mb-1">{c.label}</p>
                  <p className="text-2xl font-bold text-gray-400">—</p>
                  <p className="text-[10px] text-gray-300 mt-1">{c.note}</p>
                  <span className="mt-2 inline-block text-[9px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">pendente</span>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-2">
              <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700">
                Receita Bruta confirmada via Notion CRM. Deduções, COGS e Opex aguardam classificação contábil.
                Coluna <strong>Prev</strong> exibe &quot;—&quot; enquanto Budget 2026 não for definido.
              </p>
            </div>

            {/* DRE Matricial */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  DRE — {periodLabel}
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">snapshot</span>
                </h3>
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Granularidade */}
                  <div className="flex gap-0.5 p-0.5 bg-gray-100 rounded-lg">
                    {(["dia", "mes", "ano"] as const).map((g) => (
                      <button key={g} onClick={() => setGran(g)}
                        className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                          gran === g ? "bg-white text-brand-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        }`}>
                        {g === "dia" ? "Dia" : g === "mes" ? "Mês" : "Ano"}
                      </button>
                    ))}
                  </div>
                  {/* De / Até */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-gray-400">De</span>
                    {gran === "dia" && (
                      <input type="date" value={dateFrom} min="2021-01-01" max="2030-12-31"
                        onChange={(e) => { setDateFrom(e.target.value); if (e.target.value > dateTo) setDateTo(e.target.value); }}
                        className={SEL_CLS} />
                    )}
                    {gran === "mes" && (
                      <select value={miFrom} onChange={(e) => { const v=Number(e.target.value); setMiFrom(v); if(v>miTo)setMiTo(v); }} className={SEL_CLS}>
                        {ALL_YEARS.map((y) => (
                          <optgroup key={y} label={String(y)}>
                            {MES_PT.map((m, mi) => <option key={mi} value={miOf(y,mi)}>{m}/{String(y).slice(2)}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    )}
                    {gran === "ano" && (
                      <select value={yearFrom} onChange={(e) => { const v=Number(e.target.value); setYearFrom(v); if(v>yearTo)setYearTo(v); }} className={SEL_CLS}>
                        {ALL_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    )}
                    <span className="text-[11px] text-gray-400">Até</span>
                    {gran === "dia" && (
                      <input type="date" value={dateTo} min={dateFrom} max="2030-12-31"
                        onChange={(e) => { setDateTo(e.target.value); if(e.target.value<dateFrom)setDateFrom(e.target.value); }}
                        className={SEL_CLS} />
                    )}
                    {gran === "mes" && (
                      <select value={miTo} onChange={(e) => { const v=Number(e.target.value); setMiTo(v); if(v<miFrom)setMiFrom(v); }} className={SEL_CLS}>
                        {ALL_YEARS.map((y) => (
                          <optgroup key={y} label={String(y)}>
                            {MES_PT.map((m, mi) => { const idx=miOf(y,mi); return <option key={mi} value={idx} disabled={idx<miFrom}>{m}/{String(y).slice(2)}</option>; })}
                          </optgroup>
                        ))}
                      </select>
                    )}
                    {gran === "ano" && (
                      <select value={yearTo} onChange={(e) => { const v=Number(e.target.value); setYearTo(v); if(v<yearFrom)setYearFrom(v); }} className={SEL_CLS}>
                        {ALL_YEARS.map((y) => <option key={y} value={y} disabled={y<yearFrom}>{y}</option>)}
                      </select>
                    )}
                  </div>
                  {/* Prev / Real */}
                  <div className="flex gap-0.5 p-0.5 bg-gray-100 rounded-lg">
                    {(["both", "prev", "real"] as const).map((v) => (
                      <button key={v} onClick={() => setDreView(v)}
                        className={`px-3 py-1.5 text-[11px] font-medium rounded-md transition-all ${
                          dreView === v ? "bg-white text-brand-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        }`}>
                        {v === "both" ? "Prev + Real" : v === "prev" ? "Só Prev" : "Só Real"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {gran === "dia" && (
                <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 flex items-start gap-2">
                  <Info size={12} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-blue-700">Dados por dia aguardam ingestion. Exibindo agregado por mês.</p>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-xs whitespace-nowrap border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-[11px] font-semibold text-gray-500 min-w-[220px] bg-white sticky left-0 z-10">Linha DRE</th>
                      {gran === "ano"
                        ? activeYears.map((y) => (
                            <th key={y} colSpan={dreView==="both"?2:1}
                              className="text-center py-2 px-2 text-[10px] font-semibold text-gray-600 border-l border-gray-100 bg-gray-50">{y}</th>
                          ))
                        : activeMIs.map((mi) => (
                            <th key={mi} colSpan={dreView==="both"?2:1}
                              className="text-center py-2 px-2 text-[10px] font-semibold text-gray-600 border-l border-gray-100 bg-gray-50">{labelMi(mi)}</th>
                          ))
                      }
                      <th colSpan={dreView==="both"?2:1}
                        className="text-center py-2 px-2 text-[10px] font-bold text-brand-700 border-l border-gray-200 bg-brand-50">Total</th>
                    </tr>
                    <tr className="border-b-2 border-gray-200 bg-gray-50">
                      <th className="sticky left-0 z-10 bg-gray-50" />
                      {(gran==="ano"?activeYears:activeMIs).flatMap((key) => [
                        ...(dreView!=="real"?[<th key={`ph${key}`} className="py-1.5 px-3 text-[10px] font-semibold text-center border-l border-gray-100 text-gray-400 w-[80px]">Prev</th>]:[]),
                        ...(dreView!=="prev"?[<th key={`rh${key}`} className="py-1.5 px-3 text-[10px] font-semibold text-center text-gray-700 w-[80px]">Real</th>]:[]),
                      ])}
                      {dreView!=="real" && <th className="py-1.5 px-3 text-[10px] font-semibold text-center border-l border-gray-200 text-gray-400 w-[80px]">Prev</th>}
                      {dreView!=="prev" && <th className="py-1.5 px-3 text-[10px] font-semibold text-center text-brand-600 w-[80px]">Real</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {dreRows.map((row, ri) => {
                      const isSubtotal=row.bold, isReceita=row.type==="revenue", isNet=row.type==="net";
                      const rowBg=isNet?"bg-brand-50/60":isSubtotal?"bg-gray-50":"";
                      const labelClass=isSubtotal?"font-bold text-gray-800":row.indent===1?"text-gray-400":"text-gray-600";

                      const monthCols=(gran!=="ano"?activeMIs:[]).flatMap((mi)=>{
                        const rv=row.real[mi],pv=row.prev[mi];
                        const rc=rv===0?"text-gray-300":isReceita?"text-emerald-700 font-semibold":isSubtotal?"font-bold text-gray-900":"text-gray-700";
                        return [
                          ...(dreView!=="real"?[<td key={`p${mi}`} className="py-2 px-3 text-right border-l border-gray-100 text-gray-400">{pv===0?"—":fmtR(pv)}</td>]:[]),
                          ...(dreView!=="prev"?[<td key={`r${mi}`} className={`py-2 px-3 text-right ${rc}`}>{fmtR(rv)}</td>]:[]),
                        ];
                      });

                      const yearCols=(gran==="ano"?activeYears:[]).flatMap((y)=>{
                        const yMIs=Array.from({length:12},(_,m)=>miOf(y,m));
                        const rv=yMIs.reduce((s,mi)=>s+row.real[mi],0);
                        const pv=yMIs.reduce((s,mi)=>s+row.prev[mi],0);
                        const rc=rv===0?"text-gray-300":isReceita?"text-emerald-700 font-semibold":isSubtotal?"font-bold text-gray-900":"text-gray-700";
                        return [
                          ...(dreView!=="real"?[<td key={`py${y}`} className="py-2 px-3 text-right border-l border-gray-100 text-gray-400">{pv===0?"—":fmtR(pv)}</td>]:[]),
                          ...(dreView!=="prev"?[<td key={`ry${y}`} className={`py-2 px-3 text-right ${rc}`}>{rv===0?"—":fmtR(rv)}</td>]:[]),
                        ];
                      });

                      const totalReal=activeMIs.reduce((s,mi)=>s+row.real[mi],0);
                      const totalPrev=activeMIs.reduce((s,mi)=>s+row.prev[mi],0);
                      const totalRc=totalReal===0?"text-gray-300":isNet?"font-bold text-brand-700":isSubtotal?"font-bold text-gray-900":isReceita?"font-semibold text-emerald-700":"text-gray-700";

                      return (
                        <tr key={ri} className={`border-b border-gray-100 hover:bg-gray-50/50 transition-colors ${rowBg}`}>
                          <td className={`py-2 px-3 sticky left-0 z-10 ${rowBg||"bg-white"} ${labelClass}`} style={{paddingLeft:row.indent===1?24:12}}>
                            {row.label}
                          </td>
                          {gran==="ano"?yearCols:monthCols}
                          {dreView!=="real"&&<td className="py-2 px-3 text-right border-l border-gray-200 text-gray-400">{totalPrev===0?"—":fmtR(totalPrev)}</td>}
                          {dreView!=="prev"&&<td className={`py-2 px-3 text-right ${totalRc}`}>{totalReal===0?"—":fmtR(totalReal)}</td>}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ══ 8. CAIXA ═════════════════════════════════════════════════════════ */}
        {section === "caixa" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 flex items-start gap-3">
              <Activity size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] text-blue-700 font-medium">Pipeline bancário conectado</p>
                <p className="text-[10px] text-blue-600 mt-0.5">
                  Dados de caixa da JACQES são lidos via Cora Bank → pipeline financeiro → /jacqes/financial.
                  Classificação por entrada/saída operacional aguarda categorização via /awq/ingest.
                </p>
              </div>
            </div>
            <PendingSection
              title="8. Caixa Operacional da BU"
              lines={[
                "8.1 Entradas operacionais",
                "8.2 Saídas operacionais",
                "8.3 Caixa operacional da BU",
              ]}
              source="Dados brutos disponíveis via pipeline bancário (Cora). Classificação por categoria operacional pendente via /awq/ingest."
            />
          </div>
        )}

        {/* ══ 9. CAPITAL DE GIRO ════════════════════════════════════════════════ */}
        {section === "cap-giro" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { label: "Contas a Receber", value: fmtR(totalPend), note: "Carol R$1.790 + André R$1.500", badge: "parcial CRM", badgeCls: "bg-amber-100 text-amber-700", valueCls: "text-amber-700" },
                { label: "Contas a Pagar",   value: "—",             note: "Pendente de classificação",    badge: "sem dado",    badgeCls: "bg-gray-100 text-gray-400",   valueCls: "text-gray-400" },
                { label: "Capital de Giro Líquido", value: "—",      note: "A/R − A/P (A/P pendente)",    badge: "incompleto",  badgeCls: "bg-gray-100 text-gray-400",   valueCls: "text-gray-400" },
              ].map((c) => (
                <div key={c.label} className="card p-5">
                  <p className="text-xs text-gray-400 mb-1">{c.label}</p>
                  <p className={`text-2xl font-bold ${c.valueCls}`}>{c.value}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{c.note}</p>
                  <span className={`mt-2 inline-block text-[9px] font-bold px-1.5 py-0.5 rounded ${c.badgeCls}`}>{c.badge}</span>
                </div>
              ))}
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">9.1 Contas a Receber — Detalhe</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Cliente</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400">Valor</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400">Referência</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.filter((c) => c.status === "Pendente").map((c) => (
                    <tr key={c.nome} className="border-b border-gray-100">
                      <td className="py-2.5 px-3 text-xs font-semibold text-gray-900">{c.nome}</td>
                      <td className="py-2.5 px-3 text-right text-xs font-bold text-amber-700">{fmtR(c.fee)}</td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-400">Abr/26</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">pendente</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-300">
                    <td className="py-2.5 px-3 text-xs font-bold text-gray-700">Total A/R</td>
                    <td className="py-2.5 px-3 text-right text-xs font-bold text-amber-700">{fmtR(totalPend)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ══ 10. UNIT ECON ══════════════════════════════════════════════════════ */}
        {section === "unit-econ" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "MRR Atual (Abr/26)", value: fmtR(JACQES_MRR), sub: "4 clientes FEE",      icon: DollarSign, color: "text-brand-600",   bg: "bg-brand-50"   },
                { label: "ARR Projetado",       value: fmtR(arr),         sub: "MRR × 12",            icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "MoM (Mar→Abr)",       value: `+${mrrGrowth}%`,  sub: "Tati Simões entrou", icon: TrendingUp, color: "text-amber-700",   bg: "bg-amber-50"   },
                { label: "CAC",                 value: "—",               sub: "pipeline de vendas", icon: BarChart3,  color: "text-gray-400",    bg: "bg-gray-50"    },
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

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">10.3 Economia por Cliente</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Cliente</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400">FEE/mês</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400">% MRR</th>
                      <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400">LTV (ref)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientes.map((c) => (
                      <tr key={c.nome} className="border-b border-gray-100 hover:bg-gray-50/80">
                        <td className="py-2.5 px-3 text-xs font-semibold text-gray-900">{c.nome}</td>
                        <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">{fmtR(c.fee)}</td>
                        <td className="py-2.5 px-3 text-right text-xs text-gray-500">
                          {((c.fee / JACQES_MRR) * 100).toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs text-gray-300">—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PendingSection
                title="10.1 CAC / 10.2 Payback / 10.4 Economia por Time"
                lines={[
                  "10.1 CAC — Custo de aquisição por cliente",
                  "10.2 Payback — meses para recuperar CAC",
                  "10.4 Economia por time (horas × entrega × margem)",
                ]}
                source="CAC e Payback dependem do pipeline de vendas (Notion CRM). Economia por time depende de lançamento de horas."
              />
            </div>
          </div>
        )}

        {/* ══ 11. CAPITAL ALLOCATION ════════════════════════════════════════════ */}
        {section === "cap-alloc" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-start gap-3">
              <Info size={14} className="text-gray-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-gray-500">
                Capital allocation é leitura decisória, não DRE. Indica onde concentrar, cortar ou revisar
                investimento de tempo, custo e esforço. Classificações derivadas dos dados disponíveis (CRM + status de pagamento).
              </p>
            </div>

            <div className="card p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">11.1 Decisão por Cliente</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Cliente</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400">FEE</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400">% MRR</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400">Pgto</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-400">Decisão</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-400">Base</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((c) => {
                    const allocCls = c.alloc === "expandir" ? "bg-emerald-100 text-emerald-700"
                      : c.alloc === "manter"   ? "bg-blue-100 text-blue-700"
                      : "bg-amber-100 text-amber-700";
                    const base = c.alloc === "expandir"
                      ? "Maior cliente · pagamento em dia"
                      : c.status === "Pendente"
                        ? "Pagamento pendente · monitorar"
                        : "Novo cliente · pagamento em dia";
                    return (
                      <tr key={c.nome} className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-xs font-semibold text-gray-900">{c.nome}</td>
                        <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">{fmtR(c.fee)}</td>
                        <td className="py-2.5 px-3 text-right text-xs text-gray-500">{((c.fee/JACQES_MRR)*100).toFixed(1)}%</td>
                        <td className="py-2.5 px-3 text-right">
                          {c.status === "Pago"
                            ? <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">pago</span>
                            : <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">pendente</span>}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${allocCls}`}>{c.alloc}</span>
                        </td>
                        <td className="py-2.5 px-3 text-xs text-gray-400">{base}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: "11.2 Por Produto", note: "Catálogo de serviços não classificado" },
                { title: "11.3 Por Pessoa",  note: "Alocação de time não lançada"          },
                { title: "11.4 Por Canal",   note: "Canal de aquisição não registrado"      },
              ].map((c) => (
                <div key={c.title} className="card p-5">
                  <h4 className="text-xs font-semibold text-gray-700 mb-3">{c.title}</h4>
                  <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-6 text-center">
                    <p className="text-[11px] text-gray-400">Sem dado confiável</p>
                    <p className="text-[10px] text-gray-300 mt-1">{c.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  );
}
