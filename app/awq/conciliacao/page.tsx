import Link from "next/link";
import Header from "@/components/Header";
import ReconciliationReviewTable from "@/components/ReconciliationReviewTable";
import { getAllTransactions } from "@/lib/financial-db";
import { BarChart3, ExternalLink, LineChart, Zap } from "lucide-react";

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";

export default async function ConciliacaoPage() {
  const transactions = await getAllTransactions();

  return (
    <>
      <Header
        title="Conciliação"
        subtitle="Importe extratos bancários e concilie transação a transação. DFC, DRE e KPIs refletem automaticamente."
      />
      <div className="p-6 space-y-8">

        {/* Tabela interativa — KPIs, filtros, importação e edição em linha */}
        <ReconciliationReviewTable
          initialTransactions={transactions}
          isStatic={IS_STATIC}
        />

        {/* Impacto da Conciliação */}
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <LineChart size={17} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Impacto da Conciliação</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {IS_STATIC
                  ? "Edições salvas localmente. Navegue pelos módulos para ver o impacto."
                  : "Cada edição recalcula automaticamente DFC, DRE e KPIs (mesma fonte canônica)."
                }
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { href: "/awq/cashflow",  icon: Zap,       label: "DFC — Fluxo de Caixa",  sub: "/awq/cashflow"  },
              { href: "/awq/financial", icon: LineChart,  label: "DRE — Financeiro",       sub: "/awq/financial" },
              { href: "/awq/kpis",      icon: BarChart3,  label: "KPIs Consolidados",      sub: "/awq/kpis"      },
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
        </section>

      </div>
    </>
  );
}
