"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardList, Plus, X, Loader2 } from "lucide-react";
import { getGrcClient } from "@/lib/grc-supabase";
import type { GrcAudit, AuditStatus } from "@/lib/grc-types";
import { AUDIT_STATUS_LABELS } from "@/lib/grc-types";

const EMPTY: Omit<GrcAudit, "id" | "created_at" | "updated_at"> = {
  title: "",
  description: "",
  status: "planned",
  audit_date: "",
  auditor: "",
  findings: "",
};

const STATUS_COLORS: Record<AuditStatus, string> = {
  planned: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function AuditoriasPage() {
  const [audits, setAudits] = useState<GrcAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const db = getGrcClient();

  async function load() {
    setLoading(true);
    const { data, error } = await db
      .from("grc_audits")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setAudits(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    if (!form.title.trim()) return;
    setSaving(true);
    setError(null);
    const { error } = await db.from("grc_audits").insert({
      title: form.title.trim(),
      description: form.description || null,
      status: form.status,
      audit_date: form.audit_date || null,
      auditor: form.auditor || null,
      findings: form.findings || null,
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
    await db.from("grc_audits").delete().eq("id", id);
    setAudits((prev) => prev.filter((a) => a.id !== id));
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
              <h1 className="text-lg font-bold text-gray-900">Auditorias</h1>
              <p className="text-xs text-gray-500">GRC · Auditorias</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Plus size={14} /> Nova auditoria
          </button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6">
        {showForm && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-900 text-sm">Nova auditoria</p>
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
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as AuditStatus })}
              >
                {(Object.keys(AUDIT_STATUS_LABELS) as AuditStatus[]).map((k) => (
                  <option key={k} value={k}>{AUDIT_STATUS_LABELS[k]}</option>
                ))}
              </select>
              <input
                type="date"
                className="input"
                value={form.audit_date ?? ""}
                onChange={(e) => setForm({ ...form, audit_date: e.target.value })}
              />
              <input
                className="input"
                placeholder="Auditor"
                value={form.auditor ?? ""}
                onChange={(e) => setForm({ ...form, auditor: e.target.value })}
              />
              <textarea
                className="input col-span-full resize-none"
                rows={2}
                placeholder="Achados / Observações"
                value={form.findings ?? ""}
                onChange={(e) => setForm({ ...form, findings: e.target.value })}
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
        ) : audits.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <ClipboardList size={32} className="text-gray-200" />
            <p className="text-sm font-medium text-gray-500">Nenhuma auditoria cadastrada</p>
            <button onClick={() => setShowForm(true)} className="text-xs text-gray-400 hover:text-gray-600 underline">Adicionar primeira auditoria</button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Título</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Data</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Auditor</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Achados</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {audits.map((a) => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{a.title}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[a.status]}`}>
                        {AUDIT_STATUS_LABELS[a.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {a.audit_date ? new Date(a.audit_date).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{a.auditor || "—"}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{a.findings || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => remove(a.id)}
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
