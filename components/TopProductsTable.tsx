"use client";

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
    <div className="card p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4 lg:mb-5">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Top Products</h2>
          <p className="text-xs text-gray-500 mt-0.5">Revenue by product line</p>
        </div>
        <button className="text-xs text-brand-600 hover:text-brand-500 transition-colors font-medium">
          View all →
        </button>
      </div>

      {/* Desktop: grid table */}
      <div className="hidden lg:block space-y-0">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 px-3 py-2 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-200">
          <span>Product</span>
          <span className="text-right">Revenue</span>
          <span className="text-right">Units</span>
          <span className="text-right">Growth</span>
          <span className="text-right">Status</span>
        </div>

        {topProducts.map((product, idx) => {
          const status = statusConfig[product.status];
          const GrowthIcon =
            product.growth > 0 ? TrendingUp : product.growth < 0 ? TrendingDown : Minus;

          return (
            <div
              key={product.id}
              className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 px-3 py-3 items-center hover:bg-gray-100 rounded-lg transition-colors cursor-default"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-6 h-6 rounded-md bg-gray-100 border border-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-500 shrink-0">
                  {idx + 1}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-400 truncate">
                    {product.name}
                  </div>
                  <div className="text-xs text-gray-400">{product.category}</div>
                </div>
              </div>
              <div className="text-sm font-semibold text-gray-900 text-right tabular-nums">
                {formatCurrency(product.revenue, "USD", true)}
              </div>
              <div className="text-xs text-gray-400 text-right tabular-nums">
                {formatNumber(product.units, true)}
              </div>
              <div
                className={`flex items-center justify-end gap-1 text-xs font-semibold tabular-nums ${
                  product.growth > 0 ? "text-emerald-600" : product.growth < 0 ? "text-red-600" : "text-gray-500"
                }`}
              >
                <GrowthIcon size={12} />
                {Math.abs(product.growth).toFixed(1)}%
              </div>
              <div className="flex justify-end">
                <span className={`badge text-[10px] ${status.classes}`}>{status.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: card list */}
      <div className="lg:hidden space-y-2">
        {topProducts.map((product, idx) => {
          const status = statusConfig[product.status];
          const GrowthIcon =
            product.growth > 0 ? TrendingUp : product.growth < 0 ? TrendingDown : Minus;

          return (
            <div
              key={product.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100"
            >
              <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-[11px] font-bold text-gray-500 shrink-0">
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-700 truncate">{product.name}</span>
                  <span className={`badge text-[10px] shrink-0 ${status.classes}`}>{status.label}</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs font-semibold text-gray-900 tabular-nums">
                    {formatCurrency(product.revenue, "USD", true)}
                  </span>
                  <span className="text-[10px] text-gray-400 tabular-nums">
                    {formatNumber(product.units, true)} units
                  </span>
                  <span
                    className={`flex items-center gap-0.5 text-[10px] font-semibold tabular-nums ${
                      product.growth > 0 ? "text-emerald-600" : product.growth < 0 ? "text-red-600" : "text-gray-500"
                    }`}
                  >
                    <GrowthIcon size={10} />
                    {Math.abs(product.growth).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
