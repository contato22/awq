"use client";

import { useState, useEffect } from "react";
import type { ARItem, RevenueRecognition } from "@/lib/ap-ar-db";

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function fmtDate(d: string) { return new Date(d + "T12:00:00").toLocaleDateString("pt-BR"); }
function fmtMonth(m: string) {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

const METHODS = ["accrual", "cash", "milestone"] as const;
const METHOD_LABELS: Record<string, string> = { accrual: "Competência", cash: "Caixa", milestone: "Entrega/Marco" };

export default function RevenueRecognitionPage() {
  const [arItems, setArItems]   = useState<ARItem[]>([]);
  const [recs,    setRecs]      = useState<RevenueRecognition[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<ARItem | null>(null);
  const [form, setForm]         = useState({
    period: new Date().toISOString().slice(0, 7),
    recognized_amount: "",
    recognition_method: "accrual" as RevenueRecognition["recognition_method"],
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/epm/ar").then((r) => r.json()),
      fetch("/api/epm/revenue-recognition").then((r) => r.json()),
    ]).then(([arJ, recJ]) => {
      if (arJ.success)  setArItems(arJ.data);
      if (recJ.success) setRecs(recJ.data);
    }).finally(() => setLoading(false));
  }, []);

  async function handleRecognize(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch("/api/epm/revenue-recognition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ar_id:              selected.id,
          period:             form.period,
          recognized_amount:  parseFloat(form.recognized_amount),
          recognition_method: form.recognition_method,
          notes:              form.notes || undefined,
        }),
      });
      const j = await res.json();
      if (j.success) {
        setRecs((prev) => [j.data, ...prev]);
        setForm((f) => ({ ...f, recognized_amount: "", notes: "" }));
      }
    } finally { setSaving(false); }
  }

  // Group recognitions by period for the summary
  const byPeriod = recs.reduce<Record<string, number>>((acc, r) => {
    acc[r.period] = (acc[r.period] ?? 0) + r.recognized_amount;
    return acc;
  }, {});

  const selectedRecs = selected ? recs.filter((r) => r.ar_id === selected.id) : [];
  const recognizedTotal = selectedRecs.reduce((s, r) => s + r.recognized_amount, 0);
  const remaining = selected ? selected.net_amount - recognizedTotal : 0;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reconhecimento de Receita</h1>
        <p className="text-sm text-gray-500 mt-1">Registre o reconhecimento de receita por período e método contábil</p>
      </div>

      {/* Period summary */}
      {Object.keys(byPeriod).length > 0 && (
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Resumo por Período</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(byPeriod)
              .sort(([a], [b]) => b.localeCompare(a))
              .slice(0, 8)
              .map(([period, total]) => (
                <div key={period} className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500 capitalize">{fmtMonth(period)}</div>
                  <div className="text-base font-bold text-emerald-700 mt-1">{fmt(total)}</div>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="flex gap-4" style={{ minHeight: 500 }}>
        {/* Left: AR list */}
        <div className="w-80 flex-shrink-0 bg-white rounded-xl border shadow-sm overflow-y-auto">
          <div className="px-4 py-3 border-b bg-gray-50">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Contas a Receber</p>
          </div>
          {loading ? (
            <div className="p-4 text-center text-gray-400">Carregando...</div>
          ) : arItems.length === 0 ? (
            <div className="p-4 text-center text-gray-400">Nenhuma AR cadastrada.</div>
          ) : (
            arItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item)}
                className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 transition-colors ${selected?.id === item.id ? "bg-blue-50" : ""}`}
              >
                <div className="font-semibold text-sm text-gray-800 truncate">{item.customer_name}</div>
                <div className="text-xs text-gray-500 truncate">{item.description}</div>
                <div className="text-xs font-semibold text-gray-700 mt-0.5">{fmt(item.net_amount)}</div>
              </button>
            ))
          )}
        </div>

        {/* Right: recognition form + history */}
        <div className="flex-1 flex flex-col gap-4">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 bg-white rounded-xl border shadow-sm">
              Selecione uma AR para registrar reconhecimento de receita
            </div>
          ) : (
            <>
              {/* Detail header */}
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-lg font-bold text-gray-900">{selected.customer_name}</div>
                    <div className="text-sm text-gray-600">{selected.description}</div>
                    <div className="text-xs text-gray-500 mt-0.5">Vencimento: {fmtDate(selected.due_date)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-bold text-gray-900">Total: {fmt(selected.net_amount)}</div>
                    <div className="text-sm text-emerald-600">Reconhecido: {fmt(recognizedTotal)}</div>
                    <div className={`text-sm font-semibold ${remaining > 0 ? "text-amber-600" : "text-gray-400"}`}>
                      Restante: {fmt(remaining)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recognition form */}
              <div className="bg-white rounded-xl border shadow-sm p-4">
                <h3 className="font-semibold text-gray-700 mb-3">Registrar reconhecimento</h3>
                <form onSubmit={handleRecognize} className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Período (AAAA-MM)</label>
                      <input type="month" value={form.period}
                        onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))                        }
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Valor reconhecido (R$)</label>
                      <input required type="number" min="0.01" step="0.01" value={form.recognized_amount}
                        onChange={(e) => setForm((f) => ({ ...f, recognized_amount: e.target.value }))}
                        placeholder={fmt(remaining)}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Método</label>
                      <select value={form.recognition_method}
                        onChange={(e) => setForm((f) => ({ ...f, recognition_method: e.target.value as RevenueRecognition["recognition_method"] }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {METHODS.map((m) => <option key={m} value={m}>{METHOD_LABELS[m]}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
                    <input type="text" value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="Opcional"
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <button type="submit" disabled={saving}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {saving ? "Salvando..." : "Registrar"}
                  </button>
                </form>
              </div>

              {/* History */}
              <div className="bg-white rounded-xl border shadow-sm p-4 flex-1">
                <h3 className="font-semibold text-gray-700 mb-3">Histórico de reconhecimento</h3>
                {selectedRecs.length === 0 ? (
                  <div className="text-sm text-gray-400">Nenhum reconhecimento registrado.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-500 border-b">
                        <th className="pb-2 text-left">Período</th>
                        <th className="pb-2 text-left">Método</th>
                        <th className="pb-2 text-right">Valor</th>
                        <th className="pb-2 text-left">Notas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRecs.map((r) => (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="py-2 text-gray-700 capitalize">{fmtMonth(r.period)}</td>
                          <td className="py-2 text-gray-600">{METHOD_LABELS[r.recognition_method]}</td>
                          <td className="py-2 text-right font-semibold text-emerald-700">{fmt(r.recognized_amount)}</td>
                          <td className="py-2 text-gray-500 text-xs">{r.notes ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
