import Header from "@/components/Header";
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  CheckCircle2,
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

function variance(actual: number, budget: number) {
  if (budget === 0) return 0;
  return ((actual - budget) / budget) * 100;
}

function varLabel(v: number) {
  if (Math.abs(v) < 0.1) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

// ─── Data — SOURCE: lib/awq-group-data.ts buData["jacqes"] ───────────────────
//
// yearActual (Q1 YTD Jan–Mar/26):
//   receita    → buData.revenue         = 4,820,000
//   cogs       → revenue − grossProfit  = 4,820,000 − 2,892,000 = 1,928,000
//   lucrobruto → buData.grossProfit     = 2,892,000  (margem bruta 60.0%)
//   opex       → grossProfit − ebitda   = 2,892,000 − 867,000   = 2,025,000
//   ebitda     → buData.ebitda          = 867,000    (margem EBITDA 18.0%)
//   lucroliq   → buData.netIncome       = 518,000    (margem líquida 10.7%)
//
// yearBudget (anual extrapolado):
//   budgetRevenue Q1 = 4,440,000 → anual = 4,440,000 × 4 = 17,760,000
//   demais linhas derivadas da mesma proporção dos actuals acima

const yearActual = {
  receita:    0,
  cogs:       0,
  lucrobruto: 0,
  opex:       0,
  ebitda:     0,
  lucroliq:   0,
};

const yearBudget = {
  receita:    0,
  cogs:       0,
  lucrobruto: 0,
  opex:       0,
  ebitda:     0,
  lucroliq:   0,
};

const budgetLines = [
  {
    category: "Receita de Serviços",
    budgetAno:  yearBudget.receita,
    actualYtd:  yearActual.receita,
    budgetYtd:  yearBudget.receita * (3 / 12),
    forecast:   yearBudget.receita * 1.04,
    type: "revenue",
  },
  {
    category: "Custo dos Serviços (COGS)",
    budgetAno:  yearBudget.cogs,
    actualYtd:  yearActual.cogs,
    budgetYtd:  yearBudget.cogs * (3 / 12),
    forecast:   yearBudget.cogs * 1.02,
    type: "cost",
  },
  {
    category: "Lucro Bruto",
    budgetAno:  yearBudget.lucrobruto,
    actualYtd:  yearActual.lucrobruto,
    budgetYtd:  yearBudget.lucrobruto * (3 / 12),
    forecast:   yearBudget.lucrobruto * 1.05,
    type: "subtotal",
  },
  {
    category: "OpEx Total",
    budgetAno:  yearBudget.opex,
    actualYtd:  yearActual.opex,
    budgetYtd:  yearBudget.opex * (3 / 12),
    forecast:   yearBudget.opex * 1.01,
    type: "cost",
  },
  {
    category: "EBITDA",
    budgetAno:  yearBudget.ebitda,
    actualYtd:  yearActual.ebitda,
    budgetYtd:  yearBudget.ebitda * (3 / 12),
    forecast:   yearBudget.ebitda * 1.08,
    type: "ebitda",
  },
  {
    category: "Lucro Líquido",
    budgetAno:  yearBudget.lucroliq,
    actualYtd:  yearActual.lucroliq,
    budgetYtd:  yearBudget.lucroliq * (3 / 12),
    forecast:   yearBudget.lucroliq * 1.06,
    type: "net",
  },
];

// ─── Color helpers ────────────────────────────────────────────────────────────

function varColor(v: number, isExpense: boolean) {
  if (isExpense) {
    return v > 0 ? "text-red-600" : "text-emerald-600";
  }
  return v > 0 ? "text-emerald-600" : "text-red-600";
}

function varBadge(v: number, isExpense: boolean) {
  if (Math.abs(v) < 0.1) return null;
  const positive = isExpense ? v < 0 : v > 0;
  if (positive) return <span className="badge badge-green">{varLabel(v)}</span>;
  return <span className="badge badge-red">{varLabel(v)}</span>;
}

function rowTextColor(type: string) {
  if (type === "subtotal" || type === "ebitda" || type === "net") return "text-gray-900 font-bold";
  return "text-gray-400";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JacqesBudgetPage() {
  const receitaVar = variance(yearActual.receita, yearBudget.receita * (3 / 12));
  const ebitdaVar  = variance(yearActual.ebitda,  yearBudget.ebitda  * (3 / 12));

  return (
    <>
      <Header
        title="Budget — JACQES"
        subtitle="Orçamento anual · Realizado YTD · Forecast 2026"
      />
      <div className="page-container">

        {/* ── Summary Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Budget Receita 2026",
              value: fmtR(yearBudget.receita),
              sub: `YTD: ${fmtR(yearActual.receita)}`,
              delta: `${receitaVar >= 0 ? "+" : ""}${receitaVar.toFixed(1)}% vs budget YTD`,
              up: receitaVar >= 0,
              icon: DollarSign,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
            {
              label: "Budget EBITDA 2026",
              value: fmtR(yearBudget.ebitda),
              sub: `YTD: ${fmtR(yearActual.ebitda)}`,
              delta: `${ebitdaVar >= 0 ? "+" : ""}${ebitdaVar.toFixed(1)}% vs budget YTD`,
              up: ebitdaVar >= 0,
              icon: BarChart3,
              color: "text-brand-600",
              bg: "bg-brand-50",
            },
            {
              label: "Forecast Receita 2026",
              value: fmtR(yearBudget.receita * 1.04),
              sub: `+4% vs budget`,
              delta: "+4.0% acima do budget",
              up: true,
              icon: TrendingUp,
              color: "text-violet-700",
              bg: "bg-violet-50",
            },
            {
              label: "% Budget Executado",
              value: ((yearActual.receita / yearBudget.receita) * 100).toFixed(0) + "%",
              sub: "3 de 12 meses",
              delta: "Ritmo adequado",
              up: true,
              icon: CheckCircle2,
              color: "text-amber-700",
              bg: "bg-amber-50",
            },
          ].map((card) => {
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
                    {card.up
                      ? <ArrowUpRight size={11} className="text-emerald-600" />
                      : <ArrowDownRight size={11} className="text-red-600" />}
                    <span className={`text-[10px] font-semibold ${card.up ? "text-emerald-600" : "text-red-600"}`}>{card.delta}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{card.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Budget vs Actual vs Forecast ─────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Budget vs Realizado vs Forecast — Linhas Principais · 2026
          </h2>
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Linha</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Budget Ano</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Budget YTD</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Realizado YTD</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Var. YTD</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Forecast Ano</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Exec. %</th>
                </tr>
              </thead>
              <tbody>
                {budgetLines.map((row) => {
                  const isExpense = row.type === "cost";
                  const v         = variance(row.actualYtd, row.budgetYtd);
                  const execPct   = ((row.actualYtd / row.budgetAno) * 100).toFixed(0) + "%";
                  const isSubtotal = row.type !== "cost" && row.type !== "revenue";
                  return (
                    <tr
                      key={row.category}
                      className={`border-b border-gray-100 transition-colors ${isSubtotal ? "bg-gray-50" : "hover:bg-gray-50/80"}`}
                    >
                      <td className={`py-2.5 px-3 text-xs ${rowTextColor(row.type)}`}>{row.category}</td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-500">{fmtR(row.budgetAno)}</td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-500">{fmtR(row.budgetYtd)}</td>
                      <td className={`py-2.5 px-3 text-right text-xs font-semibold ${isExpense ? "text-red-600" : "text-gray-900"}`}>
                        {fmtR(row.actualYtd)}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs">
                        {varBadge(v, isExpense) ?? (
                          <span className="text-gray-400 flex items-center justify-end gap-0.5">
                            <Minus size={10} /> —
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold text-emerald-600">{fmtR(row.forecast)}</td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-500">{execPct}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}
