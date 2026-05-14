"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Plus, X, Loader2 } from "lucide-react";
import { getGrcClient } from "@/lib/grc-supabase";
import type { GrcControl, ControlType, ControlStatus } from "@/lib/grc-types";
import { CONTROL_TYPE_LABELS, CONTROL_STATUS_LABELS } from "@/lib/grc-types";

const EMPTY: Omit<GrcControl, "id" | "created_at" | "updated_at"> = {
  title: "",
  description: "",
  type: "preventive",
  status: "active",
  risk_id: null,
  owner: "",
};

const STATUS_COLORS: Record<ControlStatus, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-600",
  under_review: "bg-yellow-100 text-yellow-700",
};

export default function ControlesPage() {
  const [controls, setControls] = useState<GrcControl[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const db = getGrcClient();

  async function load() {
    setLoading(true);
    const { data, error } = await db
      .from("grc_controls")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setControls(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    setError(null);
    const { error } = await db.from("grc_controls").insert({
      title: form.title.trim(),
      description: form.description || null,
      type: form.type,
      status: form.status,
      risk_id: form.risk_id || null,
      owner: form.owner || null,
    });
    if (error) {
      setError(error.message);
    } else {
      setForm({ ...EMPTY });
      setShowForm(false);
      await load();
    }
    setSaving(false);
  }

  async function remove(id: string) {
    await db.from("grc_controls").delete().eq("id", id);
    setControls((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/grc" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Controles</h1>
              <p className="text-xs text-gray-500">GRC · Controles</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Plus size={14} /> Novo controle
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6">
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-900 text-sm">Novo controle</p>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                className="input col-span-full"
                placeholder="Título *"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <textarea
                className="input col-span-full resize-none"
                rows={3}
                placeholder="Descrição"
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <select
                className="input"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as ControlType })}
              >
                {(Object.keys(CONTROL_TYPE_LABELS) as ControlType[]).map((k) => (
                  <option key={k} value={k}>{CONTROL_TYPE_LABELS[k]}</option>
                ))}
              </select>
              <select
                className="input"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as ControlStatus })}
              >
                {(Object.keys(CONTROL_STATUS_LABELS) as ControlStatus[]).map((k) => (
                  <option key={k} value={k}>{CONTROL_STATUS_LABELS[k]}</option>
                ))}
              </select>
              <input
                className="input"
                placeholder="Responsável"
                value={form.owner ?? ""}
                onChange={(e) => setForm({ ...form, owner: e.target.value })}
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowForm(false)} className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button
                onClick={save}
                disabled={saving || !form.title.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Salvar
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="animate-spin text-gray-300" />
          </div>
        ) : controls.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <ShieldCheck size={32} className="text-gray-200" />
            <p className="text-sm font-medium text-gray-500">Nenhum controle cadastrado</p>
            <button onClick={() => setShowForm(true)} className="text-xs text-gray-400 hover:text-gray-600 underline">Adicionar primeiro controle</button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Título</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Responsável</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {controls.map((c) => (
                  <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.title}</td>
                    <td className="px-4 py-3 text-gray-600">{CONTROL_TYPE_LABELS[c.type]}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                        {CONTROL_STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{c.owner || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => remove(c.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
