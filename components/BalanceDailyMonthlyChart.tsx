"use client";

import type { BankTransaction } from "@/lib/financial-db";

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtFull(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function fmtCompact(v: number) {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000)     return `R$${(v / 1_000).toFixed(0)}k`;
  return `R$${v.toFixed(0)}`;
}

// ── Build daily data ──────────────────────────────────────────────────────────
function buildDailyData(txns: BankTransaction[]) {
  const valid  = txns.filter((t) => t.transactionDate);
  const sorted = [...valid].sort((a, b) => (a.transactionDate ?? "").localeCompare(b.transactionDate ?? ""));

  const makeLabel = (date: string) => {
    const p = date.split("-");
    return p.length === 3 ? `${p[2]}/${p[1]}` : date;
  };

  const withBal = sorted.filter((t) => t.runningBalance != null);
  if (withBal.length >= sorted.length * 0.8 && sorted.length > 0) {
    const byDay: Record<string, number> = {};
    for (const t of sorted) {
      if (t.runningBalance != null) byDay[t.transactionDate] = t.runningBalance;
    }
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, saldo]) => ({ label: makeLabel(date), saldo }));
  }

  let running = 0;
  const byDay: Record<string, number> = {};
  for (const t of sorted) {
    const amt = Number(t.amount) || 0;
    running += t.direction === "credit" ? amt : -amt;
    byDay[t.transactionDate] = running;
  }
  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, saldo]) => ({ label: makeLabel(date), saldo }));
}

// ── Build monthly data ────────────────────────────────────────────────────────
const MONTHS: Record<string, string> = {
  "01": "Jan","02": "Fev","03": "Mar","04": "Abr",
  "05": "Mai","06": "Jun","07": "Jul","08": "Ago",
  "09": "Set","10": "Out","11": "Nov","12": "Dez",
};

function buildMonthlyData(txns: BankTransaction[]) {
  const map: Record<string, { entradas: number; saidas: number }> = {};
  for (const t of txns) {
    if (!t.transactionDate) continue;
    const month = t.transactionDate.slice(0, 7);
    if (!map[month]) map[month] = { entradas: 0, saidas: 0 };
    const amt = Number(t.amount) || 0;
    if (t.direction === "credit") map[month].entradas += amt;
    else map[month].saidas += amt;
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { entradas, saidas }]) => ({
      label: MONTHS[month.slice(5, 7)] ?? month.slice(5, 7),
      entradas,
      saidas,
      saldo: entradas - saidas,
    }));
}

// ── SVG Line Chart (Saldo Diário) ─────────────────────────────────────────────
function LineChart({ data, positive }: { data: { label: string; saldo: number }[]; positive: boolean }) {
  const W = 500, H = 170;
  const PAD = { t: 10, r: 8, b: 26, l: 58 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;

  const ys = data.map((d) => d.saldo);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeY = maxY === minY ? Math.abs(maxY) || 1 : maxY - minY;

  const px = (i: number) =>
    PAD.l + (data.length > 1 ? (i / (data.length - 1)) : 0.5) * cW;
  const py = (v: number) =>
    PAD.t + cH - ((v - minY) / rangeY) * cH;

  const ptLine = data.map((d, i) => `${px(i).toFixed(1)},${py(d.saldo).toFixed(1)}`).join(" ");
  const ptFill = [
    `${PAD.l.toFixed(1)},${(PAD.t + cH).toFixed(1)}`,
    ...data.map((d, i) => `${px(i).toFixed(1)},${py(d.saldo).toFixed(1)}`),
    `${(PAD.l + cW).toFixed(1)},${(PAD.t + cH).toFixed(1)}`,
  ].join(" ");

  const color = positive ? "#10b981" : "#ef4444";
  const gridYs = [0, 1, 2, 3].map((i) => ({
    v: minY + (rangeY * (3 - i)) / 3,
    y: PAD.t + (cH * i) / 3,
  }));
  const step = Math.max(1, Math.floor(data.length / 7));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ display: "block", height: 170 }}>
      {gridYs.map(({ v, y }) => (
        <g key={y}>
          <line x1={PAD.l} y1={y} x2={PAD.l + cW} y2={y} stroke="#f3f4f6" strokeWidth={1} />
          <text x={PAD.l - 5} y={y + 3.5} textAnchor="end" fontSize={9} fill="#9ca3af">
            {fmtCompact(v)}
          </text>
        </g>
      ))}
      <polygon points={ptFill} fill={color} fillOpacity={0.12} />
      <polyline points={ptLine} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => {
        if (i % step !== 0 && i !== data.length - 1) return null;
        return (
          <text key={i} x={px(i)} y={H - 6} textAnchor="middle" fontSize={9} fill="#9ca3af">
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}

// ── CSS Bar Chart (Saldo Mensal) ──────────────────────────────────────────────
function BarChart({ data }: { data: { label: string; entradas: number; saidas: number }[] }) {
  const maxV = Math.max(...data.flatMap((d) => [d.entradas, d.saidas]), 1);
  return (
    <div className="w-full" style={{ height: 170 }}>
      <div className="flex items-end justify-around gap-1 h-[140px] px-2">
        {data.map((d) => (
          <div key={d.label} className="flex flex-col items-center gap-0 flex-1 min-w-0 h-full justify-end">
            <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: "100%" }}>
              <div
                className="rounded-t flex-1 bg-emerald-500 min-w-[4px]"
                style={{ height: `${Math.max(2, (d.entradas / maxV) * 100)}%` }}
                title={`Entradas: ${fmtFull(d.entradas)}`}
              />
              <div
                className="rounded-t flex-1 bg-red-400 min-w-[4px]"
                style={{ height: `${Math.max(2, (d.saidas / maxV) * 100)}%` }}
                title={`Saídas: ${fmtFull(d.saidas)}`}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-around gap-1 px-2 mt-1">
        {data.map((d) => (
          <span key={d.label} className="flex-1 text-center text-[9px] text-gray-400 truncate">
            {d.label}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          <span className="text-[10px] text-gray-500">Entradas</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
          <span className="text-[10px] text-gray-500">Saídas</span>
        </div>
      </div>
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
      <div className="h-[170px] flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-gray-200 bg-gray-50">
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="text-gray-300">
          <rect x="4" y="20" width="6" height="8" rx="1" fill="currentColor" opacity="0.4" />
          <rect x="13" y="12" width="6" height="16" rx="1" fill="currentColor" opacity="0.4" />
          <rect x="22" y="6" width="6" height="22" rx="1" fill="currentColor" opacity="0.4" />
        </svg>
        <p className="text-xs text-gray-400">Sem dados para exibir</p>
        <p className="text-[11px] text-gray-300">Sincronize o extrato Cora Enerdy</p>
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
  const daily   = buildDailyData(transactions);
  const monthly = buildMonthlyData(transactions);
  const display = daily.length > 60 ? daily.slice(-60) : daily;
  const lastSaldo = display.at(-1)?.saldo ?? 0;
  const positive  = lastSaldo >= 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

      {/* ── Saldo Diário ─────────────────────────────────────────── */}
      {display.length === 0 ? (
        <ChartEmptyState title="Saldo Diário" subtitle="Evolução do saldo acumulado" />
      ) : (
        <div className="card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Saldo Diário</h3>
              <p className="text-xs text-gray-400 mt-0.5">Evolução do saldo acumulado</p>
            </div>
            <span className={`text-sm font-bold ${positive ? "text-emerald-600" : "text-red-600"}`}>
              {fmtFull(lastSaldo)}
            </span>
          </div>
          <LineChart data={display} positive={positive} />
        </div>
      )}

      {/* ── Saldo Mensal ─────────────────────────────────────────── */}
      {monthly.length === 0 ? (
        <ChartEmptyState title="Saldo Mensal" subtitle="Entradas vs Saídas por mês" />
      ) : (
        <div className="card p-5 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Saldo Mensal</h3>
              <p className="text-xs text-gray-400 mt-0.5">Entradas vs Saídas por mês</p>
            </div>
            <span className={`text-sm font-bold ${(monthly.at(-1)?.saldo ?? 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {fmtFull(monthly.at(-1)?.saldo ?? 0)}
              <span className="text-xs font-normal text-gray-400 ml-1">últ. mês</span>
            </span>
          </div>
          <BarChart data={monthly} />
        </div>
      )}

    </div>
  );
}
