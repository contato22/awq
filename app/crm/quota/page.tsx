"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Target, TrendingUp, Users, BarChart3,
  ChevronDown, ChevronUp, Plus, Save, X,
} from "lucide-react";
import type { QuotaAttainment, QuotaTarget } from "@/lib/crm-types";
import { OWNER_OPTIONS, BU_OPTIONS } from "@/lib/crm-types";

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
}

function pctColor(pct: number | null): string {
  if (pct == null) return "text-slate-400";
  if (pct >= 100) return "text-emerald-500";
  if (pct >= 75)  return "text-amber-500";
  return "text-red-500";
}

function pctBg(pct: number | null): string {
  if (pct == null) return "bg-slate-200";
  if (pct >= 100) return "bg-emerald-500";
  if (pct >= 75)  return "bg-amber-400";
  return "bg-red-500";
}

// ─── Gauge bar ───────────────────────────────────────────────────────────────

function GaugeBar({ pct, label }: { pct: number | null; label: string }) {
  const val = Math.min(pct ?? 0, 120);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span className={pctColor(pct)}>{pct != null ? `${pct}%` : "–"}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pctBg(pct)}`}
          style={{ width: `${(val / 120) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ─── Attainment card ─────────────────────────────────────────────────────────

function AttainmentCard({
  row,
  onEdit,
}: {
  row: QuotaAttainment;
  onEdit: (r: QuotaAttainment) => void;
}) {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-slate-800">{row.owner}</p>
          <p className="text-xs text-slate-500">{row.bu} · {row.period_label}</p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${pctColor(row.revenue_pct)}`}>{row.revenue_pct}%</p>
          <p className="text-xs text-slate-500">da meta</p>
        </div>
      </div>

      <div className="space-y-2">
        <GaugeBar pct={row.revenue_pct} label={`Receita: ${fmtBRL(row.revenue_actual)} / ${fmtBRL(row.revenue_target)}`} />
        {row.deals_pct != null && (
          <GaugeBar pct={row.deals_pct} label={`Negócios: ${row.deals_actual} / ${row.deals_target}`} />
        )}
        {row.activities_pct != null && (
          <GaugeBar pct={row.activities_pct} label={`Atividades: ${row.activities_actual} / ${row.activities_target}`} />
        )}
      </div>

      <button
        onClick={() => onEdit(row)}
        className="text-xs text-indigo-600 hover:underline"
      >
        Editar meta
      </button>
    </div>
  );
}

// ─── Upsert modal ─────────────────────────────────────────────────────────────

type ModalMode = { mode: "create" } | { mode: "edit"; row: QuotaAttainment };

function UpsertModal({
  initial,
  onClose,
  onSave,
}: {
  initial?: Partial<QuotaTarget>;
  onClose: () => void;
  onSave: (data: Partial<QuotaTarget>) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<QuotaTarget>>({
    owner: OWNER_OPTIONS[0],
    bu: BU_OPTIONS[0],
    period_type: "quarterly",
    period_label: "2026-Q2",
    revenue_target: 100000,
    deals_target: 5,
    activities_target: 40,
    ...initial,
  });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof QuotaTarget, v: unknown) =>
    setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try { await onSave(form); onClose(); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">
            {initial?.quota_id ? "Editar Meta" : "Nova Meta de Quota"}
          </h2>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Owner</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.owner}
                onChange={e => set("owner", e.target.value)}
              >
                {OWNER_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">BU</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.bu}
                onChange={e => set("bu", e.target.value)}
              >
                {BU_OPTIONS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Período</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.period_type}
                onChange={e => set("period_type", e.target.value)}
              >
                <option value="monthly">Mensal</option>
                <option value="quarterly">Trimestral</option>
                <option value="annual">Anual</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Label</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder="2026-Q2"
                value={form.period_label ?? ""}
                onChange={e => set("period_label", e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Meta de Receita (R$)</label>
            <input
              type="number"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={form.revenue_target ?? ""}
              onChange={e => set("revenue_target", Number(e.target.value))}
              required min={0}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Meta Negócios</label>
              <input
                type="number"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.deals_target ?? ""}
                onChange={e => set("deals_target", e.target.value ? Number(e.target.value) : null)}
                min={0}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Meta Atividades</label>
              <input
                type="number"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={form.activities_target ?? ""}
                onChange={e => set("activities_target", e.target.value ? Number(e.target.value) : null)}
                min={0}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              <Save size={14} /> {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuotaPage() {
  const [attainments, setAttainments] = useState<QuotaAttainment[]>([]);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState<ModalMode | null>(null);

  // Filters
  const [filterOwner,       setFilterOwner]       = useState("");
  const [filterBu,          setFilterBu]          = useState("");
  const [filterPeriodType,  setFilterPeriodType]  = useState("quarterly");
  const [filterPeriodLabel, setFilterPeriodLabel] = useState("2026-Q2");
  const [sortBy,            setSortBy]            = useState<"pct" | "owner">("pct");
  const [sortDir,           setSortDir]           = useState<"asc" | "desc">("desc");

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (filterOwner)       p.set("owner",        filterOwner);
    if (filterBu)          p.set("bu",           filterBu);
    if (filterPeriodType)  p.set("period_type",  filterPeriodType);
    if (filterPeriodLabel) p.set("period_label", filterPeriodLabel);
    const r = await fetch(`/api/crm/quota?${p}`);
    const j = await r.json();
    if (j.success) setAttainments(j.data);
    setLoading(false);
  }, [filterOwner, filterBu, filterPeriodType, filterPeriodLabel]);

  useEffect(() => { load(); }, [load]);

  async function handleSave(data: Partial<QuotaTarget>) {
    await fetch("/api/crm/quota", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "upsert", ...data }),
    });
    await load();
  }

  // Sorted rows
  const sorted = [...attainments].sort((a, b) => {
    let cmp = 0;
    if (sortBy === "pct")   cmp = (a.revenue_pct ?? 0) - (b.revenue_pct ?? 0);
    if (sortBy === "owner") cmp = a.owner.localeCompare(b.owner);
    return sortDir === "asc" ? cmp : -cmp;
  });

  // KPIs
  const totalRevTarget = attainments.reduce((s, r) => s + r.revenue_target, 0);
  const totalRevActual = attainments.reduce((s, r) => s + r.revenue_actual, 0);
  const overallPct     = totalRevTarget > 0 ? Math.round((totalRevActual / totalRevTarget) * 100) : 0;
  const onTrack        = attainments.filter(r => r.revenue_pct >= 75).length;
  const atRisk         = attainments.filter(r => r.revenue_pct < 75 && r.revenue_pct >= 0).length;

  // Toggle sort
  function toggleSort(key: "pct" | "owner") {
    if (sortBy === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortDir("desc"); }
  }
  const SortIcon = ({ k }: { k: "pct" | "owner" }) =>
    sortBy === k
      ? sortDir === "desc" ? <ChevronDown size={14} /> : <ChevronUp size={14} />
      : null;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quota Tracking</h1>
          <p className="text-sm text-slate-500 mt-0.5">Acompanhe metas e atingimento por rep e BU</p>
        </div>
        <button
          onClick={() => setModal({ mode: "create" })}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Nova Meta
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            icon: <Target size={20} className="text-indigo-500" />,
            label: "Meta Total", value: fmtBRL(totalRevTarget), sub: filterPeriodLabel,
          },
          {
            icon: <TrendingUp size={20} className="text-emerald-500" />,
            label: "Receita Realizada", value: fmtBRL(totalRevActual),
            sub: <span className={pctColor(overallPct)}>{overallPct}% da meta</span>,
          },
          {
            icon: <BarChart3 size={20} className="text-amber-500" />,
            label: "No Caminho (≥75%)", value: String(onTrack),
            sub: `de ${attainments.length} reps`,
          },
          {
            icon: <Users size={20} className="text-red-500" />,
            label: "Em Risco (<75%)", value: String(atRisk),
            sub: `de ${attainments.length} reps`,
          },
        ].map(k => (
          <div key={k.label} className="card p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-slate-50">{k.icon}</div>
            <div>
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className="text-xl font-bold text-slate-800">{k.value}</p>
              <p className="text-xs text-slate-400">{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          value={filterPeriodType}
          onChange={e => setFilterPeriodType(e.target.value)}
        >
          <option value="monthly">Mensal</option>
          <option value="quarterly">Trimestral</option>
          <option value="annual">Anual</option>
        </select>

        <input
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-28"
          placeholder="Período (ex: 2026-Q2)"
          value={filterPeriodLabel}
          onChange={e => setFilterPeriodLabel(e.target.value)}
        />

        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          value={filterOwner}
          onChange={e => setFilterOwner(e.target.value)}
        >
          <option value="">Todos os owners</option>
          {OWNER_OPTIONS.map(o => <option key={o}>{o}</option>)}
        </select>

        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          value={filterBu}
          onChange={e => setFilterBu(e.target.value)}
        >
          <option value="">Todas as BUs</option>
          {BU_OPTIONS.map(b => <option key={b}>{b}</option>)}
        </select>

        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => toggleSort("owner")}
            className={`flex items-center gap-1 px-3 py-2 text-sm rounded-lg border ${sortBy === "owner" ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "border-slate-200 text-slate-600"}`}
          >
            Owner <SortIcon k="owner" />
          </button>
          <button
            onClick={() => toggleSort("pct")}
            className={`flex items-center gap-1 px-3 py-2 text-sm rounded-lg border ${sortBy === "pct" ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "border-slate-200 text-slate-600"}`}
          >
            Atingimento <SortIcon k="pct" />
          </button>
        </div>
      </div>

      {/* Attainment Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Carregando…</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          Nenhuma meta encontrada para os filtros selecionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(row => (
            <AttainmentCard
              key={row.quota_id}
              row={row}
              onEdit={r => setModal({ mode: "edit", row: r })}
            />
          ))}
        </div>
      )}

      {/* Table view */}
      {sorted.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-700">Tabela Detalhada</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Owner / BU</th>
                  <th className="px-4 py-3 text-left">Período</th>
                  <th className="px-4 py-3 text-right">Meta Receita</th>
                  <th className="px-4 py-3 text-right">Realizado</th>
                  <th className="px-4 py-3 text-right">Attainment</th>
                  <th className="px-4 py-3 text-right">Negócios</th>
                  <th className="px-4 py-3 text-right">Atividades</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {sorted.map(row => (
                  <tr key={row.quota_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{row.owner}</p>
                      <p className="text-xs text-slate-400">{row.bu}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.period_label}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmtBRL(row.revenue_target)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmtBRL(row.revenue_actual)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${pctColor(row.revenue_pct)}`}>{row.revenue_pct}%</span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {row.deals_actual} / {row.deals_target ?? "–"}
                      {row.deals_pct != null && <span className={`ml-1 text-xs ${pctColor(row.deals_pct)}`}>({row.deals_pct}%)</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {row.activities_actual} / {row.activities_target ?? "–"}
                      {row.activities_pct != null && <span className={`ml-1 text-xs ${pctColor(row.activities_pct)}`}>({row.activities_pct}%)</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      {modal && (
        <UpsertModal
          initial={modal.mode === "edit" ? modal.row : undefined}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
