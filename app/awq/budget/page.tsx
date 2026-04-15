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
  Inbox,
  Send,
  Zap,
} from "lucide-react";
import {
  buData,
  operatingBus,
  consolidated,
  budgetVsActual,
  categoryBudget,
  BUDGET_LINES,
} from "@/lib/awq-derived-metrics";
import { buildFinancialQuery, fmtBRL } from "@/lib/financial-query";
import { getPayables, getReceivables } from "@/lib/financial-db";

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AwqBudgetPage() {
  const [q, payables, receivables] = await Promise.all([
    buildFinancialQuery(),
    getPayables(),
    getReceivables(),
  ]);

  const totalBudget = consolidated.budgetRevenue;
  const totalActual = consolidated.revenue;
  const var_        = budgetVsActual;

  // ── Derived from canonical BUDGET_LINES — no hardcoded strings ───────────────
  const revLine        = BUDGET_LINES.find((l) => l.line === "Receita")!;
  const busAboveBudget = operatingBus.filter((bu) => bu.revenue > bu.budgetRevenue).length;
  const jacquesVar     = varPct(revLine.jacquesActual, revLine.jacquesBudg);
  const cazaVar        = varPct(revLine.cazaActual, revLine.cazaBudg);
  const advisorVar     = varPct(revLine.advisorActual, revLine.advisorBudg);
  const buAboveDelta   = [
    jacquesVar >= 0 ? `JACQES +${jacquesVar.toFixed(1)}%` : `JACQES ${jacquesVar.toFixed(1)}%`,
    cazaVar    >= 0 ? `Caza +${cazaVar.toFixed(1)}%`      : `Caza ${cazaVar.toFixed(1)}%`,
    advisorVar >= 0 ? `Advisor +${advisorVar.toFixed(1)}%` : `Advisor ${advisorVar.toFixed(1)}%`,
  ].join("  ");

  return (
    <>
      <Header
        title="Budget — AWQ Group"
        subtitle="Budget vs Actual consolidado por BU · YTD Jan–Mar 2026"
      />
      <div className="page-container">

        {/* ── Snapshot notice ─────────────────────────────────────────────── */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800">
                Esta página usa dados de snapshot (accrual) — não verificados pela base bancária.
              </p>
              <p className="text-[11px] text-amber-600 mt-0.5">
                Budget e &quot;actual&quot; de receita/EBITDA são da base de planejamento, não dos extratos bancários ingeridos.
                Para caixa real por BU, acesse{" "}
                <a href="/awq/cashflow" className="underline font-medium">/awq/cashflow</a>{" "}
                ou{" "}
                <a href="/awq/financial" className="underline font-medium">/awq/financial</a>.
              </p>
            </div>
          </div>
        </div>

        {/* ── Summary Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
              value: `${busAboveBudget} / ${operatingBus.length}`,
              sub:   "BUs operacionais",
              delta: buAboveDelta,
              up:    busAboveBudget > 0,
              icon:  CheckCircle2,
              color: "text-violet-700",
              bg:    "bg-violet-50",
            },
            {
              label: "% Budget Executado",
              value: ((totalActual / (totalBudget * 4)) * 100).toFixed(0) + "%",
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
          <div className="table-scroll">
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
                {BUDGET_LINES.map((row) => {
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
                    <tr key={row.line} className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-xs font-semibold text-gray-900">{row.line}</td>
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

        {/* ── Orçamento Operacional por Categoria (real conciliado vs snapshot budget) */}
        {q.hasData && q.dreStatement.byCategory.length > 0 && (
          <div className="card p-5 border-l-4 border-emerald-400">
            <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <DollarSign size={15} className="text-emerald-500" />
              Orçamento Operacional por Categoria — Real Conciliado
            </h2>
            <p className="text-[11px] text-gray-400 mb-4">
              Actual = realizado conciliado (DRE por transação) ·
              Regime caixa. Budget anual não está parametrizado por categoria gerencial — use a seção abaixo para budget snapshot.
            </p>
            <div className="table-scroll">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">Categoria</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">Linha DRE</th>
                    <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-gray-500">Actual (Cash)</th>
                    <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-gray-500">Txns</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {q.dreStatement.byCategory.map((line) => {
                    const isRevenue = line.total > 0;
                    return (
                      <tr key={`${line.category}__${line.dreEffect}`} className="border-b border-gray-100 hover:bg-gray-50/80">
                        <td className="py-1.5 px-2 text-gray-700 font-medium">{line.categoryLabel}</td>
                        <td className="py-1.5 px-2">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                            line.dreEffect === "receita"    ? "bg-emerald-100 text-emerald-700" :
                            line.dreEffect === "custo"      ? "bg-red-100 text-red-700"         :
                            line.dreEffect === "opex"       ? "bg-orange-100 text-orange-700"   :
                            line.dreEffect === "financeiro" ? "bg-violet-100 text-violet-700"   :
                                                              "bg-amber-100 text-amber-700"
                          }`}>{line.dreEffect}</span>
                        </td>
                        <td className={`py-1.5 px-2 text-right font-bold ${isRevenue ? "text-emerald-700" : "text-red-700"}`}>
                          {line.total >= 0 ? "+" : ""}{fmtBRL(Math.abs(line.total))}
                        </td>
                        <td className="py-1.5 px-2 text-right text-gray-400">{line.txCount}</td>
                        <td className="py-1.5 px-2">
                          <span className="inline-flex items-center gap-0.5 text-[9px] bg-emerald-50 text-emerald-700 px-1 py-0.5 rounded font-semibold">
                            <CheckCircle2 size={7} /> conciliado
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {q.dreStatement.pendente > 0 && (
              <p className="text-[10px] text-amber-600 mt-2 flex items-center gap-1">
                <AlertTriangle size={10} />
                {fmtBRL(q.dreStatement.pendente)} com dreEffect=null — aguardando classificação, não incluído acima.
              </p>
            )}
          </div>
        )}

        {/* ── Category Budget ───────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Budget por Categoria — Consolidado YTD</h2>
          <div className="space-y-3">
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
                      <span className="text-xs text-gray-500">{cat.category}</span>
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
            {operatingBus.map((bu) => {
              const v        = varPct(bu.revenue, bu.budgetRevenue);
              const isAbove  = v > 0;
              const execPct  = ((bu.revenue / (bu.budgetRevenue * 4)) * 100).toFixed(0);
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

        {/* ── Caixa Real vs Orçamento Snapshot ─────────────────────────────── */}
        {q.hasData && (
          <div className="card p-5 border-l-4 border-brand-400">
            <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <Zap size={15} className="text-brand-500" />
              Caixa Real vs Orçamento — Comparativo
            </h2>
            <p className="text-[11px] text-gray-400 mb-4">
              Orçamento = snapshot accrual (planejamento) ·
              Realizado = caixa real conciliado de extratos bancários.
              Regimes diferentes — use para referência, não como Budget vs Actual GAAP.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label:   "Receita Real (Cash)",
                  value:   q.dreStatement.receita,
                  budg:    consolidated.budgetRevenue,
                  color:   "text-emerald-700",
                  regime:  "caixa",
                },
                {
                  label:   "FCO Real Líquido",
                  value:   q.dfcStatement.operacional.liquido,
                  budg:    null,
                  color:   q.dfcStatement.operacional.liquido >= 0 ? "text-brand-700" : "text-red-700",
                  regime:  "caixa",
                },
                {
                  label:   "EBITDA Proxy (Cash)",
                  value:   q.dreStatement.ebitda,
                  budg:    null,
                  color:   q.dreStatement.ebitda >= 0 ? "text-brand-700" : "text-red-700",
                  regime:  "caixa",
                },
                {
                  label:   "Receita Budget (Snapshot)",
                  value:   consolidated.budgetRevenue,
                  budg:    null,
                  color:   "text-amber-600",
                  regime:  "accrual snapshot",
                },
              ].map((row) => (
                <div key={row.label} className="bg-gray-50 rounded-xl p-3">
                  <div className={`text-base font-bold ${row.color}`}>
                    {row.value >= 0 ? "" : "−"}{fmtBRL(Math.abs(row.value))}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{row.label}</div>
                  <div className="text-[9px] text-gray-400 mt-0.5 uppercase tracking-wide">{row.regime}</div>
                  {row.budg !== null && (
                    <div className="text-[10px] mt-1 text-gray-400">
                      Budget:{" "}
                      <span className="text-amber-600 font-semibold">{fmtBRL(row.budg)}</span>
                      {" "}
                      <span className={`font-semibold ${row.value >= row.budg ? "text-emerald-600" : "text-red-600"}`}>
                        ({row.value >= row.budg ? "+" : ""}{row.budg > 0 ? ((row.value - row.budg) / row.budg * 100).toFixed(1) + "%" : "—"})
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {q.dfcStatement.pendente > 0 && (
              <p className="text-[10px] text-amber-600 mt-2 flex items-center gap-1">
                <AlertTriangle size={10} />
                {fmtBRL(q.dfcStatement.pendente)} pendente de classificação — não incluído no FCO acima.
              </p>
            )}
          </div>
        )}
        {!q.hasData && (
          <div className="card p-5 border border-dashed border-gray-200">
            <p className="text-xs text-gray-400 flex items-center gap-2">
              <Zap size={13} className="text-gray-300" />
              Comparativo Caixa Real vs Orçamento disponível após ingerir extratos bancários em{" "}
              <a href="/awq/ingest" className="underline text-brand-500">/awq/ingest</a>.
            </p>
          </div>
        )}

        {/* ── Contas a Receber ──────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <Inbox size={15} className="text-emerald-500" />
            Contas a Receber
          </h2>
          <p className="text-[11px] text-gray-400 mb-4">
            Compromissos a receber (previsto, faturado, atrasado).
            Não entram no DFC realizado até marcados como <code className="bg-gray-100 px-1 rounded">recebido</code> com vínculo à transação bancária.
          </p>
          {receivables.length === 0 ? (
            <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/30 p-6 text-center">
              <Inbox size={20} className="text-emerald-300 mx-auto mb-2" />
              <p className="text-xs text-emerald-600 font-medium">Nenhuma conta a receber registrada</p>
              <p className="text-[10px] text-emerald-500 mt-1">
                Use a API <code className="bg-emerald-100 px-1 rounded">PATCH /api/transactions/[id]</code> ou futura UI de AR para cadastrar.
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">Cliente</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">Projeto</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">BU</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">Vencimento</th>
                    <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-gray-500">Valor</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">Status</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">DFC/DRE</th>
                  </tr>
                </thead>
                <tbody>
                  {receivables.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                      <td className="py-1.5 px-2 font-medium text-gray-800">{r.client}</td>
                      <td className="py-1.5 px-2 text-gray-500">{r.contractProject ?? "—"}</td>
                      <td className="py-1.5 px-2 text-gray-500">{r.entity}</td>
                      <td className="py-1.5 px-2 text-gray-500">{r.dueDate}</td>
                      <td className="py-1.5 px-2 text-right font-semibold text-emerald-700">+{fmtBRL(r.amount)}</td>
                      <td className="py-1.5 px-2">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                          r.status === "recebido"  ? "bg-emerald-100 text-emerald-700" :
                          r.status === "atrasado"  ? "bg-red-100 text-red-700"         :
                          r.status === "faturado"  ? "bg-brand-100 text-brand-700"     :
                          r.status === "cancelado" ? "bg-gray-100 text-gray-500"       :
                                                     "bg-amber-100 text-amber-700"
                        }`}>{r.status}</span>
                      </td>
                      <td className="py-1.5 px-2 text-gray-400 text-[10px]">
                        {r.cashflowClass ?? "—"} · {r.dreEffect ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Contas a Pagar ────────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <Send size={15} className="text-red-500" />
            Contas a Pagar
          </h2>
          <p className="text-[11px] text-gray-400 mb-4">
            Compromissos a pagar (aberto, atrasado).
            Não entram no DFC realizado até marcados como <code className="bg-gray-100 px-1 rounded">pago</code> com vínculo à transação bancária.
          </p>
          {payables.length === 0 ? (
            <div className="rounded-xl border border-dashed border-red-200 bg-red-50/20 p-6 text-center">
              <Send size={20} className="text-red-200 mx-auto mb-2" />
              <p className="text-xs text-red-500 font-medium">Nenhuma conta a pagar registrada</p>
              <p className="text-[10px] text-red-400 mt-1">
                Use a API <code className="bg-red-50 px-1 rounded">POST /api/payables</code> (a implementar) para cadastrar compromissos futuros.
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">Fornecedor</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">BU</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">Categoria</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">Vencimento</th>
                    <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-gray-500">Valor</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">Status</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">DFC/DRE</th>
                  </tr>
                </thead>
                <tbody>
                  {payables.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                      <td className="py-1.5 px-2 font-medium text-gray-800">{p.supplier}</td>
                      <td className="py-1.5 px-2 text-gray-500">{p.entity}</td>
                      <td className="py-1.5 px-2 text-gray-500">{p.managerialCategory}</td>
                      <td className="py-1.5 px-2 text-gray-500">{p.dueDate}</td>
                      <td className="py-1.5 px-2 text-right font-semibold text-red-700">−{fmtBRL(p.amount)}</td>
                      <td className="py-1.5 px-2">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                          p.status === "pago"      ? "bg-emerald-100 text-emerald-700" :
                          p.status === "atrasado"  ? "bg-red-100 text-red-700"         :
                          p.status === "cancelado" ? "bg-gray-100 text-gray-500"       :
                                                     "bg-amber-100 text-amber-700"
                        }`}>{p.status}</span>
                      </td>
                      <td className="py-1.5 px-2 text-gray-400 text-[10px]">
                        {p.cashflowClass ?? "—"} · {p.dreEffect ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
