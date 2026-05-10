"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import { BarChart3, TrendingUp, ArrowLeft, CheckCircle2 } from "lucide-react";

interface Portco {
  portco_id: string;
  portco_code: string;
  legal_name: string;
  status: string;
}

interface KpiRow {
  kpi_id: string;
  portco_id: string;
  reporting_date: string;
  year_month?: string;
  mrr?: number;
  arr?: number;
  total_revenue?: number;
  gross_margin_pct?: number;
  burn_rate?: number;
  cash_balance?: number;
  runway_months?: number;
  mom_growth_pct?: number;
  headcount?: number;
  notes?: string;
}

function fmtR(n?: number | null) {
  if (n == null) return "—";
  if (Math.abs(n) >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (Math.abs(n) >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

export default function PortcoKpisPage() {
  const [portcos, setPortcos] = useState<Portco[]>([]);
  const [selectedPortco, setSelectedPortco] = useState<string>("");
  const [kpis, setKpis] = useState<KpiRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    reporting_date: new Date().toISOString().split("T")[0],
    mrr: "", total_revenue: "", gross_margin_pct: "",
    burn_rate: "", cash_balance: "",
    mom_growth_pct: "", headcount: "", notes: "",
  });

  useEffect(() => {
    fetch("/api/ma/portfolio")
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          const active = (j.data as Portco[]).filter(p => p.status === "active");
          setPortcos(active);
          if (active.length > 0) setSelectedPortco(active[0].portco_id);
        }
      });
  }, []);

  useEffect(() => {
    if (!selectedPortco) return;
    setLoading(true);
    fetch(`/api/ma/kpis?portco_id=${selectedPortco}`)
      .then(r => r.json())
      .then(j => { if (j.success) setKpis(j.data as KpiRow[]); })
      .finally(() => setLoading(false));
  }, [selectedPortco]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      const r = await fetch("/api/ma/kpis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert",
          portco_id: selectedPortco,
          reporting_date: form.reporting_date,
          mrr: form.mrr ? Number(form.mrr) : null,
          total_revenue: form.total_revenue ? Number(form.total_revenue) : null,
          gross_margin_pct: form.gross_margin_pct ? Number(form.gross_margin_pct) : null,
          burn_rate: form.burn_rate ? Number(form.burn_rate) : null,
          cash_balance: form.cash_balance ? Number(form.cash_balance) : null,
          mom_growth_pct: form.mom_growth_pct ? Number(form.mom_growth_pct) : null,
          headcount: form.headcount ? Number(form.headcount) : null,
          notes: form.notes || null,
        }),
      });
      const j = await r.json();
      if (j.success) {
        setSaved(true);
        // Reload KPIs
        const reload = await fetch(`/api/ma/kpis?portco_id=${selectedPortco}`);
        const rj = await reload.json();
        if (rj.success) setKpis(rj.data as KpiRow[]);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(j.error);
      }
    } catch (e) {
      setError(String(e));
    }
  };

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const inputCls = "w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <>
      <Header title="Atualizar KPIs" subtitle="Portcos — Relatório Mensal de Performance" />
      <div className="px-6 py-6 space-y-6">

        <div className="flex items-center gap-3">
          <Link href="/awq/portfolio" className="text-gray-400 hover:text-white">
            <ArrowLeft size={16} />
          </Link>
          <select
            value={selectedPortco}
            onChange={e => setSelectedPortco(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
          >
            {portcos.map(p => (
              <option key={p.portco_id} value={p.portco_id}>{p.legal_name}</option>
            ))}
          </select>
        </div>

        {/* KPI Entry Form */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
          <h2 className="font-semibold text-white mb-5 flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-400" />
            Inserir / Atualizar KPIs do Mês
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Data de Referência (fim de mês) *</label>
              <input type="date" required value={form.reporting_date}
                onChange={f("reporting_date")} className={inputCls} />
            </div>

            <div>
              <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Financeiro</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">MRR (R$)</label>
                  <input type="number" value={form.mrr} onChange={f("mrr")}
                    className={inputCls} placeholder="0" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Receita Total (R$)</label>
                  <input type="number" value={form.total_revenue} onChange={f("total_revenue")}
                    className={inputCls} placeholder="0" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Margem Bruta (%)</label>
                  <input type="number" step="0.1" value={form.gross_margin_pct} onChange={f("gross_margin_pct")}
                    className={inputCls} placeholder="0" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Burn Rate (R$, negativo)</label>
                  <input type="number" value={form.burn_rate} onChange={f("burn_rate")}
                    className={inputCls} placeholder="-20000" />
                  <p className="text-xs text-gray-600 mt-1">Use valor negativo se queimando caixa</p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Saldo de Caixa (R$)</label>
                  <input type="number" value={form.cash_balance} onChange={f("cash_balance")}
                    className={inputCls} placeholder="0" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Crescimento & Time</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Crescimento MoM (%)</label>
                  <input type="number" step="0.1" value={form.mom_growth_pct} onChange={f("mom_growth_pct")}
                    className={inputCls} placeholder="0" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Headcount</label>
                  <input type="number" value={form.headcount} onChange={f("headcount")}
                    className={inputCls} placeholder="0" />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">Notas / Highlights do Mês</label>
              <textarea value={form.notes} onChange={f("notes")} rows={3}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Principais eventos, conquistas ou desafios do mês..." />
            </div>

            {error && <div className="text-red-400 text-sm bg-red-500/10 rounded-lg px-4 py-3">{error}</div>}
            {saved && (
              <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 rounded-lg px-4 py-3">
                <CheckCircle2 size={16} /> KPIs salvos com sucesso!
              </div>
            )}

            <button type="submit"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
              <TrendingUp size={14} />
              Salvar KPIs
            </button>
          </form>
        </div>

        {/* KPI History */}
        <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-700">
            <h3 className="font-semibold text-white">Histórico de KPIs</h3>
          </div>
          {loading ? (
            <div className="px-5 py-8 text-center text-gray-500 text-sm">Carregando...</div>
          ) : kpis.length === 0 ? (
            <div className="px-5 py-8 text-center text-gray-500 text-sm">Nenhum KPI registrado ainda.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    {["Mês", "MRR", "ARR", "Burn Rate", "Caixa", "Runway", "MoM%", "Headcount", "Notas"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {kpis.map(k => (
                    <tr key={k.kpi_id} className="hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-sm font-medium text-white">{k.year_month ?? k.reporting_date.slice(0, 7)}</td>
                      <td className="px-4 py-3 text-sm text-green-400">{fmtR(k.mrr)}</td>
                      <td className="px-4 py-3 text-sm text-gray-400">{fmtR(k.arr)}</td>
                      <td className={`px-4 py-3 text-sm ${(k.burn_rate ?? 0) < 0 ? "text-red-400" : "text-green-400"}`}>
                        {fmtR(k.burn_rate)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{fmtR(k.cash_balance)}</td>
                      <td className={`px-4 py-3 text-sm font-medium ${(k.runway_months ?? 99) < 6 ? "text-red-400" : "text-gray-300"}`}>
                        {k.runway_months != null ? k.runway_months.toFixed(1) + "m" : "—"}
                      </td>
                      <td className={`px-4 py-3 text-sm ${(k.mom_growth_pct ?? 0) > 0 ? "text-green-400" : "text-red-400"}`}>
                        {k.mom_growth_pct != null ? (k.mom_growth_pct > 0 ? "+" : "") + k.mom_growth_pct.toFixed(1) + "%" : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-300">{k.headcount ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{k.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
