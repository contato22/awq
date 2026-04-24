"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import {
  Target, DollarSign, TrendingUp, BarChart3,
  AlertTriangle, Clock, ArrowLeftRight, X, UserPlus,
} from "lucide-react";
import type { CrmOpportunity, CrmClient } from "@/lib/jacqes-crm-db";
import { fetchCRM } from "@/lib/jacqes-crm-query";
import { crmUpdate, crmCreate } from "@/lib/jacqes-crm-store";

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
  const [stageModal, setStageModal] = useState<{ open: boolean; opp: CrmOpportunity | null }>({ open: false, opp: null });
  const [clientModal, setClientModal] = useState<CrmOpportunity | null>(null);
  const [clientForm, setClientForm] = useState({ nome: "", razao_social: "", segmento: "", produto_ativo: "", ticket_mensal: "", owner: "", observacoes: "" });
  const [savingClient, setSavingClient] = useState(false);

  useEffect(() => {
    fetchCRM<CrmOpportunity>("opportunities")
      .then(d => { setOpps(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Derived summary metrics
  const totalOpps = opps.length;
  const pipelineTotal = opps.reduce((s, o) => s + o.valor_potencial, 0);
  const receitaPonderada = opps.reduce((s, o) => s + (o.valor_potencial * o.probabilidade / 100), 0);
  const ticketMedio = totalOpps > 0 ? pipelineTotal / totalOpps : 0;

  const filtered = activeStage === "Todas"
    ? opps
    : opps.filter((o) => o.stage === activeStage);

  const allStages: Stage[] = ["Todas", ...PIPELINE_STAGES];

  const stageCount = (s: Stage) =>
    s === "Todas" ? opps.length : opps.filter((o) => o.stage === s).length;

  function openStageModal(opp: CrmOpportunity) {
    setStageModal({ open: true, opp });
  }

  function moveStage(newStage: string) {
    const opp = stageModal.opp;
    if (!opp) return;
    crmUpdate<CrmOpportunity>("opportunities", opp.id, { stage: newStage });
    setOpps(prev => prev.map(o => o.id === opp.id ? { ...o, stage: newStage } : o));
    setStageModal({ open: false, opp: null });
  }

  function openClientModal(opp: CrmOpportunity) {
    setClientModal(opp);
    setClientForm({
      nome:          opp.empresa,
      razao_social:  opp.empresa,
      segmento:      opp.segmento || "",
      produto_ativo: opp.produto || "",
      ticket_mensal: String(opp.ticket_estimado || ""),
      owner:         opp.owner,
      observacoes:   `Convertido de oportunidade: ${opp.nome_oportunidade}`,
    });
  }

  function saveClient() {
    if (!clientForm.nome.trim()) return;
    setSavingClient(true);
    const payload: Omit<CrmClient, "id"> = {
      nome:               clientForm.nome.trim(),
      razao_social:       clientForm.razao_social.trim() || clientForm.nome.trim(),
      cnpj:               "",
      segmento:           clientForm.segmento.trim(),
      produto_ativo:      clientForm.produto_ativo.trim(),
      ticket_mensal:      parseFloat(clientForm.ticket_mensal) || 0,
      inicio_relacao:     new Date().toISOString().slice(0, 10),
      owner:              clientForm.owner.trim(),
      status_conta:       "Ativo",
      health_score:       80,
      churn_risk:         "Baixo",
      potencial_expansao: 0,
      observacoes:        clientForm.observacoes.trim(),
    };
    crmCreate<CrmClient>("clients", payload, "cli");
    if (clientModal) {
      crmUpdate<CrmOpportunity>("opportunities", clientModal.id, { stage: "Fechado Ganho" });
      setOpps(prev => prev.map(o => o.id === clientModal.id ? { ...o, stage: "Fechado Ganho" } : o));
    }
    setSavingClient(false);
    setClientModal(null);
    alert("Cliente criado! Acesse Clientes para ver e editar.");
  }

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
                    <th className="py-2.5 px-3 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => {
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

                        {/* Actions */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => openStageModal(o)}
                              title="Mover de stage"
                              className="p-1 rounded hover:bg-gray-700 text-gray-600 hover:text-gray-300 transition-colors"
                            >
                              <ArrowLeftRight size={12} />
                            </button>
                            {o.stage === "Fechado Ganho" && (
                              <button
                                onClick={() => openClientModal(o)}
                                title="Converter em Cliente"
                                className="p-1 rounded hover:bg-emerald-900/40 text-gray-600 hover:text-emerald-400 transition-colors"
                              >
                                <UserPlus size={12} />
                              </button>
                            )}
                          </div>
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

      {/* ── Stage Move Modal ──────────────────────────────────────────────────── */}
      {stageModal.open && stageModal.opp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-100">Mover Stage</h3>
                <p className="text-[11px] text-gray-500 mt-0.5 truncate max-w-[220px]">
                  {stageModal.opp.nome_oportunidade}
                </p>
              </div>
              <button onClick={() => setStageModal({ open: false, opp: null })} className="text-gray-500 hover:text-gray-300">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-1.5">
              {PIPELINE_STAGES.map(stage => {
                const isCurrent = stageModal.opp!.stage === stage;
                const cfg = STAGE_CFG[stage];
                return (
                  <button
                    key={stage}
                    onClick={() => moveStage(stage)}
                    disabled={isCurrent}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors border ${
                      isCurrent
                        ? `${cfg.bg} ${cfg.text} border-transparent opacity-60 cursor-default`
                        : "bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700 hover:text-gray-100"
                    }`}
                  >
                    {isCurrent ? `✓ ${stage} (atual)` : stage}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Converter em Cliente Modal ────────────────────────────────────────── */}
      {clientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Converter em Cliente</h3>
                <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[260px]">{clientModal.nome_oportunidade}</p>
              </div>
              <button onClick={() => setClientModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Nome do Cliente *</label>
                <input type="text" value={clientForm.nome}
                  onChange={e => setClientForm(f => ({ ...f, nome: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Segmento</label>
                  <input type="text" value={clientForm.segmento}
                    onChange={e => setClientForm(f => ({ ...f, segmento: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Produto Ativo</label>
                  <input type="text" value={clientForm.produto_ativo}
                    onChange={e => setClientForm(f => ({ ...f, produto_ativo: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Ticket Mensal (R$)</label>
                  <input type="number" min="0" value={clientForm.ticket_mensal}
                    onChange={e => setClientForm(f => ({ ...f, ticket_mensal: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 block mb-1">Owner</label>
                  <input type="text" value={clientForm.owner}
                    onChange={e => setClientForm(f => ({ ...f, owner: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 block mb-1">Observações</label>
                <textarea rows={2} value={clientForm.observacoes}
                  onChange={e => setClientForm(f => ({ ...f, observacoes: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => setClientModal(null)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button onClick={saveClient} disabled={savingClient || !clientForm.nome.trim()}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50">
                  {savingClient ? "Criando…" : "Criar Cliente"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
