"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import {
  TrendingUp, ArrowUpRight, RefreshCw, Layers, Plus,
  User, Zap, Target, CheckCircle2,
} from "lucide-react";
import {
  type CrmExpansion,
  type CrmClient,
} from "@/lib/jacqes-crm-db";
import { fetchCRM } from "@/lib/jacqes-crm-query";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + Math.round(n / 1_000) + "K";
  return "R$" + n;
}

const TIPO_FILTERS = ["Todos", "Upsell", "Cross-sell", "Upgrade", "Projeto Extra", "Reativação"] as const;
type TipoFilter = (typeof TIPO_FILTERS)[number];

function statusColor(status: string): string {
  switch (status) {
    case "Identificada":   return "bg-blue-100 text-blue-700 border border-blue-200";
    case "Em Diagnóstico": return "bg-amber-100 text-amber-700 border border-amber-200";
    case "Proposta":       return "bg-violet-100 text-violet-700 border border-violet-200";
    case "Fechado":        return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    default:               return "bg-gray-100 text-gray-600 border border-gray-200";
  }
}

function tipoColor(tipo: string): string {
  switch (tipo) {
    case "Upsell":        return "bg-brand-50 text-brand-700 border border-brand-200";
    case "Cross-sell":    return "bg-cyan-50 text-cyan-700 border border-cyan-200";
    case "Upgrade":       return "bg-purple-50 text-purple-700 border border-purple-200";
    case "Projeto Extra": return "bg-orange-50 text-orange-700 border border-orange-200";
    case "Reativação":    return "bg-rose-50 text-rose-700 border border-rose-200";
    default:              return "bg-gray-100 text-gray-600 border border-gray-200";
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

function ExpansionCard({
  expansion,
  client,
}: {
  expansion: CrmExpansion;
  client: CrmClient | undefined;
  [extra: string]: unknown;
}) {
  return (
    <div className="card card-hover p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">
            {client?.nome ?? expansion.cliente_id}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{client?.segmento ?? "—"}</div>
        </div>
        <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${tipoColor(expansion.tipo)}`}>
            {expansion.tipo}
          </span>
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${statusColor(expansion.status)}`}>
            {expansion.status}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] text-gray-400 uppercase tracking-wide">Valor Potencial</div>
          <div className="text-lg font-bold text-gray-900">{fmtCurrency(expansion.valor_potencial)}</div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-gray-400 uppercase tracking-wide">Owner</div>
          <div className="flex items-center gap-1 text-xs text-gray-700 font-medium mt-0.5">
            <User size={11} className="text-gray-400" />
            {expansion.owner}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-3 space-y-1.5">
        <div className="flex items-start gap-1.5">
          <Zap size={11} className="text-amber-500 mt-0.5 shrink-0" />
          <span className="text-xs text-gray-600">
            <span className="font-medium">Próxima ação:</span> {expansion.proxima_acao}
          </span>
        </div>
        {expansion.observacoes && (
          <div className="text-xs text-gray-500 leading-relaxed pl-3.5">
            {expansion.observacoes}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExpansaoPage() {
  const [expansions, setExpansions] = useState<CrmExpansion[]>([]);
  const [clients, setClients] = useState<CrmClient[]>([]);
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>("Todos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchCRM<CrmExpansion>("expansion"),
      fetchCRM<CrmClient>("clients"),
    ]).then(([e, c]) => { setExpansions(e); setClients(c); setLoading(false); });
  }, []);

  const totalPotencial = expansions.reduce((s: number, e: CrmExpansion) => s + e.valor_potencial, 0);
  const emDiagnostico  = expansions.filter((e: CrmExpansion) => e.status === "Em Diagnóstico").length;
  const fechadasGanhas = expansions.filter((e: CrmExpansion) => e.status === "Fechado").length;

  const filtered =
    tipoFilter === "Todos"
      ? expansions
      : expansions.filter((e: CrmExpansion) => e.tipo === tipoFilter);

  const totalMrr = clients.reduce((s: number, c: CrmClient) => s + c.ticket_mensal, 0);
  const expansaoRatio = totalMrr > 0 ? ((totalPotencial / totalMrr) * 100).toFixed(0) : "0";

  return (
    <>
      <Header
        title="Expansão"
        subtitle="JACQES CRM · Upsell · Cross-sell · Upgrade"
      />

      <div className="page-container">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Expansões Identificadas"
            value={String(expansions.length)}
            sub="oportunidades ativas"
            icon={Target}
            color="bg-brand-50 border border-brand-200 text-brand-600"
          />
          <KpiCard
            label="Valor Total Potencial"
            value={fmtCurrency(totalPotencial)}
            sub="receita incremental"
            icon={TrendingUp}
            color="bg-emerald-50 border border-emerald-200 text-emerald-600"
          />
          <KpiCard
            label="Em Diagnóstico"
            value={String(emDiagnostico)}
            sub="em andamento"
            icon={RefreshCw}
            color="bg-amber-50 border border-amber-200 text-amber-600"
          />
          <KpiCard
            label="Fechadas Ganhas"
            value={String(fechadasGanhas)}
            sub="este período"
            icon={CheckCircle2}
            color="bg-violet-50 border border-violet-200 text-violet-600"
          />
        </div>

        {/* Filter bar */}
        <div className="card p-4 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mr-1">
            Filtrar por tipo:
          </span>
          {TIPO_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => setTipoFilter(t)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors border ${
                tipoFilter === t
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Cards grid */}
        <div>
          <SectionHeader
            icon={<ArrowUpRight size={15} />}
            title="Oportunidades de Expansão"
            badge={
              <span className="badge badge-blue ml-1">{filtered.length}</span>
            }
          />

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="card p-5 h-40 animate-pulse bg-gray-50" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Layers size={20} className="text-gray-400" />}
              title="Nenhuma expansão encontrada"
              description="Não há oportunidades de expansão para o filtro selecionado."
              compact
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((exp: CrmExpansion) => (
                <ExpansionCard
                  key={exp.id}
                  expansion={exp}
                  client={clients.find((c: CrmClient) => c.id === exp.cliente_id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Summary bar */}
        <div className="card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center">
              <Plus size={14} />
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-700">
                Potencial vs MRR Atual
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {fmtCurrency(totalPotencial)} potencial /{" "}
                {fmtCurrency(totalMrr)} MRR atual
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-[11px] text-gray-400 uppercase tracking-wide">Índice de Expansão</div>
              <div className="text-lg font-bold text-emerald-600">{expansaoRatio}%</div>
            </div>
            <div className="w-16 h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all"
                style={{ width: `${Math.min(Number(expansaoRatio), 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
