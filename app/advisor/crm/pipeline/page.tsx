"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import Link from "next/link";
import { BarChart3, ArrowLeft } from "lucide-react";
import { fetchAdvisorCRM } from "@/lib/advisor-crm-query";
import type { AdvisorCrmOpportunity } from "@/lib/advisor-crm-db";

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

const STAGES = [
  { key: "Prospecção",  color: "border-gray-600",   bg: "bg-gray-800/60",    badge: "text-gray-400 bg-gray-500/10",    prob: 20 },
  { key: "Diagnóstico", color: "border-blue-700",   bg: "bg-blue-900/20",   badge: "text-blue-400 bg-blue-500/10",    prob: 40 },
  { key: "Proposta",    color: "border-amber-700",  bg: "bg-amber-900/20",  badge: "text-amber-400 bg-amber-500/10",  prob: 60 },
  { key: "Negociação",  color: "border-orange-700", bg: "bg-orange-900/20", badge: "text-orange-400 bg-orange-500/10",prob: 75 },
];

const RISK_COLORS: Record<string, string> = {
  "Alto":  "text-red-400",
  "Médio": "text-amber-400",
  "Baixo": "text-emerald-400",
};

export default function AdvisorCrmPipelinePage() {
  const [opps,    setOpps]    = useState<AdvisorCrmOpportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdvisorCRM<AdvisorCrmOpportunity>("opportunities").then((data) => {
      setOpps(data.filter(o => !o.stage.startsWith("Fechado")));
      setLoading(false);
    });
  }, []);

  const totalPipeline = opps.reduce((s, o) => s + o.valor_estimado, 0);
  const weightedPipeline = opps.reduce((s, o) => s + o.valor_estimado * o.probabilidade / 100, 0);

  return (
    <>
      <Header title="Pipeline Kanban — Advisor" subtitle="Visualização por estágio" />
      <div className="page-container">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/advisor/crm" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300">
              <ArrowLeft size={12} /> CRM
            </Link>
            <span className="text-gray-700">/</span>
            <span className="text-xs text-gray-400">Pipeline</span>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-gray-500">Total: <span className="font-semibold text-amber-400">{fmtCurrency(totalPipeline)}</span></span>
            <span className="text-gray-500">Ponderado: <span className="font-semibold text-emerald-400">{fmtCurrency(Math.round(weightedPipeline))}</span></span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-500 text-sm">
            <div className="w-4 h-4 border-2 border-gray-600 border-t-brand-400 rounded-full animate-spin mr-3" />
            Carregando pipeline…
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {STAGES.map((stage) => {
              const stageOpps = opps.filter(o => o.stage === stage.key);
              const stageTotal = stageOpps.reduce((s, o) => s + o.valor_estimado, 0);
              return (
                <div key={stage.key} className={`rounded-xl border ${stage.color} ${stage.bg} p-4 min-h-[300px]`}>
                  {/* Stage header */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${stage.badge}`}>
                        {stage.key}
                      </span>
                      <div className="text-[10px] text-gray-600 mt-1">{stage.prob}% prob.</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-bold text-gray-300">{fmtCurrency(stageTotal)}</div>
                      <div className="text-[10px] text-gray-600">{stageOpps.length} opp{stageOpps.length !== 1 ? "s" : ""}</div>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2">
                    {stageOpps.length === 0 ? (
                      <EmptyState compact icon={null} title="Sem oportunidades" description="" />
                    ) : (
                      stageOpps.map((o) => (
                        <div key={o.id} className="bg-gray-900/60 border border-gray-700/50 rounded-lg p-3 space-y-1.5 hover:border-gray-600 transition-colors">
                          <div className="text-[11px] font-semibold text-gray-200 leading-snug">{o.nome_oportunidade}</div>
                          <div className="text-[10px] text-gray-600">{o.empresa}</div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-amber-400">{fmtCurrency(o.valor_estimado)}</span>
                            <span className={`text-[10px] font-medium ${RISK_COLORS[o.risco] ?? "text-gray-400"}`}>● {o.risco}</span>
                          </div>
                          {o.proxima_acao && (
                            <div className="text-[10px] text-gray-600 truncate">→ {o.proxima_acao}</div>
                          )}
                          {o.data_proxima_acao && (
                            <div className="text-[10px] text-gray-700">{fmtDate(o.data_proxima_acao)}</div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
