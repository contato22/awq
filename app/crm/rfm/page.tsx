"use client";

import { useEffect, useState, useMemo } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import { Users, DollarSign, TrendingUp, Star, AlertTriangle, Filter } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import type { RfmCustomer, RfmResponse, RfmSegment } from "@/lib/crm-rfm-types";

// ─── BU filter ────────────────────────────────────────────────────────────────
const BUS = ["Todos", "JACQES", "CAZA", "ADVISOR", "VENTURE"] as const;
type BuFilter = typeof BUS[number];

// ─── 5×5 grid segment mapping ─────────────────────────────────────────────────
const CELL_SEGMENTS: Record<string, RfmSegment> = {
  "1,1":"Perdidos",            "1,2":"Hibernando",       "1,3":"Em Risco",
  "1,4":"Não Pode Perder",     "1,5":"Não Pode Perder",
  "2,1":"Hibernando",          "2,2":"Hibernando",       "2,3":"Em Risco",
  "2,4":"Em Risco",            "2,5":"Não Pode Perder",
  "3,1":"Clientes Promissores","3,2":"Quase Dormentes",  "3,3":"Precisam de Atenção",
  "3,4":"Clientes Fiéis",      "3,5":"Clientes Fiéis",
  "4,1":"Novos Clientes",      "4,2":"Fiéis em Potencial","4,3":"Fiéis em Potencial",
  "4,4":"Clientes Fiéis",      "4,5":"Campeões",
  "5,1":"Novos Clientes",      "5,2":"Fiéis em Potencial","5,3":"Fiéis em Potencial",
  "5,4":"Campeões",            "5,5":"Campeões",
};

const SEGMENT_ORDER: RfmSegment[] = [
  "Campeões","Clientes Fiéis","Fiéis em Potencial","Novos Clientes",
  "Clientes Promissores","Precisam de Atenção","Quase Dormentes",
  "Não Pode Perder","Em Risco","Hibernando","Perdidos",
];

const SEG_LETTER: Record<RfmSegment, string> = {
  "Campeões":"A","Clientes Fiéis":"B","Fiéis em Potencial":"C",
  "Novos Clientes":"D","Clientes Promissores":"E","Precisam de Atenção":"F",
  "Quase Dormentes":"G","Não Pode Perder":"H","Em Risco":"I",
  "Hibernando":"J","Perdidos":"K",
};

// Grid cell fill/text colors (match reference image palette)
const GRID_FILL: Record<RfmSegment, string> = {
  "Campeões":             "#1e40af",
  "Clientes Fiéis":       "#3b82f6",
  "Fiéis em Potencial":   "#93c5fd",
  "Novos Clientes":       "#bfdbfe",
  "Clientes Promissores": "#dbeafe",
  "Precisam de Atenção":  "#e5e7eb",
  "Quase Dormentes":      "#fdba74",
  "Não Pode Perder":      "#92400e",
  "Em Risco":             "#ef4444",
  "Hibernando":           "#f97316",
  "Perdidos":             "#dc2626",
};
const GRID_TEXT: Record<RfmSegment, string> = {
  "Campeões":"#fff","Clientes Fiéis":"#fff","Fiéis em Potencial":"#1e3a8a",
  "Novos Clientes":"#1e3a8a","Clientes Promissores":"#1e40af",
  "Precisam de Atenção":"#374151","Quase Dormentes":"#78350f",
  "Não Pode Perder":"#fff","Em Risco":"#fff","Hibernando":"#fff","Perdidos":"#fff",
};

// Card segment colors (softer, for the segment card row)
const SEGMENT_META_CLIENT: Record<RfmSegment, { color: string; bg: string }> = {
  "Campeões":             { color: "#1e40af", bg: "#dbeafe" },
  "Clientes Fiéis":       { color: "#2563eb", bg: "#eff6ff" },
  "Fiéis em Potencial":   { color: "#3b82f6", bg: "#e0f2fe" },
  "Novos Clientes":       { color: "#0284c7", bg: "#f0f9ff" },
  "Clientes Promissores": { color: "#0369a1", bg: "#e0f2fe" },
  "Precisam de Atenção":  { color: "#6b7280", bg: "#f3f4f6" },
  "Quase Dormentes":      { color: "#d97706", bg: "#fef3c7" },
  "Não Pode Perder":      { color: "#92400e", bg: "#fde68a" },
  "Em Risco":             { color: "#dc2626", bg: "#fee2e2" },
  "Hibernando":           { color: "#ea580c", bg: "#ffedd5" },
  "Perdidos":             { color: "#991b1b", bg: "#fecaca" },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SEGMENT_ICON: Record<RfmSegment, any> = {
  "Campeões":Star,"Clientes Fiéis":TrendingUp,"Fiéis em Potencial":Users,
  "Novos Clientes":Users,"Clientes Promissores":TrendingUp,
  "Precisam de Atenção":AlertTriangle,"Quase Dormentes":Users,
  "Não Pode Perder":AlertTriangle,"Em Risco":AlertTriangle,
  "Hibernando":Users,"Perdidos":AlertTriangle,
};

// ─── Pre-computed seed data for static export ─────────────────────────────────
const SEED_RFM_CUSTOMERS: RfmCustomer[] = [
  { account_id:"a1",  account_name:"XP Investimentos S.A.",      industry:"finance",   owner:"Miguel", bu:"JACQES",  recency_days:10,  frequency:6, monetary:420000, r_score:5, f_score:5, m_score:5, rfm_score:15, segment:"Campeões",             segment_color:"#1e40af", segment_bg:"#dbeafe" },
  { account_id:"a2",  account_name:"Nu Pagamentos S.A.",          industry:"finance",   owner:"Danilo", bu:"JACQES",  recency_days:28,  frequency:4, monetary:285000, r_score:4, f_score:4, m_score:4, rfm_score:12, segment:"Clientes Fiéis",        segment_color:"#2563eb", segment_bg:"#eff6ff" },
  { account_id:"a7",  account_name:"Grupo Pão de Açúcar",         industry:"retail",    owner:"Miguel", bu:"JACQES",  recency_days:320, frequency:5, monetary:380000, r_score:1, f_score:5, m_score:5, rfm_score:11, segment:"Não Pode Perder",      segment_color:"#92400e", segment_bg:"#fde68a" },
  { account_id:"a9",  account_name:"Faculdade Einstein",          industry:"education", owner:"Miguel", bu:"ADVISOR", recency_days:45,  frequency:2, monetary:78000,  r_score:4, f_score:2, m_score:2, rfm_score:8,  segment:"Fiéis em Potencial",    segment_color:"#3b82f6", segment_bg:"#e0f2fe" },
  { account_id:"a3",  account_name:"Colégio CEM",                 industry:"education", owner:"Miguel", bu:"ADVISOR", recency_days:95,  frequency:3, monetary:125000, r_score:3, f_score:3, m_score:3, rfm_score:9,  segment:"Precisam de Atenção",   segment_color:"#6b7280", segment_bg:"#f3f4f6" },
  { account_id:"a8",  account_name:"Positivo Tecnologia",         industry:"tech",      owner:"Danilo", bu:"VENTURE", recency_days:210, frequency:4, monetary:195000, r_score:2, f_score:4, m_score:4, rfm_score:10, segment:"Em Risco",              segment_color:"#dc2626", segment_bg:"#fee2e2" },
  { account_id:"a4",  account_name:"Reabilicor Clínica Cardíaca", industry:"health",    owner:"Danilo", bu:"CAZA",    recency_days:175, frequency:2, monetary:95000,  r_score:2, f_score:2, m_score:2, rfm_score:6,  segment:"Hibernando",            segment_color:"#ea580c", segment_bg:"#ffedd5" },
  { account_id:"a10", account_name:"Farmácias Nissei",            industry:"health",    owner:"Danilo", bu:"CAZA",    recency_days:60,  frequency:1, monetary:42000,  r_score:4, f_score:1, m_score:1, rfm_score:6,  segment:"Novos Clientes",        segment_color:"#0284c7", segment_bg:"#f0f9ff" },
  { account_id:"a6",  account_name:"Carol Bertolini",             industry:"media",     owner:"Miguel", bu:"VENTURE", recency_days:19,  frequency:1, monetary:18000,  r_score:5, f_score:1, m_score:1, rfm_score:7,  segment:"Novos Clientes",        segment_color:"#0284c7", segment_bg:"#f0f9ff" },
  { account_id:"a5",  account_name:"Clínica Teresópolis",         industry:"health",    owner:"Danilo", bu:"CAZA",    recency_days:370, frequency:1, monetary:50000,  r_score:1, f_score:1, m_score:1, rfm_score:3,  segment:"Perdidos",              segment_color:"#991b1b", segment_bg:"#fecaca" },
];

function buildSeedResponse(buFilter: BuFilter = "Todos"): RfmResponse {
  const base = buFilter !== "Todos"
    ? SEED_RFM_CUSTOMERS.filter(c => c.bu === buFilter)
    : SEED_RFM_CUSTOMERS;
  const customers = base.length > 0 ? base : SEED_RFM_CUSTOMERS;

  const segments = Object.fromEntries(
    SEGMENT_ORDER.map(seg => [
      seg,
      { count: customers.filter(c => c.segment === seg).length, ...SEGMENT_META_CLIENT[seg] },
    ])
  ) as RfmResponse["segments"];

  const totalMonetary = customers.reduce((s, c) => s + c.monetary, 0);
  return {
    customers,
    segments,
    totals: {
      customers: customers.length,
      monetary: totalMonetary,
      avgMonetary: customers.length > 0 ? Math.round(totalMonetary / customers.length) : 0,
    },
  };
}

// ─── Score dots ───────────────────────────────────────────────────────────────
function ScoreDot({ score, max = 5 }: { score: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} className={`w-2 h-2 rounded-full ${i < score ? "bg-brand-500" : "bg-gray-200"}`} />
      ))}
    </div>
  );
}

// ─── 5×5 matrix grid ─────────────────────────────────────────────────────────
function MatrixGrid({
  customers,
  selectedSegment,
  onSelect,
}: {
  customers: RfmCustomer[];
  selectedSegment: RfmSegment | null;
  onSelect: (seg: RfmSegment | null) => void;
}) {
  const cellMap = useMemo(() => {
    const m: Record<string, RfmCustomer[]> = {};
    customers.forEach(c => {
      const k = `${c.r_score},${c.f_score}`;
      (m[k] = m[k] ?? []).push(c);
    });
    return m;
  }, [customers]);

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex flex-col gap-0">
        {/* F axis label */}
        <div className="flex items-center gap-1 mb-1">
          <span className="w-5 shrink-0" />
          <span className="text-[10px] text-gray-400 italic">← Frequência</span>
        </div>
        {[5,4,3,2,1].map(f => (
          <div key={f} className="flex items-center">
            <span className="w-5 text-[9px] text-gray-400 text-right pr-1 shrink-0">{f}</span>
            {[1,2,3,4,5].map(r => {
              const key = `${r},${f}`;
              const seg = CELL_SEGMENTS[key];
              const fill = GRID_FILL[seg];
              const textColor = GRID_TEXT[seg];
              const letter = SEG_LETTER[seg];
              const count = cellMap[key]?.length ?? 0;
              const active = selectedSegment === seg;
              return (
                <button
                  key={r}
                  title={seg}
                  onClick={() => onSelect(active ? null : seg)}
                  className="w-12 h-12 sm:w-14 sm:h-14 flex flex-col items-center justify-center border border-white/40 transition-all"
                  style={{
                    background: fill,
                    opacity: selectedSegment && !active ? 0.55 : 1,
                    outline: active ? "2px solid #0f172a" : "none",
                    outlineOffset: "-2px",
                  }}
                >
                  <span className="text-xs font-bold leading-none" style={{ color: textColor }}>{letter}</span>
                  {count > 0 && (
                    <span
                      className="mt-0.5 text-[9px] font-bold px-1 rounded-full"
                      style={{ background: "rgba(0,0,0,0.18)", color: textColor }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
        {/* R axis */}
        <div className="flex mt-1">
          <span className="w-5 shrink-0" />
          {[1,2,3,4,5].map(r => (
            <span key={r} className="w-12 sm:w-14 text-center text-[9px] text-gray-400">{r}</span>
          ))}
        </div>
        <div className="flex mt-0.5">
          <span className="w-5 shrink-0" />
          <span className="text-[10px] text-gray-400 italic">Recência →</span>
        </div>
      </div>
    </div>
  );
}

// ─── Segment legend ───────────────────────────────────────────────────────────
function SegmentLegend({
  segments,
  selectedSegment,
  onSelect,
}: {
  segments: RfmResponse["segments"];
  selectedSegment: RfmSegment | null;
  onSelect: (seg: RfmSegment | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {SEGMENT_ORDER.map(seg => {
        const count = segments[seg]?.count ?? 0;
        const active = selectedSegment === seg;
        return (
          <button
            key={seg}
            onClick={() => onSelect(active ? null : seg)}
            className={`flex items-center gap-2 rounded-lg px-2 py-1 transition-all text-left ${
              active ? "ring-2 ring-gray-800" : "hover:bg-gray-50"
            }`}
          >
            <div
              className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold shrink-0"
              style={{ background: GRID_FILL[seg], color: GRID_TEXT[seg] }}
            >
              {SEG_LETTER[seg]}
            </div>
            <span className="text-[11px] text-gray-600 flex-1 leading-tight">{seg}</span>
            {count > 0 && (
              <span className="text-[10px] font-semibold text-gray-400">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function RfmPage() {
  const [data, setData]               = useState<RfmResponse | null>(null);
  const [loading, setLoading]         = useState(true);
  const [selectedSegment, setSelectedSegment] = useState<RfmSegment | null>(null);
  const [bu, setBu]                   = useState<BuFilter>("Todos");

  useEffect(() => {
    setLoading(true);
    const buParam = bu !== "Todos" ? `?bu=${bu}` : "";
    fetch(`/api/crm/rfm${buParam}`)
      .then(r => r.json())
      .then(json => { setData(json.success ? json.data : buildSeedResponse(bu)); })
      .catch(() => { setData(buildSeedResponse(bu)); })
      .finally(() => setLoading(false));
  }, [bu]);

  const visibleCustomers = useMemo(
    () => selectedSegment
      ? (data?.customers ?? []).filter(c => c.segment === selectedSegment)
      : (data?.customers ?? []),
    [data, selectedSegment]
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

  const totals   = data?.totals   ?? { customers: 0, monetary: 0, avgMonetary: 0 };
  const segments = data?.segments ?? {} as RfmResponse["segments"];
  const topSegment = SEGMENT_ORDER.find(s => (segments[s]?.count ?? 0) > 0);

  return (
    <>
      <Header
        title="Matriz RFM — CRM Tower"
        subtitle="Segmentação de clientes por Recência, Frequência e Valor Monetário"
      />
      <div className="page-container">

        {/* BU Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={13} className="text-gray-400 shrink-0" />
          <span className="text-[11px] text-gray-500 shrink-0">Filtrar por BU:</span>
          {BUS.map(b => (
            <button
              key={b}
              onClick={() => { setBu(b); setSelectedSegment(null); }}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                bu === b
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {b}
            </button>
          ))}
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Clientes Ativos",   value: totals.customers,              icon: Users,      color: "text-blue-600",    bg: "bg-blue-50"   },
            { label: "Receita Total",      value: formatBRL(totals.monetary),    icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50"},
            { label: "Ticket Médio",       value: formatBRL(totals.avgMonetary), icon: TrendingUp, color: "text-violet-600",  bg: "bg-violet-50" },
            { label: "Seg. Principal",     value: topSegment ?? "—",             icon: Star,       color: "text-amber-600",   bg: "bg-amber-50"  },
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

        {/* Matrix + Legend */}
        <div className="card p-5">
          <SectionHeader
            icon={<Star size={14} className="text-brand-500" />}
            title="Matriz RFM — Grade de Segmentação"
          />
          <p className="text-[11px] text-gray-400 mb-4">
            Clique em uma célula para filtrar os clientes. Número dentro da célula = qtd de clientes.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <MatrixGrid
              customers={data?.customers ?? []}
              selectedSegment={selectedSegment}
              onSelect={setSelectedSegment}
            />
            <div className="flex-1 min-w-0">
              <SegmentLegend
                segments={segments}
                selectedSegment={selectedSegment}
                onSelect={setSelectedSegment}
              />
            </div>
          </div>
          {selectedSegment && (
            <p className="text-[11px] text-brand-600 mt-3">
              Filtrando por &ldquo;{selectedSegment}&rdquo; —{" "}
              <button onClick={() => setSelectedSegment(null)} className="underline">
                limpar filtro
              </button>
            </p>
          )}
        </div>

        {/* Segment cards */}
        <div>
          <SectionHeader icon={<Users size={14} className="text-brand-500" />} title="Resumo por Segmento" />
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 mt-3">
            {SEGMENT_ORDER.map(seg => {
              const meta   = SEGMENT_META_CLIENT[seg];
              const count  = segments[seg]?.count ?? 0;
              const Icon   = SEGMENT_ICON[seg];
              const active = selectedSegment === seg;
              return (
                <button
                  key={seg}
                  onClick={() => setSelectedSegment(active ? null : seg)}
                  className={`card p-3 text-left transition-all border-2 ${
                    active ? "border-brand-500 shadow-md" : "border-transparent hover:border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold shrink-0"
                      style={{ background: GRID_FILL[seg], color: GRID_TEXT[seg] }}
                    >
                      {SEG_LETTER[seg]}
                    </div>
                    <span className="text-[10px] font-semibold text-gray-700 leading-tight truncate">{seg}</span>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: meta.color }}>{count}</div>
                  <div className="text-[9px] text-gray-400">{count === 1 ? "cliente" : "clientes"}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Customer table */}
        <div className="card p-5">
          <SectionHeader
            icon={<Users size={14} className="text-emerald-500" />}
            title={`Clientes${selectedSegment ? ` — ${selectedSegment}` : ""}${bu !== "Todos" ? ` · ${bu}` : ""} (${visibleCustomers.length})`}
          />
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Cliente", "BU", "Segmento", "Recência", "Freq.", "Monetário", "R/F/M", "Total", "Responsável"].map(h => (
                    <th key={h} className="text-left py-2 pr-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleCustomers
                  .sort((a, b) => b.rfm_score - a.rfm_score)
                  .map(c => (
                    <tr key={c.account_id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-2.5 pr-3 font-medium text-gray-900 max-w-[160px]">
                        <div className="truncate">{c.account_name}</div>
                        {c.industry && <div className="text-[10px] text-gray-400 capitalize">{c.industry}</div>}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px] font-semibold">
                          {c.bu}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap"
                          style={{ background: c.segment_bg, color: c.segment_color }}
                        >
                          {SEG_LETTER[c.segment]} · {c.segment}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-gray-700 whitespace-nowrap">{c.recency_days}d</td>
                      <td className="py-2.5 pr-3 text-gray-700">{c.frequency}×</td>
                      <td className="py-2.5 pr-3 text-gray-700 font-medium whitespace-nowrap">{formatBRL(c.monetary)}</td>
                      <td className="py-2.5 pr-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1"><span className="text-[9px] text-gray-400 w-3">R</span><ScoreDot score={c.r_score} /></div>
                          <div className="flex items-center gap-1"><span className="text-[9px] text-gray-400 w-3">F</span><ScoreDot score={c.f_score} /></div>
                          <div className="flex items-center gap-1"><span className="text-[9px] text-gray-400 w-3">M</span><ScoreDot score={c.m_score} /></div>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3">
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
                {visibleCustomers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-400 text-sm">
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
              { label:"R — Recência",    desc:"Dias desde a última compra. Score 5 = comprou recentemente. Eixo horizontal da matriz.",  color:"text-blue-600"   },
              { label:"F — Frequência",  desc:"Número de compras. Score 5 = mais compras. Eixo vertical da matriz.",                     color:"text-violet-600" },
              { label:"M — Monetário",   desc:"Valor total gasto. Score 5 = maior valor. Combina com R e F para calcular o score total.", color:"text-emerald-600"},
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
