"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import Link from "next/link";
import { FileText, ArrowLeft } from "lucide-react";
import { fetchAdvisorCRM } from "@/lib/advisor-crm-query";
import type { AdvisorCrmProposal } from "@/lib/advisor-crm-db";

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
  "Em Elaboração": "text-gray-400 bg-gray-500/10",
  "Enviada":       "text-blue-400 bg-blue-500/10",
  "Aprovada":      "text-emerald-400 bg-emerald-500/10",
  "Rejeitada":     "text-red-400 bg-red-500/10",
  "Em Revisão":    "text-amber-400 bg-amber-500/10",
};

export default function AdvisorCrmPropostasPage() {
  const [proposals, setProposals] = useState<AdvisorCrmProposal[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    fetchAdvisorCRM<AdvisorCrmProposal>("proposals").then((data) => {
      setProposals(data);
      setLoading(false);
    });
  }, []);

  const totalEnviado = proposals
    .filter(p => p.status === "Enviada" || p.status === "Em Revisão")
    .reduce((s, p) => s + p.valor_proposto, 0);

  return (
    <>
      <Header title="Propostas — Advisor" subtitle="Propostas comerciais de consultoria" />
      <div className="page-container">

        <div className="flex items-center gap-3">
          <Link href="/advisor/crm" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300">
            <ArrowLeft size={12} /> CRM
          </Link>
          <span className="text-gray-700">/</span>
          <span className="text-xs text-gray-400">Propostas</span>
        </div>

        {totalEnviado > 0 && (
          <div className="text-sm text-gray-500">
            Em avaliação: <span className="font-semibold text-amber-400">{fmtCurrency(totalEnviado)}</span>
          </div>
        )}

        <div className="card p-5">
          <SectionHeader icon={<FileText size={15} />} title={`Propostas (${proposals.length})`} />
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
              <div className="w-4 h-4 border-2 border-gray-600 border-t-brand-400 rounded-full animate-spin mr-3" />
              Carregando…
            </div>
          ) : proposals.length === 0 ? (
            <EmptyState compact icon={<FileText size={16} className="text-gray-400" />}
              title="Nenhuma proposta encontrada" description="As propostas aparecerão aqui após serem criadas." />
          ) : (
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Proposta</th>
                    <th className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500">Valor</th>
                    <th className="text-right py-2 px-2 text-[10px] font-semibold text-gray-500">Contraproposta</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Status</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Enviada</th>
                    <th className="text-left py-2 px-2 text-[10px] font-semibold text-gray-500">Resposta</th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((p) => (
                    <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                      <td className="py-2 px-2">
                        <div className="text-[11px] font-semibold text-gray-200">v{p.versao}</div>
                        <div className="text-[10px] text-gray-600 max-w-[200px] truncate">{p.escopo}</div>
                      </td>
                      <td className="py-2 px-2 text-right text-[11px] font-semibold text-amber-400">{fmtCurrency(p.valor_proposto)}</td>
                      <td className="py-2 px-2 text-right text-[11px] text-gray-500">
                        {p.contraproposta ? fmtCurrency(p.contraproposta) : "—"}
                      </td>
                      <td className="py-2 px-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[p.status] ?? "text-gray-400 bg-gray-500/10"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-[11px] text-gray-500">{fmtDate(p.data_envio)}</td>
                      <td className="py-2 px-2 text-[11px] text-gray-500">{fmtDate(p.data_resposta)}</td>
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
