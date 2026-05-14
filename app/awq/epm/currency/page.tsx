"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, RefreshCw, DollarSign, Trash2 } from "lucide-react";
import type { EpmFxRate, EpmFcTransaction } from "@/lib/epm-dynamic";

const CURRENCIES = ["USD","EUR","GBP","ARS","CHF"] as const;
const ENTITIES = ["AWQ","JACQES","CAZA","ADVISOR","VENTURE"] as const;
const TYPES = ["EXPENSE","REVENUE","ASSET"] as const;

const EMPTY_RATE = { currency: "USD" as string, symbol: "$", flag: "🇺🇸", rate_brl: 0, rate_prev: 0, source: "BCB PTAX", as_of: null as string|null };
const EMPTY_TX = { date: null as string|null, entity: "AWQ" as string, description: "", currency: "USD" as string, amount_fc: 0, rate_at_booking: 0, rate_current: 0, type: "EXPENSE" as string, category: "" };

function fmtBRL(n: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n); }
function calcGainLoss(t: EpmFcTransaction) {
  const bookBRL = t.amount_fc * t.rate_at_booking;
  const currBRL = t.amount_fc * t.rate_current;
  return t.type === "REVENUE" ? currBRL - bookBRL : bookBRL - currBRL;
}

export default function CurrencyPage() {
  const [rates, setRates] = useState<EpmFxRate[]>([]);
  const [txs, setTxs] = useState<EpmFcTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRate, setShowRate] = useState(false);
  const [showTx, setShowTx] = useState(false);
  const [rateForm, setRateForm] = useState(EMPTY_RATE);
  const [txForm, setTxForm] = useState(EMPTY_TX);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/epm/fx-rates").then(r => r.json()),
      fetch("/api/epm/fc-transactions").then(r => r.json()),
    ]).then(([r, t]) => { setRates(r.data ?? []); setTxs(t.data ?? []); setLoading(false); });
  }, []);

  async function onCreateRate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/epm/fx-rates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...rateForm, rate_brl: Number(rateForm.rate_brl), rate_prev: Number(rateForm.rate_prev), as_of: rateForm.as_of||null }) });
    const j = await r.json();
    setRates(p => [...p, j.data]);
    setRateForm(EMPTY_RATE);
    setShowRate(false);
    setSaving(false);
  }

  async function onCreateTx(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/epm/fc-transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...txForm, amount_fc: Number(txForm.amount_fc), rate_at_booking: Number(txForm.rate_at_booking), rate_current: Number(txForm.rate_current), date: txForm.date||null }) });
    const j = await r.json();
    setTxs(p => [j.data, ...p]);
    setTxForm(EMPTY_TX);
    setShowTx(false);
    setSaving(false);
  }

  const totalGainLoss = txs.reduce((s, t) => s + calcGainLoss(t), 0);
  const totalFCRevBRL = txs.filter(t => t.type === "REVENUE").reduce((s, t) => s + t.amount_fc * t.rate_current, 0);
  const totalFCExpBRL = txs.filter(t => t.type === "EXPENSE").reduce((s, t) => s + t.amount_fc * t.rate_current, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq/epm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"><ArrowLeft size={16} /></Link>
          <div><h1 className="text-lg font-bold text-gray-900">Câmbio & Currency Translation</h1><p className="text-xs text-gray-500">EPM · Multi-currency · FX Rates</p></div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Receitas FC (BRL)", value: fmtBRL(totalFCRevBRL), color: "text-emerald-600" },
            { label: "Despesas FC (BRL)",  value: fmtBRL(totalFCExpBRL), color: "text-red-500"     },
            { label: "Ganho/Perda Câmbio", value: fmtBRL(totalGainLoss), color: totalGainLoss >= 0 ? "text-emerald-600" : "text-red-500" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1"><DollarSign size={14} className={color} /><span className="text-xs font-semibold text-gray-500 uppercase">{label}</span></div>
              <div className={`text-2xl font-bold ${color}`}>{loading ? "—" : value}</div>
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Cotações (FX Rates)</h2>
            <button onClick={() => setShowRate(true)} className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"><Plus size={12} /> Adicionar</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50"><tr>{["Moeda", "Taxa Atual (BRL)", "Taxa Anterior", "Var.", "Fonte", "Data", ""].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Carregando...</td></tr>
                : rates.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Nenhuma cotação cadastrada</td></tr>
                : rates.map(r => {
                  const change = r.rate_brl - r.rate_prev;
                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{r.flag} {r.currency}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-gray-900">R$ {Number(r.rate_brl).toFixed(4)}</td>
                      <td className="px-4 py-3 font-mono text-gray-500">R$ {Number(r.rate_prev).toFixed(4)}</td>
                      <td className={`px-4 py-3 font-mono text-sm font-semibold ${change >= 0 ? "text-emerald-600" : "text-red-500"}`}>{change >= 0 ? "+" : ""}{change.toFixed(4)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{r.source}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{r.as_of ? new Date(r.as_of).toLocaleDateString("pt-BR") : "—"}</td>
                      <td className="px-4 py-3"><button onClick={() => { fetch("/api/epm/fx-rates", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: r.id }) }); setRates(p => p.filter(x => x.id !== r.id)); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"><Trash2 size={13} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Transações em Moeda Estrangeira</h2>
            <button onClick={() => setShowTx(true)} className="flex items-center gap-1 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"><Plus size={12} /> Adicionar</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50"><tr>{["Entidade", "Descrição", "Moeda", "Valor FC", "Taxa Booking", "BRL Booking", "G/P Câmbio", "Tipo", ""].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">Carregando...</td></tr>
                : txs.length === 0 ? <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">Nenhuma transação em moeda estrangeira</td></tr>
                : txs.map(t => {
                  const gl = calcGainLoss(t);
                  return (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-xs text-gray-600">{t.entity}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate">{t.description}</td>
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-gray-700">{t.currency}</td>
                      <td className="px-4 py-3 font-mono text-sm text-gray-700">{Number(t.amount_fc).toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{Number(t.rate_at_booking).toFixed(4)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{fmtBRL(t.amount_fc * t.rate_at_booking)}</td>
                      <td className={`px-4 py-3 text-sm font-semibold ${gl >= 0 ? "text-emerald-600" : "text-red-500"}`}>{gl >= 0 ? "+" : ""}{fmtBRL(gl)}</td>
                      <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${t.type === "REVENUE" ? "bg-emerald-100 text-emerald-700" : t.type === "EXPENSE" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>{t.type}</span></td>
                      <td className="px-4 py-3"><button onClick={() => { fetch("/api/epm/fc-transactions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: t.id }) }); setTxs(p => p.filter(x => x.id !== t.id)); }} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"><Trash2 size={13} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showRate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200"><h2 className="text-base font-semibold text-gray-900">Nova Cotação FX</h2></div>
            <form onSubmit={onCreateRate} className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Moeda</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={rateForm.currency} onChange={e => setRateForm(p => ({ ...p, currency: e.target.value }))} required /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Símbolo</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={rateForm.symbol} onChange={e => setRateForm(p => ({ ...p, symbol: e.target.value }))} /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Taxa Atual (BRL)</label><input type="number" step="0.0001" min={0} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={rateForm.rate_brl} onChange={e => setRateForm(p => ({ ...p, rate_brl: Number(e.target.value) }))} /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Taxa Anterior (BRL)</label><input type="number" step="0.0001" min={0} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={rateForm.rate_prev} onChange={e => setRateForm(p => ({ ...p, rate_prev: Number(e.target.value) }))} /></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Data</label><input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={rateForm.as_of ?? ""} onChange={e => setRateForm(p => ({ ...p, as_of: e.target.value||null }))} /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowRate(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTx && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200"><h2 className="text-base font-semibold text-gray-900">Nova Transação FC</h2></div>
            <form onSubmit={onCreateTx} className="px-6 py-4 space-y-3">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Descrição</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={txForm.description} onChange={e => setTxForm(p => ({ ...p, description: e.target.value }))} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Entidade</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={txForm.entity} onChange={e => setTxForm(p => ({ ...p, entity: e.target.value }))}>{ENTITIES.map(o => <option key={o}>{o}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={txForm.type} onChange={e => setTxForm(p => ({ ...p, type: e.target.value }))}>{TYPES.map(o => <option key={o}>{o}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Moeda</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={txForm.currency} onChange={e => setTxForm(p => ({ ...p, currency: e.target.value }))} /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Valor (FC)</label><input type="number" step="0.01" min={0} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={txForm.amount_fc} onChange={e => setTxForm(p => ({ ...p, amount_fc: Number(e.target.value) }))} /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Taxa Booking</label><input type="number" step="0.0001" min={0} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={txForm.rate_at_booking} onChange={e => setTxForm(p => ({ ...p, rate_at_booking: Number(e.target.value) }))} /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Taxa Atual</label><input type="number" step="0.0001" min={0} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={txForm.rate_current} onChange={e => setTxForm(p => ({ ...p, rate_current: Number(e.target.value) }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Data</label><input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={txForm.date ?? ""} onChange={e => setTxForm(p => ({ ...p, date: e.target.value||null }))} /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Categoria</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={txForm.category} onChange={e => setTxForm(p => ({ ...p, category: e.target.value }))} /></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowTx(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancelar</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? "Salvando..." : "Salvar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
