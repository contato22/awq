import { regionData } from "@/lib/data";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

const flagEmoji: Record<string, string> = {
  "North America": "🌎",
  "Europe": "🌍",
  "Asia Pacific": "🌏",
  "Middle East & Africa": "🌍",
  "Latin America": "🌎",
};

export default function RegionTable() {
  if (regionData.length === 0) {
    return (
      <div className="card p-6">
        <div className="mb-5">
          <h2 className="text-sm font-semibold text-gray-900">Regional Performance</h2>
          <p className="text-xs text-gray-500 mt-0.5">Revenue by geography</p>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mb-3 opacity-30"><circle cx="12" cy="12" r="9" strokeWidth={1.5} /><path strokeLinecap="round" strokeWidth={1.5} d="M12 3a9 9 0 010 18M12 3a9 9 0 000 18M3 12h18" /></svg>
          <p className="text-sm font-medium">Sem dados disponíveis</p>
          <p className="text-xs mt-1 opacity-70">Nenhum dado regional registrado</p>
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...regionData.map((r) => r.revenue));

  return (
    <div className="card p-6">
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-gray-900">Regional Performance</h2>
        <p className="text-xs text-gray-500 mt-0.5">Revenue by geography</p>
      </div>

      <div className="space-y-3">
        {regionData.map((region) => {
          const pct = (region.revenue / maxRevenue) * 100;
          return (
            <div key={region.region} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span>{flagEmoji[region.region]}</span>
                  <span className="font-medium">{region.region}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-right">
                  <span className="text-gray-400 tabular-nums">
                    {formatNumber(region.customers)} customers
                  </span>
                  <span className="font-semibold text-gray-900 tabular-nums w-16">
                    {formatCurrency(region.revenue, "USD", true)}
                  </span>
                  <div className="flex items-center gap-1 text-emerald-600 w-12 justify-end">
                    <TrendingUp size={11} />
                    <span className="font-semibold">{region.growth}%</span>
                  </div>
                </div>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-600 to-brand-400 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
