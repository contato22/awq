"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export interface BIMonthlyPoint {
  month:   string;
  jacqes:  number;
  caza:    number;
  total:   number;
}

interface TooltipProps {
  active?:  boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?:   string;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style:              "currency",
    currency:           "BRL",
    notation:           "compact",
    maximumFractionDigits: 1,
  }).format(v);

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg min-w-[160px]">
      <div className="text-xs font-semibold text-gray-400 mb-1.5">{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4 text-xs py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-500">{entry.name}</span>
          </div>
          <span className="font-semibold text-gray-900 tabular-nums">{fmt(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function BIRevenueChart({ data }: { data: BIMonthlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={fmt}
          width={55}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f3f4f6" }} />
        <Legend
          iconType="square"
          iconSize={8}
          formatter={(v) => <span style={{ fontSize: 11, color: "#6b7280" }}>{v}</span>}
        />
        <Bar dataKey="jacqes"  name="JACQES"      fill="#1d4ed8" radius={[4, 4, 0, 0]} />
        <Bar dataKey="caza"    name="Caza Vision" fill="#059669" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
