"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import Link from "next/link";
import { Target, ArrowLeft, Search } from "lucide-react";
import { fetchVentureCRM } from "@/lib/venture-crm-query";
import type { VentureCrmDeal } from "@/lib/venture-crm-db";
import { VENTURE_DEAL_STAGES } from "@/lib/venture-crm-db";

function fmtCurrency(n: number): string {
  if (n >= 1_000_000_000) return "R$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

const STAGE_COLORS: Record<string, string> = {
  "Triagem":       "text-gray-400 bg-gray-500/10",
  "Prospecção":    "text-amber-400 bg-amber-500/10",
  "Due Diligence": "text-blue-400 bg-blue-500/10",
  "Term Sheet":    "text-emerald-400 bg-emerald-500/10",
  "Fechado":       "text-brand-400 bg-brand-500/10",
  "Descartado":    "text-red-400 bg-red-500/10",
};

const PRIO_COLORS: Record<string, string> = {
  "Alta":  "text-red-400 bg-red-500/10",
  "Média": "text-amber-400 bg-amber-500/10",
  "Baixa": "text-gray-400 bg-gray-500/10",
};

export default function VentureCrmDealsPage() {
  const [deals,   setDeals]   = useState<VentureCrmDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState<string>("all");

  useEffect(() => {
    fetchVentureCRM<VentureCrmDeal>("deals").then((data) => {
      setDeals(data);
      setLoading(false);
    });
  }, []);

  const filtered = deals.filter((d) => {
    const matchSearch =
      !search ||
      d.nome_deal.toLowerCase().includes(search.toLowerCase()) ||
      d.empresa.toLowerCase().includes(search.toLowerCase()) ||
      d.setor.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || d.stage === filter;
    return matchSearch && matchFilter;
  });

  const ticketTotal = filtered
    .filter(d => !["Fechado", "Descartado"].includes(d.stage))
    .reduce((s, d) => s + d.ticket_midia, 0);

  return (
    <>
      <Header title="Deals M4E — AWQ Venture" subtitle="Pipeline de Media for Equity" />
      <div className="page-container">

        <div className="flex items-center gap-3">
          <Link href="/awq-venture/crm" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300">
            <ArrowLeft size={12} /> CRM
          </Link>
          <span className="text-gray-700">/</span>
          <span className="text-xs text-gray-400">Deals</span>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar deals..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-800/60 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-500"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {["all", ...VENTURE_DEAL_STAGES].map((s) => (
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

        <div className="text-sm text-gray-500">
          <span className="font-semibold text-white">{filtered.length}</span> deals ·
          Ticket ativo: <span className="font-semibold text-amber-400">{fmtCurrency(ticketTotal)}</span>
        </div>

        <div className="card p-5">
          <SectionHeader icon={<Target size={15} />} title={`Deals (${filtered.length})`} />
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
              <div className="w-4 h-4 border-2 border-gray-600 border-t-brand-400 rounded-full animate-spin mr-3" />
              Carregando…
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState compact icon={<Target size={16} className="text-gray-400" />}
              title="Nenhum deal encontrado" />
          ) : (
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Deal</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Setor</th>
                    <th className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500">Ticket Mídia</th>
                    <th className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500">Equity</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Stage</th>
                    <th className="text-center py-2 px-2 text-[10px] font-semibold text-gray-500">Score</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">ETA</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Prioridade</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d) => (
                    <tr key={d.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                      <td className="py-2 px-2">
                        <div className="text-[11px] font-semibold text-gray-200 truncate max-w-[180px]">{d.nome_deal}</div>
                        <div className="text-[10px] text-gray-600">{d.empresa}</div>
                      </td>
                      <td className="py-2 px-2 text-[11px] text-gray-400">{d.setor || "—"}</td>
                      <td className="py-2 px-2 text-right text-[11px] font-semibold text-amber-400">{fmtCurrency(d.ticket_midia)}</td>
                      <td className="py-2 px-2 text-right text-[11px] text-gray-400">{d.equity_percentual}%</td>
                      <td className="py-2 px-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${STAGE_COLORS[d.stage] ?? "text-gray-400 bg-gray-500/10"}`}>
                          {d.stage}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center text-[11px] font-bold text-brand-400">{d.score}/10</td>
                      <td className="py-2 px-2 text-[11px] text-gray-500">{d.eta || "—"}</td>
                      <td className="py-2 px-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${PRIO_COLORS[d.priority] ?? ""}`}>
                          {d.priority}
                        </span>
                      </td>
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
