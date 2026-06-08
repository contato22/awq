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
  Cell,
} from "recharts";

export interface BIMonthlyPoint {
  month:  string;
  jacqes: number;
  caza:   number;
  total:  number;
}

interface TooltipProps {
  active?:  boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?:   string;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style:                 "currency",
    currency:              "BRL",
    notation:              "compact",
    maximumFractionDigits: 1,
  }).format(v);

// Colours aligned with buData
const COLOURS = {
  jacqes: { solid: "#1d4ed8", light: "#dbeafe" },
  caza:   { solid: "#059669", light: "#d1fae5" },
};

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;

  const total = payload.reduce((s, e) => s + (e.value || 0), 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xl min-w-[170px]">
      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-5 py-0.5">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-sm inline-block"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-gray-500">{entry.name}</span>
          </div>
          <span className="text-xs font-bold text-gray-900 tabular-nums">{fmt(entry.value)}</span>
        </div>
      ))}
      {payload.length > 1 && (
        <div className="flex items-center justify-between gap-5 pt-2 mt-1 border-t border-gray-100">
          <span className="text-xs font-semibold text-gray-500">Total</span>
          <span className="text-xs font-black text-gray-900 tabular-nums">{fmt(total)}</span>
        </div>
      )}
    </div>
  );
}

// Opacity tiers so the most recent month is brightest
const OPACITY_BY_IDX = [0.45, 0.60, 0.75, 1.0];

export default function BIRevenueChart({ data }: { data: BIMonthlyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 4, left: -8, bottom: 0 }}
        barGap={6}
        barCategoryGap="28%"
      >
        <defs>
          {data.map((_, i) => (
            <linearGradient key={`gj${i}`} id={`gj${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={COLOURS.jacqes.solid} stopOpacity={OPACITY_BY_IDX[i] ?? 1} />
              <stop offset="100%" stopColor={COLOURS.jacqes.solid} stopOpacity={(OPACITY_BY_IDX[i] ?? 1) * 0.7} />
            </linearGradient>
          ))}
          {data.map((_, i) => (
            <linearGradient key={`gc${i}`} id={`gc${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={COLOURS.caza.solid} stopOpacity={OPACITY_BY_IDX[i] ?? 1} />
              <stop offset="100%" stopColor={COLOURS.caza.solid} stopOpacity={(OPACITY_BY_IDX[i] ?? 1) * 0.7} />
            </linearGradient>
          ))}
        </defs>

        <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />

        <XAxis
          dataKey="month"
          tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={fmt}
          width={52}
        />

        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: "#f8fafc", rx: 6 }}
        />

        <Legend
          iconType="square"
          iconSize={7}
          wrapperStyle={{ paddingTop: 14 }}
          formatter={(v) => (
            <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{v}</span>
          )}
        />

        <Bar
          dataKey="jacqes"
          name="JACQES"
          radius={[5, 5, 0, 0]}
          animationDuration={1000}
          animationEasing="ease-out"
          animationBegin={200}
        >
          {data.map((_, i) => (
            <Cell key={`jc${i}`} fill={`url(#gj${i})`} />
          ))}
        </Bar>

        <Bar
          dataKey="caza"
          name="Caza Vision"
          radius={[5, 5, 0, 0]}
          animationDuration={1000}
          animationEasing="ease-out"
          animationBegin={350}
        >
          {data.map((_, i) => (
            <Cell key={`cc${i}`} fill={`url(#gc${i})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
