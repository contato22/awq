// ─── /advisor — Advisor · Overview ───────────────────────────────────────────
//
// SERVER COMPONENT — KPIs calculados em build time a partir do seed JSON.
// HTML gerado estaticamente já contém os dados sem depender de JS no browser.

import Link from "next/link";
import Header from "@/components/Header";
import { Briefcase, Users, DollarSign, TrendingUp, Star, ChevronRight } from "lucide-react";
import { advisorClients } from "@/lib/advisor-clients-data";

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return "R$" + (n / 1_000).toFixed(1) + "K";
  return "R$" + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdvisorPage() {
  const clients  = advisorClients;
  const ativos   = clients.filter((c) => c.status === "Ativo").length;
  const totalAum = clients.reduce((s, c) => s + (c.aum ?? 0), 0);
  const scored   = clients.filter((c) => c.nps != null);
  const avgNps   = scored.length > 0
    ? Math.round(scored.reduce((s, c) => s + (c.nps ?? 0), 0) / scored.length)
    : null;

  const kpis = [
    { label: "Clientes Ativos", value: String(ativos),                         icon: Users      },
    { label: "AUM Total",       value: totalAum > 0 ? fmtR(totalAum) : "—",   icon: DollarSign },
    { label: "Retorno Médio",   value: "—",                                    icon: TrendingUp },
    { label: "NPS Médio",       value: avgNps != null ? String(avgNps) : "—", icon: Star       },
  ];

  return (
    <>
      <Header title="Advisor" subtitle="Consultoria · AWQ Group" />
      <div className="page-container">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="card p-5 flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center shrink-0">
                <kpi.icon size={16} className="text-violet-700" />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{kpi.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Client list preview */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Briefcase size={14} className="text-violet-600" />
              Carteira de Clientes
            </h2>
            <Link
              href="/advisor/customers"
              className="text-xs text-violet-600 hover:text-violet-800 flex items-center gap-1 font-medium"
            >
              Ver todos <ChevronRight size={12} />
            </Link>
          </div>

          {clients.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">
              Nenhum cliente cadastrado.
            </div>
          ) : (
            <div className="space-y-2">
              {clients.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                  <div>
                    <div className="text-xs font-semibold text-gray-900">{c.name}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{c.tipo_servico || "—"}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {(c.aum ?? 0) > 0 && (
                      <span className="text-xs text-gray-500">{fmtR(c.aum)}</span>
                    )}
                    <span className={c.status === "Ativo" ? "badge badge-green" : "badge badge-yellow"}>
                      {c.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  );
}
