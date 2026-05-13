"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, GitBranch, Plus } from "lucide-react";
import type { DmsDocument, DmsDocumentVersion } from "@/lib/dms-db";

export default function VersionamentoPage() {
  const [docs, setDocs] = useState<DmsDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string>("");
  const [versions, setVersions] = useState<DmsDocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ version: 1, file_url: "", changed_by: "", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/dms/documents").then(r => r.json()).then(d => { setDocs(d.data ?? []); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!selectedDoc) { setVersions([]); return; }
    fetch(`/api/dms/documents?versions=true&document_id=${selectedDoc}`).then(r => r.json()).then(d => setVersions(d.data ?? []));
  }, [selectedDoc]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/dms/documents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, document_id: selectedDoc, _action: "version", file_url: form.file_url || null }) });
    const j = await r.json();
    setVersions(p => [j.data, ...p]);
    setForm({ version: 1, file_url: "", changed_by: "", notes: "" });
    setShow(false);
    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/dms" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Versionamento</h1>
              <p className="text-xs text-gray-500">DMS · Versionamento</p>
            </div>
          </div>
          {selectedDoc && (
            <button onClick={() => setShow(true)} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
              <Plus size={14} /> Nova Versão
            </button>
          )}
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-4">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Carregando...</div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Selecione um documento</label>
              <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" value={selectedDoc} onChange={e => setSelectedDoc(e.target.value)}>
                <option value="">— selecionar —</option>
                {docs.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>

            {selectedDoc && versions.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3 text-center">
                <GitBranch size={32} className="text-gray-200" />
                <p className="text-sm font-medium text-gray-500">Nenhuma versão registrada</p>
              </div>
            ) : selectedDoc ? (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {["Versão", "Notas", "Modificado por", "Data"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {versions.map(v => (
                      <tr key={v.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{v.version}</td>
                        <td className="px-4 py-3 text-gray-600">{v.notes}</td>
                        <td className="px-4 py-3 text-gray-600">{v.changed_by}</td>
                        <td className="px-4 py-3 text-gray-500">{v.created_at ? new Date(v.created_at).toLocaleDateString("pt-BR") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        )}
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-900">Nova Versão</h2>
            </div>
            <form onSubmit={onCreate} className="px-6 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Número da Versão</label>
                <input type="number" min={1} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.version} onChange={e => setForm(p => ({ ...p, version: Number(e.target.value) }))} required />
              </div>
              {[["Modificado por", "changed_by"], ["URL do Arquivo", "file_url"], ["Notas", "notes"]].map(([label, key]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                  <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form[key as keyof typeof form] as string} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} required={key === "changed_by"} />
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShow(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
