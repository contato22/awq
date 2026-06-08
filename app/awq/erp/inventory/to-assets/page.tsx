"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Building2, Loader2, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";

type Candidate = {
  sourceId: string;
  sku: string;
  code: string;
  description: string;
  category: string;
  inventoryCategory: string;
  acquisition_value: number;
  useful_life_months: number;
};

type Preview = {
  preview: true;
  candidates: Candidate[];
  skipped: { sku: string; reason: string }[];
  minValue: number;
};

const INPUT = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white";

export default function InventoryToAssetsPage() {
  const [minValue, setMinValue] = useState(1200);
  const [deactivateSource, setDeactivateSource] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ created: number; codes: string[]; skipped: { sku: string; reason: string }[] } | null>(null);

  const loadPreview = useCallback(async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/erp/inventory/to-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minValue, commit: false }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Erro ao carregar preview"); return; }
      setPreview(json);
      setSelected(new Set(json.candidates.map((c: Candidate) => c.sku)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado");
    } finally {
      setLoading(false);
    }
  }, [minValue]);

  useEffect(() => { loadPreview(); }, [loadPreview]);

  const toggle = (sku: string) => {
    setSelected(s => {
      const ns = new Set(s);
      if (ns.has(sku)) ns.delete(sku); else ns.add(sku);
      return ns;
    });
  };

  const commit = async () => {
    if (!preview) return;
    const skus = Array.from(selected);
    if (skus.length === 0) { setError("Selecione ao menos um item"); return; }
    setCommitting(true);
    setError("");
    try {
      const res = await fetch("/api/erp/inventory/to-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skus, minValue: 0, commit: true, deactivateSource }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Erro ao migrar"); return; }
      setResult(json);
      setPreview(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado");
    } finally {
      setCommitting(false);
    }
  };

  const selectedRows = preview?.candidates.filter(c => selected.has(c.sku)) ?? [];
  const totalSelected = selectedRows.reduce((s, c) => s + c.acquisition_value, 0);
  const monthlyDepreciation = selectedRows.reduce((s, c) => s + c.acquisition_value / c.useful_life_months, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3">
          <Link href="/awq/erp/inventory/items" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"><ArrowLeft size={16} /></Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Migrar Itens para Ativo Fixo</h1>
            <p className="text-xs text-gray-500">ERP · Estoque → Ativo Imobilizado (depreciação linear)</p>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6 space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-3">
            <Building2 className="text-brand-600 shrink-0 mt-0.5" size={20} />
            <div className="text-sm text-gray-700 space-y-1">
              <p className="font-semibold">Critério Receita Federal (IN SRF 162/98)</p>
              <p className="text-xs text-gray-500">
                Itens com valor de aquisição ≥ R$ 1.200 viram imobilizado e depreciam linearmente.
                Vida útil: <strong>câmeras, lentes, áudio, informática</strong> = 60 meses (5 anos) ·
                <strong> móveis e instalações</strong> = 120 meses (10 anos).
                Itens abaixo do limite vão direto para despesa e ficam só no inventário.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Valor mínimo (R$)</label>
              <input type="number" step="100" min="0" value={minValue}
                onChange={e => setMinValue(parseFloat(e.target.value) || 0)} className={INPUT} />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={deactivateSource} onChange={e => setDeactivateSource(e.target.checked)} />
                Desativar item no inventário após migrar
              </label>
            </div>
            <div className="flex items-end">
              <button onClick={loadPreview} disabled={loading}
                className="flex items-center gap-1.5 text-sm text-gray-700 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Recalcular preview
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {preview && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card label="Candidatos" value={String(preview.candidates.length)} />
              <Card label="Selecionados" value={String(selected.size)} />
              <Card label="Valor a Imobilizar" value={`R$ ${totalSelected.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} color="text-emerald-600" />
              <Card label="Deprec. Mensal" value={`R$ ${monthlyDepreciation.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} color="text-brand-600" />
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">Preview de migração</h2>
                <button onClick={commit} disabled={committing || selected.size === 0}
                  className="flex items-center gap-1.5 text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 shadow-sm">
                  {committing ? <Loader2 size={14} className="animate-spin" /> : <Building2 size={14} />}
                  Migrar {selected.size} itens
                </button>
              </div>
              <div className="overflow-x-auto max-h-[480px]">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 w-8">
                        <input type="checkbox"
                          checked={preview.candidates.length > 0 && selected.size === preview.candidates.length}
                          onChange={e => setSelected(e.target.checked ? new Set(preview.candidates.map(c => c.sku)) : new Set())} />
                      </th>
                      {["SKU", "Código Ativo", "Descrição", "Cat. Inv.", "Cat. Ativo", "Vida (m)", "Valor"].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.candidates.map(c => (
                      <tr key={c.sku} className={selected.has(c.sku) ? "bg-emerald-50/40" : "hover:bg-gray-50"}>
                        <td className="px-3 py-2"><input type="checkbox" checked={selected.has(c.sku)} onChange={() => toggle(c.sku)} /></td>
                        <td className="px-3 py-2 font-mono text-xs">{c.sku}</td>
                        <td className="px-3 py-2 font-mono text-xs text-brand-700">{c.code}</td>
                        <td className="px-3 py-2 text-gray-900 max-w-md truncate">{c.description}</td>
                        <td className="px-3 py-2 text-gray-600">{c.inventoryCategory}</td>
                        <td className="px-3 py-2 text-gray-600">{c.category}</td>
                        <td className="px-3 py-2 tabular-nums">{c.useful_life_months}</td>
                        <td className="px-3 py-2 tabular-nums">R$ {c.acquisition_value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {preview.skipped.length > 0 && (
              <details className="bg-white border border-gray-200 rounded-xl p-4 text-sm">
                <summary className="cursor-pointer font-semibold text-gray-700">{preview.skipped.length} itens não elegíveis (vão para despesa no DRE)</summary>
                <ul className="mt-3 space-y-0.5 text-xs text-gray-600 ml-4 list-disc">
                  {preview.skipped.map((s, i) => <li key={i}><code>{s.sku}</code>: {s.reason}</li>)}
                </ul>
              </details>
            )}
          </>
        )}

        {result && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-4 py-3 text-sm space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 size={16} /> {result.created} ativos criados em <code>erp_assets</code>
            </div>
            {result.codes.length > 0 && (
              <p className="text-xs">Códigos: {result.codes.slice(0, 12).map(c => <code key={c} className="mr-1">{c}</code>)} {result.codes.length > 12 && `… +${result.codes.length - 12}`}</p>
            )}
            <Link href="/awq/erp/assets" className="inline-flex items-center gap-1 text-brand-700 hover:underline">Ver Ativos Fixos →</Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ label, value, color = "text-gray-900" }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
