"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import {
  CalendarDays,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  X,
  Loader2,
  ExternalLink,
  AlertCircle,
  BarChart3,
  GitMerge,
  ChevronRight,
} from "lucide-react";
import { SEED_IC_MEETINGS } from "@/lib/ma-seed-data";

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("pt-BR"); }
  catch { return d; }
}

function meetingTypeLabel(t: string) {
  if (t === "extraordinary") return "Extraordinária";
  if (t === "strategic")     return "Estratégica";
  return "Regular";
}

// ─── Decision Badge ───────────────────────────────────────────────────────────

function DecisionBadge({ decision }: { decision: string }) {
  const cfg: Record<string, { cls: string; label: string; icon: React.ElementType }> = {
    approved: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Aprovado",  icon: CheckCircle2 },
    rejected: { cls: "bg-red-50 text-red-700 border-red-200",             label: "Rejeitado", icon: XCircle      },
    deferred: { cls: "bg-amber-50 text-amber-700 border-amber-200",       label: "Adiado",    icon: Clock        },
    pending:  { cls: "bg-gray-100 text-gray-500 border-gray-200",         label: "Pendente",  icon: Clock        },
  };
  const c    = cfg[decision] ?? cfg.pending;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border ${c.cls}`}>
      <Icon size={9} />
      {c.label}
    </span>
  );
}

// ─── New Meeting Modal ────────────────────────────────────────────────────────

function NewMeetingModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm]       = useState({ meeting_date: "", attendees: "", meeting_type: "regular" });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.meeting_date) return setError("Data é obrigatória.");
    if (IS_STATIC) {
      setError("Modo somente-leitura no GitHub Pages. Use a versão Vercel para criar reuniões.");
      return;
    }
    setLoading(true);
    try {
      const res  = await fetch("/api/ma/ic", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "create_meeting", ...form, attendees: form.attendees.trim() || undefined }),
      });
      const json = await res.json();
      if (!json.success) setError(json.error ?? "Erro ao criar reunião");
      else { onCreated(); onClose(); }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center">
              <CalendarDays size={13} className="text-brand-600" />
            </div>
            <h2 className="text-sm font-bold text-gray-900">Nova Reunião de IC</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Data da Reunião <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 transition-all"
              value={form.meeting_date}
              onChange={(e) => setForm((p) => ({ ...p, meeting_date: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo de Reunião</label>
            <select
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 transition-all"
              value={form.meeting_type}
              onChange={(e) => setForm((p) => ({ ...p, meeting_type: e.target.value }))}
            >
              <option value="regular">Regular</option>
              <option value="extraordinary">Extraordinária</option>
              <option value="strategic">Estratégica</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Participantes</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 transition-all resize-none"
              placeholder="ex: CEO, CFO, Comitê de Investimentos"
              value={form.attendees}
              onChange={(e) => setForm((p) => ({ ...p, attendees: e.target.value }))}
            />
          </div>

          <div className="flex gap-2.5 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
            >
              {loading && <Loader2 size={12} className="animate-spin" />}
              {loading ? "Criando..." : "Criar Reunião"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IcPage() {
  const [meetings,  setMeetings]  = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    if (IS_STATIC) {
      setMeetings(SEED_IC_MEETINGS as any[]);
      setDecisions(SEED_IC_MEETINGS.flatMap(m => (m as any).decisions ?? []) as any[]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res  = await fetch("/api/ma/ic");
      const json = await res.json();
      if (json.success) {
        setMeetings(json.data?.meetings  ?? []);
        setDecisions(json.data?.decisions ?? []);
      } else {
        setError(json.error ?? "Erro ao carregar IC");
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const approved = decisions.filter((d) => d.decision === "approved").length;
  const rejected = decisions.filter((d) => d.decision === "rejected").length;
  const deferred = decisions.filter((d) => d.decision === "deferred").length;

  return (
    <>
      <Header title="Comitê de Investimentos" subtitle="IC · M&A · AWQ Group" />

      {showModal && (
        <NewMeetingModal
          onClose={() => setShowModal(false)}
          onCreated={load}
        />
      )}

      <div className="px-6 lg:px-8 py-5 space-y-5">

        {/* ── Top bar ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center">
              <GitMerge size={16} className="text-brand-600" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-900">Comitê de Investimentos</h2>
              <p className="text-xs text-gray-500">
                {loading ? "—" : meetings.length} reuniões · {decisions.length} decisões
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
          >
            <Plus size={13} />
            Nova Reunião
          </button>
        </div>

        {/* ── Summary cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Aprovados",  value: approved, textVal: "text-emerald-600", bg: "bg-emerald-50",  border: "border-l-emerald-500", icon: CheckCircle2 },
            { label: "Rejeitados", value: rejected, textVal: "text-red-600",     bg: "bg-red-50",      border: "border-l-red-500",     icon: XCircle      },
            { label: "Adiados",    value: deferred, textVal: "text-amber-600",   bg: "bg-amber-50",    border: "border-l-amber-500",   icon: Clock        },
          ].map(({ label, value, textVal, bg, border, icon: Icon }) => (
            <div key={label} className={`rounded-xl bg-white border border-gray-200 border-l-4 ${border} p-4 flex items-center gap-3 shadow-sm`}>
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon size={16} className={textVal} />
              </div>
              <div>
                <div className={`text-2xl font-bold ${textVal}`}>{loading ? "—" : value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Loading / Error ─────────────────────────────────────────────────── */}
        {loading && (
          <div className="flex items-center gap-2 justify-center py-12 text-gray-400 text-sm">
            <Loader2 size={16} className="animate-spin" />
            Carregando dados do IC...
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── Meetings List ───────────────────────────────────────────────── */}
            <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <CalendarDays size={13} className="text-brand-500" />
                  <h3 className="text-sm font-bold text-gray-800">Reuniões</h3>
                  <span className="text-xs font-bold bg-brand-50 text-brand-600 border border-brand-100 px-1.5 py-0.5 rounded-full">
                    {meetings.length}
                  </span>
                </div>
              </div>

              {meetings.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  Nenhuma reunião registrada.{" "}
                  <button onClick={() => setShowModal(true)} className="text-blue-600 font-semibold hover:underline">
                    Criar reunião
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {[...meetings]
                    .sort((a, b) => (b.meeting_date ?? "").localeCompare(a.meeting_date ?? ""))
                    .map((m: any, i: number) => (
                      <div key={m.meeting_id ?? i} className="px-5 py-3.5 flex items-center gap-4 hover:bg-blue-50/40 transition-colors group">
                        {/* Date block */}
                        <div className="w-24 shrink-0">
                          <div className="text-xs font-bold text-gray-900">{fmtDate(m.meeting_date)}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{meetingTypeLabel(m.meeting_type ?? "regular")}</div>
                        </div>

                        {/* Attendees */}
                        {m.attendees ? (
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <Users size={11} className="text-gray-400 shrink-0" />
                            <span className="text-xs text-gray-600 truncate">{m.attendees}</span>
                          </div>
                        ) : (
                          <div className="flex-1" />
                        )}

                        {/* Deals reviewed */}
                        {m.deals_reviewed_count != null && (
                          <div className="shrink-0 flex items-center gap-1 text-xs text-gray-400">
                            <BarChart3 size={11} />
                            {m.deals_reviewed_count} deal{m.deals_reviewed_count !== 1 ? "s" : ""}
                          </div>
                        )}

                        {/* Status */}
                        <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border ${
                          m.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          m.status === "scheduled" ? "bg-blue-50 text-blue-700 border-blue-200"         :
                          "bg-gray-100 text-gray-500 border-gray-200"
                        }`}>
                          {m.status === "completed" ? "Realizada" :
                           m.status === "scheduled"  ? "Agendada"  :
                           m.status ?? "—"}
                        </span>

                        {/* Minutes link */}
                        {m.minutes_url && (
                          <Link
                            href={m.minutes_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            Ata <ExternalLink size={10} />
                          </Link>
                        )}

                        <ChevronRight size={12} className="text-gray-300 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* ── Decisions Table ─────────────────────────────────────────────── */}
            <div className="rounded-xl bg-white border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100">
                <CheckCircle2 size={13} className="text-emerald-500" />
                <h3 className="text-sm font-bold text-gray-800">Decisões do IC</h3>
                <span className="text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 px-1.5 py-0.5 rounded-full">
                  {decisions.length}
                </span>
              </div>

              {decisions.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  Nenhuma decisão registrada.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {["Deal", "Decisão", "Votos", "Racional", "Data"].map((h) => (
                          <th key={h} className="py-2.5 px-4 text-left font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[...decisions]
                        .sort((a, b) => (b.decision_date ?? "").localeCompare(a.decision_date ?? ""))
                        .map((d: any, i: number) => (
                          <tr key={d.ic_decision_id ?? i} className="hover:bg-blue-50/40 transition-colors">
                            <td className="py-2.5 px-4">
                              <div className="font-bold text-gray-900">
                                {d.deal_name ?? d.company_name ?? d.deal_id ?? "—"}
                              </div>
                              {d.deal_id && (
                                <div className="text-xs text-gray-400 mt-0.5">{d.deal_id}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-4">
                              <DecisionBadge decision={d.decision ?? "pending"} />
                            </td>
                            <td className="py-2.5 px-4 text-gray-600">
                              {d.vote_result ?? "—"}
                            </td>
                            <td className="py-2.5 px-4 text-gray-500 max-w-[260px] truncate">
                              {d.rationale ?? "—"}
                            </td>
                            <td className="py-2.5 px-4 text-gray-400">
                              {fmtDate(d.decision_date)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </>
  );
}
