"use client";
// ─── /awq-venture/comercial ─ Área Comercial da AWQ Venture ───────────────────
// ISOLAMENTO: exclusivo da AWQ Venture.
// DADOS: /api/venture/crm/* (venture-crm-db.ts → Neon Postgres + seed fallback)
// VISÃO INTERNA: pipeline, KPIs, gestão de oportunidades
// VISÃO CLIENTE: acessar via /awq-venture/deals/[id]/share (separado)

import { useEffect, useState } from "react";
import type { ElementType } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import {
  DollarSign, TrendingUp, FileText, CheckCircle2,
  Clock, AlertTriangle, ChevronRight, Eye, Building2,
  BarChart3, Activity, Info, ArrowRight, RefreshCw,
} from "lucide-react";
import type { VentureCrmOpportunity, VentureCrmProposal, VentureCrmInteraction } from "@/lib/venture-crm-db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number | null, quality?: string): string {
  if (n === null || quality === "sem_dado") return "—";
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

// ─── Badges de qualidade de dado ──────────────────────────────────────────────

const qualityConfig: Record<string, { label: string; cls: string }> = {
  real:      { label: "Real",      cls: "text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200" },
  estimado:  { label: "Estimado",  cls: "text-amber-700 bg-amber-50 ring-1 ring-amber-200"       },
  manual:    { label: "Manual",    cls: "text-blue-700 bg-blue-50 ring-1 ring-blue-200"           },
  sem_dado:  { label: "Sem dado",  cls: "text-gray-400 bg-gray-100 ring-1 ring-gray-200"          },
};

function QualityBadge({ q }: { q: string }) {
  const cfg = qualityConfig[q] ?? qualityConfig.sem_dado;
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${cfg.cls}`}>
      {q === "sem_dado" && <AlertTriangle size={8} />}
      {cfg.label}
    </span>
  );
}

// ─── Stage badges ─────────────────────────────────────────────────────────────

const stageColor: Record<string, string> = {
  "Oportunidade":        "text-gray-600 bg-gray-100",
  "Proposta Enviada":    "text-blue-700 bg-blue-50",
  "Negociação":          "text-violet-700 bg-violet-50",
  "Contrato Ativo":      "text-emerald-700 bg-emerald-50",
  "Fee Recorrente":      "text-emerald-700 bg-emerald-50",
  "Upside Potencial":    "text-amber-700 bg-amber-50",
  "Investimento/M4E":    "text-indigo-700 bg-indigo-50",
  "Receita Operacional": "text-emerald-700 bg-emerald-50",
  "Encerrado":           "text-red-600 bg-red-50",
};

const proposalStatusColor: Record<string, string> = {
  "Rascunho":          "text-gray-400",
  "Pronto para Envio": "text-amber-600 font-semibold",
  "Enviado":           "text-blue-600 font-semibold",
  "Em Negociação":     "text-violet-600 font-semibold",
  "Aprovado":          "text-emerald-600 font-semibold",
  "Rejeitado":         "text-red-500",
};

// ─── Proposal Detail Overlay ──────────────────────────────────────────────────

function ProposalDetailOverlay({
  opp,
  proposal,
  onClose,
}: {
  opp: VentureCrmOpportunity;
  proposal: VentureCrmProposal;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-y-auto">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-amber-600 flex items-center justify-center">
            <TrendingUp size={13} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900">Preview Enviável — {opp.empresa}</div>
            <div className="text-[11px] text-gray-500">
              {proposal.id} · v{proposal.versao} ·{" "}
              <span className={proposalStatusColor[proposal.status]}>{proposal.status}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
            <AlertTriangle size={10} />
            Uso interno — não é o link do cliente
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Fechar Preview
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full px-8 py-10 space-y-8">
        <div className="border border-gray-200 rounded-2xl p-8 text-center space-y-3 bg-gradient-to-b from-amber-50 to-white">
          <div className="text-[10px] font-bold tracking-widest text-amber-600 uppercase">
            AWQ Venture · Proposta Comercial Confidencial
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{proposal.titulo}</h1>
          <div className="text-sm text-gray-500">Versão {proposal.versao}</div>
          <div className="inline-flex items-center gap-2 mt-2">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${stageColor[opp.stage] ?? "text-gray-500 bg-gray-100"}`}>
              {opp.stage}
            </span>
            {proposal.fee_quality !== "sem_dado" && proposal.fee_mensal !== null && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full ring-1 ring-emerald-200">
                Fee: R${(proposal.fee_mensal).toLocaleString("pt-BR")}/mês
              </span>
            )}
          </div>
        </div>

        {proposal.resumo_executivo && (
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-1">Resumo Executivo</h2>
            <p className="text-sm text-gray-700 leading-relaxed">{proposal.resumo_executivo}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {proposal.fee_mensal !== null && proposal.fee_quality !== "sem_dado" && (
            <div className="text-center p-3 rounded-xl bg-amber-50">
              <div className="text-lg font-bold text-amber-700">R${proposal.fee_mensal.toLocaleString("pt-BR")}</div>
              <div className="text-[11px] text-amber-600">Fee mensal</div>
              <QualityBadge q={proposal.fee_quality} />
            </div>
          )}
          {proposal.duracao_contrato && (
            <div className="text-center p-3 rounded-xl bg-gray-50">
              <div className="text-lg font-bold text-gray-700">{proposal.duracao_contrato}</div>
              <div className="text-[11px] text-gray-500">Prazo</div>
            </div>
          )}
        </div>

        {proposal.descricao_upside && (
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-1">Upside / Equity</h2>
            <p className="text-sm text-gray-700 leading-relaxed">{proposal.descricao_upside}</p>
          </div>
        )}

        {proposal.observacoes && (
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-1">Observações</h2>
            <p className="text-xs text-gray-500 leading-relaxed bg-gray-50 rounded-lg p-3">{proposal.observacoes}</p>
          </div>
        )}

        <div className="border-t border-gray-200 pt-6 text-center text-[10px] text-gray-400 space-y-1">
          <div>AWQ Venture · Documento Confidencial · Para uso exclusivo do destinatário</div>
          <div>Gerado em {new Date().toLocaleDateString("pt-BR")} · {proposal.id} v{proposal.versao}</div>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

type Section = "overview" | "pipeline" | "propostas" | "interacoes";

export default function ComercialPage() {
  const [section, setSection] = useState<Section>("overview");
  const [opps, setOpps] = useState<VentureCrmOpportunity[]>([]);
  const [proposals, setProposals] = useState<VentureCrmProposal[]>([]);
  const [interactions, setInteractions] = useState<VentureCrmInteraction[]>([]);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewOpp, setPreviewOpp] = useState<VentureCrmOpportunity | null>(null);
  const [previewProposal, setPreviewProposal] = useState<VentureCrmProposal | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [oppsRes, propsRes, intRes, statsRes] = await Promise.all([
        fetch("/api/venture/crm/oportunidades"),
        fetch("/api/venture/crm/propostas"),
        fetch("/api/venture/crm/interacoes"),
        fetch("/api/venture/crm/stats"),
      ]);
      setOpps(await oppsRes.json());
      setProposals(await propsRes.json());
      setInteractions(await intRes.json());
      setStats(await statsRes.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const activeContracts = opps.filter(o =>
    o.stage === "Contrato Ativo" || o.stage === "Fee Recorrente"
  );
  const openPipeline = opps.filter(o =>
    o.stage !== "Encerrado" && o.stage !== "Fee Recorrente" && o.stage !== "Contrato Ativo"
  );
  const oppsWithProposals = opps.filter(o =>
    proposals.some(p => p.opportunity_id === o.id)
  );

  const sectionTabs: { key: Section; label: string; icon: ElementType }[] = [
    { key: "overview",   label: "Visão Executiva", icon: BarChart3 },
    { key: "pipeline",   label: "Pipeline",        icon: Activity  },
    { key: "propostas",  label: "Propostas",       icon: FileText  },
    { key: "interacoes", label: "Interações",      icon: ChevronRight },
  ];

  function openProposalPreview(opp: VentureCrmOpportunity) {
    const p = proposals.find(pr => pr.opportunity_id === opp.id);
    if (p) {
      setPreviewOpp(opp);
      setPreviewProposal(p);
    }
  }

  return (
    <>
      <Header
        title="Comercial — AWQ Venture"
        subtitle="Frente comercial · advisory, M4E, fee recorrente e propostas"
      />

      {/* ── Aviso de escopo de dados ────────────────────────────────────── */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 mb-5">
        <Info size={13} className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800">
          <strong>Frente comercial da AWQ Venture como prestadora de serviço</strong> (advisory, M4E, fee recorrente).
          {" "}Deals de aquisição/investimento estão em{" "}
          <Link href="/awq-venture/deals" className="underline font-semibold hover:text-amber-900">Deals →</Link>
          {" "}Campos marcados com <strong>Sem dado</strong> não possuem informação confiável disponível.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-sm text-red-700">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {/* ── KPI row ────────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          {[
            {
              label:   "Contratos Ativos",
              value:   stats.activeContracts,
              quality: null,
              icon:    CheckCircle2,
              color:   "text-emerald-700",
              bg:      "bg-emerald-50",
            },
            {
              label:   "MRR Contratado",
              value:   stats.mrr > 0 ? fmtR(stats.mrr) : "—",
              quality: stats.mrr > 0 ? "real" : null,
              icon:    DollarSign,
              color:   "text-amber-700",
              bg:      "bg-amber-50",
            },
            {
              label:   "ARR Contratado",
              value:   stats.arr > 0 ? fmtR(stats.arr) : "—",
              quality: stats.arr > 0 ? "real" : null,
              icon:    TrendingUp,
              color:   "text-amber-700",
              bg:      "bg-amber-50",
            },
            {
              label:   "Pipeline Potencial",
              value:   stats.pipelinePotential > 0 ? fmtR(stats.pipelinePotential) : "—",
              quality: stats.pipelinePotential > 0 ? "estimado" : null,
              icon:    BarChart3,
              color:   "text-gray-500",
              bg:      "bg-gray-100",
            },
          ].map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} className="card p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={16} className={k.color} />
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">{k.value}</div>
                  <div className="text-[11px] text-gray-500">{k.label}</div>
                  {k.quality && <QualityBadge q={k.quality} />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Section switcher ───────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 border-b border-gray-200 mb-5">
        {sectionTabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setSection(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                section === t.key
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-700"
              }`}
            >
              <Icon size={13} />
              {t.label}
            </button>
          );
        })}
        <div className="ml-auto">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 px-3 py-2 transition-colors"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Atualizar
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 text-sm text-gray-400 gap-2">
          <RefreshCw size={14} className="animate-spin" />
          Carregando dados…
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ── Seção: Visão Executiva ──────────────────────────────────── */}
          {section === "overview" && stats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Total Oportunidades", value: stats.totalOpportunities },
                  { label: "Propostas Enviadas",  value: stats.proposalsSent      },
                  { label: "Pipeline Aberto",     value: stats.openPipeline       },
                  { label: "Contratos em Vigor",  value: stats.activeContracts    },
                ].map((s) => (
                  <div key={s.label} className="card p-4 text-center">
                    <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                    <div className="text-[11px] text-gray-500 mt-1">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Contratos ativos */}
              <div className="card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900">Contratos Ativos</h3>
                </div>
                {activeContracts.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-400">
                    Nenhum contrato ativo no momento.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {activeContracts.map((o) => (
                      <div key={o.id} className="px-5 py-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <Building2 size={14} className="text-emerald-600" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{o.empresa}</div>
                            <div className="text-[11px] text-gray-500">{o.setor} · {o.deal_type}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          {o.fee_mensal !== null && o.fee_mensal_quality !== "sem_dado" ? (
                            <>
                              <div className="text-sm font-bold text-amber-600">
                                {fmtR(o.fee_mensal)}/mês
                              </div>
                              <QualityBadge q={o.fee_mensal_quality} />
                            </>
                          ) : (
                            <span className="text-xs text-gray-400">Fee: sem dado confiável</span>
                          )}
                        </div>
                        <div>
                          <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${stageColor[o.stage] ?? "text-gray-500 bg-gray-100"}`}>
                            {o.stage}
                          </span>
                        </div>
                        {proposals.some(p => p.opportunity_id === o.id) && (
                          <button
                            onClick={() => openProposalPreview(o)}
                            className="flex items-center gap-1.5 text-[11px] font-medium text-amber-600 hover:text-amber-800 transition-colors"
                          >
                            <Eye size={12} />
                            Preview
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Link para deals M&A */}
              <div className="card p-4 flex items-center justify-between bg-gray-50 border border-gray-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <FileText size={14} className="text-amber-700" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Deals M&A / Aquisições</div>
                    <div className="text-[11px] text-gray-500">
                      Pipeline de aquisições e investimentos em /awq-venture/deals
                    </div>
                  </div>
                </div>
                <Link
                  href="/awq-venture/deals"
                  className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-700 hover:text-amber-900 transition-colors"
                >
                  Ver Deals <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          )}

          {/* ── Seção: Pipeline ────────────────────────────────────────────── */}
          {section === "pipeline" && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Pipeline Comercial</h3>
                <span className="text-xs text-gray-400">{opps.length} oportunidades</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/60">
                      {["Empresa", "Tipo", "Stage", "Fee/Mês", "ARR", "Contrato", "Prob.", "Prioridade", "Próxima Ação", ""].map((h) => (
                        <th key={h} className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {opps.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-gray-900 text-sm">{o.empresa}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">{o.id} · {o.setor}</div>
                        </td>
                        <td className="py-3 px-4 text-[11px] text-gray-600 whitespace-nowrap">{o.deal_type}</td>
                        <td className="py-3 px-4">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${stageColor[o.stage] ?? "text-gray-500 bg-gray-100"}`}>
                            {o.stage}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {o.fee_mensal !== null && o.fee_mensal_quality !== "sem_dado" ? (
                            <div>
                              <div className="text-sm font-bold text-amber-600 tabular-nums">
                                {fmtR(o.fee_mensal)}
                              </div>
                              <QualityBadge q={o.fee_mensal_quality} />
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-300">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {o.arr !== null && o.arr_quality !== "sem_dado" ? (
                            <div>
                              <div className="text-sm font-bold text-gray-700 tabular-nums">
                                {fmtR(o.arr)}
                              </div>
                              <QualityBadge q={o.arr_quality} />
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-300">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {o.contract_value !== null && o.contract_value_quality !== "sem_dado" ? (
                            <div>
                              <div className="text-sm font-bold text-gray-700 tabular-nums">
                                {fmtR(o.contract_value)}
                              </div>
                              <QualityBadge q={o.contract_value_quality} />
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-300">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`text-sm font-bold tabular-nums ${o.probabilidade >= 70 ? "text-emerald-600" : o.probabilidade >= 30 ? "text-amber-600" : "text-gray-400"}`}>
                            {o.probabilidade}%
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            o.prioridade === "Alta"  ? "text-red-700 bg-red-50" :
                            o.prioridade === "Média" ? "text-amber-700 bg-amber-50" :
                            "text-gray-600 bg-gray-100"
                          }`}>
                            {o.prioridade}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-[200px]">
                          <div className="text-[11px] text-gray-500 truncate">{o.proxima_acao}</div>
                        </td>
                        <td className="py-3 px-4">
                          {proposals.some(p => p.opportunity_id === o.id) && (
                            <button
                              onClick={() => openProposalPreview(o)}
                              className="flex items-center gap-1 text-[11px] text-amber-600 hover:text-amber-800 transition-colors"
                            >
                              <Eye size={11} />
                              Preview
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Seção: Propostas ──────────────────────────────────────────── */}
          {section === "propostas" && (
            <div className="space-y-4">
              {oppsWithProposals.length === 0 ? (
                <div className="card p-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <FileText size={20} className="text-gray-300" />
                  </div>
                  <div className="text-sm font-semibold text-gray-500">Nenhuma proposta registrada</div>
                  <div className="text-xs text-gray-400 mt-1">
                    As propostas comerciais aparecerão aqui quando criadas.
                  </div>
                </div>
              ) : (
                oppsWithProposals.map((o) => {
                  const p = proposals.find(pr => pr.opportunity_id === o.id)!;
                  return (
                    <div key={o.id} className="card p-5 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-gray-900">{o.empresa}</h3>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${stageColor[o.stage] ?? ""}`}>
                              {o.stage}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">{p.titulo}</div>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            {p.id} · v{p.versao}
                            {p.enviado_em && ` · Enviado: ${p.enviado_em}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs ${proposalStatusColor[p.status]}`}>{p.status}</span>
                          <button
                            onClick={() => openProposalPreview(o)}
                            className="flex items-center gap-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <Eye size={12} />
                            Ver Preview
                          </button>
                          {p.client_visible && o.deal_ref && (
                            <Link
                              href={`/awq-venture/deals/${o.deal_ref}/share`}
                              className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              <ChevronRight size={12} />
                              Link Cliente
                            </Link>
                          )}
                        </div>
                      </div>

                      <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 leading-relaxed">
                        {p.resumo_executivo}
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {p.fee_mensal !== null && p.fee_quality !== "sem_dado" && (
                          <div className="text-center p-2 rounded-lg bg-amber-50">
                            <div className="text-sm font-bold text-amber-700">R${p.fee_mensal.toLocaleString("pt-BR")}</div>
                            <div className="text-[10px] text-amber-600">Fee mensal</div>
                            <QualityBadge q={p.fee_quality} />
                          </div>
                        )}
                        {p.duracao_contrato && (
                          <div className="text-center p-2 rounded-lg bg-gray-50">
                            <div className="text-sm font-bold text-gray-700">{p.duracao_contrato}</div>
                            <div className="text-[10px] text-gray-500">Prazo</div>
                          </div>
                        )}
                        <div className="text-center p-2 rounded-lg bg-gray-50">
                          <div className="text-sm font-bold text-gray-700">{o.probabilidade}%</div>
                          <div className="text-[10px] text-gray-500">Probabilidade</div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Oportunidades sem proposta */}
              {openPipeline.filter((o) => !proposals.some(p => p.opportunity_id === o.id)).length > 0 && (
                <div className="card p-5 border-dashed">
                  <div className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">
                    Oportunidades sem proposta ({openPipeline.filter((o) => !proposals.some(p => p.opportunity_id === o.id)).length})
                  </div>
                  <div className="space-y-2">
                    {openPipeline.filter((o) => !proposals.some(p => p.opportunity_id === o.id)).map((o) => (
                      <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <span className="text-sm font-medium text-gray-700">{o.empresa}</span>
                          <span className="ml-2 text-[11px] text-gray-400">{o.deal_type}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Sem proposta</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Seção: Interações ──────────────────────────────────────── */}
          {section === "interacoes" && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Histórico de Interações</h3>
                <span className="text-xs text-gray-400">{interactions.length} registros</span>
              </div>
              {interactions.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-gray-400">
                  Nenhuma interação registrada.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {interactions.map((i) => (
                    <div key={i.id} className="px-5 py-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200">
                          {i.tipo}
                        </span>
                        <span className="text-[11px] text-gray-400">{i.data}</span>
                        {i.opportunity_id && (
                          <span className="text-[11px] text-gray-400">
                            · {opps.find(o => o.id === i.opportunity_id)?.empresa ?? i.opportunity_id}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">{i.resumo}</p>
                      {i.proximo_passo && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-amber-700">
                          <Clock size={10} />
                          {i.proximo_passo}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Proposal Preview Overlay ──────────────────────────────────── */}
      {previewOpp && previewProposal && (
        <ProposalDetailOverlay
          opp={previewOpp}
          proposal={previewProposal}
          onClose={() => { setPreviewOpp(null); setPreviewProposal(null); }}
        />
      )}
    </>
  );
}
