"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import { fetchCazaCRM } from "@/lib/caza-crm-query";
import type { CazaCrmLead, CazaCrmOpportunity, CazaCrmProposal } from "@/lib/caza-crm-db";
import { CAZA_PIPELINE_STAGES, CAZA_SERVICE_TYPES } from "@/lib/caza-crm-db";
import {
  BarChart3, TrendingUp, Target, DollarSign,
  CheckCircle2, XCircle, Users, FileText, Database, CloudOff,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function pct(a: number, b: number) {
  if (!b) return "0%";
  return ((a / b) * 100).toFixed(1) + "%";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";

export default function CazaCrmRelatorios() {
  const [leads,     setLeads]     = useState<CazaCrmLead[]>([]);
  const [opps,      setOpps]      = useState<CazaCrmOpportunity[]>([]);
  const [proposals, setProposals] = useState<CazaCrmProposal[]>([]);
  const [source,    setSource]    = useState<"loading" | "data" | "empty">("loading");

  useEffect(() => {
    Promise.all([
      fetchCazaCRM<CazaCrmLead>("leads"),
      fetchCazaCRM<CazaCrmOpportunity>("oportunidades"),
      fetchCazaCRM<CazaCrmProposal>("propostas"),
    ]).then(([l, o, p]) => {
      setLeads(l); setOpps(o); setProposals(p);
      setSource(l.length + o.length + p.length > 0 ? "data" : "empty");
    });
  }, []);

  // ── Computed metrics ──────────────────────────────────────────────────────

  const totalLeads      = leads.length;
  const convertedLeads  = leads.filter((l) => l.status === "Convertido").length;
  const lostLeads       = leads.filter((l) => l.status === "Perdido").length;
  const convLeadRate    = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : "0";

  const totalOpps       = opps.length;
  const ganhas          = opps.filter((o) => o.stage === "Fechado Ganho");
  const perdidas        = opps.filter((o) => o.stage === "Fechado Perdido");
  const abertas         = opps.filter((o) => o.stage !== "Fechado Ganho" && o.stage !== "Fechado Perdido");
  const valorPipeline   = abertas.reduce((s, o) => s + o.valor_estimado, 0);
  const valorGanho      = ganhas.reduce((s, o) => s + o.valor_estimado, 0);
  const totalFechadas   = ganhas.length + perdidas.length;
  const winRate         = totalFechadas > 0 ? ((ganhas.length / totalFechadas) * 100).toFixed(1) : "0";
  const ticketMedio     = ganhas.length > 0 ? Math.round(valorGanho / ganhas.length) : 0;

  const propEnviadas    = proposals.filter((p) => p.status !== "Em Elaboração").length;
  const propAprovadas   = proposals.filter((p) => p.status === "Aprovada").length;
  const propRejeitadas  = proposals.filter((p) => p.status === "Rejeitada").length;
  const valorAprovado   = proposals.filter((p) => p.status === "Aprovada").reduce((s, p) => s + p.valor_proposto, 0);
  const propRate        = propEnviadas > 0 ? ((propAprovadas / propEnviadas) * 100).toFixed(1) : "0";

  // Funil de conversão
  const funnel = [
    { label: "Leads captados",     count: totalLeads,       color: "bg-gray-400"    },
    { label: "Qualificados",       count: leads.filter((l) => l.status === "Qualificando" || l.status === "Convertido").length, color: "bg-blue-400" },
    { label: "Oportunidades",      count: totalOpps,        color: "bg-violet-400"  },
    { label: "Propostas enviadas", count: propEnviadas,     color: "bg-amber-400"   },
    { label: "Fechados ganhos",    count: ganhas.length,    color: "bg-emerald-500" },
  ];
  const funnelMax = Math.max(...funnel.map((f) => f.count), 1);

  // Pipeline por etapa
  const pipelineByStage = CAZA_PIPELINE_STAGES.map((stage) => {
    const stageOpps = opps.filter((o) => o.stage === stage);
    return {
      stage,
      count: stageOpps.length,
      valor: stageOpps.reduce((s, o) => s + o.valor_estimado, 0),
    };
  });
  const maxStageCount = Math.max(...pipelineByStage.map((s) => s.count), 1);

  // Pipeline por tipo de serviço
  const byService = CAZA_SERVICE_TYPES.map((type) => {
    const typeOpps = opps.filter((o) => o.tipo_servico === type);
    return {
      type,
      count: typeOpps.length,
      valor: typeOpps.reduce((s, o) => s + o.valor_estimado, 0),
    };
  }).filter((s) => s.count > 0).sort((a, b) => b.valor - a.valor);
  const maxServiceValor = Math.max(...byService.map((s) => s.valor), 1);

  // Origin breakdown
  const originMap = new Map<string, number>();
  leads.forEach((l) => originMap.set(l.origem, (originMap.get(l.origem) ?? 0) + 1));
  const byOrigin = Array.from(originMap.entries())
    .map(([origem, count]) => ({ origem, count }))
    .sort((a, b) => b.count - a.count);
  const maxOriginCount = Math.max(...byOrigin.map((o) => o.count), 1);

  return (
    <>
      <Header title="Relatórios CRM" subtitle="Métricas Comerciais · Caza Vision" />
      <div className="page-container">

        {/* Source badge */}
        <div className="flex items-center gap-2">
          {source === "loading" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs text-gray-500">
              <Database size={11} /> Carregando…
            </span>
          )}
          {source === "data" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-600">
              <Database size={11} /> {IS_STATIC ? "Snapshot estático" : "Base interna AWQ"}
            </span>
          )}
          {source === "empty" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700">
              <CloudOff size={11} /> Sem dados — os relatórios exigem dados operacionais
            </span>
          )}
        </div>

        {source === "empty" ? (
          <EmptyState
            title="Sem dados para relatório"
            description="Cadastre leads, abra oportunidades e registre propostas para visualizar as métricas comerciais da Caza Vision."
          />
        ) : (
          <>
            {/* KPI summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Total Leads",      value: totalLeads,     icon: Users,       color: "text-blue-600"    },
                { label: "Win Rate",         value: winRate + "%",  icon: TrendingUp,  color: "text-emerald-600" },
                { label: "Valor Ganho",      value: fmtR(valorGanho), icon: DollarSign, color: "text-emerald-600" },
                { label: "Ticket Médio",     value: fmtR(ticketMedio), icon: Target,   color: "text-brand-600"   },
                { label: "Tx. Conv. Leads",  value: convLeadRate + "%", icon: CheckCircle2, color: "text-violet-600" },
                { label: "Tx. Prop. Aprov.", value: propRate + "%", icon: FileText,    color: "text-amber-700"   },
                { label: "Pipeline Aberto",  value: fmtR(valorPipeline), icon: BarChart3, color: "text-gray-700"  },
                { label: "Leads Perdidos",   value: lostLeads,      icon: XCircle,    color: "text-red-500"     },
              ].map((k) => {
                const Icon = k.icon;
                return (
                  <div key={k.label} className="card p-4 flex items-center gap-3">
                    <Icon size={15} className={`${k.color} shrink-0`} />
                    <div>
                      <div className={`text-xl font-bold ${k.color} tabular-nums`}>{k.value}</div>
                      <div className="text-[11px] text-gray-400 font-medium">{k.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Funil de conversão + Pipeline por etapa */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

              {/* Funil */}
              <section className="card p-5 lg:p-6">
                <SectionHeader icon={<TrendingUp size={15} className="text-emerald-500" />} title="Funil de Conversão" />
                {funnel.every((f) => f.count === 0) ? (
                  <EmptyState compact title="Sem dados" description="Cadastre leads para visualizar o funil." />
                ) : (
                  <div className="space-y-3 mt-3">
                    {funnel.map((f, idx) => {
                      const w = Math.max(4, Math.round((f.count / funnelMax) * 100));
                      const convPrev = idx > 0 ? pct(f.count, funnel[idx - 1].count) : "—";
                      return (
                        <div key={f.label}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-600">{f.label}</span>
                            <div className="flex items-center gap-3">
                              {idx > 0 && <span className="text-[10px] text-gray-400">conv. {convPrev}</span>}
                              <span className="text-xs font-bold text-gray-900 tabular-nums">{f.count}</span>
                            </div>
                          </div>
                          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${f.color}`} style={{ width: `${w}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Pipeline por etapa */}
              <section className="card p-5 lg:p-6">
                <SectionHeader icon={<BarChart3 size={15} className="text-violet-500" />} title="Pipeline por Etapa" />
                {pipelineByStage.every((s) => s.count === 0) ? (
                  <EmptyState compact title="Sem oportunidades" description="Abra oportunidades para ver a distribuição por etapa." />
                ) : (
                  <div className="space-y-2.5 mt-3">
                    {pipelineByStage.map((s) => {
                      const w = Math.max(4, Math.round((s.count / maxStageCount) * 100));
                      return (
                        <div key={s.stage} className="flex items-center gap-3">
                          <div className="w-32 text-xs text-gray-500 text-right shrink-0 font-medium truncate">{s.stage}</div>
                          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-brand-500" style={{ width: `${w}%` }} />
                          </div>
                          <div className="w-6 text-xs font-bold text-gray-900 text-right shrink-0 tabular-nums">{s.count}</div>
                          <div className="w-16 text-[11px] text-gray-400 text-right shrink-0">{s.valor > 0 ? fmtR(s.valor) : ""}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            {/* Por tipo de serviço + Por origem */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

              {/* Serviço */}
              <section className="card p-5 lg:p-6">
                <SectionHeader icon={<FileText size={15} className="text-amber-500" />} title="Pipeline por Tipo de Serviço" />
                {byService.length === 0 ? (
                  <EmptyState compact title="Sem dados" description="Tipo de serviço não informado nas oportunidades." />
                ) : (
                  <div className="space-y-2.5 mt-3">
                    {byService.map((s) => {
                      const w = Math.max(4, Math.round((s.valor / maxServiceValor) * 100));
                      return (
                        <div key={s.type} className="flex items-center gap-3">
                          <div className="w-36 text-xs text-gray-500 text-right shrink-0 font-medium truncate">{s.type}</div>
                          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-amber-400" style={{ width: `${w}%` }} />
                          </div>
                          <div className="w-6 text-xs font-bold text-gray-700 text-right shrink-0 tabular-nums">{s.count}</div>
                          <div className="w-16 text-[11px] text-gray-400 text-right shrink-0">{fmtR(s.valor)}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Origem */}
              <section className="card p-5 lg:p-6">
                <SectionHeader icon={<Users size={15} className="text-blue-500" />} title="Leads por Origem" />
                {byOrigin.length === 0 ? (
                  <EmptyState compact title="Sem leads" description="Cadastre leads para ver a distribuição por origem." />
                ) : (
                  <div className="space-y-2.5 mt-3">
                    {byOrigin.map((o) => {
                      const w = Math.max(4, Math.round((o.count / maxOriginCount) * 100));
                      const share = pct(o.count, totalLeads);
                      return (
                        <div key={o.origem} className="flex items-center gap-3">
                          <div className="w-24 text-xs text-gray-500 text-right shrink-0 font-medium truncate">{o.origem || "—"}</div>
                          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-blue-400" style={{ width: `${w}%` }} />
                          </div>
                          <div className="w-6 text-xs font-bold text-gray-700 text-right shrink-0 tabular-nums">{o.count}</div>
                          <div className="w-10 text-[11px] text-gray-400 text-right shrink-0">{share}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            {/* Resumo Propostas */}
            <section className="card p-5 lg:p-6">
              <SectionHeader icon={<FileText size={15} className="text-brand-500" />} title="Resumo de Propostas" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
                {[
                  { label: "Total enviadas",  value: propEnviadas,             color: "text-gray-900"   },
                  { label: "Aprovadas",       value: propAprovadas,            color: "text-emerald-600"},
                  { label: "Rejeitadas",      value: propRejeitadas,           color: "text-red-600"    },
                  { label: "Valor aprovado",  value: fmtR(valorAprovado),      color: "text-emerald-600"},
                ].map((k) => (
                  <div key={k.label} className="text-center p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className={`text-2xl font-bold ${k.color} tabular-nums`}>{k.value}</div>
                    <div className="text-[11px] text-gray-400 mt-1 font-medium">{k.label}</div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

      </div>
    </>
  );
}
