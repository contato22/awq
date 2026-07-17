import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getBUData } from "@/lib/epm-planning-db";
import { WEALTH_METRIC_DEFINITIONS } from "@/lib/wealth-metrics";
import { MetricSourceBadge } from "@/components/MetricSourceBadge";

export const dynamic = process.env.STATIC_EXPORT === "1" ? "auto" : "force-dynamic";

export default async function BiReportsPage() {
  const buData = await getBUData();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq/bi" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Relatórios</h1>
            <p className="text-xs text-gray-500">BI · Relatórios</p>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-8">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-sm font-bold text-gray-900 tracking-tight">Indicadores de Wealth Management</h2>
            <MetricSourceBadge sourceType="empty" />
            <span className="ml-auto text-[11px] text-gray-400 font-medium">Framework · por BU</span>
          </div>
          <p className="text-[11px] text-gray-400 mb-5">
            Métricas do setor financeiro e de gestão de fortunas para medir tamanho, crescimento e
            saúde do negócio. Nenhuma BU possui dado de patrimônio de clientes ingerido ainda —
            exibidas como referência de framework.
          </p>

          {/* glossary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-5">
            {WEALTH_METRIC_DEFINITIONS.map((m) => (
              <div
                key={m.key}
                className="rounded-xl border border-gray-200/80 bg-gray-50/40 p-3.5"
              >
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  {m.label}
                </div>
                <div className="text-[11px] font-semibold text-gray-700 mb-1 leading-tight">
                  {m.fullName}
                </div>
                <div className="text-[11px] text-gray-400 leading-snug">
                  {m.description}
                </div>
              </div>
            ))}
          </div>

          {/* per-BU table — Advisor e AWQ Venture excluídos: pré-receita e veículo de
              investimento próprio, não BUs de wealth management de clientes */}
          <div className="overflow-x-auto -mx-1">
            <table className="w-full text-xs border-collapse min-w-[640px]">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-gray-400 text-left">
                  <th className="py-2 px-1 font-bold">BU</th>
                  {WEALTH_METRIC_DEFINITIONS.map((m) => (
                    <th key={m.key} className="py-2 px-1 font-bold text-right">{m.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {buData.filter((bu) => bu.id !== "advisor" && bu.id !== "venture").map((bu) => (
                  <tr key={bu.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-2.5 px-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${bu.color}`} />
                        <span className="font-semibold text-gray-800">{bu.name}</span>
                      </div>
                    </td>
                    {WEALTH_METRIC_DEFINITIONS.map((m) => (
                      <td key={m.key} className="py-2.5 px-1 text-right text-gray-300">—</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-[10px] text-gray-400">
            Ingira dados de carteira/patrimônio de clientes para popular estes indicadores por BU.
          </p>
        </div>
      </div>
    </div>
  );
}
