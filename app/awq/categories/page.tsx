// ─── /awq/categories — Matriz de Categorias Financeiras ─────────────────────
//
// Read-only audit view of the category registry (financial-classifier.ts).
// Shows every ManagerialCategory with its default DFC class, DRE effect,
// control flags (affects_dfc, affects_dre, requires_review, is_intercompany)
// and how many real transactions are assigned to each category.
//
// Category → DFC → DRE mapping is applied automatically at ingest time via
// deriveCashflowClass / deriveDREEffect. Manual overrides are done
// per-transaction in /awq/cashflow (ReconciliationReviewTable).

import Header from "@/components/Header";
import { AlertCircle, CheckCircle, MinusCircle } from "lucide-react";
import {
  CATEGORY_REGISTRY,
  type CategoryMeta,
} from "@/lib/financial-classifier";
import {
  buildFinancialQuery,
} from "@/lib/financial-query";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function CfcBadge({ cls }: { cls: CategoryMeta["default_cashflow_class"] }) {
  if (!cls) return <span className="text-[9px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded font-semibold">—</span>;
  const map: Record<string, string> = {
    operacional:   "bg-emerald-100 text-emerald-700",
    investimento:  "bg-violet-100 text-violet-700",
    financiamento: "bg-amber-100 text-amber-700",
    exclusao:      "bg-gray-100 text-gray-500",
  };
  return <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${map[cls] ?? "bg-gray-100 text-gray-600"}`}>{cls}</span>;
}

function DreBadge({ eff }: { eff: CategoryMeta["default_dre_effect"] }) {
  if (!eff) return <span className="text-[9px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded font-semibold">—</span>;
  const map: Record<string, string> = {
    receita:       "bg-emerald-100 text-emerald-700",
    custo:         "bg-red-100 text-red-700",
    opex:          "bg-orange-100 text-orange-700",
    financeiro:    "bg-violet-100 text-violet-700",
    imposto:       "bg-amber-100 text-amber-700",
    nao_aplicavel: "bg-gray-100 text-gray-500",
  };
  const labels: Record<string, string> = {
    receita:       "receita",
    custo:         "custo",
    opex:          "opex",
    financeiro:    "financeiro",
    imposto:       "imposto",
    nao_aplicavel: "n/a",
  };
  return <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${map[eff] ?? "bg-gray-100 text-gray-600"}`}>{labels[eff] ?? eff}</span>;
}

function Flag({ on, label }: { on: boolean; label: string }) {
  return on
    ? <span className="inline-flex items-center gap-0.5 text-[9px] bg-emerald-50 text-emerald-700 px-1 py-0.5 rounded"><CheckCircle size={8} />{label}</span>
    : <span className="inline-flex items-center gap-0.5 text-[9px] bg-gray-50 text-gray-400 px-1 py-0.5 rounded"><MinusCircle size={8} />{label}</span>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CategoriesPage() {
  const q = await buildFinancialQuery();

  // Build per-category transaction counts from real data
  const txCountByCategory = new Map<string, number>();
  if (q.hasData) {
    for (const line of q.dfcStatement.byCategory) {
      txCountByCategory.set(line.category, (txCountByCategory.get(line.category) ?? 0) + line.txCount);
    }
    for (const line of q.dreStatement.byCategory) {
      // dreByCategory may overlap with dfc (some categories have both)
      // Use max as proxy since categories are distinct in dreByCategory
      const existing = txCountByCategory.get(line.category) ?? 0;
      if (line.txCount > existing) txCountByCategory.set(line.category, line.txCount);
    }
    // Also count from expensesByCategory (wider coverage)
    for (const e of q.expensesByCategory) {
      const existing = txCountByCategory.get(e.category) ?? 0;
      if (e.transactionCount > existing) txCountByCategory.set(e.category, e.transactionCount);
    }
    for (const r of q.revenueByCounterparty) {
      const existing = txCountByCategory.get(r.category) ?? 0;
      txCountByCategory.set(r.category, existing + r.transactionCount);
    }
  }

  const ambiguous = CATEGORY_REGISTRY.filter((c) => c.requires_review);
  const operational = CATEGORY_REGISTRY.filter((c) => c.default_cashflow_class === "operacional");
  const intercompany = CATEGORY_REGISTRY.filter((c) => c.is_intercompany);
  const totalTxns = q.hasData ? q.dataQuality.totalTransactions : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Categorias Financeiras" subtitle="Matriz de categorias — mapeamento DFC / DRE" />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-16 space-y-6">

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">AWQ · Financeiro</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Matriz de Categorias Financeiras</h1>
          <p className="text-xs text-gray-500 mt-1">
            Registro auditável de todas as {CATEGORY_REGISTRY.length} categorias gerenciais —
            mapeamento DFC / DRE, flags de controle e contagem de transações reais.
            Alterações de categoria por transação: <a href="/awq/cashflow" className="underline text-brand-600">/awq/cashflow</a>.
          </p>
        </div>

        {/* ── Summary counters ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total de categorias",   value: CATEGORY_REGISTRY.length,       color: "text-gray-900",    bg: "bg-white"           },
            { label: "Afetam DFC",            value: CATEGORY_REGISTRY.filter((c) => c.affects_dfc).length,  color: "text-emerald-700", bg: "bg-emerald-50"      },
            { label: "Afetam DRE",            value: CATEGORY_REGISTRY.filter((c) => c.affects_dre).length,  color: "text-brand-700",   bg: "bg-brand-50"        },
            { label: "Revisão obrigatória",   value: ambiguous.length,               color: "text-amber-700",   bg: "bg-amber-50"        },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} border border-gray-100 rounded-xl p-4 text-center`}>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Full registry table ───────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Todas as Categorias</h2>
          <div className="table-scroll">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">Categoria</th>
                  <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">DFC padrão</th>
                  <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">DRE padrão</th>
                  <th className="text-left py-1.5 px-2 text-[10px] font-semibold text-gray-500">Flags</th>
                  <th className="text-right py-1.5 px-2 text-[10px] font-semibold text-gray-500">Txns</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORY_REGISTRY.map((cat) => {
                  const txns = txCountByCategory.get(cat.category_id) ?? 0;
                  return (
                    <tr key={cat.category_id} className={`border-b border-gray-100 hover:bg-gray-50/80 ${cat.requires_review ? "bg-amber-50/20" : ""}`}>
                      <td className="py-2 px-2">
                        <div className="font-medium text-gray-800">{cat.category_label}</div>
                        <div className="text-[9px] text-gray-400 font-mono mt-0.5">{cat.category_id}</div>
                      </td>
                      <td className="py-2 px-2"><CfcBadge cls={cat.default_cashflow_class} /></td>
                      <td className="py-2 px-2"><DreBadge eff={cat.default_dre_effect} /></td>
                      <td className="py-2 px-2">
                        <div className="flex flex-wrap gap-1">
                          <Flag on={cat.affects_dfc}        label="DFC"     />
                          <Flag on={cat.affects_dre}        label="DRE"     />
                          <Flag on={cat.requires_review}    label="revisão" />
                          <Flag on={cat.is_intercompany}    label="interco" />
                        </div>
                      </td>
                      <td className="py-2 px-2 text-right">
                        {txns > 0
                          ? <span className="text-brand-700 font-semibold">{txns}</span>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Nota sobre mapeamento ─────────────────────────────────────────── */}
        <div className="card p-5 border-l-4 border-amber-400">
          <div className="flex items-start gap-3">
            <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800 mb-1">Como o mapeamento funciona</p>
              <p className="text-xs text-gray-600">
                No ingest, cada transação recebe uma <code className="bg-gray-100 px-1 rounded">managerialCategory</code>.
                As funções <code className="bg-gray-100 px-1 rounded">deriveCashflowClass()</code> e{" "}
                <code className="bg-gray-100 px-1 rounded">deriveDREEffect()</code> convertem automaticamente
                essa categoria nos campos <code className="bg-gray-100 px-1 rounded">cashflowClass</code> e{" "}
                <code className="bg-gray-100 px-1 rounded">dreEffect</code> que alimentam a DFC e a DRE.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Para corrigir a classificação de uma transação específica (sem alterar valores bancários),
                use a{" "}
                <a href="/awq/cashflow" className="underline text-brand-600">
                  Fila de Revisão em /awq/cashflow
                </a>
                . A alteração propaga para DFC e DRE automaticamente.
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Arquivo fonte: <code className="bg-gray-100 px-1 rounded">lib/financial-classifier.ts</code> →{" "}
                <code className="bg-gray-100 px-1 rounded">CATEGORY_REGISTRY</code>
              </p>
            </div>
          </div>
        </div>

        {/* ── Transações sem dados ──────────────────────────────────────────── */}
        {!q.hasData && (
          <div className="card p-5 border border-amber-200 bg-amber-50/30">
            <p className="text-xs text-amber-700">
              Nenhum extrato ingerido — contagem de transações por categoria indisponível.
              As colunas DFC padrão e DRE padrão refletem o mapeamento teórico da matriz.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
