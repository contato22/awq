"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import {
  BarChart3, TrendingUp, Users, HeartPulse,
  ArrowUpRight, Megaphone, Clock, Target,
  FileBarChart, RefreshCw, ChevronRight,
} from "lucide-react";
import { PIPELINE_STAGES, type CrmOpportunity, type CrmClient } from "@/lib/jacqes-crm-db";
import { fetchCRM } from "@/lib/jacqes-crm-query";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + Math.round(n / 1_000) + "K";
  return "R$" + n;
}

const CICLO_MEDIO_DIAS = 22;

// ─── Static report definitions ────────────────────────────────────────────────

interface ReportDef {
  icon: React.ElementType;
  title: string;
  description: string;
  area: string;
  areaColor: string;
  iconColor: string;
}

const REPORT_DEFS: ReportDef[] = [
  {
    icon: BarChart3,
    title: "Pipeline por Estágio",
    description:
      "Distribuição de oportunidades e valor potencial por estágio do funil comercial. Identifica gargalos e prioriza ações.",
    area: "Comercial",
    areaColor: "bg-brand-50 border border-brand-200 text-brand-700",
    iconColor: "bg-brand-50 border border-brand-200 text-brand-600",
  },
  {
    icon: Clock,
    title: "Aging de Oportunidades",
    description:
      "Tempo médio por estágio, oportunidades estagnadas e alertas de SLA. Base para gestão de cadência comercial.",
    area: "Comercial",
    areaColor: "bg-brand-50 border border-brand-200 text-brand-700",
    iconColor: "bg-amber-50 border border-amber-200 text-amber-600",
  },
  {
    icon: TrendingUp,
    title: "Taxa de Conversão por Etapa",
    description:
      "Funil de conversão estágio a estágio com drop-off rates, win rate final e benchmarks históricos.",
    area: "Analytics",
    areaColor: "bg-violet-50 border border-violet-200 text-violet-700",
    iconColor: "bg-violet-50 border border-violet-200 text-violet-600",
  },
  {
    icon: HeartPulse,
    title: "Health Score da Carteira",
    description:
      "Evolução temporal do health score, distribuição por faixa de risco e ações recomendadas por cliente.",
    area: "CS Ops",
    areaColor: "bg-emerald-50 border border-emerald-200 text-emerald-700",
    iconColor: "bg-emerald-50 border border-emerald-200 text-emerald-600",
  },
  {
    icon: ArrowUpRight,
    title: "Expansão por Cliente",
    description:
      "Pipeline de upsell e cross-sell por cliente ativo. Potencial de receita incremental e status de progresso.",
    area: "Receita",
    areaColor: "bg-cyan-50 border border-cyan-200 text-cyan-700",
    iconColor: "bg-cyan-50 border border-cyan-200 text-cyan-600",
  },
  {
    icon: Megaphone,
    title: "Performance por Canal de Aquisição",
    description:
      "Leads, conversão e ticket médio segmentados por canal (indicação, Instagram, LinkedIn). Guia alocação de esforço.",
    area: "Marketing",
    areaColor: "bg-pink-50 border border-pink-200 text-pink-700",
    iconColor: "bg-pink-50 border border-pink-200 text-pink-600",
  },
];

// ─── Components ───────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</div>
        <div className="text-xl font-bold text-gray-900 mt-0.5">{value}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function ReportCard({ def }: { def: ReportDef }) {
  const Icon = def.icon;
  return (
    <div className="card card-hover p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${def.iconColor}`}>
          <Icon size={18} />
        </div>
        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${def.areaColor}`}>
          {def.area}
        </span>
      </div>
      <div className="flex-1">
        <div className="font-semibold text-gray-900 text-sm">{def.title}</div>
        <div className="text-xs text-gray-500 mt-1.5 leading-relaxed">{def.description}</div>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <span className="text-xs text-gray-400">Última geração: hoje</span>
        <button className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-500 font-medium transition-colors">
          <RefreshCw size={11} />
          Gerar Relatório
        </button>
      </div>
    </div>
  );
}

function FunnelBar({
  stage,
  count,
  maxCount,
  value,
}: {
  stage: string;
  count: number;
  maxCount: number;
  value: number;
}) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  const isLost = stage === "Fechado Perdido";
  const isWon  = stage === "Fechado Ganho";

  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-36 text-xs text-gray-600 font-medium shrink-0 truncate">{stage}</div>
      <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden relative">
        <div
          className={`h-full rounded transition-all ${
            isWon ? "bg-emerald-400" : isLost ? "bg-red-300" : "bg-brand-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="w-6 text-xs font-bold text-gray-700 text-right shrink-0">{count}</div>
      <div className="w-16 text-xs text-gray-400 text-right shrink-0">{fmtCurrency(value)}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RelatoriosPage() {
  const [opps,    setOpps]    = useState<CrmOpportunity[]>([]);
  const [clients, setClients] = useState<CrmClient[]>([]);

  useEffect(() => {
    Promise.all([
      fetchCRM<CrmOpportunity>("opportunities"),
      fetchCRM<CrmClient>("clients"),
    ]).then(([o, c]) => { setOpps(o); setClients(c); });
  }, []);

  // ── Computed metrics ──────────────────────────────────────────────────────
  const closed    = opps.filter((o) => o.stage === "Fechado Ganho" || o.stage === "Fechado Perdido");
  const won       = opps.filter((o) => o.stage === "Fechado Ganho");
  const winRate   = closed.length > 0
    ? Math.round((won.length / closed.length) * 100)
    : 0;

  const closedTickets = won.map((o) => o.ticket_estimado).filter((t) => t > 0);
  const ticketMedio   = closedTickets.length > 0
    ? Math.round(closedTickets.reduce((s, t) => s + t, 0) / closedTickets.length)
    : opps.length > 0
      ? Math.round(opps.reduce((s, o) => s + o.ticket_estimado, 0) / opps.length)
      : 0;

  const totalMrr         = clients.reduce((s, c) => s + c.ticket_mensal, 0);
  const pipelineTotal    = opps.reduce((s, o) => s + o.valor_potencial, 0);
  const pipelineCoverage = totalMrr > 0
    ? (pipelineTotal / (totalMrr * 12)).toFixed(1) + "x"
    : "—";

  // ── Funnel by stage ───────────────────────────────────────────────────────
  const stageData = PIPELINE_STAGES.map((stage) => {
    const stageOpps = opps.filter((o) => o.stage === stage);
    return {
      stage,
      count: stageOpps.length,
      value: stageOpps.reduce((s, o) => s + o.valor_potencial, 0),
    };
  });
  const maxCount = Math.max(...stageData.map((s) => s.count), 1);

  return (
    <>
      <Header
        title="Relatórios"
        subtitle="JACQES CRM · Analytics comercial"
      />

      <div className="page-container">
        {/* Metrics strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            label="Win Rate"
            value={`${winRate}%`}
            sub={`${won.length} de ${closed.length} fechadas`}
            icon={Target}
            color="bg-emerald-50 border border-emerald-200 text-emerald-600"
          />
          <MetricCard
            label="Ticket Médio"
            value={fmtCurrency(ticketMedio)}
            sub="estimado por oportunidade"
            icon={TrendingUp}
            color="bg-brand-50 border border-brand-200 text-brand-600"
          />
          <MetricCard
            label="Ciclo Médio"
            value={`${CICLO_MEDIO_DIAS} dias`}
            sub="abertura → fechamento"
            icon={Clock}
            color="bg-amber-50 border border-amber-200 text-amber-600"
          />
          <MetricCard
            label="Pipeline Coverage"
            value={pipelineCoverage}
            sub={`${fmtCurrency(pipelineTotal)} pipeline / ARR`}
            icon={BarChart3}
            color="bg-violet-50 border border-violet-200 text-violet-600"
          />
        </div>

        {/* Report cards */}
        <div>
          <SectionHeader
            icon={<FileBarChart size={15} />}
            title="Relatórios Disponíveis"
            badge={
              <span className="badge badge-blue ml-1">{REPORT_DEFS.length}</span>
            }
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {REPORT_DEFS.map((def) => (
              <ReportCard key={def.title} def={def} />
            ))}
          </div>
        </div>

        {/* Conversion funnel */}
        <div className="card p-5">
          <SectionHeader
            icon={<ChevronRight size={15} />}
            title="Funil de Conversão — Pipeline Atual"
            badge={
              <span className="badge badge-blue ml-1">{opps.length} opps</span>
            }
          />

          {opps.length === 0 ? (
            <EmptyState
              icon={<BarChart3 size={20} className="text-gray-400" />}
              title="Sem oportunidades no pipeline"
              description="Adicione oportunidades para visualizar o funil de conversão."
              compact
            />
          ) : (
            <div className="space-y-0.5">
              {stageData.map(({ stage, count, value }) => (
                <FunnelBar
                  key={stage}
                  stage={stage}
                  count={count}
                  maxCount={maxCount}
                  value={value}
                />
              ))}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Total no pipeline:{" "}
              <span className="font-semibold text-gray-700">{fmtCurrency(pipelineTotal)}</span>
            </span>
            <span>
              Oportunidades ativas:{" "}
              <span className="font-semibold text-gray-700">
                {opps.filter((o) => o.stage !== "Fechado Ganho" && o.stage !== "Fechado Perdido").length}
              </span>
            </span>
          </div>
        </div>

        {/* Quick actions */}
        <div className="card p-4 flex items-center gap-3 flex-wrap">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mr-1">
            Exportar:
          </span>
          {["Pipeline CSV", "Health Score", "Conversão", "Relatório Completo"].map((label) => (
            <button
              key={label}
              className={label === "Relatório Completo" ? "btn-primary" : "btn-secondary"}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
