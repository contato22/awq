"use client";
// ─── /advisor/crm — ADVISOR CRM ───────────────────────────────────────────────
// Leads, oportunidades e interações específicos da BU Advisor.
// Fonte de dados: /api/advisor/crm/* (advisor-crm-db.ts → Neon Postgres)

import { useEffect, useState } from "react";
import type { ElementType } from "react";
import Header from "@/components/Header";
import {
  Users, Target, Activity, BarChart3,
  Plus, RefreshCw, ChevronRight, TrendingUp, DollarSign,
  AlertTriangle, CheckCircle2, Clock,
} from "lucide-react";
import type {
  AdvisorCrmLead,
  AdvisorCrmOpportunity,
  AdvisorCrmInteraction,
} from "@/lib/advisor-crm-db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number | null) {
  if (n == null) return "—";
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

const STAGE_COLOR: Record<string, string> = {
  "Novo Lead":             "text-gray-600 bg-gray-100",
  "Qualificação":          "text-blue-700 bg-blue-50",
  "Diagnóstico Inicial":   "text-indigo-700 bg-indigo-50",
  "Proposta de Mandato":   "text-violet-700 bg-violet-50",
  "Negociação":            "text-amber-700 bg-amber-50",
  "Fechado Ganho":         "text-emerald-700 bg-emerald-50",
  "Fechado Perdido":       "text-red-600 bg-red-50",
};

const STATUS_COLOR: Record<string, string> = {
  "Novo":         "text-blue-700 bg-blue-50 ring-1 ring-blue-200",
  "Qualificando": "text-amber-700 bg-amber-50 ring-1 ring-amber-200",
  "Convertido":   "text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200",
  "Perdido":      "text-red-600 bg-red-50 ring-1 ring-red-200",
  "Nurturing":    "text-violet-700 bg-violet-50 ring-1 ring-violet-200",
};

type Section = "overview" | "leads" | "oportunidades" | "interacoes";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdvisorCrmPage() {
  const [section, setSection] = useState<Section>("overview");
  const [leads, setLeads] = useState<AdvisorCrmLead[]>([]);
  const [opps, setOpps] = useState<AdvisorCrmOpportunity[]>([]);
  const [interactions, setInteractions] = useState<AdvisorCrmInteraction[]>([]);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [leadsRes, oppsRes, intRes, statsRes] = await Promise.all([
        fetch("/api/advisor/crm/leads"),
        fetch("/api/advisor/crm/oportunidades"),
        fetch("/api/advisor/crm/interacoes"),
        fetch("/api/advisor/crm/stats"),
      ]);
      setLeads(await leadsRes.json());
      setOpps(await oppsRes.json());
      setInteractions(await intRes.json());
      setStats(await statsRes.json());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const openOpps = opps.filter(o => o.stage !== "Fechado Ganho" && o.stage !== "Fechado Perdido");

  const tabs: { key: Section; label: string; icon: ElementType; count?: number }[] = [
    { key: "overview",      label: "Visão Geral",    icon: BarChart3                  },
    { key: "leads",         label: "Leads",          icon: Users,   count: leads.length },
    { key: "oportunidades", label: "Oportunidades",  icon: Target,  count: openOpps.length },
    { key: "interacoes",    label: "Interações",     icon: Activity, count: interactions.length },
  ];

  return (
    <>
      <Header
        title="CRM — Advisor"
        subtitle="Leads, oportunidades e interações da BU Advisor"
      />

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 border-b border-gray-200 mb-5">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setSection(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                section === t.key
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-400 hover:text-gray-700"
              }`}
            >
              <Icon size={13} />
              {t.label}
              {t.count != null && (
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-bold">
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
        <div className="ml-auto">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 px-3 py-2 transition-colors"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-sm text-red-700">
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20 text-sm text-gray-400 gap-2">
          <RefreshCw size={14} className="animate-spin" />
          Carregando dados…
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ── Overview ───────────────────────────────────────────────── */}
          {section === "overview" && stats && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total de Leads",        value: stats.totalLeads,         icon: Users,        color: "text-blue-600",    bg: "bg-blue-50"    },
                  { label: "Leads Novos",            value: stats.leadsNovos,         icon: ChevronRight, color: "text-indigo-600",  bg: "bg-indigo-50"  },
                  { label: "Oportunidades Abertas",  value: stats.openOpportunities,  icon: Target,       color: "text-amber-600",   bg: "bg-amber-50"   },
                  { label: "Win Rate",               value: `${stats.winRate ?? 0}%`, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
                ].map((k) => {
                  const Icon = k.icon;
                  return (
                    <div key={k.label} className="card p-4 flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center shrink-0`}>
                        <Icon size={16} className={k.color} />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-gray-900">{k.value}</div>
                        <div className="text-[11px] text-gray-500">{k.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="card p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                    <DollarSign size={16} className="text-green-600" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">
                      {fmtR(stats.pipelineFeeTotal)}
                    </div>
                    <div className="text-[11px] text-gray-500">Pipeline Fee Anualizado</div>
                  </div>
                </div>
                <div className="card p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                    <TrendingUp size={16} className="text-teal-600" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">
                      {fmtR(stats.aumPotencial)}
                    </div>
                    <div className="text-[11px] text-gray-500">AUM Potencial em Pipeline</div>
                  </div>
                </div>
              </div>

              {/* Oportunidades abertas resumidas */}
              {openOpps.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900">Oportunidades em Andamento</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {openOpps.map((o) => (
                      <div key={o.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{o.nome_oportunidade}</div>
                          <div className="text-[11px] text-gray-500">{o.empresa} · {o.tipo_servico}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-sm font-bold text-amber-600">{fmtR(o.fee_estimado_mensal)}/mês</div>
                            {o.aum_potencial && (
                              <div className="text-[10px] text-gray-400">AUM: {fmtR(o.aum_potencial)}</div>
                            )}
                          </div>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${STAGE_COLOR[o.stage] ?? "text-gray-600 bg-gray-100"}`}>
                            {o.stage}
                          </span>
                          <span className="text-[11px] font-bold text-gray-500">{o.probabilidade}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Leads ──────────────────────────────────────────────────── */}
          {section === "leads" && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Leads Advisor</h3>
                <span className="text-xs text-gray-400">{leads.length} registros</span>
              </div>
              {leads.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-gray-400">
                  Nenhum lead cadastrado.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        {["Nome", "Empresa", "Serviço", "AUM Est.", "Status", "Owner", "Entrada"].map((h) => (
                          <th key={h} className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {leads.map((l) => (
                        <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-gray-900">{l.nome}</div>
                            <div className="text-[10px] text-gray-400">{l.cargo} · {l.email}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm text-gray-700">{l.empresa}</div>
                            <div className="text-[10px] text-gray-400">{l.segmento}</div>
                          </td>
                          <td className="py-3 px-4 text-[11px] text-gray-600 whitespace-nowrap">{l.tipo_servico || "—"}</td>
                          <td className="py-3 px-4 text-sm font-medium text-gray-700 tabular-nums">{fmtR(l.aum_estimado)}</td>
                          <td className="py-3 px-4">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[l.status] ?? "text-gray-600 bg-gray-100"}`}>
                              {l.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[11px] text-gray-500">{l.owner}</td>
                          <td className="py-3 px-4 text-[11px] text-gray-400 whitespace-nowrap">{l.data_entrada}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Oportunidades ──────────────────────────────────────────── */}
          {section === "oportunidades" && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Oportunidades Advisor</h3>
                <span className="text-xs text-gray-400">{opps.length} registros</span>
              </div>
              {opps.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-gray-400">
                  Nenhuma oportunidade cadastrada.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/60">
                        {["Oportunidade", "Empresa", "Serviço", "Fee/mês", "AUM", "Stage", "Prob.", "Owner", "Próxima Ação"].map((h) => (
                          <th key={h} className="text-left py-2.5 px-4 text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {opps.map((o) => (
                        <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-gray-900 text-sm">{o.nome_oportunidade}</div>
                            <div className="text-[10px] text-gray-400">{o.id}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm text-gray-700">{o.empresa}</div>
                            <div className="text-[10px] text-gray-400">{o.segmento}</div>
                          </td>
                          <td className="py-3 px-4 text-[11px] text-gray-600 whitespace-nowrap">{o.tipo_servico}</td>
                          <td className="py-3 px-4 text-sm font-bold text-amber-600 tabular-nums">{fmtR(o.fee_estimado_mensal)}</td>
                          <td className="py-3 px-4 text-sm text-gray-600 tabular-nums">{fmtR(o.aum_potencial)}</td>
                          <td className="py-3 px-4">
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${STAGE_COLOR[o.stage] ?? "text-gray-600 bg-gray-100"}`}>
                              {o.stage}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`text-sm font-bold tabular-nums ${o.probabilidade >= 70 ? "text-emerald-600" : o.probabilidade >= 40 ? "text-amber-600" : "text-gray-400"}`}>
                              {o.probabilidade}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[11px] text-gray-500">{o.owner}</td>
                          <td className="py-3 px-4 max-w-[200px]">
                            <div className="text-[11px] text-gray-500 truncate">{o.proxima_acao || "—"}</div>
                            {o.data_proxima_acao && (
                              <div className="text-[10px] text-amber-600 flex items-center gap-1 mt-0.5">
                                <Clock size={9} />
                                {o.data_proxima_acao}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Interações ─────────────────────────────────────────────── */}
          {section === "interacoes" && (
            <div className="card overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Interações Advisor</h3>
                <span className="text-xs text-gray-400">{interactions.length} registros</span>
              </div>
              {interactions.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-gray-400">
                  Nenhuma interação registrada.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {interactions.map((i) => (
                    <div key={i.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200">
                              {i.tipo}
                            </span>
                            <span className="text-[11px] text-gray-400">{i.data}</span>
                            <span className="text-[11px] text-gray-400">· {i.owner}</span>
                          </div>
                          <p className="text-sm text-gray-700">{i.resumo}</p>
                          {i.proximo_passo && (
                            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-amber-700">
                              <ChevronRight size={11} />
                              {i.proximo_passo}
                            </div>
                          )}
                          {i.observacoes && (
                            <p className="text-[11px] text-gray-400 mt-1 italic">{i.observacoes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
