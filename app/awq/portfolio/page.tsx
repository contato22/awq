import Header from "@/components/Header";
import AwqDataBanner from "@/components/AwqDataBanner";
import AwqEmptyState from "@/components/AwqEmptyState";
import Link from "next/link";
import { Building2, ChevronRight } from "lucide-react";
import {
  buData,
  consolidated,
  allocFlags,
  flagConfig,
} from "@/lib/awq-group-data";

export default function AwqPortfolioPage() {
  const hasData = consolidated.capitalAllocated > 0;

  return (
    <>
      <Header
        title="Portfolio — AWQ Group"
        subtitle="Visao consolidada do grupo"
      />
      <AwqDataBanner />
      <div className="px-8 py-6 space-y-6">
        {!hasData ? (
          <div className="card p-5">
            <AwqEmptyState
              title="Portfolio nao disponivel"
              message="Os dados de capital, ROIC e lucro das BUs ainda nao foram internalizados. Aguardando integracao com fonte financeira confiavel."
            />
          </div>
        ) : null}

        {/* ── BU Cards (structure only) ──────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {buData.map((bu) => {
            const flag = allocFlags[bu.id];
            const flagCfg = flagConfig[flag];
            return (
              <div key={bu.id} className="card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${bu.color} flex items-center justify-center shrink-0`}>
                      <Building2 size={16} className="text-gray-900" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">{bu.name}</div>
                      <div className="text-[11px] text-gray-500">{bu.sub}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${flagCfg.bg} ${flagCfg.color}`}>
                    {flagCfg.label}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-3">Dados financeiros ainda nao disponiveis para esta BU.</p>
                <div className="flex items-center justify-end pt-2 border-t border-gray-200">
                  <Link
                    href={bu.hrefOverview}
                    className="text-[10px] text-brand-600 hover:text-brand-500 flex items-center gap-0.5 transition-colors"
                  >
                    Detalhes <ChevronRight size={10} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
