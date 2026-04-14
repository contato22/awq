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
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(v);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg min-w-[150px]">
      <div className="text-[11px] font-semibold text-gray-400 mb-1.5">{label} 2025</div>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 text-xs py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-500 capitalize">{entry.name}</span>
          </div>
          <span className="font-semibold text-gray-900 tabular-nums">{fmt(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function RevenueChart() {
  const isMobile = useIsMobile();

  return (
    <div className="card p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4 lg:mb-5">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Revenue Overview</h2>
          <p className="text-[11px] text-gray-500 mt-0.5 font-medium">Monthly P&amp;L — FY 2025</p>
        </div>
        <div className="flex gap-1">
          {["6M", "9M", "1Y"].map((range, i) => (
            <button
              key={range}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                i === 2
                  ? "bg-brand-50 text-brand-600 ring-1 ring-brand-200/60"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={isMobile ? 200 : 260}>
        <AreaChart
          data={revenueData}
          margin={
            isMobile
              ? { top: 4, right: 0, left: -20, bottom: 0 }
              : { top: 4, right: 4, left: -10, bottom: 0 }
          }
        >
          <defs>
            <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.12} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradExpenses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: "#9ca3af", fontSize: isMobile ? 10 : 11 }}
            axisLine={false}
            tickLine={false}
            interval={isMobile ? 1 : 0}
          />
          <YAxis
            tick={{ fill: "#9ca3af", fontSize: isMobile ? 10 : 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) =>
              new Intl.NumberFormat("pt-BR", {
                notation: "compact",
                style: "currency",
                currency: "BRL",
                maximumFractionDigits: 1,
              }).format(v)
            }
            width={isMobile ? 40 : 50}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#d1d5db", strokeWidth: 1 }} />

          {/* On mobile, only show revenue line for readability */}
          {!isMobile && (
            <>
              <Area
                type="monotone"
                dataKey="expenses"
                name="expenses"
                stroke="#f59e0b"
                strokeWidth={1.5}
                fill="url(#gradExpenses)"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="profit"
                name="profit"
                stroke="#10b981"
                strokeWidth={1.5}
                fill="url(#gradProfit)"
                dot={false}
              />
            </>
          )}
          <Area
            type="monotone"
            dataKey="revenue"
            name="revenue"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#gradRevenue)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend — responsive */}
      <div className="flex items-center justify-center gap-5 mt-3 pt-3 border-t border-gray-100">
        <span className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
          <span className="w-2.5 h-2.5 rounded-sm inline-block bg-brand-500" />
          Revenue
        </span>
        <span className="hidden lg:flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
          <span className="w-2.5 h-2.5 rounded-sm inline-block bg-emerald-500" />
          Profit
        </span>
        <span className="hidden lg:flex items-center gap-1.5 text-[11px] text-gray-500 font-medium">
          <span className="w-2.5 h-2.5 rounded-sm inline-block bg-amber-500" />
          Expenses
        </span>
        {isMobile && (
          <span className="text-[10px] text-gray-400 italic">Mais linhas no desktop</span>
        )}
      </div>
    </div>
  );
}
