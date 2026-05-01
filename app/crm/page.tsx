"use client";

import { useEffect, useState } from "react";
import type { ReactNode, ElementType } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import {
  Users, Target, DollarSign, TrendingUp, CheckCircle2,
  Activity, AlertTriangle, Clock, ClipboardList,
  Phone, Mail, CalendarClock, BarChart3, FileText,
  MessageSquare, Zap,
} from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/utils";
// ─── Types ────────────────────────────────────────────────────────────────────

type CrmOpportunity = { opportunity_id: string; opportunity_code: string; opportunity_name: string; account_id: string | null; account_name?: string; contact_id: string | null; contact_name?: string | null; bu: string; stage: "discovery" | "qualification" | "proposal" | "negotiation" | "closed_won" | "closed_lost"; deal_value: number; probability: number; expected_close_date: string | null; actual_close_date: string | null; lost_reason: string | null; win_reason: string | null; owner: string; proposal_sent_date: string | null; synced_to_epm: boolean; epm_customer_id: string | null; epm_ar_id: string | null; created_at: string; updated_at: string; };
type CrmActivity = { activity_id: string; activity_type: "call" | "email" | "meeting" | "task" | "note"; related_to_type: "lead" | "opportunity" | "account" | "contact"; related_to_id: string; related_name?: string; subject: string; description: string | null; outcome: string | null; duration_minutes: number | null; scheduled_at: string | null; completed_at: string | null; status: "scheduled" | "completed" | "cancelled"; created_by: string; created_at: string; };

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_OPPS: CrmOpportunity[] = [
  { opportunity_id: "o1", opportunity_code: "OPP-001", opportunity_name: "XP Q2 — Campanha Performance", account_id: "a1", account_name: "XP Investimentos", contact_id: "c1", contact_name: "João Silva", bu: "CAZA", stage: "discovery", deal_value: 120000, probability: 25, expected_close_date: "2026-06-30", actual_close_date: null, lost_reason: null, win_reason: null, owner: "Miguel", proposal_sent_date: null, synced_to_epm: false, epm_customer_id: null, epm_ar_id: null, created_at: "2026-04-01T10:00:00Z", updated_at: "2026-04-10T10:00:00Z" },
  { opportunity_id: "o2", opportunity_code: "OPP-002", opportunity_name: "Nubank — Vídeo Institucional", account_id: "a2", account_name: "Nubank", contact_id: "c2", contact_name: "Maria Santos", bu: "CAZA", stage: "qualification", deal_value: 85000, probability: 40, expected_close_date: "2026-05-31", actual_close_date: null, lost_reason: null, win_reason: null, owner: "Danilo", proposal_sent_date: null, synced_to_epm: false, epm_customer_id: null, epm_ar_id: null, created_at: "2026-04-03T10:00:00Z", updated_at: "2026-04-12T10:00:00Z" },
  { opportunity_id: "o3", opportunity_code: "OPP-003", opportunity_name: "CEM — Produção Anual", account_id: "a3", account_name: "Colégio CEM", contact_id: "c3", contact_name: "Fernanda Costa", bu: "CAZA", stage: "proposal", deal_value: 35000, probability: 60, expected_close_date: "2026-05-15", actual_close_date: null, lost_reason: null, win_reason: null, owner: "Miguel", proposal_sent_date: "2026-04-20", synced_to_epm: false, epm_customer_id: null, epm_ar_id: null, created_at: "2026-04-05T10:00:00Z", updated_at: "2026-04-20T10:00:00Z" },
  { opportunity_id: "o4", opportunity_code: "OPP-004", opportunity_name: "Reabilicor — Consultoria Estratégica", account_id: "a4", account_name: "Reabilicor", contact_id: "c4", contact_name: "Dr. Roberto Silva", bu: "ADVISOR", stage: "negotiation", deal_value: 95000, probability: 75, expected_close_date: "2026-05-10", actual_close_date: null, lost_reason: null, win_reason: null, owner: "Danilo", proposal_sent_date: "2026-04-10", synced_to_epm: false, epm_customer_id: null, epm_ar_id: null, created_at: "2026-04-02T10:00:00Z", updated_at: "2026-04-22T10:00:00Z" },
  { opportunity_id: "o5", opportunity_code: "OPP-005", opportunity_name: "Carol Bertolini — Pacote Social", account_id: "a6", account_name: "Carol Bertolini", contact_id: "c5", contact_name: "Carol Bertolini", bu: "JACQES", stage: "closed_won", deal_value: 18000, probability: 100, expected_close_date: "2026-04-15", actual_close_date: "2026-04-15", lost_reason: null, win_reason: "Relationship,Price competitive", owner: "Miguel", proposal_sent_date: "2026-04-08", synced_to_epm: false, epm_customer_id: null, epm_ar_id: null, created_at: "2026-03-25T10:00:00Z", updated_at: "2026-04-15T10:00:00Z" },
  { opportunity_id: "o6", opportunity_code: "OPP-006", opportunity_name: "Clínica Teresópolis — Estratégia Digital", account_id: "a5", account_name: "Clínica Teresópolis", contact_id: "c6", contact_name: "Dra. Aline Duarte", bu: "ADVISOR", stage: "closed_lost", deal_value: 50000, probability: 0, expected_close_date: "2026-04-20", actual_close_date: "2026-04-20", lost_reason: "Price too high", win_reason: null, owner: "Danilo", proposal_sent_date: "2026-04-05", synced_to_epm: false, epm_customer_id: null, epm_ar_id: null, created_at: "2026-03-20T10:00:00Z", updated_at: "2026-04-20T10:00:00Z" },
  { opportunity_id: "o7", opportunity_code: "OPP-007", opportunity_name: "JACQES — Social Media Fintechx", account_id: null, account_name: "Fintechx (Prospect)", contact_id: null, contact_name: null, bu: "JACQES", stage: "discovery", deal_value: 60000, probability: 25, expected_close_date: "2026-06-15", actual_close_date: null, lost_reason: null, win_reason: null, owner: "Miguel", proposal_sent_date: null, synced_to_epm: false, epm_customer_id: null, epm_ar_id: null, created_at: "2026-04-21T10:00:00Z", updated_at: "2026-04-21T10:00:00Z" },
  { opportunity_id: "o8", opportunity_code: "OPP-008", opportunity_name: "XP — Brand Refresh Q3", account_id: "a1", account_name: "XP Investimentos", contact_id: "c1", contact_name: "João Silva", bu: "CAZA", stage: "qualification", deal_value: 45000, probability: 40, expected_close_date: "2026-07-31", actual_close_date: null, lost_reason: null, win_reason: null, owner: "Miguel", proposal_sent_date: null, synced_to_epm: false, epm_customer_id: null, epm_ar_id: null, created_at: "2026-04-22T10:00:00Z", updated_at: "2026-04-22T10:00:00Z" },
];

const SEED_ACTIVITIES: CrmActivity[] = [
  { activity_id: "act1", activity_type: "call", related_to_type: "opportunity", related_to_id: "o4", related_name: "Reabilicor — Consultoria", subject: "Alinhamento final de proposta", description: "Discutido escopo e ajuste de preço.", outcome: "Aguardando aprovação do sócio", duration_minutes: 30, scheduled_at: null, completed_at: "2026-04-22T14:00:00Z", status: "completed", created_by: "Danilo", created_at: "2026-04-22T14:30:00Z" },
  { activity_id: "act2", activity_type: "email", related_to_type: "opportunity", related_to_id: "o3", related_name: "CEM — Produção Anual", subject: "Envio da proposta revisada", description: "Proposta enviada com ajuste de cronograma.", outcome: null, duration_minutes: null, scheduled_at: null, completed_at: "2026-04-21T10:00:00Z", status: "completed", created_by: "Miguel", created_at: "2026-04-21T10:05:00Z" },
  { activity_id: "act3", activity_type: "meeting", related_to_type: "lead", related_to_id: "l1", related_name: "Tech Solutions BR", subject: "Reunião de descoberta", description: "Entendimento das necessidades de mídia social.", outcome: "Lead muito qualificado", duration_minutes: 60, scheduled_at: null, completed_at: "2026-04-20T16:00:00Z", status: "completed", created_by: "Miguel", created_at: "2026-04-20T17:00:00Z" },
  { activity_id: "act4", activity_type: "task", related_to_type: "opportunity", related_to_id: "o2", related_name: "Nubank — Vídeo", subject: "Preparar briefing criativo", description: null, outcome: null, duration_minutes: null, scheduled_at: "2026-04-28T09:00:00Z", completed_at: null, status: "scheduled", created_by: "Danilo", created_at: "2026-04-19T08:00:00Z" },
  { activity_id: "act5", activity_type: "note", related_to_type: "account", related_to_id: "a1", related_name: "XP Investimentos", subject: "Feedback da campanha Q1", description: "Cliente satisfeito com os resultados. Aberto para Q2.", outcome: null, duration_minutes: null, scheduled_at: null, completed_at: "2026-04-18T11:00:00Z", status: "completed", created_by: "Miguel", created_at: "2026-04-18T11:30:00Z" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string | null): number {
  if (!dateStr) return 999;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

// ─── Stage Config ─────────────────────────────────────────────────────────────

const STAGE_CONFIG: Record<string, { label: string; bar: string; text: string; bg: string; border: string }> = {
  discovery:     { label: "Discovery",    bar: "bg-blue-500",   text: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200" },
  qualification: { label: "Qualificação", bar: "bg-violet-500", text: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200" },
  proposal:      { label: "Proposta",      bar: "bg-amber-500",  text: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200" },
  negotiation:   { label: "Negociação",    bar: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  closed_won:    { label: "Fechado Ganho", bar: "bg-emerald-500",text: "text-emerald-700",bg: "bg-emerald-50",border: "border-emerald-200" },
  closed_lost:   { label: "Fechado Perdido",bar: "bg-red-500",   text: "text-red-700",    bg: "bg-red-50",    border: "border-red-200" },
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CrmDashboardPage() {
  const [opps, setOpps] = useState<CrmOpportunity[]>([]);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [isStatic, setIsStatic] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [analRes, pipeRes, actRes] = await Promise.all([
          fetch("/api/crm/analytics"),
          fetch("/api/crm/pipeline"),
          fetch("/api/crm/activities"),
        ]);
        const [analJson, pipeJson, actJson] = await Promise.all([
          analRes.json(),
          pipeRes.json(),
          actRes.json(),
        ]);
        if (analJson.success && pipeJson.success && actJson.success) {
          const allOpps = Object.values(pipeJson.data.byStage as Record<string, CrmOpportunity[]>).flat();
          setOpps(allOpps);
          setActivities(actJson.data);
          setAnalytics({
            leadsNew: analJson.data.leadsNew ?? 0,
            openOpportunities: analJson.data.openOpportunities ?? 0,
            pipelineValue: analJson.data.pipelineValue ?? 0,
            weightedForecast: analJson.data.weightedForecast ?? 0,
            closedWonThisMonth: analJson.data.revenueThisMonth ?? 0,
            winRate: analJson.data.winRate ?? 0,
            tasksToday: analJson.data.tasksToday ?? 0,
          });
        } else {
          throw new Error("API error");
        }
      } catch {
        setOpps(SEED_OPPS);
        setActivities(SEED_ACTIVITIES);
        const openSeed = SEED_OPPS.filter(o => o.stage !== "closed_won" && o.stage !== "closed_lost");
        const wonSeed  = SEED_OPPS.filter(o => o.stage === "closed_won");
        const lostSeed = SEED_OPPS.filter(o => o.stage === "closed_lost");
        const total = wonSeed.length + lostSeed.length;
        setAnalytics({
          leadsNew: 3,
          openOpportunities: openSeed.length,
          pipelineValue: openSeed.reduce((s, o) => s + o.deal_value, 0),
          weightedForecast: Math.round(openSeed.reduce((s, o) => s + o.deal_value * o.probability / 100, 0)),
          closedWonThisMonth: wonSeed.reduce((s, o) => s + o.deal_value, 0),
          winRate: total > 0 ? Math.round((wonSeed.length / total) * 100) : 0,
          tasksToday: 1,
        });
        setIsStatic(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <>
        <Header title="CRM — AWQ Group" subtitle="Controle de pipeline e vendas" />
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

  // Pipeline funnel stages
  const funnelStages = ["discovery", "qualification", "proposal", "negotiation"] as const;
  const maxVal = Math.max(...funnelStages.map(s => opps.filter(o => o.stage === s).reduce((a, o) => a + o.deal_value, 0)), 1);

  // Opportunities at risk: negotiation/proposal with close ≤7 days, fallback all open sorted by value
  const atRisk = openOpps
    .filter(o => (o.stage === "negotiation" || o.stage === "proposal") && o.expected_close_date && o.expected_close_date <= TODAY_PLUS_7)
    .sort((a, b) => b.deal_value - a.deal_value);
  const topOpps = atRisk.length > 0 ? atRisk.slice(0, 5) : [...openOpps].sort((a, b) => b.deal_value - a.deal_value).slice(0, 5);

  // Tasks for today
  const todayTasks = activities.filter(a => a.status === "scheduled" && a.scheduled_at && a.scheduled_at.slice(0, 10) === TODAY);

  // Recent activities (last 5 completed or with completed_at)
  const recentActs = [...activities]
    .filter(a => a.completed_at || a.status === "completed")
    .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""))
    .slice(0, 5);

  return (
    <>
      <Header title="CRM — AWQ Group" subtitle="Controle de pipeline e vendas" />
      <div className="page-container">

        {/* Static snapshot badge */}
        {isStatic && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
              Snapshot estático — dados de demonstração
            </span>
          </div>
        )}

        {/* ── KPI Row ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard
            label="Leads novos"
            value={analytics.leadsNew ?? 0}
            icon={Users}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          />
          <KpiCard
            label="Oportunidades abertas"
            value={analytics.openOpportunities ?? 0}
            icon={Target}
            iconColor="text-violet-600"
            iconBg="bg-violet-50"
          />
          <KpiCard
            label="Pipeline total"
            value={formatBRL(analytics.pipelineValue ?? 0)}
            icon={BarChart3}
            iconColor="text-amber-600"
            iconBg="bg-amber-50"
          />
          <KpiCard
            label="Forecast ponderado"
            value={formatBRL(analytics.weightedForecast ?? 0)}
            icon={DollarSign}
            iconColor="text-emerald-600"
            iconBg="bg-emerald-50"
            sub="prob. ponderada"
          />
          <KpiCard
            label="Fechado no mês"
            value={formatBRL(analytics.closedWonThisMonth ?? 0)}
            icon={CheckCircle2}
            iconColor="text-green-600"
            iconBg="bg-green-50"
          />
          <KpiCard
            label="Win Rate"
            value={`${analytics.winRate ?? 0}%`}
            icon={TrendingUp}
            iconColor="text-blue-600"
            iconBg="bg-blue-50"
          />
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
                          <BuBadge bu={o.bu} />
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
