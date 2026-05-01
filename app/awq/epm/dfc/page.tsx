// ─── /awq/epm/dfc — DFC (Demonstração de Fluxo de Caixa) ─────────────────────
//
// DATA SOURCE: getDFCByMonth() from lib/ap-ar-db.ts
//   Cash-basis: uses payment_date (AP paid) and received_date (AR received).
//   Only PAID/RECEIVED items are counted — pending items appear in AR/AP pages.
//
// KEY INSIGHT: DFC uses caixa regime — payment_date, NOT accrual_month.

import Header from "@/components/Header";
import Link from "next/link";
import {
  TrendingUp, TrendingDown, DollarSign, ArrowDownLeft, ArrowUpRight,
  Database, ChevronRight, Activity,
} from "lucide-react";
import { initAllAPARTables, getDFCByMonth } from "@/lib/ap-ar-db";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBRL(n: number): string {
  const abs  = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000)     return sign + "R$" + (abs / 1_000).toFixed(0)     + "K";
  return sign + "R$" + abs.toLocaleString("pt-BR", { minimumFractionDigits: 0 });
}

function fmtMonth(ym: string): string {
  const [y, m] = ym.split("-");
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${months[parseInt(m) - 1]} ${y}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DFCPage() {
  await initAllAPARTables();
  const dfcLines = await getDFCByMonth();

  const totalInflows  = dfcLines.reduce((s, l) => s + l.totalInflows,  0);
  const totalOutflows = dfcLines.reduce((s, l) => s + l.totalOutflows, 0);
  const netCash       = totalInflows - totalOutflows;

  // Running balance per month (cumulative)
  let running = 0;
  const withRunning = dfcLines.map((l) => {
    running += l.netCash;
    return { ...l, runningBalance: running };
  });

  // Category breakdown across all months
  const inflowByCustomer: Record<string, number> = {};
  const outflowByCategory: Record<string, number> = {};
  for (const line of dfcLines) {
    for (const ar of line.inflows) {
      inflowByCustomer[ar.customer_name] = (inflowByCustomer[ar.customer_name] ?? 0) + (ar.received_amount ?? ar.net_amount);
    }
    for (const ap of line.outflows) {
      outflowByCategory[ap.category] = (outflowByCategory[ap.category] ?? 0) + (ap.paid_amount ?? ap.net_amount);
    }
  }

  const topCustomers = Object.entries(inflowByCustomer)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const topCategories = Object.entries(outflowByCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  if (dfcLines.length === 0) {
    return (
      <>
        <Header
          title="DFC — Fluxo de Caixa"
          subtitle="Regime de Caixa · AP/AR · AWQ Group"
        />
        <div className="page-container">
          <div className="card p-16 flex flex-col items-center gap-4 text-center">
            <Database size={40} className="text-gray-200" />
            <div className="text-sm font-semibold text-gray-400">Sem movimentações de caixa ainda</div>
            <div className="text-xs text-gray-400 max-w-sm">
              O DFC é gerado a partir de pagamentos realizados (AP pago) e recebimentos
              confirmados (AR recebido). Registre pagamentos nas páginas AP e AR.
            </div>
            <div className="flex items-center gap-3 mt-2">
              <Link
                href="/awq/epm/ap"
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                <ArrowDownLeft size={13} /> Contas a Pagar
              </Link>
              <Link
                href="/awq/epm/ar"
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                <ArrowUpRight size={13} /> Contas a Receber
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header
        title="DFC — Demonstração de Fluxo de Caixa"
        subtitle={`Regime de Caixa · ${dfcLines.length} mês(es) · ${fmtMonth(dfcLines[dfcLines.length - 1].month)} → ${fmtMonth(dfcLines[0].month)}`}
      />
      <div className="page-container">

        {/* ── Summary cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Entradas",    value: totalInflows,  icon: ArrowUpRight,  color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Total Saídas",      value: totalOutflows, icon: ArrowDownLeft, color: "text-red-600",     bg: "bg-red-50"     },
            { label: "Saldo Líquido",     value: netCash,       icon: DollarSign,    color: netCash >= 0 ? "text-emerald-700" : "text-red-700", bg: netCash >= 0 ? "bg-emerald-50" : "bg-red-50" },
            { label: "Meses",             value: dfcLines.length, icon: Activity,    color: "text-brand-600",   bg: "bg-brand-50",  raw: true },
          ].map((card) => {
            const Icon = card.icon;
            const display = (card as { raw?: boolean }).raw
              ? String(card.value)
              : fmtBRL(Number(card.value));
            return (
              <div key={card.label} className="card p-4 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={16} className={card.color} />
                </div>
                <div>
                  <div className={`text-lg font-bold tabular-nums ${(card as { color: string }).color}`}>{display}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{card.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Monthly Cash Flow table ───────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
            <span className="text-sm font-bold text-gray-900">Fluxo de Caixa por Mês</span>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest">Regime de Caixa</span>
          </div>
          <div className="table-scroll">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="py-2 px-3 text-gray-500 font-semibold">Mês</th>
                  <th className="py-2 px-3 text-gray-500 font-semibold text-right">Entradas (AR)</th>
                  <th className="py-2 px-3 text-gray-500 font-semibold text-right">Saídas (AP)</th>
                  <th className="py-2 px-3 text-gray-500 font-semibold text-right">Saldo Líquido</th>
                  <th className="py-2 px-3 text-gray-500 font-semibold text-right">Saldo Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {[...withRunning].reverse().map((line) => {
                  const positive = line.netCash >= 0;
                  return (
                    <tr key={line.month} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-medium text-gray-800">{fmtMonth(line.month)}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 font-semibold tabular-nums">
                        {fmtBRL(line.totalInflows)}
                        <span className="ml-1.5 text-[10px] text-gray-400">({line.inflows.length})</span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-red-600 font-semibold tabular-nums">
                        ({fmtBRL(line.totalOutflows)})
                        <span className="ml-1.5 text-[10px] text-gray-400">({line.outflows.length})</span>
                      </td>
                      <td className={`py-2.5 px-3 text-right font-bold tabular-nums ${positive ? "text-emerald-700" : "text-red-700"}`}>
                        {positive ? "+" : ""}{fmtBRL(line.netCash)}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-semibold tabular-nums ${line.runningBalance >= 0 ? "text-brand-700" : "text-red-700"}`}>
                        {fmtBRL(line.runningBalance)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                  <td className="py-2.5 px-3 text-gray-900 text-sm">TOTAL</td>
                  <td className="py-2.5 px-3 text-right text-emerald-700 tabular-nums">{fmtBRL(totalInflows)}</td>
                  <td className="py-2.5 px-3 text-right text-red-700 tabular-nums">({fmtBRL(totalOutflows)})</td>
                  <td className={`py-2.5 px-3 text-right tabular-nums ${netCash >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                    {netCash >= 0 ? "+" : ""}{fmtBRL(netCash)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-gray-500 tabular-nums">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Two-column breakdown ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Entradas por cliente */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} className="text-emerald-600" />
              <span className="text-sm font-semibold text-gray-900">Entradas — Top Clientes</span>
            </div>
            {topCustomers.length === 0 ? (
              <div className="text-xs text-gray-400 py-6 text-center">Sem entradas registradas</div>
            ) : (
              <div className="space-y-2">
                {topCustomers.map(([customer, amount]) => {
                  const pct = totalInflows > 0 ? (amount / totalInflows) * 100 : 0;
                  return (
                    <div key={customer} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-gray-700 truncate">{customer}</span>
                          <span className="text-xs font-semibold text-emerald-700 tabular-nums shrink-0 ml-2">
                            {fmtBRL(amount)}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-400 rounded-full"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{pct.toFixed(1)}% do total</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Saídas por categoria */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown size={14} className="text-red-600" />
              <span className="text-sm font-semibold text-gray-900">Saídas — Top Categorias</span>
            </div>
            {topCategories.length === 0 ? (
              <div className="text-xs text-gray-400 py-6 text-center">Sem saídas registradas</div>
            ) : (
              <div className="space-y-2">
                {topCategories.map(([category, amount]) => {
                  const pct = totalOutflows > 0 ? (amount / totalOutflows) * 100 : 0;
                  return (
                    <div key={category} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-gray-700 truncate">{category}</span>
                          <span className="text-xs font-semibold text-red-600 tabular-nums shrink-0 ml-2">
                            {fmtBRL(amount)}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-400 rounded-full"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{pct.toFixed(1)}% do total</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Monthly detail (most recent month) ───────────────────── */}
        {dfcLines[0] && (dfcLines[0].inflows.length > 0 || dfcLines[0].outflows.length > 0) && (
          <div className="card p-5">
            <div className="text-sm font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
              Detalhe — {fmtMonth(dfcLines[0].month)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Inflows detail */}
              <div>
                <div className="text-xs font-semibold text-emerald-700 uppercase tracking-widest mb-2">
                  Recebimentos ({dfcLines[0].inflows.length})
                </div>
                <div className="space-y-1">
                  {dfcLines[0].inflows.map((ar) => (
                    <div key={ar.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 text-xs">
                      <div className="min-w-0 mr-2">
                        <div className="font-medium text-gray-800 truncate">{ar.customer_name}</div>
                        <div className="text-gray-400 truncate">{ar.description}</div>
                      </div>
                      <div className="text-emerald-700 font-semibold tabular-nums shrink-0">
                        {fmtBRL(ar.received_amount ?? ar.net_amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Outflows detail */}
              <div>
                <div className="text-xs font-semibold text-red-600 uppercase tracking-widest mb-2">
                  Pagamentos ({dfcLines[0].outflows.length})
                </div>
                <div className="space-y-1">
                  {dfcLines[0].outflows.map((ap) => (
                    <div key={ap.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 text-xs">
                      <div className="min-w-0 mr-2">
                        <div className="font-medium text-gray-800 truncate">{ap.supplier_name}</div>
                        <div className="text-gray-400 truncate">{ap.category}</div>
                      </div>
                      <div className="text-red-600 font-semibold tabular-nums shrink-0">
                        ({fmtBRL(ap.paid_amount ?? ap.net_amount)})
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Navigation ───────────────────────────────────────────── */}
        <div className="flex items-center gap-3 text-xs">
          <Link href="/awq/epm" className="flex items-center gap-1 text-brand-600 hover:underline">
            ← EPM Overview
          </Link>
          <span className="text-gray-300">|</span>
          <Link href="/awq/epm/pl" className="flex items-center gap-1 text-brand-600 hover:underline">
            DRE (P&L) <ChevronRight size={11} />
          </Link>
          <Link href="/awq/epm/balance-sheet" className="flex items-center gap-1 text-brand-600 hover:underline">
            Balanço <ChevronRight size={11} />
          </Link>
          <Link href="/awq/epm/ap" className="flex items-center gap-1 text-brand-600 hover:underline">
            AP <ChevronRight size={11} />
          </Link>
          <Link href="/awq/epm/ar" className="flex items-center gap-1 text-brand-600 hover:underline">
            AR <ChevronRight size={11} />
          </Link>
        </div>

      </div>
    </>
  );
}
