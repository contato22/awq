"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import Link from "next/link";
import { Building2, ArrowLeft, Search } from "lucide-react";
import { fetchAdvisorCRM } from "@/lib/advisor-crm-query";
import type { AdvisorCrmClient } from "@/lib/advisor-crm-db";

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

const STATUS_COLORS: Record<string, string> = {
  "Ativo":        "text-emerald-400 bg-emerald-500/10",
  "Em Atenção":   "text-amber-400 bg-amber-500/10",
  "Em Risco":     "text-red-400 bg-red-500/10",
  "Churned":      "text-red-400 bg-red-900/20",
  "Inativo":      "text-gray-400 bg-gray-500/10",
};

function healthColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
}

export default function AdvisorCrmClientesPage() {
  const [clients, setClients] = useState<AdvisorCrmClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState<string>("all");

  useEffect(() => {
    fetchAdvisorCRM<AdvisorCrmClient>("clients").then((data) => {
      setClients(data);
      setLoading(false);
    });
  }, []);

  const filtered = clients.filter((c) => {
    const matchSearch =
      !search ||
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.cnpj.includes(search);
    const matchFilter = filter === "all" || c.status_conta === filter;
    return matchSearch && matchFilter;
  });

  const mrrTotal = filtered.filter(c => c.status_conta === "Ativo").reduce((s, c) => s + c.fee_mensal, 0);

  return (
    <>
      <Header title="Clientes — Advisor" subtitle="Carteira de clientes de consultoria" />
      <div className="page-container">

        <div className="flex items-center gap-3">
          <Link href="/advisor/crm" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300">
            <ArrowLeft size={12} /> CRM
          </Link>
          <span className="text-gray-700">/</span>
          <span className="text-xs text-gray-400">Clientes</span>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar clientes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-800/60 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-500"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {["all", "Ativo", "Em Atenção", "Em Risco", "Churned", "Inativo"].map((s) => (
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
          <div className="ml-auto text-sm text-gray-500">
            MRR Ativos: <span className="font-semibold text-emerald-400">{fmtCurrency(mrrTotal)}</span>
          </div>
        </div>

        <div className="card p-5">
          <SectionHeader icon={<Building2 size={15} />} title={`Clientes (${filtered.length})`} />
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
              <div className="w-4 h-4 border-2 border-gray-600 border-t-brand-400 rounded-full animate-spin mr-3" />
              Carregando…
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState compact icon={<Building2 size={16} className="text-gray-400" />}
              title="Nenhum cliente encontrado" />
          ) : (
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Cliente</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Serviço</th>
                    <th className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500">Fee/mês</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Status</th>
                    <th className="text-center py-2 px-2 text-[10px] font-semibold text-gray-500">Health</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Churn Risk</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Início</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                      <td className="py-2 px-2">
                        <div className="text-[11px] font-semibold text-gray-200">{c.nome}</div>
                        <div className="text-[10px] text-gray-600">{c.cnpj || c.segmento}</div>
                      </td>
                      <td className="py-2 px-2 text-[11px] text-gray-400">{c.servico_ativo || "—"}</td>
                      <td className="py-2 px-2 text-right text-[11px] font-semibold text-emerald-400">{fmtCurrency(c.fee_mensal)}</td>
                      <td className="py-2 px-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[c.status_conta] ?? "text-gray-400 bg-gray-500/10"}`}>
                          {c.status_conta}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`text-[11px] font-bold ${healthColor(c.health_score)}`}>{c.health_score}</span>
                      </td>
                      <td className="py-2 px-2 text-[11px] text-gray-500">{c.churn_risk}</td>
                      <td className="py-2 px-2 text-[11px] text-gray-500">{fmtDate(c.inicio_relacao)}</td>
                      <td className="py-2 px-2 text-[11px] text-gray-500">{c.owner}</td>
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
