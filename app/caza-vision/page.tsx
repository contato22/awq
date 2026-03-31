"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { cazaRevenueData, projetos as mockProjetos, cazaAlerts } from "@/lib/caza-data";
import { fetchNotionData } from "@/lib/notion-fetch";
import {
  Building2,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  Film,
  CheckCircle2,
  Clock,
  Info,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Database,
  CloudOff,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjetoRow {
  id: string;
  titulo: string;
  prioridade: string;
  diretor: string;
  prazo: string;
  recebimento: string;
  recebido: boolean;
  valor: number;
  alimentacao: number;
  gasolina: number;
  despesas: number;
  lucro: number;
  status: string;
}

interface MonthRow {
  month: string;
  receita: number;
  alimentacao: number;
  gasolina: number;
  expenses: number;
  profit: number;
  orcamento: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n;
}

function fmtNumber(n: number) {
  return n.toLocaleString("pt-BR");
}

function pct(current: number, previous: number) {
  if (previous === 0) return "0.0";
  return (((current - previous) / previous) * 100).toFixed(1);
}

// ─── Config ───────────────────────────────────────────────────────────────────

const alertIcon: Record<string, React.ElementType> = {
  success: CheckCircle,
  info:    Info,
  warning: AlertTriangle,
  error:   AlertCircle,
};

const alertColor: Record<string, string> = {
  success: "text-emerald-600",
  info:    "text-brand-600",
  warning: "text-amber-700",
  error:   "text-red-600",
};

const kpiColorMap: Record<string, { text: string; bg: string }> = {
  emerald: { text: "text-emerald-600", bg: "bg-emerald-50" },
  brand:   { text: "text-brand-600",   bg: "bg-brand-50"   },
  violet:  { text: "text-violet-700",  bg: "bg-violet-50"  },
  amber:   { text: "text-amber-700",   bg: "bg-amber-50"   },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CazaVisionPage() {
  const [projetos, setProjetos]   = useState<ProjetoRow[]>([]);
  const [monthRows, setMonthRows] = useState<MonthRow[]>([]);
  const [source, setSource]       = useState<"notion" | "mock" | "loading">("loading");

  useEffect(() => {
    Promise.all([
      fetchNotionData("properties"),
      fetchNotionData("financial"),
    ]).then(([propsJson, finJson]) => {
      // Projects
      if (propsJson.source === "notion" && Array.isArray(propsJson.data) && propsJson.data.length > 0) {
        setProjetos(propsJson.data as ProjetoRow[]);
        setSource("notion");
      } else {
        setProjetos(
          mockProjetos.map((p) => ({
            id: p.id, titulo: p.titulo, prioridade: "", diretor: p.diretor,
            prazo: p.prazo, recebimento: "", recebido: p.status === "Entregue",
            valor: p.valor, alimentacao: 0, gasolina: 0, despesas: 0, lucro: p.valor,
            status: p.status,
          }))
        );
        setSource("mock");
      }

      // Financial
      if (finJson.source === "notion" && Array.isArray(finJson.data) && finJson.data.length > 0) {
        setMonthRows(
          (finJson.data as Record<string, unknown>[]).map((d) => ({
            month:       String(d.month       ?? ""),
            receita:     Number(d.receita     ?? 0),
            alimentacao: Number(d.alimentacao ?? 0),
            gasolina:    Number(d.gasolina    ?? 0),
            expenses:    Number(d.expenses    ?? 0),
            profit:      Number(d.profit      ?? 0),
            orcamento:   Number(d.orcamento   ?? 0),
          }))
        );
      } else {
        setMonthRows(
          cazaRevenueData.map((r) => ({
            month:       r.month,
            receita:     r.receita,
            alimentacao: Math.round(r.expenses * 0.6),
            gasolina:    Math.round(r.expenses * 0.4),
            expenses:    r.expenses,
            profit:      r.profit,
            orcamento:   r.orcamento,
          }))
        );
      }
    });
  }, []);

  // ── Computed KPIs ─────────────────────────────────────────────────────────
  const ativos      = projetos.filter((p) => !p.recebido).length;
  const entregues   = projetos.filter((p) => p.recebido).length;
  const totalValor  = projetos.reduce((s, p) => s + p.valor, 0);
  const ticketMedio = projetos.length > 0 ? Math.round(totalValor / projetos.length) : 0;

  const ytdRows    = monthRows.filter((r) => r.month.endsWith("/26"));
  const activeFin  = ytdRows.length > 0 ? ytdRows : monthRows;
  const receitaYTD = activeFin.reduce((s, r) => s + r.receita, 0);

  const lastMonth = monthRows[monthRows.length - 1];
  const prevMonth = monthRows[monthRows.length - 2];
  const last3     = monthRows.slice(-3);

  const kpis = [
    { id: "projetos",  label: "Projetos Ativos",    value: ativos,      unit: "number"   as const, icon: Building2,    color: "emerald" },
    { id: "receita",   label: "Receita YTD",        value: receitaYTD,  unit: "currency" as const, icon: DollarSign,   color: "brand"   },
    { id: "entregues", label: "Projetos Entregues", value: entregues,   unit: "number"   as const, icon: CheckCircle2, color: "violet"  },
    { id: "ticket",    label: "Ticket Médio",       value: ticketMedio, unit: "currency" as const, icon: TrendingUp,   color: "amber"   },
  ];

  // ── Pipeline from real data ────────────────────────────────────────────────
  const total       = projetos.length;
  const altaCount   = projetos.filter((p) => p.prioridade === "Alta").length;
  const mediaCount  = projetos.filter((p) => p.prioridade === "Média" || p.prioridade === "Media").length;
  const baixaCount  = projetos.filter((p) => p.prioridade === "Baixa").length;

  const pipelineItems = [
    { stage: "Total Projetos",  count: total,      color: "bg-gray-500"    },
    { stage: "Em Aberto",       count: ativos,     color: "bg-brand-500"   },
    { stage: "Recebidos",       count: entregues,  color: "bg-emerald-500" },
    ...(altaCount  > 0 ? [{ stage: "Prioridade Alta",  count: altaCount,  color: "bg-red-400"     }] : []),
    ...(mediaCount > 0 ? [{ stage: "Prioridade Média", count: mediaCount, color: "bg-amber-400"   }] : []),
    ...(baixaCount > 0 ? [{ stage: "Prioridade Baixa", count: baixaCount, color: "bg-emerald-400" }] : []),
  ];

  // Priority split for summary strip
  const priSplit = [
    { label: "Alta",  count: altaCount,  receita: projetos.filter((p) => p.prioridade === "Alta" ).reduce((s, p) => s + p.valor, 0) },
    { label: "Média", count: mediaCount, receita: projetos.filter((p) => p.prioridade === "Média" || p.prioridade === "Media").reduce((s, p) => s + p.valor, 0) },
    { label: "Baixa", count: baixaCount, receita: projetos.filter((p) => p.prioridade === "Baixa").reduce((s, p) => s + p.valor, 0) },
  ].filter((p) => p.count > 0);

  // Recent projects sorted by prazo descending
  const recentProjetos = [...projetos]
    .sort((a, b) => (b.prazo > a.prazo ? 1 : -1))
    .slice(0, 6);

  return (
    <>
      <Header title="Caza Vision" subtitle="Produtora de Conteúdo · AWQ Group" />
      <div className="px-8 py-6 space-y-6">

        {/* ── Source badge ──────────────────────────────────────────────────── */}
        {source !== "loading" && (
          <div className="flex items-center gap-2">
            {source === "notion" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-600">
                <Database size={11} /> Dados ao vivo — Notion
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700">
                <CloudOff size={11} /> Dados de demonstração
              </span>
            )}
          </div>
        )}

        {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {kpis.map((kpi) => {
            const Icon   = kpi.icon;
            const colors = kpiColorMap[kpi.color] ?? kpiColorMap.emerald;
            const displayValue =
              kpi.unit === "currency" ? fmtCurrency(kpi.value) : fmtNumber(kpi.value);
            return (
              <div key={kpi.id} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={colors.text} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-2xl font-bold text-gray-900">{displayValue}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5">{kpi.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Pipeline + Alerts ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          {/* Pipeline */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Pipeline de Projetos</h2>
            <div className="space-y-3">
              {pipelineItems.map((s) => {
                const widthPct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                return (
                  <div key={s.stage} className="flex items-center gap-3">
                    <div className="w-36 text-xs text-gray-400 text-right shrink-0">{s.stage}</div>
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${s.color}`} style={{ width: `${widthPct}%` }} />
                    </div>
                    <div className="w-8 text-xs font-semibold text-gray-900 text-right shrink-0">{s.count}</div>
                  </div>
                );
              })}
            </div>
            {/* Priority breakdown */}
            {priSplit.length > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-200 grid grid-cols-3 gap-2">
                {priSplit.slice(0, 3).map((pt) => (
                  <div key={pt.label} className="text-center">
                    <div className="text-sm font-bold text-gray-900">{pt.count}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Prioridade {pt.label}</div>
                    <div className="text-[10px] text-emerald-600">{fmtCurrency(pt.receita)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alerts */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Alertas & Destaques</h2>
            <div className="space-y-3">
              {cazaAlerts.map((alert) => {
                const Icon  = alertIcon[alert.type] ?? Info;
                const color = alertColor[alert.type] ?? "text-gray-400";
                return (
                  <div key={alert.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-100 border border-gray-300/50">
                    <Icon size={15} className={`${color} mt-0.5 shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-900">{alert.title}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{alert.message}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Receita Trend (last 3 months) ─────────────────────────────────── */}
        {last3.length > 0 && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-900">
                Receita — Últimos {last3.length} Meses
              </h2>
              {lastMonth && prevMonth && prevMonth.receita > 0 && (
                <div className="flex items-center gap-1">
                  <ArrowUpRight size={13} className="text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-600">
                    +{pct(lastMonth.receita, prevMonth.receita)}% vs mês anterior
                  </span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              {last3.map((m) => {
                const margin = m.receita > 0 ? ((m.profit / m.receita) * 100).toFixed(1) : "0.0";
                return (
                  <div key={m.month} className="p-4 rounded-xl bg-gray-100 border border-gray-300/50">
                    <div className="text-xs text-gray-500 mb-2">{m.month}</div>
                    <div className="text-lg font-bold text-gray-900">{fmtCurrency(m.receita)}</div>
                    <div className="text-[11px] text-emerald-600 mt-1">Receita</div>
                    <div className="mt-2 pt-2 border-t border-gray-300/50 flex justify-between text-[10px]">
                      <span className="text-red-600">{fmtCurrency(m.expenses)} despesas</span>
                      <span className="text-gray-500">{margin}% margem</span>
                    </div>
                    {m.orcamento > 0 && (
                      <div className="text-[10px] text-gray-400 mt-1">Orç: {fmtCurrency(m.orcamento)}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Recent Projects ───────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Projetos Recentes</h2>
            <a href="/caza-vision/imoveis" className="text-xs text-emerald-600 hover:text-emerald-300 transition-colors">
              Ver todos →
            </a>
          </div>
          {source === "loading" ? (
            <div className="flex items-center justify-center py-8 text-gray-400 text-sm gap-2">
              <AlertCircle size={16} /> Carregando…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Projeto</th>
                    <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Prioridade</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Orçamento</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Lucro</th>
                    <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Responsável</th>
                    <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Competência</th>
                    <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProjetos.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-100 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 text-gray-400 font-medium text-xs truncate max-w-[180px]">
                          <Film size={9} className="shrink-0" />
                          {p.titulo || "—"}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-xs font-semibold">
                        {p.prioridade === "Alta"  ? <span className="text-red-600">Alta</span>
                        : p.prioridade === "Média" || p.prioridade === "Media" ? <span className="text-amber-700">Média</span>
                        : p.prioridade === "Baixa" ? <span className="text-emerald-600">Baixa</span>
                        : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-900 font-semibold text-xs">
                        {p.valor > 0 ? fmtCurrency(p.valor) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 font-semibold text-xs">
                        {p.lucro > 0 ? fmtCurrency(p.lucro) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-gray-400">{p.diretor || "—"}</td>
                      <td className="py-2.5 px-3 text-xs text-gray-400">
                        {p.prazo ? p.prazo.split("T")[0] : "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        {p.recebido ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <CheckCircle2 size={9} /> Recebido
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-600 border border-brand-200">
                            <Clock size={9} /> Em Aberto
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-300">
                    <td className="py-2.5 px-3 text-xs font-bold text-gray-400">TOTAL</td>
                    <td />
                    <td className="py-2.5 px-3 text-right text-gray-900 font-bold text-xs">{fmtCurrency(totalValor)}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 font-bold text-xs">
                      {fmtCurrency(projetos.reduce((s, p) => s + (p.lucro ?? p.valor), 0))}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
