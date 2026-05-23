"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Link from "next/link";
import { SEED_PORTCOS, SEED_KPIS } from "@/lib/ma-seed-data";

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";
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
    if (IS_STATIC) {
      const active = SEED_PORTCOS.filter(p => p.status === "active") as Portco[];
      setPortcos(active);
      if (active.length > 0) setSelectedPortco(active[0].portco_id);
      return;
    }
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
    if (IS_STATIC) {
      setKpis(SEED_KPIS.filter(k => k.portco_id === selectedPortco) as KpiRow[]);
      setLoading(false);
      return;
    }
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
    if (IS_STATIC) {
      setError("Modo somente-leitura no GitHub Pages. Use a versão Vercel para salvar KPIs.");
      return;
    }
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

  const inputCls = "w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-400 transition-colors";
  const labelCls = "text-xs font-medium text-gray-600 mb-1.5 block";

  return (
    <>
      <Header title="Atualizar KPIs" subtitle="Portcos — Relatório Mensal de Performance" />
      <div className="px-6 py-6 space-y-5">

        <div className="flex items-center gap-3">
          <Link href="/awq/portfolio" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft size={14} /> Portfólio
          </Link>
          <span className="text-gray-300">/</span>
          <select
            value={selectedPortco}
            onChange={e => setSelectedPortco(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {portcos.map(p => (
              <option key={p.portco_id} value={p.portco_id}>{p.legal_name}</option>
            ))}
          </select>
        </div>

        {/* KPI Entry Form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-5 flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <BarChart3 size={14} className="text-blue-600" />
            </div>
            Inserir / Atualizar KPIs do Mês
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className={labelCls}>Data de Referência (fim de mês) *</label>
              <input type="date" required value={form.reporting_date}
                onChange={f("reporting_date")} className={inputCls} />
            </div>

            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Financeiro</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>MRR (R$)</label>
                  <input type="number" value={form.mrr} onChange={f("mrr")}
                    className={inputCls} placeholder="ex: 45000" />
                </div>
                <div>
                  <label className={labelCls}>Receita Total (R$)</label>
                  <input type="number" value={form.total_revenue} onChange={f("total_revenue")}
                    className={inputCls} placeholder="ex: 52000" />
                </div>
                <div>
                  <label className={labelCls}>Margem Bruta (%)</label>
                  <input type="number" step="0.1" value={form.gross_margin_pct} onChange={f("gross_margin_pct")}
                    className={inputCls} placeholder="ex: 68.5" />
                </div>
                <div>
                  <label className={labelCls}>Burn Rate (R$, negativo)</label>
                  <input type="number" value={form.burn_rate} onChange={f("burn_rate")}
                    className={inputCls} placeholder="ex: -15000" />
                  <p className="text-xs text-gray-400 mt-1">Use valor negativo se queimando caixa</p>
                </div>
                <div>
                  <label className={labelCls}>Saldo de Caixa (R$)</label>
                  <input type="number" value={form.cash_balance} onChange={f("cash_balance")}
                    className={inputCls} placeholder="ex: 280000" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Crescimento & Time</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={labelCls}>Crescimento MoM (%)</label>
                  <input type="number" step="0.1" value={form.mom_growth_pct} onChange={f("mom_growth_pct")}
                    className={inputCls} placeholder="ex: 8.5" />
                </div>
                <div>
                  <label className={labelCls}>Headcount</label>
                  <input type="number" value={form.headcount} onChange={f("headcount")}
                    className={inputCls} placeholder="ex: 12" />
                </div>
              </div>
            </div>

            <div>
              <label className={labelCls}>Notas / Highlights do Mês</label>
              <textarea value={form.notes} onChange={f("notes")} rows={3}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm resize-none placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-400 transition-colors"
                placeholder="Principais eventos, conquistas ou desafios do mês..." />
            </div>

            {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}
            {saved && (
              <div className="flex items-center gap-2 text-emerald-700 text-sm bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
                <CheckCircle2 size={16} /> KPIs salvos com sucesso!
              </div>
            )}

            <button type="submit"
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors">
              <TrendingUp size={14} />
              Salvar KPIs
            </button>
          </form>
        </div>

        {/* KPI History */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <BarChart3 size={14} className="text-gray-400" />
            <h3 className="font-bold text-gray-800 text-sm">Histórico de KPIs</h3>
          </div>
          {loading ? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">Carregando...</div>
          ) : kpis.length === 0 ? (
            <div className="px-5 py-12 text-center text-gray-400 text-sm">Nenhum KPI registrado ainda.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["Mês", "MRR", "ARR", "Burn Rate", "Caixa", "Runway", "MoM%", "Headcount", "Notas"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-gray-500 font-semibold uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {kpis.map(k => (
                    <tr key={k.kpi_id} className="hover:bg-blue-50/40">
                      <td className="px-4 py-3 font-bold text-gray-800">{k.year_month ?? k.reporting_date.slice(0, 7)}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-600">{fmtR(k.mrr)}</td>
                      <td className="px-4 py-3 text-gray-500">{fmtR(k.arr)}</td>
                      <td className={`px-4 py-3 font-semibold ${(k.burn_rate ?? 0) < 0 ? "text-red-500" : "text-emerald-600"}`}>
                        {fmtR(k.burn_rate)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{fmtR(k.cash_balance)}</td>
                      <td className={`px-4 py-3 font-bold ${(k.runway_months ?? 99) < 6 ? "text-red-500" : (k.runway_months ?? 99) < 12 ? "text-amber-600" : "text-gray-700"}`}>
                        {k.runway_months != null ? k.runway_months.toFixed(1) + "m" : "—"}
                      </td>
                      <td className={`px-4 py-3 font-semibold ${(k.mom_growth_pct ?? 0) > 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {k.mom_growth_pct != null ? (k.mom_growth_pct > 0 ? "+" : "") + k.mom_growth_pct.toFixed(1) + "%" : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{k.headcount ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-400 max-w-xs truncate">{k.notes ?? "—"}</td>
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
