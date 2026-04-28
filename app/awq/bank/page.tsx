"use client";

// ─── /awq/bank — Contas de Banco ─────────────────────────────────────────────
//
// ROLE: Local cash position tracker — accounts, balances, manual transaction history.
//       Data lives in localStorage (browser-local, not server-persistent).
//
// SCOPE: This page is NOT the document ingestion pipeline.
//        For PDF-based bank statement import with full traceability, use /awq/conciliacao.
//
// ARCHITECTURE:
//   • Accounts and transactions: localStorage ("awq_bank_accounts")
//   • No server API calls for data storage — intentionally local/scratchpad
//   • No AI parsing — that responsibility moved to /api/ingest/process (server-only)
//   • Complements /awq/conciliacao: provides quick manual balance tracking; ingest provides
//     the canonical document-backed financial database

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import {
  Plus, Trash2, FileText, Star, BarChart3, CreditCard, Wallet,
} from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  balance?: number;
}

interface BankAccount {
  id: string;
  bank: string;
  name: string;
  color: string;
  currentBalance: number;
  lastUpdated: string;
  transactions: BankTransaction[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = "awq_bank_accounts";

const BANK_GROUPS: { label: string; banks: string[] }[] = [
  {
    label: "Digital / Fintech",
    banks: ["Cora", "Nubank", "Inter", "C6 Bank", "PagBank", "BTG Empresas", "XP", "Mercado Pago"],
  },
  {
    label: "Tradicional",
    banks: ["Itaú", "Bradesco", "Banco do Brasil", "Santander", "Sicoob", "Sicredi"],
  },
  { label: "Outro", banks: ["Outro"] },
];

const BANK_COLOR: Record<string, string> = {
  "Cora":            "bg-red-500",
  "Nubank":          "bg-purple-600",
  "Inter":           "bg-orange-500",
  "C6 Bank":         "bg-gray-800",
  "PagBank":         "bg-green-600",
  "BTG Empresas":    "bg-blue-700",
  "XP":              "bg-gray-700",
  "Mercado Pago":    "bg-sky-500",
  "Itaú":            "bg-orange-600",
  "Bradesco":        "bg-red-600",
  "Banco do Brasil": "bg-yellow-500",
  "Santander":       "bg-red-700",
  "Sicoob":          "bg-green-700",
  "Sicredi":         "bg-green-800",
  "Outro":           "bg-gray-500",
};

const BANK_INITIALS: Record<string, string> = {
  "Cora":            "C",
  "Nubank":          "N",
  "Inter":           "I",
  "C6 Bank":         "C6",
  "PagBank":         "P",
  "BTG Empresas":    "B",
  "XP":              "XP",
  "Mercado Pago":    "MP",
  "Itaú":            "I",
  "Bradesco":        "B",
  "Banco do Brasil": "BB",
  "Santander":       "S",
  "Sicoob":          "SC",
  "Sicredi":         "SR",
  "Outro":           "?",
};

const USAGE_LABEL: Record<string, string> = {
  "Cora":            "Conta corrente",
  "Nubank":          "Conta corrente",
  "Inter":           "Conta corrente",
  "C6 Bank":         "Conta corrente",
  "PagBank":         "Conta de pagamento",
  "BTG Empresas":    "Conta investimento",
  "XP":              "Conta investimento",
  "Mercado Pago":    "Conta de pagamento",
  "Itaú":            "Conta corrente",
  "Bradesco":        "Conta corrente",
  "Banco do Brasil": "Conta corrente",
  "Santander":       "Conta corrente",
  "Sicoob":          "Conta corrente",
  "Sicredi":         "Conta corrente",
  "Outro":           "Conta",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtDate(s: string) {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function monthStartStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BankAccountsPage() {
  const [accounts, setAccounts]       = useState<BankAccount[]>([]);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBank, setNewBank]         = useState("Cora");
  const [newName, setNewName]         = useState("");
  const [newBalance, setNewBalance]   = useState("");

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as BankAccount[];
        setAccounts(parsed);
        if (parsed.length > 0) setSelectedId(parsed[0].id);
      }
    } catch { /* ignore */ }
  }, []);

  // ── Persist ───────────────────────────────────────────────────────────────
  const save = useCallback((updated: BankAccount[]) => {
    setAccounts(updated);
    try { localStorage.setItem(LS_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  }, []);

  const selected = accounts.find((a) => a.id === selectedId) ?? null;

  // ── Add account ───────────────────────────────────────────────────────────
  function handleAddAccount() {
    if (!newName.trim()) return;
    const acct: BankAccount = {
      id:             uid(),
      bank:           newBank,
      name:           newName.trim(),
      color:          BANK_COLOR[newBank] ?? "bg-gray-500",
      currentBalance: parseFloat(newBalance.replace(",", ".")) || 0,
      lastUpdated:    todayStr(),
      transactions:   [],
    };
    const updated = [...accounts, acct];
    save(updated);
    setSelectedId(acct.id);
    setNewBank("Cora");
    setNewName("");
    setNewBalance("");
    setShowAddForm(false);
  }

  // ── Delete account ────────────────────────────────────────────────────────
  function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const updated = accounts.filter((a) => a.id !== id);
    save(updated);
    setSelectedId(updated[0]?.id ?? null);
  }

  // ── Aggregates ────────────────────────────────────────────────────────────
  const today      = todayStr();
  const monthStart = monthStartStr();

  const allTx         = accounts.flatMap((a) => a.transactions);
  const totalBalance  = accounts.reduce((s, a) => s + a.currentBalance, 0);

  const todayCredits  = allTx.filter((t) => t.date === today && t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const todayDebits   = allTx.filter((t) => t.date === today && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const monthCredits  = allTx.filter((t) => t.date >= monthStart && t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const monthDebits   = allTx.filter((t) => t.date >= monthStart && t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  // ── Chart data ────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const txSource = selected ? selected.transactions : allTx;
    if (txSource.length === 0) return [];

    const byDate: Record<string, { credits: number; debits: number; balance: number }> = {};
    txSource.forEach((tx) => {
      if (!byDate[tx.date]) byDate[tx.date] = { credits: 0, debits: 0, balance: 0 };
      if (tx.amount > 0) byDate[tx.date].credits += tx.amount;
      else byDate[tx.date].debits += Math.abs(tx.amount);
      if (tx.balance != null) byDate[tx.date].balance = tx.balance;
    });

    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, d]) => ({
        date:          date.slice(8) + "/" + date.slice(5, 7),
        Recebimentos:  Math.round(d.credits),
        Pagamentos:    Math.round(d.debits),
        Saldo:         Math.round(d.balance || totalBalance),
      }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, accounts]);

  // ── Selected account's recent transactions ────────────────────────────────
  const recentTx = useMemo(
    () => [...(selected?.transactions ?? [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10),
    [selected]
  );

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Header
        title="Contas de Banco"
        subtitle="Saldos manuais · Visão de caixa local · Dados em localStorage"
      />

      <div className="flex min-h-0 flex-1">

        {/* ── Left sidebar ──────────────────────────────────────────────────── */}
        <aside className="w-72 shrink-0 border-r border-gray-200 bg-white flex flex-col" style={{ minHeight: "calc(100vh - 64px)" }}>

          {/* Support box */}
          <div className="p-4 border-b border-gray-100">
            <div className="rounded-xl bg-gray-50 p-3 text-center space-y-1">
              <div className="text-xs font-semibold text-gray-700">Dúvidas?</div>
              <div className="text-[11px] text-gray-500">Importe seus extratos bancários</div>
              <Link
                href="/awq/conciliacao"
                className="block text-xs font-bold text-brand-600 hover:underline mt-1"
              >
                Ingestão de Extratos →
              </Link>
            </div>
          </div>

          {/* Section header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-800">Contas bancárias</span>
            <button
              onClick={() => setShowAddForm((v) => !v)}
              title="Nova conta"
              className="w-6 h-6 flex items-center justify-center rounded-full bg-brand-600 hover:bg-brand-700 text-white transition-colors"
            >
              <Plus size={13} />
            </button>
          </div>

          {/* Add account form */}
          {showAddForm && (
            <div className="p-3 border-b border-gray-100 bg-gray-50 space-y-2">
              <select
                value={newBank}
                onChange={(e) => setNewBank(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-900 focus:outline-none focus:border-brand-400"
              >
                {BANK_GROUPS.map((g) => (
                  <optgroup key={g.label} label={g.label}>
                    {g.banks.map((b) => <option key={b} value={b}>{b}</option>)}
                  </optgroup>
                ))}
              </select>
              <input
                type="text"
                placeholder="Nome da conta (ex: Conta PJ)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddAccount()}
                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-400"
              />
              <input
                type="text"
                placeholder="Saldo inicial (ex: 6.500,00)"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-400"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddAccount}
                  className="flex-1 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-semibold hover:bg-brand-700 transition-colors"
                >
                  Adicionar
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Account list */}
          <div className="flex-1 overflow-y-auto">
            {accounts.length === 0 && !showAddForm ? (
              <div className="p-8 text-center text-gray-400 space-y-2">
                <CreditCard size={28} className="mx-auto text-gray-200" />
                <div className="text-xs font-medium text-gray-500">Nenhuma conta cadastrada</div>
                <div className="text-[11px] text-gray-400">
                  Clique em <span className="font-semibold text-brand-500">+</span> para adicionar
                </div>
              </div>
            ) : (
              accounts.map((acct, idx) => {
                const isSelected = acct.id === selectedId;
                const isPrimary  = idx === 0;
                return (
                  <div
                    key={acct.id}
                    onClick={() => setSelectedId(acct.id)}
                    className={`border-b border-gray-100 px-4 py-3 cursor-pointer transition-colors ${
                      isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Bank icon */}
                      <div
                        className={`w-9 h-9 rounded-lg ${acct.color} flex items-center justify-center shrink-0 text-white font-bold text-xs`}
                      >
                        {BANK_INITIALS[acct.bank] ?? acct.bank[0]}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {acct.name}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 text-[11px] text-gray-500">
                          {isPrimary && (
                            <Star size={9} className="fill-gray-400 text-gray-400 shrink-0" />
                          )}
                          <span className="truncate">
                            {USAGE_LABEL[acct.bank] ?? "Conta"}&hellip;
                          </span>
                        </div>
                        <Link
                          href="/awq/conciliacao"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-blue-600 hover:underline"
                        >
                          <FileText size={10} />
                          Importe seu extrato
                        </Link>
                      </div>

                      <button
                        onClick={(e) => handleDelete(acct.id, e)}
                        className="p-1 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded transition-colors mt-0.5 shrink-0"
                        title="Remover conta"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    {/* Balance */}
                    <div className="text-right mt-2">
                      <span className="text-sm font-bold text-gray-900">
                        {fmtR(acct.currentBalance)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto bg-[#f0f4f8] p-6 space-y-5">

          {/* ── Summary cards ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* A receber hoje */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <div className="text-sm font-semibold text-gray-700">A receber hoje</div>
              {todayCredits > 0 ? (
                <div className="text-3xl font-bold text-emerald-500">{fmtR(todayCredits)}</div>
              ) : (
                <div className="text-sm text-gray-500 leading-relaxed">
                  Sem entradas registradas para hoje.
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
                <span>Recebimentos no mês</span>
                <span className="font-semibold text-gray-700">{fmtR(monthCredits)}</span>
              </div>
            </div>

            {/* A pagar hoje */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <div className="text-sm font-semibold text-gray-700">A pagar hoje</div>
              {todayDebits > 0 ? (
                <div className="text-3xl font-bold text-red-500">{fmtR(todayDebits)}</div>
              ) : (
                <div className="text-sm text-gray-500 leading-relaxed">
                  Parabéns, suas contas a pagar de hoje estão em dia.
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
                <span>Pagamentos no mês</span>
                <span className="font-semibold text-gray-700">{fmtR(monthDebits)}</span>
              </div>
            </div>
          </div>

          {/* ── Saldo total strip ─────────────────────────────────────────── */}
          {accounts.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Wallet size={15} className="text-brand-500" />
                <span>Saldo consolidado — {accounts.length} conta{accounts.length !== 1 ? "s" : ""}</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{fmtR(totalBalance)}</span>
            </div>
          )}

          {/* ── Fluxo de Caixa diário ─────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="text-sm font-semibold text-gray-800 mb-4">Fluxo de Caixa diário</div>

            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-52 text-gray-400 space-y-2">
                <BarChart3 size={36} className="text-gray-200" />
                <div className="text-sm font-medium text-gray-500">Nenhuma transação registrada</div>
                <div className="text-xs text-center text-gray-400 max-w-xs">
                  Adicione uma conta e importe extratos para visualizar o fluxo de caixa diário.
                </div>
                <Link
                  href="/awq/conciliacao"
                  className="mt-1 px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Ingestão de Extratos
                </Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                  />
                  <Tooltip
                    formatter={(v: number, name: string) => [fmtR(v), name]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Recebimentos" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="Pagamentos"   fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Line
                    dataKey="Saldo"
                    stroke="#1e3a8a"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#1e3a8a", strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Recent transactions for selected account ──────────────────── */}
          {selected && recentTx.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="text-sm font-semibold text-gray-800 mb-4">
                Movimentações recentes &mdash;{" "}
                <span className="font-normal text-gray-500">{selected.name}</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left pb-2 px-2 text-xs font-semibold text-gray-500">Data</th>
                    <th className="text-left pb-2 px-2 text-xs font-semibold text-gray-500">Descrição</th>
                    <th className="text-right pb-2 px-2 text-xs font-semibold text-gray-500">Valor</th>
                    <th className="text-right pb-2 px-2 text-xs font-semibold text-gray-500">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTx.map((tx) => (
                    <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-2.5 px-2 text-xs text-gray-500 whitespace-nowrap">
                        {fmtDate(tx.date)}
                      </td>
                      <td className="py-2.5 px-2 text-xs text-gray-900 max-w-xs">
                        <div className="truncate">{tx.description}</div>
                      </td>
                      <td className={`py-2.5 px-2 text-right text-xs font-bold whitespace-nowrap ${tx.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {tx.amount >= 0 ? "+" : ""}{fmtR(tx.amount)}
                      </td>
                      <td className="py-2.5 px-2 text-right text-xs text-gray-400">
                        {tx.balance != null ? fmtR(tx.balance) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Empty state when no accounts ─────────────────────────────── */}
          {accounts.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-3">
              <Wallet size={40} className="text-gray-200 mx-auto" />
              <div className="text-base font-semibold text-gray-500">
                Nenhuma conta bancária cadastrada
              </div>
              <div className="text-sm text-gray-400">
                Clique em <span className="font-semibold text-brand-600">Contas bancárias +</span> no painel esquerdo para adicionar sua primeira conta.
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
