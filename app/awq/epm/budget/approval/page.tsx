"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, CheckCircle2, Clock, Lock, Archive, FileText, GitBranch, TrendingUp, Trash2, AlertTriangle } from "lucide-react";
import type { EpmBudgetScenario } from "@/lib/epm-dynamic";

function fmtBRL(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000) return sign + "R$" + (abs / 1_000).toFixed(0) + "K";
  return sign + "R$" + abs.toLocaleString("pt-BR", { minimumFractionDigits: 0 });
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  DRAFT:     { label: "Rascunho",  color: "text-gray-600",    bg: "bg-gray-100",    icon: FileText     },
  SUBMITTED: { label: "Submetido", color: "text-amber-700",   bg: "bg-amber-100",   icon: Clock        },
  APPROVED:  { label: "Aprovado",  color: "text-emerald-700", bg: "bg-emerald-100", icon: CheckCircle2 },
  LOCKED:    { label: "Bloqueado", color: "text-blue-700",    bg: "bg-blue-100",    icon: Lock         },
  ARCHIVED:  { label: "Arquivado", color: "text-gray-500",    bg: "bg-gray-100",    icon: Archive      },
};

const SCENARIO_CFG: Record<string, { color: string; bg: string; label: string }> = {
  BEAR: { color: "text-red-700",     bg: "bg-red-50",     label: "Bear" },
  BASE: { color: "text-blue-700",    bg: "bg-blue-50",    label: "Base" },
  BULL: { color: "text-emerald-700", bg: "bg-emerald-50", label: "Bull" },
};

const SCENARIOS = ["BEAR", "BASE", "BULL"] as const;
const STATUSES = ["DRAFT", "SUBMITTED", "APPROVED", "LOCKED", "ARCHIVED"] as const;

const EMPTY = {
  version_name: "", fiscal_year: 2026, scenario: "BASE" as string, status: "DRAFT" as string,
  approved_by: "", approved_at: null as string | null, submitted_by: "", submitted_at: null as string | null,
  notes: "", budget_revenue: 0, budget_ebitda: 0, budget_net: 0, growth_vs_ly: 0, ebitda_margin: 0,
};

export default function BudgetApprovalPage() {
  const [data, setData] = useState<EpmBudgetScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/epm/budget-scenarios").then(r => r.json()).then(d => { setData(d.data ?? []); setLoading(false); });
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await fetch("/api/epm/budget-scenarios", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, fiscal_year: Number(form.fiscal_year), budget_revenue: Number(form.budget_revenue), budget_ebitda: Number(form.budget_ebitda), budget_net: Number(form.budget_net), growth_vs_ly: Number(form.growth_vs_ly), ebitda_margin: Number(form.ebitda_margin) }),
    });
    const j = await r.json();
    setData(p => [...p, j.data]);
    setForm(EMPTY);
    setShow(false);
    setSaving(false);
  }

  async function onAdvance(s: EpmBudgetScenario, status: string) {
    const by = status === "APPROVED" ? "CEO" : "CFO";
    const r = await fetch("/api/epm/budget-scenarios", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id, status, by }) });
    const j = await r.json();
    setData(prev => prev.map(x => x.id === s.id ? j.data : x));
  }

  async function onDelete(id: string) {
    await fetch("/api/epm/budget-scenarios", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setData(p => p.filter(x => x.id !== id));
  }

  const approved = data.find(v => v.status === "APPROVED");

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/awq/epm" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"><ArrowLeft size={16} /></Link>
            <div><h1 className="text-lg font-bold text-gray-900">Budget Approval Workflow</h1><p className="text-xs text-gray-500">EPM · Budget · Cenários Bear / Base / Bull</p></div>
          </div>
          <button onClick={() => setShow(true)} className="flex items-center gap-1.5 text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"><Plus size={14} /> Novo Cenário</button>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-5">
        {approved && (
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
            <CheckCircle2 size={14} className="shrink-0" />
            <div>
              <strong>Budget operacional ativo:</strong> {approved.version_name} — aprovado por{" "}
              {approved.approved_by || "—"}{approved.approved_at ? ` em ${approved.approved_at.slice(0, 10)}` : ""}.{" "}
              Receita target: <strong>{fmtBRL(approved.budget_revenue)}</strong> · EBITDA target: <strong>{fmtBRL(approved.budget_ebitda)}</strong>
            </div>
          </div>
        )}

        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 text-center text-sm text-gray-400">Carregando...</div>
        ) : data.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-16 flex flex-col items-center gap-3 text-center shadow-sm"><AlertTriangle size={32} className="text-gray-200" /><p className="text-sm font-medium text-gray-500">Nenhum cenário cadastrado</p></div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {data.map(v => {
                const statusCfg = STATUS_CFG[v.status] ?? STATUS_CFG.DRAFT;
                const scenarioCfg = SCENARIO_CFG[v.scenario] ?? SCENARIO_CFG.BASE;
                const StatusIcon = statusCfg.icon;
                return (
                  <div key={v.id} className={`bg-white border border-gray-200 rounded-xl shadow-sm p-5 ${v.status === "APPROVED" ? "ring-2 ring-emerald-300" : ""}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${scenarioCfg.bg} ${scenarioCfg.color}`}>{scenarioCfg.label}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${statusCfg.bg} ${statusCfg.color}`}><StatusIcon size={9} />{statusCfg.label}</span>
                        </div>
                        <div className="text-sm font-bold text-gray-900">{v.version_name}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <GitBranch size={14} className={scenarioCfg.color} />
                        <button onClick={() => onDelete(v.id)} className="p-1 text-gray-300 hover:text-red-500 rounded hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                      </div>
                    </div>

                    <div className="space-y-2 mb-3">
                      {[
                        { label: "Receita Target",  value: fmtBRL(v.budget_revenue) },
                        { label: "EBITDA Target",   value: fmtBRL(v.budget_ebitda)  },
                        { label: "Resultado Líq.",  value: fmtBRL(v.budget_net)     },
                        { label: "Cresc. vs LY",    value: "+" + Number(v.growth_vs_ly).toFixed(1) + "%" },
                        { label: "Margem EBITDA",   value: Number(v.ebitda_margin).toFixed(1) + "%"      },
                      ].map(row => (
                        <div key={row.label} className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">{row.label}</span>
                          <span className="font-semibold text-gray-900 tabular-nums">{row.value}</span>
                        </div>
                      ))}
                    </div>

                    {v.notes && <p className="text-[11px] text-gray-400 italic border-t border-gray-100 pt-3">{v.notes}</p>}

                    {v.approved_by && (
                      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold">
                        <CheckCircle2 size={10} /> Aprovado por {v.approved_by}{v.approved_at ? ` · ${v.approved_at.slice(0, 10)}` : ""}
                      </div>
                    )}

                    <div className="mt-3 flex gap-2">
                      {v.status === "DRAFT" && (
                        <button onClick={() => onAdvance(v, "SUBMITTED")} className="flex-1 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">Submeter</button>
                      )}
                      {v.status === "SUBMITTED" && (
                        <button onClick={() => onAdvance(v, "APPROVED")} className="flex-1 text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors">Aprovar</button>
                      )}
                      {v.status === "APPROVED" && (
                        <button onClick={() => onAdvance(v, "LOCKED")} className="flex-1 text-xs px-3 py-1.5 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors">Bloquear</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={14} className="text-violet-600" />
                <span className="text-sm font-semibold text-gray-900">Comparativo de Cenários</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left">
                      <th className="py-2.5 px-3 text-gray-500 font-semibold">Métrica</th>
                      {data.map(v => (
                        <th key={v.id} className="py-2.5 px-3 text-gray-500 font-semibold text-right">{v.version_name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Receita",       key: "budget_revenue", fmt: fmtBRL },
                      { label: "EBITDA",        key: "budget_ebitda",  fmt: fmtBRL },
                      { label: "Resultado Líq.", key: "budget_net",    fmt: fmtBRL },
                      { label: "Cresc. vs LY",  key: "growth_vs_ly",  fmt: (n: number) => "+" + n.toFixed(1) + "%" },
                      { label: "Margem EBITDA", key: "ebitda_margin",  fmt: (n: number) => n.toFixed(1) + "%" },
                    ].map(row => (
                      <tr key={row.label} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 px-3 text-gray-600 font-medium">{row.label}</td>
                        {data.map(v => {
                          const isApproved = v.status === "APPROVED";
                          return (
                            <td key={v.id} className={`py-2 px-3 text-right tabular-nums font-semibold ${isApproved ? "text-blue-700" : "text-gray-700"}`}>
                              {row.fmt(Number(v[row.key as keyof EpmBudgetScenario]))}
                              {isApproved && <span className="ml-1 text-emerald-500">✓</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200"><h2 className="text-base font-semibold text-gray-900">Novo Cenário de Budget</h2></div>
            <form onSubmit={onCreate} className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="block text-xs font-medium text-gray-700 mb-1">Nome da Versão</label><input placeholder="ex: FY2026-Base" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.version_name} onChange={e => setForm(p => ({ ...p, version_name: e.target.value }))} required /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Ano Fiscal</label><input type="number" min={2020} max={2030} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.fiscal_year} onChange={e => setForm(p => ({ ...p, fiscal_year: Number(e.target.value) }))} /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Cenário</label><select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.scenario} onChange={e => setForm(p => ({ ...p, scenario: e.target.value }))}>{SCENARIOS.map(s => <option key={s}>{s}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[["Receita Target (R$)", "budget_revenue"], ["EBITDA Target (R$)", "budget_ebitda"], ["Resultado Líq. (R$)", "budget_net"], ["Cresc. vs LY (%)", "growth_vs_ly"], ["Margem EBITDA (%)", "ebitda_margin"]].map(([label, key]) => (
                  <div key={key}><label className="block text-xs font-medium text-gray-700 mb-1">{label}</label><input type="number" step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form[key as keyof typeof form] as number} onChange={e => setForm(p => ({ ...p, [key]: Number(e.target.value) }))} /></div>
                ))}
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Notas</label><textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
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
