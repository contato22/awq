"use client";

import { useEffect, useState } from "react";
import type { ReactNode, ElementType } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import type { CrmOpportunity, CrmActivity } from "@/lib/crm-types";
import { SEED_OPPORTUNITIES, SEED_ACTIVITIES } from "@/lib/crm-db";
import {
  Users, Target, DollarSign, TrendingUp, CheckCircle2,
  Activity, AlertTriangle, Clock, ClipboardList,
  Phone, Mail, CalendarClock, BarChart3, FileText,
  MessageSquare, Zap, Filter,
} from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/utils";

// ─── Seed aliases (canonical source: lib/crm-db.ts) ──────────────────────────
const SEED_OPPS = SEED_OPPORTUNITIES;

// BU label display names
const BU_LABELS: Record<string, string> = {
  JACQES: "JACQES",
  CAZA: "Caza Vision",
  ADVISOR: "Advisor",
  VENTURE: "AWQ Venture",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string | null): number {
  if (!dateStr) return 999;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

// ─── Stage Config ─────────────────────────────────────────────────────────────

const STAGE_CONFIG: Record<string, { label: string; bar: string; text: string; bg: string; border: string }> = {
  discovery:     { label: "Discovery",      bar: "bg-blue-500",    text: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200" },
  qualification: { label: "Qualificação",   bar: "bg-violet-500",  text: "text-violet-700",  bg: "bg-violet-50",  border: "border-violet-200" },
  proposal:      { label: "Proposta",       bar: "bg-amber-500",   text: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200" },
  negotiation:   { label: "Negociação",     bar: "bg-orange-500",  text: "text-orange-700",  bg: "bg-orange-50",  border: "border-orange-200" },
  closed_won:    { label: "Fechado Ganho",  bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  closed_lost:   { label: "Fechado Perdido",bar: "bg-red-500",     text: "text-red-700",     bg: "bg-red-50",     border: "border-red-200" },
};

function StageBadge({ stage }: { stage: string }) {
  const cfg = STAGE_CONFIG[stage];
  if (!cfg) return <span className="badge badge-gray">{stage}</span>;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.text} ${cfg.bg} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

function BuBadge({ bu }: { bu: string }) {
  if (bu === "JACQES") return <span className="badge badge-blue text-[10px]">{bu}</span>;
  if (bu === "CAZA")   return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 ring-1 ring-violet-200/60">{bu}</span>;
  if (bu === "ADVISOR")return <span className="badge badge-green text-[10px]">{bu}</span>;
  return <span className="badge badge-yellow text-[10px]">{bu}</span>;
}

function ActivityIcon({ type }: { type: string }) {
  const cls = "w-7 h-7 rounded-lg flex items-center justify-center shrink-0";
  if (type === "call")    return <div className={`${cls} bg-emerald-50`}><Phone size={13} className="text-emerald-600" /></div>;
  if (type === "email")   return <div className={`${cls} bg-blue-50`}><Mail size={13} className="text-blue-600" /></div>;
  if (type === "meeting") return <div className={`${cls} bg-violet-50`}><Users size={13} className="text-violet-600" /></div>;
  if (type === "task")    return <div className={`${cls} bg-amber-50`}><ClipboardList size={13} className="text-amber-600" /></div>;
  if (type === "note")    return <div className={`${cls} bg-gray-100`}><MessageSquare size={13} className="text-gray-500" /></div>;
  return <div className={`${cls} bg-gray-100`}><Activity size={13} className="text-gray-400" /></div>;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: ReactNode;
  icon: ElementType;
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
        <div className="text-lg font-bold text-gray-900 leading-tight">{value}</div>
        <div className="text-[10px] text-gray-500 mt-0.5 truncate">{label}</div>
        {sub && <div className="text-[10px] text-gray-400 truncate">{sub}</div>}
      </div>
    </div>
  );
}

// ─── BU filter options ────────────────────────────────────────────────────────
const BUS = ["Todos", "JACQES", "CAZA", "ADVISOR", "VENTURE"] as const;
type BuFilter = typeof BUS[number];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  buFilter?: string; // optional external override (legacy)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CrmDashboardView({ buFilter: externalBu }: Props) {
  const [bu, setBu] = useState<BuFilter>(
    (externalBu as BuFilter | undefined) ?? "Todos"
  );
  const buFilter = bu !== "Todos" ? bu : undefined;

  const [opps, setOpps] = useState<CrmOpportunity[]>([]);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isStatic, setIsStatic] = useState(false);

  const buLabel = buFilter ? (BU_LABELS[buFilter] ?? buFilter) : "AWQ Group";
  const pageTitle = `CRM Tower`;
  const pageSubtitle = buFilter
    ? `Pipeline e vendas · ${buLabel}`
    : "Controle de pipeline e vendas · AWQ Group";

  useEffect(() => {
    async function load() {
      const buParam = buFilter ? `?bu=${buFilter}` : "";
      try {
        const [analRes, pipeRes, actRes] = await Promise.all([
          fetch(`/api/crm/analytics${buParam}`),
          fetch(`/api/crm/pipeline${buParam}`),
          fetch(`/api/crm/activities${buParam}`),
        ]);
        const [analJson, pipeJson, actJson] = await Promise.all([
          analRes.json(),
          pipeRes.json(),
          actRes.json(),
        ]);
        if (analJson.success && pipeJson.success && actJson.success) {
          const allOpps = (Object.values(pipeJson.data.byStage as Record<string, CrmOpportunity[]>).flat())
            .filter((o: CrmOpportunity) => !buFilter || o.bu === buFilter);
          setOpps(allOpps);
          const oppIds    = new Set(allOpps.map(o => o.opportunity_id));
          const accountIds = new Set(allOpps.map(o => o.account_id).filter(Boolean));
          const filteredActs = (actJson.data as CrmActivity[]).filter((a) => {
            if (!buFilter) return true;
            if (a.related_to_type === "opportunity") return oppIds.has(a.related_to_id);
            if (a.related_to_type === "account")     return accountIds.has(a.related_to_id);
            // lead and contact activities excluded from BU-scoped views (no BU field on activity)
            return false;
          });
          setActivities(filteredActs);

          // Derive KPIs from filtered opps so BU views never show cross-BU numbers
          if (buFilter) {
            const openFiltered = allOpps.filter(o => o.stage !== "closed_won" && o.stage !== "closed_lost");
            const wonFiltered  = allOpps.filter(o => o.stage === "closed_won");
            const lostFiltered = allOpps.filter(o => o.stage === "closed_lost");
            const totalClosed  = wonFiltered.length + lostFiltered.length;
            setAnalytics({
              leadsNew: allOpps.length > 0 ? 1 : 0,
              openOpportunities: openFiltered.length,
              pipelineValue: openFiltered.reduce((s, o) => s + o.deal_value, 0),
              weightedForecast: Math.round(openFiltered.reduce((s, o) => s + o.deal_value * o.probability / 100, 0)),
              closedWonThisMonth: wonFiltered.reduce((s, o) => s + o.deal_value, 0),
              winRate: totalClosed > 0 ? Math.round((wonFiltered.length / totalClosed) * 100) : 0,
              tasksToday: 0,
            });
          } else {
            setAnalytics({
              leadsNew: analJson.data.leadsNew ?? 0,
              openOpportunities: analJson.data.openOpportunities ?? 0,
              pipelineValue: analJson.data.pipelineValue ?? 0,
              weightedForecast: analJson.data.weightedForecast ?? 0,
              closedWonThisMonth: analJson.data.revenueThisMonth ?? 0,
              winRate: analJson.data.winRate ?? 0,
              tasksToday: analJson.data.tasksToday ?? 0,
            });
          }
        } else {
          throw new Error("API error");
        }
      } catch {
        // Filter seed data to this BU
        const filteredOpps = buFilter
          ? SEED_OPPS.filter(o => o.bu === buFilter)
          : SEED_OPPS;

        const filteredOppIds     = new Set(filteredOpps.map(o => o.opportunity_id));
        const filteredAccountIds = new Set(filteredOpps.map(o => o.account_id).filter(Boolean));
        const filteredActs = buFilter
          ? SEED_ACTIVITIES.filter(a => {
              if (a.related_to_type === "opportunity") return filteredOppIds.has(a.related_to_id);
              if (a.related_to_type === "account")     return filteredAccountIds.has(a.related_to_id);
              return false;
            })
          : SEED_ACTIVITIES;

        const openSeed = filteredOpps.filter(o => o.stage !== "closed_won" && o.stage !== "closed_lost");
        const wonSeed  = filteredOpps.filter(o => o.stage === "closed_won");
        const lostSeed = filteredOpps.filter(o => o.stage === "closed_lost");
        const total = wonSeed.length + lostSeed.length;

        setOpps(filteredOpps);
        setActivities(filteredActs);
        setAnalytics({
          leadsNew: buFilter ? (filteredOpps.length > 0 ? 1 : 0) : 3,
          openOpportunities: openSeed.length,
          pipelineValue: openSeed.reduce((s, o) => s + o.deal_value, 0),
          weightedForecast: Math.round(openSeed.reduce((s, o) => s + o.deal_value * o.probability / 100, 0)),
          closedWonThisMonth: wonSeed.reduce((s, o) => s + o.deal_value, 0),
          winRate: total > 0 ? Math.round((wonSeed.length / total) * 100) : 0,
          tasksToday: 0,
        });
        setIsStatic(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [buFilter]);

  if (loading) {
    return (
      <>
        <Header title={pageTitle} subtitle="Carregando..." />
        <div className="page-container">
          <div className="card p-12 flex items-center justify-center">
            <div className="flex items-center gap-3 text-gray-400">
              <div className="w-5 h-5 border-2 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
              <span className="text-sm font-medium">Carregando dados do CRM…</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  const TODAY = new Date().toISOString().slice(0, 10);
  const TODAY_PLUS_7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const openOpps = opps.filter(o => o.stage !== "closed_won" && o.stage !== "closed_lost");

  const funnelStages = ["discovery", "qualification", "proposal", "negotiation"] as const;
  const maxVal = Math.max(...funnelStages.map(s => opps.filter(o => o.stage === s).reduce((a, o) => a + o.deal_value, 0)), 1);

  const atRisk = openOpps
    .filter(o => (o.stage === "negotiation" || o.stage === "proposal") && o.expected_close_date && o.expected_close_date <= TODAY_PLUS_7)
    .sort((a, b) => b.deal_value - a.deal_value);
  const topOpps = atRisk.length > 0
    ? atRisk.slice(0, 5)
    : [...openOpps].sort((a, b) => b.deal_value - a.deal_value).slice(0, 5);

  const todayTasks = activities.filter(a => a.status === "scheduled" && a.scheduled_at && a.scheduled_at.slice(0, 10) === TODAY);

  const recentActs = [...activities]
    .filter(a => a.completed_at || a.status === "completed")
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""))
    .slice(0, 5);

  return (
    <>
      <Header title={pageTitle} subtitle={pageSubtitle} />
      <div className="page-container">

        {/* BU Filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={13} className="text-gray-400 shrink-0" />
          <span className="text-[11px] text-gray-500 shrink-0">Filtrar por BU:</span>
          {BUS.map(b => (
            <button
              key={b}
              onClick={() => setBu(b)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                bu === b
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {b}
            </button>
          ))}
          {isStatic && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
              Snapshot estático
            </span>
          )}
        </div>

        {/* ── KPI Row ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Leads novos"           value={analytics.leadsNew ?? 0}                icon={Users}        iconColor="text-blue-600"    iconBg="bg-blue-50" />
          <KpiCard label="Oportunidades abertas" value={analytics.openOpportunities ?? 0}        icon={Target}       iconColor="text-violet-600"  iconBg="bg-violet-50" />
          <KpiCard label="Pipeline total"         value={formatBRL(analytics.pipelineValue ?? 0)} icon={BarChart3}    iconColor="text-amber-600"   iconBg="bg-amber-50" />
          <KpiCard label="Forecast ponderado"     value={formatBRL(analytics.weightedForecast ?? 0)} icon={DollarSign} iconColor="text-emerald-600" iconBg="bg-emerald-50" sub="prob. ponderada" />
          <KpiCard label="Fechado no mês"         value={formatBRL(analytics.closedWonThisMonth ?? 0)} icon={CheckCircle2} iconColor="text-green-600" iconBg="bg-green-50" />
          <KpiCard label="Win Rate"               value={`${analytics.winRate ?? 0}%`}           icon={TrendingUp}   iconColor="text-blue-600"    iconBg="bg-blue-50" />
        </div>

        {/* ── Pipeline Funnel ───────────────────────────────────────────────── */}
        <div className="card p-5">
          <SectionHeader
            icon={<BarChart3 size={15} />}
            title="Pipeline por Estágio"
            linkLabel="Ver pipeline completo"
            linkHref="/crm/opportunities"
          />
          <div className="space-y-3">
            {funnelStages.map((stage) => {
              const cfg = STAGE_CONFIG[stage];
              const stageOpps = opps.filter(o => o.stage === stage);
              const val = stageOpps.reduce((s, o) => s + o.deal_value, 0);
              const cnt = stageOpps.length;
              const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
              return (
                <div key={stage} className="flex items-center gap-3">
                  <div className="w-28 shrink-0 text-right">
                    <span className="text-[11px] font-medium text-gray-600">{cfg.label}</span>
                  </div>
                  <div className="flex-1 h-7 bg-gray-100 rounded-lg overflow-hidden relative">
                    <div
                      className={`h-full rounded-lg ${cfg.bar} transition-all duration-700`}
                      style={{ width: `${Math.max(pct, cnt > 0 ? 3 : 0)}%` }}
                    />
                    {cnt > 0 && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white">
                        {cnt} deal{cnt !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="w-24 shrink-0 text-right">
                    <span className={`text-[11px] font-semibold ${cfg.text}`}>
                      {val > 0 ? formatBRL(val) : "—"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Two columns ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Opportunities at risk / top open */}
          <div className="card p-5">
            <SectionHeader
              icon={<AlertTriangle size={15} />}
              title={atRisk.length > 0 ? "Oportunidades em Risco" : "Maiores Oportunidades Abertas"}
              linkLabel="Ver pipeline"
              linkHref="/crm/opportunities"
            />
            {topOpps.length === 0 ? (
              <EmptyState compact icon={<CheckCircle2 size={16} className="text-emerald-600" />}
                title="Nenhuma oportunidade aberta" description="Pipeline vazio por enquanto." />
            ) : (
              <div className="space-y-2">
                {topOpps.map((o) => {
                  const days = daysUntil(o.expected_close_date);
                  const isUrgent = days <= 7;
                  return (
                    <div key={o.opportunity_id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                      <div className={`w-1 h-10 rounded-full shrink-0 ${STAGE_CONFIG[o.stage]?.bar ?? "bg-gray-300"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-semibold text-gray-900 truncate">{o.opportunity_name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {!buFilter && <BuBadge bu={o.bu} />}
                          <StageBadge stage={o.stage} />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[12px] font-bold text-gray-900">{formatBRL(o.deal_value)}</div>
                        <div className={`text-[10px] font-medium ${isUrgent ? "text-red-600" : "text-gray-400"}`}>
                          {o.expected_close_date ? (isUrgent ? `${days}d restantes` : formatDateBR(o.expected_close_date)) : "—"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tasks for today */}
          <div className="card p-5">
            <SectionHeader
              icon={<CalendarClock size={15} />}
              title="Tarefas de Hoje"
              badge={
                todayTasks.length > 0
                  ? <span className="badge badge-blue text-[10px] ml-1">{todayTasks.length}</span>
                  : undefined
              }
            />
            {todayTasks.length === 0 ? (
              <EmptyState compact icon={<CheckCircle2 size={16} className="text-emerald-600" />}
                title="Agenda livre hoje" description="Nenhuma tarefa agendada para hoje." />
            ) : (
              <div className="space-y-2">
                {todayTasks.map((t) => (
                  <div key={t.activity_id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                    <ActivityIcon type={t.activity_type} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold text-gray-900 truncate">{t.subject}</div>
                      {t.related_name && (
                        <div className="text-[11px] text-gray-500 truncate">{t.related_name}</div>
                      )}
                      {t.scheduled_at && (
                        <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                          <Clock size={9} />
                          {new Date(t.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-[10px] text-gray-400">{t.created_by}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Recent Activities ─────────────────────────────────────────────── */}
        <div className="card p-5">
          <SectionHeader
            icon={<Activity size={15} />}
            title="Atividades Recentes"
          />
          {recentActs.length === 0 ? (
            <EmptyState compact icon={<Zap size={16} className="text-gray-400" />}
              title="Sem atividades recentes" description="As atividades registradas aparecerão aqui." />
          ) : (
            <div className="divide-y divide-gray-100">
              {recentActs.map((a) => (
                <div key={a.activity_id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <ActivityIcon type={a.activity_type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12px] font-semibold text-gray-900">{a.subject}</span>
                      {a.related_name && (
                        <span className="text-[10px] text-gray-400 truncate">· {a.related_name}</span>
                      )}
                    </div>
                    {a.description && (
                      <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{a.description}</p>
                    )}
                    {a.outcome && (
                      <p className="text-[11px] text-blue-600 mt-0.5 font-medium">Resultado: {a.outcome}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[10px] text-gray-400">{formatDateBR(a.completed_at)}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{a.created_by}</div>
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
