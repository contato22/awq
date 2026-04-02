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
    <div className="card-elevated">
      <div className="px-6 pt-5 pb-4">
        <h2 className="section-title">Regional Performance</h2>
        <p className="section-subtitle">Revenue by geography</p>
      </div>

      <div className="px-6 pb-5 space-y-4">
        {regionData.map((region) => {
          const pct = (region.revenue / maxRevenue) * 100;
          return (
            <div key={region.region} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-sm text-slate-700">
                  <span className="text-base">{flagEmoji[region.region]}</span>
                  <span className="font-semibold">{region.region}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-right">
                  <span className="text-gray-500 tabular-nums">
                    {formatNumber(region.customers)} customers
                  </span>
                  <span className="font-bold text-slate-800 tabular-nums w-16">
                    {formatCurrency(region.revenue, "USD", true)}
                  </span>
                  <div className="flex items-center gap-1 text-emerald-600 w-14 justify-end">
                    <TrendingUp size={11} />
                    <span className="font-bold">{region.growth}%</span>
                  </div>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-slate-700 to-slate-500 rounded-full transition-all"
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
