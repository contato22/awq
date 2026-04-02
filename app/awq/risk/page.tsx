import Header from "@/components/Header";
import AwqDataBanner from "@/components/AwqDataBanner";
import AwqEmptyState from "@/components/AwqEmptyState";
import { riskSignals } from "@/lib/awq-group-data";

export default function AwqRiskPage() {
  const hasData = riskSignals.length > 0;

  return (
    <>
      <Header
        title="Risk — AWQ Group"
        subtitle="Risk signals · Concentracao · Recebiveis · Margem"
      />
      <AwqDataBanner />
      <div className="px-8 py-6 space-y-6">
        <div className="card p-5">
          {!hasData ? (
            <AwqEmptyState
              title="Sinais de risco nao disponiveis"
              message="Os risk signals do grupo ainda nao foram cadastrados com dados verificados. Este painel sera populado quando as metricas de risco estiverem integradas com fonte confiavel."
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
