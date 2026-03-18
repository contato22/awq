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

const maxRevenue = Math.max(...regionData.map((r) => r.revenue));

export default function RegionTable() {
  return (
    <div className="card p-6">
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-white">Regional Performance</h2>
        <p className="text-xs text-gray-500 mt-0.5">Revenue by geography</p>
      </div>

      <div className="space-y-3">
        {regionData.map((region) => {
          const pct = (region.revenue / maxRevenue) * 100;
          return (
            <div key={region.region} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <span>{flagEmoji[region.region]}</span>
                  <span className="font-medium">{region.region}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-right">
                  <span className="text-gray-400 tabular-nums">
                    {formatNumber(region.customers)} customers
                  </span>
                  <span className="font-semibold text-white tabular-nums w-16">
                    {formatCurrency(region.revenue, "USD", true)}
                  </span>
                  <div className="flex items-center gap-1 text-emerald-400 w-12 justify-end">
                    <TrendingUp size={11} />
                    <span className="font-semibold">{region.growth}%</span>
                  </div>
                </div>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
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
