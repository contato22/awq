"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import {
  Target, DollarSign, TrendingUp, BarChart3,
  AlertTriangle, Clock, ArrowRight,
} from "lucide-react";
import type { CrmOpportunity } from "@/lib/jacqes-crm-db";
import { fetchCRM } from "@/lib/jacqes-crm-query";

// ─── Constants ────────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  "Novo Lead", "Qualificação", "Diagnóstico", "Proposta",
  "Negociação", "Fechado Ganho", "Fechado Perdido",
] as const;

type Stage = (typeof PIPELINE_STAGES)[number] | "Todas";

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

const TODAY = new Date().toISOString().slice(0, 10);

// ─── Stage badge ──────────────────────────────────────────────────────────────

const STAGE_CFG: Record<string, { text: string; bg: string }> = {
  "Novo Lead":       { text: "text-gray-300",    bg: "bg-gray-500/15"    },
  "Qualificação":    { text: "text-blue-300",    bg: "bg-blue-500/15"    },
  "Diagnóstico":     { text: "text-violet-300",  bg: "bg-violet-500/15"  },
  "Proposta":        { text: "text-amber-300",   bg: "bg-amber-500/15"   },
  "Negociação":      { text: "text-orange-300",  bg: "bg-orange-500/15"  },
  "Fechado Ganho":   { text: "text-emerald-300", bg: "bg-emerald-500/15" },
  "Fechado Perdido": { text: "text-red-300",     bg: "bg-red-500/15"     },
};

function StageBadge({ stage }: { stage: string }) {
  const cfg = STAGE_CFG[stage] ?? { text: "text-gray-300", bg: "bg-gray-500/15" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.text} ${cfg.bg}`}>
      {stage}
    </span>
  );
}

// ─── Risk badge ───────────────────────────────────────────────────────────────

function RiskBadge({ risco }: { risco: string }) {
  if (risco === "Alto")  return <span className="badge badge-red text-[10px]">Alto</span>;
  if (risco === "Médio") return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200">Médio</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-emerald-700 bg-emerald-100 border border-emerald-200">Baixo</span>;
}

// ─── Probability bar ──────────────────────────────────────────────────────────

function ProbBar({ pct }: { pct: number }) {
  const color =
    pct >= 75 ? "bg-emerald-400" :
    pct >= 50 ? "bg-amber-400" :
    pct >= 25 ? "bg-orange-400" :
    "bg-red-400";
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-semibold text-gray-400">{pct}%</span>
    </div>
  );
}

// ─── Aging pill ───────────────────────────────────────────────────────────────

function AgingPill({ dataAbertura }: { dataAbertura: string }) {
  const days = Math.floor((Date.now() - new Date(dataAbertura).getTime()) / 86400000);
  return (
    <span className={`text-[10px] font-semibold ${days > 30 ? "text-red-400" : "text-gray-500"}`}>
      {days}d
    </span>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

interface SumCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}

function SumCard({ label, value, icon: Icon, iconColor, iconBg }: SumCardProps) {
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon size={16} className={iconColor} />
      </div>
      <div>
        <div className="text-xl font-bold text-white leading-tight">{value}</div>
        <div className="text-[10px] text-gray-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JacqesCrmPipelinePage() {
  const [opps, setOpps] = useState<CrmOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<Stage>("Todas");

  useEffect(() => {
    fetchCRM<CrmOpportunity>("opportunities")
      .then(d => { setOpps(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Derived summary metrics
  const totalOpps = opps.length;
  const pipelineTotal = opps.reduce((s: number, o: CrmOpportunity) => s + o.valor_potencial, 0);
  const receitaPonderada = opps.reduce((s: number, o: CrmOpportunity) => s + (o.valor_potencial * o.probabilidade / 100), 0);
  const ticketMedio = totalOpps > 0 ? pipelineTotal / totalOpps : 0;

  // Filtered rows
  const filtered = activeStage === "Todas"
    ? opps
    : opps.filter((o: CrmOpportunity) => o.stage === activeStage);

  const allStages: Stage[] = ["Todas", ...PIPELINE_STAGES];

  const stageCount = (s: Stage) =>
    s === "Todas" ? opps.length : opps.filter((o: CrmOpportunity) => o.stage === s).length;

  if (loading) {
    return (
      <>
        <Header title="Pipeline — JACQES CRM" subtitle="Carregando..." />
        <div className="page-container">
          <div className="card p-8 flex items-center justify-center">
            <div className="flex items-center gap-3 text-gray-500">
              <div className="w-4 h-4 border-2 border-gray-600 border-t-brand-400 rounded-full animate-spin" />
              <span className="text-sm">Carregando pipeline…</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header title="Pipeline — JACQES CRM" subtitle="Erro ao carregar dados" />
        <div className="page-container">
          <EmptyState
            icon={<AlertTriangle size={20} className="text-red-400" />}
            title="Erro ao carregar pipeline"
            description={error}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="Pipeline — JACQES CRM"
        subtitle="Sistema operacional comercial"
      />
      <div className="page-container">

        {/* ── Summary ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SumCard
            label="Total de Oportunidades"
            value={totalOpps}
            icon={Target}
            iconColor="text-violet-400"
            iconBg="bg-violet-500/10"
          />
          <SumCard
            label="Pipeline Total"
            value={fmtCurrency(pipelineTotal)}
            icon={BarChart3}
            iconColor="text-amber-400"
            iconBg="bg-amber-500/10"
          />
          <SumCard
            label="Receita Ponderada"
            value={fmtCurrency(receitaPonderada)}
            icon={DollarSign}
            iconColor="text-emerald-400"
            iconBg="bg-emerald-500/10"
          />
          <SumCard
            label="Ticket Médio"
            value={fmtCurrency(ticketMedio)}
            icon={TrendingUp}
            iconColor="text-brand-400"
            iconBg="bg-brand-500/10"
          />
        </div>

        {/* ── Stage filter tabs ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          {allStages.map((s) => {
            const active = activeStage === s;
            const count = stageCount(s);
            return (
              <button
                key={s}
                onClick={() => setActiveStage(s)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors
                  ${active
                    ? "bg-brand-500 text-white shadow-sm"
                    : "bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700"
                  }`}
              >
                {s}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${active ? "bg-white/20 text-white" : "bg-gray-700 text-gray-500"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Table ────────────────────────────────────────────────────────── */}
        <div className="card p-5">
          <SectionHeader
            icon={<Target size={15} />}
            title={activeStage === "Todas" ? "Todas as Oportunidades" : activeStage}
            badge={
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">
                {filtered.length}
              </span>
            }
          />

          {filtered.length === 0 ? (
            <EmptyState
              compact
              icon={<Clock size={16} className="text-gray-400" />}
              title="Nenhuma oportunidade neste estágio"
              description="Ajuste o filtro ou adicione uma nova oportunidade."
            />
          ) : (
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left  py-2.5 px-3 text-[10px] font-semibold text-gray-500 whitespace-nowrap">Oportunidade</th>
                    <th className="text-left  py-2.5 px-3 text-[10px] font-semibold text-gray-500 whitespace-nowrap">Stage</th>
                    <th className="text-right py-2.5 px-3 text-[10px] font-semibold text-gray-500 whitespace-nowrap">Valor Potencial</th>
                    <th className="text-right py-2.5 px-3 text-[10px] font-semibold text-gray-500 whitespace-nowrap">Ticket Est.</th>
                    <th className="text-left  py-2.5 px-3 text-[10px] font-semibold text-gray-500 whitespace-nowrap">Probabilidade</th>
                    <th className="text-left  py-2.5 px-3 text-[10px] font-semibold text-gray-500 whitespace-nowrap">Próxima Ação</th>
                    <th className="text-left  py-2.5 px-3 text-[10px] font-semibold text-gray-500 whitespace-nowrap">Risco</th>
                    <th className="text-left  py-2.5 px-3 text-[10px] font-semibold text-gray-500 whitespace-nowrap">Owner</th>
                    <th className="text-right py-2.5 px-3 text-[10px] font-semibold text-gray-500 whitespace-nowrap">Aging</th>
                    <th className="py-2.5 px-3 w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o: CrmOpportunity) => {
                    const actionPast = o.data_proxima_acao && o.data_proxima_acao < TODAY;
                    return (
                      <tr
                        key={o.id}
                        className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors group"
                      >
                        {/* Oportunidade */}
                        <td className="py-2.5 px-3">
                          <div className="text-[11px] font-semibold text-gray-200 truncate max-w-[200px]">
                            {o.nome_oportunidade}
                          </div>
                          <div className="text-[10px] text-gray-600 truncate max-w-[200px]">
                            {o.empresa}
                          </div>
                        </td>

                        {/* Stage */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <StageBadge stage={o.stage} />
                        </td>

                        {/* Valor Potencial */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <span className="text-[11px] font-bold text-amber-400">
                            {fmtCurrency(o.valor_potencial)}
                          </span>
                        </td>

                        {/* Ticket Estimado */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <span className="text-[11px] text-gray-400">
                            {fmtCurrency(o.ticket_estimado)}
                          </span>
                        </td>

                        {/* Probabilidade */}
                        <td className="py-2.5 px-3">
                          <ProbBar pct={o.probabilidade} />
                        </td>

                        {/* Próxima Ação */}
                        <td className="py-2.5 px-3">
                          <div className="text-[10px] text-gray-400 truncate max-w-[160px]">{o.proxima_acao}</div>
                          <div className={`text-[10px] font-medium mt-0.5 ${actionPast ? "text-red-400" : "text-gray-600"}`}>
                            {fmtDate(o.data_proxima_acao)}
                          </div>
                        </td>

                        {/* Risco */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <RiskBadge risco={o.risco} />
                        </td>

                        {/* Owner */}
                        <td className="py-2.5 px-3 text-[11px] text-gray-500 whitespace-nowrap">
                          {o.owner}
                        </td>

                        {/* Aging */}
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <AgingPill dataAbertura={o.data_abertura} />
                        </td>

                        {/* Arrow */}
                        <td className="py-2.5 px-3">
                          <ArrowRight size={12} className="text-gray-700 group-hover:text-gray-400 transition-colors" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
