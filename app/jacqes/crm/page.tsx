"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import {
  Users, Target, DollarSign, TrendingUp, FileText, CheckCircle2,
  Building2, Activity, AlertTriangle, Clock, ClipboardList,
  Phone, Mail, MessageSquare, Repeat2, Handshake,
  HeartPulse, BarChart3, Zap, CalendarClock,
} from "lucide-react";
import { fetchCRM } from "@/lib/jacqes-crm-query";
import type {
  CrmLead, CrmOpportunity, CrmClient, CrmTask,
  CrmInteraction, CrmExpansion, CrmHealthSnapshot,
} from "@/lib/jacqes-crm-db";

// ─── Constants ────────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  "Novo Lead", "Qualificação", "Diagnóstico", "Proposta", "Negociação",
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
  "Novo Lead":       { bar: "bg-gray-400",    text: "text-gray-400",    bg: "bg-gray-500/10"    },
  "Qualificação":    { bar: "bg-blue-400",    text: "text-blue-400",    bg: "bg-blue-500/10"    },
  "Diagnóstico":     { bar: "bg-violet-400",  text: "text-violet-400",  bg: "bg-violet-500/10"  },
  "Proposta":        { bar: "bg-amber-400",   text: "text-amber-400",   bg: "bg-amber-500/10"   },
  "Negociação":      { bar: "bg-orange-400",  text: "text-orange-400",  bg: "bg-orange-500/10"  },
  "Fechado Ganho":   { bar: "bg-emerald-400", text: "text-emerald-400", bg: "bg-emerald-500/10" },
  "Fechado Perdido": { bar: "bg-red-400",     text: "text-red-400",     bg: "bg-red-500/10"     },
};

function stageBadgeClass(stage: string): string {
  const c = STAGE_COLORS[stage];
  if (!c) return "badge";
  return `inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.text} ${c.bg}`;
}

function riskBadge(risco: string) {
  if (risco === "Alto")  return <span className="badge badge-red text-[10px]">Alto</span>;
  if (risco === "Médio") return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200">Médio</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200">Baixo</span>;
}

function prioClass(p: string): string {
  if (p === "Crítica") return "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-red-600";
  if (p === "Alta")    return "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-red-700 bg-red-100 border border-red-200";
  if (p === "Média")   return "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200";
  return "badge text-[10px]";
}

function InteractionIcon({ tipo }: { tipo: string }) {
  const cls = "w-7 h-7 rounded-lg flex items-center justify-center shrink-0";
  if (tipo === "Ligação")           return <div className={`${cls} bg-emerald-500/10`}><Phone size={13} className="text-emerald-400" /></div>;
  if (tipo === "Reunião")           return <div className={`${cls} bg-violet-500/10`}><Users size={13} className="text-violet-400" /></div>;
  if (tipo === "Visita")            return <div className={`${cls} bg-brand-500/10`}><Building2 size={13} className="text-brand-400" /></div>;
  if (tipo === "WhatsApp")          return <div className={`${cls} bg-green-500/10`}><MessageSquare size={13} className="text-green-400" /></div>;
  if (tipo === "E-mail")            return <div className={`${cls} bg-blue-500/10`}><Mail size={13} className="text-blue-400" /></div>;
  if (tipo === "Follow-up")         return <div className={`${cls} bg-amber-500/10`}><Repeat2 size={13} className="text-amber-400" /></div>;
  if (tipo === "Proposta Enviada")  return <div className={`${cls} bg-orange-500/10`}><FileText size={13} className="text-orange-400" /></div>;
  if (tipo === "Contraproposta")    return <div className={`${cls} bg-red-500/10`}><Handshake size={13} className="text-red-400" /></div>;
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

export default function JacqesCrmPage() {
  const [leads,    setLeads]    = useState<CrmLead[]>([]);
  const [opps,     setOpps]     = useState<CrmOpportunity[]>([]);
  const [clients,  setClients]  = useState<CrmClient[]>([]);
  const [tasks,    setTasks]    = useState<CrmTask[]>([]);
  const [ints,     setInts]     = useState<CrmInteraction[]>([]);
  const [expansion,setExpansion]= useState<CrmExpansion[]>([]);
  const [health,   setHealth]   = useState<CrmHealthSnapshot[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      fetchCRM<CrmLead>("leads"),
      fetchCRM<CrmOpportunity>("opportunities"),
      fetchCRM<CrmClient>("clients"),
      fetchCRM<CrmTask>("tasks"),
      fetchCRM<CrmInteraction>("interactions"),
      fetchCRM<CrmExpansion>("expansion"),
      fetchCRM<CrmHealthSnapshot>("health"),
    ]).then(([l, o, c, t, i, e, h]) => {
      setLeads(l); setOpps(o); setClients(c);
      setTasks(t); setInts(i); setExpansion(e); setHealth(h);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <>
        <Header title="CRM — JACQES" subtitle="Carregando..." />
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

  // ── KPI derivations ──────────────────────────────────────────────────────────
  const TODAY = new Date().toISOString().slice(0, 10);
  const TODAY_PLUS_7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const openOpps  = opps.filter((o: CrmOpportunity) => o.stage !== "Fechado Ganho" && o.stage !== "Fechado Perdido");
  const fechadosGanhos   = opps.filter((o: CrmOpportunity) => o.stage === "Fechado Ganho").length;
  const fechadosPerdidos = opps.filter((o: CrmOpportunity) => o.stage === "Fechado Perdido").length;
  const totalFechados    = fechadosGanhos + fechadosPerdidos;

  const kpis = {
    leadsAtivos:          leads.filter((l: CrmLead) => l.status !== "Convertido" && l.status !== "Perdido").length,
    oppsAbertas:          openOpps.length,
    pipelineTotal:        openOpps.reduce((s: number, o: CrmOpportunity) => s + o.valor_potencial, 0),
    receitaPotencial:     Math.round(openOpps.reduce((s: number, o: CrmOpportunity) => s + o.valor_potencial * o.probabilidade / 100, 0)),
    propostasNegociacao:  opps.filter((o: CrmOpportunity) => o.stage === "Proposta" || o.stage === "Negociação").length,
    winRate:              totalFechados > 0 ? Math.round((fechadosGanhos / totalFechados) * 100) : 0,
    clientesAtivos:       clients.filter((c: CrmClient) => c.status_conta === "Ativo").length,
    mrrTotal:             clients.reduce((s: number, c: CrmClient) => s + c.ticket_mensal, 0),
    healthMedio:          health.length > 0 ? Math.round(health.reduce((s: number, h: CrmHealthSnapshot) => s + h.health_score, 0) / health.length) : 0,
    expansaoAberta:       expansion.filter((e: CrmExpansion) => e.status !== "Fechado").length,
    expansaoValor:        expansion.filter((e: CrmExpansion) => e.status !== "Fechado").reduce((s: number, e: CrmExpansion) => s + e.valor_potencial, 0),
    tarefasAbertas:       tasks.filter((t: CrmTask) => t.status === "Aberta" || t.status === "Em Andamento").length,
    tarefasVencidas:      tasks.filter((t: CrmTask) => t.prazo && t.prazo < TODAY && t.status === "Aberta").length,
    followupsPendentes:   tasks.filter((t: CrmTask) => t.status === "Aberta" && t.categoria.toLowerCase().startsWith("follow")).length,
    emRisco:              clients.filter((c: CrmClient) => c.status_conta === "Em Risco").length,
  };

  const pipelineByStage = PIPELINE_STAGES.map((stage: string) => ({
    stage,
    count: opps.filter((o: CrmOpportunity) => o.stage === stage).length,
    valor: opps.filter((o: CrmOpportunity) => o.stage === stage).reduce((s: number, o: CrmOpportunity) => s + o.valor_potencial, 0),
  }));

  const oportunidadesCriticas = opps
    .filter((o: CrmOpportunity) => o.risco === "Alto" || (o.data_proxima_acao && o.data_proxima_acao <= TODAY_PLUS_7))
    .filter((o: CrmOpportunity) => o.stage !== "Fechado Ganho" && o.stage !== "Fechado Perdido")
    .slice(0, 5);

  const ultimasInteracoes = [...ints]
    .sort((a: CrmInteraction, b: CrmInteraction) => b.data.localeCompare(a.data))
    .slice(0, 5);

  const tarefasUrgentes = tasks
    .filter((t: CrmTask) => (t.prioridade === "Alta" || t.prioridade === "Crítica") && (t.status === "Aberta" || t.status === "Em Andamento"))
    .sort((a: CrmTask, b: CrmTask) => (a.prazo ?? "").localeCompare(b.prazo ?? ""))
    .slice(0, 5);

  const maxPipelineCount = Math.max(...pipelineByStage.map((s: { stage: string; count: number; valor: number }) => s.count), 1);

  return (
    <>
      <Header title="CRM — JACQES" subtitle="Mission Control · Sistema operacional comercial" />
      <div className="page-container">

        {/* Snapshot badge */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200 text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
            Snapshot estático
          </span>
        </div>

        {/* ── KPI Row 1 — Operacional ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Leads Ativos"          value={kpis.leadsAtivos}              icon={Users}        iconColor="text-blue-400"    iconBg="bg-blue-500/10" />
          <KpiCard label="Opps Abertas"           value={kpis.oppsAbertas}              icon={Target}       iconColor="text-violet-400"  iconBg="bg-violet-500/10" />
          <KpiCard label="Pipeline Total"         value={fmtCurrency(kpis.pipelineTotal)}icon={BarChart3}   iconColor="text-amber-400"   iconBg="bg-amber-500/10" />
          <KpiCard label="Receita Potencial"      value={fmtCurrency(kpis.receitaPotencial)} icon={DollarSign} iconColor="text-emerald-400" iconBg="bg-emerald-500/10" sub="ponderada por probabilidade" />
          <KpiCard label="Propostas / Negociação" value={kpis.propostasNegociacao}      icon={FileText}     iconColor="text-orange-400"  iconBg="bg-orange-500/10" />
          <KpiCard label="Win Rate"               value={`${kpis.winRate}%`}            icon={TrendingUp}   iconColor="text-brand-400"   iconBg="bg-brand-500/10" />
        </div>

        {/* ── KPI Row 2 — Consolidado ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Clientes Ativos"   value={kpis.clientesAtivos}   icon={Building2}     iconColor="text-teal-400"  iconBg="bg-teal-500/10" />
          <KpiCard label="MRR Total"         value={fmtCurrency(kpis.mrrTotal)} icon={DollarSign} iconColor="text-emerald-400" iconBg="bg-emerald-500/10" />
          <KpiCard label="Health Médio"      value={`${kpis.healthMedio}/100`} icon={HeartPulse}
            iconColor={kpis.healthMedio >= 80 ? "text-emerald-400" : kpis.healthMedio >= 60 ? "text-amber-400" : "text-red-400"}
            iconBg   ={kpis.healthMedio >= 80 ? "bg-emerald-500/10" : kpis.healthMedio >= 60 ? "bg-amber-500/10" : "bg-red-500/10"} />
          <KpiCard label="Expansão Aberta"   value={kpis.expansaoAberta}   icon={Zap}           iconColor="text-yellow-400" iconBg="bg-yellow-500/10"
            sub={kpis.expansaoValor > 0 ? fmtCurrency(kpis.expansaoValor) : undefined} />
          <KpiCard label="Tarefas Vencidas"  value={kpis.tarefasVencidas}  icon={ClipboardList}
            iconColor={kpis.tarefasVencidas > 0 ? "text-red-400" : "text-gray-400"}
            iconBg   ={kpis.tarefasVencidas > 0 ? "bg-red-500/10" : "bg-gray-500/10"}
            alert    ={kpis.tarefasVencidas > 0} />
          <KpiCard label="Follow-ups Pendentes" value={kpis.followupsPendentes} icon={CalendarClock}
            iconColor={kpis.followupsPendentes > 0 ? "text-amber-400" : "text-gray-400"}
            iconBg   ={kpis.followupsPendentes > 0 ? "bg-amber-500/10" : "bg-gray-500/10"} />
        </div>

        {/* ── Pipeline Funnel ─────────────────────────────────────────────── */}
        <div className="card p-5">
          <SectionHeader icon={<BarChart3 size={15} />} title="Pipeline por Estágio" />
          <div className="space-y-3">
            {pipelineByStage.map((s) => {
              const cfg = STAGE_COLORS[s.stage] ?? { bar: "bg-gray-400", text: "text-gray-400", bg: "bg-gray-500/10" };
              const pct = maxPipelineCount > 0 ? (s.count / maxPipelineCount) * 100 : 0;
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

        {/* ── Two columns ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Oportunidades Críticas */}
          <div className="card p-5">
            <SectionHeader icon={<AlertTriangle size={15} />} title="Oportunidades Críticas"
              linkLabel="Ver todas" linkHref="/jacqes/crm/oportunidades" />
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
                      <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Owner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {oportunidadesCriticas.map((o: CrmOpportunity) => {
                      const past = o.data_proxima_acao && o.data_proxima_acao < TODAY;
                      return (
                        <tr key={o.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                          <td className="py-2 px-2">
                            <div className="text-[11px] font-semibold text-gray-200 truncate max-w-[140px]">{o.nome_oportunidade}</div>
                            <div className="text-[10px] text-gray-600 truncate max-w-[140px]">{o.empresa}</div>
                          </td>
                          <td className="py-2 px-2"><span className={stageBadgeClass(o.stage)}>{o.stage}</span></td>
                          <td className="py-2 px-2">
                            <span className={`text-[10px] font-medium ${past ? "text-red-400" : "text-gray-400"}`}>
                              {fmtDate(o.data_proxima_acao)}
                            </span>
                          </td>
                          <td className="py-2 px-2">{riskBadge(o.risco)}</td>
                          <td className="py-2 px-2 text-[10px] text-gray-500">{o.owner}</td>
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
              linkLabel="Ver todas" linkHref="/jacqes/crm/tarefas" />
            {tarefasUrgentes.length === 0 ? (
              <EmptyState compact icon={<CheckCircle2 size={16} className="text-emerald-400" />}
                title="Sem tarefas urgentes" description="Boa notícia — agenda limpa." />
            ) : (
              <div className="space-y-2.5">
                {tarefasUrgentes.map((t: CrmTask) => {
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

        {/* ── Últimas Interações ──────────────────────────────────────────── */}
        <div className="card p-5">
          <SectionHeader icon={<Activity size={15} />} title="Últimas Interações"
            linkLabel="Ver histórico" linkHref="/jacqes/crm/interacoes" />
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
