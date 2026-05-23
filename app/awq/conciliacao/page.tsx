// ─── /awq/conciliacao — Conciliação Bancária (hub unificado) ─────────────────
// CAMADA: corporate-treasury (ERP AWQ)
// SCOPE:  Hub único de conciliação — revisão de transações importadas + verificação manual.
//
// SEÇÕES:
//   1. KPIs de progresso (cálculo a partir da base canônica)
//   2. BankReconciliationBoard — layout lado a lado banco vs. sistema (estilo Conta Azul)
//   3. Impacto da Conciliação  — links para DFC, DRE e KPIs
//
// PERSISTÊNCIA:
//   SSR/Vercel → PATCH /api/transactions/[id] → transactions.json ou Postgres
//   GitHub Pages → edições salvas no localStorage do navegador

import Link from "next/link";
import Header from "@/components/Header";
import BankReconciliationBoard from "@/components/BankReconciliationBoard";
import CoraStatusPanel from "@/components/CoraStatusPanel";
import { getAllTransactions, getAllDocuments, type BankTransaction, type FinancialDocument } from "@/lib/financial-db";
import { getAllAR, initAPARDB } from "@/lib/ap-ar-db";
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  LineChart,
  Zap,
} from "lucide-react";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "auto" : "force-dynamic";

const IS_STATIC       = process.env.NEXT_PUBLIC_STATIC_DATA === "1";
const CORA_CONFIGURED = !!(
  process.env.CORA_CLIENT_ID &&
  process.env.CORA_CERT &&
  process.env.CORA_KEY
);


export default async function ConciliacaoPage() {
  let transactions: BankTransaction[] = [];
  let documents:    FinancialDocument[] = [];
  let loadError: string | null = null;

  // Expected AR receipts (EPM system — separate from bank_transactions)
  let arPending: { id: string; customer_name: string; net_amount: number; due_date: string; account_code?: string }[] = [];
  try {
    await initAPARDB();
    const arItems = await getAllAR();
    const horizon = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    arPending = arItems
      .filter((i) => (i.status === "PENDING" || i.status === "PARTIAL") && i.due_date <= horizon)
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .slice(0, 8)
      .map((i) => ({
        id: i.id,
        customer_name: i.customer_name,
        net_amount: i.status === "PARTIAL" ? i.net_amount - (i.received_amount ?? 0) : i.net_amount,
        due_date: i.due_date,
        account_code: i.account_code,
      }));
  } catch { /* AR EPM unavailable — show empty state */ }

  try {
    [transactions, documents] = await Promise.all([
      getAllTransactions(),
      getAllDocuments(),
    ]);
  } catch (err) {
    console.error("[ConciliacaoPage] DB load error:", err);
    loadError = err instanceof Error ? err.message : "Erro ao carregar dados do banco";
  }

  const conciliado = transactions.filter((t) => t.reconciliationStatus === "conciliado").length;
  const total      = transactions.length;
  const pct        = total > 0 ? Math.round((conciliado / total) * 100) : 0;
  const docsDone   = documents.filter((d) => d.status === "done").length;

  return (
    <>
      <Header
        title="Conciliação"
        subtitle="Hub unificado — revisão de transações importadas e verificação manual. DFC, DRE e KPIs recalculam automaticamente."
      />
      <div className="p-6 space-y-8">

        {/* ── Erro temporário de carregamento ── */}
        {loadError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Falha ao carregar dados — recarregando automaticamente</p>
              <p className="text-[11px] text-amber-700 mt-0.5 font-mono">{loadError}</p>
            </div>
          </div>
        )}

        {/* ── Painel principal de conciliação ── */}
        <section className="space-y-4">

          {/* Progress bar + extrato count */}
          {total > 0 && (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-[260px]">
                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-semibold text-emerald-700 whitespace-nowrap">
                  {pct}% conciliado
                </span>
                <span className="text-xs text-gray-400">
                  {conciliado}/{total}
                </span>
              </div>
              {docsDone > 0 && (
                <span className="text-xs text-gray-400">
                  {docsDone} extrato{docsDone > 1 ? "s" : ""} · {total} transações
                </span>
              )}
            </div>
          )}

          {/* Painel Cora */}
          {CORA_CONFIGURED && (
            <CoraStatusPanel transactions={transactions} />
          )}

          {/* Painel de conciliação — layout Conta Azul */}
          <BankReconciliationBoard
            initialTransactions={transactions}
            isStatic={IS_STATIC}
            coraConfigured={CORA_CONFIGURED}
          />
        </section>

        {/* ── AR: Recebimentos Esperados (pipeline EPM) ── */}
        {arPending.length > 0 && (
          <section className="rounded-xl border border-brand-200 bg-brand-50 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-brand-900">Recebimentos Esperados (AR)</h3>
                <p className="text-[11px] text-brand-700 mt-0.5">
                  Faturas pendentes no EPM — associe ao crédito bancário correspondente
                </p>
              </div>
              <Link href="/awq/epm/ar/cadastro" className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                Cadastro AR <ArrowUpRight size={11} />
              </Link>
            </div>
            <div className="grid gap-1.5">
              {arPending.map((item) => {
                const today = new Date().toISOString().slice(0, 10);
                const overdue = item.due_date < today;
                const [y, m, d] = item.due_date.split("-");
                return (
                  <div key={item.id}
                    className={`flex items-center justify-between text-xs rounded-lg px-3 py-2 ${overdue ? "bg-red-50 border border-red-200" : "bg-white border border-brand-100"}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <CheckCircle2 size={11} className={overdue ? "text-red-500 shrink-0" : "text-brand-400 shrink-0"} />
                      <span className="font-medium text-gray-700 truncate">{item.customer_name}</span>
                      {item.account_code && (
                        <span className="text-[9px] font-mono text-gray-400 hidden sm:inline">{item.account_code}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`tabular-nums font-semibold ${overdue ? "text-red-700" : "text-emerald-700"}`}>
                        {item.net_amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                      <span className={`text-[10px] ${overdue ? "text-red-500 font-semibold" : "text-gray-400"}`}>
                        {`${d}/${m}/${y}`}{overdue ? " ⚠ vencido" : ""}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-brand-600">
              Ao receber o crédito bancário, registre em{" "}
              <Link href="/awq/epm/ar" className="underline">AR Lançamentos</Link>
              {" "}para atualizar DFC, DRE e Balanço automaticamente.
            </p>
          </section>
        )}

        {/* ── Seção 2: Impacto da Conciliação ── */}
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
              <LineChart size={17} className="text-brand-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Impacto da Conciliação</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {IS_STATIC
                  ? "Edições salvas localmente. Para ver impacto em DFC/DRE, navegue pelas páginas abaixo."
                  : "Cada edição salva recalcula automaticamente DFC, DRE e KPIs (mesma fonte canônica)."
                }
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
            {[
              { href: "/awq/ap",        icon: Clipboard,     label: "Contas a Pagar (AP)", sub: "/awq/ap"        },
              { href: "/awq/cashflow",  icon: Zap,           label: "DFC — Fluxo de Caixa",  sub: "/awq/cashflow"  },
              { href: "/awq/financial", icon: LineChart,      label: "DRE — Financeiro",       sub: "/awq/financial" },
              { href: "/awq/kpis",      icon: BarChart3,      label: "KPIs Consolidados",      sub: "/awq/kpis"      },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-lg border border-gray-200 hover:border-brand-300 hover:bg-brand-50 px-4 py-3 transition-colors"
              >
                <item.icon size={16} className="text-brand-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-900">{item.label}</div>
                  <div className="text-[10px] text-gray-500">{item.sub}</div>
                </div>
                <ExternalLink size={13} className="text-gray-400 group-hover:text-brand-600" />
              </Link>
            ))}
          </div>
        </section>

      </div>
    </>
  );
}
