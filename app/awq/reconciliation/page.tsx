// ─── /awq/reconciliation — Conciliação Bancária Operacional ──────────────────
//
// Operational reconciliation interface over the canonical source of truth.
// Source: lib/financial-db.ts → getAllTransactions() (filesystem or Neon).
// NO parallel source. NO new JSON. NO new logic.
//
// Shows:
//   • Status counters (pendente / em_revisao / classificado / conciliado / total)
//   • ReconciliationReviewTable with ALL pending + em_revisao items (full queue)
//   • Full auditable transaction table (all statuses, sorted by date desc)
//   • DFC / DRE impact block with drill-down links

import Header from "@/components/Header";
import ReconciliationReviewTable, {
  type ReviewItem,
} from "@/components/ReconciliationReviewTable";
import { getAllTransactions } from "@/lib/financial-db";
import {
  buildFinancialQuery,
  CATEGORY_LABELS,
  ENTITY_LABELS,
} from "@/lib/financial-query";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileSearch,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function fmtDate(iso: string) {
  return iso.slice(0, 10).split("-").reverse().join("/");
}

const STATUS_LABELS: Record<string, string> = {
  pendente:     "Pendente",
  em_revisao:   "Em Revisão",
  classificado: "Classificado",
  conciliado:   "Conciliado",
  rejeitado:    "Rejeitado",
};

const STATUS_COLORS: Record<string, string> = {
  pendente:     "bg-amber-50 text-amber-700 border-amber-200",
  em_revisao:   "bg-violet-50 text-violet-700 border-violet-200",
  classificado: "bg-blue-50 text-blue-700 border-blue-200",
  conciliado:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejeitado:    "bg-red-50 text-red-700 border-red-200",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ReconciliationPage() {
  // ── Single source of truth ──────────────────────────────────────────────────
  const [q, allTxns] = await Promise.all([
    buildFinancialQuery(),
    getAllTransactions(),
  ]);

  // ── Status counts ───────────────────────────────────────────────────────────
  const counts = { pendente: 0, em_revisao: 0, classificado: 0, conciliado: 0, rejeitado: 0 };
  for (const t of allTxns) {
    const s = (t.reconciliationStatus ?? "pendente") as keyof typeof counts;
    if (s in counts) counts[s]++;
  }
  const needsAction = counts.pendente + counts.em_revisao;

  // ── ReviewItems: ALL pending + em_revisao (no top-10 cap) ──────────────────
  const reviewItems: ReviewItem[] = allTxns
    .filter((t) =>
      t.reconciliationStatus === "pendente" || t.reconciliationStatus === "em_revisao",
    )
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .map((t) => ({
      id:            t.id,
      date:          t.transactionDate,
      description:   t.descriptionOriginal,
      amount:        Math.abs(t.amount),
      direction:     t.direction,
      entityLabel:   ENTITY_LABELS[t.entity] ?? t.entity,
      categoryId:    t.managerialCategory,
      categoryLabel: CATEGORY_LABELS[t.managerialCategory] ?? t.managerialCategory,
      status:        t.reconciliationStatus,
      note:          t.classificationNote ?? null,
      cashflowClass: t.cashflowClass ?? null,
      dreEffect:     t.dreEffect ?? null,
    }));

  // ── All transactions sorted desc by date ────────────────────────────────────
  const sortedTxns = [...allTxns].sort(
    (a, b) => b.transactionDate.localeCompare(a.transactionDate),
  );

  const dfc = q.dfcStatement;
  const dre = q.dreStatement;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="Conciliação Bancária"
        subtitle="Fila operacional de conciliação — fonte única: lib/financial-db.ts"
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-16 space-y-6">

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">AWQ · Tesouraria</span>
            <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">
              source: financial-db.ts
            </span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Conciliação Bancária Operacional</h1>
          <p className="text-xs text-gray-500 mt-1">
            Interface operacional sobre as transações ingeridas.
            Use esta fila para classificar, revisar e conciliar cada lançamento.
            Alterações propagam automaticamente para{" "}
            <Link href="/awq/cashflow" className="underline text-brand-600">DFC</Link> e{" "}
            <Link href="/awq/financial" className="underline text-brand-600">DRE</Link>.
          </p>
        </div>

        {/* ── No-data banner ────────────────────────────────────────────────── */}
        {!q.hasData && (
          <div className="card p-5 border border-amber-200 bg-amber-50/40">
            <div className="flex items-start gap-3">
              <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-800 mb-0.5">
                  Nenhum extrato processado
                </p>
                <p className="text-xs text-gray-600">
                  Ingira extratos em{" "}
                  <Link href="/awq/ingest" className="underline text-brand-600">/awq/ingest</Link>{" "}
                  para popular a fila de conciliação.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Status counters ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(
            [
              { key: "pendente",     label: "Pendentes",     icon: Clock,       color: "text-amber-700",   bg: "bg-amber-50"   },
              { key: "em_revisao",   label: "Em Revisão",    icon: FileSearch,  color: "text-violet-700",  bg: "bg-violet-50"  },
              { key: "classificado", label: "Classificados", icon: CheckCircle2,color: "text-blue-700",    bg: "bg-blue-50"    },
              { key: "conciliado",   label: "Conciliados",   icon: ShieldCheck, color: "text-emerald-700", bg: "bg-emerald-50" },
              { key: "total",        label: "Total",         icon: null,        color: "text-gray-900",    bg: "bg-white"      },
            ] as const
          ).map(({ key, label, icon: Icon, color, bg }) => (
            <div
              key={key}
              className={`${bg} border border-gray-100 rounded-xl p-4 text-center`}
            >
              {Icon && <Icon size={14} className={`${color} mx-auto mb-1`} />}
              <div className={`text-2xl font-bold ${color}`}>
                {key === "total" ? allTxns.length : counts[key as keyof typeof counts]}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Action banner when queue is non-empty ─────────────────────────── */}
        {needsAction > 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-violet-50 border border-violet-200 px-4 py-3">
            <AlertCircle size={14} className="text-violet-600 shrink-0" />
            <p className="text-xs text-violet-800">
              <span className="font-semibold">{needsAction} transação(ões)</span> aguardam ação
              ({counts.pendente} pendentes + {counts.em_revisao} em revisão).
              Classifique abaixo para propagar para DFC / DRE.
            </p>
          </div>
        )}

        {/* ── ReconciliationReviewTable — full queue ─────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">
            Fila de Revisão
            {reviewItems.length > 0 && (
              <span className="ml-2 text-[10px] font-normal text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
                {reviewItems.length} itens
              </span>
            )}
          </h2>
          <p className="text-[10px] text-gray-400 mb-4">
            Todas as transações com status <em>pendente</em> ou <em>em_revisão</em>.
            Use os dropdowns para corrigir categoria, DFC e DRE. Salvar atualiza o registro
            via PATCH /api/transactions/[id].
          </p>
          <ReconciliationReviewTable items={reviewItems} />
        </div>

        {/* ── Full transactions audit table ─────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Todas as Transações
            <span className="ml-2 text-[10px] font-normal text-gray-400">({sortedTxns.length})</span>
          </h2>
          {sortedTxns.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-4 text-center">
              Nenhuma transação ingerida.
            </p>
          ) : (
            <div className="table-scroll">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500 whitespace-nowrap">Data</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">Descrição</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">Entidade</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">Categoria</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">DFC</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">DRE</th>
                    <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">Status</th>
                    <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-gray-500">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTxns.map((t) => {
                    const status = t.reconciliationStatus ?? "pendente";
                    return (
                      <tr
                        key={t.id}
                        className="border-b border-gray-100 hover:bg-gray-50/80"
                      >
                        <td className="py-1.5 px-2 text-gray-500 whitespace-nowrap font-mono text-[10px]">
                          {fmtDate(t.transactionDate)}
                        </td>
                        <td className="py-1.5 px-2 max-w-[200px]">
                          <div className="text-gray-800 truncate">{t.descriptionOriginal}</div>
                        </td>
                        <td className="py-1.5 px-2 text-gray-500 whitespace-nowrap text-[10px]">
                          {ENTITY_LABELS[t.entity] ?? t.entity}
                        </td>
                        <td className="py-1.5 px-2">
                          <div className="text-gray-700 text-[10px]">
                            {CATEGORY_LABELS[t.managerialCategory] ?? t.managerialCategory}
                          </div>
                          <div className="text-gray-300 font-mono text-[9px] mt-0.5">{t.managerialCategory}</div>
                        </td>
                        <td className="py-1.5 px-2">
                          {t.cashflowClass ? (
                            <span className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-semibold">
                              {t.cashflowClass}
                            </span>
                          ) : (
                            <span className="text-[9px] text-gray-300">—</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2">
                          {t.dreEffect ? (
                            <span className="text-[9px] bg-violet-50 text-violet-700 px-1.5 py-0.5 rounded font-semibold">
                              {t.dreEffect}
                            </span>
                          ) : (
                            <span className="text-[9px] text-gray-300">—</span>
                          )}
                        </td>
                        <td className="py-1.5 px-2">
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-semibold border ${STATUS_COLORS[status] ?? "bg-gray-50 text-gray-500 border-gray-200"}`}
                          >
                            {STATUS_LABELS[status] ?? status}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-right whitespace-nowrap font-mono font-semibold">
                          <span className={t.direction === "credit" ? "text-emerald-700" : "text-red-600"}>
                            {t.direction === "credit" ? "+" : "−"}{fmtBRL(Math.abs(t.amount))}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── DFC / DRE impact block ────────────────────────────────────────── */}
        {q.hasData && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Impacto nas Demonstrações</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* DFC summary */}
              <div className="rounded-lg bg-emerald-50/60 border border-emerald-100 p-4 space-y-2">
                <div className="text-xs font-semibold text-emerald-800 mb-2">DFC — Fluxo de Caixa</div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">FCO Operacional</span>
                  <span className="font-semibold text-emerald-700">{fmtBRL(dfc.operacional.liquido)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">FCInv Investimento</span>
                  <span className="font-semibold text-violet-700">{fmtBRL(dfc.investimento.liquido)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">FCFin Financiamento</span>
                  <span className="font-semibold text-amber-700">{fmtBRL(dfc.financiamento.liquido)}</span>
                </div>
                <div className="border-t border-emerald-200 pt-2 flex justify-between text-xs font-bold">
                  <span className="text-gray-700">Variação de Caixa</span>
                  <span className={dfc.variacaoCaixa >= 0 ? "text-emerald-700" : "text-red-600"}>
                    {fmtBRL(dfc.variacaoCaixa)}
                  </span>
                </div>
                {dfc.pendente > 0 && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    {fmtBRL(dfc.pendente)} não classificados (pendentes)
                  </p>
                )}
                <Link
                  href="/awq/cashflow"
                  className="inline-flex items-center gap-1 text-[10px] text-emerald-700 hover:underline mt-1"
                >
                  Ver DFC detalhado <ArrowRight size={10} />
                </Link>
              </div>

              {/* DRE summary */}
              <div className="rounded-lg bg-violet-50/60 border border-violet-100 p-4 space-y-2">
                <div className="text-xs font-semibold text-violet-800 mb-2">DRE — Resultado Gerencial</div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Receita Bruta</span>
                  <span className="font-semibold text-emerald-700">{fmtBRL(dre.receita)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Custos</span>
                  <span className="font-semibold text-red-600">{fmtBRL(dre.custo)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Opex</span>
                  <span className="font-semibold text-orange-600">{fmtBRL(dre.opex)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">EBITDA</span>
                  <span className={`font-semibold ${dre.ebitda >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {fmtBRL(dre.ebitda)}
                  </span>
                </div>
                {dre.pendente > 0 && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    {fmtBRL(dre.pendente)} não classificados (pendentes)
                  </p>
                )}
                <Link
                  href="/awq/financial"
                  className="inline-flex items-center gap-1 text-[10px] text-violet-700 hover:underline mt-1"
                >
                  Ver DRE detalhada <ArrowRight size={10} />
                </Link>
              </div>
            </div>

            {/* Drill-down links */}
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/awq/cashflow" className="text-[10px] text-gray-500 hover:text-brand-600 hover:underline flex items-center gap-1">
                <ArrowRight size={9} /> DFC por categoria
              </Link>
              <Link href="/awq/kpis" className="text-[10px] text-gray-500 hover:text-brand-600 hover:underline flex items-center gap-1">
                <ArrowRight size={9} /> KPIs
              </Link>
              <Link href="/awq/categories" className="text-[10px] text-gray-500 hover:text-brand-600 hover:underline flex items-center gap-1">
                <ArrowRight size={9} /> Matriz de categorias
              </Link>
              <Link href="/awq/financial" className="text-[10px] text-gray-500 hover:text-brand-600 hover:underline flex items-center gap-1">
                <ArrowRight size={9} /> DRE gerencial
              </Link>
            </div>
          </div>
        )}

        {/* ── Source note ───────────────────────────────────────────────────── */}
        <div className="card p-4 border-l-4 border-gray-300 bg-white">
          <p className="text-[10px] text-gray-400">
            <span className="font-semibold text-gray-600">Fonte de dados:</span>{" "}
            <code className="bg-gray-100 px-1 rounded">lib/financial-db.ts</code> →{" "}
            <code className="bg-gray-100 px-1 rounded">getAllTransactions()</code>.
            Nenhum dado paralelo. Alterações persistidas via{" "}
            <code className="bg-gray-100 px-1 rounded">PATCH /api/transactions/[id]</code>.
          </p>
        </div>

      </main>
    </div>
  );
}
