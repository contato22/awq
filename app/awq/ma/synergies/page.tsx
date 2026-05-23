"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { Network, Plus, TrendingUp, DollarSign, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { SEED_SYNERGIES } from "@/lib/ma-seed-data";

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";

interface Synergy {
  synergy_id: string;
  synergy_type?: string;
  opportunity_name?: string;
  description?: string;
  source_bu?: string;
  target_bu?: string;
  portco_id?: string;
  estimated_revenue_impact?: number;
  estimated_cost_savings?: number;
  status: string;
  identified_date?: string;
  realization_date?: string;
  actual_revenue_impact?: number;
  actual_cost_savings?: number;
  owner?: string;
  notes?: string;
}

function fmtR(n?: number | null) {
  if (n == null) return "—";
  if (Math.abs(n) >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

const statusMeta: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  identified:  { label: "Identificada",   color: "text-blue-400 bg-blue-500/10",   icon: Clock },
  in_progress: { label: "Em Andamento",   color: "text-amber-400 bg-amber-500/10", icon: TrendingUp },
  realized:    { label: "Realizada",      color: "text-green-400 bg-green-500/10", icon: CheckCircle2 },
  abandoned:   { label: "Abandonada",     color: "text-gray-400 bg-gray-700",      icon: AlertTriangle },
};

const typeLabels: Record<string, string> = {
  cross_selling:      "Cross-Selling",
  shared_resource:    "Recurso Compartilhado",
  knowledge_sharing:  "Troca de Conhecimento",
  cost_reduction:     "Redução de Custo",
};

const buColors: Record<string, string> = {
  JACQES:  "bg-blue-500/10 text-blue-400",
  CAZA:    "bg-brand-500/10 text-brand-400",
  ADVISOR: "bg-green-500/10 text-green-400",
  STUDIO:  "bg-amber-500/10 text-amber-400",
  VENTURE: "bg-orange-500/10 text-orange-400",
};

export default function SynergiesPage() {
  const [synergies, setSynergies] = useState<Synergy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    synergy_type: "cross_selling", opportunity_name: "",
    description: "", source_bu: "JACQES", target_bu: "",
    estimated_revenue_impact: "", estimated_cost_savings: "",
    status: "identified", owner: "Miguel",
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (IS_STATIC) {
      setSynergies(SEED_SYNERGIES as unknown as Synergy[]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/ma/synergies");
      const j = await r.json();
      if (j.success) setSynergies(j.data as unknown as Synergy[]);
      else setError(j.error);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch("/api/ma/synergies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          ...form,
          estimated_revenue_impact: form.estimated_revenue_impact ? Number(form.estimated_revenue_impact) : null,
          estimated_cost_savings: form.estimated_cost_savings ? Number(form.estimated_cost_savings) : null,
        }),
      });
      const j = await r.json();
      if (j.success) { setShowForm(false); load(); }
      else setError(j.error);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const totalEstimated = synergies.reduce((s, x) =>
    s + (x.estimated_revenue_impact ?? 0) + (x.estimated_cost_savings ?? 0), 0);
  const totalRealized = synergies.filter(s => s.status === "realized")
    .reduce((s, x) => s + (x.actual_revenue_impact ?? 0) + (x.actual_cost_savings ?? 0), 0);

  return (
    <>
      <Header title="Sinergias" subtitle="Cross-BU & Value Creation Tracking" />
      <div className="px-6 py-6 space-y-6">

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Sinergias", value: String(synergies.length), color: "text-white" },
            { label: "Em Andamento", value: String(synergies.filter(s => s.status === "in_progress").length), color: "text-amber-400" },
            { label: "Valor Estimado", value: fmtR(totalEstimated), color: "text-blue-400" },
            { label: "Valor Realizado", value: fmtR(totalRealized), color: "text-green-400" },
          ].map(c => (
            <div key={c.label} className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
              <div className="text-xs text-gray-500 mb-1">{c.label}</div>
              <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="flex justify-between items-center">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Network size={16} className="text-blue-400" />
            Oportunidades de Sinergia
          </h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <Plus size={14} />
            Nova Sinergia
          </button>
        </div>

        {/* Add Form */}
        {showForm && (
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-5">
            <h3 className="font-medium text-white mb-4">Nova Oportunidade de Sinergia</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Nome *</label>
                  <input required value={form.opportunity_name}
                    onChange={e => setForm(f => ({ ...f, opportunity_name: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                    placeholder="ex: JACQES × Enerdy Social Media" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Tipo</label>
                  <select value={form.synergy_type}
                    onChange={e => setForm(f => ({ ...f, synergy_type: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
                    {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">BU Origem</label>
                  <select value={form.source_bu}
                    onChange={e => setForm(f => ({ ...f, source_bu: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
                    {["JACQES", "CAZA", "ADVISOR", "STUDIO", "VENTURE", "AWQ"].map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">BU Destino</label>
                  <input value={form.target_bu}
                    onChange={e => setForm(f => ({ ...f, target_bu: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                    placeholder="ex: CAZA" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Impacto Receita Estimado (R$)</label>
                  <input type="number" value={form.estimated_revenue_impact}
                    onChange={e => setForm(f => ({ ...f, estimated_revenue_impact: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Economia de Custo Estimada (R$)</label>
                  <input type="number" value={form.estimated_cost_savings}
                    onChange={e => setForm(f => ({ ...f, estimated_cost_savings: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Descrição</label>
                <textarea value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm resize-none" />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={saving}
                  className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                  {saving ? "Salvando..." : "Salvar"}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded-lg text-sm">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {error && <div className="text-red-400 text-sm bg-red-500/10 rounded-lg px-4 py-3">{error}</div>}
        {loading && <div className="text-gray-400 text-sm">Carregando sinergias...</div>}

        {/* Synergy Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {synergies.map(s => {
            const meta = statusMeta[s.status] ?? statusMeta.identified;
            const Icon = meta.icon;
            return (
              <div key={s.synergy_id} className="bg-gray-800/50 rounded-xl border border-gray-700 p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-medium text-white">{s.opportunity_name ?? "—"}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{typeLabels[s.synergy_type ?? ""] ?? s.synergy_type}</div>
                  </div>
                  <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${meta.color}`}>
                    <Icon size={10} />{meta.label}
                  </span>
                </div>

                {s.description && <p className="text-xs text-gray-400 leading-relaxed">{s.description}</p>}

                <div className="flex gap-2 flex-wrap">
                  {s.source_bu && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${buColors[s.source_bu] ?? "bg-gray-700 text-gray-400"}`}>
                      {s.source_bu}
                    </span>
                  )}
                  {s.target_bu && (
                    <>
                      <span className="text-xs text-gray-600">→</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${buColors[s.target_bu] ?? "bg-gray-700 text-gray-400"}`}>
                        {s.target_bu}
                      </span>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-700">
                  <div>
                    <div className="text-xs text-gray-600">Impacto Receita Est.</div>
                    <div className="text-sm font-semibold text-blue-400">{fmtR(s.estimated_revenue_impact)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600">Economia Estimada</div>
                    <div className="text-sm font-semibold text-green-400">{fmtR(s.estimated_cost_savings)}</div>
                  </div>
                  {s.status === "realized" && (
                    <>
                      <div>
                        <div className="text-xs text-gray-600">Receita Realizada</div>
                        <div className="text-sm font-semibold text-emerald-400">{fmtR(s.actual_revenue_impact)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">Realização</div>
                        <div className="text-xs text-gray-400">{fmtDate(s.realization_date)}</div>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-between text-xs text-gray-500">
                  <span>Owner: {s.owner ?? "—"}</span>
                  <span>Identificada: {fmtDate(s.identified_date)}</span>
                </div>
              </div>
            );
          })}
          {!loading && synergies.length === 0 && (
            <div className="col-span-2 text-center py-12 text-gray-500">
              Nenhuma sinergia registrada. Clique em &ldquo;Nova Sinergia&rdquo; para começar.
            </div>
          )}
        </div>

      </div>
    </>
  );
}
