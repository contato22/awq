"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import { fetchVentureSales, VentureSalesData } from "@/lib/notion-fetch";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtK(n: number) {
  if (n >= 1000) return "R$" + (n / 1000).toFixed(0) + "k";
  return "R$" + n.toFixed(0);
}

// ─── Circle progress ─────────────────────────────────────────────────────────

function CircleProgress({ pct, size = 48, stroke = 4, color = "#2563eb" }: {
  pct: number; size?: number; stroke?: number; color?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const capped = Math.min(Math.abs(pct), 100);
  const filled = (capped / 100) * circ;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
        {pct !== 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
            strokeWidth={stroke} strokeDasharray={`${filled} ${circ}`} strokeLinecap="round" />
        )}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-700">
        {Math.round(pct)}%
      </span>
    </div>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const quarters: {
  q: string; year: number; valor: number; meta: number; pct: number; registros: number;
  prev: { q: string; year: number; valor: number; pct: number };
  meses: { m: string; v: number }[];
  note?: string;
}[] = [];

const receitaBarData: { trimestre: string; om: number; seguro: number; integracao: number }[] = [];

const catBarData: { cat: string; Q1: number; Q2: number; Q3: number; Q4: number }[] = [];

const evolucao = [
  {
    id: 1, dim: "Receita O&M Recorrente",
    antes: "R$ 3.701/mês (errático, sem contrato)",
    depois: "R$ 12.092/mês (+227%) — com estrutura de vesting",
    positive: true,
  },
  {
    id: 2, dim: "Seguro como produto",
    antes: "R$ 0,00 — não existia",
    depois: "R$ 2.095,02 — linha iniciada (potencial enorme)",
    positive: true,
  },
  {
    id: 3, dim: "O&M como % da Receita Bruta",
    antes: "2,4% da RB no Q1 2025",
    depois: "14,2% da RB no Q1 2026 — estrutura de receita mudando",
    positive: true,
  },
  {
    id: 4, dim: "Receita Bruta Total Q1",
    antes: "R$ 389.611 (Q1 2025)",
    depois: "R$ 254.736 (-34,6%) — Integração em ritmo menor no Q1",
    positive: false,
  },
];

const detalhamento: { cat: string; q1: number; q2: number; q3: number; q4: number; total: number }[] = [];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function YoY2025Page() {
  const [venture, setVenture] = useState<VentureSalesData | null>(null);

  useEffect(() => {
    fetchVentureSales().then(setVenture);
  }, []);

  // Override bar chart data with real values when available
  const liveBarData = venture ? [
    { trimestre: "Q1", ...Object.fromEntries(Object.entries(venture.byQCat.Q1 ?? {}).map(([k, v]) => [k, v])) },
    { trimestre: "Q2", ...Object.fromEntries(Object.entries(venture.byQCat.Q2 ?? {}).map(([k, v]) => [k, v])) },
    { trimestre: "Q3", ...Object.fromEntries(Object.entries(venture.byQCat.Q3 ?? {}).map(([k, v]) => [k, v])) },
    { trimestre: "Q4", ...Object.fromEntries(Object.entries(venture.byQCat.Q4 ?? {}).map(([k, v]) => [k, v])) },
  ] : receitaBarData;

  const liveDetalhamento = venture
    ? Object.entries(venture.byCategoria).map(([cat, total]) => ({
        cat,
        q1: venture.byQCat.Q1?.[cat] ?? 0,
        q2: venture.byQCat.Q2?.[cat] ?? 0,
        q3: venture.byQCat.Q3?.[cat] ?? 0,
        q4: venture.byQCat.Q4?.[cat] ?? 0,
        total,
      }))
    : detalhamento;

  return (
    <>
      {/* Header */}
      <div className="text-xl font-bold text-gray-900">CAC &amp; LTV — 2025</div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "CAC", value: "R$ 506,33", icon: "📉", sub: "Gasto: R$ 40.000,00 · 79 clientes" },
          { label: "LTV", value: "R$ 5.489,71", icon: "📈", sub: "Ticket médio de clientes fechados" },
          { label: "LTV : CAC", value: "10.8x", icon: "💲", sub: "Saudável (≥ 3x)" },
          { label: "Clientes Fechados", value: "79", icon: "👥", sub: "Receita total: R$ 433.687,08" },
        ].map((k) => (
          <div key={k.label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">{k.label}</span>
              <span className="text-lg">{k.icon}</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{k.value}</div>
            <div className="text-xs text-gray-400">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Quarterly Cards */}
      <div className="grid grid-cols-4 gap-4">
        {quarters.length === 0 && (
          <div className="col-span-4">
            <p className="text-sm text-gray-400 text-center py-8">Sem dados disponíveis</p>
          </div>
        )}
        {quarters.map((q) => (
          <div key={q.q} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-2">
              <div className="text-sm font-semibold text-gray-600">{q.q} · {q.year}</div>
              <CircleProgress pct={q.pct} size={44} stroke={4} color={q.pct >= 100 ? "#2563eb" : "#e5e7eb"} />
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-0.5">
              {q.valor > 0 ? `R$ ${fmtBRL(q.valor)}` : <span className="text-gray-300">—</span>}
            </div>
            <div className="text-xs text-gray-400 mb-3">
              Meta: R$ {fmtBRL(q.meta)} · {q.registros} registros
            </div>
            <div className="border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">{q.prev.q} · {q.prev.year}</span>
                <span className={`text-xs font-bold ${q.prev.pct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {q.prev.pct >= 0 ? "+" : ""}{q.prev.pct}%
                </span>
              </div>
              <div className="text-sm font-semibold text-gray-800 mb-2">
                R$ {fmtBRL(q.prev.valor)}
              </div>
              <div className="grid grid-cols-3 gap-1 text-[10px] text-gray-500">
                {q.meses.map((m) => (
                  <div key={m.m}>
                    <div className="font-medium">{m.m}</div>
                    <div>R$ {fmtBRL(m.v)}</div>
                  </div>
                ))}
              </div>
              {q.note && <div className="text-[9px] text-gray-400 mt-2 italic">{q.note}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Receita por Trimestre */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="text-base font-bold text-gray-900 mb-0.5">Receita por Trimestre</div>
          <div className="text-xs text-gray-400 mb-4">Comparação de categorias por trimestre</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={liveBarData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#f0f0f0" />
              <XAxis dataKey="trimestre" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={52} />
              <Tooltip formatter={(v: number) => `R$ ${fmtBRL(v)}`} />
              <Legend iconType="square" wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="om"         name="O&M"        fill="#f97316" radius={[2, 2, 0, 0]} />
              <Bar dataKey="seguro"     name="Seguro"     fill="#93c5fd" radius={[2, 2, 0, 0]} />
              <Bar dataKey="integracao" name="Integração" fill="#1e3a8a" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Categorias por Trimestre — horizontal */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="text-base font-bold text-gray-900 mb-0.5">Categorias por Trimestre</div>
          <div className="text-xs text-gray-400 mb-4">Distribuição das categorias em cada trimestre</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={catBarData} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 60 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#f0f0f0" horizontal={false} />
              <XAxis type="number" tickFormatter={fmtK} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="cat" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={58} />
              <Tooltip formatter={(v: number) => `R$ ${fmtBRL(v)}`} />
              <Legend iconType="square" wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Q1" fill="#1e3a8a" radius={[0, 2, 2, 0]} />
              <Bar dataKey="Q2" fill="#ef4444" radius={[0, 2, 2, 0]} />
              <Bar dataKey="Q3" fill="#d1d5db" radius={[0, 2, 2, 0]} />
              <Bar dataKey="Q4" fill="#374151" radius={[0, 2, 2, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Evolução Estratégica */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-0.5">
          <div className="text-base font-bold text-gray-900">Evolução Estratégica</div>
          <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors">
            <Plus size={12} /> Nova linha
          </button>
        </div>
        <div className="text-xs text-gray-400 mb-4">Antes (2025) vs Depois (Q1 2026)</div>
        <table className="w-full">
          <thead>
            <tr className="text-xs font-semibold text-gray-400 border-b border-gray-100">
              <th className="text-left py-2 px-3 w-8">#</th>
              <th className="text-left py-2 px-3">Dimensão</th>
              <th className="text-left py-2 px-3">Antes (2025)</th>
              <th className="text-left py-2 px-3">Depois (Q1 2026)</th>
            </tr>
          </thead>
          <tbody>
            {evolucao.map((row) => (
              <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-3.5 px-3 text-sm text-gray-400">{row.id}</td>
                <td className="py-3.5 px-3 text-sm text-gray-700 font-medium">{row.dim}</td>
                <td className="py-3.5 px-3 text-sm text-gray-400">{row.antes}</td>
                <td className={`py-3.5 px-3 text-sm font-semibold ${row.positive ? "text-blue-700" : "text-red-500"}`}>
                  {row.depois}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detalhamento por Trimestre */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="text-base font-bold text-gray-900 mb-4">Detalhamento por Trimestre</div>
        <table className="w-full">
          <thead>
            <tr className="text-xs font-semibold text-gray-400 border-b border-gray-100">
              <th className="text-left py-2 px-3">Categoria</th>
              <th className="text-right py-2 px-3">Q1</th>
              <th className="text-right py-2 px-3">Q2</th>
              <th className="text-right py-2 px-3">Q3</th>
              <th className="text-right py-2 px-3">Q4</th>
              <th className="text-right py-2 px-3 font-bold text-gray-700">Total</th>
            </tr>
          </thead>
          <tbody>
            {liveDetalhamento.length === 0 && (
              <tr><td colSpan={6} className="py-10 text-center text-sm text-gray-400">Sem dados disponíveis</td></tr>
            )}
            {liveDetalhamento.map((row) => (
              <tr key={row.cat} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-3 px-3 text-sm text-gray-700 font-medium">{row.cat}</td>
                <td className="py-3 px-3 text-right text-sm text-gray-600">R$ {fmtBRL(row.q1)}</td>
                <td className="py-3 px-3 text-right text-sm text-gray-400">R$ {fmtBRL(row.q2)}</td>
                <td className="py-3 px-3 text-right text-sm text-gray-400">R$ {fmtBRL(row.q3)}</td>
                <td className="py-3 px-3 text-right text-sm text-gray-400">R$ {fmtBRL(row.q4)}</td>
                <td className="py-3 px-3 text-right text-sm font-bold text-gray-900">R$ {fmtBRL(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
