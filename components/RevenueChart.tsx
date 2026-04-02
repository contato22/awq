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
import { useIsMobile } from "@/hooks/useIsMobile";

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
    <div className="bg-white border border-gray-300 rounded-xl p-3 shadow-xl shadow-black/40 min-w-[140px]">
      <div className="text-xs font-semibold text-gray-400 mb-2">{label} 2025</div>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-3 text-xs py-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-400 capitalize">{entry.name}</span>
          </div>
          <span className="font-semibold text-gray-900">{fmt(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function RevenueChart() {
  const isMobile = useIsMobile();

  return (
    <div className="card p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4 lg:mb-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Revenue Overview</h2>
          <p className="text-xs text-gray-500 mt-0.5">Monthly P&amp;L — FY 2025</p>
        </div>
        <div className="flex gap-1">
          {["6M", "9M", "1Y"].map((range, i) => (
            <button
              key={range}
              className={`px-2.5 lg:px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                i === 2
                  ? "bg-brand-600/20 text-brand-600 border border-brand-500/20"
                  : "text-gray-500 hover:text-gray-400"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={isMobile ? 200 : 280}>
        <AreaChart
          data={revenueData}
          margin={isMobile
            ? { top: 4, right: 0, left: -20, bottom: 0 }
            : { top: 4, right: 4, left: -10, bottom: 0 }
          }
        >
          <defs>
            <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "#6b7280", fontSize: isMobile ? 10 : 11 }}
            axisLine={false}
            tickLine={false}
            interval={isMobile ? 1 : 0}
          />
          <YAxis
            tick={{ fill: "#6b7280", fontSize: isMobile ? 10 : 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) =>
              new Intl.NumberFormat("en-US", {
                notation: "compact",
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              }).format(v)
            }
            width={isMobile ? 40 : 50}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#374151", strokeWidth: 1 }} />

          {/* On mobile, only show revenue line for clarity */}
          {!isMobile && (
            <>
              <Area type="monotone" dataKey="expenses" name="expenses" stroke="#f59e0b" strokeWidth={1.5} fill="url(#gradExpenses)" dot={false} />
              <Area type="monotone" dataKey="profit" name="profit" stroke="#22d3ee" strokeWidth={1.5} fill="url(#gradProfit)" dot={false} />
            </>
          )}
          <Area type="monotone" dataKey="revenue" name="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#gradRevenue)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend — responsive */}
      <div className="flex items-center gap-3 lg:gap-4 mt-3 text-[10px] text-gray-500 justify-center lg:justify-start">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-500 inline-block" /> Revenue</span>
        <span className="hidden lg:flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" /> Profit</span>
        <span className="hidden lg:flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Expenses</span>
        {isMobile && <span className="text-gray-400 italic">Expand on desktop for full P&L</span>}
      </div>
    </div>
  );
}
