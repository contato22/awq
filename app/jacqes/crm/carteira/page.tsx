"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import {
  Users, DollarSign, CheckCircle2, TrendingUp, ArrowUpRight,
  Percent, AlertTriangle,
} from "lucide-react";
import type { CrmClient, CrmExpansion } from "@/lib/jacqes-crm-db";
import { fetchCRM } from "@/lib/jacqes-crm-query";

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return "R$" + (n / 1_000).toFixed(1) + "K";
  return "R$" + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function initials(nome: string): string {
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join("")
    .toUpperCase();
}

const STATUS_AVATAR: Record<string, string> = {
  Ativo:        "bg-emerald-100 text-emerald-700",
  "Em Atenção": "bg-amber-100 text-amber-700",
  "Em Risco":   "bg-red-100 text-red-700",
};

const STATUS_BADGE: Record<string, string> = {
  Ativo:        "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Em Atenção": "bg-amber-100 text-amber-700 border-amber-200",
  "Em Risco":   "bg-red-100 text-red-700 border-red-200",
};

const CHURN_BADGE: Record<string, string> = {
  Baixo: "text-emerald-600",
  Médio: "text-amber-600",
  Alto:  "text-red-600",
};

const STATUS_BAR: Record<string, string> = {
  Ativo:        "bg-emerald-500",
  "Em Atenção": "bg-amber-400",
  "Em Risco":   "bg-red-500",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CarteiraActivaPage() {
  const [clientes,  setClientes]  = useState<CrmClient[]>([]);
  const [expansion, setExpansion] = useState<CrmExpansion[]>([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      fetchCRM<CrmClient>("clients"),
      fetchCRM<CrmExpansion>("expansion"),
    ]).then(([c, e]) => { setClientes(c); setExpansion(e); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const ativos         = clientes.filter(c => c.status_conta === "Ativo");
  const emAtencao      = clientes.filter(c => c.status_conta === "Em Atenção");
  const emRisco        = clientes.filter(c => c.status_conta === "Em Risco");
  const mrr            = clientes.reduce((s, c) => s + c.ticket_mensal, 0);
  const recebido       = ativos.reduce((s, c) => s + c.ticket_mensal, 0);
  const taxaColeta     = mrr > 0 ? Math.round((recebido / mrr) * 100) : 0;
  const expansaoTotal  = expansion.filter(e => e.status !== "Fechado").reduce((s, e) => s + e.valor_potencial, 0);

  const mrrAtivos    = ativos.reduce((s, c) => s + c.ticket_mensal, 0);
  const mrrAtencao   = emAtencao.reduce((s, c) => s + c.ticket_mensal, 0);
  const mrrRisco     = emRisco.reduce((s, c) => s + c.ticket_mensal, 0);

  return (
    <>
      <Header
        title="Carteira Ativa — JACQES CRM"
        subtitle="Gestão de contratos e receita recorrente"
      />
      <div className="page-container">

        {/* ── KPIs ───────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              label: "Clientes Ativos",    value: String(ativos.length),
              icon: Users,       color: "text-brand-600",   bg: "bg-brand-50",
              sub: `${clientes.length} total`,
            },
            {
              label: "MRR Contratado",     value: fmtCurrency(mrr),
              icon: DollarSign,  color: "text-emerald-600", bg: "bg-emerald-50",
              sub: "Soma dos FEEs mensais",
            },
            {
              label: "Recebido",           value: fmtCurrency(recebido),
              icon: CheckCircle2,color: "text-emerald-700", bg: "bg-emerald-50",
              sub: `${ativos.length} clientes sem pendências`,
            },
            {
              label: "Taxa de Coleta",     value: taxaColeta + "%",
              icon: Percent,
              color: taxaColeta >= 80 ? "text-emerald-600" : "text-amber-600",
              bg:    taxaColeta >= 80 ? "bg-emerald-50"    : "bg-amber-50",
              sub:   fmtCurrency(mrr - recebido) + " pendente",
            },
            {
              label: "Expansão Aberta",    value: fmtCurrency(expansaoTotal),
              icon: TrendingUp,  color: "text-teal-600",    bg: "bg-teal-50",
              sub:  `${expansion.filter(e => e.status !== "Fechado").length} oportunidades`,
            },
          ].map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-5 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={16} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xl font-bold ${card.color}`}>{card.value}</div>
                  <div className="text-[10px] font-medium text-gray-400 mt-0.5 leading-tight">{card.label}</div>
                  <div className="text-[10px] text-gray-300 mt-0.5">{card.sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Client Cards ───────────────────────────────────────────────────── */}
        <div>
          <SectionHeader
            icon={<Users size={15} />}
            title="Contratos Ativos"
            badge={
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                {clientes.length} clientes
              </span>
            }
          />

          {loading ? (
            <div className="text-sm text-gray-400 py-12 text-center">Carregando carteira…</div>
          ) : clientes.length === 0 ? (
            <EmptyState
              icon={<Users size={20} className="text-gray-400" />}
              title="Nenhum cliente na carteira"
              description="Adicione clientes para visualizar a carteira ativa."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
              {clientes.map(c => {
                const exp = expansion.find(e => e.cliente_id === c.id && e.status !== "Fechado");
                const barColor = STATUS_BAR[c.status_conta] ?? "bg-gray-300";
                const avatarColor = STATUS_AVATAR[c.status_conta] ?? "bg-gray-100 text-gray-500";
                return (
                  <div key={c.id} className="card p-5 flex flex-col gap-4">
                    {/* Header row */}
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${avatarColor}`}>
                        {initials(c.nome)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 text-sm">{c.nome}</span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_BADGE[c.status_conta] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
                            {c.status_conta}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">{c.produto_ativo}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xl font-bold text-gray-900">{fmtCurrency(c.ticket_mensal)}</div>
                        <div className="text-[10px] text-gray-400">/ mês</div>
                      </div>
                    </div>

                    {/* Health score bar */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                        <span>Health Score</span>
                        <span className="font-semibold text-gray-600">{c.health_score}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${c.health_score}%` }} />
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center justify-between text-xs gap-2 flex-wrap">
                      <div className="flex items-center gap-1 text-gray-500">
                        <AlertTriangle size={11} className={CHURN_BADGE[c.churn_risk] ?? "text-gray-400"} />
                        <span className={`font-medium ${CHURN_BADGE[c.churn_risk] ?? "text-gray-500"}`}>
                          Churn: {c.churn_risk}
                        </span>
                      </div>
                      <div className="text-gray-400">
                        <span className="font-medium text-gray-600">{c.owner}</span>
                        {c.inicio_relacao && (
                          <span> · desde {c.inicio_relacao.slice(0, 7)}</span>
                        )}
                      </div>
                    </div>

                    {/* Última interação */}
                    <div className="text-[11px] text-gray-400">
                      Última interação: <span className="text-gray-600 font-medium">0 dias atrás</span>
                    </div>

                    {/* Expansão potencial */}
                    {exp && (
                      <div className="flex items-center gap-2 text-xs text-teal-700 bg-teal-50 border border-teal-100 rounded-lg px-3 py-2">
                        <ArrowUpRight size={13} className="shrink-0" />
                        <span className="font-semibold">{exp.tipo}</span>
                        <span className="text-teal-500">·</span>
                        <span className="font-bold">{fmtCurrency(exp.valor_potencial)}</span>
                        <span className="text-teal-500 ml-auto">Potencial</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── MRR Breakdown ──────────────────────────────────────────────────── */}
        {!loading && clientes.length > 0 && (
          <div className="card p-5">
            <SectionHeader
              icon={<DollarSign size={15} />}
              title="Composição do MRR"
            />
            <div className="grid grid-cols-3 gap-4 mb-5">
              {[
                { label: "Ativos",      value: mrrAtivos,   count: ativos.length,    color: "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50"  },
                { label: "Em Atenção",  value: mrrAtencao,  count: emAtencao.length, color: "bg-amber-400",   text: "text-amber-600",   bg: "bg-amber-50"    },
                { label: "Em Risco",    value: mrrRisco,    count: emRisco.length,   color: "bg-red-500",     text: "text-red-600",     bg: "bg-red-50"      },
              ].map(row => (
                <div key={row.label} className={`rounded-xl ${row.bg} px-4 py-3 text-center`}>
                  <div className={`text-xl font-bold ${row.text}`}>{fmtCurrency(row.value)}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">{row.label}</div>
                  <div className="text-[10px] text-gray-400">{row.count} cliente{row.count !== 1 ? "s" : ""}</div>
                </div>
              ))}
            </div>

            {/* Stacked bar */}
            <div className="flex h-3 rounded-full overflow-hidden gap-px">
              {mrr > 0 && (
                <>
                  {mrrAtivos > 0   && <div className="bg-emerald-500 transition-all" style={{ width: `${(mrrAtivos / mrr) * 100}%` }} />}
                  {mrrAtencao > 0  && <div className="bg-amber-400 transition-all"   style={{ width: `${(mrrAtencao / mrr) * 100}%` }} />}
                  {mrrRisco > 0    && <div className="bg-red-500 transition-all"     style={{ width: `${(mrrRisco / mrr) * 100}%` }} />}
                </>
              )}
            </div>
            <div className="flex items-center gap-4 mt-3">
              {[
                { label: "Ativos",     color: "bg-emerald-500" },
                { label: "Em Atenção", color: "bg-amber-400"   },
                { label: "Em Risco",   color: "bg-red-500"     },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                  <span className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                  {l.label}
                </div>
              ))}
              <span className="ml-auto text-sm font-bold text-gray-900">Total: {fmtCurrency(mrr)}</span>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
