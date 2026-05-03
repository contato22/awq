"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import {
  Users, Target, TrendingUp, DollarSign,
  BarChart3, MessageSquare, FileText, ChevronRight,
  Database, CloudOff, CheckCircle2, XCircle,
} from "lucide-react";
import { formatBRL } from "@/lib/utils";
import { CAZA_PIPELINE_STAGES } from "@/lib/caza-crm-db";

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/awq";

type StageRow = { stage: string; count: number; valor: number };
type InteracaoRecente = {
  id: string; tipo: string; descricao: string;
  owner: string; data: string; entidade_tipo: string; entidade_id: string;
};
type StatsPayload = {
  leads_total: number; leads_ativos: number;
  opps_abertas: number; opps_ganhas: number; opps_perdidas: number;
  valor_pipeline: number; valor_ganho: number;
  propostas_enviadas: number; propostas_aprovadas: number;
  taxa_conversao: number; ticket_medio_pipeline: number;
  pipeline_by_stage: StageRow[];
  interacoes_recentes: InteracaoRecente[];
  source: string;
};

async function loadStats(): Promise<StatsPayload | null> {
  if (!IS_STATIC) {
    try {
      const res = await fetch("/api/caza/crm/stats");
      if (res.ok) {
        const data = await res.json() as StatsPayload;
        if (data?.source === "internal") return data;
      }
    } catch { /* fall through */ }
  }
  try {
    const res = await fetch(`${BASE_PATH}/data/caza-crm-stats.json`);
    if (res.ok) return await res.json() as StatsPayload;
  } catch { /* ignore */ }
  return null;
}

const STAGE_COLORS: Record<string, string> = {
  "Lead Captado":     "bg-gray-400",
  "Qualificação":     "bg-blue-400",
  "Briefing Inicial": "bg-violet-400",
  "Proposta Enviada": "bg-amber-400",
  "Negociação":       "bg-orange-400",
  "Fechado Ganho":    "bg-emerald-500",
  "Fechado Perdido":  "bg-red-400",
};

function KpiCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center shrink-0`}>
        <Icon size={16} className="text-white" />
      </div>
      <div>
        <div className="text-xl font-bold text-gray-900 tabular-nums">{value}</div>
        <div className="text-[10px] text-gray-500 font-medium">{label}</div>
        {sub && <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export default function CazaCrmPage() {
  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats().then(s => { setStats(s); setLoading(false); });
  }, []);

  const s = stats;
  const pipelineStages = s?.pipeline_by_stage ?? [];
  const interactions   = s?.interacoes_recentes ?? [];
  const maxValor       = Math.max(...pipelineStages.map(r => r.valor), 1);

  return (
    <>
      <Header title="CRM — Caza Vision" subtitle="Gestão comercial · Leads · Oportunidades · Propostas" />
      <div className="page-container">

        {/* Source badge */}
        {!loading && (
          <div className="flex items-center gap-2">
            {s?.source === "internal" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-600">
                <Database size={11} /> Base interna AWQ
              </span>
            )}
            {(s?.source === "static" || !s) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700">
                <CloudOff size={11} /> Snapshot estático — adicione leads para começar
              </span>
            )}
          </div>
        )}

        {/* Quick nav */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Leads",        href: "/caza-vision/crm/leads",         icon: Users,       color: "bg-blue-500"    },
            { label: "Oportunidades",href: "/caza-vision/crm/oportunidades",  icon: Target,      color: "bg-violet-500"  },
            { label: "Pipeline",     href: "/caza-vision/crm/pipeline",       icon: BarChart3,   color: "bg-amber-500"   },
            { label: "Propostas",    href: "/caza-vision/crm/propostas",      icon: FileText,    color: "bg-emerald-500" },
          ].map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="card card-hover p-4 flex items-center gap-3 group"
            >
              <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center shrink-0`}>
                <item.icon size={15} className="text-white" />
              </div>
              <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 flex-1">{item.label}</span>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500" />
            </Link>
          ))}
        </div>

        {/* KPI Row */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card p-4 animate-pulse h-20 bg-gray-50" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard icon={Users}       label="Leads total"      value={String(s?.leads_total ?? 0)}   sub={`${s?.leads_ativos ?? 0} ativos`}   color="bg-blue-500" />
              <KpiCard icon={Target}      label="Opps abertas"     value={String(s?.opps_abertas ?? 0)}  sub={`${s?.opps_ganhas ?? 0} ganhas`}    color="bg-violet-500" />
              <KpiCard icon={DollarSign}  label="Valor pipeline"   value={formatBRL(s?.valor_pipeline ?? 0)} sub={`ticket médio ${formatBRL(s?.ticket_medio_pipeline ?? 0)}`} color="bg-amber-500" />
              <KpiCard icon={TrendingUp}  label="Receita fechada"  value={formatBRL(s?.valor_ganho ?? 0)} sub={`taxa conv. ${s?.taxa_conversao ?? 0}%`} color="bg-emerald-500" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard icon={CheckCircle2} label="Opps ganhas"     value={String(s?.opps_ganhas ?? 0)}         color="bg-emerald-500" />
              <KpiCard icon={XCircle}      label="Opps perdidas"   value={String(s?.opps_perdidas ?? 0)}       color="bg-red-400" />
              <KpiCard icon={FileText}     label="Propostas env."  value={String(s?.propostas_enviadas ?? 0)}  color="bg-indigo-500" />
              <KpiCard icon={CheckCircle2} label="Propostas aprov."value={String(s?.propostas_aprovadas ?? 0)} color="bg-teal-500" />
            </div>
          </>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Pipeline por estágio */}
          <section className="card p-5">
            <SectionHeader
              icon={<BarChart3 size={15} className="text-amber-500" />}
              title="Pipeline por Estágio"
              linkLabel="Ver Pipeline"
              linkHref="/caza-vision/crm/pipeline"
            />
            {pipelineStages.length > 0 ? (
              <div className="space-y-2.5 mt-3">
                {CAZA_PIPELINE_STAGES.map(stage => {
                  const row = pipelineStages.find(r => r.stage === stage) ?? { stage, count: 0, valor: 0 };
                  const w   = maxValor > 0 ? Math.max(row.valor > 0 ? 6 : 0, Math.round((row.valor / maxValor) * 100)) : 0;
                  return (
                    <div key={stage} className="flex items-center gap-3">
                      <div className="w-32 text-[11px] text-gray-500 font-medium text-right shrink-0 truncate">{stage}</div>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${STAGE_COLORS[stage] ?? "bg-gray-400"}`} style={{ width: `${w}%` }} />
                      </div>
                      <div className="w-6 text-[11px] font-bold text-gray-700 text-right tabular-nums shrink-0">{row.count}</div>
                      <div className="w-20 text-[11px] text-gray-400 text-right tabular-nums shrink-0">{formatBRL(row.valor)}</div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState compact title="Pipeline vazio" description="Crie oportunidades para visualizar o pipeline." />
            )}
          </section>

          {/* Interações recentes */}
          <section className="card p-5">
            <SectionHeader
              icon={<MessageSquare size={15} className="text-blue-500" />}
              title="Interações Recentes"
            />
            {interactions.length > 0 ? (
              <div className="space-y-2 mt-3">
                {interactions.slice(0, 8).map(i => (
                  <div key={i.id} className="flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-gray-50">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                      <MessageSquare size={11} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-gray-800 truncate">{i.descricao}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-400">{i.tipo}</span>
                        <span className="text-[10px] text-gray-300">·</span>
                        <span className="text-[10px] text-gray-400">{i.owner}</span>
                        <span className="text-[10px] text-gray-300">·</span>
                        <span className="text-[10px] text-gray-400">{i.data}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState compact title="Sem interações" description="Registre interações nos leads e oportunidades." />
            )}
          </section>
        </div>

      </div>
    </>
  );
}
