import Header from "@/components/Header";
import {
  Zap,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  BarChart3,
} from "lucide-react";
import {
  buData,
  consolidated,
  cashFlowRows,
  monthlyRevenue,
} from "@/lib/awq-group-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (Math.abs(n) >= 1_000_000_000) return "R$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (Math.abs(n) >= 1_000_000)     return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000)         return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

// ─── Cash position by BU ──────────────────────────────────────────────────────

const cashPosition = buData.map((bu) => ({
  ...bu,
  openingBalance: bu.cashBalance - bu.cashGenerated,
  closingBalance: bu.cashBalance,
}));

// ─── Summary Cards ────────────────────────────────────────────────────────────

const summaryCards = [
  {
    label: "FCO Consolidado",
    value: fmtR(consolidated.cashGenerated),
    sub:   "YTD Jan–Mar/26",
    delta: "+21.4% vs 2025",
    up:    true,
    icon:  Zap,
    color: "text-emerald-600",
    bg:    "bg-emerald-50",
  },
  {
    label: "FCF (Livre)",
    value: fmtR(consolidated.cashGenerated - 92_000),
    sub:   "Após Capex",
    delta: "+19.8% vs 2025",
    up:    true,
    icon:  TrendingUp,
    color: "text-brand-600",
    bg:    "bg-brand-50",
  },
  {
    label: "Caixa Consolidado",
    value: fmtR(consolidated.cashBalance),
    sub:   "Todas as BUs",
    delta: `+${fmtR(consolidated.cashGenerated)} gerado`,
    up:    true,
    icon:  DollarSign,
    color: "text-violet-700",
    bg:    "bg-violet-50",
  },
  {
    label: "Cash Conversion",
    value: `${((consolidated.cashGenerated / consolidated.netIncome) * 100).toFixed(0)}%`,
    sub:   "FCO / Lucro Líq.",
    delta: "Alta qualidade de lucro",
    up:    true,
    icon:  BarChart3,
    color: "text-amber-700",
    bg:    "bg-amber-50",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AwqCashflowPage() {
  const totalCapex       = 92_000;
  const totalFcf         = consolidated.cashGenerated - totalCapex;
  const totalDistrib     = 380_000;
  const totalVarCaixa    = totalFcf - totalDistrib;

  return (
    <>
      <Header
        title="Cash Flow — AWQ Group"
        subtitle="Fluxo de caixa consolidado por BU · Jan–Mar 2026"
      />
      <div className="px-8 py-6 space-y-6">

        {/* ── Summary Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-2xl font-bold text-slate-800">{card.value}</div>
                  <div className="text-xs font-medium text-gray-500 mt-0.5">{card.label}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {card.up
                      ? <ArrowUpRight size={11} className="text-emerald-600" />
                      : <ArrowDownRight size={11} className="text-red-600" />}
                    <span className={`text-[10px] font-semibold ${card.up ? "text-emerald-600" : "text-red-600"}`}>{card.delta}</span>
                    <span className="text-[10px] text-gray-500">{card.sub}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Cash Flow Statement ───────────────────────────────────────────── */}
        <div className="card-elevated p-5">
          <h2 className="text-sm font-bold text-slate-800 tracking-tight mb-4">
            Demonstração de Fluxo de Caixa — YTD Jan–Mar 2026
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500 w-52">Linha</th>
                  <th className="text-right py-2 px-3 text-xs font-bold text-white">JACQES</th>
                  <th className="text-right py-2 px-3 text-xs font-bold text-white">Caza Vision</th>
                  <th className="text-right py-2 px-3 text-xs font-bold text-white">Advisor</th>
                  <th className="text-right py-2 px-3 text-xs font-bold text-white">Venture</th>
                  <th className="text-right py-2 px-3 text-xs font-bold text-white">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {cashFlowRows.map((row, i) => {
                  const total = row.jacqes + row.caza + row.advisor + row.venture;
                  const isSubtotal = row.bold;
                  return (
                    <tr
                      key={i}
                      className={`border-b border-gray-100 ${isSubtotal ? "bg-gray-50" : "hover:bg-gray-100"} transition-colors`}
                    >
                      <td
                        className={`py-2 px-3 text-xs ${isSubtotal ? "font-bold text-slate-800" : "text-gray-500"}`}
                        style={{ paddingLeft: `${(row.indent * 14) + 12}px` }}
                      >
                        {row.label}
                      </td>
                      {[row.jacqes, row.caza, row.advisor, row.venture].map((v, j) => (
                        <td
                          key={j}
                          className={`py-2 px-3 text-right text-xs ${
                            isSubtotal ? "font-bold text-slate-800" : v < 0 ? "text-red-600" : "text-gray-500"
                          }`}
                        >
                          {fmtR(v)}
                        </td>
                      ))}
                      <td className={`py-2 px-3 text-right text-xs font-bold ${isSubtotal ? "text-slate-800" : total < 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {fmtR(total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* ── Cash Position by BU ──────────────────────────────────────────── */}
          <div className="card-elevated p-5">
            <h2 className="text-sm font-bold text-slate-800 tracking-tight mb-4">Posição de Caixa por BU</h2>
            <div className="space-y-4">
              {cashPosition.map((bu) => {
                const totalBalance = buData.reduce((s, b) => s + b.cashBalance, 0);
                const share = (bu.cashBalance / totalBalance) * 100;
                return (
                  <div key={bu.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${bu.color}`} />
                        <span className={`text-xs font-medium ${bu.accentColor}`}>{bu.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-gray-500">Gerado: <span className="text-emerald-600 font-semibold">{fmtR(bu.cashGenerated)}</span></span>
                        <span className="text-slate-800 font-bold">{fmtR(bu.cashBalance)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${bu.color} rounded-full`} style={{ width: `${share}%` }} />
                    </div>
                    <div className="flex justify-between mt-0.5 text-[10px] text-gray-500">
                      <span>Abertura: {fmtR(bu.openingBalance)}</span>
                      <span>Fechamento: {fmtR(bu.closingBalance)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-500">Caixa Total Consolidado</span>
              <span className="text-base font-bold text-slate-800">{fmtR(consolidated.cashBalance)}</span>
            </div>
          </div>

          {/* ── FCF Waterfall ─────────────────────────────────────────────────── */}
          <div className="card-elevated p-5">
            <h2 className="text-sm font-bold text-slate-800 tracking-tight mb-4">FCF Waterfall — Consolidado YTD</h2>
            <div className="space-y-2.5">
              {[
                { label: "Lucro Líquido Ops.",     value:  consolidated.netIncome,     color: "bg-emerald-500" },
                { label: "(+) D&A",                value:  69_000,                     color: "bg-emerald-400" },
                { label: "(+/-) Capital de Giro",  value:  324_000,                    color: "bg-brand-500"   },
                { label: "= FCO",                  value:  consolidated.cashGenerated, color: "bg-brand-600", bold: true },
                { label: "(-) Capex",              value: -totalCapex,                 color: "bg-red-500"     },
                { label: "= FCF Livre",            value:  totalFcf,                   color: "bg-violet-600", bold: true },
                { label: "(-) Distribuições",      value: -totalDistrib,               color: "bg-red-400"     },
                { label: "= Var. de Caixa",        value:  totalVarCaixa,              color: "bg-emerald-600", bold: true },
              ].map((item) => {
                const maxVal = consolidated.cashGenerated;
                const barW = Math.abs(item.value) / maxVal * 100;
                const isNeg = item.value < 0;
                return (
                  <div key={item.label} className={`flex items-center gap-3 ${(item as { bold?: boolean }).bold ? "py-1 bg-gray-50 px-2 rounded-lg" : ""}`}>
                    <span className={`text-xs w-40 shrink-0 ${(item as { bold?: boolean }).bold ? "font-bold text-slate-800" : "text-gray-500"}`}>
                      {item.label}
                    </span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full`}
                        style={{ width: `${Math.min(barW, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold w-20 text-right shrink-0 ${isNeg ? "text-red-600" : "text-emerald-600"}`}>
                      {isNeg ? "" : "+"}{fmtR(item.value)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
