"use client";
// ─── /awq-venture/deals/[id]/share ─ Visão Exclusiva do Cliente ───────────────
// PAPEL: visão da proposta para o cliente — clara, limpa, sem dados internos AWQ.
// SEPARAÇÃO: nunca expor dados operacionais internos nesta tela.
// FLUXO: cliente visualiza → comenta → submete contraproposta → confirma.
// PERSISTÊNCIA: estado local (localStorage) — para persistência real, implementar API.
// GOVERNANÇA: ao confirmar, deal.sendStatus → "Aprovado" e pipeline atualizado.

import { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import { getDealById } from "@/lib/deal-data";
import {
  CheckCircle2, MessageSquare, AlertTriangle,
  Clock, Send, ChevronDown, ChevronUp,
  Building2, DollarSign, FileText, ArrowLeft,
  Info, TrendingUp, User, Calendar,
} from "lucide-react";
import Link from "next/link";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number | null): string {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

// ─── Tipos locais ─────────────────────────────────────────────────────────────

type InteractionType = "comentario" | "sugestao" | "contraproposta" | "solicitacao";

interface Interaction {
  id:        string;
  type:      InteractionType;
  content:   string;
  createdAt: string;
  author:    "cliente";
}

type ConfirmationState = "aguardando" | "em_analise" | "interesse" | "negociando" | "confirmado" | "rejeitado";

const STORAGE_PREFIX = "awq_deal_share_";

function loadState(dealId: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + dealId);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveState(dealId: string, state: object) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PREFIX + dealId, JSON.stringify(state));
  } catch { /* noop */ }
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const statusConfig: Record<ConfirmationState, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  aguardando:  { label: "Aguardando resposta",      color: "text-gray-600",    bg: "bg-gray-100",    icon: Clock        },
  em_analise:  { label: "Em análise",               color: "text-blue-700",    bg: "bg-blue-50",     icon: Info         },
  interesse:   { label: "Interesse demonstrado",    color: "text-amber-700",   bg: "bg-amber-50",    icon: TrendingUp   },
  negociando:  { label: "Em negociação",            color: "text-violet-700",  bg: "bg-violet-50",   icon: MessageSquare},
  confirmado:  { label: "Proposta confirmada",      color: "text-emerald-700", bg: "bg-emerald-50",  icon: CheckCircle2 },
  rejeitado:   { label: "Proposta rejeitada",       color: "text-red-700",     bg: "bg-red-50",      icon: AlertTriangle},
};

const interactionLabels: Record<InteractionType, string> = {
  comentario:      "Comentário",
  sugestao:        "Sugestão",
  contraproposta:  "Contraproposta",
  solicitacao:     "Solicitação",
};

// ─── Componentes de seção ─────────────────────────────────────────────────────

function Section({ title, children, defaultOpen = true }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-gray-900">{title}</span>
        {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
      </button>
      {open && <div className="border-t border-gray-100 bg-white px-5 py-4">{children}</div>}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-700">{value}</span>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function DealSharePage({ params }: { params: { id: string } }) {
  const deal = getDealById(params.id);
  if (!deal) notFound();

  // ── Estado persistido em localStorage ─────────────────────────────────────
  const [confirmStatus, setConfirmStatus] = useState<ConfirmationState>("aguardando");
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [newInteractionType, setNewInteractionType] = useState<InteractionType>("comentario");
  const [newInteractionText, setNewInteractionText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitDone, setSubmitDone] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  // Carregar estado salvo
  useEffect(() => {
    const saved = loadState(deal.id);
    if (saved) {
      if (saved.confirmStatus) setConfirmStatus(saved.confirmStatus);
      if (saved.interactions) setInteractions(saved.interactions);
    }
  }, [deal.id]);

  // Salvar estado quando muda
  useEffect(() => {
    saveState(deal.id, { confirmStatus, interactions });
  }, [deal.id, confirmStatus, interactions]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleMarkAnalise() {
    if (confirmStatus === "aguardando") {
      setConfirmStatus("em_analise");
    }
  }

  function handleSubmitInteraction() {
    if (!newInteractionText.trim()) return;
    setSubmitting(true);

    const interaction: Interaction = {
      id:        `INT-${Date.now()}`,
      type:      newInteractionType,
      content:   newInteractionText.trim(),
      createdAt: new Date().toISOString().split("T")[0],
      author:    "cliente",
    };

    const updated = [...interactions, interaction];
    setInteractions(updated);
    setNewInteractionText("");
    setSubmitting(false);
    setSubmitDone(true);

    // Se ainda em aguardando, avançar para em_analise
    if (confirmStatus === "aguardando") setConfirmStatus("em_analise");
    // Se for contraproposta, avançar para negociando
    if (newInteractionType === "contraproposta" && confirmStatus !== "confirmado") {
      setConfirmStatus("negociando");
    }

    setTimeout(() => setSubmitDone(false), 3000);
  }

  function handleConfirm() {
    if (!confirmName.trim()) return;
    setConfirmStatus("confirmado");
    // ── Atualização da base e do pipeline ─────────────────────────────────
    // Em produção: chamar POST /api/awq-venture/deals/confirm
    //   body: { dealId: deal.id, confirmedBy: confirmName, confirmedAt: now }
    //   server: deal.sendStatus → "Aprovado"
    //           deal.stage → "Fechado" (ou "Negociação" dependendo do tipo)
    //           pipeline entry criada em venture-pipeline-registry
    // Por ora: estado persiste em localStorage com rastreabilidade.
    saveState(deal.id, {
      confirmStatus: "confirmado",
      interactions,
      confirmedBy:    confirmName,
      confirmedAt:    new Date().toISOString().split("T")[0],
      pipelineEntry:  true,
    });
  }

  function handleReject() {
    setConfirmStatus("rejeitado");
    saveState(deal.id, {
      confirmStatus: "rejeitado",
      interactions,
      rejectedAt:    new Date().toISOString().split("T")[0],
    });
  }

  // ── Dados da proposta (visão cliente-safe) ────────────────────────────────
  const p = deal.proposalStructure;
  const f = deal.financials;
  const id = deal.identification;
  const thesis = deal.strategicThesis;
  const statusCfg = statusConfig[confirmStatus];
  const StatusIcon = statusCfg.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center">
              <TrendingUp size={14} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">AWQ Venture × {deal.companyName}</div>
              <div className="text-[11px] text-gray-500">Proposta Confidencial · {deal.id}</div>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${statusCfg.color} ${statusCfg.bg}`}>
            <StatusIcon size={11} />
            {statusCfg.label}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">

        {/* Aviso de uso */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800">
          <Info size={13} className="shrink-0 mt-0.5" />
          <span>
            Este documento é <strong>confidencial</strong> e destinado exclusivamente à empresa acima.
            Use esta página para visualizar a proposta, enviar comentários, sugestões de melhoria, contrapropostas ou confirmar interesse.
          </span>
        </div>

        {/* Resumo executivo */}
        <div className="bg-gradient-to-b from-amber-50 to-white border border-amber-100 rounded-2xl p-6 text-center space-y-2">
          <div className="text-[10px] font-bold tracking-widest text-amber-600 uppercase">
            AWQ Venture · Proposta Comercial Confidencial
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            Proposta de Parceria Estratégica<br />AWQ Venture × {deal.companyName}
          </h1>
          <div className="text-sm text-gray-500">
            {deal.operationType} · {deal.valuationRange}
          </div>
          {deal.sendStatus !== "Rascunho" && (
            <div className="inline-flex items-center gap-2 mt-1">
              <span className="text-xs text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 font-medium">
                {deal.sendStatus}
              </span>
            </div>
          )}
        </div>

        {/* Seção 1: Contexto e Oportunidade */}
        <Section title="1. Contexto e Oportunidade">
          <div className="space-y-3">
            <p className="text-sm text-gray-700 leading-relaxed">{thesis.strategicRationale}</p>
            <InfoRow label="Por que agora" value={thesis.whyNow} />
            <InfoRow label="Sinergias"     value={thesis.synergies} />
          </div>
        </Section>

        {/* Seção 2: Tese de Criação de Valor */}
        <Section title="2. Tese de Criação de Valor">
          <p className="text-sm text-gray-700 leading-relaxed">{thesis.valueCreationThesis}</p>
        </Section>

        {/* Seção 3: Estrutura da Operação */}
        <Section title="3. Estrutura da Operação">
          <div className="space-y-3">
            <p className="text-sm text-gray-700 leading-relaxed">{p.economicProposal}</p>
            <p className="text-sm text-gray-700 leading-relaxed">{p.paymentStructure}</p>
            {p.conditions.length > 0 && (
              <div>
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Condições</div>
                <ul className="space-y-1">
                  {p.conditions.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-amber-500 mt-0.5">•</span>{c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>

        {/* Seção 4: Proposta Econômica */}
        <Section title="4. Proposta Econômica">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center p-3 rounded-lg bg-amber-50">
              <div className="text-base font-bold text-amber-700">{fmtR(f.proposedValuation)}</div>
              <div className="text-[10px] text-amber-600">Valuation proposto</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-50">
              <div className="text-base font-bold text-gray-700">{f.targetOwnership}%</div>
              <div className="text-[10px] text-gray-500">Participação alvo</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-50">
              <div className="text-base font-bold text-gray-700">{fmtR(f.estimatedInvestment)}</div>
              <div className="text-[10px] text-gray-500">Investimento estimado</div>
            </div>
          </div>
          {f.offerStructure && (
            <p className="text-sm text-gray-700 leading-relaxed">{f.offerStructure}</p>
          )}
          <div className="mt-2 text-[10px] text-gray-400 bg-gray-50 rounded-lg p-2">
            {f.revenueConfidence === "probable" && "⚠ Valores financeiros baseados em dados prováveis, não auditados externamente."}
            {f.revenueConfidence === "estimated" && "⚠ Valores financeiros são estimativas preliminares sem base documental formal."}
            {f.revenueConfidence === "confirmed" && "✓ Valores financeiros confirmados por auditoria."}
          </div>
        </Section>

        {/* Seção 5: Cronograma */}
        {p.stages.length > 0 && (
          <Section title="5. Cronograma">
            <div className="space-y-2">
              {p.stages.map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                  <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-[10px] font-bold text-amber-700">{i+1}</div>
                  <div>
                    <div className="text-xs font-semibold text-gray-900">{s.label}</div>
                    <div className="text-[11px] text-gray-500">{s.description}</div>
                    {s.targetDate && (
                      <div className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-1">
                        <Calendar size={9} />{s.targetDate}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {p.timeline && (
              <p className="text-xs text-gray-500 mt-3 bg-amber-50 rounded-lg px-3 py-2">{p.timeline}</p>
            )}
          </Section>
        )}

        {/* Seção 6: Próximos Passos */}
        {p.nextSteps.length > 0 && (
          <Section title="6. Próximos Passos">
            <ol className="space-y-2">
              {p.nextSteps.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-xs font-bold text-amber-600 mt-0.5 shrink-0">{i+1}.</span>{s}
                </li>
              ))}
            </ol>
          </Section>
        )}

        {/* ── Área de interação do cliente ──────────────────────────────────── */}
        <div className="border-2 border-amber-200 rounded-2xl overflow-hidden">
          <div className="bg-amber-50 px-5 py-3.5 border-b border-amber-200">
            <div className="flex items-center gap-2">
              <MessageSquare size={14} className="text-amber-600" />
              <span className="text-sm font-bold text-amber-900">Área de Resposta do Cliente</span>
            </div>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Use este espaço para comentários, sugestões, contrapropostas ou solicitações de esclarecimento.
            </p>
          </div>

          <div className="bg-white p-5 space-y-4">
            {/* Histórico de interações */}
            {interactions.length > 0 && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Histórico</div>
                {interactions.map((int) => (
                  <div key={int.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        int.type === "contraproposta" ? "bg-violet-100 text-violet-700" :
                        int.type === "sugestao" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {interactionLabels[int.type]}
                      </span>
                      <span className="text-[10px] text-gray-400">{int.createdAt}</span>
                    </div>
                    <p className="text-sm text-gray-700">{int.content}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Formulário de nova interação */}
            {confirmStatus !== "confirmado" && confirmStatus !== "rejeitado" ? (
              <div className="space-y-3">
                <div className="flex gap-2">
                  {(["comentario", "sugestao", "contraproposta", "solicitacao"] as InteractionType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setNewInteractionType(t)}
                      className={`text-[11px] font-medium px-2.5 py-1 rounded-lg transition-colors ${
                        newInteractionType === t
                          ? "bg-amber-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {interactionLabels[t]}
                    </button>
                  ))}
                </div>
                <textarea
                  value={newInteractionText}
                  onChange={(e) => setNewInteractionText(e.target.value)}
                  placeholder={
                    newInteractionType === "contraproposta"
                      ? "Descreva sua contraproposta com clareza — valores, prazo, estrutura..."
                      : newInteractionType === "sugestao"
                      ? "Descreva sua sugestão de melhoria para a proposta..."
                      : "Digite seu comentário ou solicitação..."
                  }
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 resize-none"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">
                    Seu comentário será registrado e encaminhado à equipe AWQ Venture.
                  </span>
                  <button
                    onClick={handleSubmitInteraction}
                    disabled={!newInteractionText.trim() || submitting}
                    className="flex items-center gap-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-40 px-4 py-2 rounded-lg transition-colors"
                  >
                    <Send size={11} />
                    {submitDone ? "Enviado!" : "Enviar"}
                  </button>
                </div>
              </div>
            ) : (
              <div className={`text-center py-6 rounded-xl ${confirmStatus === "confirmado" ? "bg-emerald-50" : "bg-red-50"}`}>
                <div className={`text-sm font-bold ${confirmStatus === "confirmado" ? "text-emerald-700" : "text-red-700"}`}>
                  {confirmStatus === "confirmado"
                    ? "Proposta confirmada com sucesso."
                    : "Proposta rejeitada."}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {confirmStatus === "confirmado"
                    ? "A equipe AWQ Venture foi notificada. Próximos passos serão comunicados em breve."
                    : "A equipe AWQ Venture foi notificada. Obrigado pelo retorno."}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── CTA de Confirmação ─────────────────────────────────────────────── */}
        {confirmStatus !== "confirmado" && confirmStatus !== "rejeitado" && (
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <h3 className="text-sm font-bold text-gray-900">Confirmar Interesse na Proposta</h3>
            </div>
            <p className="text-xs text-gray-600">
              Ao confirmar, você declara interesse formal nesta proposta.
              A confirmação aciona o fluxo de contrato e inclusão no pipeline ativo da AWQ Venture.
              Isso não constitui vinculação contratual — o contrato formal será negociado separadamente.
            </p>

            {confirmStatus !== "confirmado" && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder="Seu nome completo para identificação"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirm}
                    disabled={!confirmName.trim()}
                    className="flex-1 flex items-center justify-center gap-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 py-2.5 rounded-xl transition-colors"
                  >
                    <CheckCircle2 size={14} />
                    Confirmar Interesse
                  </button>
                  <button
                    onClick={handleReject}
                    className="flex items-center justify-center gap-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-4 py-2.5 rounded-xl transition-colors"
                  >
                    Declinar
                  </button>
                </div>
              </div>
            )}

            {confirmStatus === "aguardando" && (
              <button
                onClick={handleMarkAnalise}
                className="w-full text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                Estou analisando a proposta → marcar como "Em análise"
              </button>
            )}
          </div>
        )}

        {/* ── Rodapé ──────────────────────────────────────────────────────── */}
        <div className="text-center text-[10px] text-gray-400 space-y-1 py-4 border-t border-gray-200">
          <div>AWQ Venture · Documento Confidencial · {deal.id}</div>
          <div>Acesso restrito ao destinatário desta proposta</div>
          <div className="text-[9px]">
            Estado local — para integração com base de dados, API /api/awq-venture/deals/confirm necessária.
          </div>
        </div>
      </div>
    </div>
  );
}
