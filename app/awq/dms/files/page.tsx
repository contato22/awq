"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import type { DMSDocument } from "@/lib/dms-db";

const STATUS_BADGE: Record<string, string> = {
  "Rascunho":   "bg-gray-100 text-gray-600",
  "Em Revisão": "bg-amber-100 text-amber-700",
  "Aprovado":   "bg-emerald-100 text-emerald-700",
  "Obsoleto":   "bg-red-100 text-red-700",
  "Arquivado":  "bg-blue-100 text-blue-700",
};

function formatSize(size_kb: number) {
  if (size_kb >= 1024) return `${(size_kb / 1024).toFixed(1)} MB`;
  return `${size_kb} KB`;
}

export default function ArquivosPage() {
  const [items, setItems] = useState<DMSDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/awq/dms/documents")
      .then(r => r.json())
      .then(j => { if (j.success) setItems(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.owner.toLowerCase().includes(search.toLowerCase())
  );

  const total      = items.length;
  const aprovados  = items.filter(d => d.status === "Aprovado").length;
  const emRevisao  = items.filter(d => d.status === "Em Revisão").length;
  const obsoletos  = items.filter(d => d.status === "Obsoleto").length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq/dms" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <FileText size={20} className="text-gray-400" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Arquivos</h1>
            <p className="text-xs text-gray-500">DMS · Gestão de Documentos</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 text-center py-16">Carregando…</div>
      ) : (
        <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{total}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Aprovados</p>
              <p className="text-2xl font-bold text-emerald-600">{aprovados}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Em Revisão</p>
              <p className="text-2xl font-bold text-amber-600">{emRevisao}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Obsoletos</p>
              <p className="text-2xl font-bold text-red-500">{obsoletos}</p>
            </div>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Buscar por título ou responsável…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Título</th>
                  <th className="text-left px-4 py-3">Categoria</th>
                  <th className="text-left px-4 py-3">Versão</th>
                  <th className="text-left px-4 py-3">Responsável</th>
                  <th className="text-left px-4 py-3">Tamanho</th>
                  <th className="text-left px-4 py-3">Atualizado</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                      Nenhum registro encontrado
                    </td>
                  </tr>
                ) : (
                  filtered.map(doc => (
                    <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{doc.title}</td>
                      <td className="px-4 py-3 text-gray-600">{doc.category}</td>
                      <td className="px-4 py-3 text-gray-600">{doc.version}</td>
                      <td className="px-4 py-3 text-gray-600">{doc.owner}</td>
                      <td className="px-4 py-3 text-gray-600">{formatSize(doc.size_kb)}</td>
                      <td className="px-4 py-3 text-gray-600">{doc.updated_at.split("T")[0]}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[doc.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {doc.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
