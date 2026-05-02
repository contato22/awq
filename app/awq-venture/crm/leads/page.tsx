"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import Link from "next/link";
import { Search, ArrowLeft, Users } from "lucide-react";
import { fetchVentureCRM } from "@/lib/venture-crm-query";
import type { VentureCrmLead } from "@/lib/venture-crm-db";
import { VENTURE_LEAD_STATUSES } from "@/lib/venture-crm-db";

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

const STATUS_COLORS: Record<string, string> = {
  "Novo":         "text-blue-400 bg-blue-500/10",
  "Em Análise":   "text-amber-400 bg-amber-500/10",
  "Aprovado":     "text-emerald-400 bg-emerald-500/10",
  "Rejeitado":    "text-red-400 bg-red-500/10",
  "Aguardando":   "text-gray-400 bg-gray-500/10",
};

export default function VentureCrmLeadsPage() {
  const [leads,   setLeads]   = useState<VentureCrmLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("all");

  useEffect(() => {
    fetchVentureCRM<VentureCrmLead>("leads").then((data) => {
      setLeads(data);
      setLoading(false);
    });
  }, []);

  const filtered = leads.filter((l) => {
    const matchSearch =
      !search ||
      l.nome_empresa.toLowerCase().includes(search.toLowerCase()) ||
      l.setor.toLowerCase().includes(search.toLowerCase()) ||
      l.nome_fundador.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || l.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <>
      <Header title="Triagem de Leads — AWQ Venture" subtitle="Empresas em análise inicial para M4E" />
      <div className="page-container">

        <div className="flex items-center gap-3">
          <Link href="/awq-venture/crm" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300">
            <ArrowLeft size={12} /> CRM
          </Link>
          <span className="text-gray-700">/</span>
          <span className="text-xs text-gray-400">Triagem</span>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar empresas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-800/60 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-500"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {["all", ...VENTURE_LEAD_STATUSES].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 text-[11px] font-medium rounded-lg border transition-all ${
                  filter === s
                    ? "bg-brand-500/20 text-brand-400 border-brand-500/40"
                    : "bg-gray-800/40 text-gray-500 border-gray-700 hover:text-gray-300"
                }`}
              >
                {s === "all" ? "Todos" : s}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <SectionHeader icon={<Users size={15} />} title={`Empresas em Triagem (${filtered.length})`} />
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
              <div className="w-4 h-4 border-2 border-gray-600 border-t-brand-400 rounded-full animate-spin mr-3" />
              Carregando…
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState compact icon={<Search size={16} className="text-gray-400" />}
              title="Nenhuma empresa encontrada" />
          ) : (
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Empresa</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Setor</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Estágio</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Fundador</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Origem</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Status</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Entrada</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => (
                    <tr key={l.id} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                      <td className="py-2 px-2">
                        <div className="text-[11px] font-semibold text-gray-200">{l.nome_empresa}</div>
                        {l.site && <div className="text-[10px] text-gray-600">{l.site}</div>}
                      </td>
                      <td className="py-2 px-2 text-[11px] text-gray-400">{l.setor || "—"}</td>
                      <td className="py-2 px-2 text-[11px] text-gray-500">{l.estagio_empresa || "—"}</td>
                      <td className="py-2 px-2 text-[11px] text-gray-400">{l.nome_fundador || "—"}</td>
                      <td className="py-2 px-2 text-[11px] text-gray-500">{l.origem}</td>
                      <td className="py-2 px-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[l.status] ?? "text-gray-400 bg-gray-500/10"}`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-[11px] text-gray-500">{fmtDate(l.data_entrada)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
