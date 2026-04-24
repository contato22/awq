"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import Link from "next/link";
import {
  Users, Target, FileText, TrendingUp, DollarSign,
  BarChart3, CheckCircle2, XCircle, Clock, Database,
  CloudOff, ArrowRight, MessageSquare, Percent,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CrmStats {
  leads_total: number;
  leads_ativos: number;
  opps_abertas: number;
  opps_ganhas: number;
  opps_perdidas: number;
  valor_pipeline: number;
  valor_ganho: number;
  propostas_enviadas: number;
  propostas_aprovadas: number;
  taxa_conversao: number;
  ticket_medio_pipeline: number;
  pipeline_by_stage: { stage: string; count: number; valor: number }[];
  interacoes_recentes: {
    id: string; tipo: string; descricao: string;
    owner: string; data: string; entidade_tipo: string; entidade_id: string;
  }[];
  source: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function fmtDate(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// ─── Stage colors ─────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  "Lead Captado":    "bg-gray-400",
  "Qualificação":    "bg-blue-400",
  "Briefing Inicial":"bg-violet-400",
  "Proposta Enviada":"bg-amber-400",
  "Negociação":      "bg-orange-400",
  "Fechado Ganho":   "bg-emerald-500",
  "Fechado Perdido": "bg-red-400",
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/awq";

async function loadStats(): Promise<CrmStats | null> {
  if (!IS_STATIC) {
    try {
      const res = await fetch("/api/caza/crm/stats");
      if (res.ok) return await res.json() as CrmStats;
    } catch { /* fall through */ }
  }
  try {
    const res = await fetch(`${BASE_PATH}/data/caza-crm-stats.json`);
    if (res.ok) return await res.json() as CrmStats;
  } catch { /* ignore */ }
  return null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CazaCrmOverview() {
  const [stats,   setStats]   = useState<CrmStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats().then((s) => { setStats(s); setLoading(false); });
  }, []);

  const isEmpty  = !stats || stats.source === "empty";
  const pipeline = stats?.pipeline_by_stage ?? [];
  const recent   = stats?.interacoes_recentes ?? [];
  const maxCount = Math.max(...pipeline.map((s) => s.count), 1);

  return (
    <>
      <Header title="CRM — Visão Geral" subtitle="Gestão Comercial · Caza Vision" />
      <div className="page-container">

        {/* Source badge */}
        {!loading && (
          <div className="flex items-center gap-2">
            {stats?.source === "internal" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-600">
                <Database size={11} /> Base interna AWQ
              </span>
            )}
            {(stats?.source === "static") && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs text-blue-600">
                <Database size={11} /> Snapshot estático
              </span>
            )}
            {(isEmpty) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700">
                <CloudOff size={11} /> CRM vazio — cadastre o primeiro lead
              </span>
            )}
          </div>
        )}

        {/* KPI grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Leads Ativos",       value: stats?.leads_ativos ?? 0,        icon: Users,       color: "text-blue-600",    bg: "bg-blue-50",    href: "/caza-vision/crm/leads"        },
            { label: "Oportunidades Abertas", value: stats?.opps_abertas ?? 0,     icon: Target,      color: "text-violet-600",  bg: "bg-violet-50",  href: "/caza-vision/crm/oportunidades" },
            { label: "Valor Pipeline",     value: fmtR(stats?.valor_pipeline ?? 0),icon: DollarSign,  color: "text-emerald-600", bg: "bg-emerald-50", href: "/caza-vision/crm/pipeline"      },
            { label: "Propostas Enviadas", value: stats?.propostas_enviadas ?? 0,   icon: FileText,    color: "text-amber-700",   bg: "bg-amber-50",   href: "/caza-vision/crm/propostas"    },
          ].map((k) => {
            const Icon = k.icon;
            return (
              <Link key={k.label} href={k.href}
                className="card card-hover p-4 flex items-start gap-3 group">
                <div className={`w-9 h-9 rounded-lg ${k.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={16} className={k.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-2xl font-bold text-gray-900 tabular-nums tracking-tight">
                    {typeof k.value === "number" ? k.value.toLocaleString("pt-BR") : k.value}
                  </div>
                  <div className="text-xs font-medium text-gray-500 mt-0.5">{k.label}</div>
                </div>
                <ArrowRight size={13} className="text-gray-300 group-hover:text-gray-500 shrink-0 mt-1" />
              </Link>
            );
          })}
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Ganhos",          value: stats?.opps_ganhas ?? 0,          icon: CheckCircle2, color: "text-emerald-600" },
            { label: "Perdidos",        value: stats?.opps_perdidas ?? 0,         icon: XCircle,      color: "text-red-500"     },
            { label: "Taxa Conversão",  value: (stats?.taxa_conversao ?? 0) + "%",icon: Percent,      color: "text-brand-600"   },
            { label: "Ticket Médio",    value: fmtR(stats?.ticket_medio_pipeline ?? 0), icon: TrendingUp, color: "text-amber-700" },
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

        {/* Pipeline funil + Interações recentes */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          {/* Funil por etapa */}
          <section className="card p-5 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <SectionHeader icon={<BarChart3 size={15} className="text-violet-500" />} title="Pipeline por Etapa" />
              <Link href="/caza-vision/crm/pipeline"
                className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                Ver pipeline <ArrowRight size={11} />
              </Link>
            </div>
            {pipeline.every((s) => s.count === 0) ? (
              <EmptyState compact title="Pipeline vazio" description="Cadastre leads e abra oportunidades para preencher o funil." />
            ) : (
              <div className="space-y-2.5">
                {pipeline.map((s) => {
                  const color = STAGE_COLORS[s.stage] ?? "bg-gray-400";
                  const w     = Math.max(4, Math.round((s.count / maxCount) * 100));
                  return (
                    <div key={s.stage} className="flex items-center gap-3">
                      <div className="w-32 text-xs text-gray-500 text-right shrink-0 font-medium truncate">{s.stage}</div>
                      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${w}%` }} />
                      </div>
                      <div className="w-6 text-xs font-bold text-gray-900 text-right shrink-0 tabular-nums">{s.count}</div>
                      <div className="w-16 text-[11px] text-gray-400 text-right shrink-0">{s.valor > 0 ? fmtR(s.valor) : ""}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Atividade recente */}
          <section className="card p-5 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <SectionHeader icon={<MessageSquare size={15} className="text-brand-500" />} title="Atividade Recente" />
              <Link href="/caza-vision/crm/leads"
                className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                Ver leads <ArrowRight size={11} />
              </Link>
            </div>
            {recent.length === 0 ? (
              <EmptyState compact title="Sem atividades" description="As interações registradas aparecerão aqui." icon={<Clock size={18} className="text-gray-400" />} />
            ) : (
              <div className="space-y-2">
                {recent.map((i) => (
                  <div key={i.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="w-2 h-2 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-800 truncate">{i.descricao}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-2">
                        <span className="font-semibold text-brand-600">{i.tipo}</span>
                        {i.owner && <span>{i.owner}</span>}
                        <span>{fmtDate(i.data)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Quick access */}
        <section className="card p-5">
          <SectionHeader title="Acesso Rápido" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-2">
            {[
              { label: "Leads",         href: "/caza-vision/crm/leads",         icon: Users       },
              { label: "Pipeline",      href: "/caza-vision/crm/pipeline",       icon: TrendingUp  },
              { label: "Oportunidades", href: "/caza-vision/crm/oportunidades",  icon: Target      },
              { label: "Propostas",     href: "/caza-vision/crm/propostas",      icon: FileText    },
              { label: "Carteira",      href: "/caza-vision/clientes",           icon: BarChart3   },
              { label: "Relatórios",    href: "/caza-vision/crm/relatorios",     icon: TrendingUp  },
            ].map((a) => {
              const Icon = a.icon;
              return (
                <Link key={a.href} href={a.href}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-all group">
                  <Icon size={18} className="text-gray-400 group-hover:text-brand-600 transition-colors" />
                  <span className="text-[11px] font-medium text-gray-500 group-hover:text-brand-700">{a.label}</span>
                </Link>
              );
            })}
          </div>
        </section>

      </div>
    </>
  );
}
