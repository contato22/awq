"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { Users, Calendar, Plus, CheckCircle2, Clock, XCircle, ExternalLink } from "lucide-react";
import { SEED_PORTCOS, SEED_BOARD_MEETINGS } from "@/lib/ma-seed-data";

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";

interface Portco {
  portco_id: string;
  portco_code: string;
  legal_name: string;
  status: string;
}

interface BoardMeeting {
  meeting_id: string;
  portco_id: string;
  meeting_date: string;
  meeting_type: string;
  agenda?: string;
  board_deck_url?: string;
  attendees?: string[];
  awq_representative?: string;
  minutes_url?: string;
  resolutions?: Array<{ resolution: string; vote: string }>;
  action_items?: Array<{ item: string; owner: string; due: string }>;
  status: string;
  notes?: string;
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

const statusMeta: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  scheduled:  { label: "Agendada",   color: "text-blue-400 bg-blue-500/10",   icon: Clock },
  completed:  { label: "Realizada",  color: "text-green-400 bg-green-500/10", icon: CheckCircle2 },
  cancelled:  { label: "Cancelada",  color: "text-red-400 bg-red-500/10",     icon: XCircle },
};

export default function BoardMeetingsPage() {
  const [portcos, setPortcos] = useState<Portco[]>([]);
  const [selectedPortco, setSelectedPortco] = useState<string>("");
  const [meetings, setMeetings] = useState<BoardMeeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    meeting_date: "", meeting_type: "regular", agenda: "",
    awq_representative: "Miguel (AWQ)", board_deck_url: "", minutes_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (IS_STATIC) {
      const active = SEED_PORTCOS.filter(p => p.status === "active") as Portco[];
      setPortcos(active);
      if (active.length > 0) setSelectedPortco(active[0].portco_id);
      return;
    }
    fetch("/api/ma/portfolio")
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          const active = (j.data as Portco[]).filter(p => p.status === "active");
          setPortcos(active);
          if (active.length > 0) setSelectedPortco(active[0].portco_id);
        }
      });
  }, []);

  const loadMeetings = (id: string) => {
    if (!id) return;
    if (IS_STATIC) {
      setMeetings(SEED_BOARD_MEETINGS.filter(m => m.portco_id === id) as unknown as BoardMeeting[]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/ma/board?portco_id=${id}`)
      .then(r => r.json())
      .then(j => { if (j.success) setMeetings(j.data as unknown as BoardMeeting[]); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadMeetings(selectedPortco); }, [selectedPortco]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/ma/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", portco_id: selectedPortco, ...form }),
      });
      const j = await r.json();
      if (j.success) { setShowForm(false); loadMeetings(selectedPortco); }
      else setError(j.error);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header title="Board Meetings" subtitle="Reuniões de Conselho — Portfolio Companies" />
      <div className="px-6 py-6 space-y-6">

        {/* Portco selector + Add button */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-400">Empresa:</label>
            <select
              value={selectedPortco}
              onChange={e => setSelectedPortco(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
            >
              {portcos.map(p => (
                <option key={p.portco_id} value={p.portco_id}>{p.legal_name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm"
          >
            <Plus size={14} /> Nova Reunião
          </button>
        </div>

        {/* Add Form */}
        {showForm && (
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-5">
            <h3 className="font-medium text-white mb-4">Registrar Board Meeting</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Data *</label>
                  <input required type="date" value={form.meeting_date}
                    onChange={e => setForm(f => ({ ...f, meeting_date: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Tipo</label>
                  <select value={form.meeting_type}
                    onChange={e => setForm(f => ({ ...f, meeting_type: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
                    <option value="regular">Regular</option>
                    <option value="special">Especial</option>
                    <option value="annual">Assembleia Anual</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Representante AWQ</label>
                  <input value={form.awq_representative}
                    onChange={e => setForm(f => ({ ...f, awq_representative: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Pauta</label>
                <textarea value={form.agenda} rows={2}
                  onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm resize-none" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Link Board Deck</label>
                  <input type="url" value={form.board_deck_url}
                    onChange={e => setForm(f => ({ ...f, board_deck_url: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                    placeholder="https://docs.google.com/..." />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Link Ata</label>
                  <input type="url" value={form.minutes_url}
                    onChange={e => setForm(f => ({ ...f, minutes_url: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                    placeholder="https://docs.google.com/..." />
                </div>
              </div>
              {error && <div className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">{error}</div>}
              <div className="flex gap-3">
                <button type="submit" disabled={saving}
                  className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                  {saving ? "Salvando..." : "Salvar"}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total", count: meetings.length, color: "text-white" },
            { label: "Realizadas", count: meetings.filter(m => m.status === "completed").length, color: "text-green-400" },
            { label: "Agendadas", count: meetings.filter(m => m.status === "scheduled").length, color: "text-blue-400" },
          ].map(s => (
            <div key={s.label} className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {loading && <div className="text-gray-400 text-sm">Carregando reuniões...</div>}

        {/* Meetings list */}
        <div className="space-y-4">
          {meetings.map(m => {
            const meta = statusMeta[m.status] ?? statusMeta.scheduled;
            const Icon = meta.icon;
            return (
              <div key={m.meeting_id} className="bg-gray-800/50 rounded-xl border border-gray-700 p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Calendar size={16} className="text-blue-400" />
                    </div>
                    <div>
                      <div className="font-medium text-white">{fmtDate(m.meeting_date)}</div>
                      <div className="text-xs text-gray-500 capitalize">{m.meeting_type === "regular" ? "Reunião Regular" : m.meeting_type}</div>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${meta.color}`}>
                    <Icon size={10} />{meta.label}
                  </span>
                </div>

                {m.agenda && (
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Pauta</div>
                    <p className="text-sm text-gray-300">{m.agenda}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                  {m.awq_representative && <span className="flex items-center gap-1"><Users size={10} /> {m.awq_representative}</span>}
                  {m.attendees && m.attendees.length > 0 && (
                    <span>{m.attendees.length} participantes</span>
                  )}
                </div>

                <div className="flex gap-3 flex-wrap">
                  {m.board_deck_url && (
                    <a href={m.board_deck_url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-400 hover:underline">
                      <ExternalLink size={11} /> Board Deck
                    </a>
                  )}
                  {m.minutes_url && (
                    <a href={m.minutes_url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-xs text-green-400 hover:underline">
                      <ExternalLink size={11} /> Ata
                    </a>
                  )}
                </div>

                {m.action_items && m.action_items.length > 0 && (
                  <div>
                    <div className="text-xs text-gray-500 mb-2">Action Items ({m.action_items.length})</div>
                    <div className="space-y-1">
                      {m.action_items.map((ai, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                          <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                          <span>{ai.item}</span>
                          <span className="text-gray-600">→ {ai.owner}</span>
                          <span className="text-gray-600">até {ai.due}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {!loading && meetings.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Nenhuma board meeting registrada para esta empresa.
            </div>
          )}
        </div>

      </div>
    </>
  );
}
