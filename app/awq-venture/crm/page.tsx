"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import Link from "next/link";
import {
  Zap, Target, DollarSign, TrendingUp, Activity,
  CheckCircle2, Clock, BarChart3, Users, Search,
} from "lucide-react";
import { fetchVentureCRM } from "@/lib/venture-crm-query";
import type { VentureCrmDeal, VentureCrmLead, VentureCrmInteraction } from "@/lib/venture-crm-db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  if (n >= 1_000_000_000) return "R$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

const STAGE_COLORS: Record<string, { badge: string; dot: string }> = {
  "Triagem":       { badge: "text-gray-400 bg-gray-500/10",    dot: "bg-gray-400"    },
  "Prospecção":    { badge: "text-amber-400 bg-amber-500/10",  dot: "bg-amber-400"   },
  "Due Diligence": { badge: "text-blue-400 bg-blue-500/10",    dot: "bg-blue-400"    },
  "Term Sheet":    { badge: "text-emerald-400 bg-emerald-500/10", dot: "bg-emerald-400" },
  "Fechado":       { badge: "text-brand-400 bg-brand-500/10",  dot: "bg-brand-400"   },
  "Descartado":    { badge: "text-red-400 bg-red-500/10",      dot: "bg-red-400"     },
};

const PRIO_COLORS: Record<string, string> = {
  "Alta":  "text-red-400 bg-red-500/10",
  "Média": "text-amber-400 bg-amber-500/10",
  "Baixa": "text-gray-400 bg-gray-500/10",
};

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  sub?: string;
}

function KpiCard({ label, value, icon: Icon, iconColor, iconBg, sub }: KpiCardProps) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon size={16} className={iconColor} />
      </div>
      <div className="min-w-0">
        <div className="text-lg font-bold text-white leading-tight">{value}</div>
        <div className="text-[10px] text-gray-500 mt-0.5 truncate">{label}</div>
        {sub && <div className="text-[10px] text-gray-600 truncate">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VentureCrmPage() {
  const [deals,   setDeals]   = useState<VentureCrmDeal[]>([]);
  const [leads,   setLeads]   = useState<VentureCrmLead[]>([]);
  const [ints,    setInts]    = useState<VentureCrmInteraction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchVentureCRM<VentureCrmDeal>("deals"),
      fetchVentureCRM<VentureCrmLead>("leads"),
      fetchVentureCRM<VentureCrmInteraction>("interactions"),
    ]).then(([d, l, i]) => {
      setDeals(d); setLeads(l); setInts(i);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <>
        <Header title="CRM — AWQ Venture" subtitle="Carregando..." />
        <div className="page-container">
          <div className="card p-8 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-gray-600 border-t-brand-400 rounded-full animate-spin" />
          </div>
        </div>
      </>
    );
  }

  const TODAY       = new Date().toISOString().slice(0, 10);
  const TODAY_PLUS7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const activeDeals   = deals.filter(d => !["Fechado", "Descartado"].includes(d.stage));
  const ticketTotal   = activeDeals.reduce((s, d) => s + d.ticket_midia, 0);
  const fechados      = deals.filter(d => d.stage === "Fechado");

  const topDeals = [...activeDeals].sort((a, b) => b.score - a.score).slice(0, 5);

  const dealsCriticos = activeDeals.filter(d =>
    d.priority === "Alta" ||
    (d.data_proxima_acao && d.data_proxima_acao <= TODAY_PLUS7)
  ).slice(0, 5);

  const ultimasInteracoes = [...ints].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 4);

  const PIPELINE_STAGES = ["Triagem", "Prospecção", "Due Diligence", "Term Sheet"];
  const pipelineByStage = PIPELINE_STAGES.map(stage => ({
    stage,
    count: activeDeals.filter(d => d.stage === stage).length,
    ticket: activeDeals.filter(d => d.stage === stage).reduce((s, d) => s + d.ticket_midia, 0),
  }));
  const maxCount = Math.max(...pipelineByStage.map(s => s.count), 1);

  return (
    <>
      <Header title="CRM — AWQ Venture" subtitle="M4E Deals · Media for Equity" />
      <div className="page-container">

        {/* Nav */}
        <div className="flex flex-wrap gap-2">
          {[
            { href: "/awq-venture/crm/leads",     label: "Triagem" },
            { href: "/awq-venture/crm/deals",      label: "Deals" },
            { href: "/awq-venture/crm/interacoes", label: "Interações" },
            { href: "/awq-venture/pipeline",       label: "← Pipeline" },
          ].map(nav => (
            <Link key={nav.href} href={nav.href}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800/60 text-gray-400 border border-gray-700 hover:text-white hover:border-gray-600 transition-all">
              {nav.label}
            </Link>
          ))}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Leads em Triagem"   value={leads.filter(l => l.status === "Novo" || l.status === "Em Análise").length} icon={Search}      iconColor="text-gray-400"    iconBg="bg-gray-500/10" />
          <KpiCard label="Deals Ativos"       value={activeDeals.length}               icon={Target}      iconColor="text-amber-400"   iconBg="bg-amber-500/10" />
          <KpiCard label="Ticket Mídia Total" value={fmtCurrency(ticketTotal)}          icon={DollarSign}  iconColor="text-brand-400"   iconBg="bg-brand-500/10" sub="pipeline ativo" />
          <KpiCard label="Term Sheet"         value={deals.filter(d=>d.stage==="Term Sheet").length}
            icon={CheckCircle2} iconColor="text-emerald-400" iconBg="bg-emerald-500/10" />
          <KpiCard label="Fechados"           value={fechados.length}                  icon={TrendingUp}  iconColor="text-violet-400"  iconBg="bg-violet-500/10" />
          <KpiCard label="Setores"            value={new Set(activeDeals.map(d=>d.setor).filter(Boolean)).size}
            icon={BarChart3}   iconColor="text-blue-400"    iconBg="bg-blue-500/10" sub="segmentos ativos" />
        </div>

        {/* Pipeline Funnel */}
        <div className="card p-5">
          <SectionHeader icon={<BarChart3 size={15} />} title="M4E Pipeline por Estágio" />
          <div className="space-y-3">
            {pipelineByStage.map((s) => {
              const cfg = STAGE_COLORS[s.stage] ?? { badge: "text-gray-400 bg-gray-500/10", dot: "bg-gray-400" };
              const pct = (s.count / maxCount) * 100;
              return (
                <div key={s.stage} className="flex items-center gap-3">
                  <div className="w-32 shrink-0 text-[11px] font-medium text-gray-400 text-right">{s.stage}</div>
                  <div className="flex-1 h-6 bg-gray-800/60 rounded-lg overflow-hidden relative">
                    <div className={`h-full rounded-lg ${cfg.dot} transition-all duration-500`}
                      style={{ width: `${Math.max(pct, s.count > 0 ? 4 : 0)}%` }} />
                    {s.count > 0 && (
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/90">
                        {s.count} deal{s.count !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="w-24 shrink-0 text-right text-[11px] font-semibold text-amber-400">
                    {s.ticket > 0 ? fmtCurrency(s.ticket) : "—"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Top Deals */}
          <div className="card p-5">
            <SectionHeader icon={<Zap size={15} />} title="Top Deals por Score"
              linkLabel="Ver todos" linkHref="/awq-venture/crm/deals" />
            {topDeals.length === 0 ? (
              <EmptyState compact icon={<Target size={16} className="text-gray-400" />}
                title="Nenhum deal ativo" description="Adicione deals para começar." />
            ) : (
              <div className="space-y-2.5">
                {topDeals.map((d) => {
                  const stageCfg = STAGE_COLORS[d.stage] ?? { badge: "text-gray-400 bg-gray-500/10" };
                  return (
                    <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/40 border border-gray-800">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${stageCfg.badge}`}>
                            {d.stage}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${PRIO_COLORS[d.priority] ?? ""}`}>
                            {d.priority}
                          </span>
                        </div>
                        <div className="text-[11px] font-semibold text-gray-200 truncate">{d.nome_deal}</div>
                        <div className="text-[10px] text-gray-600">{d.empresa} · {d.setor}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[11px] font-bold text-amber-400">{fmtCurrency(d.ticket_midia)}</div>
                        <div className="text-[10px] text-gray-600">{d.equity_percentual}% equity</div>
                        <div className="text-[10px] text-brand-400 font-semibold">{d.score}/10</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Críticos + Interações */}
          <div className="space-y-5">
            {/* Deals Críticos */}
            <div className="card p-5">
              <SectionHeader icon={<Activity size={15} />} title="Deals Críticos" />
              {dealsCriticos.length === 0 ? (
                <EmptyState compact icon={<CheckCircle2 size={16} className="text-emerald-400" />}
                  title="Nenhum deal crítico" />
              ) : (
                <div className="space-y-2">
                  {dealsCriticos.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-800/40 border border-gray-800">
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-semibold text-gray-200 truncate">{d.nome_deal}</div>
                        {d.proxima_acao && <div className="text-[10px] text-gray-600 truncate">→ {d.proxima_acao}</div>}
                      </div>
                      <div className="shrink-0 ml-2 text-right">
                        <div className={`text-[10px] font-medium ${d.data_proxima_acao && d.data_proxima_acao < TODAY ? "text-red-400" : "text-gray-500"}`}>
                          {fmtDate(d.data_proxima_acao)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Últimas Interações */}
            <div className="card p-5">
              <SectionHeader icon={<Clock size={15} />} title="Últimas Interações"
                linkLabel="Ver todas" linkHref="/awq-venture/crm/interacoes" />
              {ultimasInteracoes.length === 0 ? (
                <EmptyState compact icon={<Activity size={16} className="text-gray-400" />}
                  title="Sem interações registradas" />
              ) : (
                <div className="space-y-2">
                  {ultimasInteracoes.map((i) => (
                    <div key={i.id} className="p-2.5 rounded-lg bg-gray-800/40 border border-gray-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-gray-300">{i.tipo}</span>
                        <span className="text-[10px] text-gray-600">{fmtDate(i.data)}</span>
                      </div>
                      <p className="text-[11px] text-gray-400 line-clamp-2">{i.resumo}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
