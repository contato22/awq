"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { cazaRevenueData, projectTypeRevenue, type CazaRevenuePoint } from "@/lib/caza-data";
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Database,
  CloudOff,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CazaFinancialPage() {
  const [rows, setRows] = useState<CazaRevenuePoint[]>(cazaRevenueData);
  const [notionSource, setNotionSource] = useState<"notion" | "mock" | "loading">("loading");
  const [notionError, setNotionError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/notion?database=financial")
      .then((r) => r.json())
      .then((json) => {
        if (json.source === "notion" && Array.isArray(json.data) && json.data.length > 0) {
          const mapped: CazaRevenuePoint[] = json.data.map(
            (d: Record<string, unknown>) => ({
              month:    String(d.month ?? ""),
              receita:  Number(d.receita ?? 0),
              expenses: Number(d.expenses ?? 0),
              profit:   Number(d.profit ?? 0),
              orcamento:Number(d.orcamento ?? 0),
            })
          );
          setRows(mapped);
          setNotionSource("notion");
        } else {
          setNotionSource("mock");
          setNotionError(json.error ?? null);
        }
      })
      .catch(() => {
        setNotionSource("mock");
        setNotionError("Falha ao conectar com Notion");
      });
  }, []);

  // Compute summary from current rows (2026 only for YTD)
  const rows2026 = rows.filter((r) => r.month.includes("26") || !r.month.match(/\d{2}$/));
  const dataForSummary = rows2026.length > 0 ? rows2026 : rows;

  const totalReceita  = dataForSummary.reduce((s, r) => s + r.receita, 0);
  const totalExpenses = dataForSummary.reduce((s, r) => s + r.expenses, 0);
  const totalProfit   = dataForSummary.reduce((s, r) => s + r.profit, 0);
  const totalOrcamento= dataForSummary.reduce((s, r) => s + r.orcamento, 0);

  const lastRow = rows[rows.length - 1];
  const prevRow = rows[rows.length - 2];
  const lastDelta = prevRow ? (((lastRow.receita - prevRow.receita) / prevRow.receita) * 100).toFixed(1) : "0.0";
  const overallMargin = totalReceita > 0 ? ((totalProfit / totalReceita) * 100).toFixed(1) : "0.0";

  const summaryCards = [
    {
      label: "Receita Total (YTD 2026)",
      value: fmtR(totalReceita),
      sub:   `Margem ${overallMargin}%`,
      icon:  DollarSign,
      color: "text-emerald-400",
      bg:    "bg-emerald-500/10",
      up:    true,
      delta: "+24.0%",
    },
    {
      label: "Lucro Líquido (YTD)",
      value: fmtR(totalProfit),
      sub:   `Despesas: ${fmtR(totalExpenses)}`,
      icon:  TrendingUp,
      color: "text-brand-400",
      bg:    "bg-brand-500/10",
      up:    true,
      delta: "+26.3%",
    },
    {
      label: `Receita — ${lastRow.month}`,
      value: fmtR(lastRow.receita),
      sub:   "Melhor mês do período",
      icon:  BarChart3,
      color: "text-violet-400",
      bg:    "bg-violet-500/10",
      up:    parseFloat(lastDelta) >= 0,
      delta: `${parseFloat(lastDelta) >= 0 ? "+" : ""}${lastDelta}%`,
    },
    {
      label: "Orç. Gerenciado (VPG)",
      value: fmtR(totalOrcamento),
      sub:   `${dataForSummary.length} meses acumulados`,
      icon:  DollarSign,
      color: "text-amber-400",
      bg:    "bg-amber-500/10",
      up:    true,
      delta: "+31.5%",
    },
  ];

  return (
    <>
      <Header
        title="Financial — Caza Vision"
        subtitle="Receita, margem e volume de projetos de produção"
      />
      <div className="px-8 py-6 space-y-6">

        {/* ── Data source badge ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          {notionSource === "loading" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-800 border border-gray-700 text-xs text-gray-400">
              <Database size={11} />
              Conectando ao Notion…
            </span>
          )}
          {notionSource === "notion" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
              <Database size={11} />
              Dados ao vivo — Notion
            </span>
          )}
          {notionSource === "mock" && (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400"
              title={notionError ?? ""}
            >
              <CloudOff size={11} />
              Dados de demonstração
              {notionError && <span className="text-[10px] text-gray-500 ml-1">({notionError})</span>}
            </span>
          )}
        </div>

        {/* ── Summary Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-2xl font-bold text-white">{card.value}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5">{card.label}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {card.up ? (
                      <ArrowUpRight size={11} className="text-emerald-400" />
                    ) : (
                      <ArrowDownRight size={11} className="text-red-400" />
                    )}
                    <span className={`text-[10px] font-semibold ${card.up ? "text-emerald-400" : "text-red-400"}`}>
                      {card.delta}
                    </span>
                    <span className="text-[10px] text-gray-600">{card.sub}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Monthly Revenue Table ─────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Evolução de Receita Mensal</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Mês</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Receita</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Despesas</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Lucro</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Margem</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Orç. Gerenciado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const margin = row.receita > 0 ? ((row.profit / row.receita) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={row.month} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="py-2.5 px-3 text-gray-300 font-medium">{row.month}</td>
                      <td className="py-2.5 px-3 text-right text-white font-semibold">{fmtR(row.receita)}</td>
                      <td className="py-2.5 px-3 text-right text-red-400">{fmtR(row.expenses)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">{fmtR(row.profit)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="badge badge-green">{margin}%</span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-400">{fmtR(row.orcamento)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Revenue by Project Type ───────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Receita por Tipo de Projeto</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Tipo</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Projetos</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Receita</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Ticket Médio</th>
                </tr>
              </thead>
              <tbody>
                {projectTypeRevenue.map((pt) => (
                  <tr key={pt.type} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="py-2.5 px-3 text-gray-300 font-medium">{pt.type}</td>
                    <td className="py-2.5 px-3 text-right text-brand-400">{pt.projetos.toLocaleString("pt-BR")}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">{fmtR(pt.receita)}</td>
                    <td className="py-2.5 px-3 text-right text-gray-400">{fmtR(pt.avgValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}
