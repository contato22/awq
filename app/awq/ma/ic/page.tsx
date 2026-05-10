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
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return d;
  }
}

// ─── Decision Badge ───────────────────────────────────────────────────────────

function DecisionBadge({ decision }: { decision: string }) {
  const cfg: Record<string, { cls: string; label: string; icon: React.ElementType }> = {
    approved: { cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", label: "Aprovado",  icon: CheckCircle2 },
    rejected: { cls: "bg-red-500/20 text-red-300 border-red-500/30",             label: "Rejeitado", icon: XCircle      },
    deferred: { cls: "bg-amber-500/20 text-amber-300 border-amber-500/30",       label: "Adiado",    icon: Clock        },
    pending:  { cls: "bg-gray-500/20 text-gray-400 border-gray-500/30",          label: "Pendente",  icon: Clock        },
  };
  const c    = cfg[decision] ?? cfg.pending;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.cls}`}>
      <Icon size={9} />
      {c.label}
    </span>
  );
}

// ─── New Meeting Modal ────────────────────────────────────────────────────────

function NewMeetingModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm]     = useState({ meeting_date: "", attendees: "", meeting_type: "regular" });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.meeting_date) return setError("Data é obrigatória.");
    setLoading(true);
    try {
      const res  = await fetch("/api/ma/ic", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          action:       "create_meeting",
          meeting_date: form.meeting_date,
          attendees:    form.attendees.trim() || undefined,
          meeting_type: form.meeting_type,
        }),
      });
      const json = await res.json();
      if (!json.success) setError(json.error ?? "Erro ao criar reunião");
      else { onCreated(); onClose(); }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-xl bg-gray-800 border border-gray-600 shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-sm font-bold text-white">Nova Reunião de IC</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
              <AlertCircle size={13} />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">
              Data da Reunião <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              value={form.meeting_date}
              onChange={(e) => setForm((p) => ({ ...p, meeting_date: e.target.value }))}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Tipo de Reunião</label>
            <select
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              value={form.meeting_type}
              onChange={(e) => setForm((p) => ({ ...p, meeting_type: e.target.value }))}
            >
              <option value="regular">Regular</option>
              <option value="extraordinary">Extraordinária</option>
              <option value="strategic">Estratégica</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Participantes</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-colors resize-none"
              placeholder="ex: CEO, CFO, Comitê de Investimentos"
              value={form.attendees}
              onChange={(e) => setForm((p) => ({ ...p, attendees: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-600 text-xs text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
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
  const [meetings,   setMeetings]   = useState<any[]>([]);
  const [decisions,  setDecisions]  = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [showModal,  setShowModal]  = useState(false);

  async function load() {
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

      <div className="px-6 lg:px-8 py-6 space-y-6">

        {/* ── Title row ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Comitê de Investimentos</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {meetings.length} reuniões · {decisions.length} decisões
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Plus size={13} />
            Nova Reunião
          </button>
        </div>

        {/* ── Summary cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Aprovados",  value: approved, color: "text-emerald-400", bg: "bg-emerald-500/10", icon: CheckCircle2 },
            { label: "Rejeitados", value: rejected, color: "text-red-400",     bg: "bg-red-500/10",     icon: XCircle     },
            { label: "Adiados",    value: deferred, color: "text-amber-400",   bg: "bg-amber-500/10",   icon: Clock       },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} className="rounded-lg bg-gray-800/50 border border-gray-700 p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon size={16} className={color} />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {loading && (
          <div className="flex items-center gap-2 justify-center py-12 text-gray-400 text-sm">
            <Loader2 size={16} className="animate-spin" />
            Carregando dados do IC...
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── Meetings List ──────────────────────────────────────────────── */}
            <div className="rounded-lg bg-gray-800/50 border border-gray-700 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700">
                <CalendarDays size={13} className="text-purple-400" />
                <h3 className="text-sm font-semibold text-white">Reuniões</h3>
              </div>

              {meetings.length === 0 ? (
                <div className="text-center py-10 text-gray-600 text-sm">
                  Nenhuma reunião registrada.{" "}
                  <button onClick={() => setShowModal(true)} className="text-blue-400 underline">
                    Criar reunião
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-700/50">
                  {[...meetings]
                    .sort((a, b) => (b.meeting_date ?? "").localeCompare(a.meeting_date ?? ""))
                    .map((m: any, i: number) => (
                      <div key={m.meeting_id ?? i} className="px-4 py-3 flex items-start gap-4 hover:bg-gray-700/20 transition-colors">
                        {/* Date */}
                        <div className="w-20 shrink-0">
                          <div className="text-xs font-semibold text-white">{fmtDate(m.meeting_date)}</div>
                          <div className="text-[10px] text-gray-600 mt-0.5">
                            {m.meeting_type === "extraordinary" ? "Extraordinária" :
                             m.meeting_type === "strategic"     ? "Estratégica"    :
                             "Regular"}
                          </div>
                        </div>

                        {/* Attendees */}
                        {m.attendees && (
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <Users size={11} className="text-gray-600 shrink-0" />
                            <span className="text-xs text-gray-400 truncate">{m.attendees}</span>
                          </div>
                        )}

                        {/* Deals count */}
                        {m.deals_reviewed_count != null && (
                          <div className="shrink-0 flex items-center gap-1 text-xs text-gray-500">
                            <BarChart3 size={11} />
                            {m.deals_reviewed_count} deal{m.deals_reviewed_count !== 1 ? "s" : ""}
                          </div>
                        )}

                        {/* Status badge */}
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          m.status === "completed"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                            : m.status === "scheduled"
                            ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                            : "bg-gray-500/20 text-gray-400 border-gray-500/30"
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
                            className="shrink-0 inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            Ata <ExternalLink size={10} />
                          </Link>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* ── Decisions Table ────────────────────────────────────────────── */}
            <div className="rounded-lg bg-gray-800/50 border border-gray-700 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-700">
                <CheckCircle2 size={13} className="text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Decisões do IC</h3>
              </div>

              {decisions.length === 0 ? (
                <div className="text-center py-10 text-gray-600 text-sm">
                  Nenhuma decisão registrada.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-700 text-gray-500">
                        {["Deal","Decisão","Votos","Racional","Data"].map((h) => (
                          <th key={h} className="py-2.5 px-4 text-left font-semibold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                      {[...decisions]
                        .sort((a, b) => (b.decision_date ?? "").localeCompare(a.decision_date ?? ""))
                        .map((d: any, i: number) => (
                          <tr key={d.ic_decision_id ?? i} className="hover:bg-gray-700/20">
                            <td className="py-2.5 px-4">
                              <div className="font-semibold text-white">
                                {d.deal_name ?? d.company_name ?? d.deal_id ?? "—"}
                              </div>
                              {d.deal_id && (
                                <div className="text-[10px] text-gray-600">{d.deal_id}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-4">
                              <DecisionBadge decision={d.decision ?? "pending"} />
                            </td>
                            <td className="py-2.5 px-4 text-gray-400">
                              {d.vote_result ?? "—"}
                            </td>
                            <td className="py-2.5 px-4 text-gray-400 max-w-[260px] truncate">
                              {d.rationale ?? "—"}
                            </td>
                            <td className="py-2.5 px-4 text-gray-500">
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
