import Header from "@/components/Header";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function pct(n: number) {
  return (n * 100).toFixed(1) + "%";
}

function variance(actual: number, budget: number) {
  if (budget === 0) return 0;
  return ((actual - budget) / budget) * 100;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const dreData = [
  { label: "Receita Bruta de Serviços",  value: 4_820_000, indent: 0, bold: false, type: "revenue"  },
  { label: "(-) Deduções e Impostos",    value: -481_000,  indent: 1, bold: false, type: "deduction" },
  { label: "= Receita Líquida",          value: 4_339_000, indent: 0, bold: true,  type: "subtotal"  },
  { label: "(-) Custo dos Serviços",     value: -1_735_600,indent: 1, bold: false, type: "cost"      },
  { label: "= Lucro Bruto",             value: 2_603_400, indent: 0, bold: true,  type: "subtotal"  },
  { label: "(-) Desp. Comerciais",       value: -347_120,  indent: 1, bold: false, type: "expense"   },
  { label: "(-) Desp. Administrativas", value: -520_680,  indent: 1, bold: false, type: "expense"   },
  { label: "(-) Desp. com Pessoal",      value: -868_800,  indent: 1, bold: false, type: "expense"   },
  { label: "= EBITDA",                   value: 866_800,   indent: 0, bold: true,  type: "ebitda"    },
  { label: "(-) Depreciação e Amort.",   value: -43_390,   indent: 1, bold: false, type: "expense"   },
  { label: "= EBIT",                     value: 823_410,   indent: 0, bold: true,  type: "subtotal"  },
  { label: "(+/-) Resultado Financeiro", value: -38_000,   indent: 1, bold: false, type: "expense"   },
  { label: "= Resultado Antes do IR",    value: 785_410,   indent: 0, bold: true,  type: "subtotal"  },
  { label: "(-) IR e CSLL",             value: -267_040,  indent: 1, bold: false, type: "expense"   },
  { label: "= Lucro Líquido",           value: 518_370,   indent: 0, bold: true,  type: "net"       },
];

const budgetVsActual = [
  { month: "Jan/26", receitaBudget: 320_000, receitaActual: 298_000, ebitdaBudget: 57_600, ebitdaActual: 51_500 },
  { month: "Fev/26", receitaBudget: 340_000, receitaActual: 375_000, ebitdaBudget: 61_200, ebitdaActual: 71_250 },
  { month: "Mar/26", receitaBudget: 380_000, receitaActual: 421_000, ebitdaBudget: 68_400, ebitdaActual: 80_000 },
  { month: "Abr/26", receitaBudget: 400_000, receitaActual: 0,       ebitdaBudget: 72_000, ebitdaActual: 0      },
  { month: "Mai/26", receitaBudget: 420_000, receitaActual: 0,       ebitdaBudget: 75_600, ebitdaActual: 0      },
  { month: "Jun/26", receitaBudget: 440_000, receitaActual: 0,       ebitdaBudget: 79_200, ebitdaActual: 0      },
];

const summaryCards = [
  {
    label: "Receita Líquida YTD",
    value: fmtR(4_339_000),
    sub: "Jan–Mar/26",
    delta: "+18.4%",
    up: true,
    icon: DollarSign,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    label: "Lucro Bruto YTD",
    value: fmtR(2_603_400),
    sub: `Margem ${pct(2_603_400 / 4_339_000)}`,
    delta: "+12.1%",
    up: true,
    icon: TrendingUp,
    color: "text-brand-400",
    bg: "bg-brand-500/10",
  },
  {
    label: "EBITDA YTD",
    value: fmtR(866_800),
    sub: `Margem ${pct(866_800 / 4_339_000)}`,
    delta: "+9.3%",
    up: true,
    icon: BarChart3,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
  {
    label: "Lucro Líquido YTD",
    value: fmtR(518_370),
    sub: `Margem ${pct(518_370 / 4_339_000)}`,
    delta: "+7.8%",
    up: true,
    icon: TrendingDown,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
];

// ─── Color helpers ────────────────────────────────────────────────────────────

function dreRowColor(type: string, value: number): string {
  if (type === "revenue") return "text-white";
  if (type === "subtotal" || type === "ebitda" || type === "net") return "text-white";
  if (value < 0) return "text-red-400";
  return "text-emerald-400";
}

function varColor(v: number) {
  if (v > 0) return "text-emerald-400";
  if (v < 0) return "text-red-400";
  return "text-gray-500";
}

function varIcon(v: number) {
  if (v > 0) return <ArrowUpRight size={11} className="text-emerald-400" />;
  if (v < 0) return <ArrowDownRight size={11} className="text-red-400" />;
  return <Minus size={11} className="text-gray-500" />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JacqesFinancialPage() {
  const ytdBudgetReceita = budgetVsActual
    .filter((r) => r.receitaActual > 0)
    .reduce((s, r) => s + r.receitaBudget, 0);
  const ytdActualReceita = budgetVsActual
    .filter((r) => r.receitaActual > 0)
    .reduce((s, r) => s + r.receitaActual, 0);
  const ytdVarReceita = variance(ytdActualReceita, ytdBudgetReceita);

  return (
    <>
      <Header
        title="Financial — JACQES"
        subtitle="DRE · Budget vs Actual · Jan–Mar 2026"
      />
      <div className="px-8 py-6 space-y-6">

        {/* ── Summary Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-2xl font-bold text-white">{card.value}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5">{card.label}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {card.up
                      ? <ArrowUpRight size={11} className="text-emerald-400" />
                      : <ArrowDownRight size={11} className="text-red-400" />}
                    <span className={`text-[10px] font-semibold ${card.up ? "text-emerald-400" : "text-red-400"}`}>
                      {card.delta}
                    </span>
                    <span className="text-[10px] text-gray-600">{card.sub}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── DRE ──────────────────────────────────────────────────────────── */}
          <div className="xl:col-span-2 card p-5">
            <h2 className="text-sm font-semibold text-white mb-4">
              DRE — Demonstração do Resultado · Jan–Mar 2026 (YTD)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Linha</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Valor YTD</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">% Receita</th>
                  </tr>
                </thead>
                <tbody>
                  {dreData.map((row, i) => {
                    const receitaLiq = 4_339_000;
                    const isSubtotal = row.bold;
                    const pctReceita = receitaLiq > 0
                      ? ((row.value / receitaLiq) * 100).toFixed(1) + "%"
                      : "—";
                    return (
                      <tr
                        key={i}
                        className={`border-b border-gray-800/50 transition-colors ${isSubtotal ? "bg-gray-800/20" : "hover:bg-gray-800/30"}`}
                      >
                        <td className={`py-2 px-3 text-xs ${isSubtotal ? "font-bold text-gray-100" : "text-gray-400"}`}
                          style={{ paddingLeft: `${(row.indent * 16) + 12}px` }}>
                          {row.label}
                        </td>
                        <td className={`py-2 px-3 text-right text-xs ${isSubtotal ? "font-bold" : ""} ${dreRowColor(row.type, row.value)}`}>
                          {fmtR(row.value)}
                        </td>
                        <td className="py-2 px-3 text-right text-[11px] text-gray-600">
                          {row.type === "subtotal" || row.type === "ebitda" || row.type === "net"
                            ? <span className="badge badge-green">{pctReceita}</span>
                            : pctReceita}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Margem Visual ────────────────────────────────────────────────── */}
          <div className="card p-5 flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-white">Margens — YTD 2026</h2>
            {[
              { label: "Margem Bruta",    value: 2_603_400, base: 4_339_000, color: "bg-emerald-500" },
              { label: "Margem EBITDA",   value: 866_800,   base: 4_339_000, color: "bg-brand-500"   },
              { label: "Margem EBIT",     value: 823_410,   base: 4_339_000, color: "bg-violet-500"  },
              { label: "Margem Líquida",  value: 518_370,   base: 4_339_000, color: "bg-amber-500"   },
            ].map((m) => {
              const p = ((m.value / m.base) * 100);
              return (
                <div key={m.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">{m.label}</span>
                    <span className="text-xs font-bold text-white">{p.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${m.color} rounded-full transition-all`}
                      style={{ width: `${Math.min(p, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}

            <div className="border-t border-gray-800 pt-4 mt-2">
              <div className="text-xs font-semibold text-gray-300 mb-3">Composição de Despesas</div>
              {[
                { label: "Custo dos Serviços",  value: 1_735_600, color: "text-red-400"    },
                { label: "Desp. Comerciais",    value: 347_120,   color: "text-orange-400" },
                { label: "Desp. Administrativas",value: 520_680,  color: "text-amber-400"  },
                { label: "Desp. Pessoal",       value: 868_800,   color: "text-yellow-400" },
              ].map((d) => (
                <div key={d.label} className="flex items-center justify-between py-1.5 border-b border-gray-800/50 last:border-0">
                  <span className="text-xs text-gray-500">{d.label}</span>
                  <span className={`text-xs font-semibold ${d.color}`}>{fmtR(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Budget vs Actual ──────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Budget vs Actual — Receita Mensal 2026</h2>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5 text-gray-500"><span className="w-3 h-0.5 bg-gray-600 inline-block rounded" /> Budget</span>
              <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-3 h-0.5 bg-emerald-400 inline-block rounded" /> Realizado</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Mês</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Budget Receita</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Realizado</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Var. %</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Budget EBITDA</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">EBITDA Real</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Var. %</th>
                </tr>
              </thead>
              <tbody>
                {budgetVsActual.map((row) => {
                  const isFuture = row.receitaActual === 0;
                  const varR = isFuture ? null : variance(row.receitaActual, row.receitaBudget);
                  const varE = isFuture ? null : variance(row.ebitdaActual, row.ebitdaBudget);
                  return (
                    <tr key={row.month} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="py-2.5 px-3 text-gray-300 font-medium text-xs">{row.month}</td>
                      <td className="py-2.5 px-3 text-right text-gray-500 text-xs">{fmtR(row.receitaBudget)}</td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold">
                        {isFuture
                          ? <span className="text-gray-700">—</span>
                          : <span className="text-white">{fmtR(row.receitaActual)}</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs">
                        {varR !== null ? (
                          <span className={`flex items-center justify-end gap-0.5 font-semibold ${varColor(varR)}`}>
                            {varIcon(varR)}{varR >= 0 ? "+" : ""}{varR.toFixed(1)}%
                          </span>
                        ) : <span className="text-gray-700">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-500 text-xs">{fmtR(row.ebitdaBudget)}</td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold">
                        {isFuture
                          ? <span className="text-gray-700">—</span>
                          : <span className="text-brand-400">{fmtR(row.ebitdaActual)}</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs">
                        {varE !== null ? (
                          <span className={`flex items-center justify-end gap-0.5 font-semibold ${varColor(varE)}`}>
                            {varIcon(varE)}{varE >= 0 ? "+" : ""}{varE.toFixed(1)}%
                          </span>
                        ) : <span className="text-gray-700">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-700">
                  <td className="py-2.5 px-3 text-xs font-bold text-gray-400">YTD REAL</td>
                  <td className="py-2.5 px-3 text-right text-gray-500 text-xs font-bold">{fmtR(ytdBudgetReceita)}</td>
                  <td className="py-2.5 px-3 text-right text-white font-bold text-xs">{fmtR(ytdActualReceita)}</td>
                  <td className="py-2.5 px-3 text-right text-xs">
                    <span className={`flex items-center justify-end gap-0.5 font-bold ${varColor(ytdVarReceita)}`}>
                      {varIcon(ytdVarReceita)}{ytdVarReceita >= 0 ? "+" : ""}{ytdVarReceita.toFixed(1)}%
                    </span>
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}
