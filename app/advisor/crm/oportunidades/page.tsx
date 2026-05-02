"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import Link from "next/link";
import { Target, ArrowLeft, Search } from "lucide-react";
import { fetchAdvisorCRM } from "@/lib/advisor-crm-query";
import type { AdvisorCrmOpportunity } from "@/lib/advisor-crm-db";
import { ADVISOR_PIPELINE_STAGES } from "@/lib/advisor-crm-db";

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

const STAGE_COLORS: Record<string, string> = {
  "Prospecção":      "text-gray-400 bg-gray-500/10",
  "Diagnóstico":     "text-blue-400 bg-blue-500/10",
  "Proposta":        "text-amber-400 bg-amber-500/10",
  "Negociação":      "text-orange-400 bg-orange-500/10",
  "Fechado Ganho":   "text-emerald-400 bg-emerald-500/10",
  "Fechado Perdido": "text-red-400 bg-red-500/10",
};

const RISK_COLORS: Record<string, string> = {
  "Alto":  "text-red-400 bg-red-500/10",
  "Médio": "text-amber-400 bg-amber-500/10",
  "Baixo": "text-emerald-400 bg-emerald-500/10",
};

export default function AdvisorCrmOportunidadesPage() {
  const [opps,    setOpps]    = useState<AdvisorCrmOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState<string>("all");

  useEffect(() => {
    fetchAdvisorCRM<AdvisorCrmOpportunity>("opportunities").then((data) => {
      setOpps(data);
      setLoading(false);
    });
  }, []);

  const filtered = opps.filter((o) => {
    const matchSearch =
      !search ||
      o.nome_oportunidade.toLowerCase().includes(search.toLowerCase()) ||
      o.empresa.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || o.stage === filter;
    return matchSearch && matchFilter;
  });

  const pipelineTotal = filtered
    .filter(o => !o.stage.startsWith("Fechado"))
    .reduce((s, o) => s + o.valor_estimado, 0);

  return (
    <>
      <Header title="Oportunidades — Advisor" subtitle="Pipeline de consultoria" />
      <div className="page-container">

        <div className="flex items-center gap-3">
          <Link href="/advisor/crm" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300">
            <ArrowLeft size={12} /> CRM
          </Link>
          <span className="text-gray-700">/</span>
          <span className="text-xs text-gray-400">Oportunidades</span>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar oportunidades..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-800/60 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-500"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {["all", ...ADVISOR_PIPELINE_STAGES].map((s) => (
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

        {/* Summary */}
        <div className="flex gap-4 text-sm">
          <span className="text-gray-500">
            <span className="font-semibold text-white">{filtered.length}</span> oportunidades
          </span>
          <span className="text-gray-500">
            Pipeline: <span className="font-semibold text-amber-400">{fmtCurrency(pipelineTotal)}</span>
          </span>
        </div>

        {/* Table */}
        <div className="card p-5">
          <SectionHeader icon={<Target size={15} />} title={`Oportunidades (${filtered.length})`} />
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
              <div className="w-4 h-4 border-2 border-gray-600 border-t-brand-400 rounded-full animate-spin mr-3" />
              Carregando…
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState compact icon={<Target size={16} className="text-gray-400" />}
              title="Nenhuma oportunidade encontrada" />
          ) : (
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Oportunidade</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Serviço</th>
                    <th className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500">Valor</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Stage</th>
                    <th className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500">Prob.</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Prazo</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Risco</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => (
                    <tr key={o.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                      <td className="py-2 px-2">
                        <div className="text-[11px] font-semibold text-gray-200 truncate max-w-[180px]">{o.nome_oportunidade}</div>
                        <div className="text-[10px] text-gray-600 truncate">{o.empresa}</div>
                      </td>
                      <td className="py-2 px-2 text-[11px] text-gray-400">{o.tipo_servico || "—"}</td>
                      <td className="py-2 px-2 text-right">
                        <div className="text-[11px] font-semibold text-amber-400">{fmtCurrency(o.valor_estimado)}</div>
                        {o.recorrencia_mensal && (
                          <div className="text-[10px] text-gray-600">{fmtCurrency(o.recorrencia_mensal)}/mês</div>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${STAGE_COLORS[o.stage] ?? "text-gray-400 bg-gray-500/10"}`}>
                          {o.stage}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right text-[11px] text-gray-400">{o.probabilidade}%</td>
                      <td className="py-2 px-2 text-[11px] text-gray-500">{fmtDate(o.prazo_estimado)}</td>
                      <td className="py-2 px-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${RISK_COLORS[o.risco] ?? "text-gray-400 bg-gray-500/10"}`}>
                          {o.risco}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-[11px] text-gray-500">{o.owner}</td>
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
