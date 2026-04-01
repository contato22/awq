import Header from "@/components/Header";
import {
  Scale,
  DollarSign,
  TrendingUp,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import {
  buData,
  operatingBus,
  consolidated,
  budgetVsActual,
} from "@/lib/awq-group-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (Math.abs(n) >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000)     return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function varPct(actual: number, budget: number) {
  if (budget === 0) return 0;
  return ((actual - budget) / budget) * 100;
}

// ─── Budget Lines ─────────────────────────────────────────────────────────────

const budgetLines: { line: string; jacquesBudg: number; jacquesActual: number; cazaBudg: number; cazaActual: number; advisorBudg: number; advisorActual: number; isExpense: boolean }[] = [];

// ─── Consolidated budget by category ─────────────────────────────────────────

const categoryBudget: { category: string; budget: number; actual: number; bu: string }[] = [];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AwqBudgetPage() {
  const totalBudget   = consolidated.budgetRevenue;
  const totalActual   = consolidated.revenue;
  const var_           = budgetVsActual;

  return (
    <>
      <Header
        title="Budget — AWQ Group"
        subtitle="Budget vs Actual consolidado por BU · YTD Jan–Mar 2026"
      />
      <div className="px-8 py-6 space-y-6">

        {/* ── Summary Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            {
              label: "Budget Receita YTD",
              value: fmtR(totalBudget),
              sub:   "Ops. consolidado",
              delta: `Real: ${fmtR(totalActual)}`,
              up:    true,
              icon:  Scale,
              color: "text-brand-600",
              bg:    "bg-brand-50",
            },
            {
              label: "Var. Receita vs Budget",
              value: `+${var_.toFixed(1)}%`,
              sub:   `+${fmtR(totalActual - totalBudget)} acima`,
              delta: "Acima do plano",
              up:    true,
              icon:  TrendingUp,
              color: "text-emerald-600",
              bg:    "bg-emerald-50",
            },
            {
              label: "BUs acima do Budget",
              value: "3 / 3",
              sub:   "Todas operacionais",
              delta: "JACQES +8.6%  Caza +12.6%",
              up:    true,
              icon:  CheckCircle2,
              color: "text-violet-700",
              bg:    "bg-violet-50",
            },
            {
              label: "% Budget Executado",
              value: totalBudget > 0 ? ((totalActual / (totalBudget * 4)) * 100).toFixed(0) + "%" : "—",
              sub:   "3 de 12 meses",
              delta: "Ritmo adequado",
              up:    true,
              icon:  BarChart3,
              color: "text-amber-700",
              bg:    "bg-amber-50",
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
                    {card.up ? <ArrowUpRight size={11} className="text-emerald-600" /> : <ArrowDownRight size={11} className="text-red-600" />}
                    <span className={`text-[10px] font-semibold ${card.up ? "text-emerald-600" : "text-red-600"}`}>{card.delta}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{card.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Budget vs Actual by BU + Line ────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Budget vs Actual por BU e Linha</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Linha</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">JACQES Budget</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-brand-600">JACQES Real</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Var.%</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Caza Budget</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-emerald-600">Caza Real</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Var.%</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Advisor Budget</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-violet-700">Advisor Real</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Var.%</th>
                </tr>
              </thead>
              <tbody>
                {budgetLines.length === 0 && (
                  <tr><td colSpan={10} className="py-12 text-center text-sm text-gray-400">Sem dados disponíveis</td></tr>
                )}
                {budgetLines.map((row) => {
                  const vJ = varPct(row.jacquesActual, row.jacquesBudg);
                  const vC = varPct(row.cazaActual, row.cazaBudg);
                  const vA = varPct(row.advisorActual, row.advisorBudg);
                  const varCell = (v: number, isExp: boolean) => {
                    const positive = isExp ? v < 0 : v > 0;
                    return (
                      <span className={`text-xs font-semibold flex items-center justify-end gap-0.5 ${positive ? "text-emerald-600" : "text-red-600"}`}>
                        {v >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        {v >= 0 ? "+" : ""}{v.toFixed(1)}%
                      </span>
                    );
                  };
                  return (
                    <tr key={row.line} className="border-b border-gray-100 hover:bg-gray-100 transition-colors">
                      <td className="py-2.5 px-3 text-xs font-semibold text-gray-400">{row.line}</td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-500">{fmtR(row.jacquesBudg)}</td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-900">{fmtR(row.jacquesActual)}</td>
                      <td className="py-2.5 px-3 text-right">{varCell(vJ, row.isExpense)}</td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-500">{fmtR(row.cazaBudg)}</td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-900">{fmtR(row.cazaActual)}</td>
                      <td className="py-2.5 px-3 text-right">{varCell(vC, row.isExpense)}</td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-500">{fmtR(row.advisorBudg)}</td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-900">{fmtR(row.advisorActual)}</td>
                      <td className="py-2.5 px-3 text-right">{varCell(vA, row.isExpense)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Category Budget ───────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Budget por Categoria — Consolidado YTD</h2>
          <div className="space-y-3">
            {categoryBudget.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">Sem dados disponíveis</p>
            )}
            {categoryBudget.map((cat) => {
              const v          = varPct(cat.actual, cat.budget);
              const overBudget = cat.actual > cat.budget;
              const usedPct    = Math.min((cat.actual / cat.budget) * 100, 100);
              return (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {overBudget
                        ? <AlertTriangle size={11} className="text-red-600" />
                        : <CheckCircle2 size={11} className="text-emerald-600" />}
                      <span className="text-xs text-gray-400">{cat.category}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-gray-500">Budget: {fmtR(cat.budget)}</span>
                      <span className={`font-semibold ${overBudget ? "text-red-600" : "text-emerald-600"}`}>
                        Real: {fmtR(cat.actual)}
                      </span>
                      <span className={`font-bold ${overBudget ? "text-red-600" : "text-emerald-600"}`}>
                        {v >= 0 ? "+" : ""}{v.toFixed(1)}%
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

        {/* ── BU Budget Summary ─────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Resumo de Budget por BU</h2>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {operatingBus.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8 col-span-3">Sem dados disponíveis</p>
            )}
            {operatingBus.map((bu) => {
              const v        = varPct(bu.revenue, bu.budgetRevenue);
              const isAbove  = v > 0;
              const execPct  = bu.budgetRevenue > 0 ? ((bu.revenue / (bu.budgetRevenue * 4)) * 100).toFixed(0) : "0";
              return (
                <div key={bu.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-3 h-3 rounded-full ${bu.color}`} />
                    <span className={`text-sm font-bold ${bu.accentColor}`}>{bu.name}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isAbove ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                      {v >= 0 ? "+" : ""}{v.toFixed(1)}%
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Budget YTD</span>
                      <span className="text-gray-400">{fmtR(bu.budgetRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Realizado YTD</span>
                      <span className="text-gray-900 font-semibold">{fmtR(bu.revenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Exec. do Budget Anual</span>
                      <span className="text-brand-600 font-semibold">{execPct}%</span>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${bu.color} rounded-full`}
                      style={{ width: `${Math.min(parseFloat(execPct), 100)}%` }}
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
