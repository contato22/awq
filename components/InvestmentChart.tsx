"use client";

// ─── Investment Chart ─────────────────────────────────────────────────────────
// Dois gráficos lado a lado:
//   1. Composição Patrimonial (horizontal stacked bar) — onde está o dinheiro
//      hoje: CDB DI (investido), saldo Itaú, caixa Cora.
//   2. Fluxo Mensal (bar chart) — aplicações vs resgates por mês, com linha de
//      saldo acumulado. Empty state honesto quando o pipeline não tem fluxos.

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Legend,
} from "recharts";
import { TrendingUp, Wallet } from "lucide-react";
import type { MonthlyInvestmentEntry } from "@/lib/investment-query";

interface CompositionItem {
  label: string;
  value: number;
  color: string;
  note?: string;
}

interface InvestmentChartProps {
  composition: {
    totalInvestedReal:            number | null;
    investmentCashAccountBalance: number | null;
    operationalCashBalance:       number | null;
  };
  monthlyFlow: MonthlyInvestmentEntry[];
}

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);

const fmtCompact = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 1,
  }).format(v);

const fmtMonth = (ym: string) => {
  const [y, m] = ym.split("-");
  const months = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${months[Number(m) - 1]}/${y.slice(2)}`;
};

function FlowTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg min-w-[180px]">
      <div className="text-xs font-semibold text-gray-400 mb-1.5">{fmtMonth(label ?? "")}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-xs py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-500">{entry.name}</span>
          </div>
          <span className="font-semibold text-gray-900 tabular-nums">{fmtBRL(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function InvestmentChart({ composition, monthlyFlow }: InvestmentChartProps) {
  // ── Composition data ─────────────────────────────────────────────────────────
  const items: CompositionItem[] = [
    {
      label: "Investido (CDB DI)",
      value: composition.totalInvestedReal ?? 0,
      color: "#f59e0b",
      note:  "Renda fixa — posição confirmada",
    },
    {
      label: "Saldo Itaú",
      value: composition.investmentCashAccountBalance ?? 0,
      color: "#9ca3af",
      note:  "Conta-veículo, não investido",
    },
    {
      label: "Caixa Cora",
      value: composition.operationalCashBalance ?? 0,
      color: "#10b981",
      note:  "Operacional — não investimento",
    },
  ].filter((i) => i.value > 0);

  const totalPatrimony = items.reduce((s, i) => s + i.value, 0);

  // ── Monthly flow with cumulative line ────────────────────────────────────────
  // Aggregate by month (sum across entities) and compute running cumulative.
  const byMonth = new Map<string, { applications: number; redemptions: number }>();
  for (const e of monthlyFlow) {
    const prev = byMonth.get(e.month) ?? { applications: 0, redemptions: 0 };
    byMonth.set(e.month, {
      applications: prev.applications + e.applications,
      redemptions:  prev.redemptions  + e.redemptions,
    });
  }
  const sortedMonths = Array.from(byMonth.entries()).sort(([a], [b]) => a.localeCompare(b));
  let cumulative = 0;
  const flowData = sortedMonths.map(([month, v]) => {
    cumulative += v.applications - v.redemptions;
    return {
      month,
      applications: v.applications,
      redemptions:  -v.redemptions, // negative for visual contrast (below axis)
      cumulative,
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ── Composição Patrimonial ────────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Wallet size={15} className="text-brand-500" />
          <h2 className="text-sm font-semibold text-gray-900">Composição Patrimonial</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Alocação do patrimônio observado · {fmtBRL(totalPatrimony)} total
        </p>

        {items.length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-12">
            Nenhum saldo patrimonial confirmado.
          </div>
        ) : (
          <>
            {/* Horizontal stacked bar */}
            <div className="flex w-full h-8 rounded-lg overflow-hidden border border-gray-100">
              {items.map((i) => (
                <div
                  key={i.label}
                  style={{
                    width: `${(i.value / totalPatrimony) * 100}%`,
                    backgroundColor: i.color,
                  }}
                  title={`${i.label}: ${fmtBRL(i.value)}`}
                />
              ))}
            </div>

            {/* Legend with values */}
            <div className="mt-4 space-y-2">
              {items.map((i) => {
                const pct = (i.value / totalPatrimony) * 100;
                return (
                  <div key={i.label} className="flex items-center gap-3 text-xs">
                    <span
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: i.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 truncate">{i.label}</div>
                      {i.note && <div className="text-xs text-gray-400">{i.note}</div>}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-gray-900 tabular-nums">{fmtBRL(i.value)}</div>
                      <div className="text-xs text-gray-400 tabular-nums">{pct.toFixed(1)}%</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 leading-relaxed">
              Apenas <span className="font-semibold text-amber-600">CDB DI</span> conta como
              investimento. Saldo Itaú e caixa Cora aparecem para contexto de liquidez —
              não inflam <code className="font-mono bg-gray-100 px-1 rounded text-xs">totalInvestedReal</code>.
            </div>
          </>
        )}
      </div>

      {/* ── Fluxo Mensal ──────────────────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp size={15} className="text-brand-500" />
          <h2 className="text-sm font-semibold text-gray-900">Fluxo Mensal de Investimento</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Aplicações vs Resgates por mês · linha = saldo acumulado
        </p>

        {flowData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <TrendingUp size={28} className="text-gray-200 mb-3" />
            <p className="text-xs text-gray-400 max-w-[260px] leading-relaxed">
              Nenhum fluxo de investimento no pipeline ainda. Classifique transações como{" "}
              <code className="font-mono bg-gray-100 px-1 rounded text-xs">aplicacao_financeira</code> ou{" "}
              <code className="font-mono bg-gray-100 px-1 rounded text-xs">resgate_financeiro</code> em{" "}
              <a href="/awq/conciliacao" className="text-brand-500 underline">/awq/conciliacao</a>.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart
              data={flowData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="month"
                tickFormatter={fmtMonth}
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmtCompact}
                width={55}
              />
              <Tooltip content={<FlowTooltip />} cursor={{ fill: "#f3f4f6" }} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                iconType="circle"
                iconSize={8}
              />
              <Bar dataKey="applications" name="Aplicações" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="redemptions" name="Resgates" fill="#10b981" radius={[0, 0, 4, 4]} />
              <Line
                type="monotone"
                dataKey="cumulative"
                name="Saldo acumulado"
                stroke="#1476c6"
                strokeWidth={2}
                dot={{ r: 3, fill: "#1476c6" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
