"use client";

import { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDealById } from "@/lib/deal-data";
import {
  ArrowLeft, MessageSquare, Send, Settings, Clock,
  AlertTriangle, CheckCircle2, User, ChevronDown, Plus,
  FileText, TrendingUp, Eye,
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
  const deal = getDealById(params.id);
  if (!deal) notFound();

  const [override, setOverride] = useState<DealOverride>({});
  const [newNote, setNewNote]   = useState("");
  const [category, setCategory] = useState<NoteCategory>("observacao");
  const [author, setAuthor]     = useState("");

  useEffect(() => { setOverride(loadOverride(deal.id)); }, [deal.id]);

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
