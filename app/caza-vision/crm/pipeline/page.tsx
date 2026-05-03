"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import EmptyState from "@/components/EmptyState";
import { RefreshCw, DollarSign } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import type { CazaCrmOpportunity } from "@/lib/caza-crm-db";
import { CAZA_PIPELINE_STAGES } from "@/lib/caza-crm-db";
import { fetchCazaCRM } from "@/lib/caza-crm-query";

const STAGE_HEADER_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "Lead Captado":     { bg: "bg-gray-100",   text: "text-gray-700",   dot: "bg-gray-400"   },
  "Qualificação":     { bg: "bg-blue-50",    text: "text-blue-700",   dot: "bg-blue-500"   },
  "Briefing Inicial": { bg: "bg-violet-50",  text: "text-violet-700", dot: "bg-violet-500" },
  "Proposta Enviada": { bg: "bg-amber-50",   text: "text-amber-700",  dot: "bg-amber-500"  },
  "Negociação":       { bg: "bg-orange-50",  text: "text-orange-700", dot: "bg-orange-500" },
  "Fechado Ganho":    { bg: "bg-emerald-50", text: "text-emerald-700",dot: "bg-emerald-500"},
  "Fechado Perdido":  { bg: "bg-red-50",     text: "text-red-700",    dot: "bg-red-400"    },
};

const RISCO_DOT: Record<string, string> = {
  "Baixo": "bg-emerald-500", "Médio": "bg-amber-500", "Alto": "bg-red-500",
};

function OppCard({ opp, onStageChange }: { opp: CazaCrmOpportunity; onStageChange: (id: string, stage: string) => void }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-1 mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold text-gray-900 leading-tight truncate">{opp.nome_oportunidade}</div>
          <div className="text-[10px] text-gray-500 mt-0.5 truncate">{opp.empresa}</div>
        </div>
        <div className={`w-2 h-2 rounded-full shrink-0 mt-1 ${RISCO_DOT[opp.risco] ?? "bg-gray-400"}`} title={`Risco ${opp.risco}`} />
      </div>
      <div className="flex items-center gap-2 mb-2">
        <DollarSign size={10} className="text-gray-400 shrink-0" />
        <span className="text-[11px] font-bold text-gray-800 tabular-nums">{formatBRL(opp.valor_estimado)}</span>
        <span className="text-[10px] text-gray-400 ml-auto">{opp.probabilidade}%</span>
      </div>
      {opp.proxima_acao && (
        <div className="text-[10px] text-gray-500 bg-gray-50 rounded-lg px-2 py-1 truncate mb-2">
          {opp.proxima_acao}
        </div>
      )}
      <div className="flex items-center justify-between mt-1">
        <span className="text-[10px] text-gray-400">{opp.owner || "—"}</span>
        <select
          value={opp.stage}
          onChange={e => onStageChange(opp.id, e.target.value)}
          onClick={e => e.stopPropagation()}
          className="text-[10px] px-1.5 py-0.5 border border-gray-200 rounded-md bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-emerald-400"
        >
          {CAZA_PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
    </div>
  );
}

export default function CazaPipelinePage() {
  const [opps, setOpps]       = useState<CazaCrmOpportunity[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const data = await fetchCazaCRM<CazaCrmOpportunity>("oportunidades");
    setOpps(data);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function handleStageChange(id: string, stage: string) {
    setOpps(prev => prev.map(o => o.id === id ? { ...o, stage: stage as typeof CAZA_PIPELINE_STAGES[number] } : o));
    try {
      await fetch("/api/caza/crm/oportunidades", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, stage }),
      });
    } catch {
      void load();
    }
  }

  const totalPipeline = opps.filter(o => o.stage !== "Fechado Perdido").reduce((s, o) => s + o.valor_estimado, 0);

  return (
    <>
      <Header
        title="Pipeline — CRM Caza Vision"
        subtitle={`${opps.filter(o => o.stage !== "Fechado Ganho" && o.stage !== "Fechado Perdido").length} oportunidades abertas · ${formatBRL(totalPipeline)} no pipeline`}
      />
      <div className="page-container">

        <div className="flex items-center justify-between">
          <button onClick={() => void load()} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <div className="text-xs text-gray-500">
            {opps.length} oportunidade{opps.length !== 1 ? "s" : ""} · Pipeline: {formatBRL(totalPipeline)}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-gray-400">
              <div className="w-5 h-5 border-2 border-gray-200 border-t-emerald-500 rounded-full animate-spin" />
              <span className="text-sm font-medium">Carregando…</span>
            </div>
          </div>
        ) : opps.length === 0 ? (
          <EmptyState
            title="Pipeline vazio"
            description="Crie oportunidades na aba Oportunidades para visualizá-las aqui."
          />
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-3 min-w-max">
              {CAZA_PIPELINE_STAGES.map(stage => {
                const col   = STAGE_HEADER_COLORS[stage] ?? STAGE_HEADER_COLORS["Lead Captado"];
                const items = opps.filter(o => o.stage === stage);
                const total = items.reduce((s, o) => s + o.valor_estimado, 0);
                return (
                  <div key={stage} className="w-60 flex-shrink-0">
                    {/* Column header */}
                    <div className={`rounded-xl px-3 py-2.5 mb-2 ${col.bg} flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                        <span className={`text-[11px] font-bold ${col.text} truncate max-w-[120px]`}>{stage}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] font-semibold ${col.text} opacity-70`}>{items.length}</span>
                        {total > 0 && (
                          <span className={`text-[10px] ${col.text} opacity-60 tabular-nums`}>{formatBRL(total)}</span>
                        )}
                      </div>
                    </div>
                    {/* Cards */}
                    <div className="space-y-2 min-h-[60px]">
                      {items.length === 0 ? (
                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
                          <span className="text-[10px] text-gray-300">Sem oportunidades</span>
                        </div>
                      ) : (
                        items.map(o => (
                          <OppCard key={o.id} opp={o} onStageChange={(id, s) => void handleStageChange(id, s)} />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
