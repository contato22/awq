// ─── /awq/epm/balance-sheet — Balanço Patrimonial ────────────────────────────
//
// DATA SOURCE: epm-gl.ts (getBalanceSheet / getTrialBalance)
//   Real GL entries from general_ledger.json.
//   When no GL entries exist → shows empty state with guidance.
//
// Identity check: Ativo = Passivo + Patrimônio Líquido

import Header from "@/components/Header";
import Link from "next/link";
import { Scale, AlertTriangle, CheckCircle2, Database, ListOrdered } from "lucide-react";
import { getBalanceSheet, getTrialBalance } from "@/lib/epm-gl";

function fmtBRL(n: number): string {
  const abs  = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000)     return sign + "R$" + (abs / 1_000).toFixed(0) + "K";
  return sign + "R$" + abs.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

// Group labels
const GROUP_LABEL: Record<string, string> = {
  ASSET:     "ATIVO",
  LIABILITY: "PASSIVO",
  EQUITY:    "PATRIMÔNIO LÍQUIDO",
};
const GROUP_ORDER = ["ASSET", "LIABILITY", "EQUITY"];

export default async function BalanceSheetPage() {
  const [bs, tb] = await Promise.all([getBalanceSheet(), getTrialBalance()]);

  if (!bs.hasData) {
    return (
      <>
        <Header title="Balanço Patrimonial" subtitle="EPM · AWQ Group" />
        <div className="page-container">
          <div className="card p-16 flex flex-col items-center gap-4 text-center">
            <Database size={40} className="text-gray-200" />
            <div className="text-sm font-semibold text-gray-400">Sem lançamentos contábeis</div>
            <div className="text-xs text-gray-400 max-w-sm">
              O Balanço Patrimonial é gerado a partir dos lançamentos do Razão Geral (GL).
              Adicione lançamentos accrual para visualizar o balanço.
            </div>
            <div className="flex items-center gap-3 mt-2">
              <Link
                href="/awq/epm/gl/add"
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                <ListOrdered size={13} /> Adicionar Lançamento GL
              </Link>
              <Link href="/awq/epm" className="text-xs text-brand-600 hover:underline">
                ← EPM Overview
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Group trial balance lines by account_type
  const groups = GROUP_ORDER.reduce((acc, type) => {
    acc[type] = tb.filter((l) => l.account_type === type);
    return acc;
  }, {} as Record<string, typeof tb>);

  return (
    <>
      <Header
        title="Balanço Patrimonial"
        subtitle="EPM · AWQ Group · Lançamentos GL accrual"
      />
      <div className="page-container">

        {/* ── Identity equation ────────────────────────────────────────── */}
        <div className={`flex items-center gap-3 px-5 py-4 rounded-xl border font-medium text-sm ${
          bs.isBalanced
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-red-50 border-red-200 text-red-800"
        }`}>
          {bs.isBalanced
            ? <CheckCircle2 size={16} className="shrink-0" />
            : <AlertTriangle size={16} className="shrink-0" />}
          <span>
            {bs.isBalanced
              ? "Equação patrimonial balanceada:"
              : "Equação DESEQUILIBRADA — verifique lançamentos GL:"}
          </span>
          <span className="ml-auto tabular-nums text-xs font-bold">
            Ativo {fmtBRL(bs.totalAssets)} = Passivo {fmtBRL(bs.totalLiabilities)} + PL {fmtBRL(bs.totalEquity)}
          </span>
        </div>

        {/* ── Summary cards ────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Ativo Total",       value: bs.totalAssets,       color: "text-brand-700",   bg: "bg-brand-50"   },
            { label: "Passivo Total",      value: bs.totalLiabilities,  color: "text-red-700",     bg: "bg-red-50"     },
            { label: "Patrimônio Líquido", value: bs.totalEquity,       color: "text-emerald-700", bg: "bg-emerald-50" },
          ].map((item) => (
            <div key={item.label} className={`card p-5 text-center ${item.bg}`}>
              <div className={`text-2xl font-bold tabular-nums ${item.color}`}>
                {fmtBRL(item.value)}
              </div>
              <div className="text-xs text-gray-500 mt-1 font-medium">{item.label}</div>
            </div>
          ))}
        </div>

        {/* ── Balance Sheet detail ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ATIVO */}
          <div className="card p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">ATIVO</h2>
            <div className="space-y-1 text-xs">
              {(groups["ASSET"] ?? []).map((line) => {
                const balance = line.total_debits - line.total_credits;
                return (
                  <div key={line.account_code} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                    <div>
                      <span className="text-gray-400 mr-2 font-mono">{line.account_code}</span>
                      <span className="text-gray-700">{line.account_name}</span>
                    </div>
                    <span className={`font-semibold tabular-nums ${balance >= 0 ? "text-brand-700" : "text-red-600"}`}>
                      {fmtBRL(balance)}
                    </span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between pt-2 font-bold text-sm border-t border-gray-300 mt-1">
                <span className="text-gray-900">Total Ativo</span>
                <span className="text-brand-700 tabular-nums">{fmtBRL(bs.totalAssets)}</span>
              </div>
            </div>
          </div>

          {/* PASSIVO + PL */}
          <div className="space-y-5">
            <div className="card p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">PASSIVO</h2>
              <div className="space-y-1 text-xs">
                {(groups["LIABILITY"] ?? []).map((line) => {
                  const balance = line.total_credits - line.total_debits;
                  return (
                    <div key={line.account_code} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                      <div>
                        <span className="text-gray-400 mr-2 font-mono">{line.account_code}</span>
                        <span className="text-gray-700">{line.account_name}</span>
                      </div>
                      <span className={`font-semibold tabular-nums ${balance >= 0 ? "text-red-600" : "text-emerald-600"}`}>
                        {fmtBRL(balance)}
                      </span>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-2 font-bold text-sm border-t border-gray-300 mt-1">
                  <span className="text-gray-900">Total Passivo</span>
                  <span className="text-red-700 tabular-nums">{fmtBRL(bs.totalLiabilities)}</span>
                </div>
              </div>
            </div>

            <div className="card p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-3 pb-2 border-b border-gray-100">PATRIMÔNIO LÍQUIDO</h2>
              <div className="space-y-1 text-xs">
                {(groups["EQUITY"] ?? []).map((line) => {
                  const balance = line.total_credits - line.total_debits;
                  return (
                    <div key={line.account_code} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                      <div>
                        <span className="text-gray-400 mr-2 font-mono">{line.account_code}</span>
                        <span className="text-gray-700">{line.account_name}</span>
                      </div>
                      <span className={`font-semibold tabular-nums ${balance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {fmtBRL(balance)}
                      </span>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between pt-2 font-bold text-sm border-t border-gray-300 mt-1">
                  <span className="text-gray-900">Total PL</span>
                  <span className="text-emerald-700 tabular-nums">{fmtBRL(bs.totalEquity)}</span>
                </div>
              </div>
            </div>

            <div className="card p-4 bg-gray-50">
              <div className="flex items-center justify-between text-sm font-bold">
                <span className="text-gray-900">Total Passivo + PL</span>
                <span className={`tabular-nums ${bs.isBalanced ? "text-emerald-700" : "text-red-700"}`}>
                  {fmtBRL(bs.totalLiabilities + bs.totalEquity)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Trial Balance ─────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Balancete Completo</h2>
          <div className="table-scroll">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="py-2 px-2 text-gray-500 font-semibold">Conta</th>
                  <th className="py-2 px-2 text-gray-500 font-semibold">Tipo</th>
                  <th className="py-2 px-2 text-right text-gray-500 font-semibold">Débitos</th>
                  <th className="py-2 px-2 text-right text-gray-500 font-semibold">Créditos</th>
                  <th className="py-2 px-2 text-right text-gray-500 font-semibold">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {tb.map((line) => (
                  <tr key={line.account_code} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-2">
                      <span className="font-mono text-gray-400 mr-2">{line.account_code}</span>
                      <span className="text-gray-700">{line.account_name}</span>
                    </td>
                    <td className="py-2 px-2 text-gray-400">{line.account_type}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-red-600">{fmtBRL(line.total_debits)}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-emerald-600">{fmtBRL(line.total_credits)}</td>
                    <td className={`py-2 px-2 text-right font-semibold tabular-nums ${line.net_balance >= 0 ? "text-gray-800" : "text-red-700"}`}>
                      {fmtBRL(line.net_balance)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
                  <td className="py-2 px-2 text-gray-900" colSpan={2}>TOTAIS</td>
                  <td className="py-2 px-2 text-right tabular-nums text-red-700">
                    {fmtBRL(tb.reduce((s, l) => s + l.total_debits, 0))}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums text-emerald-700">
                    {fmtBRL(tb.reduce((s, l) => s + l.total_credits, 0))}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums text-gray-700">
                    {fmtBRL(tb.reduce((s, l) => s + l.net_balance, 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <Link href="/awq/epm" className="text-brand-600 hover:underline">← EPM Overview</Link>
          <span className="text-gray-300">|</span>
          <Link href="/awq/epm/gl" className="text-brand-600 hover:underline">Ver lançamentos GL →</Link>
          <Link href="/awq/epm/gl/add" className="text-brand-600 hover:underline">+ Novo lançamento →</Link>
        </div>

      </div>
    </>
  );
}
