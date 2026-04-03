// ─── /awq/financial — Visão de Caixa por BU ──────────────────────────────────
//
// DATA SOURCE: financial-db.ts (canonical pipeline store) via financial-query.ts
// METHODOLOGY: Cash-basis — receipts and disbursements from ingested bank statements.
//              NOT an accrual P&L. Labels accordingly throughout.
//
// When hasData === false: renders honest "Aguardando extratos" state.
// Snapshot from awq-group-data.ts is NOT used here.

import Header from "@/components/Header";
import Link from "next/link";
import {
  DollarSign, TrendingUp, BarChart3, ArrowUpRight, ArrowDownRight,
  Database, AlertTriangle, GitMerge, ChevronRight,
} from "lucide-react";
import {
  buildFinancialQuery,
  fmtBRL,
  ENTITY_LABELS,
  CATEGORY_LABELS,
  type EntitySummary,
  type FinancialQueryResult,
} from "@/lib/financial-query";
// DataSourceBanner removed — page is fully on financial-query pipeline.

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(n: number, d: number) {
  if (d === 0) return "—";
  return ((n / d) * 100).toFixed(1) + "%";
}

function SnapshotNotice() {
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
      <AlertTriangle size={12} className="shrink-0" />
      <span>
        <strong>Visão de Caixa</strong> — dados nascidos dos extratos bancários ingeridos.
        P&L gerencial completo (DRE, accrual, margem por produto) requer camada contábil adicional.
      </span>
    </div>
  );
}

// ─── Cash P&L for a single entity ─────────────────────────────────────────────

function EntityCashPL({ e, totalRevenue }: { e: EntitySummary; totalRevenue: number }) {
  const share = totalRevenue > 0 ? (e.operationalRevenue / totalRevenue) * 100 : 0;
  const netPositive = e.operationalNetCash >= 0;

  return (
    <div className="card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-gray-900">{e.label}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">
            {e.accounts.map((a) => `${a.bank} · ${a.accountName}`).join(" | ")}
          </div>
        </div>
        <div className={`text-lg font-bold tabular-nums ${netPositive ? "text-emerald-600" : "text-red-600"}`}>
          {fmtBRL(e.operationalNetCash)}
        </div>
      </div>

      {/* Cash P&L lines */}
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between py-1.5 border-b border-gray-100">
          <span className="text-gray-500">Entradas operacionais</span>
          <span className="font-semibold text-emerald-600 tabular-nums">{fmtBRL(e.operationalRevenue)}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-gray-100">
          <span className="text-gray-500">Saídas operacionais</span>
          <span className="font-semibold text-red-600 tabular-nums">({fmtBRL(e.operationalExpenses)})</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-gray-200 bg-gray-50 px-2 rounded font-bold">
          <span className="text-gray-800">= Fluxo Líquido Operacional</span>
          <span className={`tabular-nums ${netPositive ? "text-emerald-700" : "text-red-700"}`}>
            {fmtBRL(e.operationalNetCash)}
          </span>
        </div>
        {e.partnerWithdrawals > 0 && (
          <div className="flex justify-between py-1 text-gray-400">
            <span>(-) Pró-labore / retirada</span>
            <span className="tabular-nums">({fmtBRL(e.partnerWithdrawals)})</span>
          </div>
        )}
        {e.personalExpenses > 0 && (
          <div className="flex justify-between py-1 text-orange-600">
            <span>(-) Despesa pessoal mista</span>
            <span className="tabular-nums">({fmtBRL(e.personalExpenses)})</span>
          </div>
        )}
        {e.intercompanyIn + e.intercompanyOut > 0 && (
          <div className="flex justify-between py-1 text-violet-600">
            <span>Intercompany (eliminado)</span>
            <span className="tabular-nums">
              ↑{fmtBRL(e.intercompanyIn)} / ↓{fmtBRL(e.intercompanyOut)}
            </span>
          </div>
        )}
      </div>

      {/* Coverage bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-gray-400">
          <span>Mix de entradas</span>
          <span>{share.toFixed(0)}% do total consolidado</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-brand-500 rounded-full" style={{ width: `${share}%` }} />
        </div>
      </div>

      {/* Confidence */}
      <div className="flex justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-100">
        <span>
          {e.confirmedCount}/{e.transactionCount} confirmados
          {e.ambiguousCount > 0 && (
            <span className="text-amber-600 ml-1">· {e.ambiguousCount} ambíguo</span>
          )}
        </span>
        <span>
          {e.periodStart && e.periodEnd
            ? `${e.periodStart.slice(0, 7)} → ${e.periodEnd.slice(0, 7)}`
            : "Período —"}
        </span>
      </div>
    </div>
  );
}

// ─── Expense breakdown table ──────────────────────────────────────────────────

function ExpenseBreakdown({ q }: { q: FinancialQueryResult }) {
  if (q.expensesByCategory.length === 0) return null;
  const total = q.expensesByCategory.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Despesas por Categoria — Base Bancária</h2>
        <span className="text-xs text-gray-500 tabular-nums">Total: {fmtBRL(total)}</span>
      </div>
      <div className="table-scroll">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Categoria</th>
              <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Entidade</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Txns</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Valor</th>
              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">% Total</th>
            </tr>
          </thead>
          <tbody>
            {q.expensesByCategory.map((row, i) => (
              <tr key={i} className={`border-b border-gray-100 hover:bg-gray-50 ${row.isAmbiguous ? "text-amber-700" : "text-gray-700"}`}>
                <td className="py-2 px-3">
                  {row.categoryLabel}
                  {row.isAmbiguous && <span className="ml-1 text-[10px] text-amber-500">(ambíguo)</span>}
                </td>
                <td className="py-2 px-3 text-gray-400">{ENTITY_LABELS[row.entity] ?? row.entity}</td>
                <td className="py-2 px-3 text-right text-gray-400">{row.transactionCount}</td>
                <td className="py-2 px-3 text-right font-semibold tabular-nums">{fmtBRL(row.amount)}</td>
                <td className="py-2 px-3 text-right text-gray-400">{pct(row.amount, total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Revenue by counterparty ──────────────────────────────────────────────────

function RevenueByCounterparty({ q }: { q: FinancialQueryResult }) {
  if (q.revenueByCounterparty.length === 0) return null;
  const total = q.revenueByCounterparty.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Entradas por Contraparte — Top 20</h2>
        <span className="text-xs text-gray-500 tabular-nums">Total: {fmtBRL(total)}</span>
      </div>
      <div className="space-y-2">
        {q.revenueByCounterparty.slice(0, 10).map((r, i) => {
          const share = total > 0 ? (r.amount / total) * 100 : 0;
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-bold text-gray-300 w-4">#{i + 1}</span>
                  <span className="text-xs text-gray-700 truncate">{r.counterparty}</span>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {ENTITY_LABELS[r.entity] ?? r.entity}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-[10px] text-gray-400">{r.transactionCount}x</span>
                  <span className="text-xs font-bold text-emerald-600 tabular-nums">{fmtBRL(r.amount)}</span>
                </div>
              </div>
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${share}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AwqFinancialPage() {
  const q          = buildFinancialQuery();

  const opEntities = q.entities.filter((e) =>
    ["AWQ_Holding", "JACQES", "Caza_Vision"].includes(e.entity)
  );

  const period = q.consolidated.periodStart && q.consolidated.periodEnd
    ? `${q.consolidated.periodStart.slice(0, 7)} → ${q.consolidated.periodEnd.slice(0, 7)}`
    : "Aguardando extratos";

  return (
    <>
      <Header
        title="Financial — AWQ Group"
        subtitle={`Visão de Caixa por Entidade · ${period}`}
      />
      <div className="page-container">

        <SnapshotNotice />

        {/* ── Consolidated summary cards ──────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Entradas Operacionais",
              value: fmtBRL(q.consolidated.totalRevenue),
              sub:   "receita_* confirmada",
              icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50",
              up: true,
            },
            {
              label: "Saídas Operacionais",
              value: fmtBRL(q.consolidated.totalExpenses),
              sub:   "excl. intercompany",
              icon: TrendingUp, color: "text-red-600", bg: "bg-red-50",
              up: false,
            },
            {
              label: "Fluxo Líquido",
              value: fmtBRL(q.consolidated.operationalNetCash),
              sub:   "Entradas − Saídas",
              icon: BarChart3, color: q.consolidated.operationalNetCash >= 0 ? "text-brand-600" : "text-red-600",
              bg: q.consolidated.operationalNetCash >= 0 ? "bg-brand-50" : "bg-red-50",
              up: q.consolidated.operationalNetCash >= 0,
            },
            {
              label: "Intercompany Eliminado",
              value: fmtBRL(q.consolidated.intercompanyEliminated),
              sub:   "não infla consolidado",
              icon: GitMerge, color: "text-violet-600", bg: "bg-violet-50",
              up: true,
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  {q.hasData ? (
                    <div className="text-2xl font-bold text-gray-900 tabular-nums">{card.value}</div>
                  ) : (
                    <div className="text-base font-medium text-gray-300 mt-1">—</div>
                  )}
                  <div className="text-xs font-medium text-gray-400 mt-0.5">{card.label}</div>
                  {q.hasData && (
                    <div className="flex items-center gap-1 mt-1">
                      {card.up
                        ? <ArrowUpRight size={11} className="text-emerald-600" />
                        : <ArrowDownRight size={11} className="text-red-600" />}
                      <span className={`text-[10px] font-semibold ${card.up ? "text-emerald-600" : "text-red-600"}`}>
                        {card.sub}
                      </span>
                    </div>
                  )}
                  {!q.hasData && (
                    <div className="text-[10px] text-gray-400 mt-1">Aguardando extratos</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Per-entity cash P&L ─────────────────────────────────────── */}
        {!q.hasData ? (
          <div className="card p-16 flex flex-col items-center gap-4 text-center">
            <Database size={40} className="text-gray-200" />
            <div className="text-sm font-semibold text-gray-400">Sem dados financeiros</div>
            <div className="text-xs text-gray-400 max-w-sm">
              Ingira extratos do Banco Cora (AWQ Holding / JACQES) e do Banco Itaú
              (Caza Vision) para ver a visão de caixa por entidade.
            </div>
            <Link
              href="/awq/ingest"
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              <Database size={14} /> Ingerir Extratos
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              {opEntities.map((e) => (
                <EntityCashPL
                  key={e.entity}
                  e={e}
                  totalRevenue={q.consolidated.totalRevenue}
                />
              ))}
            </div>
            {opEntities.length === 0 && (
              <div className="card p-8 text-center text-sm text-amber-700">
                Documentos processados mas sem entidades operacionais identificadas.
                Verifique os campos banco/conta na ingestão.
              </div>
            )}
          </>
        )}

        {/* ── Expense breakdown + Revenue by counterparty ─────────────── */}
        {q.hasData && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <ExpenseBreakdown q={q} />
            <RevenueByCounterparty q={q} />
          </div>
        )}

        {/* ── Coverage gaps ───────────────────────────────────────────── */}
        {q.hasData && q.dataQuality.coverageGaps.length > 0 && (
          <div className="card p-5 border-l-4 border-amber-400">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} className="text-amber-600" />
              <span className="text-xs font-semibold text-amber-800">Lacunas de cobertura</span>
            </div>
            <ul className="space-y-1">
              {q.dataQuality.coverageGaps.map((gap, i) => (
                <li key={i} className="text-xs text-amber-700 flex items-start gap-2">
                  <span className="mt-0.5 shrink-0">·</span>{gap}
                </li>
              ))}
            </ul>
            <div className="mt-3">
              <Link
                href="/awq/ingest"
                className="flex items-center gap-1 text-xs text-brand-600 hover:underline font-medium"
              >
                <ChevronRight size={11} /> Ingerir mais extratos
              </Link>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
