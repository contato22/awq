import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { topProducts } from "@/lib/data";
import { formatCurrency, formatNumber } from "@/lib/utils";

const statusConfig = {
  trending: { label: "Trending", classes: "badge-green" },
  stable: { label: "Stable", classes: "badge-blue" },
  declining: { label: "Declining", classes: "badge-red" },
};

export default function TopProductsTable() {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-white">Top Products</h2>
          <p className="text-xs text-gray-500 mt-0.5">Revenue by product line</p>
        </div>
        <button className="text-xs text-brand-400 hover:text-brand-300 transition-colors font-medium">
          View all →
        </button>
      </div>

      <div className="space-y-0">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 px-3 py-2 text-[10px] font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-800">
          <span>Product</span>
          <span className="text-right">Revenue</span>
          <span className="text-right">Units</span>
          <span className="text-right">Growth</span>
          <span className="text-right">Status</span>
        </div>

        {topProducts.map((product, idx) => {
          const status = statusConfig[product.status];
          const GrowthIcon =
            product.growth > 0
              ? TrendingUp
              : product.growth < 0
              ? TrendingDown
              : Minus;

          return (
            <div
              key={product.id}
              className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 px-3 py-3 items-center hover:bg-gray-800/50 rounded-lg transition-colors cursor-default"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-6 h-6 rounded-md bg-gray-800 border border-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">
                  {idx + 1}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-200 truncate">
                    {product.name}
                  </div>
                  <div className="text-xs text-gray-600">{product.category}</div>
                </div>
              </div>

              <div className="text-sm font-semibold text-white text-right tabular-nums">
                {formatCurrency(product.revenue, "USD", true)}
              </div>

              <div className="text-xs text-gray-400 text-right tabular-nums">
                {formatNumber(product.units, true)}
              </div>

              <div
                className={`flex items-center justify-end gap-1 text-xs font-semibold tabular-nums ${
                  product.growth > 0
                    ? "text-emerald-400"
                    : product.growth < 0
                    ? "text-red-400"
                    : "text-gray-500"
                }`}
              >
                <GrowthIcon size={12} />
                {Math.abs(product.growth).toFixed(1)}%
              </div>

              <div className="flex justify-end">
                <span className={`badge text-[10px] ${status.classes}`}>
                  {status.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
