"use client";

import { useState, useMemo } from "react";
import {
  Search, ChevronDown, ChevronLeft, ChevronRight,
  X, Check, Sparkles, Eye, EyeOff,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type DirectionFilter = "all" | "credit" | "debit";
type ActiveTab = "pendentes" | "movimentacoes";
type UnmatchedMode = "novo" | "transferencia" | "buscar";

interface BankTxn {
  id: string;
  date: string;
  weekday: string;
  amount: number;
  description: string;
  source: string;
}

interface SystemTxn {
  id: string;
  date: string;
  weekday: string;
  amount: number;
  description: string;
  supplier: string;
  interest: number;
  discount: number;
  category: string;
}

interface Pair {
  id: string;
  bank: BankTxn;
  system?: SystemTxn;
  ignored: boolean;
  reconciled: boolean;
  selected: boolean;
  unmatchedMode: UnmatchedMode;
  newDesc: string;
  newCategory: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(n: number) {
  return "R$ " + Math.abs(n).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const WEEKDAYS = [
  "Domingo", "Segunda-Feira", "Terça-Feira", "Quarta-Feira",
  "Quinta-Feira", "Sexta-Feira", "Sábado",
];

function getWeekday(dateStr: string) {
  const [d, m, y] = dateStr.split("/").map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
}

const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

const ACCOUNTS = [
  { id: "bs2",    label: "BS2 – Exemplo" },
  { id: "itau",   label: "Itaú – Conta Principal" },
  { id: "nubank", label: "Nubank – Conta PJ" },
];

const CATEGORIES = [
  "Adiantamento Salarial",
  "Materiais Aplicados na Prestação de Serviços",
  "Receita de Serviços",
  "Tarifa Bancária",
  "Pró-Labore",
  "Software e Assinaturas",
  "Consultoria",
  "Transferência Interna",
];

// ─── Seed ─────────────────────────────────────────────────────────────────────

function mkPair(
  id: string,
  date: string,
  amount: number,
  bankDesc: string,
  source: string,
  sys?: Partial<SystemTxn>,
): Pair {
  const wd = getWeekday(date);
  return {
    id,
    bank: { id: `${id}-b`, date, weekday: wd, amount, description: bankDesc, source },
    system: sys
      ? {
          id: `${id}-s`,
          date, weekday: wd, amount,
          description: sys.description ?? bankDesc,
          supplier: sys.supplier ?? "Não informado",
          interest: sys.interest ?? 0,
          discount: sys.discount ?? 0,
          category: sys.category ?? CATEGORIES[0],
        }
      : undefined,
    ignored: false,
    reconciled: false,
    selected: false,
    unmatchedMode: "novo",
    newDesc: bankDesc,
    newCategory: CATEGORIES[1],
  };
}

const SEED: Pair[] = [
  mkPair("p0", "01/07/2024", -572,   "Débito Pix",       "Integração manual", {
    description: "Pagamento fornecedor", supplier: "Não informado", category: "Adiantamento Salarial",
  }),
  mkPair("p1", "01/07/2024", -572,   "Débito Pix",       "Integração manual"),
  mkPair("p2", "02/07/2024",  8750,  "Pix recebido",     "OFX", {
    description: "Receita JACQES – Projeto Alpha", supplier: "Cliente Alpha Ltda", category: "Receita de Serviços",
  }),
  mkPair("p3", "03/07/2024", -1500,  "TED enviada",      "OFX"),
  mkPair("p4", "04/07/2024",  3200,  "Pix recebido",     "CSV", {
    description: "Recebimento consultoria", supplier: "Beta Corp", discount: 50, category: "Consultoria",
  }),
  mkPair("p5", "05/07/2024", -42.9,  "Tarifa bancária",  "Integração manual"),
  mkPair("p6", "07/07/2024", -5000,  "TED enviada",      "OFX", {
    description: "Pró-Labore Sócios", category: "Pró-Labore",
  }),
  mkPair("p7", "08/07/2024", -299,   "Débito automático","Integração manual"),
  mkPair("p8", "10/07/2024",  12400, "Pix recebido",     "CSV", {
    description: "Receita Caza Vision – Produção vídeo", supplier: "Gamma Filmes", category: "Receita de Serviços",
  }),
  mkPair("p9", "12/07/2024", -800,   "Débito Pix",       "OFX"),
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function BankReconciliationPanel() {
  const [pairs, setPairs]           = useState<Pair[]>(SEED);
  const [activeTab, setActiveTab]   = useState<ActiveTab>("pendentes");
  const [dirFilter, setDirFilter]   = useState<DirectionFilter>("all");
  const [search, setSearch]         = useState("");
  const [showIgnored, setShowIgnored] = useState(false);
  const [account, setAccount]       = useState("bs2");
  const [monthOffset, setMonthOffset] = useState(0); // 0 = julho/2024

  // Month label
  const base  = new Date(2024, 6, 1); // July 2024
  const ref   = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
  const monthLabel = `${MONTHS[ref.getMonth()]} de ${ref.getFullYear()}`;

  // Derived lists
  const pending    = pairs.filter(p => !p.reconciled && !p.ignored);
  const ignored    = pairs.filter(p => p.ignored);
  const reconciled = pairs.filter(p => p.reconciled);

  const visiblePairs = useMemo(() => {
    let list = showIgnored ? ignored : pending;
    if (dirFilter === "credit") list = list.filter(p => p.bank.amount > 0);
    if (dirFilter === "debit")  list = list.filter(p => p.bank.amount < 0);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.bank.description.toLowerCase().includes(q) ||
        (p.system?.description ?? "").toLowerCase().includes(q) ||
        fmtBRL(p.bank.amount).includes(q),
      );
    }
    return list;
  }, [pairs, showIgnored, dirFilter, search, pending, ignored]);

  const todos        = pending.length;
  const recebimentos = pending.filter(p => p.bank.amount > 0).length;
  const pagamentos   = pending.filter(p => p.bank.amount < 0).length;
  const pendingValue = pending.reduce((s, p) => s + Math.abs(p.bank.amount), 0);
  const anySelected  = pairs.some(p => p.selected && !p.reconciled && !p.ignored);

  // ── Mutations ────────────────────────────────────────────────────────────────

  function update(id: string, patch: Partial<Pair>) {
    setPairs(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  }

  function reconcile(id: string) {
    update(id, { reconciled: true, selected: false });
  }

  function reconcileSelected() {
    setPairs(prev => prev.map(p => p.selected && !p.reconciled && !p.ignored
      ? { ...p, reconciled: true, selected: false } : p));
  }

  function createAndReconcile(id: string) {
    const pair = pairs.find(p => p.id === id);
    if (!pair) return;
    const newSys: SystemTxn = {
      id: uid(),
      date: pair.bank.date, weekday: pair.bank.weekday, amount: pair.bank.amount,
      description: pair.newDesc, supplier: "Não informado",
      interest: 0, discount: 0, category: pair.newCategory,
    };
    update(id, { system: newSys, reconciled: true });
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

      {/* Account bar */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <div className="relative">
            <select
              value={account}
              onChange={e => setAccount(e.target.value)}
              className="appearance-none pl-4 pr-8 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 bg-white focus:outline-none focus:border-brand-400 cursor-pointer"
            >
              {ACCOUNTS.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">
            Ações da conta <ChevronDown size={11} />
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">
            Fluxo de caixa
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setMonthOffset(o => o - 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              <ChevronLeft size={15} />
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50">
              {monthLabel} <ChevronDown size={12} />
            </button>
            <button
              onClick={() => setMonthOffset(o => o + 1)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-0.5 text-xs text-gray-600">
            <p>Data da última atualização: <span className="font-medium text-gray-900">19/11/2024 às 16h09</span></p>
            <p>Data do último lançamento importado: <span className="font-medium text-gray-900">31/07/2024</span></p>
          </div>
          <div className="text-right text-xs space-y-0.5">
            <p className="text-gray-500">Saldo atual <span className="font-semibold text-gray-900">R$ 6.502,99</span></p>
            <p className="text-gray-500">Valor pendente de conciliação <span className="font-semibold text-red-600">{fmtBRL(pendingValue)}</span></p>
          </div>
        </div>
      </div>

      {/* Main tabs */}
      <div className="flex border-b border-gray-200 px-6">
        {(["pendentes", "movimentacoes"] as ActiveTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab ? "border-yellow-400 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "pendentes"
              ? <span>Conciliações pendentes <span className="ml-1 bg-yellow-300 text-yellow-900 text-[11px] px-1.5 py-0.5 rounded font-bold">{todos}</span></span>
              : <span>Movimentações <span className="ml-1 bg-gray-100 text-gray-600 text-[11px] px-1.5 py-0.5 rounded font-bold">{reconciled.length}</span></span>
            }
          </button>
        ))}
      </div>

      {/* ── Pendentes tab ──────────────────────────────────────────────────────── */}
      {activeTab === "pendentes" && (
        <>
          {/* Search bar */}
          <div className="px-6 py-3 border-b border-gray-100">
            <p className="text-[11px] text-gray-500 font-medium mb-2">Pesquise o lançamento bancário</p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Descrição ou valor"
                  className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-400"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={12} />
                  </button>
                )}
              </div>
              {search && (
                <button onClick={() => setSearch("")} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                  <X size={11} /> Limpar filtros
                </button>
              )}
              <button
                onClick={() => setShowIgnored(v => !v)}
                className={`ml-auto flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-medium transition-colors ${
                  showIgnored ? "bg-gray-100 border-gray-400 text-gray-900" : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {showIgnored ? <EyeOff size={13} /> : <Eye size={13} />}
                {showIgnored ? "Ocultar ignorados" : "Ver lançamentos ignorados"}
                {ignored.length > 0 && (
                  <span className="bg-gray-200 text-gray-700 text-[10px] px-1 rounded ml-0.5">{ignored.length}</span>
                )}
              </button>
            </div>
          </div>

          {/* Direction filter tabs */}
          <div className="flex border-b border-gray-200 px-6">
            {([
              { key: "all",    label: "Todos",        count: todos },
              { key: "credit", label: "Recebimentos", count: recebimentos },
              { key: "debit",  label: "Pagamentos",   count: pagamentos },
            ] as { key: DirectionFilter; label: string; count: number }[]).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setDirFilter(key)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  dirFilter === key ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {label}{" "}
                <span className={dirFilter === key ? "text-blue-600 font-bold" : "text-gray-400"}>{count}</span>
              </button>
            ))}
          </div>

          {/* Action toolbar */}
          <div className="flex flex-wrap items-center gap-2 px-6 py-2.5 border-b border-gray-100 bg-gray-50/70">
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 bg-white rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">
              Selecionar lançamentos <ChevronDown size={11} />
            </button>
            <button
              onClick={reconcileSelected}
              disabled={!anySelected}
              className="px-3 py-1.5 border border-gray-300 bg-white rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Conciliar
            </button>
            <button className="px-3 py-1.5 border border-gray-300 bg-white rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">
              Editar
            </button>
            <button className="px-3 py-1.5 border border-gray-300 bg-white rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">
              Desvincular
            </button>
            <button className="px-3 py-1.5 border border-gray-300 bg-white rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">
              Ignorar
            </button>
            <div className="ml-auto">
              <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 bg-white rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">
                Ordenar <ChevronDown size={11} />
              </button>
            </div>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[1fr_140px_1fr] px-6 py-2.5 border-b border-gray-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
              <span className="w-5 h-5 rounded bg-gray-700 text-white text-[10px] font-black flex items-center justify-center">B</span>
              Lançamentos do banco
            </div>
            <div />
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">A</span>
              Lançamentos do sistema
            </div>
          </div>

          {/* Transaction pairs */}
          <div className="divide-y divide-gray-100">
            {visiblePairs.length === 0 && (
              <div className="py-16 text-center text-xs text-gray-400">
                {showIgnored ? "Nenhum lançamento ignorado" : "Nenhum lançamento pendente de conciliação"}
              </div>
            )}
            {visiblePairs.map(pair => (
              <PairRow
                key={pair.id}
                pair={pair}
                isIgnoredView={showIgnored}
                onToggleSelect={() => update(pair.id, { selected: !pair.selected })}
                onReconcile={() => reconcile(pair.id)}
                onIgnore={() => update(pair.id, { ignored: true, selected: false })}
                onUnignore={() => update(pair.id, { ignored: false })}
                onUnlink={() => update(pair.id, { system: undefined })}
                onSetMode={mode => update(pair.id, { unmatchedMode: mode })}
                onSetDesc={desc => update(pair.id, { newDesc: desc })}
                onSetCategory={cat => update(pair.id, { newCategory: cat })}
                onCreateAndReconcile={() => createAndReconcile(pair.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Movimentações tab ──────────────────────────────────────────────────── */}
      {activeTab === "movimentacoes" && (
        <MovimentacoesTab pairs={reconciled} />
      )}
    </div>
  );
}

// ─── PairRow ──────────────────────────────────────────────────────────────────

function PairRow({
  pair, isIgnoredView,
  onToggleSelect, onReconcile, onIgnore, onUnignore, onUnlink,
  onSetMode, onSetDesc, onSetCategory, onCreateAndReconcile,
}: {
  pair: Pair;
  isIgnoredView: boolean;
  onToggleSelect: () => void;
  onReconcile: () => void;
  onIgnore: () => void;
  onUnignore: () => void;
  onUnlink: () => void;
  onSetMode: (m: UnmatchedMode) => void;
  onSetDesc: (d: string) => void;
  onSetCategory: (c: string) => void;
  onCreateAndReconcile: () => void;
}) {
  const isDebit  = pair.bank.amount < 0;
  const amtColor = isDebit ? "text-red-600" : "text-emerald-600";
  const amtStr   = (isDebit ? "R$ -" : "R$ ") + fmtBRL(pair.bank.amount).replace("R$ ", "");

  return (
    <div className={`grid grid-cols-[1fr_140px_1fr] gap-0 px-6 py-4 transition-colors ${pair.selected ? "bg-blue-50" : "hover:bg-gray-50/40"}`}>

      {/* ── Left: bank transaction ───────────────────────────────────────────── */}
      <div className={`border border-gray-200 rounded-lg p-4 bg-white ${isIgnoredView ? "opacity-60" : ""}`}>
        <div className="flex items-start gap-3">
          {!isIgnoredView && (
            <input
              type="checkbox"
              checked={pair.selected}
              onChange={onToggleSelect}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-blue-600 cursor-pointer shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[11px] text-gray-500 leading-tight">{pair.bank.date} {pair.bank.weekday}</span>
              <span className={`text-sm font-bold ${amtColor} shrink-0`}>{amtStr}</span>
            </div>
            <p className="mt-1.5 text-sm text-gray-800">{pair.bank.description}</p>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100">
          <span className="text-[10px] text-gray-400">{pair.bank.source}</span>
          {isIgnoredView ? (
            <button onClick={onUnignore} className="text-[11px] text-blue-600 hover:underline font-medium">
              Restaurar
            </button>
          ) : (
            <button onClick={onIgnore} className="px-2.5 py-1 border border-gray-300 rounded text-[11px] text-gray-600 hover:bg-gray-50">
              Ignorar
            </button>
          )}
        </div>
      </div>

      {/* ── Center: bridge ───────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center gap-2 px-3">
        {!isIgnoredView && pair.system && (
          <>
            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
              Encontramos <Sparkles size={10} className="fill-current" />
            </span>
            <button
              onClick={onReconcile}
              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Conciliar
            </button>
          </>
        )}
      </div>

      {/* ── Right: system transaction or match options ────────────────────────── */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
        {pair.system ? (
          // Matched
          <div className="p-4 border-t-4 border-emerald-400">
            <div className="flex items-start justify-between gap-2 mb-2">
              <span className={`text-sm font-bold ${amtColor}`}>{amtStr}</span>
              <span className="text-[11px] text-gray-500 text-right leading-tight">{pair.system.date} {pair.system.weekday}</span>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-3">{pair.system.description}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-600">
              <div><span className="text-gray-400">Fornecedor:</span> {pair.system.supplier}</div>
              <div><span className="text-gray-400">Categoria:</span> {pair.system.category}</div>
              <div><span className="text-gray-400">Juros/multa:</span> R$ {pair.system.interest.toFixed(2).replace(".", ",")}</div>
              <div><span className="text-gray-400">Desconto:</span> R$ {pair.system.discount.toFixed(2).replace(".", ",")}</div>
            </div>
            <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-gray-100">
              <button className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">
                Editar
              </button>
              <button onClick={onUnlink} className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50">
                Desvincular
              </button>
            </div>
          </div>
        ) : !isIgnoredView ? (
          // Unmatched — show creation options
          <div>
            <div className="flex border-b border-gray-200">
              {([
                { mode: "novo",          label: "Novo lançamento" },
                { mode: "transferencia", label: "Nova transferência" },
                { mode: "buscar",        label: "Buscar lançamento" },
              ] as { mode: UnmatchedMode; label: string }[]).map(({ mode, label }) => (
                <button
                  key={mode}
                  onClick={() => onSetMode(mode)}
                  className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                    pair.unmatchedMode === mode ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="p-4">
              {pair.unmatchedMode === "novo" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700 mb-1">
                        Descrição <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={pair.newDesc}
                        onChange={e => onSetDesc(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-900 focus:outline-none focus:border-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-700 mb-1">
                        Categoria <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={pair.newCategory}
                          onChange={e => onSetCategory(e.target.value)}
                          className="w-full pl-3 pr-7 py-2 border border-gray-300 rounded-lg text-xs text-gray-900 appearance-none focus:outline-none focus:border-blue-400"
                        >
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={onCreateAndReconcile}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    Criar e conciliar
                  </button>
                </div>
              )}

              {pair.unmatchedMode === "transferencia" && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500">Registre como transferência entre contas da empresa.</p>
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">Conta de destino</label>
                    <div className="relative">
                      <select className="w-full pl-3 pr-7 py-2 border border-gray-300 rounded-lg text-xs text-gray-900 appearance-none focus:outline-none focus:border-blue-400">
                        <option>Itaú – Conta Principal</option>
                        <option>Nubank – Conta PJ</option>
                      </select>
                      <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                  <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors">
                    Registrar transferência
                  </button>
                </div>
              )}

              {pair.unmatchedMode === "buscar" && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Busque um lançamento existente para vincular.</p>
                  <div className="relative">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Buscar por descrição ou valor…"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-blue-400"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400">Digite para buscar lançamentos disponíveis</p>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Movimentações tab ────────────────────────────────────────────────────────

function MovimentacoesTab({ pairs }: { pairs: Pair[] }) {
  if (pairs.length === 0) {
    return (
      <div className="py-16 text-center text-xs text-gray-400">
        Nenhuma movimentação conciliada ainda. Concilie lançamentos na aba ao lado.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left py-3 px-6 text-[11px] font-semibold text-gray-500">Data</th>
            <th className="text-left py-3 px-4 text-[11px] font-semibold text-gray-500">Lançamento banco</th>
            <th className="text-left py-3 px-4 text-[11px] font-semibold text-gray-500">Lançamento sistema</th>
            <th className="text-left py-3 px-4 text-[11px] font-semibold text-gray-500">Categoria</th>
            <th className="text-right py-3 px-6 text-[11px] font-semibold text-gray-500">Valor</th>
            <th className="text-center py-3 px-4 text-[11px] font-semibold text-gray-500">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {pairs.map(p => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="py-3 px-6 text-gray-500 whitespace-nowrap">{p.bank.date}</td>
              <td className="py-3 px-4 text-gray-700">{p.bank.description}</td>
              <td className="py-3 px-4 text-gray-700">{p.system?.description ?? p.bank.description}</td>
              <td className="py-3 px-4 text-gray-500">{p.system?.category ?? "—"}</td>
              <td className={`py-3 px-6 text-right font-semibold ${p.bank.amount < 0 ? "text-red-600" : "text-emerald-600"}`}>
                {(p.bank.amount < 0 ? "R$ -" : "R$ ") + fmtBRL(p.bank.amount).replace("R$ ", "")}
              </td>
              <td className="py-3 px-4 text-center">
                <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  <Check size={9} /> Conciliado
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
