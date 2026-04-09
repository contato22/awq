"use client";
// ─── LP de Vendas Gamificada 10-Blocos — Proposta AWQ Venture ─────────────────
// Proposta digital completa e negociável com 10 blocos negociais.
// Cada bloco é revisado individualmente pelo cliente.
// Aprovação / Rejeição / Solicitação de ajuste por bloco.
// Ao final, cliente envia rodada de negociação que vai para base interna AWQ.

import { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import { getDealById } from "@/lib/deal-data";
import type { Proposal10Blocks } from "@/lib/deal-types";
import {
  CheckCircle2, XCircle, Pencil, Send, TrendingUp,
  ChevronDown, ChevronUp, Info, Trophy,
  MessageSquare, Clock, Shield,
  DollarSign, Calendar, ArrowRight, Target,
  CheckCheck, AlertTriangle, RotateCcw, Zap,
  Building2, Layers, BarChart3, Lock, ListChecks,
  Users, Handshake, Star, FileDown, MapPin,
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

const BLOCK_LABELS = [
  "Contexto do Deal",
  "Tese de Criação de Valor",
  "Escopo da Atuação",
  "Objeto Econômico",
  "Estrutura Econômica",
  "Scorecard e Métricas",
  "Governança e Alçadas",
  "Proteções Contratuais",
  "Cronograma",
  "Decisão Solicitada",
];

function loadRounds(dealId: string): NegotiationRound[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY(dealId)) ?? "[]"); } catch { return []; }
}

function saveRounds(dealId: string, rounds: NegotiationRound[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY(dealId), JSON.stringify(rounds));
}

// ─── Block metadata ───────────────────────────────────────────────────────────

const BLOCK_META = [
  { id: "b1",  title: "Contexto do Deal",          icon: Target     },
  { id: "b2",  title: "Tese de Criação de Valor",   icon: TrendingUp },
  { id: "b3",  title: "Escopo da Atuação",          icon: Layers     },
  { id: "b4",  title: "Objeto Econômico",           icon: Building2  },
  { id: "b5",  title: "Estrutura Econômica",        icon: DollarSign },
  { id: "b6",  title: "Scorecard e Métricas",       icon: BarChart3  },
  { id: "b7",  title: "Governança e Alçadas",       icon: Users      },
  { id: "b8",  title: "Proteções Contratuais",      icon: Lock       },
  { id: "b9",  title: "Cronograma",                 icon: Calendar   },
  { id: "b10", title: "Decisão Solicitada",         icon: Handshake  },
] as const;

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

// ─── Block-specific content renderers ────────────────────────────────────────

function LabelRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 items-start">
      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide pt-0.5">{label}</span>
      <span className="text-sm text-gray-700 leading-relaxed">{value}</span>
    </div>
  );
}

function BulletList({ items, color = "bg-amber-500" }: { items: string[]; color?: string }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
          <div className={`w-1.5 h-1.5 rounded-full ${color} mt-1.5 shrink-0`} />
          {item}
        </li>
      ))}
    </ul>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 pt-2 border-t border-gray-100 first:pt-0 first:border-0">
      {label}
    </div>
  );
}

function BlockContent({ blockIdx, blocks }: { blockIdx: number; blocks: NonNullable<ReturnType<typeof getDealById>>["proposal10Blocks"] }) {
  if (!blocks) return null;

  if (blockIdx === 0) {
    const b = blocks.b1;
    return (
      <div className="space-y-3">
        <LabelRow label="Diagnóstico" value={b.diagnostico} />
        <LabelRow label="Situação atual" value={b.situacaoAtual} />
        <LabelRow label="Problema" value={b.problema} />
        <LabelRow label="Ruptura de mercado" value={b.ruptura} />
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
          <div className="text-[11px] font-bold text-amber-700 mb-1">Oportunidade identificada</div>
          <p className="text-sm text-amber-800">{b.oportunidade}</p>
        </div>
        <div className="p-3 rounded-xl bg-red-50 border border-red-100">
          <div className="text-[11px] font-bold text-red-600 mb-1 flex items-center gap-1.5">
            <AlertTriangle size={11} /> Risco de não agir
          </div>
          <p className="text-sm text-red-700">{b.riscoNaoAgir}</p>
        </div>
      </div>
    );
  }

  if (blockIdx === 1) {
    const b = blocks.b2;
    return (
      <div className="space-y-3">
        <SectionHeader label="Alavancas principais" />
        <BulletList items={b.alavancasPrincipais} />
        <LabelRow label="Assimetria do deal" value={b.assimetriaDeal} />
        <LabelRow label="Papel da AWQ" value={b.papelAWQ} />
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
          <div className="text-[11px] font-bold text-emerald-700 mb-1">Resultado esperado</div>
          <p className="text-sm text-emerald-800">{b.resultadoEsperado}</p>
        </div>
        <LabelRow label="Horizonte" value={b.horizonte} />
      </div>
    );
  }

  if (blockIdx === 2) {
    const b = blocks.b3;
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide mb-2">AWQ entrega</div>
            <BulletList items={b.oQueEntrega} color="bg-emerald-500" />
          </div>
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
            <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-2">AWQ coordena</div>
            <BulletList items={b.oQueCoordena} color="bg-blue-500" />
          </div>
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Fora do campo</div>
            <BulletList items={b.foraDoCampo} color="bg-gray-400" />
          </div>
        </div>
        <LabelRow label="Dedicação" value={b.dedicacao} />
      </div>
    );
  }

  if (blockIdx === 3) {
    const b = blocks.b4;
    return (
      <div className="space-y-3">
        <LabelRow label="Ativo" value={b.ativo} />
        <LabelRow label="Veículo" value={b.veiculo} />
        <LabelRow label="Natureza do direito" value={b.naturezaDireito} />
        <LabelRow label="Conversão futura" value={b.conversaoFutura} />
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
          <div className="text-[11px] font-bold text-amber-700 mb-1">Valor de referência</div>
          <p className="text-sm font-semibold text-amber-800">{b.valorReferencia}</p>
        </div>
      </div>
    );
  }

  if (blockIdx === 4) {
    const b = blocks.b5;
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
            <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-1">Fee</div>
            <div className="text-base font-bold text-blue-900">{b.feeValor}</div>
            <div className="text-xs text-blue-600 mt-0.5">{b.feePrazo}</div>
            <div className="text-xs text-blue-700 mt-1">{b.feeDescricao}</div>
          </div>
          <div className="p-3 rounded-xl bg-violet-50 border border-violet-100">
            <div className="text-[10px] font-bold text-violet-700 uppercase tracking-wide mb-1">Upside</div>
            <div className="text-base font-bold text-violet-900">{b.upsidePercentual}</div>
            <div className="text-xs text-violet-700 mt-1">{b.upsideDescricao}</div>
          </div>
        </div>
        <SectionHeader label="Gates de liberação" />
        <ol className="space-y-1.5">
          {b.gates.map((g, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
              <div className="w-5 h-5 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-[10px] font-bold text-amber-700 shrink-0 mt-0.5">{i + 1}</div>
              {g}
            </li>
          ))}
        </ol>
        <SectionHeader label="Tranches" />
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-gray-200 rounded-xl overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                {["Tranche", "Valor", "Condição", "Prazo"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.tranches.map((t, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-semibold text-gray-700">{t.label}</td>
                  <td className="px-3 py-2 font-bold text-amber-700">{t.valor}</td>
                  <td className="px-3 py-2 text-gray-600">{t.condicao}</td>
                  <td className="px-3 py-2 text-gray-500">{t.prazo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <LabelRow label="Baseline" value={b.baseline} />
        <LabelRow label="Earn-in / Upside acelerador" value={b.earnin} />
      </div>
    );
  }

  if (blockIdx === 5) {
    const b = blocks.b6;
    const MetricTable = ({ title, items }: { title: string; items: typeof b.financeiras }) => (
      <div>
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">{title}</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-gray-200 rounded-xl overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                {["Métrica", "Fórmula", "Baseline", "Meta"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((m, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-semibold text-gray-700">{m.nome}</td>
                  <td className="px-3 py-2 text-gray-500 font-mono text-[10px]">{m.formula}</td>
                  <td className="px-3 py-2 text-gray-600">{m.baseline}</td>
                  <td className="px-3 py-2 font-semibold text-emerald-700">{m.meta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
    return (
      <div className="space-y-4">
        <MetricTable title="Métricas Financeiras" items={b.financeiras} />
        <MetricTable title="Métricas Comerciais" items={b.comerciais} />
        <MetricTable title="Métricas Institucionais" items={b.institucionais} />
        <div className="flex gap-6 text-xs text-gray-500">
          <span><strong>Periodicidade:</strong> {b.periodicidade}</span>
          <span><strong>Auditor:</strong> {b.auditor}</span>
        </div>
      </div>
    );
  }

  if (blockIdx === 6) {
    const b = blocks.b7;
    return (
      <div className="space-y-3">
        <SectionHeader label="Direitos da AWQ" />
        <BulletList items={b.direitosAWQ} color="bg-amber-500" />
        <SectionHeader label="Rotinas de reporting" />
        <BulletList items={b.rotinasReporting} color="bg-blue-500" />
        <LabelRow label="Alçadas de decisão" value={b.alcadasDecisao} />
        <LabelRow label="Representação" value={b.representacao} />
        <LabelRow label="Resolução de conflitos" value={b.conflito} />
      </div>
    );
  }

  if (blockIdx === 7) {
    const b = blocks.b8;
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <div className="text-[10px] font-bold text-emerald-700 mb-1 uppercase tracking-wide">Good Leaver</div>
            <p className="text-xs text-emerald-800 leading-relaxed">{b.goodLeaver}</p>
          </div>
          <div className="p-3 rounded-xl bg-red-50 border border-red-100">
            <div className="text-[10px] font-bold text-red-600 mb-1 uppercase tracking-wide">Bad Leaver</div>
            <p className="text-xs text-red-700 leading-relaxed">{b.badLeaver}</p>
          </div>
        </div>
        <LabelRow label="Anti-diluição" value={b.antiDiluicao} />
        <LabelRow label="Change of control" value={b.changeOfControl} />
        <LabelRow label="Tag / Drag Along" value={b.tagDragAlong} />
        <SectionHeader label="Cláusulas penais" />
        <BulletList items={b.clausulasPenais} color="bg-red-400" />
        <LabelRow label="Lock-up" value={b.lockup} />
      </div>
    );
  }

  if (blockIdx === 8) {
    const b = blocks.b9;
    return (
      <div className="space-y-3">
        <div className="space-y-2">
          {b.marcos.map((m) => (
            <div key={m.numero} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
              <div className="w-7 h-7 rounded-full bg-amber-100 border-2 border-amber-200 flex items-center justify-center shrink-0 text-[11px] font-bold text-amber-700">
                {m.numero}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-900">{m.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{m.descricao}</div>
                <div className="flex flex-wrap gap-3 mt-1">
                  {m.prazo && <span className="text-[10px] text-amber-600 flex items-center gap-1"><Calendar size={9} /> {m.prazo}</span>}
                  {m.dependencia && <span className="text-[10px] text-gray-400">Dep: {m.dependencia}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
        <LabelRow label="Prazo total" value={b.prazoTotal} />
        <LabelRow label="Janela de revisão" value={b.janelaRevisao} />
        <SectionHeader label="Condições de fechamento" />
        <BulletList items={b.condicoesFechamento} color="bg-emerald-500" />
      </div>
    );
  }

  if (blockIdx === 9) {
    const b = blocks.b10;
    return (
      <div className="space-y-4">
        <SectionHeader label="6 perguntas estruturadas" />
        <ol className="space-y-2">
          {b.perguntasEstruturadas.map((q, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-[10px] font-bold text-amber-700 shrink-0 mt-0.5">{i + 1}</div>
              <span className="text-sm text-gray-700">{q}</span>
            </li>
          ))}
        </ol>
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-800 leading-relaxed">{b.ctaDescricao}</p>
        </div>
        <SectionHeader label="Caminhos de resposta" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {b.caminhos.map((c) => {
            const styles = c.opcao === "aprovacao"
              ? { bg: "bg-emerald-50", border: "border-emerald-200", title: "text-emerald-800", cta: "text-emerald-700" }
              : c.opcao === "ajuste"
              ? { bg: "bg-amber-50", border: "border-amber-200", title: "text-amber-800", cta: "text-amber-700" }
              : { bg: "bg-violet-50", border: "border-violet-200", title: "text-violet-800", cta: "text-violet-700" };
            return (
              <div key={c.opcao} className={`p-3 rounded-xl border ${styles.bg} ${styles.border}`}>
                <div className={`text-xs font-bold mb-1 ${styles.title}`}>{c.label}</div>
                <p className={`text-[11px] leading-relaxed ${styles.cta}`}>{c.descricao}</p>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          <span><strong>Prazo de resposta:</strong> {b.prazoResposta}</span>
          <span><strong>Contato:</strong> {b.contatoNegociacao}</span>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Stages Tracker ──────────────────────────────────────────────────────────

function StagesTracker({ blocks, dealStage }: {
  blocks: NonNullable<ReturnType<typeof getDealById>>["proposal10Blocks"];
  dealStage: string;
}) {
  if (!blocks?.b9) return null;
  const marcos = blocks.b9.marcos;

  // Map deal stage to index to show progress
  const stageOrder = ["Triagem","Prospecção","Due Diligence","Term Sheet","Negociação","Fechado"];
  const currentIdx = stageOrder.indexOf(dealStage);

  // Color each marco: completed = emerald, current = amber, upcoming = gray
  const marcoStatus = (i: number) => {
    if (i < currentIdx) return "done";
    if (i === currentIdx) return "current";
    return "upcoming";
  };

  const statusStyle = {
    done:     { ring: "border-emerald-400 bg-emerald-50",  dot: "bg-emerald-500",  num: "bg-emerald-500 text-white",  label: "text-emerald-700" },
    current:  { ring: "border-amber-400 bg-amber-50",     dot: "bg-amber-400",    num: "bg-amber-500 text-white",    label: "text-amber-700"   },
    upcoming: { ring: "border-gray-200 bg-white",          dot: "bg-gray-300",     num: "bg-gray-100 text-gray-500",  label: "text-gray-500"    },
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden print:block">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-amber-600" />
          <span className="text-sm font-bold text-gray-900">Acompanhamento de Etapas</span>
        </div>
        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full uppercase tracking-wide">
          {dealStage}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 to-amber-400 transition-all duration-700"
          style={{ width: `${marcos.length === 0 ? 0 : Math.max(5, (currentIdx / (marcos.length - 1)) * 100)}%` }}
        />
      </div>

      <div className="px-5 py-4 space-y-3">
        {marcos.map((m, i) => {
          const st = statusStyle[marcoStatus(i)];
          const isDone    = marcoStatus(i) === "done";
          const isCurrent = marcoStatus(i) === "current";
          return (
            <div key={m.numero} className={`flex items-start gap-3 p-3 rounded-xl border ${st.ring} transition-all`}>
              <div className={`w-7 h-7 rounded-full ${st.num} flex items-center justify-center text-[11px] font-bold shrink-0`}>
                {isDone ? <CheckCircle2 size={14} className="text-white" /> : m.numero}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-sm font-bold ${isCurrent ? "text-gray-900" : isDone ? "text-gray-600" : "text-gray-400"}`}>
                    {m.label}
                  </span>
                  {isCurrent && (
                    <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                      Etapa atual
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-0.5 ${isDone ? "text-gray-400" : isCurrent ? "text-gray-600" : "text-gray-400"}`}>
                  {m.descricao}
                </p>
                <div className="flex flex-wrap gap-3 mt-1">
                  {m.prazo && (
                    <span className="flex items-center gap-1 text-[10px] text-amber-600">
                      <Calendar size={9} /> {m.prazo}
                    </span>
                  )}
                  {m.dependencia && (
                    <span className="text-[10px] text-gray-400">Dep: {m.dependencia}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
        <div className="flex flex-wrap gap-4 text-[11px] text-gray-500">
          <span><strong className="text-gray-700">Prazo total:</strong> {blocks.b9.prazoTotal}</span>
          <span><strong className="text-gray-700">Revisão:</strong> {blocks.b9.janelaRevisao}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function DealSharePage({ params }: { params: { id: string } }) {
  const dealOrNull = getDealById(params.id);
  if (!dealOrNull) notFound();
  const deal = dealOrNull!;

  const blocks = deal.proposal10Blocks;

  const BLOCK_IDS = ["b1","b2","b3","b4","b5","b6","b7","b8","b9","b10"];
  const BLOCK_ICONS: React.ElementType[] = [Target, TrendingUp, Layers, Building2, DollarSign, BarChart3, Users, Lock, Calendar, Handshake];

  const [rounds, setRounds]           = useState<NegotiationRound[]>([]);
  const [sections, setSections]       = useState<SectionResponse[]>(
    BLOCK_IDS.map((id) => ({ id, status: "pending" as SectionStatus, counterText: "" }))
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

  function handlePrint() {
    window.open(`/awq-venture/deals/${deal.id}/pdf`, "_blank");
  }

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
              const labels = BLOCK_LABELS;
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
      {/* ── Print CSS ─────────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .min-h-screen { min-height: unset !important; background: white !important; }
          .sticky { position: static !important; }
          .shadow-sm { box-shadow: none !important; }
          .rounded-2xl, .rounded-3xl, .rounded-xl { border-radius: 8px !important; }
          .max-w-3xl { max-width: 100% !important; padding: 0 !important; }
          .space-y-6 > * + * { margin-top: 16px !important; }
          @page { margin: 1.5cm; size: A4; }
        }
      `}</style>

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
              <span className="text-gray-400 font-normal hidden sm:inline">blocos revisados</span>
            </div>
            <button
              onClick={handlePrint}
              className="no-print flex items-center gap-1.5 text-[11px] font-semibold text-white bg-gray-800 hover:bg-gray-900 px-3 py-1.5 rounded-lg transition-colors"
              title="Abrir versão PDF da proposta"
            >
              <FileDown size={13} /> Exportar PDF
            </button>
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
                    <span>{approved}/{r.sections.length} blocos aprovados</span>
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
                  {["Leia cada bloco abaixo", "Aprove, ajuste ou contraproponha", "Envie sua resposta à AWQ Venture"].map((t, i) => (
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
            Avalie cada bloco individualmente e envie sua resposta ao final.
          </span>
        </div>

        {/* ── Acompanhamento de Etapas ─────────────────────────────────────── */}
        {blocks && (
          <StagesTracker blocks={blocks} dealStage={deal.stage} />
        )}

        {/* ── 10 Blocos Negociais ───────────────────────────────────────────── */}
        {!blocks ? (
          <div className="p-6 rounded-2xl border border-amber-200 bg-amber-50 text-center">
            <p className="text-sm text-amber-800 font-medium">Proposta em preparação. Volte em breve.</p>
          </div>
        ) : (
          BLOCK_LABELS.map((label, idx) => {
            const Icon = BLOCK_ICONS[idx];
            return (
              <SectionCard
                key={BLOCK_IDS[idx]}
                idx={idx + 1}
                title={label}
                icon={Icon}
                response={sections[idx]}
                onUpdate={(r) => updateSection(idx, r)}
              >
                <BlockContent blockIdx={idx} blocks={blocks} />
              </SectionCard>
            );
          })
        )}

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
              const labels = BLOCK_LABELS;
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
                  : `Revise todos os ${sections.length} blocos para enviar`}
              </h3>
            </div>

            {!allReviewed && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <Clock size={13} className="text-amber-600 shrink-0" />
                <span className="text-xs text-amber-700">
                  Faltam <strong>{sections.length - reviewed} bloco{sections.length - reviewed > 1 ? "s" : ""}</strong> para completar sua avaliação.
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
