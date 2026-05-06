// ─── /awq/epm/reports/annual — Annual Report ──────────────────────────────────
//
// Annual financial report for AWQ Group:
//   • Year-in-review executive summary
//   • Full-year P&L vs budget
//   • Balance sheet year-end
//   • Cash flow (annual)
//   • BU performance scorecard
//   • 3-year trend (if data available)
//   • Auditor notes placeholder

import Header from "@/components/Header";
import Link from "next/link";
import {
  FileText, TrendingUp, Scale, DollarSign, BarChart3,
  Building2, Layers, CheckCircle2, Calendar,
} from "lucide-react";
import { buildDreQuery } from "@/lib/dre-query";
import { consolidated, consolidatedMargins, buData } from "@/lib/awq-derived-metrics";

function fmtBRL(n: number): string {
  const abs  = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000)     return sign + "R$" + (abs / 1_000).toFixed(0)     + "K";
  return sign + "R$" + abs.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// 3-year trend (FY2024, FY2025, FY2026 YTD)
const TREND_DATA = [
  { year: "FY2024", revenue: 1_120_000, ebitda: -180_000, cashEnd:  95_000, employees: 3 },
  { year: "FY2025", revenue: 3_210_000, ebitda:  240_000, cashEnd: 310_000, employees: 7 },
  { year: "FY2026 YTD", revenue: 4_474_800, ebitda: 845_472, cashEnd: 412_000, employees: 9 },
];

// Annual P&L (FY2025 — last full year)
const ANNUAL_PL = [
  { line: "Receita Bruta",            amount: 3_210_000, budget: 2_800_000, type: "revenue"  },
  { line: "(-) COGS",                 amount: -1_444_500, budget: -1_260_000, type: "cogs"   },
  { line: "Lucro Bruto",              amount: 1_765_500, budget: 1_540_000, type: "gross"    },
  { line: "(-) Salários e Encargos",  amount:  -680_000, budget:  -650_000, type: "opex"    },
  { line: "(-) Software e SaaS",      amount:   -98_000, budget:   -90_000, type: "opex"    },
  { line: "(-) Marketing",            amount:  -120_000, budget:  -150_000, type: "opex"    },
  { line: "(-) Administrativo",       amount:  -280_000, budget:  -260_000, type: "opex"    },
  { line: "(-) Depreciação",          amount:   -45_000, budget:   -40_000, type: "opex"    },
  { line: "(-) Outros OPEX",          amount:  -302_500, budget:  -250_000, type: "opex"    },
  { line: "EBITDA",                   amount:  240_000,  budget:  100_000,  type: "ebitda"  },
  { line: "(-) Despesas Financeiras", amount:   -28_000, budget:   -25_000, type: "fin"     },
  { line: "Resultado Líquido",        amount:  212_000,  budget:   75_000,  type: "net"     },
];

// Balance sheet year-end FY2025
const BS_DATA = {
  assets: {
    current:    {
      cash: 310_000, ar: 280_000, prepaid: 45_000, other: 28_000,
    },
    nonCurrent: { fixed: 92_000, intangible: 18_000, investments: 75_000 },
  },
  liabilities: {
    current: { ap: 125_000, taxes: 68_000, payroll: 95_000, other: 32_000 },
    longTerm: { loans: 0, other: 12_000 },
  },
  equity: { capital: 100_000, reserves: 62_000, retained: 274_000 },
};

const totalCurrentAssets    = Object.values(BS_DATA.assets.current).reduce((s, v) => s + v, 0);
const totalNonCurrentAssets = Object.values(BS_DATA.assets.nonCurrent).reduce((s, v) => s + v, 0);
const totalAssets           = totalCurrentAssets + totalNonCurrentAssets;
const totalCurrentLiab      = Object.values(BS_DATA.liabilities.current).reduce((s, v) => s + v, 0);
const totalLTLiab           = Object.values(BS_DATA.liabilities.longTerm).reduce((s, v) => s + v, 0);
const totalLiabilities      = totalCurrentLiab + totalLTLiab;
const totalEquity           = Object.values(BS_DATA.equity).reduce((s, v) => s + v, 0);

// Cash flow (indirect, FY2025)
const CF_ROWS = [
  { label: "Resultado Líquido",             section: "operating", amount:  212_000 },
  { label: "(+) Depreciação",               section: "operating", amount:   45_000 },
  { label: "(+/-) Variação de Capital de Giro", section: "operating", amount: -32_000 },
  { label: "Cash from Operations",          section: "subtotal",  amount:  225_000 },
  { label: "(-) CAPEX (hardware/software)", section: "investing", amount:  -68_000 },
  { label: "(-) Investimentos LP",          section: "investing", amount:  -75_000 },
  { label: "Cash from Investing",           section: "subtotal",  amount: -143_000 },
  { label: "Aporte de Capital (sócios)",    section: "financing", amount:  100_000 },
  { label: "(-) Pagamento de Pró-labore extra", section: "financing", amount: -80_000 },
  { label: "Cash from Financing",           section: "subtotal",  amount:   20_000 },
  { label: "Variação Líquida de Caixa",     section: "total",     amount:  102_000 },
  { label: "Caixa Inicial (Jan/2025)",      section: "total",     amount:  208_000 },
  { label: "Caixa Final (Dez/2025)",        section: "total",     amount:  310_000 },
];

const SECTION_STYLE: Record<string, string> = {
  operating: "text-gray-700",
  investing:  "text-gray-700",
  financing:  "text-gray-700",
  subtotal:   "font-bold text-gray-900 bg-gray-50",
  total:      "font-bold text-brand-800 bg-brand-50",
};

export default async function AnnualReportPage() {
  const dre  = await buildDreQuery("all");
  const snap = consolidated;

  const ytdRevenue = dre.hasData ? dre.dreRevenue : snap.revenue;
  const ytdEBITDA  = dre.hasData ? dre.dreEBITDA  : snap.ebitda;

  return (
    <>
      <Header
        title="Relatório Anual AWQ Group"
        subtitle="EPM · Annual Report · FY2025 (Completo) + FY2026 YTD"
      />
      <div className="page-container">

        {/* ── Cover ─────────────────────────────────────────────────── */}
        <div className="card p-6 bg-gradient-to-br from-gray-800 to-gray-950 text-white">
          <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Relatório Anual
          </div>
          <h2 className="text-3xl font-bold mb-2">AWQ Group</h2>
          <p className="text-gray-400 mb-6">
            Enterprise Performance Management · FY2025 Annual Report
          </p>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Receita FY2025",   value: fmtBRL(3_210_000) },
              { label: "EBITDA FY2025",    value: fmtBRL(240_000)   },
              { label: "Business Units",   value: "4 BUs"           },
              { label: "Colaboradores",    value: "7 FTEs"          },
            ].map((card) => (
              <div key={card.label} className="bg-white/10 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-white tabular-nums">{card.value}</div>
                <div className="text-xs text-gray-400 mt-1">{card.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 3-Year Trend ──────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-emerald-600" />
            <span className="text-sm font-semibold text-gray-900">Tendência 3 Anos — Crescimento AWQ</span>
          </div>
          <div className="table-scroll">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">Período</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Receita</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Crescimento</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">EBITDA</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Margem</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Caixa Final</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">FTEs</th>
                </tr>
              </thead>
              <tbody>
                {TREND_DATA.map((row, i) => {
                  const prev   = TREND_DATA[i - 1];
                  const growth = prev && prev.revenue > 0
                    ? ((row.revenue - prev.revenue) / prev.revenue) * 100
                    : null;
                  const margin = row.revenue > 0 ? (row.ebitda / row.revenue) * 100 : 0;
                  return (
                    <tr key={row.year} className={`border-b border-gray-50 hover:bg-gray-50 ${row.year.includes("YTD") ? "bg-brand-50/30" : ""}`}>
                      <td className="py-2.5 px-3 font-bold text-gray-900">{row.year}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-gray-900 font-semibold">{fmtBRL(row.revenue)}</td>
                      <td className={`py-2.5 px-3 text-right tabular-nums font-semibold ${growth !== null && growth >= 0 ? "text-emerald-600" : "text-gray-400"}`}>
                        {growth !== null ? (growth >= 0 ? "+" : "") + growth.toFixed(1) + "%" : "—"}
                      </td>
                      <td className={`py-2.5 px-3 text-right tabular-nums font-semibold ${row.ebitda >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {fmtBRL(row.ebitda)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-gray-500">
                        {row.revenue > 0 ? margin.toFixed(1) + "%" : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-brand-700 font-semibold">{fmtBRL(row.cashEnd)}</td>
                      <td className="py-2.5 px-3 text-right text-gray-700">{row.employees}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Bar chart visual */}
          <div className="flex items-end gap-4 h-20 mt-4 px-3">
            {TREND_DATA.map((row) => {
              const maxRev = Math.max(...TREND_DATA.map((r) => r.revenue));
              const barH   = (row.revenue / maxRev) * 100;
              return (
                <div key={row.year} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t ${row.year.includes("YTD") ? "bg-brand-400" : "bg-brand-200"}`}
                    style={{ height: `${barH}%` }}
                  />
                  <div className="text-[9px] text-gray-400 text-center leading-tight">{row.year}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Annual P&L ────────────────────────────────────────────── */}
        <div className="card">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <BarChart3 size={14} className="text-brand-600" />
            <span className="text-sm font-semibold text-gray-900">DRE Anual — FY2025 vs Budget</span>
          </div>
          <div className="table-scroll">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">Linha</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Realizado</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Budget</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Var R$</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Var %</th>
                </tr>
              </thead>
              <tbody>
                {ANNUAL_PL.map((row) => {
                  const varR   = row.amount - row.budget;
                  const varPct = row.budget !== 0 ? (varR / Math.abs(row.budget)) * 100 : 0;
                  const isBold = ["Lucro Bruto", "EBITDA", "Resultado Líquido"].includes(row.line);
                  const positive = varR >= 0;
                  return (
                    <tr key={row.line} className={`border-b border-gray-50 hover:bg-gray-50 ${isBold ? "bg-gray-50 font-bold" : ""}`}>
                      <td className={`py-2 px-3 ${isBold ? "text-gray-900 font-bold" : "text-gray-600"}`}>{row.line}</td>
                      <td className={`py-2 px-3 text-right tabular-nums font-semibold ${row.amount >= 0 ? "text-gray-900" : "text-red-700"}`}>
                        {fmtBRL(row.amount)}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums text-gray-400">{fmtBRL(row.budget)}</td>
                      <td className={`py-2 px-3 text-right tabular-nums font-semibold ${positive ? "text-emerald-600" : "text-red-600"}`}>
                        {varR >= 0 ? "+" : ""}{fmtBRL(varR)}
                      </td>
                      <td className={`py-2 px-3 text-right tabular-nums text-xs ${positive ? "text-emerald-600" : "text-red-600"}`}>
                        {varPct >= 0 ? "+" : ""}{varPct.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Balance Sheet Year-End ────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Scale size={14} className="text-brand-600" />
            <span className="text-sm font-semibold text-gray-900">Balanço Patrimonial — 31/Dez/2025</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assets */}
            <div>
              <div className="text-[10px] font-bold text-brand-700 uppercase tracking-widest mb-2">Ativo</div>
              <div className="space-y-1">
                <div className="text-[11px] text-gray-500 font-semibold mt-2 mb-1">Ativo Circulante</div>
                {Object.entries(BS_DATA.assets.current).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600 capitalize">{k === "ar" ? "Contas a Receber" : k === "cash" ? "Caixa" : k === "prepaid" ? "Adiantamentos" : "Outros"}</span>
                    <span className="font-semibold tabular-nums text-gray-900">{fmtBRL(v)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs pl-3 border-t border-gray-100 pt-1 font-semibold">
                  <span className="text-gray-700">Total Circulante</span>
                  <span className="text-brand-700 tabular-nums">{fmtBRL(totalCurrentAssets)}</span>
                </div>
                <div className="text-[11px] text-gray-500 font-semibold mt-3 mb-1">Ativo Não Circulante</div>
                {Object.entries(BS_DATA.assets.nonCurrent).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600 capitalize">{k === "fixed" ? "Imobilizado" : k === "intangible" ? "Intangível" : "Investimentos LP"}</span>
                    <span className="font-semibold tabular-nums text-gray-900">{fmtBRL(v)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs pl-3 border-t border-gray-100 pt-1 font-semibold">
                  <span className="text-gray-700">Total Não Circulante</span>
                  <span className="text-brand-700 tabular-nums">{fmtBRL(totalNonCurrentAssets)}</span>
                </div>
                <div className="flex justify-between text-sm pl-0 border-t-2 border-brand-300 pt-2 font-bold">
                  <span className="text-brand-800">ATIVO TOTAL</span>
                  <span className="text-brand-800 tabular-nums">{fmtBRL(totalAssets)}</span>
                </div>
              </div>
            </div>
            {/* Liabilities + Equity */}
            <div>
              <div className="text-[10px] font-bold text-red-700 uppercase tracking-widest mb-2">Passivo + PL</div>
              <div className="space-y-1">
                <div className="text-[11px] text-gray-500 font-semibold mt-2 mb-1">Passivo Circulante</div>
                {Object.entries(BS_DATA.liabilities.current).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600 capitalize">{k === "ap" ? "Fornecedores" : k === "taxes" ? "Obrigações Fiscais" : k === "payroll" ? "Obrigações Trabalhistas" : "Outros"}</span>
                    <span className="font-semibold tabular-nums text-gray-900">{fmtBRL(v)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs pl-3 border-t border-gray-100 pt-1 font-semibold">
                  <span className="text-gray-700">Total Passivo Circulante</span>
                  <span className="text-red-700 tabular-nums">{fmtBRL(totalCurrentLiab)}</span>
                </div>
                <div className="text-[11px] text-gray-500 font-semibold mt-3 mb-1">Passivo Não Circulante</div>
                <div className="flex justify-between text-xs pl-3">
                  <span className="text-gray-600">Outros LP</span>
                  <span className="font-semibold tabular-nums text-gray-900">{fmtBRL(BS_DATA.liabilities.longTerm.other)}</span>
                </div>
                <div className="text-[11px] text-emerald-600 font-semibold mt-3 mb-1">Patrimônio Líquido</div>
                {Object.entries(BS_DATA.equity).map(([k, v]) => (
                  <div key={k} className="flex justify-between text-xs pl-3">
                    <span className="text-gray-600 capitalize">{k === "capital" ? "Capital Social" : k === "reserves" ? "Reservas" : "Lucros Acumulados"}</span>
                    <span className="font-semibold tabular-nums text-gray-900">{fmtBRL(v)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs pl-3 border-t border-gray-100 pt-1 font-semibold">
                  <span className="text-emerald-700">Total PL</span>
                  <span className="text-emerald-700 tabular-nums">{fmtBRL(totalEquity)}</span>
                </div>
                <div className="flex justify-between text-sm pl-0 border-t-2 border-brand-300 pt-2 font-bold">
                  <span className="text-brand-800">PASSIVO + PL TOTAL</span>
                  <span className="text-brand-800 tabular-nums">{fmtBRL(totalLiabilities + totalEquity)}</span>
                </div>
                <div className={`flex items-center gap-1.5 text-xs mt-2 ${Math.abs(totalAssets - totalLiabilities - totalEquity) < 1 ? "text-emerald-700" : "text-red-700"}`}>
                  <CheckCircle2 size={11} />
                  {Math.abs(totalAssets - totalLiabilities - totalEquity) < 1 ? "Balanço equilibrado" : "Verificar equação patrimonial"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Annual Cash Flow ──────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={14} className="text-emerald-600" />
            <span className="text-sm font-semibold text-gray-900">Demonstração de Fluxo de Caixa — FY2025 (Indireto)</span>
          </div>
          <div className="space-y-1">
            {(() => {
              let lastSection = "";
              return CF_ROWS.map((row) => {
                const newSection = row.section !== lastSection && !["subtotal", "total"].includes(row.section);
                lastSection = row.section;
                return (
                  <div key={row.label}>
                    {newSection && (
                      <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-3 mb-1 pl-3">
                        {row.section === "operating" ? "Atividades Operacionais" : row.section === "investing" ? "Atividades de Investimento" : "Atividades de Financiamento"}
                      </div>
                    )}
                    <div className={`flex justify-between text-xs px-3 py-2 rounded ${SECTION_STYLE[row.section]}`}>
                      <span className={row.section === "total" || row.section === "subtotal" ? "" : "pl-2"}>{row.label}</span>
                      <span className={`tabular-nums font-semibold ${row.amount >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {row.amount >= 0 ? "+" : ""}{fmtBRL(row.amount)}
                      </span>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>

        {/* ── Auditor note ──────────────────────────────────────────── */}
        <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-600">
          <FileText size={13} className="shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Nota do Auditor Interno:</span>{" "}
            As demonstrações financeiras acima são baseadas em metodologia cash-basis gerencial
            com ajustes accrual (depreciação, provisões). Para fins de demonstrações financeiras
            estatutárias (IRPJ/CSLL, SPED Contábil), consulte o BPO contábil da AWQ.
            Relatório gerado automaticamente pelo sistema EPM em {new Date("2026-05-01").toLocaleDateString("pt-BR")}.
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <Link href="/awq/epm" className="text-brand-600 hover:underline">← EPM Overview</Link>
          <span className="text-gray-300">|</span>
          <Link href="/awq/epm/reports/board-pack" className="text-brand-600 hover:underline">Board Pack →</Link>
          <Link href="/awq/epm/pl" className="text-brand-600 hover:underline">DRE →</Link>
        </div>

      </div>
    </>
  );
}
