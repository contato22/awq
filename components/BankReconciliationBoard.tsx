"use client";

// BankReconciliationBoard — Conta Azul-style side-by-side bank reconciliation
//
// LEFT column  → raw bank statement entry (date, description, bank amount)
// CENTER       → match quality badge + "Conciliar" action
// RIGHT column → system record (counterparty, category, classification note)
//
// TABS:
//   "Conciliações pendentes" → reconciliationStatus ∉ {conciliado, descartado}
//   "Movimentações"          → reconciliationStatus === conciliado
//
// PERSISTENCE: mirrors ReconciliationReviewTable (isStatic → localStorage,
//   otherwise PATCH /api/transactions/[id]).

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type {
  BankTransaction,
  ManagerialCategory,
  ReconciliationStatus,
} from "@/lib/financial-db";
import {
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Search,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApArSnap {
  id: string;
  type: "ap" | "ar";
  entity: string;
  amount: number;
  dueDate: string;
  status: string;
}

type MatchQuality = "perfeito" | "quase" | "ambiguo" | "sem_match";
type TabId = "pendentes" | "movimentacoes";
type DirectionFilter = "todos" | "recebimentos" | "pagamentos";

// ─── Format helpers ───────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const WEEKDAYS = [
  "Domingo",
  "Segunda-Feira",
  "Terça-Feira",
  "Quarta-Feira",
  "Quinta-Feira",
  "Sexta-Feira",
  "Sábado",
];

function fmtDate(s: string): { short: string; weekday: string } {
  if (!s) return { short: "—", weekday: "" };
  const [y, m, d] = s.split("-");
  const dow = WEEKDAYS[new Date(`${y}-${m}-${d}T12:00:00`).getDay()] ?? "";
  return { short: `${d}/${m}/${y}`, weekday: dow };
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// ─── Category label map ───────────────────────────────────────────────────────

const CAT_LABEL: Partial<Record<ManagerialCategory, string>> = {
  receita_recorrente:           "Receitas de Vendas",
  receita_projeto:              "Receita de Projeto",
  receita_consultoria:          "Consultoria",
  receita_producao:             "Produção",
  receita_social_media:         "Social Media",
  receita_revenue_share:        "Revenue Share",
  receita_fee_venture:          "Fee Venture",
  receita_eventual:             "Receita Eventual",
  rendimento_financeiro:        "Rendimento Financeiro",
  aporte_socio:                 "Aporte de Sócio",
  transferencia_interna_recebida: "Transf. Interna Recebida",
  ajuste_bancario_credito:      "Ajuste Bancário",
  recebimento_ambiguo:          "Recebimento (Revisar)",
  fornecedor_operacional:       "Fornecedor",
  freelancer_terceiro:          "Freelancer",
  folha_remuneracao:            "Folha de Pagamento",
  prolabore_retirada:           "Pró-labore",
  imposto_tributo:              "Imposto / Tributo",
  juros_multa_iof:              "Juros / Multa / IOF",
  tarifa_bancaria:              "Tarifa Bancária",
  software_assinatura:          "Software / Assinatura",
  marketing_midia:              "Marketing / Mídia",
  deslocamento_combustivel:     "Deslocamento",
  alimentacao_representacao:    "Alimentação",
  viagem_hospedagem:            "Viagem / Hospedagem",
  aluguel_locacao:              "Aluguel",
  energia_agua_internet:        "Energia / Água / Internet",
  servicos_contabeis_juridicos: "Contábil / Jurídico",
  cartao_compra_operacional:    "Cartão Operacional",
  despesa_pessoal_misturada:    "Despesa Pessoal",
  aplicacao_financeira:         "Aplicação Financeira",
  resgate_financeiro:           "Resgate Financeiro",
  transferencia_interna_enviada: "Transf. Interna Enviada",
  reserva_limite_cartao:        "Reserva Cartão",
  despesa_ambigua:              "Despesa (Revisar)",
  unclassified:                 "Não classificado",
};

// ─── Match quality config ─────────────────────────────────────────────────────

const MATCH_CFG: Record<
  MatchQuality,
  { label: string; bg: string; text: string; border: string }
> = {
  perfeito:  { label: "Match perfeito", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-300" },
  quase:     { label: "Quase lá",       bg: "bg-amber-50",  text: "text-amber-700",   border: "border-amber-300"   },
  ambiguo:   { label: "Revisar",        bg: "bg-orange-50", text: "text-orange-700",  border: "border-orange-300"  },
  sem_match: { label: "Sem match",      bg: "bg-gray-50",   text: "text-gray-500",    border: "border-gray-200"    },
};

// ─── Match computation ────────────────────────────────────────────────────────

function computeMatch(
  tx: BankTransaction,
  items: ApArSnap[]
): { quality: MatchQuality; diffAmount: number } {
  const expectedType = tx.direction === "debit" ? "ap" : "ar";
  const txMs = new Date(tx.transactionDate).getTime();
  const ms15d = 15 * 24 * 60 * 60 * 1000;

  let bestDiff = Infinity;
  for (const item of items) {
    if (item.type !== expectedType) continue;
    const dateDelta = Math.abs(new Date(item.dueDate).getTime() - txMs);
    if (dateDelta > ms15d) continue;
    const amtDiff = Math.abs(item.amount - Math.abs(tx.amount));
    if (amtDiff < bestDiff) bestDiff = amtDiff;
  }

  if (!isFinite(bestDiff)) {
    // No AP/AR candidate — quality is based on category classification
    const ambiguous =
      tx.managerialCategory === "despesa_ambigua" ||
      tx.managerialCategory === "recebimento_ambiguo" ||
      tx.managerialCategory === "unclassified";
    return { quality: ambiguous ? "sem_match" : "quase", diffAmount: 0 };
  }

  const rel = bestDiff / Math.max(Math.abs(tx.amount), 1);
  const quality: MatchQuality =
    rel === 0      ? "perfeito" :
    rel <= 0.005   ? "quase" :
    rel <= 0.05    ? "ambiguo" :
                     "sem_match";

  return { quality, diffAmount: bestDiff };
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const LS_OVERRIDES = "awq_reconciliation_overrides";
const LS_MANUAL    = "awq_manual_transactions";

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

function lsSet(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BankReconciliationBoard({
  initialTransactions,
  isStatic = false,
}: {
  initialTransactions: BankTransaction[];
  isStatic?: boolean;
}) {
  const [transactions, setTransactions] = useState<BankTransaction[]>(initialTransactions);
  const [apArSnaps, setApArSnaps]       = useState<ApArSnap[]>([]);
  const [activeTab, setActiveTab]       = useState<TabId>("pendentes");
  const [dirFilter, setDirFilter]       = useState<DirectionFilter>("todos");
  const [search, setSearch]             = useState("");
  const [selectedAccount, setSelectedAccount] = useState("todos");
  const [selectedMonth, setSelectedMonth]     = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [selectedIds, setSelectedIds]   = useState<Set<string>>(new Set());
  const [savingId, setSavingId]         = useState<string | null>(null);
  const [toast, setToast]               = useState<{ kind: "ok" | "err" | "info"; msg: string } | null>(null);
  const [, startTransition]             = useTransition();
  const searchRef = useRef<HTMLInputElement>(null);

  // ── Bootstrap from localStorage (static mode) ──────────────────────────────
  useEffect(() => {
    if (isStatic) {
      const overrides = lsGet<Record<string, Partial<BankTransaction>>>(LS_OVERRIDES, {});
      const manual    = lsGet<BankTransaction[]>(LS_MANUAL, []);
      const base = initialTransactions.map((t) =>
        overrides[t.id] ? { ...t, ...overrides[t.id] } : t
      );
      const existingIds = new Set(base.map((t) => t.id));
      const newManual = manual
        .filter((t) => !existingIds.has(t.id))
        .map((t) => overrides[t.id] ? { ...t, ...overrides[t.id] } : t);
      setTransactions([...base, ...newManual]);
    }
    setApArSnaps(lsGet<ApArSnap[]>("awq_ap_items", []));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStatic]);

  // ── Derived: unique accounts ────────────────────────────────────────────────
  const accounts = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of transactions) {
      const k = `${t.bank}::${t.accountName}`;
      if (!map.has(k)) map.set(k, `${t.accountName} · ${t.bank}`);
    }
    return [
      { key: "todos", label: "Todas as contas" },
      ...Array.from(map.entries()).map(([key, label]) => ({ key, label })),
    ];
  }, [transactions]);

  // ── Derived: balance stats (all months, selected account) ──────────────────
  const accountTxns = useMemo(() =>
    selectedAccount === "todos"
      ? transactions
      : transactions.filter((t) => `${t.bank}::${t.accountName}` === selectedAccount),
  [transactions, selectedAccount]);

  const balanceConciliado = useMemo(() =>
    accountTxns
      .filter((t) => t.reconciliationStatus === "conciliado")
      .reduce((s, t) => s + (t.direction === "credit" ? t.amount : -t.amount), 0),
  [accountTxns]);

  const pendingAmount = useMemo(() =>
    accountTxns
      .filter((t) => t.reconciliationStatus !== "conciliado" && t.reconciliationStatus !== "descartado")
      .reduce((s, t) => s + Math.abs(t.amount), 0),
  [accountTxns]);

  // ── Most-recent dates for info line ────────────────────────────────────────
  const lastExtracted = useMemo(() => {
    const dates = transactions.map((t) => t.extractedAt).filter(Boolean).sort().reverse();
    if (!dates[0]) return null;
    const d = new Date(dates[0]);
    return `${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  }, [transactions]);

  const lastImported = useMemo(() => {
    const dates = transactions.map((t) => t.transactionDate).filter(Boolean).sort().reverse();
    return dates[0] ? fmtDate(dates[0]).short : null;
  }, [transactions]);

  // ── Month-filtered transactions ─────────────────────────────────────────────
  const monthTxns = useMemo(() =>
    accountTxns.filter((t) => {
      const d = new Date(t.transactionDate);
      return d.getFullYear() === selectedMonth.year && d.getMonth() === selectedMonth.month;
    }),
  [accountTxns, selectedMonth]);

  // ── Tab split ───────────────────────────────────────────────────────────────
  const pendentes = useMemo(() =>
    monthTxns.filter((t) =>
      t.reconciliationStatus !== "conciliado" && t.reconciliationStatus !== "descartado"
    ),
  [monthTxns]);

  const movimentacoes = useMemo(() =>
    monthTxns.filter((t) => t.reconciliationStatus === "conciliado"),
  [monthTxns]);

  const tabTxns = activeTab === "pendentes" ? pendentes : movimentacoes;

  // ── Direction + search filter ───────────────────────────────────────────────
  const filtered = useMemo(() => {
    let base = tabTxns;
    if (dirFilter === "recebimentos") base = base.filter((t) => t.direction === "credit");
    if (dirFilter === "pagamentos")   base = base.filter((t) => t.direction === "debit");
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter((t) =>
        t.descriptionOriginal.toLowerCase().includes(q) ||
        fmtBRL(t.amount).includes(q) ||
        (t.counterpartyName ?? "").toLowerCase().includes(q)
      );
    }
    return [...base].sort((a, b) => b.transactionDate.localeCompare(a.transactionDate));
  }, [tabTxns, dirFilter, search]);

  const counts = useMemo(() => ({
    todos:        tabTxns.length,
    recebimentos: tabTxns.filter((t) => t.direction === "credit").length,
    pagamentos:   tabTxns.filter((t) => t.direction === "debit").length,
  }), [tabTxns]);

  // ── Toast ───────────────────────────────────────────────────────────────────
  function showToast(kind: "ok" | "err" | "info", msg: string) {
    setToast({ kind, msg });
    setTimeout(() => setToast(null), 4000);
  }

  // ── Patch helper ─────────────────────────────────────────────────────────────
  const applyPatch = useCallback(
    (id: string, patch: Partial<BankTransaction>) => {
      const now = new Date().toISOString();
      if (isStatic) {
        const overrides = lsGet<Record<string, Partial<BankTransaction>>>(LS_OVERRIDES, {});
        overrides[id] = { ...(overrides[id] ?? {}), ...patch, classifiedAt: now };
        lsSet(LS_OVERRIDES, overrides);
        const manual = lsGet<BankTransaction[]>(LS_MANUAL, []);
        lsSet(LS_MANUAL, manual.map((t) => t.id === id ? { ...t, ...patch, classifiedAt: now } : t));
      }
      startTransition(() => {
        setTransactions((prev) => prev.map((t) => t.id === id ? { ...t, ...patch, classifiedAt: now } : t));
      });
      setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
    },
    [isStatic]
  );

  // ── Conciliar ───────────────────────────────────────────────────────────────
  async function handleReconcile(id: string) {
    const patch = { reconciliationStatus: "conciliado" as ReconciliationStatus };
    if (isStatic) {
      applyPatch(id, patch);
      showToast("ok", "Conciliado com sucesso.");
      return;
    }
    setSavingId(id);
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("Falha ao salvar");
      const updated = (await res.json()) as BankTransaction;
      startTransition(() =>
        setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)))
      );
      showToast("ok", "Conciliado com sucesso.");
    } catch (e) {
      showToast("err", e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSavingId(null);
    }
  }

  // ── Ignorar ──────────────────────────────────────────────────────────────────
  function handleIgnore(id: string) {
    applyPatch(id, { reconciliationStatus: "descartado" as ReconciliationStatus });
    showToast("info", "Lançamento ignorado.");
  }

  // ── Bulk conciliar ───────────────────────────────────────────────────────────
  function handleBulkReconcile() {
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) {
      applyPatch(id, { reconciliationStatus: "conciliado" as ReconciliationStatus });
    }
    showToast("ok", `${selectedIds.size} lançamento(s) conciliado(s).`);
    setSelectedIds(new Set());
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(
      selectedIds.size === filtered.length ? new Set() : new Set(filtered.map((t) => t.id))
    );
  }

  function navigateMonth(dir: 1 | -1) {
    setSelectedMonth(({ year, month }) => {
      let m = month + dir;
      let y = year;
      if (m < 0)  { m = 11; y--; }
      if (m > 11) { m = 0;  y++; }
      return { year: y, month: m };
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={
            "fixed top-4 right-4 z-50 rounded-xl px-4 py-3 text-sm shadow-lg border max-w-xs " +
            (toast.kind === "ok"   ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
             toast.kind === "info" ? "bg-blue-50 border-blue-200 text-blue-800" :
                                     "bg-red-50 border-red-200 text-red-800")
          }
        >
          {toast.msg}
        </div>
      )}

      {/* ── Top bar: account selector · action buttons · month nav · balances ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">

        {/* Left: account + actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Account dropdown */}
          <div className="relative">
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="appearance-none pl-4 pr-9 py-2 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-800 focus:outline-none focus:border-brand-400 min-w-[210px] cursor-pointer"
            >
              {accounts.map((a) => (
                <option key={a.key} value={a.key}>{a.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            Ações da conta <ChevronDown size={13} className="text-gray-400" />
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors">
            <Building2 size={13} className="text-blue-500" />
            Fluxo de caixa
          </button>
        </div>

        {/* Right: month navigation + balance summary */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-800 min-w-[170px] justify-center select-none">
              {MONTH_NAMES[selectedMonth.month]} de {selectedMonth.year}
              <ChevronDown size={13} className="text-gray-400 ml-1" />
            </div>
            <button
              onClick={() => navigateMonth(1)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <div className="flex items-center gap-5 text-xs">
            <div>
              <span className="text-gray-500">Saldo atual no sistema</span>
              <span className="ml-2 font-bold text-gray-900">{fmtBRL(Math.abs(balanceConciliado))}</span>
            </div>
            <div>
              <span className="text-gray-500">Valor pendente de conciliação</span>
              <span className="ml-2 font-bold text-amber-700">{fmtBRL(pendingAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Info line ──────────────────────────────────────────────────────────── */}
      {(lastExtracted || lastImported) && (
        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          {lastExtracted && (
            <span>Data da última atualização: <strong className="text-gray-700">{lastExtracted}</strong></span>
          )}
          {lastImported && (
            <span>Data do último lançamento importado: <strong className="text-gray-700">{lastImported}</strong></span>
          )}
        </div>
      )}

      {/* ── Tabs ─────────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab("pendentes")}
          className={
            "px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors " +
            (activeTab === "pendentes"
              ? "border-amber-500 text-amber-700"
              : "border-transparent text-gray-500 hover:text-gray-700")
          }
        >
          Conciliações pendentes
          {pendentes.length > 0 && (
            <span className={
              "ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold " +
              (activeTab === "pendentes" ? "bg-amber-500 text-white" : "bg-gray-200 text-gray-600")
            }>
              {pendentes.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("movimentacoes")}
          className={
            "px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors " +
            (activeTab === "movimentacoes"
              ? "border-blue-500 text-blue-700"
              : "border-transparent text-gray-500 hover:text-gray-700")
          }
        >
          Movimentações
        </button>
      </div>

      {/* ── Search bar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquise o lançamento bancário"
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-400"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={13} />
            </button>
          )}
        </div>
        {search && (
          <button
            onClick={() => setSearch("")}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <X size={12} /> Limpar filtros
          </button>
        )}
        {activeTab === "pendentes" && (
          <button className="ml-auto text-xs text-gray-600 border border-gray-300 rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors">
            Ver lançamentos ignorados
          </button>
        )}
      </div>

      {/* ── Direction tabs + action bar ──────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 justify-between">

        {/* Direction filter tabs */}
        <div className="flex rounded-xl border border-gray-200 bg-white overflow-hidden divide-x divide-gray-200">
          {(["todos", "recebimentos", "pagamentos"] as DirectionFilter[]).map((f) => {
            const label   = f === "todos" ? "Todos" : f === "recebimentos" ? "Recebimentos" : "Pagamentos";
            const count   = counts[f];
            const active  = dirFilter === f;
            const numColor =
              f === "recebimentos" ? "text-emerald-600" :
              f === "pagamentos"   ? "text-red-600" :
                                     "text-gray-700";
            return (
              <button
                key={f}
                onClick={() => setDirFilter(f)}
                className={
                  "px-5 py-2 text-xs font-medium transition-colors text-center min-w-[80px] " +
                  (active ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-50")
                }
              >
                <div>{label}</div>
                <div className={`text-lg font-bold mt-0.5 ${numColor}`}>{count}</div>
              </button>
            );
          })}
        </div>

        {/* Action buttons (pendentes tab only) */}
        {activeTab === "pendentes" && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Selecionar lançamentos <ChevronDown size={12} className="text-gray-400" />
            </button>
            <button
              onClick={handleBulkReconcile}
              disabled={selectedIds.size === 0}
              className="px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Conciliar
            </button>
            <button className="px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Editar
            </button>
            <button className="px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Desvincular
            </button>
            <button
              onClick={() => {
                for (const id of selectedIds) handleIgnore(id);
                setSelectedIds(new Set());
              }}
              disabled={selectedIds.size === 0}
              className="px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Ignorar
            </button>
            <button className="flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Ordenar <ChevronDown size={12} className="text-gray-400" />
            </button>
          </div>
        )}
      </div>

      {/* ── Column headers ───────────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-[1fr_120px_1fr] gap-0 px-1">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-red-500 flex items-center justify-center text-white text-[10px] font-extrabold shrink-0">
              B
            </span>
            <span className="text-xs font-bold text-gray-700">Lançamentos do banco</span>
          </div>
          <div />
          <div className="flex items-center gap-2 justify-end">
            <span className="text-xs font-bold text-gray-700">Lançamentos da Conta AWQ</span>
            <span className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
              <Building2 size={10} className="text-white" />
            </span>
          </div>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white py-14 text-center">
          <CheckCircle2 size={36} className="text-emerald-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-700">
            {activeTab === "pendentes"
              ? "Nenhum lançamento pendente neste período"
              : "Nenhuma movimentação conciliada"}
          </p>
          <p className="text-xs text-gray-400 mt-1">Tente outro mês ou ajuste os filtros</p>
        </div>
      )}

      {/* ── Reconciliation items ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        {filtered.map((tx) => {
          const { quality, diffAmount } = computeMatch(tx, apArSnaps);
          const matchCfg   = MATCH_CFG[quality];
          const isCredit   = tx.direction === "credit";
          const dateInfo   = fmtDate(tx.transactionDate);
          const isSelected = selectedIds.has(tx.id);
          const isSaving   = savingId === tx.id;
          const catLabel   = CAT_LABEL[tx.managerialCategory] ?? tx.managerialCategory;

          return (
            <div
              key={tx.id}
              className={
                "grid grid-cols-[1fr_120px_1fr] rounded-xl border overflow-hidden transition-colors " +
                (isSelected
                  ? "border-amber-300 bg-amber-50/20"
                  : "border-gray-200 bg-white hover:border-gray-300")
              }
            >
              {/* ── LEFT: Bank entry ─────────────────────────────────────── */}
              <div className="p-4 flex flex-col gap-2">
                {/* Date + amount */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {activeTab === "pendentes" && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(tx.id)}
                        className="rounded border-gray-300 text-amber-500 focus:ring-amber-400 shrink-0 mt-0.5"
                      />
                    )}
                    <div>
                      <span className="text-xs font-semibold text-gray-800">{dateInfo.short}</span>
                      <span className="ml-1.5 text-xs text-gray-400">{dateInfo.weekday}</span>
                    </div>
                  </div>
                  <span className={`text-sm font-bold whitespace-nowrap ${isCredit ? "text-emerald-600" : "text-red-600"}`}>
                    {isCredit ? "+" : ""}{fmtBRL(Math.abs(tx.amount))}
                  </span>
                </div>

                {/* Description */}
                <p
                  className="text-sm text-gray-800 font-medium truncate"
                  title={tx.descriptionOriginal}
                >
                  {tx.descriptionOriginal}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between mt-auto pt-1">
                  <span className="text-[11px] text-gray-400 bg-gray-50 border border-gray-200 rounded px-2 py-0.5">
                    {tx.bank} · {tx.accountName}
                  </span>
                  {activeTab === "pendentes" && (
                    <button
                      onClick={() => handleIgnore(tx.id)}
                      className="text-[11px] text-gray-500 border border-gray-200 rounded px-2 py-0.5 hover:border-red-300 hover:text-red-600 transition-colors"
                    >
                      Ignorar
                    </button>
                  )}
                </div>
              </div>

              {/* ── CENTER: match badge + action ────────────────────────── */}
              <div className="flex flex-col items-center justify-center gap-2 bg-gray-50 border-x border-gray-200 px-2 py-4">
                <span className={
                  `text-[10px] px-2 py-0.5 rounded-full border font-semibold text-center leading-tight ` +
                  `${matchCfg.bg} ${matchCfg.text} ${matchCfg.border}`
                }>
                  {matchCfg.label}
                </span>
                {activeTab === "pendentes" ? (
                  <button
                    disabled={isSaving}
                    onClick={() => void handleReconcile(tx.id)}
                    className="w-full px-2 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
                  >
                    {isSaving ? "…" : "Conciliar"}
                  </button>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border font-semibold bg-emerald-50 text-emerald-700 border-emerald-200">
                    ✓ Conciliado
                  </span>
                )}
              </div>

              {/* ── RIGHT: System (AWQ) entry ──────────────────────────── */}
              <div className="p-4 flex flex-col gap-2">
                {/* Amount + diff + date */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-sm font-bold ${isCredit ? "text-emerald-600" : "text-red-600"}`}>
                      {fmtBRL(Math.abs(tx.amount))}
                    </span>
                    {diffAmount > 0 && (
                      <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-700 rounded px-1.5 py-0.5 whitespace-nowrap">
                        Diferença {fmtBRL(diffAmount)}
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-semibold text-gray-800">{dateInfo.short}</span>
                    <span className="ml-1.5 text-xs text-gray-400">{dateInfo.weekday}</span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-sm text-gray-800 font-medium truncate" title={tx.descriptionOriginal}>
                  {tx.descriptionOriginal}
                </p>

                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px]">
                  <div>
                    <span className="text-gray-400">Cliente: </span>
                    <span className="text-gray-700">{tx.counterpartyName ?? "Não informado"}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Categoria: </span>
                    <span className="text-gray-700">{catLabel}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Juros/multa: </span>
                    <span className="text-gray-700">{fmtBRL(0)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Desconto: </span>
                    <span className="text-gray-700">{fmtBRL(0)}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-auto pt-1">
                  <button className="flex items-center gap-1 text-[11px] text-gray-600 border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-50 transition-colors">
                    Ajustar valores <ChevronDown size={10} />
                  </button>
                  <button className="text-[11px] text-gray-600 border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-50 transition-colors">
                    Editar
                  </button>
                  <button className="text-[11px] text-gray-600 border border-gray-200 rounded-lg px-2 py-1 hover:bg-gray-50 transition-colors">
                    Desvincular
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
