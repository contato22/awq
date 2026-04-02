"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { revenueData } from "@/lib/data";

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(v);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-elevated min-w-[160px]">
      <div className="text-xs font-bold text-slate-800 mb-2">{label} 2025</div>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 text-xs py-0.5">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-500 capitalize">{entry.name}</span>
          </div>
          <span className="font-bold text-slate-800">{fmt(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function RevenueChart() {
  return (
    <div className="card-elevated p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="section-title">Revenue Overview</h2>
          <p className="section-subtitle">Monthly P&amp;L — FY 2025</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {["6M", "9M", "1Y"].map((range, i) => (
            <button
              key={range}
              className={`px-3 py-1.5 text-xs rounded-lg font-semibold transition-colors ${
                i === 2
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-gray-500 hover:text-slate-700"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart
          data={revenueData}
          margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1e293b" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#1e293b" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.12} />
              <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e2e8f0"
            vertical={false}
          />
          <XAxis
            dataKey="month"
            tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#64748b", fontSize: 11, fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) =>
              new Intl.NumberFormat("en-US", {
                notation: "compact",
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 1,
              }).format(v)
            }
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }} />

          <Area
            type="monotone"
            dataKey="expenses"
            name="expenses"
            stroke="#C9A84C"
            strokeWidth={2}
            fill="url(#gradExpenses)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="profit"
            name="profit"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#gradProfit)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="revenue"
            name="revenue"
            stroke="#1e293b"
            strokeWidth={2.5}
            fill="url(#gradRevenue)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
