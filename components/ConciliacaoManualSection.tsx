"use client";

import { useState, useRef } from "react";
import {
  AlertCircle, Check, ChevronDown, ChevronUp, Circle,
  FileUp, Loader2, Plus, Search, Trash2, Upload, X,
} from "lucide-react";
import {
  importFinancialFile,
  type ImportedTransaction,
  type ImportResult,
} from "@/lib/financial/importers";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "conciliado" | "pendente" | "divergente";

interface ReconciliationEntry {
  id: string;
  date: string;
  description: string;
  bankValue: number;
  internalValue: number;
  status: Status;
}

type ImportState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; result: ImportResult }
  | { kind: "error"; message: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(n: number) {
  const abs = Math.abs(n);
  return (n < 0 ? "-" : "") + "R$ " + abs.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(s: string) {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function txnToEntry(t: ImportedTransaction): ReconciliationEntry {
  return {
    id: uid(),
    date: t.date,
    description: t.description,
    bankValue: t.amount,
    internalValue: 0,
    status: "pendente",
  };
}

// ─── Status labels / colors ───────────────────────────────────────────────────

const STATUS_LABEL: Record<Status, string> = {
  conciliado: "Conciliado",
  pendente: "Pendente",
  divergente: "Divergente",
};

const STATUS_COLOR: Record<Status, string> = {
  conciliado: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pendente: "bg-amber-100 text-amber-700 border-amber-200",
  divergente: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_ICON: Record<Status, React.ElementType> = {
  conciliado: Check,
  pendente: Circle,
  divergente: AlertCircle,
};

// ─── Seed rows ────────────────────────────────────────────────────────────────

const SEED: ReconciliationEntry[] = [
  { id: uid(), date: "2026-04-01", description: "Pagamento fornecedor X",  bankValue: -3200.00, internalValue: -3200.00, status: "conciliado" },
  { id: uid(), date: "2026-04-03", description: "Receita serviços JACQES", bankValue:  8750.00, internalValue:  8750.00, status: "conciliado" },
  { id: uid(), date: "2026-04-07", description: "Transferência interna",   bankValue: -1500.00, internalValue: -1500.00, status: "conciliado" },
  { id: uid(), date: "2026-04-10", description: "Tarifa bancária",         bankValue:   -42.90, internalValue:     0.00, status: "divergente" },
  { id: uid(), date: "2026-04-15", description: "Pagamento consultoria",   bankValue: -5000.00, internalValue: -5000.00, status: "pendente"   },
  { id: uid(), date: "2026-04-18", description: "Recebimento cliente A",   bankValue: 12400.00, internalValue: 12400.00, status: "conciliado" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ConciliacaoManualSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importState, setImportState] = useState<ImportState>({ kind: "idle" });
  const [showRejected, setShowRejected] = useState(false);

  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState<ReconciliationEntry[]>(SEED);
  const [newDate, setNewDate] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newBank, setNewBank] = useState("");
  const [newInternal, setNewInternal] = useState("");
  const [showAddRow, setShowAddRow] = useState(false);

  // ── File selection ──────────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setSelectedFile(f);
    setImportState({ kind: "idle" });
    setShowRejected(false);
    if (e.target) e.target.value = "";
  }

  function clearFile() {
    setSelectedFile(null);
    setImportState({ kind: "idle" });
    setShowRejected(false);
  }

  // ── Import ──────────────────────────────────────────────────────────────────

  async function handleImport() {
    if (!selectedFile) return;
    setImportState({ kind: "loading" });
    setShowRejected(false);
    try {
      const result = await importFinancialFile(selectedFile);
      setImportState({ kind: "done", result });
    } catch (err) {
      setImportState({
        kind: "error",
        message: err instanceof Error ? err.message : "Erro desconhecido ao processar o arquivo.",
      });
    }
  }

  function confirmImport(transactions: ImportedTransaction[]) {
    const newEntries = transactions.map(txnToEntry);
    setEntries((prev) => [...newEntries, ...prev]);
    setSelectedFile(null);
    setImportState({ kind: "idle" });
    setShowRejected(false);
  }

  // ── Manual table ────────────────────────────────────────────────────────────

  function handleAddEntry() {
    if (!newDate || !newDesc) return;
    const bv = parseFloat(newBank) || 0;
    const iv = parseFloat(newInternal) || 0;
    const status: Status = bv === iv ? "conciliado" : bv === 0 || iv === 0 ? "pendente" : "divergente";
    setEntries((prev) => [...prev, { id: uid(), date: newDate, description: newDesc, bankValue: bv, internalValue: iv, status }]);
    setNewDate(""); setNewDesc(""); setNewBank(""); setNewInternal("");
    setShowAddRow(false);
  }

  function handleDelete(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function cycleStatus(id: string) {
    const cycle: Status[] = ["pendente", "conciliado", "divergente"];
    setEntries((prev) =>
      prev.map((e) => e.id === id ? { ...e, status: cycle[(cycle.indexOf(e.status) + 1) % cycle.length] } : e)
    );
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const filtered = entries.filter(
    (e) =>
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      STATUS_LABEL[e.status].toLowerCase().includes(search.toLowerCase())
  );

  const conciliados = entries.filter((e) => e.status === "conciliado").length;
  const pendentes   = entries.filter((e) => e.status === "pendente").length;
  const divergentes = entries.filter((e) => e.status === "divergente").length;
  const totalBanco   = entries.reduce((s, e) => s + e.bankValue, 0);
  const totalInterno = entries.reduce((s, e) => s + e.internalValue, 0);
  const diff = totalBanco - totalInterno;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* KPIs resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Conciliados", value: conciliados,  color: "text-emerald-600", bg: "bg-emerald-50", icon: Check       },
          { label: "Pendentes",   value: pendentes,    color: "text-amber-600",   bg: "bg-amber-50",   icon: Circle      },
          { label: "Divergentes", value: divergentes,  color: "text-red-600",     bg: "bg-red-50",     icon: AlertCircle },
          { label: "Diferença",   value: fmtBRL(diff), color: diff === 0 ? "text-emerald-600" : "text-red-600", bg: diff === 0 ? "bg-emerald-50" : "bg-red-50", icon: Check },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
                <Icon size={16} className={c.color} />
              </div>
              <div>
                <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
                <div className="text-xs text-gray-500">{c.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Importar extrato ─────────────────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
            <Upload size={18} className="text-brand-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900">Importar Extrato Bancário</div>
            <div className="text-xs text-gray-500 mt-0.5">
              Importe extratos nos formatos <span className="font-medium text-gray-700">CSV</span> ou{" "}
              <span className="font-medium text-gray-700">PDF</span> (com texto selecionável) para popular a tabela de verificação
            </div>
            {selectedFile && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                <Check size={12} />
                {selectedFile.name}
                <button onClick={clearFile} className="ml-1 text-gray-400 hover:text-red-500"><X size={10} /></button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.pdf,.ofx"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-brand-300 hover:border-brand-500 hover:bg-brand-50 text-brand-700 rounded-xl text-xs font-semibold transition-all"
            >
              <FileUp size={14} /> Selecionar arquivo
            </button>
            <button
              onClick={() => void handleImport()}
              disabled={!selectedFile || importState.kind === "loading"}
              className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white rounded-xl text-xs font-semibold transition-colors"
            >
              {importState.kind === "loading" ? (
                <><Loader2 size={14} className="animate-spin" /> Lendo arquivo…</>
              ) : (
                <><Upload size={14} /> Importar</>
              )}
            </button>
          </div>
        </div>

        {/* ── Import result feedback ─────────────────────────────────────────── */}
        {importState.kind === "error" && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 flex items-start gap-2">
            <AlertCircle size={13} className="shrink-0 mt-0.5 text-red-500" />
            <span>Não foi possível importar este arquivo. {importState.message}</span>
          </div>
        )}

        {importState.kind === "done" && (
          <ImportResultPanel
            result={importState.result}
            showRejected={showRejected}
            onToggleRejected={() => setShowRejected((v) => !v)}
            onConfirm={() => confirmImport(importState.result.transactions)}
            onDiscard={clearFile}
          />
        )}
      </div>

      {/* ── Tabela de verificação manual ─────────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Verificação Manual</h2>
            <p className="text-xs text-gray-500 mt-0.5">Compare lançamentos internos com o extrato bancário</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar lançamento…"
                className="pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-400 w-44"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={11} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowAddRow((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              <Plus size={13} /> Adicionar
            </button>
          </div>
        </div>

        {showAddRow && (
          <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-brand-400" />
            <input type="text" placeholder="Descrição" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white placeholder:text-gray-400 focus:outline-none focus:border-brand-400" />
            <input type="number" placeholder="Valor Banco" value={newBank} onChange={(e) => setNewBank(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white placeholder:text-gray-400 focus:outline-none focus:border-brand-400" />
            <div className="flex gap-2">
              <input type="number" placeholder="Valor Interno" value={newInternal} onChange={(e) => setNewInternal(e.target.value)} className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white placeholder:text-gray-400 focus:outline-none focus:border-brand-400" onKeyDown={(e) => e.key === "Enter" && handleAddEntry()} />
              <button onClick={handleAddEntry} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700"><Check size={12} /></button>
              <button onClick={() => setShowAddRow(false)} className="px-3 py-2 bg-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-300"><X size={12} /></button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Data</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Descrição</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Extrato Banco</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Lançamento Interno</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Diferença</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                <th className="py-2 px-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const dif = entry.bankValue - entry.internalValue;
                const Icon = STATUS_ICON[entry.status];
                return (
                  <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 px-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(entry.date)}</td>
                    <td className="py-2.5 px-3 text-xs text-gray-900 max-w-xs"><div className="truncate">{entry.description}</div></td>
                    <td className={`py-2.5 px-3 text-right text-xs font-medium ${entry.bankValue >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmtBRL(entry.bankValue)}</td>
                    <td className={`py-2.5 px-3 text-right text-xs font-medium ${entry.internalValue >= 0 ? "text-emerald-600" : "text-red-600"}`}>{fmtBRL(entry.internalValue)}</td>
                    <td className={`py-2.5 px-3 text-right text-xs font-semibold ${dif === 0 ? "text-gray-400" : "text-red-600"}`}>{dif === 0 ? "—" : fmtBRL(dif)}</td>
                    <td className="py-2.5 px-3 text-center">
                      <button onClick={() => cycleStatus(entry.id)} className={`inline-flex items-center gap-1 text-[10px] font-semibold border rounded px-1.5 py-0.5 transition-opacity hover:opacity-70 ${STATUS_COLOR[entry.status]}`} title="Clique para alterar status">
                        <Icon size={9} />{STATUS_LABEL[entry.status]}
                      </button>
                    </td>
                    <td className="py-2.5 px-2">
                      <button onClick={() => handleDelete(entry.id)} className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 size={12} /></button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-10 text-center text-xs text-gray-400">Nenhum lançamento encontrado</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

// ─── Import result panel ───────────────────────────────────────────────────────

function ImportResultPanel({
  result,
  showRejected,
  onToggleRejected,
  onConfirm,
  onDiscard,
}: {
  result: ImportResult;
  showRejected: boolean;
  onToggleRejected: () => void;
  onConfirm: () => void;
  onDiscard: () => void;
}) {
  const ok  = result.transactions.length;
  const bad = result.rejectedRows.length;
  const hasWarnings = result.warnings.length > 0;

  if (ok === 0 && hasWarnings) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 space-y-2">
        <div className="flex items-start gap-2">
          <AlertCircle size={13} className="shrink-0 mt-0.5 text-amber-500" />
          <div className="space-y-1">
            {result.warnings.map((w, i) => <p key={i}>{w}</p>)}
          </div>
        </div>
        <button onClick={onDiscard} className="text-xs text-amber-700 underline">Fechar</button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 space-y-3">
      {/* Summary */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="text-xs text-emerald-800 space-y-0.5">
          <p className="font-semibold">
            {ok > 0
              ? `${ok} transaç${ok === 1 ? "ão" : "ões"} importada${ok === 1 ? "" : "s"} com sucesso`
              : "Nenhuma transação reconhecida"}
            {bad > 0 && `, ${bad} linha${bad === 1 ? "" : "s"} não reconhecida${bad === 1 ? "" : "s"}`}
          </p>
          <p className="text-emerald-700 opacity-80">{result.fileName} · {result.fileType.toUpperCase()}</p>
          {result.warnings.map((w, i) => (
            <p key={i} className="text-amber-700">{w}</p>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {ok > 0 && (
            <button
              onClick={onConfirm}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Adicionar {ok} à tabela
            </button>
          )}
          <button
            onClick={onDiscard}
            className="px-3 py-1.5 border border-gray-300 text-gray-600 hover:bg-gray-100 rounded-lg text-xs transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>

      {/* Preview of first 5 transactions */}
      {ok > 0 && (
        <div className="overflow-x-auto rounded border border-emerald-200 bg-white text-xs">
          <table className="w-full">
            <thead>
              <tr className="border-b border-emerald-100 text-[10px] uppercase tracking-wide text-gray-500">
                <th className="px-3 py-1.5 text-left">Data</th>
                <th className="px-3 py-1.5 text-left">Descrição</th>
                <th className="px-3 py-1.5 text-right">Valor Banco</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {result.transactions.slice(0, 5).map((t) => (
                <tr key={t.id}>
                  <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">{t.date}</td>
                  <td className="px-3 py-1.5 text-gray-800 max-w-xs truncate">{t.description}</td>
                  <td className={`px-3 py-1.5 text-right font-mono font-medium ${t.amount >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {t.amount >= 0 ? "+" : ""}{t.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {ok > 5 && (
            <div className="px-3 py-1.5 text-[10px] text-gray-400 border-t border-gray-100">
              … e mais {ok - 5} transaç{ok - 5 === 1 ? "ão" : "ões"}
            </div>
          )}
        </div>
      )}

      {/* Rejected rows (collapsible) */}
      {bad > 0 && (
        <div>
          <button
            onClick={onToggleRejected}
            className="flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-900"
          >
            {showRejected ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {bad} linha{bad === 1 ? "" : "s"} não reconhecida{bad === 1 ? "" : "s"}
          </button>
          {showRejected && (
            <div className="mt-2 max-h-32 overflow-y-auto rounded bg-amber-100 border border-amber-200 px-3 py-2 space-y-0.5">
              {result.rejectedRows.map((r, i) => (
                <p key={i} className="text-[10px] font-mono text-amber-900 truncate">{r}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
