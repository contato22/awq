"use client";

import { useEffect, useState, useCallback } from "react";
import {
  TrendingUp, RefreshCw, CheckCircle2, Clock,
  BarChart3, DollarSign, ArrowRight, AlertCircle,
  Download,
} from "lucide-react";
import type { ForecastSnapshot, ForecastLineItem } from "@/lib/crm-types";
import { STAGE_LABELS } from "@/lib/crm-types";

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtBRL(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000)     return `R$ ${(n / 1_000).toFixed(0)}K`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const STAGE_COLORS: Record<string, string> = {
  discovery:     "bg-slate-200 text-slate-700",
  qualification: "bg-blue-100 text-blue-700",
  proposal:      "bg-amber-100 text-amber-700",
  negotiation:   "bg-orange-100 text-orange-700",
  closed_won:    "bg-emerald-100 text-emerald-700",
};

// ─── Line items grouped by period ────────────────────────────────────────────

function PipelineByMonth({ lines }: { lines: ForecastLineItem[] }) {
  const byMonth = lines.reduce<Record<string, ForecastLineItem[]>>((acc, l) => {
    (acc[l.period_label] ??= []).push(l);
    return acc;
  }, {});

  const months = Object.keys(byMonth).sort();

  if (months.length === 0) return <p className="text-slate-400 text-sm">Nenhuma linha.</p>;

  return (
    <div className="space-y-6">
      {months.map(month => {
        const rows = byMonth[month].sort((a, b) => b.weighted_value - a.weighted_value);
        const monthPipeline = rows.reduce((s, r) => s + r.pipeline_value, 0);
        const monthWeighted = rows.reduce((s, r) => s + r.weighted_value, 0);
        return (
          <div key={month} className="card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-700">{month}</h3>
              <div className="flex gap-4 text-sm">
                <span className="text-slate-500">Pipeline: <span className="font-medium text-slate-700">{fmtBRL(monthPipeline)}</span></span>
                <span className="text-slate-500">Ponderado: <span className="font-medium text-indigo-600">{fmtBRL(monthWeighted)}</span></span>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-left">BU</th>
                  <th className="px-4 py-2 text-left">Owner</th>
                  <th className="px-4 py-2 text-left">Estágio</th>
                  <th className="px-4 py-2 text-right">Deals</th>
                  <th className="px-4 py-2 text-right">Pipeline</th>
                  <th className="px-4 py-2 text-right">Ponderado</th>
                  <th className="px-4 py-2 text-right">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-700">{r.bu}</td>
                    <td className="px-4 py-2.5 text-slate-600">{r.owner}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[r.stage] ?? "bg-slate-100 text-slate-600"}`}>
                        {STAGE_LABELS[r.stage as keyof typeof STAGE_LABELS] ?? r.stage}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-600">{r.deal_count}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">{fmtBRL(r.pipeline_value)}</td>
                    <td className="px-4 py-2.5 text-right text-indigo-600 font-medium">{fmtBRL(r.weighted_value)}</td>
                    <td className="px-4 py-2.5 text-right text-slate-500 text-xs">
                      {r.pipeline_value > 0 ? Math.round((r.weighted_value / r.pipeline_value) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

// ─── Snapshot history sidebar ─────────────────────────────────────────────────

type SnapSummary = Omit<ForecastSnapshot, "line_items">;

function SnapshotList({
  snapshots,
  activeId,
  onSelect,
}: {
  snapshots: SnapSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  if (snapshots.length === 0) return <p className="text-slate-400 text-sm p-4">Nenhum snapshot.</p>;

  return (
    <ul className="divide-y divide-slate-100">
      {snapshots.map(s => (
        <li key={s.snapshot_id}>
          <button
            onClick={() => onSelect(s.snapshot_id)}
            className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${activeId === s.snapshot_id ? "bg-indigo-50 border-l-2 border-indigo-500" : ""}`}
          >
            <p className="text-sm font-medium text-slate-700">{s.period_label}</p>
            <p className="text-xs text-slate-400">{fmtDate(s.snapshot_at)}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-indigo-600">{fmtBRL(s.total_weighted)} pond.</span>
              {s.synced_to_epm
                ? <span className="flex items-center gap-0.5 text-xs text-emerald-600"><CheckCircle2 size={11} /> Sincronizado</span>
                : <span className="flex items-center gap-0.5 text-xs text-slate-400"><Clock size={11} /> Pendente</span>}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ForecastSyncPage() {
  const [snapshot,      setSnapshot]      = useState<ForecastSnapshot | null>(null);
  const [snapshots,     setSnapshots]     = useState<SnapSummary[]>([]);
  const [activeSnapId,  setActiveSnapId]  = useState<string | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [syncing,       setSyncing]       = useState(false);
  const [capturing,     setCapturing]     = useState(false);
  const [syncMsg,       setSyncMsg]       = useState<string | null>(null);

  const loadList = useCallback(async () => {
    const r = await fetch("/api/crm/forecast-sync?resource=list");
    const j = await r.json();
    if (j.success) setSnapshots(j.data);
  }, []);

  const loadSnapshot = useCallback(async (snapId?: string | null) => {
    setLoading(true);
    const url = snapId
      ? `/api/crm/forecast-sync?snapshot_id=${snapId}`
      : "/api/crm/forecast-sync";
    const r = await fetch(url);
    const j = await r.json();
    if (j.success && j.data) {
      setSnapshot(j.data);
      setActiveSnapId(j.data.snapshot_id);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadList();
    loadSnapshot();
  }, [loadList, loadSnapshot]);

  async function handleCapture() {
    setCapturing(true);
    setSyncMsg(null);
    await fetch("/api/crm/forecast-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_snapshot", created_by: "Miguel" }),
    });
    await loadList();
    await loadSnapshot();
    setCapturing(false);
    setSyncMsg("Snapshot criado com sucesso.");
  }

  async function handleSync() {
    if (!snapshot) return;
    setSyncing(true);
    setSyncMsg(null);
    await fetch("/api/crm/forecast-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_synced", snapshot_id: snapshot.snapshot_id }),
    });
    await loadList();
    await loadSnapshot(snapshot.snapshot_id);
    setSyncing(false);
    setSyncMsg("Snapshot marcado como sincronizado com o EPM.");
  }

  // Group by BU for KPI strip
  const byBU = (snapshot?.line_items ?? []).reduce<Record<string, number>>((acc, l) => {
    acc[l.bu] = (acc[l.bu] ?? 0) + l.weighted_value;
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Forecast Financeiro — Integração EPM</h1>
          <p className="text-sm text-slate-500 mt-0.5">Pipeline CRM ponderado → projeção de receita no EPM</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCapture}
            disabled={capturing}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw size={14} className={capturing ? "animate-spin" : ""} />
            {capturing ? "Capturando…" : "Novo Snapshot"}
          </button>
          <button
            onClick={handleSync}
            disabled={syncing || !snapshot || snapshot.synced_to_epm}
            className="btn-primary flex items-center gap-2 disabled:opacity-60"
          >
            <ArrowRight size={14} />
            {syncing ? "Sincronizando…" : snapshot?.synced_to_epm ? "Já Sincronizado" : "Sincronizar com EPM"}
          </button>
        </div>
      </div>

      {/* Status alert */}
      {syncMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          <CheckCircle2 size={16} />
          {syncMsg}
        </div>
      )}

      {/* KPI Strip */}
      {snapshot && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-50"><TrendingUp size={20} className="text-indigo-500" /></div>
            <div>
              <p className="text-xs text-slate-500">Pipeline Total</p>
              <p className="text-xl font-bold text-slate-800">{fmtBRL(snapshot.total_pipeline)}</p>
              <p className="text-xs text-slate-400">{snapshot.line_items.reduce((s, l) => s + l.deal_count, 0)} deals</p>
            </div>
          </div>
          <div className="card p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-50"><DollarSign size={20} className="text-emerald-500" /></div>
            <div>
              <p className="text-xs text-slate-500">Forecast Ponderado</p>
              <p className="text-xl font-bold text-slate-800">{fmtBRL(snapshot.total_weighted)}</p>
              <p className="text-xs text-slate-400">
                {snapshot.total_pipeline > 0
                  ? `${Math.round((snapshot.total_weighted / snapshot.total_pipeline) * 100)}% do pipeline`
                  : "–"}
              </p>
            </div>
          </div>
          <div className="card p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-50"><BarChart3 size={20} className="text-amber-500" /></div>
            <div>
              <p className="text-xs text-slate-500">Por BU (pond.)</p>
              {Object.entries(byBU).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([bu, v]) => (
                <p key={bu} className="text-xs text-slate-700"><span className="font-medium">{bu}</span>: {fmtBRL(v)}</p>
              ))}
            </div>
          </div>
          <div className="card p-4 flex items-start gap-3">
            <div className={`p-2 rounded-lg ${snapshot.synced_to_epm ? "bg-emerald-50" : "bg-slate-50"}`}>
              {snapshot.synced_to_epm
                ? <CheckCircle2 size={20} className="text-emerald-500" />
                : <AlertCircle size={20} className="text-slate-400" />}
            </div>
            <div>
              <p className="text-xs text-slate-500">Status EPM</p>
              <p className={`text-sm font-semibold ${snapshot.synced_to_epm ? "text-emerald-600" : "text-slate-500"}`}>
                {snapshot.synced_to_epm ? "Sincronizado" : "Não sincronizado"}
              </p>
              <p className="text-xs text-slate-400">
                {snapshot.synced_to_epm && snapshot.epm_sync_at
                  ? fmtDate(snapshot.epm_sync_at)
                  : `Snapshot: ${fmtDate(snapshot.snapshot_at)}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Snapshot history */}
        <div className="lg:col-span-1">
          <div className="card overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center gap-2">
              <Clock size={16} className="text-slate-400" />
              <h3 className="font-semibold text-slate-700 text-sm">Histórico de Snapshots</h3>
            </div>
            <SnapshotList
              snapshots={snapshots}
              activeId={activeSnapId}
              onSelect={id => loadSnapshot(id)}
            />
          </div>
        </div>

        {/* Pipeline breakdown */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="card p-8 text-center text-slate-400">Carregando…</div>
          ) : !snapshot ? (
            <div className="card p-8 text-center text-slate-400">
              <p>Nenhum snapshot disponível.</p>
              <button onClick={handleCapture} className="btn-primary mt-4">Capturar Pipeline Agora</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-700">Pipeline por Mês de Fechamento</h3>
                  <p className="text-xs text-slate-400">Snapshot de {fmtDate(snapshot.snapshot_at)} · por {snapshot.created_by}</p>
                </div>
                <button
                  onClick={() => {
                    const csv = [
                      "BU,Owner,Período,Estágio,Deals,Pipeline,Ponderado",
                      ...(snapshot.line_items.map(l =>
                        `${l.bu},${l.owner},${l.period_label},${l.stage},${l.deal_count},${l.pipeline_value.toFixed(2)},${l.weighted_value.toFixed(2)}`
                      )),
                    ].join("\n");
                    const blob = new Blob([csv], { type: "text/csv" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `forecast-${snapshot.period_label}.csv`;
                    a.click();
                  }}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg"
                >
                  <Download size={12} /> CSV
                </button>
              </div>
              <PipelineByMonth lines={snapshot.line_items} />
            </div>
          )}
        </div>
      </div>

      {/* Sync flow diagram */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-700 mb-4">Fluxo de Integração CRM → EPM</h3>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {[
            { label: "CRM Pipeline", sub: "Oportunidades abertas", color: "bg-indigo-50 border-indigo-200 text-indigo-700" },
            { label: "→" },
            { label: "Snapshot", sub: "Ponderado por estágio", color: "bg-amber-50 border-amber-200 text-amber-700" },
            { label: "→" },
            { label: "EPM Forecast", sub: "Receita projetada", color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
            { label: "→" },
            { label: "Budget vs Actual", sub: "Gap analysis", color: "bg-slate-50 border-slate-200 text-slate-700" },
          ].map((step, i) =>
            step.label === "→" ? (
              <ArrowRight key={i} size={16} className="text-slate-400" />
            ) : (
              <div key={i} className={`px-4 py-2.5 rounded-xl border ${step.color} text-center`}>
                <p className="font-semibold">{step.label}</p>
                <p className="text-xs opacity-70">{step.sub}</p>
              </div>
            )
          )}
        </div>
        <p className="text-xs text-slate-400 mt-3">
          O forecast ponderado (deal_value × probabilidade) é capturado como snapshot e enviado ao módulo EPM para atualização da linha de receita prevista no orçamento mensal.
        </p>
      </div>
    </div>
  );
}
