"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import {
  FileText, Send, CheckCircle2, DollarSign,
  ArrowRightLeft, CalendarDays,
} from "lucide-react";
import type { CrmProposal, CrmOpportunity } from "@/lib/jacqes-crm-db";
import { fetchCRM } from "@/lib/jacqes-crm-query";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + Math.round(n / 1_000) + "K";
  return "R$" + n;
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function statusBadge(status: string): string {
  switch (status) {
    case "Rascunho":       return "bg-gray-100 text-gray-600 border border-gray-200";
    case "Enviada":        return "bg-blue-100 text-blue-700 border border-blue-200";
    case "Em Negociação":  return "bg-amber-100 text-amber-700 border border-amber-200";
    case "Aceita":         return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    case "Recusada":       return "bg-red-100 text-red-700 border border-red-200";
    default:               return "bg-gray-100 text-gray-600 border border-gray-200";
  }
}

// ─── Components ───────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</div>
        <div className="text-xl font-bold text-gray-900 mt-0.5">{value}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PropostasPage() {
  const [proposals,     setProposals]     = useState<CrmProposal[]>([]);
  const [opportunities, setOpportunities] = useState<CrmOpportunity[]>([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      fetchCRM<CrmProposal>("proposals"),
      fetchCRM<CrmOpportunity>("opportunities"),
    ]).then(([p, o]) => { setProposals(p); setOpportunities(o); setLoading(false); });
  }, []);

  const totalPropostas  = proposals.length;
  const enviadas        = proposals.filter((p: CrmProposal) => p.status === "Enviada").length;
  const aceitas         = proposals.filter((p: CrmProposal) => p.status === "Aceita").length;
  const valorEnviado    = proposals
    .filter((p: CrmProposal) => p.status === "Enviada" || p.status === "Em Negociação" || p.status === "Aceita")
    .reduce((s: number, p: CrmProposal) => s + p.valor_proposto, 0);

  function getOpp(id: string): CrmOpportunity | undefined {
    return opportunities.find((o: CrmOpportunity) => o.id === id);
  }

  return (
    <>
      <Header
        title="Propostas"
        subtitle="JACQES CRM · Gestão de propostas comerciais"
      />

      <div className="page-container">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Total Propostas"
            value={String(totalPropostas)}
            sub="todas as versões"
            icon={FileText}
            color="bg-brand-50 border border-brand-200 text-brand-600"
          />
          <KpiCard
            label="Enviadas"
            value={String(enviadas)}
            sub="aguardando resposta"
            icon={Send}
            color="bg-blue-50 border border-blue-200 text-blue-600"
          />
          <KpiCard
            label="Aceitas"
            value={String(aceitas)}
            sub="este período"
            icon={CheckCircle2}
            color="bg-emerald-50 border border-emerald-200 text-emerald-600"
          />
          <KpiCard
            label="Valor Total Enviado"
            value={fmtCurrency(valorEnviado)}
            sub="em aberto + aceitas"
            icon={DollarSign}
            color="bg-violet-50 border border-violet-200 text-violet-600"
          />
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <SectionHeader
              icon={<FileText size={15} />}
              title="Propostas Comerciais"
              badge={
                <span className="badge badge-blue ml-1">{proposals.length}</span>
              }
              className="mb-0"
            />
          </div>

          {loading ? (
            <div className="p-5 space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-gray-50 animate-pulse" />
              ))}
            </div>
          ) : proposals.length === 0 ? (
            <EmptyState
              icon={<FileText size={20} className="text-gray-400" />}
              title="Nenhuma proposta criada"
              description="Nenhuma proposta criada. Acesse Oportunidades para gerar uma proposta."
              compact
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                      Proposta
                    </th>
                    <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                      Oportunidade
                    </th>
                    <th className="text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                      Valor Proposto
                    </th>
                    <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                      Status
                    </th>
                    <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                      <CalendarDays size={12} className="inline mr-1" />
                      Envio
                    </th>
                    <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                      Resposta
                    </th>
                    <th className="text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                      <ArrowRightLeft size={12} className="inline mr-1" />
                      Contraproposta
                    </th>
                    <th className="text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">
                      Observações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {proposals.map((p: CrmProposal) => {
                    const opp = getOpp(p.opportunity_id);
                    return (
                      <tr
                        key={p.id}
                        className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">
                            v{p.versao} — {p.id.replace("prop-", "#")}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5 max-w-[160px] truncate">
                            {p.escopo}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-700 font-medium truncate max-w-[180px]">
                            {opp?.nome_oportunidade ?? p.opportunity_id}
                          </div>
                          {opp && (
                            <div className="text-[11px] text-gray-400 mt-0.5">{opp.empresa}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-bold text-gray-900">{fmtCurrency(p.valor_proposto)}</span>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            {opp ? `~${opp.probabilidade}% prob.` : ""}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${statusBadge(p.status)}`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {fmtDate(p.data_envio)}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {fmtDate(p.data_resposta)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-gray-600">
                          {p.contraproposta != null
                            ? <span className="font-semibold text-amber-700">{fmtCurrency(p.contraproposta)}</span>
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-xs text-gray-500 max-w-[160px] truncate block"
                            title={p.observacoes}
                          >
                            {p.observacoes || "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
