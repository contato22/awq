// ─── /awq/reconciliation — Conciliação Bancária ────────────────────────────
// DATA SOURCE: financial-db.ts (canonical store, JSON or Postgres adapter).
// PURPOSE: Operational workspace for reviewing each ingested transaction and
//          confirming / fixing category, DFC class, DRE effect, note and status.
// PERSISTENCE:
//   SSR/Vercel → PATCH /api/transactions/[id] → transactions.json or Postgres
//   GitHub Pages → edits stored in localStorage (browser-persistent, no server)
// IMPACT: Saving propagates to /awq/cashflow (DFC), /awq/financial (DRE) and
//         /awq/kpis because those pages read from the same canonical store.
//
// NOTE: revalidate=0 is used instead of force-dynamic so this page is also
//       compatible with `output: "export"` (GitHub Pages static build).

import Link from "next/link";
import Header from "@/components/Header";
import {
  CheckCircle2,
  AlertCircle,
  ClipboardList,
  Zap,
  LineChart,
  BarChart3,
  ExternalLink,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  HardDrive,
} from "lucide-react";
import { getAllTransactions, getAllDocuments } from "@/lib/financial-db";
import ReconciliationReviewTable from "@/components/ReconciliationReviewTable";

// revalidate = 0 → SSR: re-render on every request (no stale cache).
// Static export (GitHub Pages): rendered once at build time with current data — correct.
export const revalidate = 0;

// Detected at build time from NEXT_PUBLIC_STATIC_DATA (set by next.config.js).
const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
        <Icon size={18} className={color} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</div>
        <div className="text-2xl font-bold text-gray-900 mt-0.5">{value}</div>
        <div className="text-[11px] text-gray-500 mt-0.5">{sub}</div>
      </div>
    </div>
  );
}

export default async function AwqReconciliationPage() {
  const [transactions, documents] = await Promise.all([
    getAllTransactions(),
    getAllDocuments(),
  ]);

  const counts = {
    total:      transactions.length,
    pendente:   transactions.filter((t) => t.reconciliationStatus === "pendente").length,
    em_revisao: transactions.filter((t) => t.reconciliationStatus === "em_revisao").length,
    conciliado: transactions.filter((t) => t.reconciliationStatus === "conciliado").length,
    descartado: transactions.filter((t) => t.reconciliationStatus === "descartado").length,
  };

  const pctConciliado = counts.total > 0 ? Math.round((counts.conciliado / counts.total) * 100) : 0;
  const queueSize = counts.pendente + counts.em_revisao;
  const docsDone = documents.filter((d) => d.status === "done").length;

  const pendingCredits = transactions
    .filter((t) => t.reconciliationStatus !== "conciliado" && t.direction === "credit")
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const pendingDebits = transactions
    .filter((t) => t.reconciliationStatus !== "conciliado" && t.direction === "debit")
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <>
      <Header
        title="Conciliação Bancária"
        subtitle="Revise, corrija e concilie cada transação. DFC, DRE e KPIs recalculam automaticamente."
      />
      <div className="p-6 space-y-6">

        {/* ─── GitHub Pages mode banner ─────────────────────────────────── */}
        {IS_STATIC && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <HardDrive size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 space-y-1">
                <p className="font-semibold">Modo GitHub Pages — persistência local</p>
                <p>
                  Edições feitas aqui são salvas no <strong>localStorage do seu navegador</strong> (sem servidor).
                  As transações abaixo são os dados do último deploy. Adicione transações manuais em{" "}
                  <Link href="/awq/ingest" className="underline font-medium">Integração Bancária</Link>.
                  Para persistência permanente, use o ambiente Vercel/SSR.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─── Empty state ─────────────────────────────────────────────── */}
        {counts.total === 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Nenhuma transação para conciliar</p>
                <p className="text-xs text-amber-700 mt-1">
                  {IS_STATIC
                    ? <>Use <Link href="/awq/ingest" className="underline font-medium">Integração Bancária</Link> para adicionar transações manualmente. Elas aparecerão aqui automaticamente.</>
                    : <>Ingira extratos bancários via <Link href="/awq/ingest" className="underline font-medium">/awq/ingest</Link> para começar.</>
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─── KPIs de conciliação ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Fila de Conciliação"
            value={queueSize}
            sub={`${counts.pendente} pendentes · ${counts.em_revisao} em revisão`}
            icon={ClipboardList}
            color="text-amber-600"
            bg="bg-amber-50"
          />
          <KpiCard
            label="Conciliadas"
            value={`${counts.conciliado} (${pctConciliado}%)`}
            sub={`de ${counts.total} transações totais`}
            icon={CheckCircle2}
            color="text-emerald-600"
            bg="bg-emerald-50"
          />
          <KpiCard
            label="Entradas Pendentes"
            value={fmt(pendingCredits)}
            sub="Créditos aguardando conciliação"
            icon={ArrowUpRight}
            color="text-emerald-600"
            bg="bg-emerald-50"
          />
          <KpiCard
            label="Saídas Pendentes"
            value={fmt(pendingDebits)}
            sub="Débitos aguardando conciliação"
            icon={ArrowDownRight}
            color="text-rose-600"
            bg="bg-rose-50"
          />
        </div>

        {/* ─── Impacto da Conciliação ──────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <LineChart size={17} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Impacto da Conciliação</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {IS_STATIC
                  ? "Edições salvas localmente. Para ver impacto em DFC/DRE, navegue pelas páginas abaixo — elas usam os dados do deploy atual."
                  : "Cada edição salva recalcula automaticamente DFC, DRE e KPIs (mesma fonte canônica)."
                }
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            {[
              { href: "/awq/cashflow",  icon: Zap,       label: "DFC — Fluxo de Caixa",   sub: "/awq/cashflow"  },
              { href: "/awq/financial", icon: LineChart,  label: "DRE — Financeiro",        sub: "/awq/financial" },
              { href: "/awq/kpis",      icon: BarChart3,  label: "KPIs Consolidados",       sub: "/awq/kpis"      },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 px-4 py-3 transition-colors"
              >
                <item.icon size={16} className="text-indigo-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-900">{item.label}</div>
                  <div className="text-[10px] text-gray-500">{item.sub}</div>
                </div>
                <ExternalLink size={13} className="text-gray-400 group-hover:text-indigo-600" />
              </Link>
            ))}
          </div>
        </div>

        {/* ─── Documents summary ───────────────────────────────────────── */}
        {docsDone > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <FileText size={13} />
            <span>
              {docsDone} extrato(s) processado(s) · {counts.total} transações extraídas
              {IS_STATIC && " · Transações manuais adicionadas via localStorage aparecem na tabela abaixo"}
            </span>
          </div>
        )}

        {/* ─── Interactive table ───────────────────────────────────────── */}
        {/* Rendered even when total=0 in static mode (user may have localStorage data) */}
        <ReconciliationReviewTable
          initialTransactions={transactions}
          isStatic={IS_STATIC}
        />

        {/* ─── Rules footer ────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
          <p className="text-[11px] text-gray-500">
            <span className="font-semibold text-gray-700">Campos protegidos</span> — valor, data, descrição
            original, documentId, conta e BU não podem ser alterados. Editáveis: categoria, nota,
            status de conciliação, flags de consolidado/intercompany.
            {IS_STATIC
              ? " Neste ambiente, edições são salvas no localStorage do navegador."
              : " Alterações persistidas na fonte canônica que alimenta DFC/DRE/KPIs."
            }
          </p>
        </div>

      </div>
    </>
  );
}
