"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Activity, BarChart3, AlertTriangle, Trash2 } from "lucide-react";
import type { EpmCashForecast } from "@/lib/epm-dynamic";

function fmtBRL(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000) return sign + "R$" + (abs / 1_000).toFixed(0) + "K";
  return sign + "R$" + abs.toLocaleString("pt-BR", { minimumFractionDigits: 0 });
}

const STARTING_CASH = 412_000;
const TYPES = ["actual", "forecast"] as const;

const EMPTY = { week_label: "", start_date: null as string | null, inflow: 0, outflow: 0, type: "forecast" as string, notes: "" };

export default function ForecastPage() {
  const [data, setData] = useState<EpmCashForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/epm/cash-forecast").then(r => r.json()).then(d => { setData(d.data ?? []); setLoading(false); });
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/epm/cash-forecast", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, inflow: Number(form.inflow), outflow: Number(form.outflow), start_date: form.start_date || null }),
    });
    const j = await r.json();
    setData(p => [...p, j.data].sort((a, b) => (a.start_date ?? "").localeCompare(b.start_date ?? "")));
    setForm(EMPTY);
    setShow(false);
    setSaving(false);
  }

  async function onDelete(id: string) {
    await fetch("/api/epm/cash-forecast", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setData(p => p.filter(x => x.id !== id));
  }

  const rows = useMemo(() => {
    let cum = STARTING_CASH;
    return data.map(w => {
      const net = (w.inflow ?? 0) - (w.outflow ?? 0);
      cum += net;
      return { ...w, net, cumulative_cash: cum };
    });
  }, [data]);

  const minCash = rows.length ? Math.min(...rows.map(r => r.cumulative_cash)) : STARTING_CASH;
  const maxCash = rows.length ? Math.max(...rows.map(r => r.cumulative_cash)) : STARTING_CASH;
  const endCash = rows.length ? rows[rows.length - 1].cumulative_cash : STARTING_CASH;
  const isCashRisk = minCash < 100_000;
  const chartMin = Math.max(0, minCash - 50_000);
  const chartMax = maxCash + 50_000;
  const chartRange = chartMax - chartMin;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/epm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"><ArrowLeft size={16} /></Link>
            <div><h1 className="text-lg font-bold text-gray-900">Previsão & Forecasting</h1><p className="text-xs text-gray-500">EPM · Rolling Cash Forecast</p></div>
          </div>
          <button onClick={() => setShow(true)} className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"><Plus size={14} /> Nova Semana</button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Caixa Atual",           value: fmtBRL(STARTING_CASH), color: "text-blue-700" },
            { label: "Caixa Projetado (fim)", value: fmtBRL(endCash),       color: endCash > 300_000 ? "text-emerald-700" : "text-red-700" },
            { label: "Mínimo Projetado",      value: fmtBRL(minCash),       color: minCash < 150_000 ? "text-red-700" : "text-amber-700" },
            { label: "Máximo Projetado",      value: fmtBRL(maxCash),       color: "text-gray-700" },
          ].map(card => (
            <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className={`text-xl font-bold tabular-nums ${card.color}`}>{loading ? "—" : card.value}</div>
              <div className="text-xs text-gray-400 mt-1">{card.label}</div>
            </div>
          ))}
        </div>

        {isCashRisk && !loading && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            <AlertTriangle size={13} className="shrink-0" />
            <strong>Alerta de caixa:</strong>&nbsp;projeção atinge mínimo de {fmtBRL(minCash)} — abaixo do buffer mínimo recomendado de R$150K.
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={14} className="text-blue-600" />
              <span className="text-sm font-semibold text-gray-900">Rolling Cash Forecast</span>
              <span className="ml-auto text-xs text-gray-400">Base: {fmtBRL(STARTING_CASH)}</span>
            </div>
            <div className="flex items-end gap-1 h-28 mb-2">
              {rows.map(w => {
                const barH = chartRange > 0 ? ((w.cumulative_cash - chartMin) / chartRange) * 100 : 50;
                const isLow = w.cumulative_cash < 150_000;
                return (
                  <div key={w.id} className="flex-1 flex flex-col items-center gap-0.5 group relative" title={`${w.week_label}: ${fmtBRL(w.cumulative_cash)}`}>
                    <div className={`w-full rounded-t transition-all ${w.type === "actual" ? "bg-blue-400" : isLow ? "bg-red-300" : "bg-blue-200"}`} style={{ height: `${Math.max(2, barH)}%` }} />
                  </div>
                );
              })}
            </div>
            <div className="flex gap-1">
              {rows.map(w => (
                <div key={w.id} className="flex-1 text-center text-[9px] text-gray-400 truncate">{w.week_label}</div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-blue-400 inline-block" /> Realizado</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-blue-200 inline-block" /> Projetado</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-2 rounded bg-red-300 inline-block" /> Risco de caixa</span>
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <BarChart3 size={14} className="text-blue-600" />
            <span className="text-sm font-semibold text-gray-900">Detalhe Semanal</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>{["Semana", "Início", "Entradas", "Saídas", "Net", "Saldo Cumulativo", "Tipo", ""].map(h => <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? <tr><td colSpan={8} className="px-4 py-16 text-center text-sm text-gray-400">Carregando...</td></tr>
                : rows.length === 0 ? <tr><td colSpan={8} className="px-4 py-16"><div className="flex flex-col items-center gap-3 text-center"><AlertTriangle size={32} className="text-gray-200" /><p className="text-sm font-medium text-gray-500">Nenhuma semana cadastrada</p></div></td></tr>
                : rows.map(w => {
                  const netPos = w.net >= 0;
                  const cashLow = w.cumulative_cash < 150_000;
                  return (
                    <tr key={w.id} className={`hover:bg-gray-50 ${cashLow ? "bg-red-50/50" : ""}`}>
                      <td className="px-3 py-3 font-semibold text-gray-700">{w.week_label}</td>
                      <td className="px-3 py-3 text-xs text-gray-500">{w.start_date || "—"}</td>
                      <td className="px-3 py-3 text-sm tabular-nums text-emerald-600 font-semibold">{fmtBRL(w.inflow)}</td>
                      <td className="px-3 py-3 text-sm tabular-nums text-red-600 font-semibold">{fmtBRL(w.outflow)}</td>
                      <td className={`px-3 py-3 text-sm tabular-nums font-bold ${netPos ? "text-emerald-700" : "text-red-700"}`}>{netPos ? "+" : ""}{fmtBRL(w.net)}</td>
                      <td className={`px-3 py-3 text-sm tabular-nums font-bold ${cashLow ? "text-red-700" : "text-gray-900"}`}>{fmtBRL(w.cumulative_cash)}{cashLow && <AlertTriangle size={10} className="inline ml-1 text-red-500" />}</td>
                      <td className="px-3 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${w.type === "actual" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>{w.type === "actual" ? "Realizado" : "Projeção"}</span></td>
                      <td className="px-3 py-3"><button onClick={() => onDelete(w.id)} className="p-1.5 text-gray-300 hover:text-red-500 rounded hover:bg-red-50 transition-colors"><Trash2 size={13} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200"><h2 className="text-base font-semibold text-gray-900">Nova Semana de Forecast</h2></div>
            <form onSubmit={onCreate} className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Semana</label><input placeholder="ex: W19" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.week_label} onChange={e => setForm(p => ({ ...p, week_label: e.target.value }))} required /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>{TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Data Início</label><input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.start_date ?? ""} onChange={e => setForm(p => ({ ...p, start_date: e.target.value || null }))} /></div>
                <div />
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Entradas (R$)</label><input type="number" min={0} step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.inflow} onChange={e => setForm(p => ({ ...p, inflow: Number(e.target.value) }))} /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Saídas (R$)</label><input type="number" min={0} step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.outflow} onChange={e => setForm(p => ({ ...p, outflow: Number(e.target.value) }))} /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Notas</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShow(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
