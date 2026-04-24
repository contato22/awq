"use client";

// ─── /awq/conciliacao — Conciliação Bancária ─────────────────────────────────
// CAMADA: corporate-treasury (ERP AWQ)
// SCOPE:  Verificação manual de conciliação + importação de extratos

import { useState, useRef } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import {
  CheckCircle2, FileText, GitMerge, AlertCircle, ArrowRight,
  FileUp, Upload, X, Plus, Trash2, Check, Circle,
  ChevronDown, Search,
} from "lucide-react";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(n: number) {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  return sign + "R$ " + abs.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(s: string) {
  if (!s) return "—";
  const [y, m, d] = s.split("-");
  return `${d}/${m}/${y}`;
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

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

const PLANNED_MODULES = [
  {
    title: "Matching Automático",
    desc: "Cruzamento automático de lançamentos internos com movimentos do extrato bancário.",
    icon: GitMerge,
  },
  {
    title: "Fila de Divergências",
    desc: "Gestão de pendências: lançamentos sem extrato correspondente e vice-versa.",
    icon: AlertCircle,
  },
  {
    title: "Relatório de Conciliação",
    desc: "Saldo conciliado por conta bancária e período, com rastreabilidade completa.",
    icon: FileText,
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConciliacaoPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importedFile, setImportedFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState<ReconciliationEntry[]>([
    { id: uid(), date: "2026-04-01", description: "Pagamento fornecedor X",  bankValue: -3200.00, internalValue: -3200.00, status: "conciliado"  },
    { id: uid(), date: "2026-04-03", description: "Receita serviços JACQES", bankValue:  8750.00, internalValue:  8750.00, status: "conciliado"  },
    { id: uid(), date: "2026-04-07", description: "Transferência interna",   bankValue: -1500.00, internalValue: -1500.00, status: "conciliado"  },
    { id: uid(), date: "2026-04-10", description: "Tarifa bancária",         bankValue:   -42.90, internalValue:     0.00, status: "divergente"  },
    { id: uid(), date: "2026-04-15", description: "Pagamento consultoria",   bankValue: -5000.00, internalValue: -5000.00, status: "pendente"    },
    { id: uid(), date: "2026-04-18", description: "Recebimento cliente A",   bankValue:  12400.00, internalValue: 12400.00, status: "conciliado" },
  ]);

  const [newDate, setNewDate]        = useState("");
  const [newDesc, setNewDesc]        = useState("");
  const [newBank, setNewBank]        = useState("");
  const [newInternal, setNewInternal]= useState("");
  const [showAddRow, setShowAddRow]  = useState(false);

  // ── File import ─────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setImportedFile(f);
    if (e.target) e.target.value = "";
  }

  // ── Add entry ───────────────────────────────────────────────────────────
  function handleAddEntry() {
    if (!newDate || !newDesc) return;
    const bv = parseFloat(newBank) || 0;
    const iv = parseFloat(newInternal) || 0;
    const status: Status = bv === iv ? "conciliado" : bv === 0 || iv === 0 ? "pendente" : "divergente";
    setEntries((prev) => [
      ...prev,
      { id: uid(), date: newDate, description: newDesc, bankValue: bv, internalValue: iv, status },
    ]);
    setNewDate(""); setNewDesc(""); setNewBank(""); setNewInternal("");
    setShowAddRow(false);
  }

  function handleDelete(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function cycleStatus(id: string) {
    const cycle: Status[] = ["pendente", "conciliado", "divergente"];
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, status: cycle[(cycle.indexOf(e.status) + 1) % cycle.length] } : e
      )
    );
  }

  // ── Derived ─────────────────────────────────────────────────────────────
  const filtered = entries.filter(
    (e) =>
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      STATUS_LABEL[e.status].toLowerCase().includes(search.toLowerCase())
  );

  const conciliados  = entries.filter((e) => e.status === "conciliado").length;
  const pendentes    = entries.filter((e) => e.status === "pendente").length;
  const divergentes  = entries.filter((e) => e.status === "divergente").length;
  const totalBanco   = entries.reduce((s, e) => s + e.bankValue, 0);
  const totalInterno = entries.reduce((s, e) => s + e.internalValue, 0);
  const diff         = totalBanco - totalInterno;

  return (
    <>
      <Header title="Conciliação" subtitle="Tesouraria · AWQ Group" />
      <div className="page-container">

        {/* ── Resumo ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Conciliados",  value: conciliados,  color: "text-emerald-600", bg: "bg-emerald-50", icon: Check       },
            { label: "Pendentes",    value: pendentes,    color: "text-amber-600",   bg: "bg-amber-50",   icon: Circle      },
            { label: "Divergentes",  value: divergentes,  color: "text-red-600",     bg: "bg-red-50",     icon: AlertCircle },
            { label: "Diferença",    value: fmtBRL(diff), color: diff === 0 ? "text-emerald-600" : "text-red-600", bg: diff === 0 ? "bg-emerald-50" : "bg-red-50", icon: CheckCircle2 },
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

        {/* ── Verificação de Conciliação Manual ─────────────────────────── */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Verificação de Conciliação Manual</h2>
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

          {/* Add row form */}
          {showAddRow && (
            <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-brand-400"
              />
              <input
                type="text"
                placeholder="Descrição"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white placeholder:text-gray-400 focus:outline-none focus:border-brand-400 sm:col-span-1"
              />
              <input
                type="number"
                placeholder="Valor Banco"
                value={newBank}
                onChange={(e) => setNewBank(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white placeholder:text-gray-400 focus:outline-none focus:border-brand-400"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Valor Interno"
                  value={newInternal}
                  onChange={(e) => setNewInternal(e.target.value)}
                  className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white placeholder:text-gray-400 focus:outline-none focus:border-brand-400"
                  onKeyDown={(e) => e.key === "Enter" && handleAddEntry()}
                />
                <button onClick={handleAddEntry} className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors">
                  <Check size={12} />
                </button>
                <button onClick={() => setShowAddRow(false)} className="px-3 py-2 bg-gray-200 text-gray-600 rounded-lg text-xs hover:bg-gray-300 transition-colors">
                  <X size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Table */}
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
                      <td className="py-2.5 px-3 text-xs text-gray-900 max-w-xs">
                        <div className="truncate">{entry.description}</div>
                      </td>
                      <td className={`py-2.5 px-3 text-right text-xs font-medium ${entry.bankValue >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {fmtBRL(entry.bankValue)}
                      </td>
                      <td className={`py-2.5 px-3 text-right text-xs font-medium ${entry.internalValue >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {fmtBRL(entry.internalValue)}
                      </td>
                      <td className={`py-2.5 px-3 text-right text-xs font-semibold ${dif === 0 ? "text-gray-400" : "text-red-600"}`}>
                        {dif === 0 ? "—" : fmtBRL(dif)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => cycleStatus(entry.id)}
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold border rounded px-1.5 py-0.5 transition-opacity hover:opacity-70 ${STATUS_COLOR[entry.status]}`}
                          title="Clique para alterar status"
                        >
                          <Icon size={9} />
                          {STATUS_LABEL[entry.status]}
                        </button>
                      </td>
                      <td className="py-2.5 px-2">
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-xs text-gray-400">
                      Nenhum lançamento encontrado
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Botão de Importação ────────────────────────────────────────── */}
        <div className="card p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
            <Upload size={18} className="text-brand-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-gray-900">Importar Extrato Bancário</div>
            <div className="text-xs text-gray-500 mt-0.5">
              Importe extratos nos formatos <span className="font-medium text-gray-700">OFX</span>,{" "}
              <span className="font-medium text-gray-700">CSV</span> ou{" "}
              <span className="font-medium text-gray-700">PDF</span> para conciliar automaticamente
            </div>
            {importedFile && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                <Check size={12} />
                {importedFile.name} selecionado
                <button onClick={() => setImportedFile(null)} className="ml-1 text-gray-400 hover:text-red-500">
                  <X size={10} />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".ofx,.csv,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-brand-300 hover:border-brand-500 hover:bg-brand-50 text-brand-700 rounded-xl text-xs font-semibold transition-all"
            >
              <FileUp size={14} /> Selecionar arquivo
            </button>
            {importedFile ? (
              <button
                onClick={() => alert("Pipeline de importação ainda não implementado.")}
                className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold transition-colors"
              >
                <Upload size={14} /> Importar
              </button>
            ) : (
              <Link
                href="/awq/ingest"
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
              >
                <ArrowRight size={14} /> Ver Ingestão completa
              </Link>
            )}
          </div>
        </div>

        {/* ── Módulos planejados ─────────────────────────────────────────── */}
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Em desenvolvimento
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PLANNED_MODULES.map((m) => (
              <div key={m.title} className="card p-5 flex items-start gap-4 opacity-50">
                <div className="w-9 h-9 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                  <m.icon size={16} className="text-gray-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-700">{m.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{m.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
