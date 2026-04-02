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
    <div className="card-elevated">
      <div className="flex items-center justify-between px-6 pt-5 pb-4">
        <div>
          <h2 className="section-title">Top Products</h2>
          <p className="section-subtitle">Revenue by product line</p>
        </div>
        <button className="text-xs text-awq-gold hover:text-awq-gold-light transition-colors font-semibold">
          View all →
        </button>
      </div>

      <table className="w-full table-navy">
        <thead>
          <tr>
            <th className="text-left">#</th>
            <th className="text-left">Product</th>
            <th className="text-right">Revenue</th>
            <th className="text-right">Units</th>
            <th className="text-right">Growth</th>
            <th className="text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          {topProducts.map((product, idx) => {
            const status = statusConfig[product.status];
            const GrowthIcon =
              product.growth > 0 ? TrendingUp : product.growth < 0 ? TrendingDown : Minus;

            return (
              <tr key={product.id}>
                <td>
                  <span className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                    {idx + 1}
                  </span>
                </td>
                <td>
                  <div className="text-sm font-semibold text-slate-800">{product.name}</div>
                  <div className="text-xs text-gray-400">{product.category}</div>
                </td>
                <td className="text-right font-bold text-emerald-600 tabular-nums">
                  {formatCurrency(product.revenue, "USD", true)}
                </td>
                <td className="text-right text-gray-500 tabular-nums">
                  {formatNumber(product.units, true)}
                </td>
                <td className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 font-semibold tabular-nums ${
                      product.growth > 0
                        ? "text-emerald-600"
                        : product.growth < 0
                        ? "text-red-600"
                        : "text-gray-400"
                    }`}
                  >
                    <GrowthIcon size={12} />
                    {Math.abs(product.growth).toFixed(1)}%
                  </span>
                </td>
                <td className="text-right">
                  <span className={`badge text-[10px] ${status.classes}`}>{status.label}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
