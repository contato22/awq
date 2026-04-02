import { regionData } from "@/lib/data";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { TrendingUp, Globe } from "lucide-react";

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
    <div className="card p-5 lg:p-6">
      <div className="mb-5">
        <div className="flex items-center gap-2.5">
          <Globe size={15} className="text-gray-400" />
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Regional Performance</h2>
            <p className="text-[11px] text-gray-500 mt-0.5 font-medium">Revenue by geography</p>
          </div>
        </div>
      </div>

      <div className="space-y-3.5">
        {regionData.map((region) => {
          const pct = (region.revenue / maxRevenue) * 100;
          return (
            <div key={region.region} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span>{flagEmoji[region.region]}</span>
                  <span className="font-medium">{region.region}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-right">
                  <span className="text-gray-400 tabular-nums hidden sm:inline">
                    {formatNumber(region.customers)} customers
                  </span>
                  <span className="font-semibold text-gray-900 tabular-nums w-16">
                    {formatCurrency(region.revenue, "USD", true)}
                  </span>
                  <div className="flex items-center gap-1 text-emerald-600 w-12 justify-end">
                    <TrendingUp size={11} />
                    <span className="font-semibold tabular-nums">{region.growth}%</span>
                  </div>
                </div>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-brand-400 rounded-full transition-all duration-500"
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
