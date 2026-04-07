import Header from "@/components/Header";
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import {
  JACQES_BUDGET,
  JACQES_BUDGET_LINES,
  JACQES_PL,
} from "@/lib/jacqes-data";

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

// ─── Fonte canônica — lib/jacqes-data.ts (Camada 2 + 3) ─────────────────────
// yearBudget e budgetLines eram inline com erro crítico:
//   yearBudget.receita = 15_600_000 → implica Q1 budget = 3_900_000
//   mas awq-group-data.budgetRevenue (Q1 real) = 4_440_000
//   Divergência de 540K no budget Q1 — inaceitável para consistência.
//
// CORREÇÃO:
//   annualRevenue = budgetRevenue × 4 = 17_760_000 (anualizado do Q1)
//   ytdRevenue    = budgetRevenue     = 4_440_000  (Q1 real)
//   ytdActual     = JACQES_PL.revenueBruta = 4_820_000 → var = +8.6% ✓
//   (consistente com Alert A2: "superou o budget em 8.6%")

const budgetLines = JACQES_BUDGET_LINES;

const categoryBudget = [
  { category: "Marketing & Growth",   budget: 480_000, actual: 412_000, icon: TrendingUp,    color: "text-brand-600"   },
  { category: "Salários & Benefícios",budget: 1_240_000, actual: 1_180_000, icon: DollarSign, color: "text-violet-700" },
  { category: "Tecnologia & Infra",   budget: 180_000, actual: 154_000, icon: BarChart3,     color: "text-emerald-600" },
  { category: "Vendas & Comissões",   budget: 320_000, actual: 348_000, icon: TrendingUp,    color: "text-amber-700"   },
  { category: "G&A",                  budget: 240_000, actual: 228_000, icon: BarChart3,     color: "text-gray-400"    },
  { category: "Desp. Operacionais",   budget: 120_000, actual: 132_000, icon: AlertTriangle, color: "text-red-600"     },
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
  // Variâncias derivadas da camada canônica:
  //   receitaVar = (4_820_000 - 4_440_000) / 4_440_000 = +8.6% ✓
  //   ebitdaVar  = (866_800 - 976_800) / 976_800 = -11.3% (abaixo do budget)
  const receitaVar = variance(JACQES_PL.revenueBruta, JACQES_BUDGET.ytdRevenue);
  const ebitdaVar  = variance(JACQES_PL.ebitda,       JACQES_BUDGET.ytdEbitda);

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
              value: fmtR(JACQES_BUDGET.annualRevenue),
              sub: `YTD realizado: ${fmtR(JACQES_PL.revenueBruta)}`,
              delta: `${receitaVar >= 0 ? "+" : ""}${receitaVar.toFixed(1)}% vs budget Q1`,
              up: receitaVar >= 0,
              icon: DollarSign,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
            },
            {
              label: "Budget EBITDA 2026",
              value: fmtR(JACQES_BUDGET.annualEbitda),
              sub: `YTD realizado: ${fmtR(JACQES_PL.ebitda)}`,
              delta: `${ebitdaVar >= 0 ? "+" : ""}${ebitdaVar.toFixed(1)}% vs budget Q1`,
              up: ebitdaVar >= 0,
              icon: BarChart3,
              color: "text-brand-600",
              bg: "bg-brand-50",
            },
            {
              label: "Forecast Receita 2026",
              value: fmtR(Math.round(JACQES_BUDGET.annualRevenue * 1.04)),
              sub: `+4% vs budget anualizado`,
              delta: "+4.0% acima do budget",
              up: true,
              icon: TrendingUp,
              color: "text-violet-700",
              bg: "bg-violet-50",
            },
            {
              label: "% Budget Executado",
              value: ((JACQES_PL.revenueBruta / JACQES_BUDGET.annualRevenue) * 100).toFixed(0) + "%",
              sub: "3 de 12 meses · anualizado",
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

        {/* ── Category Budget ───────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Budget por Categoria — YTD Jan–Mar 2026</h2>
          <div className="space-y-4">
            {categoryBudget.map((cat) => {
              const Icon = cat.icon;
              const usedPct = Math.min((cat.actual / cat.budget) * 100, 100);
              const v = variance(cat.actual, cat.budget);
              const isExpense = true;
              const overBudget = cat.actual > cat.budget;
              return (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Icon size={12} className={cat.color} />
                      <span className="text-xs text-gray-500">{cat.category}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-gray-500">Budget: {fmtR(cat.budget)}</span>
                      <span className={`font-semibold ${overBudget ? "text-red-600" : "text-emerald-600"}`}>
                        Real: {fmtR(cat.actual)}
                      </span>
                      <span className={`font-bold ${varColor(v, isExpense)}`}>
                        {varLabel(v)}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${overBudget ? "bg-red-500" : "bg-emerald-500"}`}
                      style={{ width: `${usedPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </>
  );
}
