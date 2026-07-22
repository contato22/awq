"use client";

// ─── Live Shop — Tendência de resultados por live (§7.4) ──────────────────────
// AOV (R$) e take-rate (%) por live, em ordem cronológica. Recebe dados já
// derivados (lib/live-shop/session-results.ts). Client component (recharts).

import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";

export interface TrendPoint {
  name: string;
  aov: number; // reais
  takeRate: number; // %
}

export default function LiveShopResultsTrend({ points }: { points: TrendPoint[] }) {
  if (points.length === 0) return <p className="text-sm text-gray-400">Sem dados.</p>;
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="l" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="r" orientation="right" unit="%" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #eee", fontSize: 12 }}
            formatter={(v: number, n: string) => (n === "AOV (R$)" ? `R$ ${v.toFixed(2)}` : `${v.toFixed(2)}%`)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="l" dataKey="aov" name="AOV (R$)" fill="#ec4899" radius={[4, 4, 0, 0]} />
          <Line yAxisId="r" dataKey="takeRate" name="Take-rate (%)" stroke="#0487D9" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
