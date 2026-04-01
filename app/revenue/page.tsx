"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Header from "@/components/Header";
import ChannelTable from "@/components/ChannelTable";
import { revenueData } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-300 rounded-xl p-3.5 shadow-xl shadow-black/40 min-w-[140px]">
      <div className="text-xs font-semibold text-gray-400 mb-2">{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 text-xs py-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: entry.fill }} />
            <span className="text-gray-400 capitalize">{entry.name}</span>
          </div>
          <span className="font-semibold text-gray-900">
            {formatCurrency(entry.value, "USD", true)}
          </span>
        </div>
      ))}
    </div>
  );
}

const summaryStats: { label: string; value: string; sub: string; positive: boolean }[] = [];

export default function RevenuePage() {
  return (
    <>
      <Header
        title="Revenue"
        subtitle="Detailed financial performance and acquisition breakdown"
      />

      <div className="px-8 py-6 space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryStats.length === 0 && (
            <div className="col-span-4">
              <p className="text-sm text-gray-400 text-center py-8">Sem dados disponíveis</p>
            </div>
          )}
          {summaryStats.map((stat) => (
            <div key={stat.label} className="card p-5">
              <div className="text-2xl font-bold text-gray-900 tabular-nums">{stat.value}</div>
              <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
              <div
                className={`text-xs font-medium mt-3 ${
                  stat.positive ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {stat.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div className="card p-6">
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-900">Monthly Revenue vs Profit</h2>
            <p className="text-xs text-gray-500 mt-0.5">FY 2025 — grouped bar comparison</p>
          </div>
          {revenueData.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Sem dados disponíveis</p>
          )}
          {revenueData.length > 0 && (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={revenueData}
              margin={{ top: 4, right: 4, left: -10, bottom: 0 }}
              barGap={4}
              barCategoryGap="30%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: "#6b7280", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#6b7280", fontSize: 11 }}
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
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Bar dataKey="revenue" name="revenue" fill="#6366f1" radius={[3, 3, 0, 0]} />
              <Bar dataKey="profit" name="profit" fill="#22d3ee" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expenses" name="expenses" fill="#f59e0b" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          )}
        </div>

        {/* Margin progression */}
        <div className="card p-6">
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-gray-900">Gross Margin Progression</h2>
            <p className="text-xs text-gray-500 mt-0.5">Month-by-month profit margin trend</p>
          </div>
          {revenueData.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">Sem dados disponíveis</p>
          )}
          <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
            {revenueData.map((d) => {
              const margin = ((d.profit / d.revenue) * 100).toFixed(1);
              const pct = parseFloat(margin);
              return (
                <div key={d.month} className="flex flex-col items-center gap-2">
                  <div className="text-xs font-semibold text-gray-900">{margin}%</div>
                  <div className="w-full h-16 bg-gray-100 rounded-md overflow-hidden flex items-end">
                    <div
                      className="w-full bg-gradient-to-t from-brand-700 to-brand-500 rounded-md transition-all"
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-gray-400">{d.month}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Channel table */}
        <ChannelTable />
      </div>
    </>
  );
}
