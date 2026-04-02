import Header from "@/components/Header";
import AwqDataBanner from "@/components/AwqDataBanner";
import AwqEmptyState from "@/components/AwqEmptyState";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import {
  buData,
  operatingBus,
  consolidated,
  monthlyRevenue,
  DATA_VERIFIED,
} from "@/lib/awq-group-data";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AwqFinancialPage() {
  const hasData = consolidated.revenue > 0;

  return (
    <>
      <Header
        title="Financial — AWQ Group"
        subtitle="P&L consolidado por BU"
      />
      <AwqDataBanner />
      <div className="px-8 py-6 space-y-6">
        {!hasData ? (
          <div className="card p-5">
            <AwqEmptyState
              title="P&L consolidado nao disponivel"
              message="Os dados financeiros (DRE) das BUs ainda nao foram internalizados na plataforma AWQ. Este painel sera populado quando houver integracao com fonte contabil verificada."
            />
          </div>
        ) : null}

        {/* ── BU drill-down links ──────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">P&L por BU</div>
          {buData.map((bu) => (
            <Link
              key={bu.id}
              href={bu.hrefFinancial}
              className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-100 transition-colors group border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${bu.color}`} />
                <span className="text-xs text-gray-500 group-hover:text-gray-900 transition-colors">{bu.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400">Sem dados</span>
                <ChevronRight size={10} className="text-gray-400 group-hover:text-brand-600 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
