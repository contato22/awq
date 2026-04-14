"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import EmptyState from "@/components/EmptyState";
import { Tag, TrendingUp, Users, Building2, Database, CloudOff, AlertCircle, BarChart3, DollarSign } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClienteRow {
  id:           string;
  name:         string;
  email:        string;
  phone:        string;
  type:         string;
  budget_anual: number;
  status:       string;
  segmento:     string;
  since:        string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n;
}

// ─── Data source abstraction ──────────────────────────────────────────────────

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/awq";

// ─── Config ───────────────────────────────────────────────────────────────────

const typeIcon: Record<string, React.ElementType> = {
  Marca:   Tag,
  Agência: Building2,
  Empresa: Building2,
  Startup: TrendingUp,
};

const typeColor: Record<string, string> = {
  Marca:   "text-brand-600",
  Agência: "text-emerald-600",
  Empresa: "text-amber-700",
  Startup: "text-violet-700",
};

const statusConfig: Record<string, string> = {
  "Ativo":        "badge badge-green",
  "Em Proposta":  "badge badge-yellow",
  "Convertido":   "badge badge-blue",
  "Perdido":      "bg-red-50 text-red-600 border border-red-200 text-[10px] font-semibold px-2 py-0.5 rounded-full",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientesPage() {
  const [clients, setClients] = useState<ClienteRow[]>([]);
  const [source, setSource]   = useState<"internal" | "static" | "empty" | "loading">("loading");

  useEffect(() => {
    async function load() {
      if (!IS_STATIC) {
        try {
          const res = await fetch("/api/caza/clients");
          if (res.ok) {
            const data = await res.json() as ClienteRow[];
            if (Array.isArray(data) && data.length > 0) {
              setClients(data); setSource("internal"); return;
            }
          }
        } catch { /* API unavailable — fall through */ }
      }

      try {
        const res = await fetch(`${BASE_PATH}/data/caza-clients.json`);
        if (res.ok) {
          const data = await res.json() as ClienteRow[];
          setClients(Array.isArray(data) ? data : []);
          setSource(Array.isArray(data) && data.length > 0 ? "static" : "empty");
          return;
        }
      } catch { /* ignore */ }
      setClients([]); setSource("empty");
    }
    load();
  }, []);

  const total        = clients.length;
  const ativos       = clients.filter((c: ClienteRow) => c.status === "Ativo" || c.status === "Em Proposta").length;
  const totalWallet  = clients.reduce((s: number, c: ClienteRow) => s + c.budget_anual, 0);
  const avgBudget    = total > 0 ? Math.round(totalWallet / total) : 0;
  const ativosWallet = clients.filter((c: ClienteRow) => c.status === "Ativo").reduce((s: number, c: ClienteRow) => s + c.budget_anual, 0);

  return (
    <>
      <Header title="Clientes" subtitle="Marcas, agências e empresas — Caza Vision" />
      <div className="page-container">

        {/* Source badge */}
        <div className="flex items-center gap-2">
          {source === "loading" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 border border-gray-200 text-xs text-gray-500">
              <Database size={11} /> Carregando…
            </span>
          )}
          {source === "internal" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-600">
              <Database size={11} /> Base interna AWQ
            </span>
          )}
          {source === "static" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs text-blue-600">
              <Database size={11} /> Snapshot estático
            </span>
          )}
          {source === "empty" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700">
              <CloudOff size={11} /> Sem clientes — importe do Notion ou crie internamente
            </span>
          )}
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total de Clientes",      value: String(total),       color: "text-gray-900",    icon: Users      },
            { label: "Ativos / Em Proposta",   value: String(ativos),      color: "text-emerald-600", icon: BarChart3  },
            { label: "Wallet Total (Ativos)",  value: fmtR(ativosWallet),  color: "text-brand-600",   icon: DollarSign },
            { label: "Budget Médio / Cliente", value: fmtR(avgBudget),     color: "text-amber-700",   icon: TrendingUp },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="card p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
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

        {/* Budget concentration */}
        {clients.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Concentração de Budget por Cliente</h2>
            <div className="space-y-2">
              {[...clients]
                .filter((c) => c.budget_anual > 0)
                .sort((a, b) => b.budget_anual - a.budget_anual)
                .map((c) => {
                  const share = totalWallet > 0 ? (c.budget_anual / totalWallet) * 100 : 0;
                  return (
                    <div key={c.id} className="flex items-center gap-3">
                      <span className="text-xs text-gray-400 w-32 shrink-0 truncate">{c.name}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${share}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-900 w-16 text-right shrink-0">{fmtR(c.budget_anual)}</span>
                      <span className="text-[10px] text-gray-400 w-10 text-right shrink-0">{share.toFixed(0)}%</span>
                      <span className={`${statusConfig[c.status] ?? "badge"} shrink-0`}>{c.status}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Clients table */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Todos os Clientes</h2>
          {source === "loading" ? (
            <div className="flex items-center justify-center py-12 text-gray-400 text-sm gap-2">
              <AlertCircle size={16} /> Carregando…
            </div>
          ) : clients.length === 0 ? (
            <EmptyState compact title="Nenhum cliente" description="Importe do Notion via /caza-vision/import ou crie um registro internamente." />
          ) : (
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Cliente</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Perfil</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Budget Anual</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Wallet %</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Segmento</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Desde</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c: ClienteRow) => {
                    const TypeIcon = typeIcon[c.type] ?? Users;
                    return (
                      <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="text-gray-700 font-medium text-xs">{c.name}</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">{c.email}</div>
                          <div className="text-[10px] text-gray-400">{c.phone}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className={`flex items-center gap-1.5 text-xs ${typeColor[c.type] ?? "text-gray-400"}`}>
                            <TypeIcon size={12} />
                            {c.type || "—"}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-900 font-semibold text-xs">
                          {c.budget_anual > 0 ? fmtR(c.budget_anual) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs">
                          {c.budget_anual > 0 && totalWallet > 0 ? (
                            <span className="text-brand-600 font-semibold">
                              {((c.budget_anual / totalWallet) * 100).toFixed(0)}%
                            </span>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="py-2.5 px-3 text-xs text-gray-500">{c.segmento || "—"}</td>
                        <td className="py-2.5 px-3 text-[11px] text-gray-400">{c.since || "—"}</td>
                        <td className="py-2.5 px-3">
                          <span className={statusConfig[c.status] ?? "badge"}>{c.status || "—"}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
