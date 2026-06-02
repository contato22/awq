"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { BankTransaction } from "@/lib/financial-db";

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);
}

function fmtBRLFull(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

// ── Build daily data ──────────────────────────────────────────────────────────
function buildDailyData(txns: BankTransaction[]) {
  const valid  = txns.filter((t) => t.transactionDate);
  const sorted = [...valid].sort((a, b) =>
    (a.transactionDate ?? "").localeCompare(b.transactionDate ?? "")
  );

  const makeLabel = (date: string) => {
    const parts = date.split("-");
    return parts.length === 3 ? `${parts[2]}/${parts[1]}` : date;
  };

  // If runningBalance is available on most transactions, use it directly
  const withBalance = sorted.filter((t) => t.runningBalance != null);
  if (withBalance.length >= sorted.length * 0.8 && sorted.length > 0) {
    const byDay: Record<string, number> = {};
    for (const t of sorted) {
      if (t.runningBalance != null) byDay[t.transactionDate] = t.runningBalance;
    }
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, saldo]) => ({ date, label: makeLabel(date), saldo }));
  }

  // Otherwise accumulate from credits/debits
  let running = 0;
  const byDay: Record<string, number> = {};
  for (const t of sorted) {
    const amt = Number(t.amount) || 0;
    running += t.direction === "credit" ? amt : -amt;
    byDay[t.transactionDate] = running;
  }
  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, saldo]) => ({ date, label: makeLabel(date), saldo }));
}

// ── Build monthly data ────────────────────────────────────────────────────────
const MONTH_LABELS: Record<string, string> = {
  "01": "Jan", "02": "Fev", "03": "Mar", "04": "Abr",
  "05": "Mai", "06": "Jun", "07": "Jul", "08": "Ago",
  "09": "Set", "10": "Out", "11": "Nov", "12": "Dez",
};

function buildMonthlyData(txns: BankTransaction[]) {
  const map: Record<string, { entradas: number; saidas: number }> = {};
  for (const t of txns) {
    if (!t.transactionDate) continue;
    const month = t.transactionDate.slice(0, 7); // YYYY-MM
    if (!map[month]) map[month] = { entradas: 0, saidas: 0 };
    const amt = Number(t.amount) || 0;
    if (t.direction === "credit") map[month].entradas += amt;
    else map[month].saidas += amt;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { entradas, saidas }]) => {
      const [, m] = month.split("-");
      return {
        month,
        label: MONTH_LABELS[m] ?? m,
        entradas,
        saidas,
        saldo: entradas - saidas,
      };
    });
}

// ── Tooltip components ────────────────────────────────────────────────────────
function DailyTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 shadow-lg text-xs">
      <div className="text-gray-400 mb-1">{label}</div>
      <div className={`font-bold ${v >= 0 ? "text-emerald-700" : "text-red-600"}`}>
        {fmtBRLFull(v)}
      </div>
    </div>
  );
}

function MonthlyTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 shadow-lg text-xs min-w-[170px]">
      <div className="text-gray-400 mb-2 font-semibold">{label}</div>
      {payload.map((e) => (
        <div key={e.name} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
            <span className="text-gray-600 capitalize">{e.name}</span>
          </div>
          <span className="font-semibold text-gray-900">{fmtBRLFull(e.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function ChartEmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="card p-5 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      <div className="h-[200px] flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-200 bg-gray-50">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="text-gray-300">
          <rect x="4" y="20" width="6" height="8" rx="1" fill="currentColor" opacity="0.4" />
          <rect x="13" y="12" width="6" height="16" rx="1" fill="currentColor" opacity="0.4" />
          <rect x="22" y="6" width="6" height="22" rx="1" fill="currentColor" opacity="0.4" />
        </svg>
        <p className="text-xs text-gray-400">Sem dados para exibir</p>
        <p className="text-[11px] text-gray-300">Sincronize o extrato Cora Enerdy para ver os gráficos</p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BalanceDailyMonthlyChart({
  transactions,
}: {
  transactions: BankTransaction[];
}) {
  const dailyData   = buildDailyData(transactions);
  const monthlyData = buildMonthlyData(transactions);

  const lastSaldo = dailyData.at(-1)?.saldo ?? 0;
  const positiveBalance = lastSaldo >= 0;

  // Limit daily chart to last 60 days for readability
  const dailyDisplay = dailyData.length > 60 ? dailyData.slice(-60) : dailyData;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

      {/* ── Saldo Diário ─────────────────────────────────────────── */}
      {dailyDisplay.length === 0 ? (
        <ChartEmptyState title="Saldo Diário" subtitle="Evolução do saldo acumulado" />
      ) : (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Saldo Diário</h3>
              <p className="text-xs text-gray-400 mt-0.5">Evolução do saldo acumulado</p>
            </div>
            <div className={`text-sm font-bold ${positiveBalance ? "text-emerald-600" : "text-red-600"}`}>
              {fmtBRLFull(lastSaldo)}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyDisplay} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={positiveBalance ? "#10b981" : "#ef4444"} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={positiveBalance ? "#10b981" : "#ef4444"} stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                interval={Math.max(0, Math.floor(dailyDisplay.length / 8) - 1)}
              />
              <YAxis
                tickFormatter={fmtBRL}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                width={64}
              />
              <Tooltip content={<DailyTooltip />} />
              <Area
                type="monotone"
                dataKey="saldo"
                name="Saldo"
                stroke={positiveBalance ? "#10b981" : "#ef4444"}
                strokeWidth={2}
                fill="url(#gradSaldo)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Saldo Mensal ─────────────────────────────────────────── */}
      {monthlyData.length === 0 ? (
        <ChartEmptyState title="Saldo Mensal" subtitle="Entradas vs Saídas por mês" />
      ) : (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Saldo Mensal</h3>
              <p className="text-xs text-gray-400 mt-0.5">Entradas vs Saídas por mês</p>
            </div>
            <div className={`text-sm font-bold ${
              (monthlyData.at(-1)?.saldo ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"
            }`}>
              {fmtBRLFull(monthlyData.at(-1)?.saldo ?? 0)}
              <span className="text-xs font-normal text-gray-400 ml-1">últ. mês</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={fmtBRL}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickLine={false}
                axisLine={false}
                width={64}
              />
              <Tooltip content={<MonthlyTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, color: "#6b7280", paddingTop: 8 }}
              />
              <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={32} />
              <Bar dataKey="saidas"   name="Saídas"   fill="#f87171" radius={[3, 3, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

    </div>
  );
}
