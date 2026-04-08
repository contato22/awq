"use client";
// ─── LP de Vendas Gamificada — Proposta AWQ Venture ───────────────────────────
// Cada seção da proposta é revisada individualmente pelo cliente.
// Aprovação / Rejeição / Solicitação de ajuste por seção.
// Ao final, cliente envia rodada de negociação que vai para base interna AWQ.

import { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import { getDealById } from "@/lib/deal-data";
import {
  CheckCircle2, XCircle, Pencil, Send, TrendingUp,
  ChevronDown, ChevronUp, Info, Trophy,
  MessageSquare, Clock, Sparkles, Shield,
  DollarSign, Calendar, ArrowRight, Target,
  CheckCheck, AlertTriangle, RotateCcw, Zap,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionStatus = "pending" | "approved" | "rejected" | "adjusted";

interface SectionResponse {
  id:          string;
  status:      SectionStatus;
  counterText: string;
}

interface NegotiationRound {
  round:          number;
  sections:       SectionResponse[];
  respondedBy:    string;
  overallMessage: string;
  finalDecision:  "approved" | "counter" | null;
  submittedAt:    string;
}

const STORAGE_KEY = (id: string) => `awq_deal_client_responses_${id}`;

function loadRounds(dealId: string): NegotiationRound[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY(dealId)) ?? "[]"); } catch { return []; }
}

function saveRounds(dealId: string, rounds: NegotiationRound[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY(dealId), JSON.stringify(rounds));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number | null): string {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function pct(n: number): string { return n.toFixed(0) + "%"; }

// ─── Section Status UI ────────────────────────────────────────────────────────

const statusUi: Record<SectionStatus, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  pending:  { label: "Aguardando",       color: "text-gray-500",    bg: "bg-gray-50",     border: "border-gray-200",  icon: Clock        },
  approved: { label: "Aprovado",         color: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-300",icon: CheckCircle2 },
  rejected: { label: "Não aprovado",     color: "text-red-700",     bg: "bg-red-50",      border: "border-red-300",   icon: XCircle      },
  adjusted: { label: "Ajuste solicitado",color: "text-amber-700",   bg: "bg-amber-50",    border: "border-amber-300", icon: Pencil       },
};

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  idx, title, icon: Icon, response, onUpdate, children,
}: {
  idx:      number;
  title:    string;
  icon:     React.ElementType;
  response: SectionResponse;
  onUpdate: (r: SectionResponse) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const st = statusUi[response.status];
  const StatusIcon = st.icon;
  const isDecided = response.status !== "pending";

  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all ${st.border} ${isDecided ? "" : "border-gray-200"}`}>
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors ${st.bg} hover:brightness-[0.97]`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
            isDecided
              ? response.status === "approved" ? "bg-emerald-100" : response.status === "rejected" ? "bg-red-100" : "bg-amber-100"
              : "bg-white border border-gray-200"
          }`}>
            {isDecided
              ? <StatusIcon size={14} className={st.color} />
              : <Icon size={14} className="text-gray-400" />
            }
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{idx}</span>
              <span className="text-sm font-bold text-gray-900">{title}</span>
            </div>
            <span className={`text-[11px] font-medium ${st.color}`}>{st.label}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDecided && (
            <button
              onClick={(e) => { e.stopPropagation(); onUpdate({ ...response, status: "pending", counterText: "" }); setOpen(true); }}
              className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/60 transition-colors"
            >
              <RotateCcw size={10} /> Refazer
            </button>
          )}
          {open ? <ChevronUp size={15} className="text-gray-400" /> : <ChevronDown size={15} className="text-gray-400" />}
        </div>
      </button>

      {/* Content */}
      {open && (
        <div className="bg-white border-t border-gray-100">
          {/* Deal content */}
          <div className="px-5 py-4 space-y-3">
            {children}
          </div>

          {/* Action buttons */}
          {response.status === "pending" && (
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 space-y-3">
              <p className="text-[11px] text-gray-500 font-medium">Como você avalia esta seção?</p>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => { onUpdate({ ...response, status: "approved", counterText: "" }); setOpen(false); }}
                  className="flex items-center gap-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl transition-all shadow-sm"
                >
                  <CheckCircle2 size={13} /> Aprovo esta seção
                </button>
                <button
                  onClick={() => onUpdate({ ...response, status: "adjusted" })}
                  className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-4 py-2 rounded-xl transition-colors"
                >
                  <Pencil size={12} /> Solicitar ajuste
                </button>
                <button
                  onClick={() => onUpdate({ ...response, status: "rejected" })}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-4 py-2 rounded-xl transition-colors"
                >
                  <XCircle size={12} /> Não aprovo
                </button>
              </div>
            </div>
          )}

          {/* Counter-proposal area */}
          {(response.status === "rejected" || response.status === "adjusted") && (
            <div className={`px-5 py-4 border-t ${response.status === "rejected" ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"}`}>
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare size={13} className={response.status === "rejected" ? "text-red-500" : "text-amber-600"} />
                <span className={`text-xs font-bold ${response.status === "rejected" ? "text-red-700" : "text-amber-800"}`}>
                  {response.status === "rejected" ? "Explique o motivo ou proponha alternativa:" : "Descreva o ajuste solicitado:"}
                </span>
              </div>
              <textarea
                value={response.counterText}
                onChange={(e) => onUpdate({ ...response, counterText: e.target.value })}
                placeholder={
                  response.status === "rejected"
                    ? "Ex: Os termos de valuation estão acima do nosso benchmark. Propomos R$X com participação de Y%..."
                    : "Ex: Precisamos revisar o prazo do cronograma — preferimos Q4 em vez de Q3..."
                }
                rows={3}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 resize-none bg-white"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Sua mensagem será enviada à equipe AWQ Venture junto com a revisão da proposta.
              </p>
            </div>
          )}

          {/* Approved confirmation */}
          {response.status === "approved" && (
            <div className="px-5 py-3 bg-emerald-50 border-t border-emerald-100">
              <div className="flex items-center gap-2 text-xs text-emerald-700 font-medium">
                <CheckCheck size={13} />
                Seção aprovada. Sua confirmação foi registrada.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Progress Ring ─────────────────────────────────────────────────────────────

function ProgressRing({ approved, total }: { approved: number; total: number }) {
  const pctVal = total === 0 ? 0 : Math.round((approved / total) * 100);
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (pctVal / 100) * circ;

  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="80" height="80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#e5e7eb" strokeWidth="6" />
        <circle
          cx="40" cy="40" r={r} fill="none"
          stroke={pctVal === 100 ? "#059669" : "#d97706"}
          strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="text-center">
        <div className={`text-xl font-black ${pctVal === 100 ? "text-emerald-600" : "text-amber-600"}`}>{approved}</div>
        <div className="text-[9px] text-gray-400 leading-none">de {total}</div>
      </div>
    </div>
  );
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-700">{value}</span>
    </div>
  );
}

function Pill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className={`text-center p-3 rounded-xl ${color ?? "bg-gray-50"}`}>
      <div className="text-base font-bold text-gray-900">{value}</div>
      <div className="text-[10px] text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function DealSharePage({ params }: { params: { id: string } }) {
  const deal = getDealById(params.id);
  if (!deal) notFound();

  const p   = deal.proposalStructure;
  const f   = deal.financials;
  const thr = deal.strategicThesis;

  // Build section list
  const sectionIds = ["contexto", "tese", "estrutura", "economica", "cronograma", "passos"];

  const [rounds, setRounds]           = useState<NegotiationRound[]>([]);
  const [sections, setSections]       = useState<SectionResponse[]>(
    sectionIds.map((id) => ({ id, status: "pending" as SectionStatus, counterText: "" }))
  );
  const [respondedBy, setRespondedBy] = useState("");
  const [overallMsg, setOverallMsg]   = useState("");
  const [submitted, setSubmitted]     = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentRound, setCurrentRound] = useState(1);

  useEffect(() => {
    const saved = loadRounds(deal.id);
    if (saved.length > 0) {
      setRounds(saved);
      setCurrentRound(saved.length + 1);
    }
  }, [deal.id]);

  function updateSection(idx: number, r: SectionResponse) {
    setSections((prev) => prev.map((s, i) => i === idx ? r : s));
  }

  const reviewed    = sections.filter((s) => s.status !== "pending").length;
  const approvedAll = sections.filter((s) => s.status === "approved").length;
  const hasCounter  = sections.some((s) => s.status === "rejected" || s.status === "adjusted");
  const allReviewed = reviewed === sections.length;
  const allApproved = approvedAll === sections.length;

  function handleSubmit() {
    if (!respondedBy.trim() || !allReviewed) return;
    const round: NegotiationRound = {
      round:         currentRound,
      sections:      sections,
      respondedBy:   respondedBy.trim(),
      overallMessage: overallMsg.trim(),
      finalDecision: allApproved ? "approved" : "counter",
      submittedAt:   new Date().toISOString(),
    };
    const updated = [...rounds, round];
    setRounds(updated);
    saveRounds(deal.id, updated);
    setSubmitted(true);
    setShowSuccess(true);
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            {allApproved
              ? <Trophy size={36} className="text-emerald-600" />
              : <Send size={32} className="text-amber-600" />
            }
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 mb-2">
              {allApproved ? "Proposta Aprovada!" : "Resposta Enviada!"}
            </h1>
            <p className="text-sm text-gray-600">
              {allApproved
                ? "Parabéns! Você aprovou todos os termos da proposta. A equipe AWQ Venture foi notificada e entrará em contato para os próximos passos."
                : `Sua análise da rodada ${currentRound} foi registrada com ${approvedAll} aprovações e ${reviewed - approvedAll} pontos de ajuste. A equipe AWQ Venture revisará e entrará em contato.`
              }
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-2 text-left">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-3">Resumo da rodada {currentRound}</div>
            {sections.map((s, i) => {
              const st = statusUi[s.status];
              const SI = st.icon;
              const labels = ["Contexto", "Tese de Valor", "Estrutura", "Termos Financeiros", "Cronograma", "Próximos Passos"];
              return (
                <div key={s.id} className={`flex items-center justify-between p-2 rounded-xl ${st.bg}`}>
                  <span className="text-xs text-gray-700">{labels[i]}</span>
                  <span className={`flex items-center gap-1 text-[11px] font-semibold ${st.color}`}>
                    <SI size={11} /> {st.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="text-xs text-gray-400">
            AWQ Venture · Proposta {deal.id} · Rodada {currentRound}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Sticky Header ─────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center">
              <TrendingUp size={13} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">AWQ Venture × {deal.companyName}</div>
              <div className="text-[10px] text-gray-500">Proposta Confidencial · {deal.id}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {rounds.length > 0 && (
              <span className="text-[10px] font-semibold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-1 rounded-full">
                Rodada {currentRound}
              </span>
            )}
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600">
              <span className={reviewed === sections.length ? "text-emerald-600" : "text-amber-600"}>{reviewed}</span>
              <span className="text-gray-400">/</span>
              <span>{sections.length}</span>
              <span className="text-gray-400 font-normal">seções revisadas</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500"
            style={{ width: pct(reviewed === 0 ? 0 : (reviewed / sections.length) * 100) }}
          />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* ── Previous rounds banner ────────────────────────────────────────── */}
        {rounds.length > 0 && (
          <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 text-xs text-violet-800 font-semibold">
              <RotateCcw size={12} />
              Histórico de negociação: {rounds.length} rodada{rounds.length > 1 ? "s" : ""} anterior{rounds.length > 1 ? "es" : ""}
            </div>
            <div className="mt-2 space-y-1">
              {rounds.map((r) => {
                const approved = r.sections.filter((s) => s.status === "approved").length;
                return (
                  <div key={r.round} className="text-[11px] text-violet-700 flex items-center gap-2">
                    <span className="font-bold">Rodada {r.round}:</span>
                    <span>{approved}/{r.sections.length} aprovadas</span>
                    <span className="text-violet-400">·</span>
                    <span>{r.respondedBy}</span>
                    <span className="text-violet-400">·</span>
                    <span>{new Date(r.submittedAt).toLocaleDateString("pt-BR")}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-600 via-amber-500 to-orange-500 p-8 text-white text-center shadow-xl">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 80%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }} />
          <div className="relative">
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 text-[11px] font-bold mb-4 backdrop-blur-sm">
              <Shield size={11} />
              DOCUMENTO CONFIDENCIAL
            </div>
            <h1 className="text-2xl font-black mb-2">
              Proposta de Parceria<br /><span className="text-amber-100">AWQ Venture × {deal.companyName}</span>
            </h1>
            <p className="text-sm text-amber-100 mb-6">
              {deal.operationType} · {deal.valuationRange}
            </p>
            <div className="flex items-center justify-center gap-8">
              <ProgressRing approved={approvedAll} total={sections.length} />
              <div className="text-left">
                <div className="text-xs text-amber-200 mb-1">Como funciona</div>
                <div className="space-y-1">
                  {["Leia cada seção abaixo", "Aprove, ajuste ou contraproponha", "Envie sua resposta à AWQ Venture"].map((t, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-white">
                      <div className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[9px] font-bold shrink-0">{i + 1}</div>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Confidentiality notice ────────────────────────────────────────── */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800">
          <Info size={13} className="shrink-0 mt-0.5" />
          <span>
            Este documento é <strong>confidencial</strong> e destinado exclusivamente à empresa destinatária.
            Avalie cada seção individualmente e envie sua resposta ao final.
          </span>
        </div>

        {/* ── Section 1: Contexto e Oportunidade ───────────────────────────── */}
        <SectionCard
          idx={1} title="Contexto e Oportunidade"
          icon={Target} response={sections[0]}
          onUpdate={(r) => updateSection(0, r)}
        >
          <p className="text-sm text-gray-700 leading-relaxed">{thr.strategicRationale}</p>
          <InfoRow label="Por que agora" value={thr.whyNow} />
          <InfoRow label="Sinergias"     value={thr.synergies} />
        </SectionCard>

        {/* ── Section 2: Tese de Criação de Valor ──────────────────────────── */}
        <SectionCard
          idx={2} title="Tese de Criação de Valor"
          icon={Sparkles} response={sections[1]}
          onUpdate={(r) => updateSection(1, r)}
        >
          <p className="text-sm text-gray-700 leading-relaxed">{thr.valueCreationThesis}</p>
          {thr.awqVentureFit && (
            <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
              <div className="text-[11px] font-bold text-amber-700 mb-1">Fit AWQ Venture</div>
              <p className="text-xs text-amber-800">{thr.awqVentureFit}</p>
            </div>
          )}
        </SectionCard>

        {/* ── Section 3: Estrutura da Operação ─────────────────────────────── */}
        <SectionCard
          idx={3} title="Estrutura da Operação"
          icon={Zap} response={sections[2]}
          onUpdate={(r) => updateSection(2, r)}
        >
          <p className="text-sm text-gray-700 leading-relaxed">{p.economicProposal}</p>
          <p className="text-sm text-gray-700 leading-relaxed">{p.paymentStructure}</p>
          {p.conditions.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Condições Precedentes</div>
              <ul className="space-y-1.5">
                {p.conditions.map((c, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <ArrowRight size={12} className="text-amber-500 mt-0.5 shrink-0" />{c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionCard>

        {/* ── Section 4: Termos Financeiros ────────────────────────────────── */}
        <SectionCard
          idx={4} title="Termos Financeiros"
          icon={DollarSign} response={sections[3]}
          onUpdate={(r) => updateSection(3, r)}
        >
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Pill label="Valuation proposto" value={fmtR(f.proposedValuation)} color="bg-amber-50" />
            <Pill label="Participação alvo"  value={f.targetOwnership + "%"}   color="bg-gray-50"   />
            <Pill label="Investimento"        value={fmtR(f.estimatedInvestment)} color="bg-gray-50" />
          </div>
          {f.offerStructure && (
            <p className="text-sm text-gray-700 leading-relaxed">{f.offerStructure}</p>
          )}
          <div className="mt-2 p-2 rounded-lg bg-gray-50 text-[10px] text-gray-400 flex items-start gap-1.5">
            <AlertTriangle size={11} className="shrink-0 mt-0.5" />
            {f.revenueConfidence === "confirmed"
              ? "Valores confirmados por auditoria."
              : f.revenueConfidence === "probable"
              ? "Valores baseados em dados prováveis, não auditados externamente."
              : "Valores são estimativas preliminares."}
          </div>
        </SectionCard>

        {/* ── Section 5: Cronograma ─────────────────────────────────────────── */}
        <SectionCard
          idx={5} title="Cronograma"
          icon={Calendar} response={sections[4]}
          onUpdate={(r) => updateSection(4, r)}
        >
          {p.stages.length > 0 ? (
            <div className="space-y-2">
              {p.stages.map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                  <div className="w-7 h-7 rounded-full bg-amber-100 border-2 border-amber-200 flex items-center justify-center shrink-0 text-[11px] font-bold text-amber-700">{i + 1}</div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{s.label}</div>
                    <div className="text-xs text-gray-500">{s.description}</div>
                    {s.targetDate && (
                      <div className="text-[10px] text-amber-600 mt-0.5 flex items-center gap-1">
                        <Calendar size={9} />{s.targetDate}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Cronograma a definir.</p>
          )}
          {p.timeline && (
            <p className="text-xs text-gray-600 bg-amber-50 rounded-xl px-3 py-2 mt-2">{p.timeline}</p>
          )}
        </SectionCard>

        {/* ── Section 6: Próximos Passos ────────────────────────────────────── */}
        <SectionCard
          idx={6} title="Próximos Passos"
          icon={CheckCircle2} response={sections[5]}
          onUpdate={(r) => updateSection(5, r)}
        >
          {p.nextSteps.length > 0 ? (
            <ol className="space-y-2">
              {p.nextSteps.map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <span className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-[10px] font-bold text-amber-700 mt-0.5">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-gray-500 italic">Próximos passos a definir após confirmação de interesse.</p>
          )}
        </SectionCard>

        {/* ── Progress summary ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={15} className="text-gray-600" />
            <h3 className="text-sm font-bold text-gray-900">Resumo da sua avaliação</h3>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 rounded-xl bg-emerald-50">
              <div className="text-xl font-black text-emerald-600">{approvedAll}</div>
              <div className="text-[10px] text-emerald-600">Aprovadas</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-amber-50">
              <div className="text-xl font-black text-amber-600">{sections.filter(s => s.status === "adjusted").length}</div>
              <div className="text-[10px] text-amber-600">Com ajuste</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-red-50">
              <div className="text-xl font-black text-red-600">{sections.filter(s => s.status === "rejected").length}</div>
              <div className="text-[10px] text-red-600">Não aprovadas</div>
            </div>
          </div>

          {/* Section status list */}
          <div className="space-y-1.5">
            {sections.map((s, i) => {
              const st = statusUi[s.status];
              const SI = st.icon;
              const labels = ["Contexto e Oportunidade", "Tese de Criação de Valor", "Estrutura da Operação", "Termos Financeiros", "Cronograma", "Próximos Passos"];
              return (
                <div key={s.id} className={`flex items-center justify-between px-3 py-2 rounded-xl ${st.bg}`}>
                  <span className="text-xs text-gray-700 font-medium">{i + 1}. {labels[i]}</span>
                  <span className={`flex items-center gap-1 text-[11px] font-semibold ${st.color}`}>
                    <SI size={11} /> {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Submission area ───────────────────────────────────────────────── */}
        {!submitted && (
          <div className={`rounded-2xl border-2 p-6 space-y-4 ${allReviewed ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-white"}`}>
            <div className="flex items-center gap-2">
              <Send size={16} className={allReviewed ? "text-amber-600" : "text-gray-400"} />
              <h3 className="text-sm font-bold text-gray-900">
                {allReviewed
                  ? allApproved ? "Aprovar e enviar proposta" : `Enviar resposta — Rodada ${currentRound}`
                  : `Revise todas as ${sections.length} seções para enviar`}
              </h3>
            </div>

            {!allReviewed && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <Clock size={13} className="text-amber-600 shrink-0" />
                <span className="text-xs text-amber-700">
                  Faltam <strong>{sections.length - reviewed} seção{sections.length - reviewed > 1 ? "ões" : ""}</strong> para completar sua avaliação.
                </span>
              </div>
            )}

            {allReviewed && (
              <div className="space-y-3">
                {allApproved && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <Trophy size={14} className="text-emerald-600 shrink-0" />
                    <span className="text-xs text-emerald-700 font-semibold">
                      Todas as seções aprovadas! Confirme abaixo para fechar a proposta.
                    </span>
                  </div>
                )}
                {hasCounter && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <MessageSquare size={13} className="text-amber-600 shrink-0" />
                    <span className="text-xs text-amber-700">
                      Você tem seções com ajuste ou contraproposta. A AWQ Venture revisará e responderá.
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Mensagem geral (opcional)
                  </label>
                  <textarea
                    value={overallMsg}
                    onChange={(e) => setOverallMsg(e.target.value)}
                    placeholder="Comentários gerais, contexto adicional ou mensagem para a equipe AWQ Venture..."
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Seu nome completo <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={respondedBy}
                    onChange={(e) => setRespondedBy(e.target.value)}
                    placeholder="Nome para identificação desta resposta"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!respondedBy.trim()}
                  className={`w-full flex items-center justify-center gap-2 text-sm font-bold py-3 rounded-xl transition-all disabled:opacity-40 ${
                    allApproved
                      ? "text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200"
                      : "text-white bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-200"
                  }`}
                >
                  {allApproved
                    ? <><Trophy size={16} /> Aprovar Proposta e Finalizar</>
                    : <><Send size={15} /> Enviar Resposta com Ajustes — Rodada {currentRound}</>
                  }
                </button>

                <p className="text-[10px] text-center text-gray-400">
                  Ao enviar, sua resposta é registrada e encaminhada à equipe AWQ Venture.
                  Esta ação não constitui vinculação contratual.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-[10px] text-gray-400 space-y-1 py-4 border-t border-gray-200">
          <div>AWQ Venture · Proposta Confidencial · {deal.id}</div>
          <div>Acesso restrito ao destinatário desta proposta</div>
        </div>
      </div>
    </div>
  );
}
