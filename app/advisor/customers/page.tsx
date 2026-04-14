// ─── /advisor/customers — Advisor · Carteira de Clientes ─────────────────────
//
// SERVER COMPONENT — dados embutidos em build time via import estático.
// No export estático (GitHub Pages) o HTML já contém AVVA sem depender de JS.
// No SSR (Vercel) o componente re-renderiza a cada request com dados do DB.
//
// FONTE AUTORITATIVA: public/data/advisor-clients.json  (seed / fallback)
//                     /api/advisor/clients               (Neon Postgres — SSR only)

import Header from "@/components/Header";
import { Users, DollarSign, Star, BarChart3, Database } from "lucide-react";
import { advisorClients } from "@/lib/advisor-clients-data";
import type { AdvisorClientSeed as AdvisorClientRow } from "@/lib/advisor-clients-data";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n;
}

const statusBadge: Record<string, string> = {
  "Ativo":         "badge badge-green",
  "Em Negociação": "badge badge-yellow",
  "Pausado":       "badge badge-yellow",
  "Encerrado":     "bg-red-50 text-red-600 border border-red-200 text-[10px] font-semibold px-2 py-0.5 rounded-full",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdvisorCustomersPage() {
  const clients = advisorClients;

  const ativos   = clients.filter((c) => c.status === "Ativo").length;
  const totalAum = clients.reduce((s, c) => s + (c.aum ?? 0), 0);
  const scored   = clients.filter((c) => c.nps != null);
  const avgNps   = scored.length > 0
    ? Math.round(scored.reduce((s, c) => s + (c.nps ?? 0), 0) / scored.length)
    : null;

  return (
    <>
      <Header title="Customers — Advisor" subtitle="Consultoria · AWQ Group" />
      <div className="page-container">

        {/* Source badge */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 border border-violet-200 text-xs text-violet-600">
            <Database size={11} /> Carteira Advisor
          </span>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Clientes Ativos",  value: String(ativos),                         color: "text-violet-600", icon: Users      },
            { label: "Total Carteira",   value: String(clients.length),                 color: "text-gray-900",   icon: BarChart3  },
            { label: "AUM Total",        value: totalAum > 0 ? fmtR(totalAum) : "—",   color: "text-violet-600", icon: DollarSign },
            { label: "NPS Médio",        value: avgNps != null ? String(avgNps) : "—", color: "text-amber-600",  icon: Star       },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="card p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                  <Icon size={15} className={s.color} />
                </div>
                <div>
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Clients table */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Carteira de Clientes</h2>

          {clients.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">
              Nenhum cliente cadastrado.
            </div>
          ) : (
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Cliente</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Serviço</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Segmento</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">AUM</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Fee Mensal</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">NPS</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Responsável</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Desde</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="text-gray-700 font-semibold text-xs">{c.name}</div>
                        {c.contato_email && <div className="text-[10px] text-gray-400 mt-0.5">{c.contato_email}</div>}
                        {c.contato_phone && <div className="text-[10px] text-gray-400">{c.contato_phone}</div>}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-gray-500">{c.tipo_servico || "—"}</td>
                      <td className="py-2.5 px-3 text-xs text-gray-500">{c.segmento || "—"}</td>
                      <td className="py-2.5 px-3 text-right text-xs">
                        {(c.aum ?? 0) > 0
                          ? <span className="text-gray-900 font-semibold">{fmtR(c.aum)}</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs">
                        {(c.fee_mensal ?? 0) > 0
                          ? <span className="text-violet-600 font-semibold">{fmtR(c.fee_mensal)}</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs">
                        {c.nps != null
                          ? <span className="text-amber-600 font-semibold">{c.nps}</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-gray-500">{c.responsavel || "—"}</td>
                      <td className="py-2.5 px-3 text-[11px] text-gray-400">{c.since || "—"}</td>
                      <td className="py-2.5 px-3">
                        <span className={statusBadge[c.status] ?? "badge"}>{c.status || "—"}</span>
                      </td>
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
