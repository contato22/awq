"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import { Film, Plus, CheckCircle2, Clock, Play, Package, ExternalLink } from "lucide-react";
import { SEED_PORTCOS, SEED_MEDIA_DELIVERABLES } from "@/lib/ma-seed-data";
import { formatBRL } from "@/lib/utils";

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";

interface Portco {
  portco_id: string;
  portco_code: string;
  legal_name: string;
  status: string;
  media_commitment_value?: number;
  media_delivered_value?: number;
}

interface MediaDeliverable {
  deliverable_id: string;
  portco_id: string;
  deliverable_type: string;
  description?: string;
  agreed_value?: number;
  executing_bu?: string;
  project_ref?: string;
  scheduled_delivery_date?: string;
  actual_delivery_date?: string;
  status: string;
  approved_by_portco: boolean;
  approval_date?: string;
  approval_notes?: string;
  deliverable_url?: string;
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("pt-BR");
}

const statusMeta: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  planned:      { label: "Planejado",    color: "text-gray-400 bg-gray-700",       icon: Clock },
  in_progress:  { label: "Em Andamento", color: "text-blue-400 bg-blue-500/10",    icon: Play },
  delivered:    { label: "Entregue",     color: "text-amber-400 bg-amber-500/10",  icon: Package },
  approved:     { label: "Aprovado",     color: "text-green-400 bg-green-500/10",  icon: CheckCircle2 },
};

const typeLabels: Record<string, string> = {
  social_media:     "Social Media",
  video_production: "Vídeo / Produção",
  branding:         "Branding",
  campaign:         "Campanha",
  event:            "Evento",
  other:            "Outro",
};

const buColors: Record<string, string> = {
  JACQES: "bg-blue-500/10 text-blue-400",
  CAZA:   "bg-purple-500/10 text-purple-400",
  STUDIO: "bg-amber-500/10 text-amber-400",
};

export default function MediaDeliverablesPage() {
  const [portcos, setPortcos] = useState<Portco[]>([]);
  const [selectedPortco, setSelectedPortco] = useState<string>("");
  const [deliverables, setDeliverables] = useState<MediaDeliverable[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    deliverable_type: "social_media", description: "",
    agreed_value: "", executing_bu: "JACQES", project_ref: "",
    scheduled_delivery_date: "", status: "planned",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPortco, setCurrentPortco] = useState<Portco | null>(null);

  useEffect(() => {
    if (IS_STATIC) {
      const active = SEED_PORTCOS.filter(p => p.status === "active") as Portco[];
      setPortcos(active);
      if (active.length > 0) { setSelectedPortco(active[0].portco_id); setCurrentPortco(active[0] as unknown as Portco); }
      return;
    }
    fetch("/api/ma/portfolio")
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          const active = (j.data as Portco[]).filter(p => p.status === "active");
          setPortcos(active);
          if (active.length > 0) { setSelectedPortco(active[0].portco_id); setCurrentPortco(active[0]); }
        }
      });
  }, []);

  const loadDeliverables = (id: string) => {
    if (!id) return;
    if (IS_STATIC) {
      setDeliverables(SEED_MEDIA_DELIVERABLES.filter(d => d.portco_id === id) as unknown as MediaDeliverable[]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/ma/media?portco_id=${id}`)
      .then(r => r.json())
      .then(j => { if (j.success) setDeliverables(j.data as unknown as MediaDeliverable[]); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDeliverables(selectedPortco);
    setCurrentPortco(portcos.find(p => p.portco_id === selectedPortco) ?? null);
  }, [selectedPortco, portcos]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/ma/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          portco_id: selectedPortco,
          ...form,
          agreed_value: form.agreed_value ? Number(form.agreed_value) : null,
        }),
      });
      const j = await r.json();
      if (j.success) { setShowForm(false); loadDeliverables(selectedPortco); }
      else setError(j.error);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (deliverable_id: string, updates: Partial<MediaDeliverable>) => {
    await fetch("/api/ma/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", deliverable_id, ...updates }),
    });
    loadDeliverables(selectedPortco);
  };

  const totalCommitted = deliverables.reduce((s, d) => s + (d.agreed_value ?? 0), 0);
  const totalApproved = deliverables.filter(d => d.approved_by_portco)
    .reduce((s, d) => s + (d.agreed_value ?? 0), 0);
  const deliveryPct = totalCommitted > 0 ? (totalApproved / totalCommitted) * 100 : 0;

  return (
    <>
      <Header title="Entregáveis de Mídia" subtitle="Tracking M4E — Media-for-Equity Deliverables" />
      <div className="px-6 py-6 space-y-6">

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
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
          >
            <Plus size={14} /> Novo Entregável
          </button>
        </div>

        {/* Progress overview */}
        {currentPortco && (
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Film size={16} className="text-purple-400" />
                Compromisso M4E — {currentPortco.legal_name}
              </h3>
              <span className="text-sm font-bold text-purple-400">{deliveryPct.toFixed(0)}% entregue</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">Comprometido</div>
                <div className="text-lg font-bold text-white">
                  {formatBRL(currentPortco.media_commitment_value ?? totalCommitted)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Aprovado / Entregue</div>
                <div className="text-lg font-bold text-green-400">{formatBRL(totalApproved)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Restante</div>
                <div className="text-lg font-bold text-orange-400">
                  {formatBRL((currentPortco.media_commitment_value ?? totalCommitted) - totalApproved)}
                </div>
              </div>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(deliveryPct, 100)}%` }} />
            </div>
          </div>
        )}

        {/* Add Form */}
        {showForm && (
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-5">
            <h3 className="font-medium text-white mb-4">Registrar Entregável</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Tipo *</label>
                  <select required value={form.deliverable_type}
                    onChange={e => setForm(f => ({ ...f, deliverable_type: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
                    {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">BU Executora</label>
                  <select value={form.executing_bu}
                    onChange={e => setForm(f => ({ ...f, executing_bu: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm">
                    {["JACQES", "CAZA", "STUDIO", "AWQ"].map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Valor Acordado (R$)</label>
                  <input type="number" value={form.agreed_value}
                    onChange={e => setForm(f => ({ ...f, agreed_value: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Previsão de Entrega</label>
                  <input type="date" value={form.scheduled_delivery_date}
                    onChange={e => setForm(f => ({ ...f, scheduled_delivery_date: e.target.value }))}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Descrição</label>
                <input value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                  placeholder="ex: Gestão de redes sociais — Maio 2026" />
              </div>
              {error && <div className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">{error}</div>}
              <div className="flex gap-3">
                <button type="submit" disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
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

        {loading && <div className="text-gray-400 text-sm">Carregando entregáveis...</div>}

        {/* Deliverables Table */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  {["Tipo", "Descrição", "BU", "Valor", "Entrega Prevista", "Status", "Aprovado", "Ação"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {deliverables.length === 0 && !loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500 text-sm">
                      Nenhum entregável registrado.
                    </td>
                  </tr>
                )}
                {deliverables.map(d => {
                  const meta = statusMeta[d.status] ?? statusMeta.planned;
                  const Icon = meta.icon;
                  return (
                    <tr key={d.deliverable_id} className="hover:bg-gray-700/30">
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-gray-300">{typeLabels[d.deliverable_type] ?? d.deliverable_type}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300 max-w-xs">
                        <div className="truncate">{d.description ?? "—"}</div>
                        {d.deliverable_url && (
                          <a href={d.deliverable_url} target="_blank" rel="noreferrer"
                            className="text-xs text-blue-400 hover:underline flex items-center gap-1 mt-0.5">
                            <ExternalLink size={10} /> Ver entregável
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {d.executing_bu && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${buColors[d.executing_bu] ?? "bg-gray-700 text-gray-400"}`}>
                            {d.executing_bu}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-white font-medium text-right">{formatBRL(d.agreed_value)}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{fmtDate(d.scheduled_delivery_date)}</td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full w-fit ${meta.color}`}>
                          <Icon size={10} />{meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {d.approved_by_portco
                          ? <CheckCircle2 size={16} className="text-green-400 mx-auto" />
                          : <span className="text-xs text-gray-600">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        {d.status !== "approved" && (
                          <div className="flex gap-1">
                            {d.status === "planned" && (
                              <button onClick={() => updateStatus(d.deliverable_id, { status: "in_progress" })}
                                className="text-xs text-blue-400 hover:underline">Iniciar</button>
                            )}
                            {d.status === "in_progress" && (
                              <button onClick={() => updateStatus(d.deliverable_id, {
                                status: "delivered", actual_delivery_date: new Date().toISOString().split("T")[0],
                              })}
                                className="text-xs text-amber-400 hover:underline">Entregar</button>
                            )}
                            {d.status === "delivered" && (
                              <button onClick={() => updateStatus(d.deliverable_id, {
                                status: "approved", approved_by_portco: true,
                                approval_date: new Date().toISOString().split("T")[0],
                              })}
                                className="text-xs text-green-400 hover:underline">Aprovar</button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}
