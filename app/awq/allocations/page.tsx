import Header from "@/components/Header";
import AwqDataBanner from "@/components/AwqDataBanner";
import AwqEmptyState from "@/components/AwqEmptyState";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  buData,
  consolidated,
  allocFlags,
  flagConfig,
} from "@/lib/awq-group-data";

export default function AwqAllocationsPage() {
  const hasData = consolidated.capitalAllocated > 0;

  return (
    <>
      <Header
        title="Allocations — AWQ Group"
        subtitle="Capital por BU · ROIC · Expand / Maintain / Review / Cut"
      />
      <AwqDataBanner />
      <div className="px-8 py-6 space-y-6">
        {!hasData ? (
          <div className="card p-5">
            <AwqEmptyState
              title="Alocacao de capital nao disponivel"
              message="Os dados de capital alocado, ROIC e payback das BUs ainda nao foram internalizados. Aguardando integracao com fonte financeira confiavel."
            />
          </div>
        ) : null}

        {/* ── BU Allocation Flags ──────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Status de Alocacao por BU</h2>
          <div className="space-y-2">
            {buData.map((bu) => {
              const flag = allocFlags[bu.id];
              const flagCfg = flagConfig[flag];
              return (
                <div key={bu.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-100 transition-colors border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${bu.color}`} />
                    <span className="text-xs text-gray-500">{bu.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${flagCfg.bg} ${flagCfg.color}`}>
                      {flagCfg.label}
                    </span>
                    <span className="text-xs text-gray-400">Sem dados financeiros</span>
                    <Link href={bu.hrefFinancial} className="text-[10px] text-brand-600 hover:text-brand-500 flex items-center gap-0.5 transition-colors">
                      <ChevronRight size={10} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
