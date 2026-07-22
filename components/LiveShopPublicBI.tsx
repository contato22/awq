"use client";

// ─── Live Shop — BI público (alcance/engajamento por live) ────────────────────
// Tema claro (alinhado à AWQ Platform). Só dados NÃO-financeiros (views, pico).

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";
import type { PublicEvent } from "@/lib/live-shop/public";

export default function LiveShopPublicBI({ events }: { events: PublicEvent[] }) {
  const data = [...events]
    .sort((a, b) => (a.startedAt < b.startedAt ? -1 : 1))
    .map((e) => ({
      name: new Date(e.startedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      Views: e.views,
      "Pico ao vivo": e.peakCcv,
    }));

  if (data.length === 0) return <p className="text-center text-sm text-gray-400">Sem dados de alcance ainda.</p>;

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
          <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="l" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="r" orientation="right" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, fontSize: 12 }} cursor={{ fill: "rgba(4,135,217,0.06)" }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="l" dataKey="Views" fill="#0487D9" radius={[4, 4, 0, 0]} />
          <Bar yAxisId="r" dataKey="Pico ao vivo" fill="#65c0f2" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
