"use client";

import { useState, useEffect, useCallback } from "react";
import type { ARItem, ARCollection } from "@/lib/ap-ar-db";

const METHODS = ["email", "phone", "whatsapp", "other"] as const;
const OUTCOMES = ["promised", "no_answer", "dispute", "paid", "other"] as const;
const METHOD_LABELS: Record<string, string>  = { email: "E-mail", phone: "Ligação", whatsapp: "WhatsApp", other: "Outro" };
const OUTCOME_LABELS: Record<string, string> = { promised: "Prometeu pagar", no_answer: "Sem resposta", dispute: "Disputa", paid: "Pagou", other: "Outro" };
const OUTCOME_COLOR: Record<string, string>  = { promised: "text-blue-600", no_answer: "text-gray-500", dispute: "text-red-600", paid: "text-emerald-600", other: "text-gray-600" };

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function fmtDate(d: string) { return new Date(d + "T12:00:00").toLocaleDateString("pt-BR"); }
function daysOverdue(due_date: string) {
  const today = new Date();
  const due   = new Date(due_date + "T12:00:00");
  return Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86_400_000));
}

export default function ARCollectionsPage() {
  const [arItems,   setArItems]   = useState<ARItem[]>([]);
  const [logs,      setLogs]      = useState<Record<string, ARCollection[]>>({});
  const [selected,  setSelected]  = useState<ARItem | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [form,      setForm]      = useState({
    method: "email" as ARCollection["method"],
    outcome: "no_answer" as ARCollection["outcome"],
    notes: "",
    next_followup: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/epm/ar")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          const overdue: ARItem[] = j.data.filter((i: ARItem) => i.status === "OVERDUE" || i.status === "PENDING");
          setArItems(overdue.sort((a, b) => daysOverdue(b.due_date) - daysOverdue(a.due_date)));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const loadLog = useCallback((ar_id: string) => {
    fetch(`/api/epm/ar/collections?ar_id=${ar_id}`)
      .then((r) => r.json())
      .then((j) => { if (j.success) setLogs((prev) => ({ ...prev, [ar_id]: j.data })); });
  }, []);

  function selectItem(item: ARItem) {
    setSelected(item);
    loadLog(item.id);
  }

  async function submitLog(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch("/api/epm/ar/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ar_id:           selected.id,
          collection_date: new Date().toISOString().slice(0, 10),
          method:          form.method,
          outcome:         form.outcome,
          notes:           form.notes || undefined,
          next_followup:   form.next_followup || undefined,
        }),
      });
      const j = await res.json();
      if (j.success) {
        setLogs((prev) => ({ ...prev, [selected.id]: [j.data, ...(prev[selected.id] ?? [])] }));
        setForm({ method: "email", outcome: "no_answer", notes: "", next_followup: "" });
      }
    } finally { setSaving(false); }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cobrança — AR Vencido</h1>
        <p className="text-sm text-gray-500 mt-1">Gerencie ações de cobrança por cliente</p>
      </div>

      <div className="flex gap-4" style={{ height: "calc(100vh - 180px)" }}>
        {/* Left: overdue list */}
        <div className="w-80 flex-shrink-0 bg-white rounded-xl border shadow-sm overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-400">Carregando...</div>
          ) : arItems.length === 0 ? (
            <div className="p-4 text-center text-gray-400">Nenhum item vencido.</div>
          ) : (
            arItems.map((item) => {
              const days = daysOverdue(item.due_date);
              const color = days > 90 ? "text-red-600" : days > 30 ? "text-orange-500" : "text-yellow-600";
              return (
                <button
                  key={item.id}
                  onClick={() => selectItem(item)}
                  className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 transition-colors ${selected?.id === item.id ? "bg-blue-50" : ""}`}
                >
                  <div className="font-semibold text-sm text-gray-800 truncate">{item.customer_name}</div>
                  <div className="text-xs text-gray-500 truncate">{item.description}</div>
                  <div className="flex justify-between mt-1">
                    <span className={`text-xs font-bold ${color}`}>{days}d vencido</span>
                    <span className="text-xs font-semibold text-gray-700">{fmt(item.net_amount)}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right: detail + log */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 bg-white rounded-xl border shadow-sm">
              Selecione um item para ver o histórico de cobrança
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-lg font-bold text-gray-900">{selected.customer_name}</div>
                    <div className="text-sm text-gray-600 mt-0.5">{selected.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-900">{fmt(selected.net_amount)}</div>
                    <div className="text-sm text-red-600">Vence {fmtDate(selected.due_date)}</div>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <h3 className="font-semibold text-gray-700 mb-3">Registrar contato de cobrança</h3>
                <form onSubmit={submitLog} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Canal</label>
                      <select
                        value={form.method}
                        onChange={(e) => setForm((f) => ({ ...f, method: e.target.value as ARCollection["method"] }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {METHODS.map((m) => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Resultado</label>
                      <select
                        value={form.outcome}
                        onChange={(e) => setForm((f) => ({ ...f, outcome: e.target.value as ARCollection["outcome"] }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {OUTCOMES.map((o) => <option key={o} value={o}>{OUTCOME_LABELS[o]}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Próximo follow-up</label>
                    <input
                      type="date"
                      value={form.next_followup}
                      onChange={(e) => setForm((f) => ({ ...f, next_followup: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      rows={2}
                      placeholder="Resultado, acordos, próximos passos..."
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? "Salvando..." : "Registrar contato"}
                  </button>
                </form>
              </div>

              {/* History */}
              <div className="bg-white rounded-xl border shadow-sm p-4 flex-1">
                <h3 className="font-semibold text-gray-700 mb-3">Histórico de cobrança</h3>
                {!logs[selected.id] ? (
                  <div className="text-sm text-gray-400">Carregando...</div>
                ) : logs[selected.id].length === 0 ? (
                  <div className="text-sm text-gray-400">Nenhum contato registrado ainda.</div>
                ) : (
                  <div className="space-y-3">
                    {logs[selected.id].map((log) => (
                      <div key={log.id} className="flex gap-3 text-sm border-b pb-3 last:border-0">
                        <div className="w-1 bg-blue-200 rounded-full flex-shrink-0" />
                        <div className="flex-1">
                          <div className="flex gap-2 items-center flex-wrap">
                            <span className="font-semibold text-gray-800">{METHOD_LABELS[log.method]}</span>
                            <span className={`text-xs font-medium ${OUTCOME_COLOR[log.outcome]}`}>
                              {OUTCOME_LABELS[log.outcome]}
                            </span>
                            <span className="text-gray-400 text-xs">{fmtDate(log.collection_date)}</span>
                          </div>
                          {log.notes && <p className="text-gray-600 mt-0.5 text-sm">{log.notes}</p>}
                          {log.next_followup && (
                            <p className="text-xs text-blue-600 mt-0.5">Follow-up: {fmtDate(log.next_followup)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
