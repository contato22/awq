"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Lock, Unlock, CheckCircle2, Clock, AlertTriangle, Trash2 } from "lucide-react";
import type { EpmFiscalPeriod } from "@/lib/epm-dynamic";

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  OPEN:      { label: "Aberto",     color: "text-blue-600",    bg: "bg-blue-50   border-blue-200",    icon: Unlock       },
  REVIEWING: { label: "Em Revisão", color: "text-amber-700",   bg: "bg-amber-50  border-amber-200",   icon: Clock        },
  CLOSED:    { label: "Fechado",    color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle2 },
  LOCKED:    { label: "Bloqueado",  color: "text-red-700",     bg: "bg-red-50    border-red-200",      icon: Lock         },
};

const STATUS_FLOW = ["OPEN", "REVIEWING", "CLOSED", "LOCKED"];

const CHECKLIST_LABELS = [
  "Balancete (GL) balanceado",
  "AP reconciliado com fornecedores",
  "AR reconciliado com clientes",
  "Conciliação bancária completa",
  "Depreciação lançada no GL",
  "Provisões registradas",
];

const EMPTY = { period_code: "", period_type: "MONTH" as string, fiscal_year: 2026, start_date: null as string|null, end_date: null as string|null, status: "OPEN" as string, closed_by: "", closed_at: null as string|null, checklist: CHECKLIST_LABELS.map(label => ({ label, done: false })) };

export default function PeriodsPage() {
  const [data, setData] = useState<EpmFiscalPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/epm/periods").then(r => r.json()).then(d => { setData(d.data ?? []); setLoading(false); });
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/epm/periods", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, fiscal_year: Number(form.fiscal_year), start_date: form.start_date||null, end_date: form.end_date||null }) });
    const j = await r.json();
    setData(p => [...p, j.data]);
    setForm(EMPTY);
    setShow(false);
    setSaving(false);
  }

  async function onAdvanceStatus(p: EpmFiscalPeriod) {
    const next = STATUS_FLOW[Math.min(STATUS_FLOW.indexOf(p.status) + 1, STATUS_FLOW.length - 1)];
    const r = await fetch("/api/epm/periods", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, status: next, closed_by: p.closed_by || "CFO", checklist: p.checklist }) });
    const j = await r.json();
    setData(prev => prev.map(x => x.id === p.id ? j.data : x));
  }

  async function onToggleChecklist(period: EpmFiscalPeriod, idx: number) {
    const newChecklist = period.checklist.map((item, i) => i === idx ? { ...item, done: !item.done } : item);
    const r = await fetch("/api/epm/periods", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: period.id, status: period.status, closed_by: period.closed_by, checklist: newChecklist }) });
    const j = await r.json();
    setData(prev => prev.map(x => x.id === period.id ? j.data : x));
  }

  async function onDelete(id: string) {
    await fetch("/api/epm/periods", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setData(p => p.filter(x => x.id !== id));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/epm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"><ArrowLeft size={16} /></Link>
            <div><h1 className="text-lg font-bold text-gray-900">Gestão de Períodos Fiscais</h1><p className="text-xs text-gray-500">EPM · Períodos</p></div>
          </div>
          <button onClick={() => setShow(true)} className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"><Plus size={14} /> Novo Período</button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-4">
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center text-sm text-gray-400">Carregando...</div>
        ) : data.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 flex flex-col items-center gap-3 text-center shadow-sm"><AlertTriangle size={32} className="text-gray-200" /><p className="text-sm font-medium text-gray-500">Nenhum período cadastrado</p></div>
        ) : data.map(p => {
          const cfg = STATUS_CFG[p.status] ?? STATUS_CFG.OPEN;
          const Icon = cfg.icon;
          const checklist: {label: string; done: boolean}[] = Array.isArray(p.checklist) ? p.checklist : CHECKLIST_LABELS.map(label => ({ label, done: false }));
          const doneCount = checklist.filter(c => c.done).length;
          const isLocked = p.status === "LOCKED";
          const canAdvance = !isLocked;
          return (
            <div key={p.id} className={`bg-white border rounded-xl shadow-sm overflow-hidden ${cfg.bg}`}>
              <div className="px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${cfg.bg}`}><Icon size={15} className={cfg.color} /></div>
                  <div>
                    <div className="font-semibold text-gray-900">{p.period_code} <span className="text-xs text-gray-400 font-normal ml-1">{p.period_type}</span></div>
                    <div className="text-xs text-gray-500">{p.start_date ? new Date(p.start_date).toLocaleDateString("pt-BR") : "—"} → {p.end_date ? new Date(p.end_date).toLocaleDateString("pt-BR") : "—"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                    <div className="text-[10px] text-gray-400">{doneCount}/{checklist.length} checklist</div>
                  </div>
                  {canAdvance && (
                    <button onClick={() => onAdvanceStatus(p)} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      → {STATUS_CFG[STATUS_FLOW[Math.min(STATUS_FLOW.indexOf(p.status)+1, STATUS_FLOW.length-1)]]?.label}
                    </button>
                  )}
                  <button onClick={() => onDelete(p.id)} className="p-1.5 text-gray-300 hover:text-red-500 rounded hover:bg-red-50 transition-colors"><Trash2 size={13} /></button>
                </div>
              </div>
              <div className="px-5 pb-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                {checklist.map((item, idx) => (
                  <button key={idx} onClick={() => !isLocked && onToggleChecklist(p, idx)} disabled={isLocked} className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg border transition-colors text-left ${item.done ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"} ${isLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
                    <CheckCircle2 size={12} className={item.done ? "text-emerald-500" : "text-gray-300"} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
              {p.closed_by && <div className="px-5 pb-3 text-[10px] text-gray-400">Fechado por <span className="font-medium">{p.closed_by}</span>{p.closed_at ? ` em ${new Date(p.closed_at).toLocaleDateString("pt-BR")}` : ""}</div>}
            </div>
          );
        })}
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200"><h2 className="text-base font-semibold text-gray-900">Novo Período Fiscal</h2></div>
            <form onSubmit={onCreate} className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Código do Período</label><input placeholder="ex: 2026-05" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.period_code} onChange={e => setForm(p => ({ ...p, period_code: e.target.value }))} required /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.period_type} onChange={e => setForm(p => ({ ...p, period_type: e.target.value }))}>{["MONTH","QUARTER","YEAR"].map(o => <option key={o}>{o}</option>)}</select></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Ano Fiscal</label><input type="number" min={2020} max={2030} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.fiscal_year} onChange={e => setForm(p => ({ ...p, fiscal_year: Number(e.target.value) }))} /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Início</label><input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.start_date ?? ""} onChange={e => setForm(p => ({ ...p, start_date: e.target.value||null }))} /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Fim</label><input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.end_date ?? ""} onChange={e => setForm(p => ({ ...p, end_date: e.target.value||null }))} /></div>
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
