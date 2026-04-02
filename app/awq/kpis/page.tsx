import Header from "@/components/Header";
import AwqDataBanner from "@/components/AwqDataBanner";
import AwqEmptyState from "@/components/AwqEmptyState";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { buData, consolidated, DATA_VERIFIED } from "@/lib/awq-group-data";

export default function AwqKpisPage() {
  const hasData = consolidated.revenue > 0;

  return (
    <>
      <Header
        title="KPIs — AWQ Group"
        subtitle="Scorecard consolidado"
      />
      <AwqDataBanner />
      <div className="px-8 py-6 space-y-6">
        {!hasData ? (
          <div className="card p-5">
            <AwqEmptyState
              title="KPIs nao disponiveis"
              message="Os indicadores consolidados da AWQ ainda nao possuem dados verificados. Aguardando integracao com base financeira confiavel."
            />
          </div>
        ) : null}

        {/* ── BU Drill links ──────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Drill-Down por BU</h2>
          {buData.map((bu) => (
            <Link
              key={bu.id}
              href={bu.hrefOverview}
              className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-100 transition-colors group border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${bu.color}`} />
                <span className="text-xs text-gray-500 group-hover:text-gray-900 transition-colors">{bu.name}</span>
              </div>
              <ChevronRight size={10} className="text-gray-400 group-hover:text-brand-600 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
