import Header from "@/components/Header";
import AwqDataBanner from "@/components/AwqDataBanner";
import AwqEmptyState from "@/components/AwqEmptyState";
import { consolidated } from "@/lib/awq-group-data";

export default function AwqBudgetPage() {
  const hasData = consolidated.revenue > 0 && consolidated.budgetRevenue > 0;

  return (
    <>
      <Header
        title="Budget — AWQ Group"
        subtitle="Budget vs Actual consolidado por BU"
      />
      <AwqDataBanner />
      <div className="px-8 py-6 space-y-6">
        <div className="card p-5">
          {!hasData ? (
            <AwqEmptyState
              title="Budget vs Actual nao disponivel"
              message="Os dados de budget e realizacao das BUs ainda nao foram internalizados. Aguardando integracao com fonte financeira confiavel para comparacao budget vs actual."
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
