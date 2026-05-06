"use client";
// ─── /awq-venture/comercial ─ Área Comercial da AWQ Venture ───────────────────
// ISOLAMENTO: exclusivo da AWQ Venture.
// DADOS: venture-commercial-data.ts (única fonte de verdade)
// VISÃO INTERNA: pipeline, KPIs, gestão de oportunidades
// VISÃO CLIENTE: acessar via /awq-venture/deals/[id]/share (separado)

import { useState } from "react";
import type { ElementType } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import {
  DollarSign, TrendingUp, FileText, CheckCircle2,
  Clock, AlertTriangle, ChevronRight, Eye, Building2,
  BarChart3, Activity, Info, ArrowRight,
} from "lucide-react";
import {
  commercialOpportunities,
  getCommercialKPIs,
  getActiveCommercialContracts,
  getOpportunitiesWithProposals,
} from "@/lib/venture-commercial-data";
import type {
  CommercialOpportunity,
  DataQuality,
  CommercialProposal,
} from "@/lib/venture-commercial-types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number | null, quality: DataQuality): string {
  if (n === null || quality === "sem_dado") return "—";
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return "R$" + (n / 1_000).toFixed(1) + "K";
  return "R$" + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtRaw(n: number): string {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return "R$" + (n / 1_000).toFixed(1) + "K";
  return "R$" + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Badges de qualidade de dado ──────────────────────────────────────────────

const qualityConfig: Record<DataQuality, { label: string; cls: string }> = {
  real:      { label: "Real",      cls: "text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200" },
  estimado:  { label: "Estimado",  cls: "text-amber-700 bg-amber-50 ring-1 ring-amber-200"       },
  manual:    { label: "Manual",    cls: "text-blue-700 bg-blue-50 ring-1 ring-blue-200"           },
  sem_dado:  { label: "Sem dado",  cls: "text-gray-400 bg-gray-100 ring-1 ring-gray-200"          },
};

function QualityBadge({ q }: { q: DataQuality }) {
  const { label, cls } = qualityConfig[q];
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${cls}`}>
      {q === "sem_dado" && <AlertTriangle size={8} />}
      {label}
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

// ─── Proposal Preview Overlay ─────────────────────────────────────────────────

function ProposalPreviewOverlay({
  opp,
  onClose,
}: {
  opp: CommercialOpportunity;
  onClose: () => void;
}) {
  const p = opp.proposal!;
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-y-auto">
      {/* Barra de controle */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-amber-600 flex items-center justify-center">
            <TrendingUp size={13} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900">Preview Enviável — {opp.company}</div>
            <div className="text-[11px] text-gray-500">
              {p.proposalId} · v{p.version} ·{" "}
              <span className={proposalStatusColor[p.status]}>{p.status}</span>
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

      {/* Documento da proposta */}
      <div className="max-w-3xl mx-auto w-full px-8 py-10 space-y-8">

        {/* Capa */}
        <div className="border border-gray-200 rounded-2xl p-8 text-center space-y-3 bg-gradient-to-b from-amber-50 to-white">
          <div className="text-[10px] font-bold tracking-widest text-amber-600 uppercase">
            AWQ Venture · Proposta Comercial Confidencial
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{p.title}</h1>
          <div className="text-sm text-gray-500">
            Versão {p.version} · Atualizado em {p.updatedAt}
          </div>
          <div className="inline-flex items-center gap-2 mt-2">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${stageColor[opp.stage] ?? "text-gray-500 bg-gray-100"}`}>
              {opp.stage}
            </span>
            {p.feeQuality !== "sem_dado" && p.monthlyFee !== null && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full ring-1 ring-emerald-200">
                Fee: R${p.monthlyFee.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mês
              </span>
            )}
          </div>
        </div>

        {/* Seções da proposta */}
        {[
          { title: "1. Resumo Executivo",         body: p.executiveSummary   },
          { title: "2. Contexto e Oportunidade",  body: p.context            },
          { title: "3. Diagnóstico",              body: p.diagnosis          },
          { title: "4. Estrutura da Operação",    body: p.operationStructure },
          { title: "5. Proposta Econômica",       body: p.economicProposal   },
          { title: "6. Upside Potencial",         body: p.upsideDescription  },
          { title: "7. Governança",               body: p.governance         },
        ].map((s) => (
          <div key={s.title} className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-1">{s.title}</h2>
            <p className="text-sm text-gray-700 leading-relaxed">{s.body}</p>
          </div>
        ))}

        {/* Premissas */}
        {p.premises.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-1">8. Premissas</h2>
            <ul className="space-y-1">
              {p.premises.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-amber-500 mt-0.5 shrink-0">•</span>{item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Riscos */}
        {p.risks.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-1">9. Riscos e Ressalvas</h2>
            <ul className="space-y-1">
              {p.risks.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Cronograma */}
        {p.schedule.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-1">10. Cronograma</h2>
            <div className="space-y-2">
              {p.schedule.map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-[10px] font-bold text-amber-700">{i+1}</div>
                  <div>
                    <div className="text-xs font-semibold text-gray-900">{s.phase}</div>
                    <div className="text-[11px] text-gray-500">{s.description}</div>
                    <div className="text-[10px] text-amber-600 mt-0.5">{s.targetDate}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Próximos passos */}
        {p.nextSteps.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-1">11. Próximos Passos</h2>
            <ol className="space-y-1">
              {p.nextSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-xs font-bold text-amber-600 mt-0.5 shrink-0">{i+1}.</span>{step}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Observações */}
        {p.observations && (
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-1">12. Observações e Ressalvas</h2>
            <p className="text-xs text-gray-500 leading-relaxed bg-gray-50 rounded-lg p-3">{p.observations}</p>
          </div>
        )}

        {/* Rodapé da proposta */}
        <div className="border-t border-gray-200 pt-6 text-center text-[10px] text-gray-400 space-y-1">
          <div>AWQ Venture · Documento Confidencial · Para uso exclusivo do destinatário</div>
          <div>Gerado em {new Date().toLocaleDateString("pt-BR")} · {p.proposalId} v{p.version}</div>
          <div className="text-[9px]">
            Para confirmar interesse ou enviar comentários, acesse o link exclusivo da proposta.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

type Section = "overview" | "pipeline" | "propostas";

export default function ComercialPage() {
  const [section, setSection] = useState<Section>("overview");
  const [previewOpp, setPreviewOpp] = useState<CommercialOpportunity | null>(null);

  const kpis = getCommercialKPIs();
  const opps = commercialOpportunities;
  const activeContracts = getActiveCommercialContracts();
  const oppsWithProposals = getOpportunitiesWithProposals();

  const sectionTabs: { key: Section; label: string; icon: ElementType }[] = [
    { key: "overview",  label: "Visão Executiva", icon: BarChart3   },
    { key: "pipeline",  label: "Pipeline",        icon: Activity    },
    { key: "propostas", label: "Propostas",       icon: FileText    },
  ];

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

      {/* ── KPI row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          {
            label:   "Contratos Ativos",
            value:   kpis.activeContracts,
            quality: null,
            icon:    CheckCircle2,
            color:   "text-emerald-700",
            bg:      "bg-emerald-50",
          },
          {
            label:   "MRR Contratado",
            value:   kpis.mrr > 0 ? fmtRaw(kpis.mrr) : "—",
            quality: kpis.mrr > 0 ? kpis.mrrQuality : null,
            icon:    DollarSign,
            color:   "text-amber-700",
            bg:      "bg-amber-50",
          },
          {
            label:   "ARR Contratado",
            value:   kpis.arr > 0 ? fmtRaw(kpis.arr) : "—",
            quality: kpis.arr > 0 ? kpis.arrQuality : null,
            icon:    TrendingUp,
            color:   "text-amber-700",
            bg:      "bg-amber-50",
          },
          {
            label:   "Upside Potencial",
            value:   kpis.upsidePotential !== null ? fmtRaw(kpis.upsidePotential) : "Sem dado",
            quality: kpis.upsidePotential !== null ? "estimado" : null,
            icon:    BarChart3,
            color:   "text-gray-400",
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
                {k.quality && <QualityBadge q={k.quality as DataQuality} />}
              </div>
            </div>
          );
        })}
      </div>

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
      </div>

      {/* ── Seção: Visão Executiva ──────────────────────────────────────── */}
      {section === "overview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Total Oportunidades",  value: kpis.totalOpportunities },
              { label: "Propostas Ativas",     value: kpis.activeProposals    },
              { label: "Em Negociação",        value: kpis.activeNegotiations },
              { label: "Contratos em Vigor",   value: kpis.activeContracts    },
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
                        <div className="text-sm font-semibold text-gray-900">{o.company}</div>
                        <div className="text-[11px] text-gray-500">{o.sector} · {o.dealType}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      {o.economics.monthlyFee !== null && o.economics.monthlyFeeQuality !== "sem_dado" ? (
                        <>
                          <div className="text-sm font-bold text-amber-600">
                            {fmtRaw(o.economics.monthlyFee)}/mês
                          </div>
                          <QualityBadge q={o.economics.monthlyFeeQuality} />
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
                    {o.proposal && (
                      <button
                        onClick={() => setPreviewOpp(o)}
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
                  {["Empresa", "Tipo", "Stage", "Fee/Mês", "ARR", "Contrato", "Prob.", "Prioridade", "Responsável", "Próxima Ação", ""].map((h) => (
                    <th key={h} className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {opps.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-gray-900 text-sm">{o.company}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{o.id} · {o.sector}</div>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-gray-600 whitespace-nowrap">{o.dealType}</td>
                    <td className="py-3 px-4">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${stageColor[o.stage] ?? "text-gray-500 bg-gray-100"}`}>
                        {o.stage}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {o.economics.monthlyFee !== null && o.economics.monthlyFeeQuality !== "sem_dado" ? (
                        <div>
                          <div className="text-sm font-bold text-amber-600 tabular-nums">
                            {fmtRaw(o.economics.monthlyFee)}
                          </div>
                          <QualityBadge q={o.economics.monthlyFeeQuality} />
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {o.economics.arr !== null && o.economics.arrQuality !== "sem_dado" ? (
                        <div>
                          <div className="text-sm font-bold text-gray-700 tabular-nums">
                            {fmtRaw(o.economics.arr)}
                          </div>
                          <QualityBadge q={o.economics.arrQuality} />
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {o.economics.contractValue !== null && o.economics.contractValueQuality !== "sem_dado" ? (
                        <div>
                          <div className="text-sm font-bold text-gray-700 tabular-nums">
                            {fmtRaw(o.economics.contractValue)}
                          </div>
                          <QualityBadge q={o.economics.contractValueQuality} />
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-300">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-sm font-bold tabular-nums ${o.probability >= 70 ? "text-emerald-600" : o.probability >= 30 ? "text-amber-600" : "text-gray-400"}`}>
                        {o.probability}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        o.priority === "Alta" ? "text-red-700 bg-red-50" :
                        o.priority === "Média" ? "text-amber-700 bg-amber-50" :
                        "text-gray-600 bg-gray-100"
                      }`}>
                        {o.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-gray-500">{o.responsible}</td>
                    <td className="py-3 px-4 max-w-[200px]">
                      <div className="text-[11px] text-gray-500 truncate">{o.nextAction}</div>
                    </td>
                    <td className="py-3 px-4">
                      {o.proposal && (
                        <button
                          onClick={() => setPreviewOpp(o)}
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
              const p = o.proposal!;
              return (
                <div key={o.id} className="card p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-gray-900">{o.company}</h3>
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${stageColor[o.stage] ?? ""}`}>
                          {o.stage}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{p.title}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {p.proposalId} · v{p.version} · Atualizado: {p.updatedAt}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs ${proposalStatusColor[p.status]}`}>{p.status}</span>
                      <button
                        onClick={() => setPreviewOpp(o)}
                        className="flex items-center gap-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Eye size={12} />
                        Ver Preview Enviável
                      </button>
                      {o.proposal?.clientVisible && (
                        <Link
                          href={`/awq-venture/deals/${o.dealRef ?? o.id}/share`}
                          className="flex items-center gap-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <ChevronRight size={12} />
                          Link Cliente
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 leading-relaxed">
                    {p.executiveSummary}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {p.monthlyFee !== null && p.feeQuality !== "sem_dado" && (
                      <div className="text-center p-2 rounded-lg bg-amber-50">
                        <div className="text-sm font-bold text-amber-700">R${p.monthlyFee.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div className="text-[10px] text-amber-600">Fee mensal</div>
                        <QualityBadge q={p.feeQuality} />
                      </div>
                    )}
                    <div className="text-center p-2 rounded-lg bg-gray-50">
                      <div className="text-sm font-bold text-gray-700">{p.contractDuration}</div>
                      <div className="text-[10px] text-gray-500">Prazo</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-gray-50">
                      <div className="text-sm font-bold text-gray-700">{p.advanceCriteria.length}</div>
                      <div className="text-[10px] text-gray-500">Critérios de avanço</div>
                    </div>
                  </div>

                  {/* Próximos passos */}
                  {p.nextSteps.length > 0 && (
                    <div>
                      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Próximos passos</div>
                      <ul className="space-y-0.5">
                        {p.nextSteps.slice(0, 3).map((s, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11px] text-gray-600">
                            <span className="text-amber-500 mt-0.5">→</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Confirmação do cliente */}
                  {o.confirmation && (
                    <div className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                      o.confirmation.status === "confirmado"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-gray-50 text-gray-600"
                    }`}>
                      <CheckCircle2 size={12} />
                      <span>
                        Status cliente: <strong>{o.confirmation.status}</strong>
                        {o.confirmation.confirmedAt && ` · Confirmado em ${o.confirmation.confirmedAt}`}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Slots sem proposta */}
          {opps.filter((o) => o.proposal === null).length > 0 && (
            <div className="card p-5 border-dashed">
              <div className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wide">
                Oportunidades sem proposta ({opps.filter((o) => o.proposal === null).length})
              </div>
              <div className="space-y-2">
                {opps.filter((o) => o.proposal === null).map((o) => (
                  <div key={o.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <span className="text-sm font-medium text-gray-700">{o.company}</span>
                      <span className="ml-2 text-[11px] text-gray-400">{o.dealType}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Sem proposta</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Proposal Preview Overlay ──────────────────────────────────── */}
      {previewOpp && (
        <ProposalPreviewOverlay
          opp={previewOpp}
          onClose={() => setPreviewOpp(null)}
        />
      )}
    </>
  );
}
