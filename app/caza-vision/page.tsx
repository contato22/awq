"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import {
  Building2, DollarSign, TrendingUp, ArrowUpRight,
  Film, CheckCircle2, AlertTriangle, CheckCircle,
  BarChart3, Database, CloudOff, Users,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n;
}
function fmtNumber(n: number) { return n.toLocaleString("pt-BR"); }
function pct(cur: number, prev: number) {
  if (!prev) return "0.0";
  return (((cur - prev) / prev) * 100).toFixed(1);
}

// ─── Data source abstraction ──────────────────────────────────────────────────

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/awq";

interface StatsPayload {
  kpis: { id: string; label: string; value: number; unit: string; icon: string; color: string }[];
  revenueData: { month: string; receita: number; expenses: number; profit: number; orcamento: number }[];
  pipeline: { stage: string; count: number }[];
  projectTypeRevenue: { type: string; projetos: number; receita: number; avgValue: number }[];
  total_despesas?:    number;
  total_lucro?:       number;
  margem_media?:      number;
  projetos_proximos?: number;
  source: string;
}

async function loadStats(): Promise<StatsPayload | null> {
  // Vercel/SSR: API routes available at root (no basePath). GitHub Pages: skip API.
  if (!IS_STATIC) {
    try {
      const res = await fetch("/api/caza/stats");
      if (res.ok) {
        const data = await res.json() as StatsPayload;
        if (data?.kpis?.length > 0) return data;
      }
    } catch { /* API unavailable — fall through */ }
  }

  // GitHub Pages (IS_STATIC=true) or API returned empty: load static snapshot.
  try {
    const res = await fetch(`${BASE_PATH}/data/caza-stats.json`);
    if (res.ok) {
      const data = await res.json() as StatsPayload;
      return { ...data, source: data.source ?? "static" };
    }
  } catch { /* ignore */ }
  return null;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const kpiIconMap: Record<string, React.ElementType> = {
  Building2, DollarSign, HandshakeIcon: CheckCircle2, TrendingUp,
  Film, CheckCircle, Users,
};
const kpiColorMap: Record<string, { text: string; bg: string }> = {
  emerald: { text: "text-emerald-600", bg: "bg-emerald-50" },
  brand:   { text: "text-brand-600",   bg: "bg-brand-50"   },
  violet:  { text: "text-violet-600",  bg: "bg-violet-50"  },
  amber:   { text: "text-amber-700",   bg: "bg-amber-50"   },
};
const pipelineColors: Record<string, string> = {
  "Em Produção":          "bg-brand-500",
  "Em Edição":            "bg-amber-500",
  "Entregue":             "bg-emerald-500",
  "Aguardando Aprovação": "bg-violet-500",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CazaVisionPage() {
  const [stats,   setStats]   = useState<StatsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats().then(s => { setStats(s); setLoading(false); });
  }, []);

  const kpis           = stats?.kpis             ?? [];
  const revenueData    = stats?.revenueData      ?? [];
  const pipeline       = stats?.pipeline         ?? [];
  const projectTypeRev = stats?.projectTypeRevenue ?? [];
  const source         = stats?.source ?? null;

  // Split KPIs into primary (first 4) and secondary (rest)
  const kpisPrimary   = kpis.slice(0, 4);
  const kpisSecondary = kpis.slice(4);

  const lastMonth = revenueData.length > 0 ? revenueData[revenueData.length - 1] : null;
  const prevMonth = revenueData.length > 1 ? revenueData[revenueData.length - 2] : null;

  return (
    <>
      <Header title="Caza Vision — Overview" subtitle="Produtora de Conteúdo · AWQ Group" />
      <div className="page-container">

        {/* Source badge */}
        {!loading && (
          <div className="flex items-center gap-2">
            {source === "internal" && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-600">
                <Database size={11} /> Base interna AWQ
              </span>
            )}
            {(source === "static" || source === "notion") && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs text-blue-600">
                <Database size={11} /> Snapshot estático
              </span>
            )}
            {(source === "empty" || source === null) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700">
                <CloudOff size={11} /> Sem dados — importe do Notion ou crie internamente
              </span>
            )}
          </div>
        )}

        {/* KPI Cards */}
        {kpis.length > 0 ? (
          <section className="space-y-3">
            {/* Row 1 — Operacional */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {kpisPrimary.map((kpi) => {
                const Icon   = kpiIconMap[kpi.icon] ?? Building2;
                const colors = kpiColorMap[kpi.color] ?? kpiColorMap.emerald;
                const displayValue =
                  kpi.unit === "currency" ? fmtCurrency(kpi.value)
                  : kpi.unit === "percent" ? kpi.value.toFixed(1) + "%"
                  : fmtNumber(kpi.value);
                return (
                  <div key={kpi.id} className="card card-hover p-5 flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}>
                      <Icon size={17} className={colors.text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-2xl font-bold text-gray-900 tabular-nums tracking-tight">{displayValue}</div>
                      <div className="text-xs font-medium text-gray-500 mt-1">{kpi.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Row 2 — Consolidado */}
            {kpisSecondary.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {kpisSecondary.map((kpi) => {
                  const Icon   = kpiIconMap[kpi.icon] ?? Building2;
                  const colors = kpiColorMap[kpi.color] ?? kpiColorMap.emerald;
                  const displayValue =
                    kpi.unit === "currency" ? fmtCurrency(kpi.value)
                    : kpi.unit === "percent" ? kpi.value.toFixed(1) + "%"
                    : fmtNumber(kpi.value);
                  return (
                    <div key={kpi.id} className="card card-hover p-4 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center shrink-0`}>
                        <Icon size={15} className={colors.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-lg font-bold text-gray-900 tabular-nums tracking-tight">{displayValue}</div>
                        <div className="text-[11px] font-medium text-gray-400 mt-0.5">{kpi.label}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : !loading && (
          <EmptyState compact title="Sem KPIs" description="Importe projetos do Notion ou crie registros internamente." />
        )}

        {/* Pipeline + Alertas */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <section className="card p-5 lg:p-6">
            <SectionHeader icon={<BarChart3 size={15} className="text-emerald-500" />} title="Pipeline de Projetos" />
            {pipeline.length > 0 ? (
              <>
                <div className="space-y-3">
                  {pipeline.map((s) => {
                    const total    = pipeline.reduce((sum, x) => sum + x.count, 0);
                    const widthPct = total > 0 ? Math.max(4, Math.round((s.count / total) * 100)) : 4;
                    const color    = pipelineColors[s.stage] ?? "bg-gray-400";
                    return (
                      <div key={s.stage} className="flex items-center gap-3">
                        <div className="w-28 lg:w-32 text-xs text-gray-500 text-right shrink-0 font-medium">{s.stage}</div>
                        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${color}`} style={{ width: `${widthPct}%` }} />
                        </div>
                        <div className="w-8 text-xs font-bold text-gray-900 text-right shrink-0 tabular-nums">{s.count}</div>
                      </div>
                    );
                  })}
                </div>
                {projectTypeRev.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-3 gap-3">
                    {projectTypeRev.slice(0, 3).map((pt) => (
                      <div key={pt.type} className="text-center p-2 rounded-lg bg-gray-50">
                        <div className="text-sm font-bold text-gray-900">{pt.projetos}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5 font-medium">{pt.type.split(" ")[0]}</div>
                        <div className="text-[11px] text-emerald-600 font-semibold">{fmtCurrency(pt.receita)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <EmptyState compact title="Pipeline vazio" description="Nenhum projeto registrado." />
            )}
          </section>

          <section className="card p-5 lg:p-6">
            <SectionHeader icon={<AlertTriangle size={15} className="text-amber-500" />} title="Alertas & Destaques" />
            <EmptyState compact title="Nenhum alerta" description="Nenhum alerta ou destaque pendente"
              icon={<CheckCircle size={20} className="text-emerald-500" />} />
          </section>
        </div>

        {/* Receita Trend */}
        <section className="card p-5 lg:p-6">
          <SectionHeader
            title="Receita — Últimos Meses"
            badge={
              lastMonth && prevMonth ? (
                <div className="flex items-center gap-1 ml-2">
                  <ArrowUpRight size={12} className="text-emerald-600" />
                  <span className="text-[11px] font-semibold text-emerald-600">
                    +{pct(lastMonth.receita, prevMonth.receita)}% vs mês anterior
                  </span>
                </div>
              ) : undefined
            }
          />
          {revenueData.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {revenueData.slice(-3).map((m) => {
                const margin = m.receita > 0 ? ((m.profit / m.receita) * 100).toFixed(1) : "0.0";
                return (
                  <div key={m.month} className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="text-xs text-gray-500 mb-2 font-medium">{m.month}</div>
                    <div className="text-lg font-bold text-gray-900 tabular-nums">{fmtCurrency(m.receita)}</div>
                    <div className="text-[11px] text-emerald-600 font-medium mt-1">Receita</div>
                    <div className="mt-3 pt-3 border-t border-gray-200/60 flex justify-between text-[11px]">
                      <span className="text-red-600 font-medium">{fmtCurrency(m.expenses)} despesas</span>
                      <span className="text-gray-500 font-medium">{margin}% margem</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState compact title="Sem dados de receita" description="Importe projetos para visualizar a evolução mensal." />
          )}
        </section>

        {/* Recent Projects — link to full list */}
        <section className="card p-5 lg:p-6">
          <SectionHeader icon={<Film size={15} className="text-violet-500" />} title="Projetos Recentes"
            linkLabel="Ver todos" linkHref="/caza-vision/projetos" />
          <EmptyState compact title="Acesse Projetos" description="Visualize e gerencie todos os projetos na página de Projetos." />
        </section>

      </div>
    </>
  );
}
