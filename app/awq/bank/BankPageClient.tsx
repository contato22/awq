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

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import {
  Building2, Plus, Trash2, Search, X, Wallet,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  CreditCard, ChevronDown, ChevronUp, BarChart3, FileUp,
  ExternalLink, Loader2, RefreshCw, AlertTriangle,
} from "lucide-react";

// ─── Cora live balance section ────────────────────────────────────────────────

interface CoraBalance {
  available: number;
  blocked: number | null;
  error?: string;
}

function CoraLiveBalances() {
  const [balance, setBalance]       = useState<CoraBalance | null>(null);
  const [loading, setLoading]       = useState(true);
  const [hasError, setHasError]     = useState(false);
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  async function fetchBalance() {
    setLoading(true);
    setHasError(false);
    setErrorMsg(null);
    try {
      const res  = await fetch("/api/cora/balance");
      const data = await res.json() as CoraBalance;
      if (!res.ok) throw new Error(data.error ?? "Erro ao buscar saldo");
      setBalance(data);
    } catch (err) {
      setHasError(true);
      setErrorMsg(err instanceof Error ? err.message : "Falha ao buscar saldo");
    }
    setLoading(false);
    setLastUpdate(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
  }

  useEffect(() => { void fetchBalance(); }, []);

  const fmtBRL = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-rose-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-900">Cora Bank</span>
              {!loading && !hasError && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-semibold text-emerald-700">Ao vivo</span>
                </span>
              )}
            </div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              {lastUpdate ? `Atualizado às ${lastUpdate}` : "Buscando saldo…"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => void fetchBalance()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-semibold hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Atualizar
          </button>
          <a
            href="https://app.cora.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold transition-colors"
          >
            <ExternalLink size={12} /> Abrir Cora
          </a>
        </div>
      </div>

      {/* Balance display */}
      <div className="px-6 py-6">
        {loading ? (
          <div className="space-y-2">
            <div className="h-10 w-56 bg-gray-100 rounded-xl animate-pulse" />
            <div className="h-4 w-36 bg-gray-100 rounded-lg animate-pulse" />
          </div>
        ) : hasError ? (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-amber-800">Não foi possível carregar o saldo</div>
              <div className="text-xs text-amber-600 mt-0.5">{errorMsg}</div>
            </div>
          </div>
        ) : balance ? (
          <div className="flex items-end justify-between">
            <div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Saldo Disponível
              </div>
              <div className="text-4xl font-bold text-gray-900 tracking-tight">
                {fmtBRL(balance.available)}
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-xs text-gray-400">Conta PJ · AWQ Group</span>
                {balance.blocked != null && balance.blocked > 0 && (
                  <span className="text-xs text-amber-600 font-medium">
                    {fmtBRL(balance.blocked)} bloqueado
                  </span>
                )}
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1 pb-1">
              {[40, 60, 50, 80, 65, 90, 75].map((h, i) => (
                <div key={i} className="w-1.5 rounded-full bg-rose-200" style={{ height: `${h * 0.5}px` }} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  balance?: number;
  original?: string;
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
  "Cora":            "bg-rose-500",
  "Nubank":          "bg-brand-600",
  "Inter":           "bg-orange-500",
  "C6 Bank":         "bg-gray-800",
  "PagBank":         "bg-green-600",
  "BTG Empresas":    "bg-blue-700",
  "XP":              "bg-gray-700",
  "Mercado Pago":    "bg-sky-500",
  "Itaú":            "bg-orange-600",
  "Bradesco":        "bg-red-600",
  "Banco do Brasil": "bg-yellow-600",
  "Santander":       "bg-red-700",
  "Sicoob":          "bg-green-700",
  "Sicredi":         "bg-green-800",
  "Outro":           "bg-gray-500",
};

const BANK_COLOR_LIGHT: Record<string, string> = {
  "Cora":            "bg-rose-50 text-rose-700 border-rose-200",
  "Nubank":          "bg-brand-50 text-brand-700 border-brand-200",
  "Inter":           "bg-orange-50 text-orange-700 border-orange-200",
  "BTG Empresas":    "bg-blue-50 text-blue-700 border-blue-200",
  "Itaú":            "bg-orange-50 text-orange-700 border-orange-200",
  "Bradesco":        "bg-red-50 text-red-700 border-red-200",
};

const CATEGORY_LABEL: Record<string, string> = {
  salario: "Salário", aluguel: "Aluguel", servicos: "Serviços",
  transferencia: "Transferência", imposto: "Imposto",
  investimento: "Investimento", saque: "Saque", deposito: "Depósito",
  cartao: "Cartão", tarifas: "Tarifas", outros: "Outros",
};

const CATEGORY_COLOR: Record<string, string> = {
  salario: "bg-emerald-100 text-emerald-700",
  aluguel: "bg-brand-100 text-brand-700",
  servicos: "bg-blue-100 text-blue-700",
  transferencia: "bg-cyan-100 text-cyan-700",
  imposto: "bg-red-100 text-red-700",
  investimento: "bg-brand-100 text-brand-700",
  saque: "bg-orange-100 text-orange-700",
  deposito: "bg-emerald-100 text-emerald-700",
  cartao: "bg-pink-100 text-pink-700",
  tarifas: "bg-yellow-100 text-yellow-700",
  outros: "bg-gray-100 text-gray-600",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  const abs  = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000)     return sign + "R$" + (abs / 1_000).toFixed(1) + "K";
  return sign + "R$" + abs.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(s: string) {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BankAccountsPage() {
  const [accounts, setAccounts]     = useState<BankAccount[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [search, setSearch]         = useState("");
  const [sortAsc, setSortAsc]       = useState(false);
  const [newBank, setNewBank]       = useState("Cora");
  const [newName, setNewName]       = useState("");
  const [newBalance, setNewBalance] = useState("");

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

  const save = useCallback((updated: BankAccount[]) => {
    setAccounts(updated);
    try { localStorage.setItem(LS_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  }, []);

  const selected = accounts.find((a) => a.id === selectedId) ?? null;

  function handleAddAccount() {
    if (!newName.trim()) return;
    const acct: BankAccount = {
      id: uid(),
      bank: newBank,
      name: newName.trim(),
      color: BANK_COLOR[newBank] ?? "bg-gray-500",
      currentBalance: parseFloat(newBalance) || 0,
      lastUpdated: new Date().toISOString().slice(0, 10),
      transactions: [],
    };
    const updated = [...accounts, acct];
    save(updated);
    setSelectedId(acct.id);
    setNewBank("Cora");
    setNewName("");
    setNewBalance("");
    setShowAddForm(false);
  }

  function handleDelete(id: string) {
    const updated = accounts.filter((a) => a.id !== id);
    save(updated);
    setSelectedId(updated[0]?.id ?? null);
  }

  const totalBalance = accounts.reduce((s, a) => s + a.currentBalance, 0);
  const allTx        = accounts.flatMap((a) => a.transactions);
  const totalCredits = allTx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalDebits  = allTx.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);

  const filteredTx = (selected?.transactions ?? [])
    .filter((t) =>
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      (CATEGORY_LABEL[t.category] ?? "").toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => sortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));

  const acctCredits = (selected?.transactions ?? []).filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const acctDebits  = (selected?.transactions ?? []).filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);

  return (
    <>
      <Header
        title="Contas de Banco"
        subtitle="Visão de caixa · Saldos e transações manuais"
      />
      <div className="px-8 py-6 space-y-6">

        {/* ── Cora live balance ──────────────────────────────────────────────── */}
        <CoraLiveBalances />

        {/* ── Summary cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: "Saldo Total",
              value: fmtR(totalBalance),
              sub: `${accounts.length} conta${accounts.length !== 1 ? "s" : ""}`,
              icon: Wallet,
              accent: "brand",
            },
            {
              label: "Entradas",
              value: fmtR(totalCredits),
              sub: `${allTx.filter((t) => t.amount > 0).length} crédito${allTx.filter((t) => t.amount > 0).length !== 1 ? "s" : ""}`,
              icon: TrendingUp,
              accent: "emerald",
            },
            {
              label: "Saídas",
              value: fmtR(Math.abs(totalDebits)),
              sub: `${allTx.filter((t) => t.amount < 0).length} débito${allTx.filter((t) => t.amount < 0).length !== 1 ? "s" : ""}`,
              icon: TrendingDown,
              accent: "red",
            },
            {
              label: "Transações",
              value: allTx.length.toString(),
              sub: `em ${accounts.length} conta${accounts.length !== 1 ? "s" : ""}`,
              icon: BarChart3,
              accent: "amber",
            },
          ].map((c) => {
            const Icon = c.icon;
            const colorMap: Record<string, { bg: string; icon: string; val: string }> = {
              brand:   { bg: "bg-brand-50",   icon: "text-brand-600",   val: "text-brand-700"   },
              emerald: { bg: "bg-emerald-50", icon: "text-emerald-600", val: "text-emerald-700" },
              red:     { bg: "bg-red-50",     icon: "text-red-500",     val: "text-red-700"     },
              amber:   { bg: "bg-amber-50",   icon: "text-amber-600",   val: "text-amber-700"   },
            };
            const col = colorMap[c.accent];
            return (
              <div key={c.label} className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{c.label}</span>
                  <div className={`w-8 h-8 rounded-lg ${col.bg} flex items-center justify-center`}>
                    <Icon size={15} className={col.icon} />
                  </div>
                </div>
                <div className={`text-2xl font-bold ${col.val}`}>{c.value}</div>
                <div className="text-[11px] text-gray-400 mt-1">{c.sub}</div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-5 items-start">

          {/* ── Account sidebar ────────────────────────────────────────────── */}
          <div className="w-64 shrink-0 space-y-2.5">

            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <Plus size={14} /> Nova Conta
            </button>

            {/* Add account form */}
            {showAddForm && (
              <div className="card p-4 space-y-3 animate-slide-in">
                <div className="text-xs font-bold text-gray-700">Adicionar Conta</div>
                <select
                  value={newBank}
                  onChange={(e) => setNewBank(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                >
                  {BANK_GROUPS.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.banks.map((b) => <option key={b} value={b}>{b}</option>)}
                    </optgroup>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Nome da conta"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddAccount()}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                />
                <input
                  type="number"
                  placeholder="Saldo inicial (opcional)"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddAccount}
                    disabled={!newName.trim()}
                    className="flex-1 px-3 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    Adicionar
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Empty state */}
            {accounts.length === 0 && !showAddForm && (
              <div className="card p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <CreditCard size={22} className="text-gray-400" />
                </div>
                <div className="text-sm font-semibold text-gray-600">Nenhuma conta</div>
                <div className="text-xs text-gray-400 mt-1 leading-relaxed">
                  Adicione contas para acompanhar saldos localmente
                </div>
              </div>
            )}

            {/* Account cards */}
            {accounts.map((acct) => {
              const isSelected = acct.id === selectedId;
              const credits = acct.transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
              const debits  = acct.transactions.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
              const bankTag = BANK_COLOR_LIGHT[acct.bank];
              return (
                <div
                  key={acct.id}
                  onClick={() => setSelectedId(acct.id)}
                  className={`card p-4 cursor-pointer transition-all ${
                    isSelected
                      ? "border-brand-300 bg-brand-50 shadow-card-hover"
                      : "hover:border-gray-300 hover:shadow-card-hover"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl ${acct.color} flex items-center justify-center shrink-0`}>
                      <Building2 size={14} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className="text-xs font-bold text-gray-900 truncate">{acct.name}</div>
                      </div>
                      {bankTag ? (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-semibold mt-0.5 ${bankTag}`}>
                          {acct.bank}
                        </span>
                      ) : (
                        <div className="text-[10px] text-gray-400 mt-0.5">{acct.bank}</div>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(acct.id); }}
                      className="p-1 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                      title="Excluir conta"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="text-base font-bold text-gray-900">{fmtR(acct.currentBalance)}</div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-emerald-600 font-semibold">↑ {fmtR(credits)}</span>
                      <span className="text-[10px] text-red-500 font-semibold">↓ {fmtR(Math.abs(debits))}</span>
                      <span className="text-[10px] text-gray-400 ml-auto">{acct.transactions.length} tx</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Ingest link */}
            <div className="p-3 rounded-xl bg-brand-50 border border-brand-100">
              <div className="flex items-center gap-2 text-[11px] text-brand-700 mb-2">
                <FileUp size={11} className="shrink-0" />
                <span className="font-medium">Importar extrato PDF?</span>
              </div>
              <Link
                href="/awq/conciliacao"
                className="flex items-center justify-center gap-1.5 w-full px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Ingestão de Extratos
              </Link>
            </div>
          </div>

          {/* ── Main content area ──────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-4">
            {!selected ? (
              <div className="card p-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Wallet size={24} className="text-gray-400" />
                </div>
                <div className="text-sm font-bold text-gray-600">Selecione uma conta</div>
                <div className="text-xs text-gray-400 mt-1.5">
                  Escolha uma conta no painel ao lado ou adicione uma nova
                </div>
              </div>
            ) : (
              <>
                {/* Account header card */}
                <div className="card p-5">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl ${selected.color} flex items-center justify-center shrink-0`}>
                      <Building2 size={20} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-bold text-gray-900">{selected.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {selected.bank} · Atualizado {fmtDate(selected.lastUpdated)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">{fmtR(selected.currentBalance)}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">saldo atual</div>
                    </div>
                  </div>

                  {/* Mini stats row */}
                  <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-100">
                    {[
                      { label: "Entradas",    value: fmtR(acctCredits),           icon: ArrowUpRight,   color: "text-emerald-600", bg: "bg-emerald-50" },
                      { label: "Saídas",      value: fmtR(Math.abs(acctDebits)),  icon: ArrowDownRight, color: "text-red-500",     bg: "bg-red-50"     },
                      { label: "Transações",  value: String(selected.transactions.length), icon: BarChart3, color: "text-brand-600", bg: "bg-brand-50" },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className={`${item.bg} rounded-xl p-3 flex items-center gap-2.5`}>
                          <div className="w-7 h-7 rounded-lg bg-white/70 flex items-center justify-center">
                            <Icon size={14} className={item.color} />
                          </div>
                          <div>
                            <div className={`text-sm font-bold ${item.color}`}>{item.value}</div>
                            <div className="text-[10px] text-gray-500">{item.label}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Transactions table */}
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-4 gap-3">
                    <div>
                      <span className="text-sm font-bold text-gray-900">Transações</span>
                      <span className="ml-2 text-xs font-normal text-gray-400">({filteredTx.length})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Buscar…"
                          className="w-44 pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
                        />
                        {search && (
                          <button
                            onClick={() => setSearch("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => setSortAsc((v) => !v)}
                        className="flex items-center gap-1 px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        {sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        Data
                      </button>
                    </div>
                  </div>

                  {filteredTx.length === 0 ? (
                    <div className="text-center py-14">
                      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <Wallet size={20} className="text-gray-400" />
                      </div>
                      <div className="text-sm font-semibold text-gray-500">
                        {selected.transactions.length === 0
                          ? "Nenhuma transação nesta conta"
                          : "Nenhum resultado para esta busca"}
                      </div>
                      {selected.transactions.length === 0 && (
                        <div className="text-xs text-gray-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
                          Para importar extratos com rastreabilidade completa, acesse{" "}
                          <Link href="/awq/conciliacao" className="text-brand-600 hover:underline font-medium">
                            Ingestão de Extratos
                          </Link>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-x-auto -mx-1">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-2 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Data</th>
                            <th className="text-left py-2 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Descrição</th>
                            <th className="text-left py-2 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Categoria</th>
                            <th className="text-right py-2 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Valor</th>
                            <th className="text-right py-2 px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Saldo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTx.map((tx, idx) => (
                            <tr
                              key={tx.id}
                              className={`border-b border-gray-50 hover:bg-gray-50/70 transition-colors ${idx === filteredTx.length - 1 ? "border-b-0" : ""}`}
                            >
                              <td className="py-3 px-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(tx.date)}</td>
                              <td className="py-3 px-3 text-xs text-gray-900 max-w-xs">
                                <div className="truncate">{tx.description}</div>
                              </td>
                              <td className="py-3 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${CATEGORY_COLOR[tx.category] ?? "bg-gray-100 text-gray-600"}`}>
                                  {CATEGORY_LABEL[tx.category] ?? tx.category}
                                </span>
                              </td>
                              <td className={`py-3 px-3 text-right text-xs font-bold tabular-nums ${tx.amount >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                                {tx.amount >= 0 ? "+" : ""}{fmtR(tx.amount)}
                              </td>
                              <td className="py-3 px-3 text-right text-xs text-gray-400 tabular-nums">
                                {tx.balance != null ? fmtR(tx.balance) : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
