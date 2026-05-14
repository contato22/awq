"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, GitMerge, CheckCircle2, AlertTriangle, ArrowLeftRight, XCircle, Trash2 } from "lucide-react";
import type { EpmIcTransaction } from "@/lib/epm-dynamic";

function fmtBRL(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000) return sign + "R$" + (abs / 1_000).toFixed(0) + "K";
  return sign + "R$" + abs.toLocaleString("pt-BR", { minimumFractionDigits: 0 });
}

const ENTITIES = ["AWQ", "JACQES", "CAZA", "ADVISOR", "VENTURE"] as const;
const IC_TYPES = ["SERVICE", "LOAN", "MANAGEMENT_FEE", "REIMBURSEMENT", "DIVIDEND"] as const;
const STATUSES = ["MATCHED", "UNMATCHED", "ELIMINATED"] as const;

const TYPE_LABELS: Record<string, string> = {
  SERVICE: "Serviço", LOAN: "Empréstimo", MANAGEMENT_FEE: "Fee Gestão",
  REIMBURSEMENT: "Reembolso", DIVIDEND: "Dividendo",
};

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  ELIMINATED: { label: "Eliminado",  color: "text-emerald-700", bg: "bg-emerald-100" },
  UNMATCHED:  { label: "Pendente",   color: "text-amber-700",   bg: "bg-amber-100"   },
  MATCHED:    { label: "Matched",    color: "text-blue-700",    bg: "bg-blue-100"    },
};

const EMPTY = {
  date: null as string | null, from_entity: "AWQ" as string, to_entity: "JACQES" as string,
  description: "", amount: 0, ic_type: "MANAGEMENT_FEE" as string, status: "MATCHED" as string,
};

export default function EliminationsPage() {
  const [data, setData] = useState<EpmIcTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/epm/ic-transactions").then(r => r.json()).then(d => { setData(d.data ?? []); setLoading(false); });
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/epm/ic-transactions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount), date: form.date || null }),
    });
    const j = await r.json();
    setData(p => [j.data, ...p]);
    setForm(EMPTY);
    setShow(false);
    setSaving(false);
  }

  async function onDelete(id: string) {
    await fetch("/api/epm/ic-transactions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setData(p => p.filter(x => x.id !== id));
  }

  const { eliminated, unmatched, totalElim, totalUnmatch, entityPairs } = useMemo(() => {
    const eliminated = data.filter(t => t.status === "ELIMINATED");
    const unmatched = data.filter(t => t.status !== "ELIMINATED");
    const totalElim = eliminated.reduce((s, t) => s + Number(t.amount), 0);
    const totalUnmatch = unmatched.reduce((s, t) => s + Number(t.amount), 0);
    const pairMap = new Map<string, { from: string; to: string; total: number; count: number; types: string[] }>();
    for (const t of eliminated) {
      const key = `${t.from_entity}→${t.to_entity}`;
      const ex = pairMap.get(key);
      if (ex) { ex.total += Number(t.amount); ex.count++; if (!ex.types.includes(t.ic_type)) ex.types.push(t.ic_type); }
      else pairMap.set(key, { from: t.from_entity, to: t.to_entity, total: Number(t.amount), count: 1, types: [t.ic_type] });
    }
    const entityPairs = [...pairMap.values()].sort((a, b) => b.total - a.total);
    return { eliminated, unmatched, totalElim, totalUnmatch, entityPairs };
  }, [data]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/epm/consolidation" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"><ArrowLeft size={16} /></Link>
            <div><h1 className="text-lg font-bold text-gray-900">Eliminações Intercompany</h1><p className="text-xs text-gray-500">EPM · Consolidação · Eliminação IC · AWQ Group</p></div>
          </div>
          <button onClick={() => setShow(true)} className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"><Plus size={14} /> Nova Transação IC</button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-5">
        <div className="flex items-start gap-3 p-4 bg-violet-50 border border-violet-200 rounded-xl text-xs text-violet-800">
          <GitMerge size={13} className="shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Metodologia de eliminação AWQ:</span>{" "}
            Transações entre entidades do grupo são registradas como AR na entidade vendedora e AP na entidade compradora.
            Na consolidação, ambos os lados são eliminados para evitar dupla contagem. Itens pendentes requerem reconciliação.
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Eliminado",   value: loading ? "—" : fmtBRL(totalElim),      color: "text-emerald-700", icon: CheckCircle2 },
            { label: "Pares Entidade",    value: loading ? "—" : entityPairs.length,      color: "text-blue-700",    icon: ArrowLeftRight },
            { label: "Transações IC",     value: loading ? "—" : eliminated.length,       color: "text-gray-700",    icon: GitMerge },
            { label: "Não Reconciliados", value: loading ? "—" : unmatched.length,        color: unmatched.length > 0 ? "text-red-700" : "text-emerald-700", icon: unmatched.length > 0 ? AlertTriangle : CheckCircle2 },
          ].map(card => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-1"><Icon size={14} className={card.color} /></div>
                <div className={`text-xl font-bold tabular-nums ${card.color}`}>{card.value}</div>
                <div className="text-xs text-gray-400 mt-1">{card.label}</div>
              </div>
            );
          })}
        </div>

        {!loading && unmatched.length > 0 && (
          <div className="bg-white border border-amber-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={14} className="text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">{unmatched.length} Item(ns) Sem Contrapartida — {fmtBRL(totalUnmatch)} não eliminado</span>
            </div>
            <div className="space-y-2">
              {unmatched.map(t => {
                const scfg = STATUS_CFG[t.status] ?? STATUS_CFG.UNMATCHED;
                return (
                  <div key={t.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl">
                    <XCircle size={13} className="text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-900">{t.description}</div>
                      <div className="text-[11px] text-gray-400">{t.from_entity} → {t.to_entity} · {t.date || "—"}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-amber-700 tabular-nums">{fmtBRL(Number(t.amount))}</div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${scfg.bg} ${scfg.color}`}>{scfg.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && entityPairs.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <ArrowLeftRight size={14} className="text-violet-600" />
              <span className="text-sm font-semibold text-gray-900">Eliminações por Par de Entidade</span>
            </div>
            <div className="space-y-3">
              {entityPairs.map(pair => {
                const pct = totalElim > 0 ? (pair.total / totalElim) * 100 : 0;
                return (
                  <div key={`${pair.from}-${pair.to}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-blue-700">{pair.from}</span>
                        <ArrowLeftRight size={10} className="text-gray-400" />
                        <span className="font-semibold text-gray-700">{pair.to}</span>
                        <span className="text-gray-400">· {pair.count} transações</span>
                        {pair.types.map(t => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-full font-semibold">{TYPE_LABELS[t] ?? t}</span>
                        ))}
                      </div>
                      <span className="text-xs font-bold text-gray-900 tabular-nums">{fmtBRL(pair.total)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <GitMerge size={14} className="text-violet-600" />
            <span className="text-sm font-semibold text-gray-900">Registro de Transações Intercompany</span>
            {!loading && <span className="ml-auto text-xs text-gray-400">{data.length} transações</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>{["Data", "De", "Para", "Descrição", "Tipo", "Valor", "Status", ""].map(h => <th key={h} className="px-3 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? <tr><td colSpan={8} className="px-4 py-16 text-center text-sm text-gray-400">Carregando...</td></tr>
                : data.length === 0 ? <tr><td colSpan={8} className="px-4 py-16"><div className="flex flex-col items-center gap-3 text-center"><GitMerge size={32} className="text-gray-200" /><p className="text-sm font-medium text-gray-500">Nenhuma transação IC registrada</p></div></td></tr>
                : data.map(t => {
                  const scfg = STATUS_CFG[t.status] ?? STATUS_CFG.UNMATCHED;
                  return (
                    <tr key={t.id} className={`hover:bg-gray-50 ${t.status !== "ELIMINATED" ? "bg-amber-50/40" : ""}`}>
                      <td className="px-3 py-3 text-xs text-gray-500">{t.date || "—"}</td>
                      <td className="px-3 py-3 font-semibold text-blue-700 text-xs">{t.from_entity}</td>
                      <td className="px-3 py-3 text-xs text-gray-700">{t.to_entity}</td>
                      <td className="px-3 py-3 text-xs text-gray-600 max-w-[200px] truncate">{t.description}</td>
                      <td className="px-3 py-3"><span className="text-[10px] px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-full font-semibold">{TYPE_LABELS[t.ic_type] ?? t.ic_type}</span></td>
                      <td className="px-3 py-3 text-sm tabular-nums font-bold text-gray-900">{fmtBRL(Number(t.amount))}</td>
                      <td className="px-3 py-3"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${scfg.bg} ${scfg.color}`}>{scfg.label}</span></td>
                      <td className="px-3 py-3"><button onClick={() => onDelete(t.id)} className="p-1.5 text-gray-300 hover:text-red-500 rounded hover:bg-red-50 transition-colors"><Trash2 size={13} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
              {!loading && data.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
                    <td className="py-2.5 px-3 text-xs text-gray-700" colSpan={5}>Total IC · Eliminado: {fmtBRL(totalElim)} · Pendente: {fmtBRL(totalUnmatch)}</td>
                    <td className="py-2.5 px-3 text-right text-xs tabular-nums text-gray-900">{fmtBRL(totalElim + totalUnmatch)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200"><h2 className="text-base font-semibold text-gray-900">Nova Transação Intercompany</h2></div>
            <form onSubmit={onCreate} className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Data</label><input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.date ?? ""} onChange={e => setForm(p => ({ ...p, date: e.target.value || null }))} /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Tipo IC</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.ic_type} onChange={e => setForm(p => ({ ...p, ic_type: e.target.value }))}>{IC_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">De</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.from_entity} onChange={e => setForm(p => ({ ...p, from_entity: e.target.value }))}>{ENTITIES.map(e => <option key={e}>{e}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Para</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.to_entity} onChange={e => setForm(p => ({ ...p, to_entity: e.target.value }))}>{ENTITIES.map(e => <option key={e}>{e}</option>)}</select></div>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Descrição</label><input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Valor (R$)</label><input type="number" min={0} step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))} /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Status</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>{STATUSES.map(s => <option key={s} value={s}>{STATUS_CFG[s]?.label ?? s}</option>)}</select></div>
              </div>
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
