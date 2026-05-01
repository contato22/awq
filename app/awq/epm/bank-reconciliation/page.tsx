"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { BankTransaction, BuCode } from "@/lib/ap-ar-db";

const BUS: BuCode[] = ["AWQ", "JACQES", "CAZA", "ADVISOR", "VENTURE"];

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function fmtDate(d: string) { return new Date(d + "T12:00:00").toLocaleDateString("pt-BR"); }

const STATUS_COLOR: Record<string, string> = {
  unmatched: "bg-amber-100 text-amber-800",
  matched:   "bg-emerald-100 text-emerald-800",
  ignored:   "bg-gray-100 text-gray-500",
};
const STATUS_LABEL: Record<string, string> = {
  unmatched: "Não conciliado",
  matched:   "Conciliado",
  ignored:   "Ignorado",
};

interface MatchCandidate {
  type: "AP" | "AR";
  item: { id: string; description: string; net_amount: number; due_date: string; supplier_name?: string; customer_name?: string };
  amountDiff: number;
  dateDiff: number;
  score: number;
}

const EMPTY_FORM = {
  txn_date: new Date().toISOString().slice(0, 10),
  description: "",
  amount: "",
  txn_type: "credit" as "credit" | "debit",
  bank_ref: "",
  bu_code: "" as BuCode | "",
};

export default function BankReconciliationPage() {
  const [txns,       setTxns]       = useState<BankTransaction[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [filter,     setFilter]     = useState<"all" | "unmatched" | "matched" | "ignored">("unmatched");
  const [candidates, setCandidates] = useState<{ txn_id: string; list: MatchCandidate[] } | null>(null);
  const [matching,   setMatching]   = useState(false);

  async function loadTxns() {
    setLoading(true);
    const qs = filter !== "all" ? `?status=${filter}` : "";
    const res = await fetch(`/api/epm/bank-reconciliation${qs}`);
    const j   = await res.json();
    if (j.success) setTxns(j.data);
    setLoading(false);
  }

  useEffect(() => { loadTxns(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/epm/bank-reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txn_date:    form.txn_date,
          description: form.description,
          amount:      parseFloat(form.amount),
          txn_type:    form.txn_type,
          bank_ref:    form.bank_ref || undefined,
          bu_code:     form.bu_code || undefined,
        }),
      });
      const j = await res.json();
      if (j.success) {
        setShowImport(false);
        setForm(EMPTY_FORM);
        await loadTxns();
      }
    } finally { setSubmitting(false); }
  }

  async function handleFindMatches(txn: BankTransaction) {
    setMatching(true);
    try {
      const res = await fetch(`/api/epm/bank-reconciliation?find_matches=${txn.id}`);
      const j   = await res.json();
      if (j.success) setCandidates({ txn_id: txn.id, list: j.data });
    } finally { setMatching(false); }
  }

  async function handleMatch(txn_id: string, matched_id: string, matched_type: "AP" | "AR") {
    await fetch("/api/epm/bank-reconciliation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: txn_id, action: "match", matched_id, matched_type }),
    });
    setCandidates(null);
    await loadTxns();
  }

  async function handleIgnore(id: string) {
    await fetch("/api/epm/bank-reconciliation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "ignore" }),
    });
    await loadTxns();
  }

  const unmatchedCount = txns.filter((t) => t.status === "unmatched").length;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conciliação Bancária</h1>
          <p className="text-sm text-gray-500 mt-1">
            Associe transações bancárias às suas AP/AR — auto-match por valor (±0.5%) e data (±3 dias)
          </p>
        </div>
        <button
          onClick={() => setShowImport((v) => !v)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {showImport ? "Cancelar" : "+ Importar transação"}
        </button>
      </div>

      {/* Import form */}
      {showImport && (
        <form onSubmit={handleImport} className="bg-white rounded-xl border-2 border-blue-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">Nova Transação Bancária</h2>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Data *</label>
              <input required type="date" value={form.txn_date}
                onChange={(e) => setForm((f) => ({ ...f, txn_date: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo *</label>
              <select value={form.txn_type}
                onChange={(e) => setForm((f) => ({ ...f, txn_type: e.target.value as "credit" | "debit" }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="credit">Crédito (entrada)</option>
                <option value="debit">Débito (saída)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor (R$) *</label>
              <input required type="number" min="0.01" step="0.01" value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Descrição *</label>
              <input required value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Ex: PIX recebido — Cliente ABC"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">BU</label>
              <select value={form.bu_code}
                onChange={(e) => setForm((f) => ({ ...f, bu_code: e.target.value as BuCode | "" }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Sem BU</option>
                {BUS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="col-span-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Referência bancária</label>
              <input value={form.bank_ref}
                onChange={(e) => setForm((f) => ({ ...f, bank_ref: e.target.value }))}
                placeholder="TxID PIX, NSU, etc."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowImport(false)}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {submitting ? "Importando..." : "Importar"}
            </button>
          </div>
        </form>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 text-sm">
        {(["unmatched", "all", "matched", "ignored"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-lg font-medium transition-colors ${
              filter === s ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s === "all" ? "Todos" : STATUS_LABEL[s]}
            {s === "unmatched" && unmatchedCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">{unmatchedCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Match candidates modal */}
      {candidates && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-indigo-900">Candidatos para conciliação</h3>
            <button onClick={() => setCandidates(null)} className="text-indigo-400 hover:text-indigo-600 text-lg">×</button>
          </div>
          {candidates.list.length === 0 ? (
            <p className="text-sm text-indigo-700">Nenhum candidato encontrado dentro da tolerância.</p>
          ) : (
            <div className="space-y-2">
              {candidates.list.map((c, i) => (
                <div key={i} className="bg-white rounded-lg border p-3 flex items-center justify-between gap-4">
                  <div className="flex-1 text-sm">
                    <span className="font-semibold text-gray-800">{c.type}</span>
                    <span className="mx-2 text-gray-400">·</span>
                    <span className="text-gray-700">{c.item.supplier_name ?? c.item.customer_name}</span>
                    <span className="mx-2 text-gray-400">·</span>
                    <span className="text-gray-600">{c.item.description}</span>
                  </div>
                  <div className="text-sm font-semibold text-gray-800 w-28 text-right">{fmt(c.item.net_amount)}</div>
                  <div className="text-xs text-gray-500 w-20 text-right">∆{c.amountDiff.toFixed(2)} · {c.dateDiff.toFixed(0)}d</div>
                  <div className={`text-xs font-bold w-16 text-right ${c.score > 80 ? "text-emerald-600" : "text-amber-600"}`}>
                    {c.score.toFixed(0)}%
                  </div>
                  <button
                    onClick={() => handleMatch(candidates.txn_id, c.item.id, c.type)}
                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700"
                  >
                    Confirmar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando...</div>
      ) : txns.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Nenhuma transação encontrada.</div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 border-b">
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Descrição</th>
                <th className="px-4 py-3 text-left">BU</th>
                <th className="px-4 py-3 text-center">Tipo</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-700">{fmtDate(t.txn_date)}</td>
                  <td className="px-4 py-2 text-gray-700 max-w-[220px] truncate">{t.description}</td>
                  <td className="px-4 py-2 text-gray-500">{t.bu_code ?? "—"}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      t.txn_type === "credit" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}>
                      {t.txn_type === "credit" ? "Crédito" : "Débito"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-gray-800">{fmt(t.amount)}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[t.status]}`}>
                      {STATUS_LABEL[t.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    {t.status === "unmatched" && (
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={() => handleFindMatches(t)}
                          disabled={matching}
                          className="px-2 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {matching && candidates?.txn_id === t.id ? "..." : "Conciliar"}
                        </button>
                        <button
                          onClick={() => handleIgnore(t.id)}
                          className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs hover:bg-gray-300"
                        >
                          Ignorar
                        </button>
                      </div>
                    )}
                    {t.status === "matched" && (
                      <span className="text-xs text-gray-400">{t.matched_type} ✓</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-3 text-xs mt-4">
        <Link href="/awq/epm/consolidation" className="text-brand-600 hover:underline">← Consolidação</Link>
        <span className="text-gray-300">|</span>
        <Link href="/awq/epm/revenue-recognition" className="text-brand-600 hover:underline">Reconhec. de Receita →</Link>
      </div>
    </div>
  );
}
