"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Header from "@/components/Header";
import {
  Building2, Plus, Trash2, Loader2, CheckCircle2, AlertCircle,
  Search, X, Wallet, TrendingUp, TrendingDown, Sparkles,
  ArrowUpRight, ArrowDownRight, CreditCard, ChevronDown, ChevronUp,
  RefreshCw, Upload, BarChart3,
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

const LS_KEY = "awq_bank_accounts";
const LS_API  = "openclaw_api_key";
const BUILTIN = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY ?? "";

const BANK_OPTIONS = [
  "Bradesco", "Itaú", "Nubank", "Santander",
  "Banco do Brasil", "XP", "BTG", "Inter", "Sicoob", "Outro",
];

const BANK_COLOR: Record<string, string> = {
  "Bradesco":        "bg-red-600",
  "Itaú":            "bg-orange-500",
  "Nubank":          "bg-purple-600",
  "Santander":       "bg-red-700",
  "Banco do Brasil": "bg-yellow-500",
  "XP":              "bg-gray-700",
  "BTG":             "bg-blue-700",
  "Inter":           "bg-orange-600",
  "Sicoob":          "bg-green-700",
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

function resolveKey(): string | null {
  const stored = typeof window !== "undefined" ? localStorage.getItem(LS_API) : null;
  return stored || BUILTIN || null;
}

// ─── Claude parsing ───────────────────────────────────────────────────────────

async function parseStatementWithClaude(
  statement: string,
  apiKey: string,
  retryFix?: string
): Promise<{ transactions: BankTransaction[]; bankDetected: string | null; closingBalance: number | null }> {
  const userMessage = retryFix
    ? `The previous response was invalid JSON. Return ONLY valid JSON, fixing: ${retryFix}\n\nStatement:\n${statement}`
    : `Extract all transactions from this bank statement and return JSON with this exact structure:
{
  "bank_detected": "bank name or null",
  "period_from": "YYYY-MM-DD or null",
  "period_to": "YYYY-MM-DD or null",
  "closing_balance": number or null,
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "cleaned description in Portuguese",
      "amount": -150.00,
      "category": "one of: salario|aluguel|servicos|transferencia|imposto|investimento|saque|deposito|cartao|tarifas|outros",
      "balance": null
    }
  ]
}

Rules:
- negative amount = debit/saída, positive = credit/entrada
- Dates as YYYY-MM-DD (convert DD/MM/YYYY or any format)
- Parse ALL transactions, none skipped
- Clean and translate descriptions to Portuguese when needed
- Return ONLY raw JSON, no markdown, no explanation

Statement:
${statement}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      system: "You are a precise financial data extractor for Brazilian banks. Extract ALL transactions from any bank statement format (CSV, OFX, CNAB, plain text, PDF paste). Return ONLY valid raw JSON — no markdown, no code blocks, no explanation.",
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";

  // Strip markdown fences if present
  const clean = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

  let parsed: {
    bank_detected?: string | null;
    closing_balance?: number | null;
    transactions?: Array<{
      date?: string;
      description?: string;
      amount?: number;
      category?: string;
      balance?: number | null;
    }>;
  };

  try {
    parsed = JSON.parse(clean);
  } catch {
    if (!retryFix) {
      return parseStatementWithClaude(statement, apiKey, "invalid JSON returned");
    }
    throw new Error("Claude returned invalid JSON after retry");
  }

  const transactions: BankTransaction[] = (parsed.transactions ?? []).map((t) => ({
    id: uid(),
    date: t.date ?? "",
    description: t.description ?? "",
    amount: typeof t.amount === "number" ? t.amount : 0,
    category: t.category ?? "outros",
    balance: t.balance ?? undefined,
    original: undefined,
  }));

  return {
    transactions,
    bankDetected: parsed.bank_detected ?? null,
    closingBalance: parsed.closing_balance ?? null,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BankAccountsPage() {
  const [accounts, setAccounts]               = useState<BankAccount[]>([]);
  const [selectedId, setSelectedId]           = useState<string | null>(null);
  const [showAddForm, setShowAddForm]         = useState(false);
  const [showUpload, setShowUpload]           = useState(false);
  const [statement, setStatement]             = useState("");
  const [parsing, setParsing]                 = useState(false);
  const [parseError, setParseError]           = useState<string | null>(null);
  const [preview, setPreview]                 = useState<BankTransaction[] | null>(null);
  const [previewMeta, setPreviewMeta]         = useState<{ bank: string | null; balance: number | null } | null>(null);
  const [search, setSearch]                   = useState("");
  const [sortAsc, setSortAsc]                 = useState(false);
  const [newBank, setNewBank]                 = useState("Bradesco");
  const [newName, setNewName]                 = useState("");
  const [newBalance, setNewBalance]           = useState("");
  const textareaRef                           = useRef<HTMLTextAreaElement>(null);

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
  }, []);

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
    setNewBank("Bradesco");
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

  // ── Parse statement ──────────────────────────────────────────────────────
  async function handleParse() {
    if (!statement.trim()) return;
    const apiKey = resolveKey();
    if (!apiKey) { setParseError("Chave da API não configurada. Acesse Configurações."); return; }
    setParsing(true);
    setParseError(null);
    setPreview(null);
    try {
      const result = await parseStatementWithClaude(statement, apiKey);
      setPreview(result.transactions);
      setPreviewMeta({ bank: result.bankDetected, balance: result.closingBalance });
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Erro ao processar extrato");
    } finally {
      setParsing(false);
    }
  }

  // ── Confirm parsed transactions ──────────────────────────────────────────
  function handleConfirm() {
    if (!preview || !selected) return;
    const updated = accounts.map((a) => {
      if (a.id !== selected.id) return a;
      const merged = [...a.transactions];
      for (const tx of preview) {
        if (!merged.find((m) => m.date === tx.date && m.description === tx.description && m.amount === tx.amount)) {
          merged.push(tx);
        }
      }
      merged.sort((x, y) => y.date.localeCompare(x.date));
      const newBalance = previewMeta?.balance ?? a.currentBalance;
      return {
        ...a,
        transactions: merged,
        currentBalance: newBalance,
        lastUpdated: new Date().toISOString().slice(0, 10),
      };
    });
    save(updated);
    setPreview(null);
    setPreviewMeta(null);
    setStatement("");
    setShowUpload(false);
  }

  // ── Derived totals ───────────────────────────────────────────────────────
  const totalBalance  = accounts.reduce((s, a) => s + a.currentBalance, 0);
  const allTx         = accounts.flatMap((a) => a.transactions);
  const totalCredits  = allTx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalDebits   = allTx.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);

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
      <Header title="Contas de Banco" subtitle="Extratos, reconciliação e histórico de transações" />
      <div className="page-content">

        {/* ── Summary cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Saldo Total",    value: fmtR(totalBalance),  icon: Wallet,      color: "text-brand-600",   bg: "bg-brand-50",   delta: `${accounts.length} conta${accounts.length !== 1 ? "s" : ""}` },
            { label: "Entradas (YTD)", value: fmtR(totalCredits),  icon: TrendingUp,  color: "text-emerald-600", bg: "bg-emerald-50", delta: `${allTx.filter(t=>t.amount>0).length} créditos` },
            { label: "Saídas (YTD)",   value: fmtR(totalDebits),   icon: TrendingDown,color: "text-red-600",     bg: "bg-red-50",     delta: `${allTx.filter(t=>t.amount<0).length} débitos` },
            { label: "Transações",     value: allTx.length.toString(), icon: BarChart3, color: "text-amber-700", bg: "bg-amber-50",   delta: `em ${accounts.length} conta${accounts.length !== 1 ? "s" : ""}` },
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
                  {BANK_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
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
                  onClick={() => { setSelectedId(acct.id); setShowUpload(false); setPreview(null); }}
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
                    <div className="text-xs text-gray-400">saldo atual</div>
                  </div>
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
                  <button
                    onClick={() => { setShowUpload((v) => !v); setPreview(null); setParseError(null); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors shrink-0"
                  >
                    <Upload size={14} /> Carregar Extrato
                    {showUpload ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>

                {/* Upload / parse panel */}
                {showUpload && (
                  <div className="card p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <Sparkles size={15} className="text-brand-600" />
                      <h3 className="text-sm font-semibold text-gray-900">Processar Extrato com Claude IA</h3>
                      <span className="text-[10px] text-gray-400 ml-1">Aceita qualquer formato: CSV, OFX, CNAB, texto</span>
                    </div>

                    <textarea
                      ref={textareaRef}
                      value={statement}
                      onChange={(e) => setStatement(e.target.value)}
                      placeholder={`Cole aqui o extrato bancário em qualquer formato:

Exemplos aceitos:
• CSV do banco (copie e cole diretamente)
• Texto copiado do PDF do extrato
• Formato OFX ou CNAB
• Qualquer formato de texto com datas e valores

Ex:
01/03/2026;TED RECEBIDA - CLIENTE ABC;+15.000,00;R$42.350,00
02/03/2026;PAGAMENTO FORNECEDOR XYZ;-3.200,00;R$39.150,00
...`}
                      rows={10}
                      className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-400 focus:bg-white transition-colors resize-y font-mono"
                    />

                    {parseError && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        <AlertCircle size={14} className="shrink-0" />
                        {parseError}
                      </div>
                    )}

                    {!preview && (
                      <div className="flex gap-3">
                        <button
                          onClick={handleParse}
                          disabled={parsing || !statement.trim()}
                          className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors"
                        >
                          {parsing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                          {parsing ? "Processando…" : "Processar com Claude ✨"}
                        </button>
                        <button
                          onClick={() => { setShowUpload(false); setStatement(""); setParseError(null); }}
                          className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}

                    {/* Preview */}
                    {preview && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 size={15} className="text-emerald-600" />
                          <span className="text-sm font-semibold text-gray-900">
                            {preview.length} transações extraídas
                            {previewMeta?.bank && <span className="text-gray-500 font-normal"> · {previewMeta.bank}</span>}
                            {previewMeta?.balance != null && (
                              <span className="text-gray-500 font-normal"> · Saldo final: {fmtR(previewMeta.balance)}</span>
                            )}
                          </span>
                          <button onClick={() => { setPreview(null); setPreviewMeta(null); }} className="ml-auto text-gray-400 hover:text-gray-600">
                            <X size={14} />
                          </button>
                        </div>
                        <div className="border border-gray-200 rounded-xl overflow-hidden">
                          <div className="max-h-72 overflow-y-auto">
                            <table className="w-full text-xs">
                              <thead className="bg-gray-50 sticky top-0">
                                <tr className="border-b border-gray-200">
                                  <th className="text-left py-2 px-3 font-semibold text-gray-500">Data</th>
                                  <th className="text-left py-2 px-3 font-semibold text-gray-500">Descrição</th>
                                  <th className="text-left py-2 px-3 font-semibold text-gray-500">Categoria</th>
                                  <th className="text-right py-2 px-3 font-semibold text-gray-500">Valor</th>
                                </tr>
                              </thead>
                              <tbody>
                                {preview.map((tx) => (
                                  <tr key={tx.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="py-2 px-3 text-gray-500 whitespace-nowrap">{fmtDate(tx.date)}</td>
                                    <td className="py-2 px-3 text-gray-900 max-w-xs truncate">{tx.description}</td>
                                    <td className="py-2 px-3">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${CATEGORY_COLOR[tx.category] ?? "bg-gray-100 text-gray-600"}`}>
                                        {CATEGORY_LABEL[tx.category] ?? tx.category}
                                      </span>
                                    </td>
                                    <td className={`py-2 px-3 text-right font-bold ${tx.amount >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                      {tx.amount >= 0 ? "+" : ""}{fmtR(tx.amount)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={handleConfirm}
                            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors"
                          >
                            <CheckCircle2 size={14} /> Confirmar e Salvar
                          </button>
                          <button
                            onClick={() => { setPreview(null); setPreviewMeta(null); }}
                            className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors"
                          >
                            Descartar
                          </button>
                          <button
                            onClick={handleParse}
                            disabled={parsing}
                            className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-200 disabled:opacity-50 transition-colors ml-auto"
                          >
                            <RefreshCw size={13} /> Reprocessar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Reconciliation strip */}
                <div className="card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 size={13} className="text-gray-400" />
                    <span className="text-xs font-semibold text-gray-700">Reconciliação</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        label: "Saldo da Conta",
                        value: fmtR(selected.currentBalance),
                        icon: Wallet,
                        color: "text-brand-600",
                        bg: "bg-brand-50",
                      },
                      {
                        label: "Entradas",
                        value: fmtR(acctCredits),
                        icon: ArrowUpRight,
                        color: "text-emerald-600",
                        bg: "bg-emerald-50",
                      },
                      {
                        label: "Saídas",
                        value: fmtR(Math.abs(acctDebits)),
                        icon: ArrowDownRight,
                        color: "text-red-600",
                        bg: "bg-red-50",
                      },
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
                    <div className="text-center py-12">
                      <Upload size={28} className="text-gray-300 mx-auto mb-2" />
                      <div className="text-sm font-semibold text-gray-400">Nenhum extrato carregado</div>
                      <div className="text-xs text-gray-400 mt-1">Clique em &quot;Carregar Extrato&quot; para importar</div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 text-gray-500">
                            <th className="text-left py-2 px-3 text-xs font-semibold">Data</th>
                            <th className="text-left py-2 px-3 text-xs font-semibold">Descrição</th>
                            <th className="text-left py-2 px-3 text-xs font-semibold">Categoria</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold">Valor</th>
                            <th className="text-right py-2 px-3 text-xs font-semibold">Saldo</th>
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
                              <td className="py-2.5 px-3 text-right text-xs text-gray-400">
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
