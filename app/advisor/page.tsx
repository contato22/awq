"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { Briefcase, Users, DollarSign, TrendingUp, Star, ChevronRight, Database, CloudOff } from "lucide-react";

// ─── /advisor — Advisor · Overview ───────────────────────────────────────────
//
// SOURCE: /data/advisor-clients.json (static) ou /api/advisor/clients (SSR)

interface AdvisorClientRow {
  id:           string;
  name:         string;
  segmento:     string;
  tipo_servico: string;
  aum:          number;
  fee_mensal:   number;
  status:       string;
  since:        string;
  nps:          number | null;
}

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n;
}

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/awq";

export default function AdvisorPage() {
  const [clients, setClients] = useState<AdvisorClientRow[]>([]);
  const [loaded, setLoaded]   = useState(false);

  useEffect(() => {
    async function load() {
      if (!IS_STATIC) {
        try {
          const res = await fetch("/api/advisor/clients");
          if (res.ok) {
            const data = await res.json() as AdvisorClientRow[];
            if (Array.isArray(data)) { setClients(data); setLoaded(true); return; }
          }
        } catch { /* fall through */ }
      }
      try {
        const res = await fetch(`${BASE_PATH}/data/advisor-clients.json`);
        if (res.ok) {
          const data = await res.json() as AdvisorClientRow[];
          setClients(Array.isArray(data) ? data : []);
        }
      } catch { /* ignore */ }
      setLoaded(true);
    }
    load();
  }, []);

  const ativos   = clients.filter((c) => c.status === "Ativo").length;
  const totalAum = clients.reduce((s, c) => s + c.aum, 0);
  const avgNps   = (() => {
    const scored = clients.filter((c) => c.nps != null);
    if (!scored.length) return null;
    return Math.round(scored.reduce((s, c) => s + (c.nps ?? 0), 0) / scored.length);
  })();

  const kpis = [
    { label: "Clientes Ativos", value: loaded ? String(ativos)                      : "…", icon: Users      },
    { label: "AUM Total",       value: loaded ? (totalAum > 0 ? fmtR(totalAum) : "—") : "…", icon: DollarSign },
    { label: "Retorno Médio",   value: "—",                                                   icon: TrendingUp },
    { label: "NPS Médio",       value: loaded ? (avgNps != null ? String(avgNps) : "—") : "…", icon: Star       },
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

          {!loaded ? (
            <div className="flex items-center gap-2 py-6 justify-center text-gray-400 text-xs">
              <Database size={13} /> Carregando…
            </div>
          ) : clients.length === 0 ? (
            <div className="flex items-center gap-2 py-6 justify-center text-amber-600 text-xs">
              <CloudOff size={13} /> Nenhum cliente cadastrado
            </div>
          ) : (
            <div className="space-y-2">
              {clients.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                  <div>
                    <div className="text-xs font-semibold text-gray-900">{c.name}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{c.tipo_servico || c.segmento || "—"}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {c.aum > 0 && (
                      <span className="text-xs text-gray-500">{fmtR(c.aum)}</span>
                    )}
                    <span className={
                      c.status === "Ativo"
                        ? "badge badge-green"
                        : "badge badge-yellow"
                    }>
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
