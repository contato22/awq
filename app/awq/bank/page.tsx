"use client";

// ─── /awq/bank — Hub Operacional de Tesouraria ───────────────────────────────
//
// ROLE: Entry point for the treasury operational flow.
//       Explains and links: Integração → Conciliação → DFC/DRE/KPIs.
//       Also maintains a local scratchpad for quick account/balance tracking
//       (localStorage only — not connected to financial-db.ts canonical store).
//
// SCOPE: This page is NOT the document ingestion pipeline.
//        For PDF-based bank statement import with full traceability, use /awq/ingest.
//
// ARCHITECTURE:
//   • Accounts and transactions: localStorage ("awq_bank_accounts") — scratchpad
//   • Canonical pipeline: /awq/ingest → /api/ingest/process → financial-db.ts
//   • No AI parsing here — that responsibility lives in /api/ingest/process (server-only)

// NEXT_PUBLIC_STATIC_DATA=1 is injected at build time by the GitHub Pages workflow.
const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import {
  Building2, Plus, Trash2, Search, X, Wallet,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  CreditCard, ChevronDown, ChevronUp, BarChart3, FileUp,
  CheckCircle2, Zap, AlertTriangle, ArrowRight, HardDrive, LineChart,
} from "lucide-react";

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

// localStorage key for this page's local account data.
// This is intentionally separate from public/data/financial/* (the canonical store).
const LS_KEY = "awq_bank_accounts";

// Canonical reconciliation queue — shared with ReconciliationReviewTable.
const LS_MANUAL = "awq_manual_transactions";

// Maps /awq/bank scratchpad categories → canonical ManagerialCategory (financial-db.ts)
const CAT_TO_CANONICAL: Record<string, string> = {
  salario:       "folha_remuneracao",
  aluguel:       "aluguel_locacao",
  servicos:      "fornecedor_operacional",
  transferencia: "unclassified",
  imposto:       "imposto_tributo",
  investimento:  "aplicacao_financeira",
  saque:         "prolabore_retirada",
  deposito:      "receita_eventual",
  cartao:        "cartao_compra_operacional",
  tarifas:       "tarifa_bancaria",
  outros:        "unclassified",
};

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
  "Cora":            "bg-brand-600",
  "Nubank":          "bg-purple-600",
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

const CATEGORY_LABEL: Record<string, string> = {
  salario: "Salário", aluguel: "Aluguel", servicos: "Serviços",
  transferencia: "Transferência", imposto: "Imposto",
  investimento: "Investimento", saque: "Saque", deposito: "Depósito",
  cartao: "Cartão", tarifas: "Tarifas", outros: "Outros",
};

const CATEGORY_COLOR: Record<string, string> = {
  salario: "bg-emerald-100 text-emerald-700",
  aluguel: "bg-violet-100 text-violet-700",
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
  const abs = Math.abs(n);
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

// ─── Reconciliation bridge helpers ───────────────────────────────────────────

type AnyRecord = Record<string, unknown>;

function lsManualGet(): AnyRecord[] {
  try { return JSON.parse(localStorage.getItem(LS_MANUAL) ?? "[]") as AnyRecord[]; }
  catch { return []; }
}
function lsManualSet(items: AnyRecord[]) {
  try { localStorage.setItem(LS_MANUAL, JSON.stringify(items)); } catch { /* ignore */ }
}

// Converts a bank-scratchpad transaction into canonical BankTransaction shape
// expected by ReconciliationReviewTable (awq_manual_transactions key).
function toCanonical(acct: BankAccount, tx: BankTransaction): AnyRecord {
  return {
    id:                       `bank_${acct.id}_${tx.id}`,
    documentId:               "bank_scratchpad",
    bank:                     acct.bank,
    accountName:              acct.name,
    entity:                   "Unknown",
    transactionDate:          tx.date,
    descriptionOriginal:      tx.description,
    amount:                   Math.abs(tx.amount),
    direction:                tx.amount >= 0 ? "credit" : "debit",
    runningBalance:           tx.balance ?? null,
    counterpartyName:         null,
    managerialCategory:       CAT_TO_CANONICAL[tx.category] ?? "unclassified",
    classificationConfidence: "ambiguous",
    classificationNote:       "Importado de /awq/bank — requer revisão",
    isIntercompany:           false,
    excludedFromConsolidated: false,
    reconciliationStatus:     "em_revisao",
    extractedAt:              new Date().toISOString(),
    classifiedAt:             null,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BankAccountsPage() {
  const [accounts, setAccounts]         = useState<BankAccount[]>([]);
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [showAddForm, setShowAddForm]   = useState(false);
  const [search, setSearch]             = useState("");
  const [sortAsc, setSortAsc]           = useState(false);
  const [newBank, setNewBank]           = useState("Cora");
  const [newName, setNewName]           = useState("");
  const [newBalance, setNewBalance]     = useState("");
  const [toast, setToast]               = useState<string | null>(null);
  // IDs already exported to awq_manual_transactions
  const [exportedIds, setExportedIds]   = useState<Set<string>>(new Set());

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  // ── Load from localStorage ───────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as BankAccount[];
        setAccounts(parsed);
        if (parsed.length > 0) setSelectedId(parsed[0].id);
      }
    } catch { /* ignore */ }
    // Seed exportedIds from existing awq_manual_transactions
    try {
      const manual = lsManualGet();
      setExportedIds(new Set(manual.map((t) => t.id as string)));
    } catch { /* ignore */ }
  }, []);

  // ── Export to reconciliation queue ──────────────────────────────────────
  function exportOne(tx: BankTransaction) {
    if (!selected) return;
    const canon = toCanonical(selected, tx);
    const existing = lsManualGet();
    if (existing.some((e) => e.id === canon.id)) {
      showToast("Transação já está na fila de Conciliação.");
      return;
    }
    lsManualSet([...existing, canon]);
    setExportedIds((prev) => new Set([...prev, canon.id as string]));
    showToast("✓ Transação enviada para Conciliação.");
  }

  function exportAll() {
    if (!selected || selected.transactions.length === 0) return;
    const existing = lsManualGet();
    const existingIds = new Set(existing.map((e) => e.id as string));
    const toAdd = selected.transactions
      .map((tx) => toCanonical(selected, tx))
      .filter((c) => !existingIds.has(c.id as string));
    if (toAdd.length === 0) {
      showToast("Todas as transações desta conta já estão na fila de Conciliação.");
      return;
    }
    lsManualSet([...existing, ...toAdd]);
    setExportedIds((prev) => new Set([...prev, ...toAdd.map((c) => c.id as string)]));
    showToast(`✓ ${toAdd.length} transação(ões) enviadas para Conciliação.`);
  }

  // ── Persist to localStorage ──────────────────────────────────────────────
  const save = useCallback((updated: BankAccount[]) => {
    setAccounts(updated);
    try { localStorage.setItem(LS_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  }, []);

  const selected = accounts.find((a) => a.id === selectedId) ?? null;

  // ── Add account ──────────────────────────────────────────────────────────
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

  // ── Delete account ───────────────────────────────────────────────────────
  function handleDelete(id: string) {
    const updated = accounts.filter((a) => a.id !== id);
    save(updated);
    setSelectedId(updated[0]?.id ?? null);
  }

  // ── Derived totals ───────────────────────────────────────────────────────
  const totalBalance = accounts.reduce((s, a) => s + a.currentBalance, 0);
  const allTx        = accounts.flatMap((a) => a.transactions);
  const totalCredits = allTx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalDebits  = allTx.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);

  const filteredTx = (selected?.transactions ?? [])
    .filter((t) =>
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      (CATEGORY_LABEL[t.category] ?? "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => sortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));

  const acctCredits = (selected?.transactions ?? []).filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const acctDebits  = (selected?.transactions ?? []).filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);

  return (
    <>
      <Header
        title="Integração Bancária & Contas — AWQ Group"
        subtitle="Importe dados → concilie → valide DFC, DRE e KPIs"
      />
      <div className="px-8 py-6 space-y-5">

        {/* ── GitHub Pages warning ─────────────────────────────────────────── */}
        {IS_STATIC && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <HardDrive size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 space-y-1">
              <p className="font-semibold">GitHub Pages — processamento automático de PDF indisponível</p>
              <p>
                Upload de PDF + extração via IA requer servidor Node.js.
                Neste ambiente use <strong>CSV/colagem</strong> ou <strong>entrada manual</strong> em{" "}
                <Link href="/awq/ingest" className="underline font-medium">Integração Bancária</Link>.
                Para o pipeline PDF completo, faça deploy no Vercel ou rode <code className="bg-amber-100 px-1 rounded">npm run dev</code> localmente.
              </p>
            </div>
          </div>
        )}

        {/* ── Operational flow hub ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Fluxo Operacional de Tesouraria</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Siga esta sequência para que DFC, DRE e KPIs reflitam os dados reais.
            </p>
          </div>

          {/* Step arrows */}
          <div className="flex items-stretch gap-0 overflow-x-auto">
            {[
              {
                step: "1",
                label: "Importar dados",
                sub: IS_STATIC ? "CSV ou entrada manual" : "Upload PDF ou CSV",
                color: "bg-brand-50 border-brand-200",
                icon: FileUp,
                iconColor: "text-brand-600",
              },
              {
                step: "2",
                label: "Conciliar",
                sub: "Revisar categoria, status e flags",
                color: "bg-amber-50 border-amber-200",
                icon: CheckCircle2,
                iconColor: "text-amber-600",
              },
              {
                step: "3",
                label: "Validar DFC",
                sub: "Fluxo de caixa atualizado",
                color: "bg-emerald-50 border-emerald-200",
                icon: Zap,
                iconColor: "text-emerald-600",
              },
              {
                step: "4",
                label: "Validar DRE/KPIs",
                sub: "P&L e indicadores recalculados",
                color: "bg-indigo-50 border-indigo-200",
                icon: LineChart,
                iconColor: "text-indigo-600",
              },
            ].map((item, idx, arr) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="flex items-center shrink-0">
                  <div className={`rounded-xl border ${item.color} px-4 py-3 flex items-center gap-3 min-w-[160px]`}>
                    <div className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-gray-600">{item.step}</span>
                    </div>
                    <Icon size={15} className={`${item.iconColor} shrink-0`} />
                    <div>
                      <div className="text-xs font-semibold text-gray-900">{item.label}</div>
                      <div className="text-[10px] text-gray-500">{item.sub}</div>
                    </div>
                  </div>
                  {idx < arr.length - 1 && (
                    <ArrowRight size={14} className="text-gray-300 mx-1 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/awq/ingest"
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <FileUp size={14} />
              {IS_STATIC ? "Importar CSV / Manual" : "Integrar extrato / CSV"}
            </Link>
            <Link
              href="/awq/reconciliation"
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-brand-300 hover:bg-brand-50 text-gray-800 rounded-xl text-sm font-semibold transition-colors"
            >
              <CheckCircle2 size={14} className="text-amber-600" />
              Ir para Conciliação
            </Link>
            <Link
              href="/awq/cashflow"
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 text-gray-800 rounded-xl text-sm font-semibold transition-colors"
            >
              <Zap size={14} className="text-emerald-600" />
              Ver Cash Flow
            </Link>
          </div>

          {!IS_STATIC && (
            <p className="text-[10px] text-gray-400 border-t border-gray-100 pt-3">
              <AlertTriangle size={10} className="inline mr-1 text-amber-500" />
              Em GitHub Pages / static export: PDF automático não roda. Use CSV ou entrada manual em{" "}
              <Link href="/awq/ingest" className="underline">Integração Bancária</Link>.
              PDF automático exige ambiente server / Vercel.
            </p>
          )}
        </div>

        {/* ── Scratchpad section label ─────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <CreditCard size={14} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Contas Bancárias — Rascunho Local
          </span>
          <span className="text-[10px] text-gray-400 font-normal normal-case tracking-normal">
            (localStorage · não conectado ao pipeline canônico)
          </span>
        </div>

        {/* ── Summary cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Saldo Total",    value: fmtR(totalBalance),        icon: Wallet,      color: "text-brand-600",   bg: "bg-brand-50",   delta: `${accounts.length} conta${accounts.length !== 1 ? "s" : ""}` },
            { label: "Entradas (YTD)", value: fmtR(totalCredits),        icon: TrendingUp,  color: "text-emerald-600", bg: "bg-emerald-50", delta: `${allTx.filter(t => t.amount > 0).length} créditos` },
            { label: "Saídas (YTD)",   value: fmtR(totalDebits),         icon: TrendingDown,color: "text-red-600",     bg: "bg-red-50",     delta: `${allTx.filter(t => t.amount < 0).length} débitos` },
            { label: "Transações",     value: allTx.length.toString(),   icon: BarChart3,   color: "text-amber-700",   bg: "bg-amber-50",   delta: `em ${accounts.length} conta${accounts.length !== 1 ? "s" : ""}` },
          ].map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={c.color} />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{c.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{c.label}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-[10px] text-gray-400">{c.delta}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-5">

          {/* ── Account sidebar ──────────────────────────────────────────────── */}
          <div className="w-72 shrink-0 space-y-2">
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="w-full flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <Plus size={15} /> Nova Conta
            </button>

            {/* Add account form */}
            {showAddForm && (
              <div className="card p-4 space-y-3">
                <div className="text-xs font-semibold text-gray-700 mb-1">Nova Conta</div>
                <select
                  value={newBank}
                  onChange={(e) => setNewBank(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 focus:outline-none focus:border-brand-500"
                >
                  {BANK_GROUPS.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.banks.map((b) => <option key={b} value={b}>{b}</option>)}
                    </optgroup>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Nome da conta (ex: Conta PJ)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
                  onKeyDown={(e) => e.key === "Enter" && handleAddAccount()}
                />
                <input
                  type="number"
                  placeholder="Saldo inicial (opcional)"
                  value={newBalance}
                  onChange={(e) => setNewBalance(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-500"
                />
                <div className="flex gap-2">
                  <button onClick={handleAddAccount} className="flex-1 px-3 py-2 bg-brand-600 text-white rounded-lg text-xs font-semibold hover:bg-brand-700 transition-colors">
                    Adicionar
                  </button>
                  <button onClick={() => setShowAddForm(false)} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Account list */}
            {accounts.length === 0 && !showAddForm && (
              <div className="card p-6 text-center">
                <CreditCard size={28} className="text-gray-300 mx-auto mb-2" />
                <div className="text-sm font-semibold text-gray-500">Nenhuma conta</div>
                <div className="text-xs text-gray-400 mt-1">Clique em &quot;Nova Conta&quot; para começar</div>
              </div>
            )}

            {accounts.map((acct) => {
              const isSelected = acct.id === selectedId;
              const credits = acct.transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
              const debits  = acct.transactions.filter(t => t.amount < 0).reduce((s, t) => s + t.amount, 0);
              return (
                <div
                  key={acct.id}
                  onClick={() => setSelectedId(acct.id)}
                  className={`card p-4 cursor-pointer transition-all ${isSelected ? "border-brand-300 bg-brand-50" : "hover:border-gray-300"}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-9 h-9 rounded-xl ${acct.color} flex items-center justify-center shrink-0`}>
                      <Building2 size={15} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-gray-900 truncate">{acct.name}</div>
                      <div className="text-[10px] text-gray-500">{acct.bank}</div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(acct.id); }}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="text-base font-bold text-gray-900">{fmtR(acct.currentBalance)}</div>
                  <div className="flex gap-3 mt-1 text-[10px]">
                    <span className="text-emerald-600">↑ {fmtR(credits)}</span>
                    <span className="text-red-500">↓ {fmtR(debits)}</span>
                    <span className="text-gray-400 ml-auto">{acct.transactions.length} tx</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Main area ────────────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* ── Toast ─────────────────────────────────────────────────────── */}
            {toast && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-2.5 text-sm flex items-center justify-between">
                <span>{toast}</span>
                <Link href="/awq/reconciliation" className="ml-4 text-xs font-semibold text-emerald-700 underline shrink-0">
                  Ir para Conciliação →
                </Link>
              </div>
            )}

            {!selected ? (
              <div className="card p-16 text-center">
                <Wallet size={40} className="text-gray-300 mx-auto mb-3" />
                <div className="text-base font-semibold text-gray-500">Selecione uma conta</div>
                <div className="text-sm text-gray-400 mt-1">ou adicione uma nova conta no painel esquerdo</div>
              </div>
            ) : (
              <>
                {/* Account header */}
                <div className="card p-5 flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl ${selected.color} flex items-center justify-center shrink-0`}>
                    <Building2 size={20} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-bold text-gray-900">{selected.name}</div>
                    <div className="text-sm text-gray-500">{selected.bank} · Atualizado {fmtDate(selected.lastUpdated)}</div>
                  </div>
                  <div className="text-right mr-4">
                    <div className="text-2xl font-bold text-gray-900">{fmtR(selected.currentBalance)}</div>
                    <div className="text-xs text-gray-500">saldo atual</div>
                  </div>
                  <button
                    onClick={exportAll}
                    disabled={selected.transactions.length === 0}
                    title="Enviar todas as transações desta conta para a fila de Conciliação"
                    className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40"
                  >
                    <CheckCircle2 size={13} />
                    Conciliar tudo
                  </button>
                  <div className="flex gap-3 text-xs">
                    <div className="text-center">
                      <div className="font-bold text-emerald-600">{fmtR(acctCredits)}</div>
                      <div className="text-gray-400">entradas</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-red-600">{fmtR(acctDebits)}</div>
                      <div className="text-gray-400">saídas</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-gray-700">{selected.transactions.length}</div>
                      <div className="text-gray-400">transações</div>
                    </div>
                  </div>
                </div>

                {/* Reconciliation strip */}
                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 size={13} className="text-gray-400" />
                    <span className="text-xs font-semibold text-gray-700">Posição da Conta</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Saldo da Conta",   value: fmtR(selected.currentBalance), icon: Wallet,          color: "text-brand-600",   bg: "bg-brand-50"   },
                      { label: "Entradas",          value: fmtR(acctCredits),             icon: ArrowUpRight,    color: "text-emerald-600", bg: "bg-emerald-50" },
                      { label: "Saídas",            value: fmtR(Math.abs(acctDebits)),    icon: ArrowDownRight,  color: "text-red-600",     bg: "bg-red-50"     },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} className={`${item.bg} rounded-xl p-3 flex items-center gap-3`}>
                          <Icon size={15} className={item.color} />
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
                    <h3 className="text-sm font-semibold text-gray-900">
                      Transações
                      <span className="ml-2 text-xs font-normal text-gray-400">({filteredTx.length})</span>
                    </h3>
                    <div className="flex items-center gap-2 flex-1 max-w-xs">
                      <div className="relative flex-1">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Buscar transações…"
                          className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-400"
                        />
                        {search && (
                          <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
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
                    <div className="text-center py-12 space-y-2">
                      <Wallet size={28} className="text-gray-200 mx-auto" />
                      <div className="text-sm font-semibold text-gray-400">
                        {selected.transactions.length === 0
                          ? "Nenhuma transação nesta conta"
                          : "Nenhuma transação com este filtro"}
                      </div>
                      {selected.transactions.length === 0 && (
                        <div className="text-xs text-gray-400 mt-1">
                          Para importar extratos PDF com rastreabilidade completa, acesse{" "}
                          <Link href="/awq/ingest" className="text-brand-600 hover:underline font-medium">
                            Ingestão de Extratos
                          </Link>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="table-scroll">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-gray-500">
                            <th className="text-left py-2 px-3 text-xs font-semibold">Data</th>
                            <th className="text-left py-2 px-3 text-xs font-semibold">Descrição</th>
                            <th className="text-left py-2 px-3 text-xs font-semibold">Categoria</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold">Valor</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold">Saldo</th>
                            <th className="text-center py-2 px-3 text-xs font-semibold text-amber-600">Conciliar</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTx.map((tx) => (
                            <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                              <td className="py-2.5 px-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(tx.date)}</td>
                              <td className="py-2.5 px-3 text-xs text-gray-900 max-w-xs">
                                <div className="truncate">{tx.description}</div>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${CATEGORY_COLOR[tx.category] ?? "bg-gray-100 text-gray-600"}`}>
                                  {CATEGORY_LABEL[tx.category] ?? tx.category}
                                </span>
                              </td>
                              <td className={`py-2.5 px-3 text-right text-xs font-bold ${tx.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                {tx.amount >= 0 ? "+" : ""}{fmtR(tx.amount)}
                              </td>
                              <td className="py-2.5 px-3 text-right text-xs text-gray-500">
                                {tx.balance != null ? fmtR(tx.balance) : "—"}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {exportedIds.has(`bank_${selected.id}_${tx.id}`) ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                                    <CheckCircle2 size={11} /> Enviada
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => exportOne(tx)}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
                                  >
                                    → Conciliar
                                  </button>
                                )}
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
