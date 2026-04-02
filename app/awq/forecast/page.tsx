import Header from "@/components/Header";
import AwqDataBanner from "@/components/AwqDataBanner";
import AwqEmptyState from "@/components/AwqEmptyState";
import { revenueForecasts } from "@/lib/awq-group-data";

export default function AwqForecastPage() {
  const hasData = revenueForecasts.length > 0;

  return (
    <>
      <Header
        title="Forecast — AWQ Group"
        subtitle="Receita · Cenarios base / bull / bear"
      />
      <AwqDataBanner />
      <div className="px-8 py-6 space-y-6">
        <div className="card p-5">
          {!hasData ? (
            <AwqEmptyState
              title="Forecast nao disponivel"
              message="Os cenarios de receita (base/bull/bear) ainda nao possuem dados verificados. O forecast sera habilitado quando houver integracao com fonte financeira confiavel."
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
