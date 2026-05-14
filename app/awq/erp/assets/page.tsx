"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Search, Layers, X, Loader2 } from "lucide-react";

const STATUS_BADGE: Record<string, string> = {
  Ativo:           "bg-emerald-100 text-emerald-700",
  "Em Manutenção": "bg-amber-100 text-amber-700",
  Baixado:         "bg-gray-100 text-gray-500",
};

const CATEGORIES = ["Equipamento", "Móvel", "Veículo", "Software", "Imóvel", "Outro"];

type Asset = {
  id: string;
  code: string;
  description: string;
  category: string;
  location: string | null;
  acquisition_value: number;
  acquisition_date: string | null;
  status: string;
};

const INPUT = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white";

export default function AssetsPage() {
  const [assets, setAssets]     = useState<Asset[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm] = useState({
    code: "", description: "", category: "Equipamento",
    location: "", acquisition_value: "", acquisition_date: "", status: "Ativo",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const qs = search ? `?q=${encodeURIComponent(search)}` : "";
    const res = await fetch(`/api/erp/assets${qs}`);
    if (!res.ok) { setError("Erro ao carregar assets"); setLoading(false); return; }
    setAssets(await res.json());
    setLoading(false);
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/erp/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        acquisition_value: parseFloat(form.acquisition_value) || 0,
        acquisition_date: form.acquisition_date || null,
        location: form.location || null,
      }),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ code: "", description: "", category: "Equipamento", location: "", acquisition_value: "", acquisition_date: "", status: "Ativo" });
      load();
    } else {
      const { error: err } = await res.json();
      setError(err ?? "Erro ao salvar");
    }
    setSaving(false);
  };

  const total      = assets.length;
  const ativos     = assets.filter(a => a.status === "Ativo").length;
  const manutencao = assets.filter(a => a.status === "Em Manutenção").length;
  const valorTotal = assets.reduce((s, a) => s + (a.acquisition_value ?? 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Gestão de Assets</h1>
              <p className="text-xs text-gray-500">ERP · Ativo Fixo</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors shadow-sm"
          >
            <Plus size={14} /> Novo Asset
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>}

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Assets",  value: loading ? "…" : String(total),                          color: "text-gray-900"    },
            { label: "Assets Ativos", value: loading ? "…" : String(ativos),                         color: "text-emerald-600" },
            { label: "Em Manutenção", value: loading ? "…" : String(manutencao),                     color: "text-amber-600"   },
            { label: "Valor Total",   value: loading ? "…" : `R$ ${valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`, color: "text-brand-600" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 max-w-sm shadow-sm">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar asset ou código…"
            className="flex-1 text-sm focus:outline-none bg-transparent"
          />
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {["Código", "Descrição", "Categoria", "Localização", "Valor Aquisição", "Data Aquisição", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-16 text-center"><Loader2 size={24} className="animate-spin text-gray-300 mx-auto" /></td></tr>
                ) : assets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <Layers size={32} className="text-gray-200" />
                        <p className="text-sm font-medium text-gray-500">Nenhum asset cadastrado</p>
                        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition-colors">
                          <Plus size={14} /> Novo Asset
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  assets.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">{a.code}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{a.description}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{a.category}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{a.location ?? "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 tabular-nums">
                        {a.acquisition_value != null
                          ? `R$ ${Number(a.acquisition_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {a.acquisition_date ? new Date(a.acquisition_date).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[a.status] ?? "bg-gray-100 text-gray-500"}`}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New Asset Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Novo Asset</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={submit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Código *</label>
                  <input required value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="ATI-0001" className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Categoria *</label>
                  <select required value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={INPUT}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Descrição *</label>
                <input required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Notebook Dell XPS 15" className={INPUT} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Localização</label>
                  <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Sala 3 / Rack B" className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={INPUT}>
                    {Object.keys(STATUS_BADGE).map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Valor de Aquisição (R$)</label>
                  <input type="number" step="0.01" min="0" value={form.acquisition_value} onChange={e => setForm(f => ({ ...f, acquisition_value: e.target.value }))} placeholder="0,00" className={INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Data de Aquisição</label>
                  <input type="date" value={form.acquisition_date} onChange={e => setForm(f => ({ ...f, acquisition_date: e.target.value }))} className={INPUT} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancelar</button>
                <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50">
                  {saving && <Loader2 size={13} className="animate-spin" />} Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
