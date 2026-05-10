"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import type { DMSDocument } from "@/lib/dms-db";

const STATUS_BADGE: Record<string, string> = {
  "Rascunho":   "bg-gray-100 text-gray-600",
  "Em Revisão": "bg-amber-100 text-amber-700",
  "Aprovado":   "bg-emerald-100 text-emerald-700",
  "Obsoleto":   "bg-red-100 text-red-700",
  "Arquivado":  "bg-blue-100 text-blue-700",
};

export default function ColaboraçãoPage() {
  const [items, setItems] = useState<DMSDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/awq/dms/documents")
      .then(r => r.json())
      .then(j => { if (j.success) setItems(j.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const total      = items.length;
  const shared     = items.filter(d => d.folder !== null || d.tags.length > 0).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq/dms" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <ArrowLeft size={16} />
          </Link>
          <Users size={20} className="text-gray-400" />
          <div>
            <h1 className="text-lg font-bold text-gray-900">Colaboração</h1>
            <p className="text-xs text-gray-500">DMS · Trabalho Colaborativo</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 text-center py-16">Carregando…</div>
      ) : (
        <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 max-w-sm">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Documentos Compartilhados</p>
              <p className="text-2xl font-bold text-gray-900">{shared}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Total Documentos</p>
              <p className="text-2xl font-bold text-gray-900">{total}</p>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Documento</th>
                  <th className="text-left px-4 py-3">Categoria</th>
                  <th className="text-left px-4 py-3">Responsável</th>
                  <th className="text-left px-4 py-3">Tags</th>
                  <th className="text-left px-4 py-3">Atualizado</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                      Nenhum registro encontrado
                    </td>
                  </tr>
                ) : (
                  items.map(doc => (
                    <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{doc.title}</td>
                      <td className="px-4 py-3 text-gray-600">{doc.category}</td>
                      <td className="px-4 py-3 text-gray-600">{doc.owner}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {doc.tags.slice(0, 2).map(tag => (
                            <span key={tag} className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
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
