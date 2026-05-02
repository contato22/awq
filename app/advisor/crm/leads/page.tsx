"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import Link from "next/link";
import { Users, ArrowLeft, Search } from "lucide-react";
import { fetchAdvisorCRM } from "@/lib/advisor-crm-query";
import type { AdvisorCrmLead } from "@/lib/advisor-crm-db";
import { ADVISOR_LEAD_STATUSES } from "@/lib/advisor-crm-db";

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

const STATUS_COLORS: Record<string, string> = {
  "Novo":         "text-blue-400 bg-blue-500/10",
  "Qualificando": "text-amber-400 bg-amber-500/10",
  "Convertido":   "text-emerald-400 bg-emerald-500/10",
  "Perdido":      "text-red-400 bg-red-500/10",
  "Nurturing":    "text-violet-400 bg-violet-500/10",
};

export default function AdvisorCrmLeadsPage() {
  const [leads,   setLeads]   = useState<AdvisorCrmLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState<string>("all");

  useEffect(() => {
    fetchAdvisorCRM<AdvisorCrmLead>("leads").then((data) => {
      setLeads(data);
      setLoading(false);
    });
  }, []);

  const filtered = leads.filter((l) => {
    const matchSearch =
      !search ||
      l.nome.toLowerCase().includes(search.toLowerCase()) ||
      l.empresa.toLowerCase().includes(search.toLowerCase()) ||
      l.email.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || l.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <>
      <Header title="Leads — Advisor" subtitle="Prospecção e qualificação" />
      <div className="page-container">

        <div className="flex items-center gap-3">
          <Link href="/advisor/crm" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300">
            <ArrowLeft size={12} /> CRM
          </Link>
          <span className="text-gray-700">/</span>
          <span className="text-xs text-gray-400">Leads</span>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-800/60 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-500"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {["all", ...ADVISOR_LEAD_STATUSES].map((s) => (
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

        {/* Table */}
        <div className="card p-5">
          <SectionHeader icon={<Users size={15} />} title={`Leads (${filtered.length})`} />
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
              <div className="w-4 h-4 border-2 border-gray-600 border-t-brand-400 rounded-full animate-spin mr-3" />
              Carregando…
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState compact icon={<Users size={16} className="text-gray-400" />}
              title="Nenhum lead encontrado" description="Ajuste os filtros ou adicione novos leads." />
          ) : (
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Nome</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Empresa</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Serviço</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Origem</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Status</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Owner</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Entrada</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => (
                    <tr key={l.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                      <td className="py-2 px-2">
                        <div className="text-[11px] font-semibold text-gray-200">{l.nome}</div>
                        <div className="text-[10px] text-gray-600">{l.cargo}</div>
                      </td>
                      <td className="py-2 px-2 text-[11px] text-gray-400">{l.empresa || "—"}</td>
                      <td className="py-2 px-2 text-[11px] text-gray-400">{l.tipo_servico || "—"}</td>
                      <td className="py-2 px-2 text-[11px] text-gray-500">{l.origem}</td>
                      <td className="py-2 px-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[l.status] ?? "text-gray-400 bg-gray-500/10"}`}>
                          {l.status}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-[11px] text-gray-500">{l.owner}</td>
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
