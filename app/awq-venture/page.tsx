"use client";

import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { BarChart2, RefreshCw } from "lucide-react";
import { fetchVentureSales, VentureSalesData } from "@/lib/notion-fetch";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtK(n: number) {
  if (n >= 1000) return "R$" + (n / 1000).toFixed(0) + "k";
  return "R$" + n.toFixed(0);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CircleProgress({ pct, size = 44, stroke = 4, color = "#2563eb" }: {
  pct: number; size?: number; stroke?: number; color?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const capped = Math.min(pct, 100);
  const filled = (capped / 100) * circ;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
          strokeWidth={stroke} strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-700">
        {pct > 100 ? `${Math.round(pct)}%` : `${Math.round(pct)}%`}
      </span>
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  // Semi-circle speedometer. Range: 0–50x. Green zone ≥ 3x.
  const pct = Math.min(value / 50, 1);
  const startAngle = Math.PI;
  const endAngle = 0;
  const range = startAngle - endAngle;
  const angle = startAngle - pct * range;
  const cx = 80, cy = 80, r = 58;
  const needleX = cx + r * Math.cos(angle);
  const needleY = cy + r * Math.sin(angle);

  // arc helpers
  function arc(startA: number, endA: number, color?: string) {
    void color;
    const x1 = cx + r * Math.cos(startA);
    const y1 = cy + r * Math.sin(startA);
    const x2 = cx + r * Math.cos(endA);
    const y2 = cy + r * Math.sin(endA);
    const large = endA - startA > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  }

  const segments = [
    { start: Math.PI,       end: Math.PI * 0.8,  color: "#ef4444" },
    { start: Math.PI * 0.8, end: Math.PI * 0.6,  color: "#f97316" },
    { start: Math.PI * 0.6, end: Math.PI * 0.5,  color: "#eab308" },
    { start: Math.PI * 0.5, end: Math.PI * 0.3,  color: "#84cc16" },
    { start: Math.PI * 0.3, end: 0,              color: "#22c55e" },
  ];

  return (
    <div className="flex flex-col items-center">
      <svg width={160} height={95} viewBox="0 0 160 95">
        {segments.map((s, i) => (
          <path key={i} d={arc(s.start, s.end)} fill="none" stroke={s.color} strokeWidth={14} strokeLinecap="butt" />
        ))}
        {/* needle */}
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="#1f2937" strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={5} fill="#1f2937" />
      </svg>
      <div className="text-lg font-bold text-amber-500 -mt-2">{value}x</div>
      <div className="text-[10px] text-gray-400 uppercase tracking-wide">Regular</div>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const receitaAnual2026 = [
  { mes: "Jan", total: 0,     om: 0,     seguro: 0,    meta: 10000  },
  { mes: "Fev", total: 3096,  om: 3096,  seguro: 0,    meta: 20000  },
  { mes: "Mar", total: 42507, om: 40412, seguro: 2095, meta: 30000  },
  { mes: "Abr", total: null,  om: null,  seguro: null, meta: 40000  },
  { mes: "Mai", total: null,  om: null,  seguro: null, meta: 50000  },
  { mes: "Jun", total: null,  om: null,  seguro: null, meta: 60000  },
  { mes: "Jul", total: null,  om: null,  seguro: null, meta: 70000  },
  { mes: "Ago", total: null,  om: null,  seguro: null, meta: 80000  },
  { mes: "Set", total: null,  om: null,  seguro: null, meta: 90000  },
  { mes: "Out", total: null,  om: null,  seguro: null, meta: 100000 },
  { mes: "Nov", total: null,  om: null,  seguro: null, meta: 110000 },
  { mes: "Dez", total: null,  om: null,  seguro: null, meta: 120000 },
];

const CANAL_COLORS = ["#1e3a8a", "#ef4444", "#9ca3af", "#374151", "#f97316", "#16a34a", "#7c3aed"];

const periods = ["Anual", "Semestral", "Trimestral", "Mensal", "Diário"] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PoCPage() {
  const [period, setPeriod] = useState<typeof periods[number]>("Anual");
  const [year, setYear] = useState<"2025" | "2026">("2026");
  const [venture, setVenture] = useState<VentureSalesData | null>(null);

  useEffect(() => {
    fetchVentureSales().then(setVenture);
  }, []);

  const totalFechados = venture?.totalFechado ?? 42506.99;
  const meta          = 120000;
  const om            = venture?.byCategoria["O&M"] ?? 40411.97;
  const seguro        = venture?.byCategoria["Seguro"] ?? 2095.02;
  const faturamento   = Object.values(venture?.byCategoria ?? {}).reduce((s, v) => s + v, 0) || 433687.08;
  const canais        = (venture?.byCanal ?? [
    { canal: "Não informado", leads: 354, pct: 74, valor: 1189409.49 },
    { canal: "Indicação",     leads: 29,  pct: 6,  valor: 469598.96  },
    { canal: "Cliente Ativo", leads: 21,  pct: 4,  valor: 498506.14  },
    { canal: "Site/ADS",      leads: 17,  pct: 4,  valor: 192101.32  },
  ]).map((c, i) => ({ ...c, color: CANAL_COLORS[i % CANAL_COLORS.length] }));

  const kpis = [
    { label: "Total Fechados",    value: `R$ ${fmtBRL(totalFechados)}`, sub: "O&M + Seguro",                pct: Math.round((totalFechados / meta) * 100) },
    { label: "O&M",               value: `R$ ${fmtBRL(om)}`,           sub: "Fechados com categoria O&M",   pct: Math.round((om / meta) * 100)            },
    { label: "Seguro",            value: `R$ ${fmtBRL(seguro)}`,        sub: "Fechados com categoria Seguro",pct: Math.round((seguro / meta) * 100)         },
    { label: "Faturamento Total", value: `R$ ${fmtBRL(faturamento)}`,   sub: "Todas as vendas fechadas",     pct: Math.round((faturamento / meta) * 100)    },
  ];

  const barColors = canais.map((c) => c.color);

  return (
    <>
      {/* Row 1 — KPI cards */}
      <div className="grid grid-cols-5 gap-4">
        {/* LTV:CAC Gauge */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col items-start">
          <div className="text-sm font-semibold text-gray-700 mb-1">LTV : CAC</div>
          <div className="text-xs text-gray-400 mb-2">Tempo real · Atualiza a cada 60s</div>
          <div className="flex-1 flex items-center justify-center w-full">
            <Gauge value={38.3} />
          </div>
        </div>

        {/* Other KPI cards */}
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-2">
            <div className="flex items-start justify-between">
              <div className="text-xs font-medium text-gray-500">{k.label}</div>
              <CircleProgress pct={k.pct} size={44} color="#2563eb" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{k.value}</div>
            <div className="text-xs text-gray-400">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Row 2 — Chart + Vesting */}
      <div className="grid grid-cols-3 gap-4">
        {/* Receita Acumulada */}
        <div className="col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-start justify-between mb-1">
            <div>
              <div className="text-base font-bold text-gray-900">Receita Acumulada</div>
              <div className="text-xs text-gray-400 mt-0.5">
                Acompanhamento diário · Meta: R$ 120.000 · Atual: R$ {fmtBRL(totalFechados)}
              </div>
            </div>
            <div className="flex gap-1">
              {(["2025", "2026"] as const).map((y) => (
                <button key={y} onClick={() => setYear(y)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    year === y ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >{y}</button>
              ))}
            </div>
          </div>

          {/* Period tabs */}
          <div className="flex gap-1 mb-4 mt-3">
            {periods.map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  period === p ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                }`}
              >{p}</button>
            ))}
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={receitaAnual2026} margin={{ top: 4, right: 8, bottom: 0, left: 8 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={50} />
              <Tooltip formatter={(v: number) => v != null ? `R$ ${fmtBRL(v)}` : "—"} />
              <Legend iconType="plainline" wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="total"  name="Total Fechados" stroke="#1e3a8a" strokeWidth={2} dot={false} connectNulls={false} />
              <Line type="monotone" dataKey="om"     name="O&M"            stroke="#f97316" strokeWidth={2} dot={false} connectNulls={false} />
              <Line type="monotone" dataKey="seguro" name="Seguro"         stroke="#9ca3af" strokeWidth={2} dot={false} connectNulls={false} />
              <Line type="monotone" dataKey="meta"   name="Meta Vesting"   stroke="#111827" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Processo de Vesting */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-start justify-between mb-1">
            <div className="text-base font-bold text-gray-900">Processo de Vesting</div>
            <span className="text-sm font-bold text-blue-600">2.4% / 20%</span>
          </div>
          <div className="text-xs text-gray-400 mb-4">Duração: 3 anos · Meta total: R$ 360.000,00</div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: "Ano 1 (Atual)", pct: 3,   valor: 42506.99, meta: 120000 },
              { label: "Ano 2",         pct: 0,   valor: 0,        meta: 120000 },
              { label: "Ano 3",         pct: 0,   valor: 0,        meta: 120000 },
            ].map((a) => (
              <div key={a.label} className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="flex justify-center mb-1">
                  <CircleProgress pct={a.pct} size={38} stroke={3} color="#2563eb" />
                </div>
                <div className="text-xs text-gray-500 mb-1">{a.label}</div>
                <div className="text-base font-bold text-gray-900">{a.pct.toFixed(1)}%</div>
                <div className="text-[10px] text-gray-400">Meta: 6.7%</div>
                <div className="text-[10px] text-gray-700 font-medium mt-1">
                  R$ {fmtBRL(a.valor)} /
                </div>
                <div className="text-[10px] text-red-500 font-semibold">
                  R$ {fmtBRL(a.meta)}{Math.round((a.valor / a.meta) * 100)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3 — Canais de Aquisição */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 col-start-3 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-start justify-between mb-0.5">
            <div className="text-base font-bold text-gray-900">Canais de Aquisição</div>
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <RefreshCw size={10} />
              Atualização a cada 1 min
            </div>
          </div>
          <div className="text-xs text-gray-400 mb-4">Origem dos leads por fonte · Pipeline</div>

          <div className="grid grid-cols-3 gap-2 mb-4 text-center">
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500 flex items-center justify-center gap-1 mb-1"><BarChart2 size={11} />Canais</div>
              <div className="text-xl font-bold text-gray-900">12</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-1">Leads</div>
              <div className="text-xl font-bold text-gray-900">481</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="text-xs text-gray-500 mb-1">Valor Total</div>
              <div className="text-sm font-bold text-gray-900">R$ 3.546.375,56</div>
            </div>
          </div>

          {/* stacked bar */}
          <div className="flex h-2 rounded-full overflow-hidden mb-4 gap-px">
            {canais.map((c) => (
              <div key={c.canal} style={{ width: `${c.pct}%`, backgroundColor: c.color }} />
            ))}
          </div>

          <div className="space-y-3">
            {canais.map((c) => (
              <div key={c.canal}>
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-xs font-medium text-gray-700">{c.canal}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-700">{c.pct}%</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-400 pl-4">
                  <span>{c.leads} leads</span>
                  <span>R$ {fmtBRL(c.valor)}</span>
                </div>
                <div className="h-1 bg-gray-100 rounded mt-1 overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${c.pct}%`, backgroundColor: c.color }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-500">
            🏆 Principal canal: <span className="font-semibold text-gray-700">Não informado</span> com 354 leads (74%)
          </div>
        </div>
      </div>
    </>
  );
}
