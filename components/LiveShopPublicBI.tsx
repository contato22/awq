"use client";

// ─── Live Shop — BI público (gráfico de alcance/engajamento por live) ─────────
// Recebe apenas dados NÃO-financeiros (views, pico ao vivo) já projetados pela
// whitelist em lib/live-shop/public.ts. Client component (recharts usa browser).

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";
import type { PublicEvent } from "@/lib/live-shop/public";

export default function LiveShopPublicBI({ events }: { events: PublicEvent[] }) {
  // Ordem cronológica para a série temporal (eventos vêm mais-recentes-primeiro).
  const data = [...events]
    .sort((a, b) => (a.startedAt < b.startedAt ? -1 : 1))
    .map((e) => ({
      name: new Date(e.startedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      Views: e.views,
      "Pico ao vivo": e.peakCcv,
    }));

  if (data.length === 0) {
    return <p className="text-center text-sm text-white/40">Sem dados de alcance ainda.</p>;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="name" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="l" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="r" orientation="right" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "#0d1424", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff", fontSize: 12 }}
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }} />
          <Bar yAxisId="l" dataKey="Views" fill="#ec4899" radius={[4, 4, 0, 0]} />
          <Bar yAxisId="r" dataKey="Pico ao vivo" fill="#60a5fa" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
