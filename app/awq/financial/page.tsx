import Header from "@/components/Header";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";
import {
  buData,
  operatingBus,
  consolidated,
  consolidatedMargins,
  monthlyRevenue,
} from "@/lib/awq-group-data";
import { getFinancialDataSource } from "@/lib/financial-data-bridge";
import DataSourceBanner from "@/components/DataSourceBanner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (Math.abs(n) >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000)     return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function pct(n: number, d: number) {
  if (d === 0) return "—";
  return ((n / d) * 100).toFixed(1) + "%";
}

// ─── P&L Lines ────────────────────────────────────────────────────────────────

interface PlLine {
  label:   string;
  bold:    boolean;
  indent:  number;
  jacqes:  number;
  caza:    number;
  advisor: number;
  total:   number;
  isNeg?:  boolean;
}

const plLines: PlLine[] = [
  {
    label: "Receita Bruta de Serviços", bold: false, indent: 1,
    jacqes: 4_820_000, caza: 2_418_000, advisor: 1_572_000,
    total: 4_820_000 + 2_418_000 + 1_572_000,
  },
  {
    label: "(-) Deduções / Impostos", bold: false, indent: 1, isNeg: true,
    jacqes: -481_000, caza: -242_000, advisor: -157_000,
    total: -(481_000 + 242_000 + 157_000),
  },
  {
    label: "= Receita Líquida", bold: true, indent: 0,
    jacqes: 4_339_000, caza: 2_176_000, advisor: 1_415_000,
    total: 4_339_000 + 2_176_000 + 1_415_000,
  },
  {
    label: "(-) Custo dos Serviços", bold: false, indent: 1, isNeg: true,
    jacqes: -1_447_000, caza: -446_000, advisor: -550_000,
    total: -(1_447_000 + 446_000 + 550_000),
  },
  {
    label: "= Lucro Bruto", bold: true, indent: 0,
    jacqes: consolidated.grossProfit, caza: 1_730_000, advisor: 865_000,
    total: consolidated.grossProfit + 1_730_000 + 865_000,
  },
  {
    label: "(-) Despesas Comerciais", bold: false, indent: 1, isNeg: true,
    jacqes: -347_000, caza: -152_000, advisor: -62_000,
    total: -(347_000 + 152_000 + 62_000),
  },
  {
    label: "(-) Despesas Administrativas", bold: false, indent: 1, isNeg: true,
    jacqes: -521_000, caza: -280_000, advisor: -48_000,
    total: -(521_000 + 280_000 + 48_000),
  },
  {
    label: "(-) Despesas com Pessoal", bold: false, indent: 1, isNeg: true,
    jacqes: -869_000, caza: -645_000, advisor: -32_000,
    total: -(869_000 + 645_000 + 32_000),
  },
  {
    label: "= EBITDA", bold: true, indent: 0,
    jacqes: 867_000, caza: 653_000, advisor: 723_000,
    total: 867_000 + 653_000 + 723_000,
  },
  {
    label: "(-) D&A", bold: false, indent: 1, isNeg: true,
    jacqes: -43_000, caza: -18_000, advisor: -8_000,
    total: -(43_000 + 18_000 + 8_000),
  },
  {
    label: "(-) IR e CSLL", bold: false, indent: 1, isNeg: true,
    jacqes: -267_000, caza: -215_000, advisor: -236_000,
    total: -(267_000 + 215_000 + 236_000),
  },
  {
    label: "= Lucro Líquido", bold: true, indent: 0,
    jacqes: consolidated.netIncome, caza: 420_000, advisor: 479_000,
    total: consolidated.netIncome + 420_000 + 479_000,
  },
];

// ─── Summary Cards ────────────────────────────────────────────────────────────

const summaryCards = [
  {
    label: "Receita Consolidada",
    value: fmtR(consolidated.revenue),
    sub:   "Ops YTD",
    delta: "+8.4% vs budget",
    icon:  DollarSign,
    color: "text-emerald-600",
    bg:    "bg-emerald-50",
  },
  {
    label: "Lucro Bruto",
    value: fmtR(consolidated.grossProfit),
    sub:   `Margem ${pct(consolidated.grossProfit, consolidated.revenue)}`,
    delta: "+2.3pp vs 2025",
    icon:  TrendingUp,
    color: "text-brand-600",
    bg:    "bg-brand-50",
  },
  {
    label: "EBITDA",
    value: fmtR(consolidated.ebitda),
    sub:   `Margem ${pct(consolidated.ebitda, consolidated.revenue)}`,
    delta: "+1.1pp vs 2025",
    icon:  BarChart3,
    color: "text-violet-700",
    bg:    "bg-violet-50",
  },
  {
    label: "Lucro Líquido",
    value: fmtR(consolidated.netIncome),
    sub:   `Margem ${pct(consolidated.netIncome, consolidated.revenue)}`,
    delta: "+0.8pp vs 2025",
    icon:  TrendingUp,
    color: "text-amber-700",
    bg:    "bg-amber-50",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AwqFinancialPage() {
  const dataSource = getFinancialDataSource();

  return (
    <>
      <Header
        title="Financial — AWQ Group"
        subtitle="P&L consolidado por BU · Jan–Mar 2026"
      />
      <div className="page-container">
        <DataSourceBanner data={dataSource} />

        {/* ── Summary Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5">{card.label}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <ArrowUpRight size={11} className="text-emerald-600" />
                    <span className="text-[10px] font-semibold text-emerald-600">{card.delta}</span>
                    <span className="text-[10px] text-gray-400">{card.sub}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── P&L by BU ─────────────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">DRE por BU — Jan–Mar 2026 (YTD)</h2>
          </div>
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500 w-52">Linha</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-brand-600">JACQES</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-emerald-600">Caza Vision</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-violet-700">Advisor</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-900">TOTAL</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">% Rec.</th>
                </tr>
              </thead>
              <tbody>
                {plLines.map((row, i) => {
                  const totalRevenue = 4_820_000 + 2_418_000 + 1_572_000;
                  const pctRev = totalRevenue > 0
                    ? ((Math.abs(row.total) / totalRevenue) * 100).toFixed(1) + "%"
                    : "—";
                  const isSubtotal = row.bold;
                  const isNeg = row.isNeg;
                  return (
                    <tr
                      key={i}
                      className={`border-b border-gray-100 ${isSubtotal ? "bg-gray-50" : "hover:bg-gray-50/80"} transition-colors`}
                    >
                      <td
                        className={`py-2 px-3 text-xs ${isSubtotal ? "font-bold text-gray-800" : "text-gray-400"}`}
                        style={{ paddingLeft: `${(row.indent * 14) + 12}px` }}
                      >
                        {row.label}
                      </td>
                      {[row.jacqes, row.caza, row.advisor, row.total].map((v, j) => (
                        <td
                          key={j}
                          className={`py-2 px-3 text-right text-xs ${isSubtotal ? "font-bold" : ""} ${
                            isNeg ? "text-red-600" : isSubtotal ? "text-gray-900" : "text-gray-400"
                          }`}
                        >
                          {fmtR(v)}
                        </td>
                      ))}
                      <td className="py-2 px-3 text-right text-[11px] text-gray-400">
                        {isSubtotal ? <span className="badge badge-green">{pctRev}</span> : pctRev}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* ── Revenue mix ──────────────────────────────────────────────────── */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Mix de Receita por BU</h2>
            <div className="space-y-3">
              {operatingBus.map((bu) => {
                const share = (bu.revenue / consolidated.revenue) * 100;
                return (
                  <div key={bu.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-medium ${bu.accentColor}`}>{bu.name}</span>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-gray-500">M. Bruta: {pct(bu.grossProfit, bu.revenue)}</span>
                        <span className="text-gray-900 font-semibold">{fmtR(bu.revenue)}</span>
                        <span className="text-gray-500">{share.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${bu.color} rounded-full`} style={{ width: `${share}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 pt-4 border-t border-gray-200">
              <div className="text-xs font-semibold text-gray-900 mb-3">Margens por BU</div>
              <div className="grid grid-cols-3 gap-2">
                {operatingBus.map((bu) => (
                  <div key={bu.id} className="text-center p-3 rounded-lg bg-gray-100">
                    <div className={`text-base font-bold ${bu.accentColor}`}>{bu.name}</div>
                    <div className="text-xs text-gray-500 mt-1">Bruta: <span className="text-gray-900 font-semibold">{pct(bu.grossProfit, bu.revenue)}</span></div>
                    <div className="text-xs text-gray-500">EBITDA: <span className="text-brand-600 font-semibold">{pct(bu.ebitda, bu.revenue)}</span></div>
                    <div className="text-xs text-gray-500">Líq.: <span className="text-emerald-600 font-semibold">{pct(bu.netIncome, bu.revenue)}</span></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Monthly Revenue ───────────────────────────────────────────────── */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Receita Mensal — Consolidado</h2>
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left  py-2 px-2 text-xs font-semibold text-gray-500">Mês</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-brand-600">JACQES</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-emerald-600">Caza</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-violet-700">Advisor</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-gray-900">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyRevenue.map((row) => {
                    const prevTotal = monthlyRevenue[monthlyRevenue.indexOf(row) - 1]?.total;
                    const growth = prevTotal ? (((row.total - prevTotal) / prevTotal) * 100).toFixed(1) : null;
                    return (
                      <tr key={row.month} className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors">
                        <td className="py-2.5 px-2 text-xs font-medium text-gray-400">{row.month}</td>
                        <td className="py-2.5 px-2 text-right text-xs text-gray-500">{fmtR(row.jacqes)}</td>
                        <td className="py-2.5 px-2 text-right text-xs text-gray-500">{fmtR(row.caza)}</td>
                        <td className="py-2.5 px-2 text-right text-xs text-gray-500">{fmtR(row.advisor)}</td>
                        <td className="py-2.5 px-2 text-right text-xs font-bold text-gray-900">
                          {fmtR(row.total)}
                          {growth && (
                            <span className="text-[10px] text-emerald-600 ml-1">+{growth}%</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-300">
                    <td className="py-2.5 px-2 text-xs font-bold text-gray-400">YTD</td>
                    <td className="py-2.5 px-2 text-right text-xs font-bold text-brand-600">
                      {fmtR(monthlyRevenue.reduce((s, r) => s + r.jacqes, 0))}
                    </td>
                    <td className="py-2.5 px-2 text-right text-xs font-bold text-emerald-600">
                      {fmtR(monthlyRevenue.reduce((s, r) => s + r.caza, 0))}
                    </td>
                    <td className="py-2.5 px-2 text-right text-xs font-bold text-violet-700">
                      {fmtR(monthlyRevenue.reduce((s, r) => s + r.advisor, 0))}
                    </td>
                    <td className="py-2.5 px-2 text-right text-xs font-bold text-gray-900">
                      {fmtR(monthlyRevenue.reduce((s, r) => s + r.total, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* BU drill-down links */}
            <div className="mt-4 pt-3 border-t border-gray-200 space-y-1">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">P&L por BU</div>
              {buData.map((bu) => (
                <Link
                  key={bu.id}
                  href={bu.hrefFinancial}
                  className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50/80 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${bu.color}`} />
                    <span className="text-[11px] text-gray-400 group-hover:text-gray-900 transition-colors">{bu.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[11px] font-semibold ${bu.accentColor}`}>
                      {bu.revenue > 0 ? fmtR(bu.revenue) : "—"}
                    </span>
                    <ChevronRight size={10} className="text-gray-400 group-hover:text-brand-600 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
