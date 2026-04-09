"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { cazaRevenueData } from "@/lib/caza-data";
import { fetchNotionData } from "@/lib/notion-fetch";
import {
  DollarSign,
  TrendingUp,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Database,
  CloudOff,
  Minus,
  AlertTriangle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MonthRow {
  month:       string;
  receita:     number; // sum of Orçamento
  alimentacao: number; // sum of Alimentação
  gasolina:    number; // sum of Gasolina
  expenses:    number; // alimentacao + gasolina
  profit:      number; // receita - expenses
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

// ─── Budget vs Actual Data ────────────────────────────────────────────────────

const budgetVsActual: { month: string; budgetReceita: number; budgetLucro: number }[] = [];

function variance(actual: number, budget: number) {
  if (budget === 0) return 0;
  return ((actual - budget) / budget) * 100;
}

function varIcon(v: number) {
  if (v > 0.5) return <ArrowUpRight size={10} className="text-emerald-600" />;
  if (v < -0.5) return <ArrowDownRight size={10} className="text-red-600" />;
  return <Minus size={10} className="text-gray-500" />;
}

function varColor(v: number) {
  if (v > 0.5) return "text-emerald-600";
  if (v < -0.5) return "text-red-600";
  return "text-gray-500";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CazaFinancialPage() {
  const [rows, setRows]           = useState<MonthRow[]>([]);
  const [source, setSource]       = useState<"notion" | "mock" | "loading">("loading");
  const [notionError, setNotionError] = useState<string | null>(null);

  // Fallback mock rows (from demo data)
  const mockRows: MonthRow[] = cazaRevenueData.map((r) => ({
    month:       r.month,
    receita:     r.receita,
    alimentacao: Math.round(r.expenses * 0.6), // mock split: 60% food, 40% fuel
    gasolina:    Math.round(r.expenses * 0.4),
    expenses:    r.expenses,
    profit:      r.profit,
  }));

  useEffect(() => {
    fetchNotionData("financial").then((json) => {
      if (json.source === "notion" && Array.isArray(json.data) && json.data.length > 0) {
        const mapped: MonthRow[] = (json.data as Record<string, unknown>[]).map((d) => ({
          month:       String(d.month       ?? ""),
          receita:     Number(d.receita     ?? 0),
          alimentacao: Number(d.alimentacao ?? 0),
          gasolina:    Number(d.gasolina    ?? 0),
          expenses:    Number(d.expenses    ?? 0),
          profit:      Number(d.profit      ?? 0),
        }));
        setRows(mapped);
        setSource("notion");
      } else {
        setRows(mockRows);
        setSource("mock");
        setNotionError(json.error ?? null);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Summaries ───────────────────────────────────────────────────────────────
  const ytdRows   = rows.filter((r) => r.month.includes("/26"));
  const summary   = ytdRows.length > 0 ? ytdRows : rows;

  const totalReceita  = summary.reduce((s, r) => s + r.receita,  0);
  const totalDespesas = summary.reduce((s, r) => s + r.expenses, 0);
  const totalLucro    = summary.reduce((s, r) => s + r.profit,   0);
  const margem        = totalReceita > 0 ? ((totalLucro / totalReceita) * 100).toFixed(1) : "0.0";

  const lastRow  = rows[rows.length - 1];
  const prevRow  = rows[rows.length - 2];
  const lastDelta = lastRow && prevRow && prevRow.receita > 0
    ? (((lastRow.receita - prevRow.receita) / prevRow.receita) * 100).toFixed(1)
    : "0.0";

  // Calculate YoY delta: compare YTD sum this year vs same months last year
  const prevYtdRows  = rows.filter((r) => r.month.includes("/25")).slice(0, ytdRows.length || summary.length);
  const prevReceita  = prevYtdRows.reduce((s, r) => s + r.receita, 0);
  const prevLucro    = prevYtdRows.reduce((s, r) => s + r.profit,  0);
  const receitaDelta = prevReceita > 0 ? (((totalReceita - prevReceita) / prevReceita) * 100).toFixed(1) : null;
  const lucroDelta   = prevLucro   > 0 ? (((totalLucro   - prevLucro)   / prevLucro)   * 100).toFixed(1) : null;

  const summaryCards = [
    {
      label: `Receita YTD ${ytdRows.length > 0 ? "2026" : ""}`.trim(),
      value: fmtR(totalReceita),
      sub:   `${summary.length} meses`,
      icon:  DollarSign,
      color: "text-emerald-600",
      bg:    "bg-emerald-50",
      delta: receitaDelta ? `${parseFloat(receitaDelta) >= 0 ? "+" : ""}${receitaDelta}%` : "",
      up:    receitaDelta ? parseFloat(receitaDelta) >= 0 : true,
    },
    {
      label: "Despesas YTD",
      value: fmtR(totalDespesas),
      sub:   "Alim. + Gasolina",
      icon:  BarChart3,
      color: "text-red-600",
      bg:    "bg-red-50",
      delta: "",
      up:    false,
    },
    {
      label: "Lucro Líquido YTD",
      value: fmtR(totalLucro),
      sub:   `Margem ${margem}%`,
      icon:  TrendingUp,
      color: "text-brand-600",
      bg:    "bg-brand-50",
      delta: lucroDelta ? `${parseFloat(lucroDelta) >= 0 ? "+" : ""}${lucroDelta}%` : "",
      up:    lucroDelta ? parseFloat(lucroDelta) >= 0 : true,
    },
    {
      label: lastRow ? `Receita — ${lastRow.month}` : "Último Mês",
      value: lastRow ? fmtR(lastRow.receita) : "—",
      sub:   lastRow ? `Lucro: ${fmtR(lastRow.profit)}` : "",
      icon:  DollarSign,
      color: "text-violet-700",
      bg:    "bg-violet-50",
      delta: `${parseFloat(lastDelta) >= 0 ? "+" : ""}${lastDelta}%`,
      up:    parseFloat(lastDelta) >= 0,
    },
  ];

  return (
    <>
      <Header
        title="Financial — Caza Vision"
        subtitle="Receita, despesas e lucro por projeto · agrupado por mês"
      />
      <div className="page-container">

        {/* ── Banking notice ───────────────────────────────────────────────── */}
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800">
                Receita por projeto vem do Notion (accrual/competência) — não derivada da base bancária.
              </p>
              <p className="text-[11px] text-amber-600 mt-0.5">
                Para caixa real da Caza Vision, acesse{" "}
                <a href="/awq/financial" className="underline font-medium">/awq/financial</a>{" "}
                ou{" "}
                <a href="/awq/cashflow" className="underline font-medium">/awq/cashflow</a>.
              </p>
            </div>
          </div>
        </div>

        {/* ── Source badge ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          {source === "loading" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs text-gray-500">
              <Database size={11} /> Conectando ao Notion…
            </span>
          )}
          {source === "notion" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-600">
              <Database size={11} /> Dados ao vivo — Notion
            </span>
          )}
          {source === "mock" && (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700"
              title={notionError ?? ""}
            >
              <CloudOff size={11} /> Dados de demonstração
              {notionError && (
                <span className="text-[10px] text-gray-500 ml-1">({notionError})</span>
              )}
            </span>
          )}
        </div>

        {/* ── Summary Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={card.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5">{card.label}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {card.delta && (
                      card.up
                        ? <ArrowUpRight size={11} className="text-emerald-600" />
                        : <ArrowDownRight size={11} className="text-red-600" />
                    )}
                    {card.delta && (
                      <span className={`text-[10px] font-semibold ${card.up ? "text-emerald-600" : "text-red-600"}`}>
                        {card.delta}
                      </span>
                    )}
                    <span className="text-[10px] text-gray-400">{card.sub}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Monthly Table ─────────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            Receita por Mês — agrupado por COMPETÊNCIA
          </h2>
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Mês</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Receita (Orç.)</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Alimentação</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Gasolina</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Total Despesas</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Lucro</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Margem</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const margin = row.receita > 0
                    ? ((row.profit / row.receita) * 100).toFixed(1)
                    : "0.0";
                  return (
                    <tr key={row.month} className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-gray-400 font-medium">{row.month}</td>
                      <td className="py-2.5 px-3 text-right text-gray-900 font-semibold">{fmtR(row.receita)}</td>
                      <td className="py-2.5 px-3 text-right text-red-600 text-xs">
                        {row.alimentacao > 0 ? fmtR(row.alimentacao) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-red-600 text-xs">
                        {row.gasolina > 0 ? fmtR(row.gasolina) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-red-600 font-semibold">{fmtR(row.expenses)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 font-semibold">{fmtR(row.profit)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <span className="badge badge-green">{margin}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-300">
                  <td className="py-2.5 px-3 text-xs font-bold text-gray-400">TOTAL</td>
                  <td className="py-2.5 px-3 text-right text-gray-900 font-bold">{fmtR(rows.reduce((s, r) => s + r.receita, 0))}</td>
                  <td className="py-2.5 px-3 text-right text-red-600 font-bold text-xs">{fmtR(rows.reduce((s, r) => s + r.alimentacao, 0))}</td>
                  <td className="py-2.5 px-3 text-right text-red-600 font-bold text-xs">{fmtR(rows.reduce((s, r) => s + r.gasolina, 0))}</td>
                  <td className="py-2.5 px-3 text-right text-red-600 font-bold">{fmtR(rows.reduce((s, r) => s + r.expenses, 0))}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">{fmtR(rows.reduce((s, r) => s + r.profit, 0))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── Budget vs Actual ──────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Budget vs Actual — 2026</h2>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5 text-gray-500"><span className="w-3 h-0.5 bg-gray-600 inline-block rounded" /> Budget</span>
              <span className="flex items-center gap-1.5 text-emerald-600"><span className="w-3 h-0.5 bg-emerald-400 inline-block rounded" /> Realizado</span>
            </div>
          </div>
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Mês</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Budget Receita</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Realizado</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Var. Receita</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Budget Lucro</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Lucro Real</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Var. Lucro</th>
                </tr>
              </thead>
              <tbody>
                {budgetVsActual.map((b) => {
                  const actual = rows.find((r) => r.month === b.month);
                  if (!actual) return null;
                  const varR = variance(actual.receita, b.budgetReceita);
                  const varL = variance(actual.profit,  b.budgetLucro);
                  return (
                    <tr key={b.month} className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors">
                      <td className="py-2.5 px-3 text-xs font-medium text-gray-400">{b.month}</td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-500">{fmtR(b.budgetReceita)}</td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-900">{fmtR(actual.receita)}</td>
                      <td className="py-2.5 px-3 text-right text-xs">
                        <span className={`flex items-center justify-end gap-0.5 font-semibold ${varColor(varR)}`}>
                          {varIcon(varR)}{varR >= 0 ? "+" : ""}{varR.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-500">{fmtR(b.budgetLucro)}</td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold text-emerald-600">{fmtR(actual.profit)}</td>
                      <td className="py-2.5 px-3 text-right text-xs">
                        <span className={`flex items-center justify-end gap-0.5 font-semibold ${varColor(varL)}`}>
                          {varIcon(varL)}{varL >= 0 ? "+" : ""}{varL.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
}
