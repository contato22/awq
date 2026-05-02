"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import Link from "next/link";
import {
  Users, Target, DollarSign, TrendingUp, FileText, CheckCircle2,
  Building2, Activity, AlertTriangle, Clock, ClipboardList,
  Phone, Mail, MessageSquare, Repeat2, Handshake,
  BarChart3, Zap, CalendarClock, BookOpen,
} from "lucide-react";
import { fetchAdvisorCRM } from "@/lib/advisor-crm-query";
import type {
  AdvisorCrmLead, AdvisorCrmOpportunity, AdvisorCrmClient,
  AdvisorCrmTask, AdvisorCrmInteraction,
} from "@/lib/advisor-crm-db";

// ─── Constants ────────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  "Prospecção", "Diagnóstico", "Proposta", "Negociação",
  "Fechado Ganho", "Fechado Perdido",
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const STAGE_COLORS: Record<string, { bar: string; text: string; bg: string }> = {
  "Prospecção":      { bar: "bg-gray-400",    text: "text-gray-400",    bg: "bg-gray-500/10"    },
  "Diagnóstico":     { bar: "bg-blue-400",    text: "text-blue-400",    bg: "bg-blue-500/10"    },
  "Proposta":        { bar: "bg-amber-400",   text: "text-amber-400",   bg: "bg-amber-500/10"   },
  "Negociação":      { bar: "bg-orange-400",  text: "text-orange-400",  bg: "bg-orange-500/10"  },
  "Fechado Ganho":   { bar: "bg-emerald-400", text: "text-emerald-400", bg: "bg-emerald-500/10" },
  "Fechado Perdido": { bar: "bg-red-400",     text: "text-red-400",     bg: "bg-red-500/10"     },
};

function stageBadge(stage: string) {
  const c = STAGE_COLORS[stage];
  if (!c) return stage;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.text} ${c.bg}`}>
      {stage}
    </span>
  );
}

function riskBadge(risco: string) {
  if (risco === "Alto")  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-red-700 bg-red-100 border border-red-200">Alto</span>;
  if (risco === "Médio") return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200">Médio</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200">Baixo</span>;
}

function prioClass(p: string): string {
  if (p === "Crítica") return "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-red-600";
  if (p === "Alta")    return "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-red-700 bg-red-100 border border-red-200";
  if (p === "Média")   return "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200";
  return "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-gray-500 bg-gray-100 border border-gray-200";
}

function InteractionIcon({ tipo }: { tipo: string }) {
  const cls = "w-7 h-7 rounded-lg flex items-center justify-center shrink-0";
  if (tipo === "Ligação")        return <div className={`${cls} bg-emerald-500/10`}><Phone size={13} className="text-emerald-400" /></div>;
  if (tipo === "Reunião")        return <div className={`${cls} bg-violet-500/10`}><Users size={13} className="text-violet-400" /></div>;
  if (tipo === "Workshop")       return <div className={`${cls} bg-brand-500/10`}><BookOpen size={13} className="text-brand-400" /></div>;
  if (tipo === "WhatsApp")       return <div className={`${cls} bg-green-500/10`}><MessageSquare size={13} className="text-green-400" /></div>;
  if (tipo === "E-mail")         return <div className={`${cls} bg-blue-500/10`}><Mail size={13} className="text-blue-400" /></div>;
  if (tipo === "Follow-up")      return <div className={`${cls} bg-amber-500/10`}><Repeat2 size={13} className="text-amber-400" /></div>;
  if (tipo === "Apresentação")   return <div className={`${cls} bg-orange-500/10`}><FileText size={13} className="text-orange-400" /></div>;
  if (tipo === "Proposta Enviada") return <div className={`${cls} bg-orange-500/10`}><FileText size={13} className="text-orange-400" /></div>;
  return <div className={`${cls} bg-gray-500/10`}><Activity size={13} className="text-gray-400" /></div>;
}

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  sub?: string;
  alert?: boolean;
}

function KpiCard({ label, value, icon: Icon, iconColor, iconBg, sub, alert }: KpiCardProps) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon size={16} className={iconColor} />
      </div>
      <div className="min-w-0">
        <div className={`text-lg font-bold leading-tight ${alert ? "text-red-500" : "text-white"}`}>
          {value}
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5 truncate">{label}</div>
        {sub && <div className="text-[10px] text-gray-600 truncate">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdvisorCrmPage() {
  const [leads,    setLeads]    = useState<AdvisorCrmLead[]>([]);
  const [opps,     setOpps]     = useState<AdvisorCrmOpportunity[]>([]);
  const [clients,  setClients]  = useState<AdvisorCrmClient[]>([]);
  const [tasks,    setTasks]    = useState<AdvisorCrmTask[]>([]);
  const [ints,     setInts]     = useState<AdvisorCrmInteraction[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      fetchAdvisorCRM<AdvisorCrmLead>("leads"),
      fetchAdvisorCRM<AdvisorCrmOpportunity>("opportunities"),
      fetchAdvisorCRM<AdvisorCrmClient>("clients"),
      fetchAdvisorCRM<AdvisorCrmTask>("tasks"),
      fetchAdvisorCRM<AdvisorCrmInteraction>("interactions"),
    ]).then(([l, o, c, t, i]) => {
      setLeads(l); setOpps(o); setClients(c); setTasks(t); setInts(i);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <>
        <Header title="CRM — Advisor" subtitle="Carregando..." />
        <div className="page-container">
          <div className="card p-8 flex items-center justify-center">
            <div className="flex items-center gap-3 text-gray-500">
              <div className="w-4 h-4 border-2 border-gray-600 border-t-brand-400 rounded-full animate-spin" />
              <span className="text-sm">Carregando dados do CRM…</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  const TODAY       = new Date().toISOString().slice(0, 10);
  const TODAY_PLUS7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const openOpps        = opps.filter(o => !o.stage.startsWith("Fechado"));
  const fechadosGanhos  = opps.filter(o => o.stage === "Fechado Ganho").length;
  const fechadosPerdidos= opps.filter(o => o.stage === "Fechado Perdido").length;
  const totalFechados   = fechadosGanhos + fechadosPerdidos;
  const clientesAtivos  = clients.filter(c => c.status_conta === "Ativo");

  const kpis = {
    leadsAtivos:         leads.filter(l => l.status !== "Convertido" && l.status !== "Perdido").length,
    oppsAbertas:         openOpps.length,
    pipelineTotal:       openOpps.reduce((s, o) => s + o.valor_estimado, 0),
    receitaPotencial:    Math.round(openOpps.reduce((s, o) => s + o.valor_estimado * o.probabilidade / 100, 0)),
    propostasNeg:        opps.filter(o => o.stage === "Proposta" || o.stage === "Negociação").length,
    winRate:             totalFechados > 0 ? Math.round((fechadosGanhos / totalFechados) * 100) : 0,
    clientesAtivos:      clientesAtivos.length,
    mrrTotal:            clientesAtivos.reduce((s, c) => s + c.fee_mensal, 0),
    tarefasAbertas:      tasks.filter(t => t.status !== "Concluída").length,
    tarefasVencidas:     tasks.filter(t => t.status !== "Concluída" && t.prazo && t.prazo < TODAY).length,
    followupsPendentes:  tasks.filter(t => t.status !== "Concluída" && t.categoria.toLowerCase().includes("follow")).length,
  };

  const pipelineByStage = PIPELINE_STAGES.map(stage => ({
    stage,
    count: opps.filter(o => o.stage === stage).length,
    valor: opps.filter(o => o.stage === stage).reduce((s, o) => s + o.valor_estimado, 0),
  }));

  const maxCount = Math.max(...pipelineByStage.map(s => s.count), 1);

  const oportunidadesCriticas = openOpps
    .filter(o => o.risco === "Alto" || (o.data_proxima_acao && o.data_proxima_acao <= TODAY_PLUS7))
    .slice(0, 5);

  const ultimasInteracoes = [...ints]
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 5);

  const tarefasUrgentes = tasks
    .filter(t => (t.prioridade === "Alta" || t.prioridade === "Crítica") && t.status !== "Concluída")
    .sort((a, b) => (a.prazo ?? "").localeCompare(b.prazo ?? ""))
    .slice(0, 5);

  return (
    <>
      <Header title="CRM — Advisor" subtitle="Consultoria Estratégica · Sistema Operacional Comercial" />
      <div className="page-container">

        {/* Nav rápida */}
        <div className="flex flex-wrap gap-2">
          {[
            { href: "/advisor/crm/leads", label: "Leads" },
            { href: "/advisor/crm/oportunidades", label: "Oportunidades" },
            { href: "/advisor/crm/pipeline", label: "Pipeline" },
            { href: "/advisor/crm/clientes", label: "Clientes" },
            { href: "/advisor/crm/propostas", label: "Propostas" },
            { href: "/advisor/crm/interacoes", label: "Interações" },
            { href: "/advisor/crm/tarefas", label: "Tarefas" },
            { href: "/advisor/crm/relatorios", label: "Relatórios" },
          ].map(nav => (
            <Link
              key={nav.href}
              href={nav.href}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800/60 text-gray-400 border border-gray-700 hover:text-white hover:border-gray-600 transition-all"
            >
              {nav.label}
            </Link>
          ))}
        </div>

        {/* KPI Row 1 — Comercial */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Leads Ativos"         value={kpis.leadsAtivos}              icon={Users}      iconColor="text-blue-400"    iconBg="bg-blue-500/10" />
          <KpiCard label="Opps Abertas"          value={kpis.oppsAbertas}              icon={Target}     iconColor="text-violet-400"  iconBg="bg-violet-500/10" />
          <KpiCard label="Pipeline Total"        value={fmtCurrency(kpis.pipelineTotal)} icon={BarChart3} iconColor="text-amber-400"   iconBg="bg-amber-500/10" />
          <KpiCard label="Receita Potencial"     value={fmtCurrency(kpis.receitaPotencial)} icon={DollarSign} iconColor="text-emerald-400" iconBg="bg-emerald-500/10" sub="ponderada por prob." />
          <KpiCard label="Propostas/Negociação"  value={kpis.propostasNeg}             icon={FileText}   iconColor="text-orange-400"  iconBg="bg-orange-500/10" />
          <KpiCard label="Win Rate"              value={`${kpis.winRate}%`}            icon={TrendingUp} iconColor="text-brand-400"   iconBg="bg-brand-500/10" />
        </div>

        {/* KPI Row 2 — Carteira */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Clientes Ativos"      value={kpis.clientesAtivos}           icon={Building2}    iconColor="text-teal-400"  iconBg="bg-teal-500/10" />
          <KpiCard label="MRR (Retainers)"      value={fmtCurrency(kpis.mrrTotal)}    icon={DollarSign}   iconColor="text-emerald-400" iconBg="bg-emerald-500/10" />
          <KpiCard label="Tarefas Abertas"      value={kpis.tarefasAbertas}           icon={ClipboardList} iconColor="text-gray-400" iconBg="bg-gray-500/10" />
          <KpiCard label="Tarefas Vencidas"     value={kpis.tarefasVencidas}          icon={AlertTriangle}
            iconColor={kpis.tarefasVencidas > 0 ? "text-red-400" : "text-gray-400"}
            iconBg   ={kpis.tarefasVencidas > 0 ? "bg-red-500/10" : "bg-gray-500/10"}
            alert    ={kpis.tarefasVencidas > 0} />
          <KpiCard label="Follow-ups Pendentes" value={kpis.followupsPendentes}       icon={CalendarClock}
            iconColor={kpis.followupsPendentes > 0 ? "text-amber-400" : "text-gray-400"}
            iconBg   ={kpis.followupsPendentes > 0 ? "bg-amber-500/10" : "bg-gray-500/10"} />
          <KpiCard label="Críticas"             value={oportunidadesCriticas.length}  icon={Zap}
            iconColor={oportunidadesCriticas.length > 0 ? "text-red-400" : "text-gray-400"}
            iconBg   ={oportunidadesCriticas.length > 0 ? "bg-red-500/10" : "bg-gray-500/10"} />
        </div>

        {/* Pipeline Funnel */}
        <div className="card p-5">
          <SectionHeader icon={<BarChart3 size={15} />} title="Pipeline por Estágio" />
          <div className="space-y-3">
            {pipelineByStage.map((s) => {
              const cfg = STAGE_COLORS[s.stage] ?? { bar: "bg-gray-400", text: "text-gray-400", bg: "bg-gray-500/10" };
              const pct = (s.count / maxCount) * 100;
              return (
                <div key={s.stage} className="flex items-center gap-3">
                  <div className="w-28 shrink-0 text-[11px] font-medium text-gray-400 text-right">{s.stage}</div>
                  <div className="flex-1 h-6 bg-gray-800/60 rounded-lg overflow-hidden relative">
                    <div className={`h-full rounded-lg ${cfg.bar} transition-all duration-500`}
                      style={{ width: `${Math.max(pct, s.count > 0 ? 4 : 0)}%` }} />
                    {s.count > 0 && (
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/90">
                        {s.count} opp{s.count !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="w-20 shrink-0 text-right">
                    <span className={`text-[11px] font-semibold ${cfg.text}`}>
                      {s.valor > 0 ? fmtCurrency(s.valor) : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Oportunidades Críticas */}
          <div className="card p-5">
            <SectionHeader icon={<AlertTriangle size={15} />} title="Oportunidades Críticas"
              linkLabel="Ver todas" linkHref="/advisor/crm/oportunidades" />
            {oportunidadesCriticas.length === 0 ? (
              <EmptyState compact icon={<CheckCircle2 size={16} className="text-emerald-400" />}
                title="Nenhuma oportunidade crítica" description="Tudo sob controle." />
            ) : (
              <div className="table-scroll">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Oportunidade</th>
                      <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Stage</th>
                      <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Próx. Ação</th>
                      <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Risco</th>
                    </tr>
                  </thead>
                  <tbody>
                    {oportunidadesCriticas.map((o) => {
                      const past = o.data_proxima_acao && o.data_proxima_acao < TODAY;
                      return (
                        <tr key={o.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                          <td className="py-2 px-2">
                            <div className="text-[11px] font-semibold text-gray-200 truncate max-w-[140px]">{o.nome_oportunidade}</div>
                            <div className="text-[10px] text-gray-600 truncate">{o.empresa}</div>
                          </td>
                          <td className="py-2 px-2">{stageBadge(o.stage)}</td>
                          <td className="py-2 px-2">
                            <span className={`text-[10px] font-medium ${past ? "text-red-400" : "text-gray-400"}`}>
                              {fmtDate(o.data_proxima_acao)}
                            </span>
                          </td>
                          <td className="py-2 px-2">{riskBadge(o.risco)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tarefas Urgentes */}
          <div className="card p-5">
            <SectionHeader icon={<ClipboardList size={15} />} title="Tarefas Urgentes"
              linkLabel="Ver todas" linkHref="/advisor/crm/tarefas" />
            {tarefasUrgentes.length === 0 ? (
              <EmptyState compact icon={<CheckCircle2 size={16} className="text-emerald-400" />}
                title="Sem tarefas urgentes" description="Agenda limpa." />
            ) : (
              <div className="space-y-2.5">
                {tarefasUrgentes.map((t) => {
                  const past = t.prazo && t.prazo < TODAY;
                  return (
                    <div key={t.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-800/40 border border-gray-800">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={prioClass(t.prioridade)}>{t.prioridade}</span>
                          <span className="text-[10px] text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded-md">{t.categoria}</span>
                        </div>
                        <p className="text-[11px] font-medium text-gray-200 leading-snug">{t.titulo}</p>
                        <p className={`text-[10px] mt-1 ${past ? "text-red-400 font-semibold" : "text-gray-600"}`}>
                          {past ? "Vencida · " : "Prazo: "}{fmtDate(t.prazo)}
                        </p>
                      </div>
                      <div className="shrink-0 text-[10px] text-gray-600">{t.responsavel}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Últimas Interações */}
        <div className="card p-5">
          <SectionHeader icon={<Activity size={15} />} title="Últimas Interações"
            linkLabel="Ver histórico" linkHref="/advisor/crm/interacoes" />
          {ultimasInteracoes.length === 0 ? (
            <EmptyState compact icon={<Clock size={16} className="text-gray-400" />} title="Sem interações registradas" />
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {ultimasInteracoes.map((i) => (
                <div key={i.id} className="shrink-0 w-56 p-3.5 rounded-xl bg-gray-800/40 border border-gray-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <InteractionIcon tipo={i.tipo} />
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold text-gray-300">{i.tipo}</div>
                      <div className="text-[10px] text-gray-600">{fmtDate(i.data)}</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-3">{i.resumo}</p>
                  <div className="flex items-center justify-between pt-1 border-t border-gray-800">
                    <span className="text-[10px] text-gray-600">{i.responsavel}</span>
                    {i.risco_percebido !== "Baixo" && (
                      <span className={`text-[9px] font-semibold ${i.risco_percebido === "Alto" ? "text-red-400" : "text-amber-400"}`}>
                        ⚠ {i.risco_percebido}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  );
}
