"use client";

import { useEffect, useState, useMemo } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ZAxis, Cell,
} from "recharts";
import { Users, DollarSign, TrendingUp, Star, AlertTriangle } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import type { RfmCustomer, RfmResponse, RfmSegment } from "@/app/api/crm/rfm/route";

// ─── Segment display order ────────────────────────────────────────────────────
const SEGMENT_ORDER: RfmSegment[] = [
  "Champions", "Clientes Leais", "Potencial de Fidelidade", "Novos Clientes",
  "Requer Atenção", "Não Pode Perder", "Em Risco", "Hibernando",
];

const SEGMENT_META_CLIENT: Record<RfmSegment, { color: string; bg: string }> = {
  "Champions":               { color: "#10b981", bg: "#d1fae5" },
  "Clientes Leais":          { color: "#3b82f6", bg: "#dbeafe" },
  "Potencial de Fidelidade": { color: "#8b5cf6", bg: "#ede9fe" },
  "Novos Clientes":          { color: "#06b6d4", bg: "#cffafe" },
  "Requer Atenção":          { color: "#f59e0b", bg: "#fef3c7" },
  "Não Pode Perder":         { color: "#f97316", bg: "#ffedd5" },
  "Em Risco":                { color: "#ef4444", bg: "#fee2e2" },
  "Hibernando":              { color: "#6b7280", bg: "#f3f4f6" },
};

// Pre-computed fallback for static export (no API available)
const SEED_RFM_CUSTOMERS: RfmCustomer[] = [
  { account_id:"a1", account_name:"XP Investimentos S.A.",      industry:"finance",   owner:"Miguel", recency_days:10,  frequency:6, monetary:420000, r_score:5, f_score:5, m_score:5, rfm_score:15, segment:"Champions",               segment_color:"#10b981", segment_bg:"#d1fae5" },
  { account_id:"a2", account_name:"Nu Pagamentos S.A.",          industry:"finance",   owner:"Danilo", recency_days:28,  frequency:4, monetary:285000, r_score:4, f_score:4, m_score:4, rfm_score:12, segment:"Champions",               segment_color:"#10b981", segment_bg:"#d1fae5" },
  { account_id:"a3", account_name:"Colégio CEM",                 industry:"education", owner:"Miguel", recency_days:95,  frequency:3, monetary:125000, r_score:3, f_score:3, m_score:3, rfm_score:9,  segment:"Clientes Leais",          segment_color:"#3b82f6", segment_bg:"#dbeafe" },
  { account_id:"a4", account_name:"Reabilicor Clínica Cardíaca", industry:"health",    owner:"Danilo", recency_days:175, frequency:2, monetary:95000,  r_score:2, f_score:2, m_score:2, rfm_score:6,  segment:"Requer Atenção",          segment_color:"#f59e0b", segment_bg:"#fef3c7" },
  { account_id:"a5", account_name:"Clínica Teresópolis",         industry:"health",    owner:"Danilo", recency_days:370, frequency:1, monetary:50000,  r_score:1, f_score:1, m_score:1, rfm_score:3,  segment:"Hibernando",              segment_color:"#6b7280", segment_bg:"#f3f4f6" },
  { account_id:"a6", account_name:"Carol Bertolini",             industry:"media",     owner:"Miguel", recency_days:19,  frequency:1, monetary:18000,  r_score:5, f_score:1, m_score:1, rfm_score:7,  segment:"Novos Clientes",          segment_color:"#06b6d4", segment_bg:"#cffafe" },
];

function buildSeedResponse(): RfmResponse {
  const customers = SEED_RFM_CUSTOMERS;
  const segments = Object.fromEntries(
    SEGMENT_ORDER.map(seg => [
      seg,
      {
        count: customers.filter(c => c.segment === seg).length,
        ...SEGMENT_META_CLIENT[seg],
      },
    ])
  ) as RfmResponse["segments"];
  const totalMonetary = customers.reduce((s, c) => s + c.monetary, 0);
  return {
    customers,
    segments,
    totals: { customers: customers.length, monetary: totalMonetary, avgMonetary: Math.round(totalMonetary / customers.length) },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SEGMENT_ICON: Record<RfmSegment, any> = {
  "Champions":               Star,
  "Clientes Leais":          TrendingUp,
  "Potencial de Fidelidade": Users,
  "Novos Clientes":          Users,
  "Requer Atenção":          AlertTriangle,
  "Não Pode Perder":         AlertTriangle,
  "Em Risco":                AlertTriangle,
  "Hibernando":              Users,
};

// ─── Score badge ──────────────────────────────────────────────────────────────
function ScoreDot({ score, max = 5 }: { score: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full ${i < score ? "bg-brand-500" : "bg-gray-200"}`}
        />
      ))}
    </div>
  );
}

// ─── Custom Scatter tooltip ───────────────────────────────────────────────────
type TooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: RfmCustomer }>;
};

function ScatterTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const c = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg text-xs max-w-[200px]">
      <p className="font-semibold text-gray-900 mb-1 truncate">{c.account_name}</p>
      <div className="space-y-0.5 text-gray-600">
        <p>Recência: <span className="font-medium">{c.recency_days}d</span></p>
        <p>Frequência: <span className="font-medium">{c.frequency} compras</span></p>
        <p>Monetário: <span className="font-medium">{formatBRL(c.monetary)}</span></p>
        <p>RFM: <span className="font-medium">{c.r_score}/{c.f_score}/{c.m_score}</span></p>
      </div>
      <div
        className="mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold inline-block"
        style={{ background: c.segment_bg, color: c.segment_color }}
      >
        {c.segment}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RfmPage() {
  const [data, setData] = useState<RfmResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSegment, setSelectedSegment] = useState<RfmSegment | null>(null);

  useEffect(() => {
    fetch("/api/crm/rfm")
      .then(r => r.json())
      .then(json => { setData(json.success ? json.data : buildSeedResponse()); })
      .catch(() => { setData(buildSeedResponse()); })
      .finally(() => setLoading(false));
  }, []);

  const customers = useMemo(
    () =>
      selectedSegment
        ? (data?.customers ?? []).filter(c => c.segment === selectedSegment)
        : (data?.customers ?? []),
    [data, selectedSegment]
  );

  const scatterData = useMemo(
    () =>
      (data?.customers ?? []).map(c => ({
        ...c,
        x: c.recency_days,
        y: c.frequency,
        z: c.monetary,
      })),
    [data]
  );

  if (loading) return (
    <>
      <Header title="Matriz RFM — CRM Tower" subtitle="Segmentação de clientes por Recência, Frequência e Valor" />
      <div className="page-container">
        <div className="card p-8 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-brand-500 rounded-full animate-spin" />
        </div>
      </div>
    </>
  );

  const totals = data?.totals ?? { customers: 0, monetary: 0, avgMonetary: 0 };
  const segments = data?.segments ?? {} as RfmResponse["segments"];

  // Top segment by customer count
  const topSegment = SEGMENT_ORDER.find(s => (segments[s]?.count ?? 0) > 0);

  return (
    <>
      <Header
        title="Matriz RFM — CRM Tower"
        subtitle="Segmentação de clientes por Recência, Frequência e Valor Monetário"
      />
      <div className="page-container">

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Clientes Ativos",    value: totals.customers,              icon: Users,      color: "text-blue-600",    bg: "bg-blue-50"   },
            { label: "Receita Total",       value: formatBRL(totals.monetary),    icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50"},
            { label: "Ticket Médio",        value: formatBRL(totals.avgMonetary), icon: TrendingUp, color: "text-violet-600",  bg: "bg-violet-50" },
            { label: "Segmento Principal",  value: topSegment ?? "—",             icon: Star,       color: "text-amber-600",   bg: "bg-amber-50"  },
          ].map(k => (
            <div key={k.label} className="card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center shrink-0`}>
                <k.icon size={16} className={k.color} />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900 truncate max-w-[120px]">{k.value}</div>
                <div className="text-[10px] text-gray-500">{k.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Segment cards */}
        <div>
          <SectionHeader icon={<Users size={14} className="text-brand-500" />} title="Segmentos RFM" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
            {SEGMENT_ORDER.map(seg => {
              const meta = segments[seg] ?? { count: 0, color: "#9ca3af", bg: "#f9fafb" };
              const Icon = SEGMENT_ICON[seg];
              const active = selectedSegment === seg;
              return (
                <button
                  key={seg}
                  onClick={() => setSelectedSegment(active ? null : seg)}
                  className={`card p-3 text-left transition-all border-2 ${
                    active ? "border-brand-500 shadow-md" : "border-transparent hover:border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: meta.bg }}
                    >
                      <Icon size={13} style={{ color: meta.color }} />
                    </div>
                    <span className="text-[11px] font-semibold text-gray-700 leading-tight">{seg}</span>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: meta.color }}>{meta.count}</div>
                  <div className="text-[9px] text-gray-400 mt-0.5">
                    {meta.count === 1 ? "cliente" : "clientes"}
                  </div>
                </button>
              );
            })}
          </div>
          {selectedSegment && (
            <p className="text-[11px] text-brand-600 mt-2 ml-1">
              Filtrando por &ldquo;{selectedSegment}&rdquo; — <button onClick={() => setSelectedSegment(null)} className="underline">limpar filtro</button>
            </p>
          )}
        </div>

        {/* Scatter chart + legend */}
        <div className="card p-5">
          <SectionHeader
            icon={<TrendingUp size={14} className="text-violet-500" />}
            title="Mapa RFM — Recência × Frequência (tamanho = Valor)"
          />
          <p className="text-[11px] text-gray-400 mb-4">
            Eixo X: dias desde a última compra (menor = mais recente) · Eixo Y: número de compras · Tamanho da bolha: valor total
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                type="number" dataKey="x"
                name="Recência (dias)"
                label={{ value: "Recência (dias)", position: "insideBottom", offset: -5, fontSize: 10, fill: "#9ca3af" }}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                reversed
              />
              <YAxis
                type="number" dataKey="y"
                name="Frequência"
                label={{ value: "Frequência", angle: -90, position: "insideLeft", offset: 10, fontSize: 10, fill: "#9ca3af" }}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                allowDecimals={false}
              />
              <ZAxis type="number" dataKey="z" range={[60, 600]} name="Monetário" />
              <Tooltip content={<ScatterTooltip />} />
              <Scatter data={scatterData} fillOpacity={0.85}>
                {scatterData.map((entry, i) => (
                  <Cell key={i} fill={entry.segment_color} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>

          {/* Scatter legend */}
          <div className="flex flex-wrap gap-3 mt-3">
            {SEGMENT_ORDER.filter(s => (segments[s]?.count ?? 0) > 0).map(seg => (
              <div key={seg} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: segments[seg]?.color ?? "#9ca3af" }} />
                <span className="text-[10px] text-gray-500">{seg}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Customer table */}
        <div className="card p-5">
          <SectionHeader
            icon={<Users size={14} className="text-emerald-500" />}
            title={`Clientes${selectedSegment ? ` — ${selectedSegment}` : ""} (${customers.length})`}
          />
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Cliente", "Segmento", "Recência", "Frequência", "Monetário", "Score R/F/M", "RFM Total", "Responsável"].map(h => (
                    <th key={h} className="text-left py-2 pr-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers
                  .sort((a, b) => b.rfm_score - a.rfm_score)
                  .map(c => (
                    <tr key={c.account_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-2.5 pr-4 font-medium text-gray-900 max-w-[180px]">
                        <div className="truncate">{c.account_name}</div>
                        {c.industry && (
                          <div className="text-[10px] text-gray-400 capitalize">{c.industry}</div>
                        )}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
                          style={{ background: c.segment_bg, color: c.segment_color }}
                        >
                          {c.segment}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-700 whitespace-nowrap">
                        {c.recency_days}d
                      </td>
                      <td className="py-2.5 pr-4 text-gray-700">
                        {c.frequency}×
                      </td>
                      <td className="py-2.5 pr-4 text-gray-700 font-medium whitespace-nowrap">
                        {formatBRL(c.monetary)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] text-gray-400 w-3">R</span>
                            <ScoreDot score={c.r_score} />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] text-gray-400 w-3">F</span>
                            <ScoreDot score={c.f_score} />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] text-gray-400 w-3">M</span>
                            <ScoreDot score={c.m_score} />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="text-base font-bold text-gray-800">{c.rfm_score}</span>
                        <span className="text-[10px] text-gray-400">/15</span>
                      </td>
                      <td className="py-2.5 text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center text-[9px] font-bold text-brand-700 shrink-0">
                            {c.owner[0]}
                          </div>
                          <span>{c.owner}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400 text-sm">
                      Nenhum cliente neste segmento.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RFM explanation */}
        <div className="card p-5 bg-gray-50/50">
          <SectionHeader icon={<Star size={14} className="text-amber-500" />} title="Como interpretar a Matriz RFM" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3 text-xs text-gray-600">
            {[
              { label: "R — Recência", desc: "Quantos dias desde a última compra. Clientes recentes têm score mais alto (5).", color: "text-blue-600" },
              { label: "F — Frequência", desc: "Quantas compras o cliente realizou. Mais compras = score mais alto (5).", color: "text-violet-600" },
              { label: "M — Monetário", desc: "Valor total gasto. Maior valor = score mais alto (5). Score RFM máximo: 15/15.", color: "text-emerald-600" },
            ].map(item => (
              <div key={item.label} className="p-3 bg-white rounded-xl border border-gray-100">
                <div className={`text-[11px] font-bold mb-1 ${item.color}`}>{item.label}</div>
                <p>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
