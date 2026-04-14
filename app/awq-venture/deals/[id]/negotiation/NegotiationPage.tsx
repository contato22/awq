"use client";

import { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDealById } from "@/lib/deal-data";
import {
  ArrowLeft, MessageSquare, Send, Settings, Clock,
  AlertTriangle, CheckCircle2, User, ChevronDown, Plus,
  FileText, TrendingUp, Eye, XCircle, Pencil, Trophy,
  RotateCcw, Inbox, ExternalLink,
} from "lucide-react";
import type { DealOverride } from "../DealWorkspacePage";

// ─── Persistence helpers (shared with DealWorkspacePage) ──────────────────────

function overrideKey(id: string) { return `awq_deal_override_${id}`; }
function loadOverride(id: string): DealOverride {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(overrideKey(id)) ?? "{}"); } catch { return {}; }
}
function saveOverride(id: string, data: DealOverride) {
  if (typeof window === "undefined") return;
  localStorage.setItem(overrideKey(id), JSON.stringify(data));
}

// ─── Client response types (must mirror share/SharePage.tsx) ─────────────────

type ClientSectionStatus = "pending" | "approved" | "rejected" | "adjusted";

interface ClientSectionResponse {
  id:          string;
  status:      ClientSectionStatus;
  counterText: string;
}

interface NegotiationRound {
  round:          number;
  sections:       ClientSectionResponse[];
  respondedBy:    string;
  overallMessage: string;
  finalDecision:  "approved" | "counter" | null;
  submittedAt:    string;
}

const CLIENT_RESPONSES_KEY = (id: string) => `awq_deal_client_responses_${id}`;

function loadClientRounds(id: string): NegotiationRound[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(CLIENT_RESPONSES_KEY(id)) ?? "[]"); } catch { return []; }
}

const sectionLabels = [
  "Contexto e Oportunidade",
  "Tese de Criação de Valor",
  "Estrutura da Operação",
  "Termos Financeiros",
  "Cronograma",
  "Próximos Passos",
];

const sectionStatusUi: Record<ClientSectionStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending:  { label: "Não respondido", color: "text-gray-400",    icon: Clock        },
  approved: { label: "Aprovado",       color: "text-emerald-600", icon: CheckCircle2 },
  rejected: { label: "Não aprovado",   color: "text-red-600",     icon: XCircle      },
  adjusted: { label: "Com ajuste",     color: "text-amber-600",   icon: Pencil       },
};

// ─── Types ────────────────────────────────────────────────────────────────────

type NoteCategory = "ajuste" | "contraproposta" | "observacao" | "alerta" | "decisao";

const categoryConfig: Record<NoteCategory, { label: string; color: string; bg: string }> = {
  ajuste:         { label: "Ajuste",          color: "text-amber-700",   bg: "bg-amber-50 border-amber-200"  },
  contraproposta: { label: "Contraproposta",   color: "text-violet-700",  bg: "bg-violet-50 border-violet-200"},
  observacao:     { label: "Observação",       color: "text-blue-700",    bg: "bg-blue-50 border-blue-200"   },
  alerta:         { label: "Alerta",           color: "text-red-700",     bg: "bg-red-50 border-red-200"     },
  decisao:        { label: "Decisão",          color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200"},
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NegotiationPage({ params }: { params: { id: string } }) {
  const maybeDeal = getDealById(params.id);
  if (!maybeDeal) notFound();
  const deal = maybeDeal;

  const [override, setOverride]         = useState<DealOverride>({});
  const [newNote, setNewNote]           = useState("");
  const [category, setCategory]         = useState<NoteCategory>("observacao");
  const [author, setAuthor]             = useState("");
  const [clientRounds, setClientRounds] = useState<NegotiationRound[]>([]);
  const [openRound, setOpenRound]       = useState<number | null>(null);

  useEffect(() => {
    setOverride(loadOverride(deal.id));
    setClientRounds(loadClientRounds(deal.id));
  }, [deal.id]);

  function addNote() {
    if (!newNote.trim()) return;
    const note = {
      id:        `NOTE-${Date.now()}`,
      text:      newNote.trim(),
      category,
      author:    author.trim() || "AWQ Team",
      createdAt: new Date().toISOString(),
    };
    const updated = { ...override, internalNotes: [...(override.internalNotes ?? []), note] };
    setOverride(updated);
    saveOverride(deal.id, updated);
    setNewNote("");
  }

  function deleteNote(id: string) {
    const updated = { ...override, internalNotes: (override.internalNotes ?? []).filter((n: any) => n.id !== id) };
    setOverride(updated);
    saveOverride(deal.id, updated);
  }

  const notes = (override.internalNotes ?? []) as any[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <Link href={`/awq-venture/deals/${deal.id}`} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft size={13} /> Workspace
          </Link>
          <span className="text-gray-200">/</span>
          <span className="text-xs text-gray-500">{deal.companyName}</span>
          <span className="text-gray-200">/</span>
          <span className="text-xs font-semibold text-gray-700">Negociação</span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare size={18} className="text-amber-600" />
              Área de Negociação — {deal.companyName}
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Comentários internos, ajustes de proposta, contrapropostas e decisões da equipe AWQ Venture.
              Não visível ao cliente.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href={`/awq-venture/deals/${deal.id}/history`} className="btn-ghost text-xs flex items-center gap-1.5">
              <Clock size={12} /> Histórico
            </Link>
            <Link href={`/awq-venture/deals/${deal.id}/share`} className="btn-ghost text-xs flex items-center gap-1.5">
              <Eye size={12} /> Preview Cliente
            </Link>
          </div>
        </div>
      </div>

      {/* Sub-nav */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 overflow-x-auto">
        <Link href={`/awq-venture/deals/${deal.id}`} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
          <Settings size={11} /> Workspace
        </Link>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg whitespace-nowrap">
          <MessageSquare size={11} /> Negociação
        </span>
        <Link href={`/awq-venture/deals/${deal.id}/history`} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
          <Clock size={11} /> Histórico
        </Link>
        <Link href={`/awq-venture/deals/${deal.id}/share`} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
          <Send size={11} /> Preview Cliente
        </Link>
      </div>

      {/* Status atual */}
      <div className="card p-4">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Status Atual do Deal</div>
        <div className="flex flex-wrap gap-3">
          <div className="surface-subtle px-4 py-2 rounded-xl text-center">
            <div className="text-[10px] text-gray-400 mb-0.5">Estágio</div>
            <div className="text-sm font-bold text-gray-900">{override.stage ?? deal.stage}</div>
          </div>
          <div className="surface-subtle px-4 py-2 rounded-xl text-center">
            <div className="text-[10px] text-gray-400 mb-0.5">Envio</div>
            <div className="text-sm font-bold text-gray-900">{override.sendStatus ?? deal.sendStatus}</div>
          </div>
          <div className="surface-subtle px-4 py-2 rounded-xl text-center">
            <div className="text-[10px] text-gray-400 mb-0.5">Score</div>
            <div className="text-sm font-bold text-amber-600">{deal.dealScore.toFixed(1)}/10</div>
          </div>
          <div className="surface-subtle px-4 py-2 rounded-xl text-center">
            <div className="text-[10px] text-gray-400 mb-0.5">Notas</div>
            <div className="text-sm font-bold text-gray-900">{notes.length}</div>
          </div>
        </div>
      </div>

      {/* ── Respostas do Cliente ──────────────────────────────────────────── */}
      {clientRounds.length === 0 ? (
        <div className="card p-5 border border-dashed border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
              <Inbox size={16} className="text-gray-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-600">Nenhuma resposta do cliente ainda</div>
              <div className="text-xs text-gray-400 mt-0.5">
                Quando o cliente interagir com o{" "}
                <Link href={`/awq-venture/deals/${deal.id}/share`} className="text-amber-600 hover:underline">
                  preview da proposta
                </Link>
                , as rodadas de negociação aparecerão aqui.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Respostas do Cliente — {clientRounds.length} rodada{clientRounds.length > 1 ? "s" : ""}
            </div>
            <Link href={`/awq-venture/deals/${deal.id}/share`} className="flex items-center gap-1 text-[11px] text-amber-600 hover:text-amber-800">
              <ExternalLink size={11} /> Ver proposta do cliente
            </Link>
          </div>

          {clientRounds.map((round) => {
            const approved = round.sections.filter((s) => s.status === "approved").length;
            const counters = round.sections.filter((s) => s.status === "rejected" || s.status === "adjusted");
            const isOpen   = openRound === round.round;

            return (
              <div key={round.round} className={`card overflow-hidden border-2 ${
                round.finalDecision === "approved" ? "border-emerald-200" :
                round.finalDecision === "counter"  ? "border-amber-200"  : "border-gray-200"
              }`}>
                <button
                  onClick={() => setOpenRound(isOpen ? null : round.round)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      round.finalDecision === "approved" ? "bg-emerald-100" : "bg-amber-100"
                    }`}>
                      {round.finalDecision === "approved"
                        ? <Trophy size={14} className="text-emerald-600" />
                        : <RotateCcw size={14} className="text-amber-600" />
                      }
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">Rodada {round.round}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          round.finalDecision === "approved"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}>
                          {round.finalDecision === "approved" ? "Proposta Aprovada" : "Com Contrapropostas"}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        {round.respondedBy} · {new Date(round.submittedAt).toLocaleDateString("pt-BR")} ·{" "}
                        <span className="text-emerald-600 font-semibold">{approved} aprovadas</span>
                        {counters.length > 0 && (
                          <span className="text-amber-600 font-semibold"> · {counters.length} com ajuste/contraproposta</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {isOpen ? <ChevronDown size={14} className="text-gray-400 rotate-180" /> : <ChevronDown size={14} className="text-gray-400" />}
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {/* Per-section breakdown */}
                    <div className="px-5 py-4 space-y-2">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Avaliação por seção</div>
                      {round.sections.map((s, i) => {
                        const ui  = sectionStatusUi[s.status];
                        const SI  = ui.icon;
                        return (
                          <div key={s.id} className="space-y-1">
                            <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-gray-50">
                              <span className="text-xs text-gray-700">{sectionLabels[i] ?? s.id}</span>
                              <span className={`flex items-center gap-1 text-[11px] font-semibold ${ui.color}`}>
                                <SI size={11} /> {ui.label}
                              </span>
                            </div>
                            {s.counterText && (
                              <div className="ml-3 px-3 py-2 bg-amber-50 border border-amber-100 rounded-xl">
                                <div className="text-[10px] font-bold text-amber-600 mb-0.5">Mensagem do cliente:</div>
                                <p className="text-xs text-amber-800">{s.counterText}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Overall message */}
                    {round.overallMessage && (
                      <div className="px-5 py-4">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Mensagem geral</div>
                        <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2">{round.overallMessage}</p>
                      </div>
                    )}

                    {/* AWQ action buttons */}
                    <div className="px-5 py-4 bg-gray-50">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Ação AWQ</div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            setCategory("decisao");
                            setNewNote(`Rodada ${round.round} — ${round.finalDecision === "approved" ? "Proposta aprovada" : "Contraproposta recebida"}. Cliente: ${round.respondedBy}. Seções aprovadas: ${round.sections.filter(s => s.status === "approved").length}/${round.sections.length}.`);
                          }}
                          className="text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <CheckCircle2 size={11} /> Registrar aceite
                        </button>
                        <button
                          onClick={() => {
                            setCategory("contraproposta");
                            setNewNote(`Rodada ${round.round} — preparar nova contraproposta em resposta a: ${counters.map((_, i) => sectionLabels[round.sections.findIndex(s => s === _)] ?? "seção").join(", ")}.`);
                          }}
                          className="text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <RotateCcw size={11} /> Preparar nova rodada
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Adicionar nota */}
      <div className="card p-5 space-y-3">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nova Nota de Negociação</div>

        <div className="flex gap-2 flex-wrap">
          {(Object.keys(categoryConfig) as NoteCategory[]).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-colors ${
                category === c
                  ? `${categoryConfig[c].color} ${categoryConfig[c].bg} border-current`
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
              }`}
            >
              {categoryConfig[c].label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="Autor (opcional)"
            className="w-40 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400"
          />
        </div>

        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder={
            category === "contraproposta" ? "Descreva a contraproposta recebida ou sugerida…" :
            category === "ajuste" ? "Descreva o ajuste a ser feito na proposta…" :
            category === "decisao" ? "Registre a decisão tomada e quem aprovou…" :
            category === "alerta" ? "Descreva o alerta ou risco identificado nesta negociação…" :
            "Adicione uma observação interna sobre este deal…"
          }
          rows={4}
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400 resize-none"
        />

        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400">Nota interna — não visível ao cliente.</span>
          <button
            onClick={addNote}
            disabled={!newNote.trim()}
            className="flex items-center gap-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-40 px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={11} /> Adicionar Nota
          </button>
        </div>
      </div>

      {/* Feed de notas */}
      {notes.length === 0 ? (
        <div className="card p-8 text-center text-gray-400 text-sm">
          Nenhuma nota de negociação ainda. Adicione a primeira acima.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
            {notes.length} nota{notes.length !== 1 ? "s" : ""} registrada{notes.length !== 1 ? "s" : ""}
          </div>
          {[...notes].reverse().map((note: any) => {
            const cfg = categoryConfig[note.category as NoteCategory] ?? categoryConfig.observacao;
            return (
              <div key={note.id} className={`card p-4 border ${cfg.bg}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <User size={9} /> {note.author}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(note.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <button onClick={() => deleteNote(note.id)} className="text-gray-300 hover:text-red-400 transition-colors text-[10px] shrink-0">
                    remover
                  </button>
                </div>
                <p className="text-sm text-gray-700 mt-2 leading-relaxed">{note.text}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-center text-[10px] text-gray-300 pb-4">
        Notas salvas localmente · {deal.id} · Para persistência permanente, integrar com API
      </div>
    </div>
  );
}
