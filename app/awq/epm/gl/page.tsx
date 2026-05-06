"use client";

// ─── /awq/epm/gl — Razão Geral (GL Transactions) ─────────────────────────────
//
// Lists all double-entry GL journals.
// SSR mode: fetches from /api/epm/gl.
// Static export: reads from localStorage "epm_gl_entries".

import { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import { Plus, Database, CheckCircle2, AlertTriangle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GLEntry {
  id: string;
  journal_id: string;
  bu_code: string;
  transaction_date: string;
  description: string;
  reference_doc?: string;
  source_system: string;
  account_code: string;
  account_name: string;
  direction: "DEBIT" | "CREDIT";
  amount: number;
  debit_amount?: number;
  credit_amount?: number;
  created_at: string;
}

interface Journal {
  journal_id: string;
  balanced: boolean;
  debit: GLEntry & { debit_amount: number };
  credit: GLEntry & { credit_amount: number };
}

interface TrialBalance {
  account_code: string;
  account_name: string;
  account_type: string;
  total_debits: number;
  total_credits: number;
  net_balance: number;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";
const LS_GL     = "epm_gl_entries";

function lsReadGL(): GLEntry[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LS_GL) ?? "[]") as GLEntry[]; }
  catch { return []; }
}

function entriesToJournals(entries: GLEntry[]): Journal[] {
  const byJournal = new Map<string, GLEntry[]>();
  for (const e of entries) {
    const group = byJournal.get(e.journal_id) ?? [];
    group.push(e);
    byJournal.set(e.journal_id, group);
  }
  const journals: Journal[] = [];
  for (const [journal_id, lines] of byJournal) {
    const debitLine  = lines.find(l => l.direction === "DEBIT");
    const creditLine = lines.find(l => l.direction === "CREDIT");
    if (!debitLine || !creditLine) continue;
    const balanced = Math.abs(debitLine.amount - creditLine.amount) < 0.01;
    journals.push({
      journal_id,
      balanced,
      debit:  { ...debitLine,  debit_amount: debitLine.amount  },
      credit: { ...creditLine, credit_amount: creditLine.amount },
    });
  }
  return journals.sort((a, b) => b.debit.transaction_date.localeCompare(a.debit.transaction_date));
}

function entriesToTrialBalance(entries: GLEntry[]): TrialBalance[] {
  const map = new Map<string, TrialBalance>();
  for (const e of entries) {
    if (!map.has(e.account_code)) {
      map.set(e.account_code, { account_code: e.account_code, account_name: e.account_name, account_type: "", total_debits: 0, total_credits: 0, net_balance: 0 });
    }
    const row = map.get(e.account_code)!;
    if (e.direction === "DEBIT")  row.total_debits  += e.amount;
    if (e.direction === "CREDIT") row.total_credits += e.amount;
    row.net_balance = row.total_debits - row.total_credits;
  }
  return Array.from(map.values()).sort((a, b) => a.account_code.localeCompare(b.account_code));
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function fmtBRL(n: number): string {
  const abs  = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000)     return sign + "R$" + (abs / 1_000).toFixed(0)     + "K";
  return sign + "R$" + abs.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

function fmtDate(d: string): string {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

const SOURCE_LABELS: Record<string, string> = {
  manual:      "Manual",
  bank_import: "Banco",
  ap_payment:  "AP",
  ar_receipt:  "AR",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GLPage() {
  const [journals,  setJournals]  = useState<Journal[]>([]);
  const [trialBal,  setTrialBal]  = useState<TrialBalance[]>([]);
  const [loading,   setLoading]   = useState(true);
  const useLS = useRef(IS_STATIC);

  useEffect(() => {
    async function load() {
      if (useLS.current) {
        const entries = lsReadGL();
        setJournals(entriesToJournals(entries));
        setTrialBal(entriesToTrialBalance(entries));
        setLoading(false);
        return;
      }
      try {
        const [jRes, tbRes] = await Promise.all([
          fetch("/api/epm/gl?view=journals"),
          fetch("/api/epm/gl?view=trial-balance"),
        ]);
        if (jRes.status >= 500) {
          useLS.current = true;
          const entries = lsReadGL();
          setJournals(entriesToJournals(entries));
          setTrialBal(entriesToTrialBalance(entries));
          setLoading(false);
          return;
        }
        const jJson  = await jRes.json()  as { success: boolean; data: Journal[] };
        const tbJson = await tbRes.json() as { success: boolean; data: TrialBalance[] };
        if (jJson.success)  setJournals(jJson.data);
        if (tbJson.success) setTrialBal(tbJson.data);
      } catch {
        useLS.current = true;
        const entries = lsReadGL();
        setJournals(entriesToJournals(entries));
        setTrialBal(entriesToTrialBalance(entries));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalDebits  = trialBal.reduce((s, l) => s + l.total_debits,  0);
  const totalCredits = trialBal.reduce((s, l) => s + l.total_credits, 0);
  const balanced     = Math.abs(totalDebits - totalCredits) < 0.01;

  return (
    <>
      <Header
        title="Razão Geral (GL)"
        subtitle={`EPM · AWQ Group · ${journals.length} journal${journals.length !== 1 ? "s" : ""}`}
      />
      <div className="page-container">

        {/* ── Actions bar ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border ${
            balanced
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}>
            {balanced
              ? <CheckCircle2 size={12} />
              : <AlertTriangle size={12} />}
            <span>
              {loading
                ? "Carregando…"
                : balanced
                  ? `Razão balanceado · D:${fmtBRL(totalDebits)} = C:${fmtBRL(totalCredits)}`
                  : `DESEQUILIBRADO · D:${fmtBRL(totalDebits)} ≠ C:${fmtBRL(totalCredits)}`}
            </span>
          </div>
          <Link
            href="/awq/epm/gl/add"
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <Plus size={13} /> Novo Lançamento
          </Link>
        </div>

        {/* ── Empty state ─────────────────────────────────────────────── */}
        {!loading && journals.length === 0 && (
          <div className="card p-16 flex flex-col items-center gap-4 text-center">
            <Database size={40} className="text-gray-200" />
            <div className="text-sm font-semibold text-gray-400">Nenhum lançamento ainda</div>
            <div className="text-xs text-gray-400 max-w-sm">
              Use o Razão Geral para lançamentos de accrual: provisões, depreciação, amortizações,
              aporte de capital, etc.
            </div>
            <Link
              href="/awq/epm/gl/add"
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              <Plus size={14} /> Criar primeiro lançamento
            </Link>
          </div>
        )}

        {/* ── Journals table ──────────────────────────────────────────── */}
        {journals.length > 0 && (
          <div className="card">
            <div className="table-scroll">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left py-2.5 px-3 text-gray-500 font-semibold">Data</th>
                    <th className="text-left py-2.5 px-3 text-gray-500 font-semibold">BU</th>
                    <th className="text-left py-2.5 px-3 text-gray-500 font-semibold">Histórico</th>
                    <th className="text-left py-2.5 px-3 text-gray-500 font-semibold">Débito</th>
                    <th className="text-left py-2.5 px-3 text-gray-500 font-semibold">Crédito</th>
                    <th className="text-right py-2.5 px-3 text-gray-500 font-semibold">Valor</th>
                    <th className="text-center py-2.5 px-3 text-gray-500 font-semibold">Origem</th>
                    <th className="text-center py-2.5 px-3 text-gray-500 font-semibold">Ok</th>
                  </tr>
                </thead>
                <tbody>
                  {journals.map(({ journal_id, debit, credit, balanced: jBal }) => (
                    <tr key={journal_id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2.5 px-3 text-gray-500 tabular-nums font-mono whitespace-nowrap">
                        {fmtDate(debit.transaction_date)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 bg-brand-50 text-brand-700 rounded text-[10px] font-bold">
                          {debit.bu_code}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 max-w-[180px]">
                        <div className="text-gray-800 truncate">{debit.description}</div>
                        {debit.reference_doc && (
                          <div className="text-[10px] text-gray-400">{debit.reference_doc}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 max-w-[140px]">
                        <div className="font-mono text-[10px] text-gray-400">{debit.account_code}</div>
                        <div className="text-gray-700 truncate">{debit.account_name}</div>
                      </td>
                      <td className="py-2.5 px-3 max-w-[140px]">
                        <div className="font-mono text-[10px] text-gray-400">{credit.account_code}</div>
                        <div className="text-gray-700 truncate">{credit.account_name}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-gray-800">
                        {fmtBRL(debit.debit_amount)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-[10px] text-gray-400">
                          {SOURCE_LABELS[debit.source_system] ?? debit.source_system}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {jBal
                          ? <CheckCircle2 size={13} className="text-emerald-500 mx-auto" />
                          : <AlertTriangle size={13} className="text-red-500 mx-auto" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Trial Balance summary ────────────────────────────────────── */}
        {trialBal.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Balancete por Conta</h2>
            <div className="table-scroll">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 text-gray-500 font-semibold">Conta</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-semibold">Tipo</th>
                    <th className="text-right py-2 px-2 text-gray-500 font-semibold">Débitos</th>
                    <th className="text-right py-2 px-2 text-gray-500 font-semibold">Créditos</th>
                    <th className="text-right py-2 px-2 text-gray-500 font-semibold">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {trialBal.map((l) => (
                    <tr key={l.account_code} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-1.5 px-2">
                        <span className="font-mono text-[10px] text-gray-400 mr-1">{l.account_code}</span>
                        {l.account_name}
                      </td>
                      <td className="py-1.5 px-2 text-gray-400 text-[10px]">{l.account_type}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums text-red-600">{fmtBRL(l.total_debits)}</td>
                      <td className="py-1.5 px-2 text-right tabular-nums text-emerald-600">{fmtBRL(l.total_credits)}</td>
                      <td className={`py-1.5 px-2 text-right font-semibold tabular-nums ${l.net_balance >= 0 ? "text-gray-800" : "text-red-600"}`}>
                        {fmtBRL(l.net_balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs">
          <Link href="/awq/epm" className="text-brand-600 hover:underline">← EPM Overview</Link>
          <span className="text-gray-300">|</span>
          <Link href="/awq/epm/balance-sheet" className="text-brand-600 hover:underline">Balanço →</Link>
          <Link href="/awq/epm/pl" className="text-brand-600 hover:underline">P&L →</Link>
        </div>

      </div>
    </>
  );
}
