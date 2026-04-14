"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { fetchVentureSales, type VentureSalesData, type VentureSaleRow } from "@/lib/notion-fetch";
import {
  DollarSign,
  Users,
  TrendingUp,
  BarChart3,
  Database,
  CloudOff,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VentureSalesPage() {
  const [data, setData] = useState<VentureSalesData | null>(null);
  const [source, setSource] = useState<"live" | "mock" | "loading">("loading");

  useEffect(() => {
    fetchVentureSales().then((result) => {
      setData(result);
      // VENTURE_MOCK has empty rows array; if rows are present it came from real data
      setSource(result.rows.length > 0 ? "live" : "mock");
    });
  }, []);

  const totalIntegracao = data?.byCategoria["Integração"] ?? 0;
  const totalOM = data?.byCategoria["O&M"] ?? 0;
  const totalSeguro = data?.byCategoria["Seguro"] ?? 0;

  return (
    <>
      <Header
        title="Venture Sales"
        subtitle="Energdy — pipeline de vendas e deals fechados · Q1 2026"
      />

      <div className="page-container">
        {/* Data source badge */}
        <div className="flex items-center gap-2">
          {source === "loading" ? (
            <span className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse" />
              Carregando dados...
            </span>
          ) : source === "live" ? (
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold">
              <Database size={11} />
              Notion — dados ao vivo
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[11px] text-amber-600 font-medium">
              <CloudOff size={11} />
              Snapshot estático · venture-sales.json
            </span>
          )}
        </div>

        {/* KPI strip */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Deals Fechados", value: String(data.rows.length || data.byQuarter.Q1 ? "8" : "—"), icon: BarChart3, color: "text-brand-600", bg: "bg-brand-50" },
              { label: "Total Q1 Fechado", value: fmtR(data.totalFechado), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Total Leads", value: String(data.totalLeads), icon: Users, color: "text-amber-700", bg: "bg-amber-50" },
              { label: "Integração Solar", value: fmtR(totalIntegracao), icon: TrendingUp, color: "text-cyan-700", bg: "bg-cyan-50" },
            ].map((kpi) => (
              <div key={kpi.label} className="card p-5 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg ${kpi.bg} flex items-center justify-center shrink-0`}>
                  <kpi.icon size={16} className={kpi.color} />
                </div>
                <div>
                  <div className="text-xl font-bold text-gray-900 tabular-nums tracking-tight">
                    {kpi.value}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 font-medium">{kpi.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* By category */}
        {data && (
          <div className="card p-5">
            <div className="text-sm font-semibold text-gray-900 mb-4">Receita por Categoria</div>
            <div className="space-y-3">
              {[
                { label: "Integração Solar", value: totalIntegracao, color: "bg-brand-500" },
                { label: "O&M", value: totalOM, color: "bg-emerald-500" },
                { label: "Seguro", value: totalSeguro, color: "bg-amber-500" },
              ].map((cat) => {
                const total = totalIntegracao + totalOM + totalSeguro;
                const pct = total > 0 ? (cat.value / total) * 100 : 0;
                return (
                  <div key={cat.label}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-gray-600 font-medium">{cat.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">{pct.toFixed(1)}%</span>
                        <span className="font-semibold text-gray-900 tabular-nums">{fmtR(cat.value)}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${cat.color} rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* By canal */}
        {data && data.byCanal.length > 0 && (
          <div className="card p-5">
            <div className="text-sm font-semibold text-gray-900 mb-4">Pipeline por Canal</div>
            <div className="space-y-0">
              {data.byCanal.map((c: { canal: string; leads: number; valor: number; pct: number }) => (
                <div
                  key={c.canal}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div className="text-sm font-medium text-gray-700">{c.canal}</div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="text-xs text-gray-400">{c.leads} leads</div>
                    </div>
                    <div className="text-sm font-semibold text-gray-900 tabular-nums w-24 text-right">
                      {fmtR(c.valor)}
                    </div>
                    <div className="text-xs text-gray-400 w-8 text-right">{c.pct}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deals table */}
        {data && data.rows.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="text-sm font-semibold text-gray-900">Deals Fechados — Q1 2026</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">ID</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Nome</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Categoria</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Canal</th>
                    <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Valor</th>
                    <th className="text-right px-5 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row: VentureSaleRow) => (
                    <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-xs font-mono text-gray-400">{row.id}</td>
                      <td className="px-5 py-3 font-medium text-gray-800">{row.nome}</td>
                      <td className="px-5 py-3 text-gray-500">{row.categoria}</td>
                      <td className="px-5 py-3 text-gray-500">{row.canal}</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900 tabular-nums">{fmtR(row.valor)}</td>
                      <td className="px-5 py-3 text-right text-gray-400 text-xs">{fmtDate(row.data)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
