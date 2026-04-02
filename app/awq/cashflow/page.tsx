import Header from "@/components/Header";
import AwqDataBanner from "@/components/AwqDataBanner";
import AwqEmptyState from "@/components/AwqEmptyState";
import { cashFlowRows } from "@/lib/awq-group-data";

export default function AwqCashflowPage() {
  const hasData = cashFlowRows.length > 0;

  return (
    <>
      <Header
        title="Cash Flow — AWQ Group"
        subtitle="Fluxo de caixa consolidado por BU"
      />
      <AwqDataBanner />
      <div className="px-8 py-6 space-y-6">
        <div className="card p-5">
          {!hasData ? (
            <AwqEmptyState
              title="Fluxo de caixa nao disponivel"
              message="Os dados de fluxo de caixa (FCO, FCF, variacao de caixa) ainda nao foram internalizados. Aguardando integracao com fonte contabil verificada."
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
