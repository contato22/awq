"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import {
  BarChart3, TrendingUp, DollarSign, Target,
  Users, FileText, CheckCircle2, RefreshCw,
} from "lucide-react";
import { formatBRL } from "@/lib/utils";
import type { CazaCrmLead, CazaCrmOpportunity, CazaCrmProposal } from "@/lib/caza-crm-db";
import { CAZA_PIPELINE_STAGES, CAZA_SERVICE_TYPES, CAZA_LEAD_ORIGENS } from "@/lib/caza-crm-db";
import { fetchCazaCRM } from "@/lib/caza-crm-query";

const STAGE_COLORS: Record<string, string> = {
  "Lead Captado":     "bg-gray-400",
  "Qualificação":     "bg-blue-400",
  "Briefing Inicial": "bg-violet-400",
  "Proposta Enviada": "bg-amber-400",
  "Negociação":       "bg-orange-400",
  "Fechado Ganho":    "bg-emerald-500",
  "Fechado Perdido":  "bg-red-400",
};

function BarRow({ label, value, max, formatter, color }: {
  label: string; value: number; max: number; formatter: (v: number) => string; color: string;
}) {
  const w = max > 0 ? Math.max(value > 0 ? 4 : 0, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 text-[11px] text-gray-500 font-medium text-right shrink-0 truncate">{label}</div>
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${w}%` }} />
      </div>
      <div className="w-20 text-[11px] font-bold text-gray-700 text-right tabular-nums shrink-0">{formatter(value)}</div>
    </div>
  );
}

export default function CazaRelatoriosPage() {
  const [leads, setLeads]       = useState<CazaCrmLead[]>([]);
  const [opps, setOpps]         = useState<CazaCrmOpportunity[]>([]);
  const [proposals, setProposals] = useState<CazaCrmProposal[]>([]);
  const [loading, setLoading]   = useState(true);

  async function load() {
    setLoading(true);
    const [l, o, p] = await Promise.all([
      fetchCazaCRM<CazaCrmLead>("leads"),
      fetchCazaCRM<CazaCrmOpportunity>("oportunidades"),
      fetchCazaCRM<CazaCrmProposal>("propostas"),
    ]);
    setLeads(l);
    setOpps(o);
    setProposals(p);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  // ── Computed metrics ──────────────────────────────────────────────────────────

  // Pipeline by stage (count + value)
  const pipelineByStage = CAZA_PIPELINE_STAGES.map(stage => ({
    stage,
    count: opps.filter(o => o.stage === stage).length,
    valor: opps.filter(o => o.stage === stage).reduce((s, o) => s + o.valor_estimado, 0),
  }));
  const maxStageValor = Math.max(...pipelineByStage.map(r => r.valor), 1);

  // Leads por origem
  const leadsByOrigem = CAZA_LEAD_ORIGENS.map(o => ({
    origem: o,
    count: leads.filter(l => l.origem === o).length,
  })).filter(r => r.count > 0).sort((a, b) => b.count - a.count);
  const maxOrigem = Math.max(...leadsByOrigem.map(r => r.count), 1);

  // Opps por tipo de serviço (valor)
  const oppsByTipoServico = CAZA_SERVICE_TYPES.map(t => ({
    tipo: t,
    valor: opps.filter(o => o.tipo_servico === t).reduce((s, o) => s + o.valor_estimado, 0),
    count: opps.filter(o => o.tipo_servico === t).length,
  })).filter(r => r.count > 0).sort((a, b) => b.valor - a.valor);
  const maxTipoValor = Math.max(...oppsByTipoServico.map(r => r.valor), 1);

  // Conversion funnel
  const funnelLeads    = leads.length;
  const funnelConvert  = leads.filter(l => l.status === "Convertido").length;
  const funnelOpps     = opps.length;
  const funnelGanhas   = opps.filter(o => o.stage === "Fechado Ganho").length;
  const funnelProps    = proposals.length;
  const funnelAprovadas= proposals.filter(p => p.status === "Aprovada").length;
  const taxaLeadConv   = funnelLeads > 0 ? ((funnelConvert / funnelLeads) * 100).toFixed(1) : "0.0";
  const taxaOppGanha   = (funnelGanhas + opps.filter(o => o.stage === "Fechado Perdido").length) > 0
    ? ((funnelGanhas / (funnelGanhas + opps.filter(o => o.stage === "Fechado Perdido").length)) * 100).toFixed(1)
    : "0.0";
  const taxaPropAprov  = funnelProps > 0 ? ((funnelAprovadas / funnelProps) * 100).toFixed(1) : "0.0";

  // Revenue summary
  const valorPipeline   = opps.filter(o => o.stage !== "Fechado Perdido").reduce((s, o) => s + o.valor_estimado, 0);
  const valorGanho      = opps.filter(o => o.stage === "Fechado Ganho").reduce((s, o) => s + o.valor_estimado, 0);
  const valorAprovado   = proposals.filter(p => p.status === "Aprovada").reduce((s, p) => s + p.valor_proposto, 0);
  const ticketMedio     = funnelGanhas > 0 ? Math.round(valorGanho / funnelGanhas) : 0;

  return (
    <>
      <Header title="Relatórios — CRM Caza Vision" subtitle="Análise de performance comercial" />
      <div className="page-container">

        <div className="flex items-center justify-between">
          <button onClick={() => void load()} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-gray-400">
              <div className="w-5 h-5 border-2 border-gray-200 border-t-emerald-500 rounded-full animate-spin" />
              <span className="text-sm font-medium">Carregando…</span>
            </div>
          </div>
        ) : (
          <>
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Users,       label: "Leads total",    value: String(funnelLeads),      color: "bg-blue-50",    tc: "text-blue-600"    },
                { icon: Target,      label: "Oportunidades",  value: String(funnelOpps),       color: "bg-violet-50",  tc: "text-violet-600"  },
                { icon: DollarSign,  label: "Valor pipeline", value: formatBRL(valorPipeline), color: "bg-amber-50",   tc: "text-amber-600"   },
                { icon: CheckCircle2,label: "Valor fechado",  value: formatBRL(valorGanho),    color: "bg-emerald-50", tc: "text-emerald-600" },
              ].map(k => (
                <div key={k.label} className="card p-4 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl ${k.color} flex items-center justify-center shrink-0`}>
                    <k.icon size={16} className={k.tc} />
                  </div>
                  <div>
                    <div className="text-xl font-bold text-gray-900 tabular-nums">{k.value}</div>
                    <div className="text-[10px] text-gray-500">{k.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Conversion funnel + Revenue */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

              {/* Conversion funnel */}
              <section className="card p-5">
                <SectionHeader icon={<TrendingUp size={15} className="text-emerald-500" />} title="Funil de Conversão" />
                <div className="mt-4 space-y-3">
                  {[
                    { label: "Leads totais",      val: funnelLeads,    sub: null,              bg: "bg-blue-500",    w: 100 },
                    { label: "Leads convertidos", val: funnelConvert,  sub: `${taxaLeadConv}%`,bg: "bg-violet-500",  w: funnelLeads > 0 ? Math.round((funnelConvert / funnelLeads) * 100) : 0 },
                    { label: "Oportunidades",     val: funnelOpps,     sub: null,              bg: "bg-amber-500",   w: funnelLeads > 0 ? Math.round((funnelOpps / funnelLeads) * 100) : 0 },
                    { label: "Fechado Ganho",     val: funnelGanhas,   sub: `${taxaOppGanha}%`,bg: "bg-emerald-500", w: funnelOpps > 0 ? Math.round((funnelGanhas / funnelOpps) * 100) : 0 },
                    { label: "Propostas enviadas",val: funnelProps,    sub: null,              bg: "bg-indigo-500",  w: funnelOpps > 0 ? Math.round((funnelProps / funnelOpps) * 100) : 0 },
                    { label: "Propostas aprovadas",val: funnelAprovadas,sub: `${taxaPropAprov}%`,bg: "bg-teal-500", w: funnelProps > 0 ? Math.round((funnelAprovadas / funnelProps) * 100) : 0 },
                  ].map(f => (
                    <div key={f.label} className="flex items-center gap-3">
                      <div className="w-36 text-[11px] text-gray-500 font-medium text-right shrink-0">{f.label}</div>
                      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${f.bg}`} style={{ width: `${f.w}%` }} />
                      </div>
                      <div className="w-8 text-[11px] font-bold text-gray-800 tabular-nums text-right shrink-0">{f.val}</div>
                      {f.sub && <div className="w-10 text-[10px] text-gray-400 text-right shrink-0">{f.sub}</div>}
                    </div>
                  ))}
                </div>
              </section>

              {/* Revenue breakdown */}
              <section className="card p-5">
                <SectionHeader icon={<DollarSign size={15} className="text-amber-500" />} title="Resumo Financeiro" />
                <div className="mt-4 space-y-3">
                  {[
                    { label: "Pipeline total",    value: valorPipeline,  color: "bg-amber-400"   },
                    { label: "Receita fechada",   value: valorGanho,     color: "bg-emerald-500" },
                    { label: "Propostas aprov.",  value: valorAprovado,  color: "bg-teal-500"    },
                    { label: "Ticket médio",      value: ticketMedio,    color: "bg-blue-400"    },
                  ].map(r => {
                    const maxVal = Math.max(valorPipeline, 1);
                    const w = Math.max(r.value > 0 ? 6 : 0, Math.round((r.value / maxVal) * 100));
                    return (
                      <div key={r.label} className="flex items-center gap-3">
                        <div className="w-32 text-[11px] text-gray-500 font-medium text-right shrink-0">{r.label}</div>
                        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${r.color}`} style={{ width: `${w}%` }} />
                        </div>
                        <div className="w-24 text-[11px] font-bold text-gray-800 text-right tabular-nums shrink-0">{formatBRL(r.value)}</div>
                      </div>
                    );
                  })}
                </div>
                {proposals.length === 0 && opps.length === 0 && (
                  <EmptyState compact title="Sem dados" description="Crie leads e oportunidades para ver métricas financeiras." />
                )}
              </section>
            </div>

            {/* Pipeline por estágio */}
            <section className="card p-5">
              <SectionHeader icon={<BarChart3 size={15} className="text-violet-500" />} title="Pipeline por Estágio — Valor (R$)" />
              {pipelineByStage.some(r => r.count > 0) ? (
                <div className="mt-4 space-y-2.5">
                  {pipelineByStage.filter(r => r.count > 0).map(r => (
                    <BarRow
                      key={r.stage}
                      label={r.stage}
                      value={r.valor}
                      max={maxStageValor}
                      formatter={formatBRL}
                      color={STAGE_COLORS[r.stage] ?? "bg-gray-400"}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState compact title="Sem oportunidades" description="Crie oportunidades para visualizar o pipeline." />
              )}
            </section>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {/* Leads por origem */}
              <section className="card p-5">
                <SectionHeader icon={<Users size={15} className="text-blue-500" />} title="Leads por Origem" />
                {leadsByOrigem.length > 0 ? (
                  <div className="mt-4 space-y-2.5">
                    {leadsByOrigem.map(r => (
                      <BarRow
                        key={r.origem}
                        label={r.origem}
                        value={r.count}
                        max={maxOrigem}
                        formatter={v => String(v)}
                        color="bg-blue-400"
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState compact title="Sem leads" description="Adicione leads para ver análise por origem." />
                )}
              </section>

              {/* Opps por tipo de serviço */}
              <section className="card p-5">
                <SectionHeader icon={<FileText size={15} className="text-orange-500" />} title="Oportunidades por Serviço" />
                {oppsByTipoServico.length > 0 ? (
                  <div className="mt-4 space-y-2.5">
                    {oppsByTipoServico.map(r => (
                      <BarRow
                        key={r.tipo}
                        label={r.tipo}
                        value={r.valor}
                        max={maxTipoValor}
                        formatter={formatBRL}
                        color="bg-orange-400"
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState compact title="Sem dados" description="Crie oportunidades para ver análise por serviço." />
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </>
  );
}
