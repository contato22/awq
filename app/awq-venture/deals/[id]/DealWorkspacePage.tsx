"use client";

import { useState, useEffect, useRef } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDealById } from "@/lib/deal-data";
import type { DealWorkspace, DealStage, DealSendStatus } from "@/lib/deal-types";
import {
  ArrowLeft, Building2, Target, BarChart2, DollarSign, Shield,
  Layers, Settings, Eye, Send, Save, CheckCircle, CheckCircle2,
  Clock, AlertTriangle, XCircle, Globe, Mail, Phone, MapPin,
  User, Calendar, ArrowRight, TrendingUp, Trash2, X, ChevronDown,
  Pencil, Plus, Minus,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number | null): string {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function fmtPct(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return n.toFixed(1) + "%";
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const stageBadge: Record<string, string> = {
  "Triagem":       "badge bg-gray-100 text-gray-600 ring-1 ring-gray-200/60",
  "Prospecção":    "badge bg-amber-50 text-amber-700 ring-1 ring-amber-200/60",
  "Due Diligence": "badge bg-blue-50 text-blue-700 ring-1 ring-blue-200/60",
  "Term Sheet":    "badge bg-violet-50 text-violet-700 ring-1 ring-violet-200/60",
  "Negociação":    "badge bg-orange-50 text-orange-700 ring-1 ring-orange-200/60",
  "Fechado":       "badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60",
  "Cancelado":     "badge bg-red-50 text-red-700 ring-1 ring-red-200/60",
};

const sendStatusColor: Record<string, string> = {
  "Rascunho":          "text-gray-400",
  "Pronto para Envio": "text-amber-600 font-semibold",
  "Enviado":           "text-blue-600 font-semibold",
  "Em Negociação":     "text-violet-600 font-semibold",
  "Aprovado":          "text-emerald-600 font-semibold",
  "Rejeitado":         "text-red-500",
};

const riskStyle: Record<string, { bg: string; text: string }> = {
  "Baixo":   { bg: "bg-emerald-50", text: "text-emerald-700" },
  "Médio":   { bg: "bg-amber-50",   text: "text-amber-700"   },
  "Alto":    { bg: "bg-red-50",     text: "text-red-700"     },
  "Crítico": { bg: "bg-red-100",    text: "text-red-900"     },
};

const confLabel: Record<string, string> = {
  confirmed: "Confirmado",
  probable:  "Provável",
  estimated: "Estimado",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  id, icon: Icon, title, children,
}: {
  id: string; icon: React.ElementType; title: string; children: React.ReactNode;
}) {
  return (
    <div id={id} className="card scroll-mt-28">
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
          <Icon size={13} className="text-brand-600" />
        </div>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-sm text-gray-800 leading-snug">{value ?? "—"}</div>
    </div>
  );
}

function MaturityDots({ level, label }: { level: number; label: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-600">{label}</span>
      <div className="flex gap-1.5 items-center">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full border ${
              i <= level
                ? "bg-brand-500 border-brand-500"
                : "bg-gray-100 border-gray-200"
            }`}
          />
        ))}
        <span className="ml-1 text-[11px] font-bold text-gray-500">{level}/5</span>
      </div>
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100">
      <span className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold">{label}</span>
      <span className="text-[11px] font-medium text-gray-700">{value}</span>
    </div>
  );
}
// ─── Score Ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const fill = (score / 10) * circ;
  const color =
    score >= 8 ? "#10b981" : score >= 7 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#f3f4f6" strokeWidth="7" />
        <circle
          cx="36" cy="36" r={r} fill="none"
          stroke={color} strokeWidth="7"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
        />
        <text x="36" y="40" textAnchor="middle" fontSize="15" fontWeight="700" fill={color}>
          {score.toFixed(1)}
        </text>
      </svg>
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Deal Score</span>
    </div>
  );
}

// ─── Preview Cliente ──────────────────────────────────────────────────────────

function PreviewCliente({ deal }: { deal: DealWorkspace }) {
  const { identification: id, strategicThesis: st, assetDiagnosis: ad,
          financials: fin, proposalStructure: ps } = deal;
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Capa */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-700 text-white px-8 py-10">
        <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">AWQ Venture</div>
        <h1 className="text-3xl font-bold mb-1">{id.companyName}</h1>
        <div className="text-gray-300 text-sm">Proposta de Parceria Estratégica</div>
        <div className="mt-3 text-xs text-gray-500">{deal.lastUpdated} · {deal.assignee}</div>
      </div>

      <div className="px-8 py-6 space-y-6 text-sm text-gray-700">
        {/* Resumo Executivo */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Resumo Executivo</div>
          <p className="leading-relaxed">
            A AWQ Venture apresenta proposta de parceria estratégica para <strong>{id.companyName}</strong>,
            empresa do setor de <strong>{id.sector}</strong> com atuação em {id.location}.
            A operação contempla {deal.operationType.toLowerCase()} com faixa de valuation de {deal.valuationRange},
            representando oportunidade de crescimento acelerado com suporte de capital e rede do grupo AWQ.
          </p>
        </div>

        {/* Contexto */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Contexto da Oportunidade</div>
          <p className="leading-relaxed">{st.whyNow}</p>
        </div>

        {/* Racional */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Racional Estratégico</div>
          <p className="leading-relaxed">{st.strategicRationale}</p>
        </div>

        {/* Diagnóstico */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Diagnóstico Resumido</div>
          <p className="leading-relaxed mb-3">{ad.summary}</p>
          {ad.strengths.length > 0 && (
            <ul className="space-y-1">
              {ad.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Estrutura */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Estrutura Proposta</div>
          <p className="leading-relaxed mb-2">{ps.economicProposal}</p>
          <p className="leading-relaxed text-gray-500">{ps.paymentStructure}</p>
        </div>

        {/* Faixa Econômica */}
        <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{deal.valuationRange}</div>
            <div className="text-[11px] text-gray-400">Faixa de Valuation</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-amber-600">{fmtR(fin.estimatedInvestment)}</div>
            <div className="text-[11px] text-gray-400">Investimento Estimado</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-brand-600">{fin.targetOwnership}%</div>
            <div className="text-[11px] text-gray-400">Participação Pretendida</div>
          </div>
        </div>

        {/* Benefícios */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Benefícios para o Sócio</div>
          <ul className="space-y-2">
            {["Acesso imediato a capital de crescimento sem diluição excessiva",
              "Rede AWQ: clientes, parceiros e oportunidades de cross-sell",
              "Governança estruturada e suporte estratégico contínuo",
              "Eventual liquidez via processo de saída planejado"].map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <ArrowRight size={13} className="text-brand-500 mt-0.5 shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Cronograma */}
        {ps.stages.length > 0 && (
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Cronograma</div>
            <div className="space-y-3">
              {ps.stages.map((s, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900">{s.label}</div>
                    <div className="text-xs text-gray-500">{s.description} · {s.targetDate}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Próximos Passos */}
        {ps.nextSteps.length > 0 && (
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Próximos Passos</div>
            <ol className="space-y-1.5 list-none">
              {ps.nextSteps.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="font-bold text-brand-500 shrink-0">{i + 1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Observações Finais */}
        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 leading-relaxed italic">
            Esta proposta foi elaborada com base em informações disponíveis até {deal.lastUpdated}.
            Os valores apresentados são indicativos e sujeitos a confirmação após due diligence.
            AWQ Venture · Documento Confidencial.
          </p>
        </div>
      </div>
    </div>
  );
}
// ─── Preview Interno ──────────────────────────────────────────────────────────

function PreviewInterno({ deal }: { deal: DealWorkspace }) {
  const rs = riskStyle[deal.riskLevel] ?? riskStyle["Médio"];
  return (
    <div className="bg-gray-900 text-white rounded-xl overflow-hidden text-sm">
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Preview Interno · AWQ Venture</div>
        <div className="text-xl font-bold">{deal.companyName}</div>
        <div className="flex gap-2 mt-2 flex-wrap">
          <span className="text-xs text-gray-400">{deal.id}</span>
          <span className="text-gray-700">·</span>
          <span className="text-xs text-gray-400">{deal.stage}</span>
          <span className="text-gray-700">·</span>
          <span className={`text-xs font-semibold ${sendStatusColor[deal.sendStatus] ?? "text-gray-400"}`}>{deal.sendStatus}</span>
        </div>
      </div>

      <div className="px-6 py-4 space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            ["Valuation Pedido",   fmtR(deal.financials.askValuation)],
            ["Valuation Proposto", fmtR(deal.financials.proposedValuation)],
            ["Investimento",       fmtR(deal.financials.estimatedInvestment)],
            ["Receita Est.",       fmtR(deal.financials.estimatedRevenue)],
            ["EBITDA Est.",        fmtR(deal.financials.estimatedEbitda)],
            ["Upside Esp.",        fmtPct(deal.financials.expectedUpside)],
            ["Múltiplo",           deal.financials.impliedMultiple ? deal.financials.impliedMultiple.toFixed(2) + "×" : "—"],
            ["Participação",       deal.financials.targetOwnership + "%"],
            ["Score",              deal.dealScore.toFixed(1) + "/10"],
          ].map(([l, v]) => (
            <div key={l} className="bg-gray-800 rounded-lg p-3">
              <div className="text-[10px] text-gray-500 uppercase tracking-wide">{l}</div>
              <div className="text-base font-bold text-white mt-0.5">{v}</div>
            </div>
          ))}
        </div>

        {/* Tese */}
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-1">Racional</div>
          <p className="text-gray-300 leading-relaxed text-xs">{deal.strategicThesis.strategicRationale}</p>
        </div>

        {/* Diagnóstico */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-1">Pontos Fortes</div>
            <ul className="space-y-1">
              {deal.assetDiagnosis.strengths.slice(0, 4).map((s, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-gray-300">
                  <CheckCircle2 size={11} className="text-emerald-400 mt-0.5 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-1">Fragilidades</div>
            <ul className="space-y-1">
              {deal.assetDiagnosis.weaknesses.slice(0, 4).map((w, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-gray-300">
                  <XCircle size={11} className="text-red-400 mt-0.5 shrink-0" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Risco */}
        <div>
          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-2">Risco</div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Jurídico",     deal.riskDiligence.legalRisks],
              ["Financeiro",   deal.riskDiligence.financialRisks],
              ["Operacional",  deal.riskDiligence.operationalRisks],
              ["Integração",   deal.riskDiligence.integrationRisks],
            ].map(([l, v]) => (
              <div key={l} className="bg-gray-800 rounded-lg p-3">
                <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">{l}</div>
                <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pendências */}
        {deal.riskDiligence.diligencePending.length > 0 && (
          <div>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold mb-1">Pendências de Diligência</div>
            <ul className="space-y-1">
              {deal.riskDiligence.diligencePending.map((p, i) => (
                <li key={i} className="flex items-center gap-1.5 text-xs text-amber-300">
                  <Clock size={11} className="shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Governança */}
        <div className="border-t border-gray-800 pt-3 text-[11px] text-gray-500 flex flex-wrap gap-4">
          <span>Criado por <span className="text-gray-300">{deal.governance.createdBy}</span></span>
          <span>Atualizado por <span className="text-gray-300">{deal.governance.updatedBy}</span></span>
          <span>v{deal.governance.version}</span>
          <span>Source: <span className="text-emerald-400 font-bold">AWQ_Venture</span></span>
          {deal.governance.internalOnly && <span className="text-red-400 font-semibold">INTERNO</span>}
        </div>
      </div>
    </div>
  );
}
// ─── Override / persistence ───────────────────────────────────────────────────

export interface DealOverride {
  stage?: DealStage;
  sendStatus?: DealSendStatus;
  proposalDeleted?: boolean;
  fields?: Record<string, string>;   // key = field path, value = edited string
  nextSteps?: string[];
  overriddenAt?: string;
}

function overrideKey(id: string) { return `awq_deal_override_${id}`; }
function loadOverride(id: string): DealOverride {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(overrideKey(id)) ?? "{}"); } catch { return {}; }
}
function saveOverride(id: string, data: DealOverride) {
  if (typeof window === "undefined") return;
  localStorage.setItem(overrideKey(id), JSON.stringify(data));
}

const ALL_STAGES: DealStage[] = [
  "Triagem", "Prospecção", "Due Diligence", "Term Sheet",
  "Negociação", "Fechado", "Cancelado",
];
const ALL_SEND_STATUSES: DealSendStatus[] = [
  "Rascunho", "Pronto para Envio", "Enviado",
  "Em Negociação", "Aprovado", "Rejeitado",
];

// ─── EditableText ─────────────────────────────────────────────────────────────

function EditableText({
  value,
  fieldKey,
  overrideFields,
  onSave,
  multiline = true,
  placeholder = "A preencher…",
  className = "",
}: {
  value: string | null | undefined;
  fieldKey: string;
  overrideFields: Record<string, string>;
  onSave: (key: string, val: string) => void;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const effective = overrideFields[fieldKey] ?? value ?? "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(effective);
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  function commit() {
    onSave(fieldKey, draft);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div
        className={`group relative cursor-pointer rounded-lg hover:bg-amber-50/60 transition-colors px-1 -mx-1 ${className}`}
        onClick={() => { setDraft(effective); setEditing(true); }}
      >
        <span className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {effective || <span className="text-gray-400 italic">{placeholder}</span>}
        </span>
        <Pencil size={11} className="absolute right-1 top-1 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {multiline ? (
        <textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-amber-300 bg-amber-50/30 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400/40 resize-y"
          placeholder={placeholder}
        />
      ) : (
        <input
          ref={ref as React.RefObject<HTMLInputElement>}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full rounded-xl border border-amber-300 bg-amber-50/30 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
          placeholder={placeholder}
        />
      )}
      <div className="flex gap-1.5">
        <button onClick={commit} className="px-3 py-1 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors">Salvar</button>
        <button onClick={() => setEditing(false)} className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
      </div>
    </div>
  );
}

// ─── EditableNextSteps ────────────────────────────────────────────────────────

function EditableNextSteps({
  steps,
  overrideSteps,
  onSave,
}: {
  steps: string[];
  overrideSteps: string[] | undefined;
  onSave: (steps: string[]) => void;
}) {
  const effective = overrideSteps ?? steps;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(effective);

  function commit() { onSave(draft.filter((s) => s.trim())); setEditing(false); }

  if (!editing) {
    return (
      <div
        className="group relative cursor-pointer rounded-lg hover:bg-amber-50/60 transition-colors px-1 -mx-1"
        onClick={() => { setDraft([...effective]); setEditing(true); }}
      >
        {effective.length === 0
          ? <p className="text-xs text-gray-400 italic">A preencher.</p>
          : <ol className="space-y-1.5">
              {effective.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                  <ArrowRight size={11} className="text-brand-500 mt-0.5 shrink-0" />
                  <span><span className="font-semibold text-gray-400 mr-1">{i + 1}.</span>{s}</span>
                </li>
              ))}
            </ol>
        }
        <Pencil size={11} className="absolute right-1 top-1 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {draft.map((s, i) => (
        <div key={i} className="flex gap-2 items-center">
          <span className="text-xs text-gray-400 w-4 shrink-0">{i + 1}.</span>
          <input
            type="text"
            value={s}
            onChange={(e) => { const d = [...draft]; d[i] = e.target.value; setDraft(d); }}
            className="flex-1 rounded-lg border border-amber-300 bg-amber-50/30 px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
          />
          <button onClick={() => setDraft(draft.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 transition-colors">
            <Minus size={12} />
          </button>
        </div>
      ))}
      <button
        onClick={() => setDraft([...draft, ""])}
        className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 transition-colors"
      >
        <Plus size={12} /> Adicionar passo
      </button>
      <div className="flex gap-1.5 mt-1">
        <button onClick={commit} className="px-3 py-1 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors">Salvar</button>
        <button onClick={() => setEditing(false)} className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
      </div>
    </div>
  );
}

// ─── StatusChangeModal ────────────────────────────────────────────────────────

function StatusChangeModal({
  currentStage, currentSendStatus, onApply, onClose,
}: {
  currentStage:      DealStage;
  currentSendStatus: DealSendStatus;
  onApply:           (stage: DealStage, sendStatus: DealSendStatus) => void;
  onClose:           () => void;
}) {
  const [stage,      setStage]      = useState<DealStage>(currentStage);
  const [sendStatus, setSendStatus] = useState<DealSendStatus>(currentSendStatus);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900">Alterar Status do Deal</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Estágio do Deal</label>
            <div className="relative">
              <select value={stage} onChange={(e) => setStage(e.target.value as DealStage)}
                className="w-full appearance-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 pr-8">
                {ALL_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">Status de Envio / Proposta</label>
            <div className="relative">
              <select value={sendStatus} onChange={(e) => setSendStatus(e.target.value as DealSendStatus)}
                className="w-full appearance-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 pr-8">
                {ALL_SEND_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="text-[10px] text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
            Alteração salva localmente. Para persistência permanente, integrar com API.
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancelar</button>
          <button onClick={() => { onApply(stage, sendStatus); onClose(); }}
            className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-colors">
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DeleteProposalConfirm ────────────────────────────────────────────────────

function DeleteProposalConfirm({
  companyName, onConfirm, onClose,
}: {
  companyName: string;
  onConfirm:   () => void;
  onClose:     () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-bold text-gray-900">Excluir Proposta</h3>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
            <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-semibold text-red-700">Ação irreversível (localmente)</div>
              <div className="text-xs text-red-600 mt-0.5">
                A proposta de <strong>{companyName}</strong> será marcada como excluída.
                O deal permanece — apenas a estrutura da proposta é ocultada.
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            O status de envio será revertido para <strong>Rascunho</strong>.
            Para restaurar, use o botão de restauração exibido na seção da proposta.
          </p>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancelar</button>
          <button onClick={() => { onConfirm(); onClose(); }}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors flex items-center gap-2">
            <Trash2 size={13} /> Excluir Proposta
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sticky Sidebar ───────────────────────────────────────────────────────────

function StickySidebar({
  deal,
  onPreviewInterno,
  onPreviewCliente,
  onChangeStatus,
  onDeleteProposal,
  proposalDeleted,
}: {
  deal: DealWorkspace;
  onPreviewInterno: () => void;
  onPreviewCliente: () => void;
  onChangeStatus: () => void;
  onDeleteProposal: () => void;
  proposalDeleted: boolean;
}) {
  const rs = riskStyle[deal.riskLevel] ?? riskStyle["Médio"];
  return (
    <div className="sticky top-24 space-y-3">
      {/* Score + Risk */}
      <div className="card p-4 flex flex-col items-center gap-3">
        <ScoreRing score={deal.dealScore} />
        <div className={`px-3 py-1 rounded-full text-sm font-bold ${rs.bg} ${rs.text}`}>
          Risco {deal.riskLevel}
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400">Valuation</div>
          <div className="text-sm font-bold text-gray-900">{deal.valuationRange}</div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400">Status de Envio</div>
          <div className={`text-sm ${sendStatusColor[deal.sendStatus] ?? "text-gray-500"}`}>
            {deal.sendStatus}
          </div>
        </div>
        <div className="text-center">
          <div className="text-xs text-gray-400">Responsável</div>
          <div className="text-sm font-medium text-gray-700">{deal.assignee}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="card p-4 space-y-2">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Ações</div>

        <button className="btn-secondary w-full flex items-center justify-center gap-2 text-xs">
          <Save size={13} />
          Salvar Rascunho
        </button>

        <button
          onClick={onPreviewInterno}
          className="btn-ghost w-full flex items-center justify-center gap-2 text-xs"
        >
          <Eye size={13} />
          Preview Interno
        </button>

        <button
          onClick={onPreviewCliente}
          className="btn-ghost w-full flex items-center justify-center gap-2 text-xs"
        >
          <Eye size={13} />
          Preview Cliente
        </button>

        <div className="border-t border-gray-100 my-1" />

        <button className="btn-secondary w-full flex items-center justify-center gap-2 text-xs">
          <CheckCircle size={13} />
          Marcar Pronto para Envio
        </button>

        <button className="btn-primary w-full flex items-center justify-center gap-2 text-xs">
          <Send size={13} />
          Enviar para Cliente
        </button>

        <div className="border-t border-gray-100 my-1" />

        <button
          onClick={onChangeStatus}
          className="w-full flex items-center justify-center gap-2 text-[11px] text-gray-600 hover:text-gray-900 hover:bg-gray-100 py-2 rounded-lg transition-colors font-medium"
        >
          <Settings size={12} />
          Alterar Status
        </button>

        {!proposalDeleted ? (
          <button
            onClick={onDeleteProposal}
            className="w-full flex items-center justify-center gap-2 text-[11px] text-red-500 hover:text-red-700 hover:bg-red-50 py-2 rounded-lg transition-colors"
          >
            <Trash2 size={12} />
            Excluir Proposta
          </button>
        ) : (
          <div className="text-center text-[10px] text-red-400 bg-red-50 rounded-lg py-2 px-3">
            Proposta excluída localmente
          </div>
        )}

        <div className="border-t border-gray-100 my-1" />

        <button className="w-full flex items-center justify-center gap-2 text-[11px] text-gray-400 hover:text-gray-700 hover:bg-gray-100 py-2 rounded-lg transition-colors">
          <Building2 size={12} />
          Publicar Resumo na Holding
        </button>
      </div>

      {/* Quick KPIs */}
      <div className="card p-4 space-y-2">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Financeiro</div>
        {[
          ["Valuation Proposto", fmtR(deal.financials.proposedValuation)],
          ["Receita Estimada",   fmtR(deal.financials.estimatedRevenue)],
          ["Investimento",       fmtR(deal.financials.estimatedInvestment)],
          ["Participação",       deal.financials.targetOwnership + "%"],
          ["Upside Esperado",    fmtPct(deal.financials.expectedUpside)],
        ].map(([l, v]) => (
          <div key={l} className="flex items-center justify-between py-0.5 border-b border-gray-50 last:border-0">
            <span className="text-[11px] text-gray-500">{l}</span>
            <span className="text-[11px] font-bold text-gray-900">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DealWorkspacePage({
  params,
}: {
  params: { id: string };
}) {
  const deal = getDealById(params.id);
  if (!deal) notFound();

  const [preview,           setPreview]          = useState<"interno" | "cliente" | null>(null);
  const [override,          setOverride]          = useState<DealOverride>({});
  const [showStatusModal,   setShowStatusModal]   = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => { setOverride(loadOverride(deal.id)); }, [deal.id]);

  function applyOverride(patch: Partial<DealOverride>) {
    const next = { ...override, ...patch, overriddenAt: new Date().toISOString() };
    setOverride(next);
    saveOverride(deal.id, next);
  }

  function saveField(key: string, val: string) {
    applyOverride({ fields: { ...(override.fields ?? {}), [key]: val } });
  }

  function saveNextSteps(steps: string[]) {
    applyOverride({ nextSteps: steps });
  }

  const effectiveDeal = {
    ...deal,
    stage:      (override.stage      ?? deal.stage)      as DealStage,
    sendStatus: (override.sendStatus ?? deal.sendStatus) as DealSendStatus,
  };
  const overrideFields = override.fields ?? {};
  const proposalDeleted = override.proposalDeleted ?? false;

  function scrollToPreview(mode: "interno" | "cliente") {
    setPreview(mode);
    setTimeout(() => {
      document.getElementById("preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  const rs = riskStyle[effectiveDeal.riskLevel] ?? riskStyle["Médio"];
  const readiness = ((effectiveDeal.assetDiagnosis.operationalMaturity + effectiveDeal.assetDiagnosis.commercialMaturity) / 2);

  const anchors = [
    { href: "#indicadores",  label: "Indicadores"  },
    { href: "#identificacao",label: "Identificação" },
    { href: "#tese",         label: "Tese"         },
    { href: "#diagnostico",  label: "Diagnóstico"  },
    { href: "#financeiro",   label: "Financeiro"   },
    { href: "#risco",        label: "Risco"        },
    { href: "#proposta",     label: "Proposta"     },
    { href: "#governanca",   label: "Governança"   },
    { href: "#preview",      label: "Preview"      },
  ];

  return (
    <>
      {/* ── Section 1: Executive Header ──────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <Link
            href="/awq-venture/deals"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={13} />
            Deals
          </Link>
          <span className="text-gray-200">/</span>
          <span className="text-xs text-gray-500">{deal.companyName}</span>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{deal.companyName}</h1>
              <span className="badge bg-gray-100 text-gray-500 ring-1 ring-gray-200/60">{deal.id}</span>
              <span className={stageBadge[effectiveDeal.stage] ?? "badge bg-gray-100 text-gray-600"}>{effectiveDeal.stage}</span>
              <span className={`text-sm ${sendStatusColor[effectiveDeal.sendStatus] ?? "text-gray-400"}`}>{effectiveDeal.sendStatus}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <InfoChip label="Responsável"  value={deal.assignee} />
              <InfoChip label="Atualizado"   value={deal.lastUpdated} />
              <InfoChip label="Operação"     value={deal.operationType} />
              <InfoChip label="Valuation"    value={deal.valuationRange} />
              <InfoChip label="Risco"        value={deal.riskLevel} />
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-2xl font-bold text-amber-600">{fmtR(deal.proposedValue)}</div>
              <div className="text-[11px] text-gray-400">Valor Proposto</div>
            </div>
            <ScoreRing score={deal.dealScore} />
          </div>
        </div>
      </div>

      {/* ── Anchor Nav ────────────────────────────────────────────────────── */}
      <div className="sticky top-[49px] z-[5] bg-white border-b border-gray-200 rounded-xl overflow-hidden">
        <nav className="flex gap-0.5 overflow-x-auto py-1">
          {anchors.map((a) => (
            <a
              key={a.href}
              href={a.href}
              className="text-xs font-medium px-3 py-2 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors whitespace-nowrap"
            >
              {a.label}
            </a>
          ))}
        </nav>
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div className="flex gap-6 items-start">

        {/* ── Left: Main Sections ─────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* §2 KPI Indicators ─────────────────────────────────────────────── */}
          <SectionCard id="indicadores" icon={TrendingUp} title="Indicadores do Deal">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { label: "Valuation Pedido",    value: fmtR(deal.financials.askValuation),          color: "text-amber-600"   },
                { label: "Valuation Proposto",  value: fmtR(deal.financials.proposedValuation),         color: "text-emerald-600" },
                { label: "Receita Estimada",    value: fmtR(deal.financials.estimatedRevenue),      color: "text-blue-600"    },
                { label: "EBITDA Estimado",     value: fmtR(deal.financials.estimatedEbitda),       color: "text-violet-600"  },
                { label: "Margem EBITDA",       value: fmtPct(deal.financials.ebitdaMargin),        color: "text-gray-700"    },
                { label: "Múltiplo Implícito",  value: deal.financials.impliedMultiple ? deal.financials.impliedMultiple.toFixed(2) + "×" : "—", color: "text-gray-700" },
                { label: "Participação",        value: deal.financials.targetOwnership + "%",       color: "text-brand-600"   },
                { label: "Investimento Est.",   value: fmtR(deal.financials.estimatedInvestment),   color: "text-amber-600"   },
                { label: "Upside Esperado",     value: fmtPct(deal.financials.expectedUpside),      color: "text-emerald-600" },
                { label: "Score do Deal",       value: deal.dealScore.toFixed(1) + "/10",           color: deal.dealScore >= 8 ? "text-emerald-600" : deal.dealScore >= 7 ? "text-amber-600" : "text-red-500" },
                { label: "Readiness (média)",   value: readiness.toFixed(1) + "/5",                 color: "text-gray-700"    },
                { label: "Confiança Financeira",value: confLabel[deal.financials.revenueConfidence] ?? deal.financials.revenueConfidence, color: "text-gray-700" },
              ].map(({ label, value, color }) => (
                <div key={label} className="surface-subtle p-3 rounded-xl">
                  <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</div>
                  <div className={`text-base font-bold ${color} tabular-nums`}>{value}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* §3 Identificação ────────────────────────────────────────────── */}
          <SectionCard id="identificacao" icon={Building2} title="Identificação da Empresa-Alvo">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldRow label="Nome" value={deal.identification.companyName} />
              <FieldRow label="Setor" value={deal.identification.sector} />
              <FieldRow label="Localização" value={<span className="flex items-center gap-1"><MapPin size={12} className="text-gray-400" />{deal.identification.location}</span>} />
              <FieldRow label="Origem do Deal" value={deal.identification.dealOrigin} />
              <FieldRow label="Contato Principal" value={
                <div>
                  <div className="font-medium">{deal.identification.mainContact}</div>
                  <div className="text-xs text-gray-400">{deal.identification.mainContactRole}</div>
                </div>
              } />
              <FieldRow label="Estágio Atual" value={<span className={stageBadge[effectiveDeal.stage] ?? ""}>{effectiveDeal.stage}</span>} />
              {deal.identification.mainContactEmail && (
                <FieldRow label="Email" value={<span className="flex items-center gap-1 text-brand-600"><Mail size={12} />{deal.identification.mainContactEmail}</span>} />
              )}
              {deal.identification.mainContactPhone && (
                <FieldRow label="Telefone" value={<span className="flex items-center gap-1"><Phone size={12} className="text-gray-400" />{deal.identification.mainContactPhone}</span>} />
              )}
              {deal.identification.website && (
                <FieldRow label="Website" value={<span className="flex items-center gap-1 text-brand-600"><Globe size={12} />{deal.identification.website}</span>} />
              )}
            </div>
          </SectionCard>

          {/* §4 Tese Estratégica ─────────────────────────────────────────── */}
          <SectionCard id="tese" icon={Target} title="Tese Estratégica">
            <div className="space-y-4">
              {[
                { label: "Racional Estratégico",    value: deal.strategicThesis.strategicRationale  },
                { label: "Por que Agora",            value: deal.strategicThesis.whyNow              },
                { label: "Sinergias",                value: deal.strategicThesis.synergies           },
                { label: "Tese de Criação de Valor", value: deal.strategicThesis.valueCreationThesis },
                { label: "Encaixe AWQ Venture",      value: deal.strategicThesis.awqVentureFit       },
              ].map(({ label, value }) => (
                <div key={label} className="surface-subtle p-4 rounded-xl">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">{label}</div>
                  <p className="text-sm text-gray-700 leading-relaxed">{value}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* §5 Diagnóstico ──────────────────────────────────────────────── */}
          <SectionCard id="diagnostico" icon={BarChart2} title="Diagnóstico do Ativo">
            <div className="space-y-5">
              <div className="surface-subtle p-4 rounded-xl">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Diagnóstico Resumido</div>
                <p className="text-sm text-gray-700 leading-relaxed">{deal.assetDiagnosis.summary}</p>
              </div>

              <div className="surface-subtle p-4 rounded-xl space-y-2">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Maturidade</div>
                <MaturityDots level={deal.assetDiagnosis.operationalMaturity} label="Maturidade Operacional" />
                <MaturityDots level={deal.assetDiagnosis.commercialMaturity}  label="Maturidade Comercial"   />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="surface-subtle p-4 rounded-xl">
                  <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide mb-2">Pontos Fortes</div>
                  {deal.assetDiagnosis.strengths.length === 0
                    ? <p className="text-xs text-gray-400 italic">A preencher.</p>
                    : <ul className="space-y-1.5">
                        {deal.assetDiagnosis.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                            <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                  }
                </div>
                <div className="surface-subtle p-4 rounded-xl">
                  <div className="text-[10px] font-bold text-red-400 uppercase tracking-wide mb-2">Fragilidades</div>
                  {deal.assetDiagnosis.weaknesses.length === 0
                    ? <p className="text-xs text-gray-400 italic">A preencher.</p>
                    : <ul className="space-y-1.5">
                        {deal.assetDiagnosis.weaknesses.map((w, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                            <XCircle size={12} className="text-red-400 mt-0.5 shrink-0" />
                            {w}
                          </li>
                        ))}
                      </ul>
                  }
                </div>
              </div>

              {deal.assetDiagnosis.risks.length > 0 && (
                <div className="surface-subtle p-4 rounded-xl">
                  <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wide mb-2">Riscos Identificados</div>
                  <ul className="space-y-1.5">
                    {deal.assetDiagnosis.risks.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                        <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </SectionCard>
          {/* §6 Financeiro ───────────────────────────────────────────────── */}
          <SectionCard id="financeiro" icon={DollarSign} title="Econômico-Financeiro">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Left */}
                <div className="space-y-3">
                  <FieldRow label="Receita Estimada"   value={<span className="text-blue-600 font-bold">{fmtR(deal.financials.estimatedRevenue)}</span>} />
                  <FieldRow label="EBITDA Estimado"    value={<span className="text-violet-600 font-bold">{fmtR(deal.financials.estimatedEbitda)}</span>} />
                  <FieldRow label="Margem EBITDA"      value={fmtPct(deal.financials.ebitdaMargin)} />
                  <FieldRow label="Valuation Pedido"   value={<span className="text-amber-600 font-bold">{fmtR(deal.financials.askValuation)}</span>} />
                  <FieldRow label="Valuation Proposto" value={<span className="text-emerald-600 font-bold">{fmtR(deal.financials.proposedValuation)}</span>} />
                  <FieldRow label="Múltiplo Implícito" value={deal.financials.impliedMultiple ? deal.financials.impliedMultiple.toFixed(2) + "× receita" : "—"} />
                </div>
                {/* Right */}
                <div className="space-y-3">
                  <FieldRow label="Tipo de Deal"          value={deal.financials.dealType} />
                  <FieldRow label="Participação Pretendida" value={<span className="text-brand-600 font-bold">{deal.financials.targetOwnership}%</span>} />
                  <FieldRow label="Investimento Estimado"  value={<span className="text-amber-600 font-bold">{fmtR(deal.financials.estimatedInvestment)}</span>} />
                  <FieldRow label="Upside Esperado"        value={<span className="text-emerald-600 font-bold">{fmtPct(deal.financials.expectedUpside)}</span>} />
                  <FieldRow label="Confiança dos Dados"    value={confLabel[deal.financials.revenueConfidence] ?? deal.financials.revenueConfidence} />
                  <FieldRow label="Estrutura da Oferta"    value={deal.financials.offerStructure} />
                </div>
              </div>

              {deal.financials.financialNotes && (
                <div className="surface-subtle p-4 rounded-xl">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Observações Financeiras</div>
                  <p className="text-sm text-gray-600 leading-relaxed italic">{deal.financials.financialNotes}</p>
                </div>
              )}
            </div>
          </SectionCard>

          {/* §7 Risco e Diligência ───────────────────────────────────────── */}
          <SectionCard id="risco" icon={Shield} title="Risco e Diligência">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Riscos Jurídicos",     value: deal.riskDiligence.legalRisks       },
                  { label: "Riscos Financeiros",   value: deal.riskDiligence.financialRisks   },
                  { label: "Riscos Operacionais",  value: deal.riskDiligence.operationalRisks },
                  { label: "Riscos de Integração", value: deal.riskDiligence.integrationRisks },
                ].map(({ label, value }) => (
                  <div key={label} className="surface-subtle p-4 rounded-xl">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">{label}</div>
                    <p className="text-xs text-gray-700 leading-relaxed">{value || "—"}</p>
                  </div>
                ))}
              </div>

              {deal.riskDiligence.diligencePending.length > 0 && (
                <div className="surface-subtle p-4 rounded-xl">
                  <div className="text-[10px] font-bold text-amber-500 uppercase tracking-wide mb-2">Pendências de Diligência</div>
                  <ol className="space-y-1.5">
                    {deal.riskDiligence.diligencePending.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                        <Clock size={12} className="text-amber-500 mt-0.5 shrink-0" />
                        <span><span className="font-semibold text-gray-500 mr-1">{i + 1}.</span>{p}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="surface-subtle p-4 rounded-xl">
                <div className="text-[10px] font-bold uppercase tracking-wide mb-2">
                  <span className={deal.riskDiligence.blockers.length > 0 ? "text-red-500" : "text-emerald-500"}>
                    Blockers
                  </span>
                </div>
                {deal.riskDiligence.blockers.length === 0 ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-600">
                    <CheckCircle2 size={13} className="shrink-0" />
                    Nenhum blocker identificado
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {deal.riskDiligence.blockers.map((b, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-red-600">
                        <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </SectionCard>

          {/* §8 Estrutura da Proposta ────────────────────────────────────── */}
          <SectionCard id="proposta" icon={Layers} title="Estrutura da Proposta">
            {proposalDeleted ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <Trash2 size={18} className="text-red-400" />
                </div>
                <div className="text-sm font-semibold text-gray-600">Proposta excluída</div>
                <div className="text-xs text-gray-400 max-w-xs">
                  A estrutura da proposta foi removida localmente.
                </div>
                <button
                  onClick={() => applyOverride({ proposalDeleted: false, sendStatus: deal.sendStatus })}
                  className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl hover:bg-amber-100 transition-colors"
                >
                  Restaurar Proposta
                </button>
              </div>
            ) : (
            <div className="space-y-4">
              <div className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex items-center gap-2">
                <Pencil size={10} className="shrink-0" />
                Clique em qualquer campo para editar. Alterações salvas localmente.
              </div>

              <div className="surface-subtle p-4 rounded-xl">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Proposta Econômica</div>
                <EditableText fieldKey="economicProposal" value={deal.proposalStructure.economicProposal} overrideFields={overrideFields} onSave={saveField} />
              </div>

              <div className="surface-subtle p-4 rounded-xl">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Forma de Pagamento</div>
                <EditableText fieldKey="paymentStructure" value={deal.proposalStructure.paymentStructure} overrideFields={overrideFields} onSave={saveField} />
              </div>

              {deal.proposalStructure.stages.length > 0 && (
                <div className="surface-subtle p-4 rounded-xl">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">Etapas</div>
                  <div className="relative space-y-3 pl-4">
                    <div className="absolute left-1.5 top-2 bottom-2 w-px bg-gray-200" />
                    {deal.proposalStructure.stages.map((s, i) => (
                      <div key={i} className="relative flex items-start gap-3">
                        <div className="absolute -left-4 w-3 h-3 rounded-full bg-brand-500 border-2 border-white shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <EditableText fieldKey={`stage_${i}_label`} value={s.label} overrideFields={overrideFields} onSave={saveField} multiline={false} className="font-bold text-gray-900 text-xs" />
                          <EditableText fieldKey={`stage_${i}_desc`} value={s.description} overrideFields={overrideFields} onSave={saveField} className="text-gray-500 text-xs mt-0.5" />
                          <EditableText fieldKey={`stage_${i}_date`} value={s.targetDate} overrideFields={overrideFields} onSave={saveField} multiline={false} className="text-brand-600 text-[10px] font-semibold mt-0.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {deal.proposalStructure.conditions.length > 0 && (
                <div className="surface-subtle p-4 rounded-xl">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Condicionantes</div>
                  <ul className="space-y-1.5">
                    {deal.proposalStructure.conditions.map((c, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle size={12} className="text-brand-500 mt-0.5 shrink-0" />
                        <EditableText fieldKey={`condition_${i}`} value={c} overrideFields={overrideFields} onSave={saveField} multiline={false} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="surface-subtle p-4 rounded-xl">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Cronograma</div>
                  <EditableText fieldKey="timeline" value={deal.proposalStructure.timeline} overrideFields={overrideFields} onSave={saveField} />
                </div>

                <div className="surface-subtle p-4 rounded-xl">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Próximos Passos</div>
                  <EditableNextSteps
                    steps={deal.proposalStructure.nextSteps}
                    overrideSteps={override.nextSteps}
                    onSave={saveNextSteps}
                  />
                </div>
              </div>
            </div>
            )}{/* end proposalDeleted */}
          </SectionCard>

          {/* §9 Governança ───────────────────────────────────────────────── */}
          <SectionCard id="governanca" icon={Settings} title="Governança">
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <FieldRow label="Criado por"        value={deal.governance.createdBy} />
                <FieldRow label="Criado em"         value={deal.governance.createdAt} />
                <FieldRow label="Atualizado por"    value={deal.governance.updatedBy} />
                <FieldRow label="Atualizado em"     value={deal.governance.updatedAt} />
                <FieldRow label="Versão"            value={"v" + deal.governance.version} />
                <FieldRow label="Source of Truth"   value={
                  <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60">
                    {deal.governance.sourceOfTruth}
                  </span>
                } />
                <FieldRow label="Status"            value={
                  <span className={sendStatusColor[deal.governance.status] ?? "text-gray-500"}>
                    {deal.governance.status}
                  </span>
                } />
                <FieldRow label="Somente Interno"   value={
                  <span className={`badge ${deal.governance.internalOnly ? "bg-red-50 text-red-700 ring-1 ring-red-200/60" : "bg-gray-100 text-gray-600"}`}>
                    {deal.governance.internalOnly ? "Sim" : "Não"}
                  </span>
                } />
                <FieldRow label="Visível ao Cliente" value={
                  <span className={`badge ${deal.governance.clientVisible ? "badge-green" : "bg-gray-100 text-gray-600"}`}>
                    {deal.governance.clientVisible ? "Sim" : "Não"}
                  </span>
                } />
              </div>

              <div className="surface-subtle p-4 rounded-xl">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Audit Trail</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-1.5 pr-4 font-semibold text-gray-500 whitespace-nowrap">Data</th>
                        <th className="text-left py-1.5 pr-4 font-semibold text-gray-500 whitespace-nowrap">Por</th>
                        <th className="text-left py-1.5 font-semibold text-gray-500">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {[...deal.governance.auditTrail].reverse().map((entry, i) => (
                        <tr key={i}>
                          <td className="py-1.5 pr-4 text-gray-400 whitespace-nowrap">{entry.date}</td>
                          <td className="py-1.5 pr-4 font-medium text-gray-700 whitespace-nowrap">{entry.by}</td>
                          <td className="py-1.5 text-gray-600">{entry.action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* §10 Preview ─────────────────────────────────────────────────── */}
          <SectionCard id="preview" icon={Eye} title="Preview">
            <div className="space-y-4">
              {/* Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setPreview(preview === "interno" ? null : "interno")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    preview === "interno"
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Eye size={13} />
                  Preview Interno
                </button>
                <button
                  onClick={() => setPreview(preview === "cliente" ? null : "cliente")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    preview === "cliente"
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Send size={13} />
                  Preview Cliente
                </button>
              </div>

              {preview === null && (
                <div className="text-center py-12 text-gray-400">
                  <Eye size={28} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Selecione um modo de preview acima</p>
                  <p className="text-xs mt-1 text-gray-300">Preview Interno · Preview Cliente</p>
                </div>
              )}

              {preview === "interno"  && <PreviewInterno  deal={deal} />}
              {preview === "cliente"  && <PreviewCliente  deal={deal} />}
            </div>
          </SectionCard>

        </div>{/* end left col */}

        {/* ── Right: Sticky Sidebar ────────────────────────────────────────── */}
        <div className="w-72 shrink-0 hidden lg:block">
          <StickySidebar
            deal={effectiveDeal}
            onPreviewInterno={() => scrollToPreview("interno")}
            onPreviewCliente={() => scrollToPreview("cliente")}
            onChangeStatus={() => setShowStatusModal(true)}
            onDeleteProposal={() => setShowDeleteConfirm(true)}
            proposalDeleted={proposalDeleted}
          />
        </div>

      </div>{/* end two-col */}

      {showStatusModal && (
        <StatusChangeModal
          currentStage={effectiveDeal.stage}
          currentSendStatus={effectiveDeal.sendStatus}
          onApply={(s, ss) => applyOverride({ stage: s, sendStatus: ss })}
          onClose={() => setShowStatusModal(false)}
        />
      )}

      {showDeleteConfirm && (
        <DeleteProposalConfirm
          companyName={effectiveDeal.companyName}
          onConfirm={() => applyOverride({ proposalDeleted: true, sendStatus: "Rascunho" })}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  );
}
