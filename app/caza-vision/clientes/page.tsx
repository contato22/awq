"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { cazaClients } from "@/lib/caza-data";
import { Tag, TrendingUp, Users, Building2, Database, CloudOff, AlertCircle } from "lucide-react";

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

// ─── Config ───────────────────────────────────────────────────────────────────

const typeIcon: Record<string, React.ElementType> = {
  Marca:   Tag,
  Agência: Building2,
  Empresa: Building2,
  Startup: TrendingUp,
};

const typeColor: Record<string, string> = {
  Marca:   "text-brand-400",
  Agência: "text-emerald-400",
  Empresa: "text-amber-400",
  Startup: "text-violet-400",
};

const statusConfig: Record<string, string> = {
  "Ativo":        "badge badge-green",
  "Em Proposta":  "badge badge-yellow",
  "Convertido":   "badge badge-blue",
  "Perdido":      "bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-semibold px-2 py-0.5 rounded-full",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientesPage() {
  const [clients, setClients] = useState<ClienteRow[]>([]);
  const [source, setSource]   = useState<"notion" | "mock" | "loading">("loading");
  const [notionError, setNotionError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/notion?database=clients")
      .then((r) => r.json())
      .then((json) => {
        if (json.source === "notion" && Array.isArray(json.data) && json.data.length > 0) {
          setClients(json.data as ClienteRow[]);
          setSource("notion");
        } else {
          setClients(cazaClients as ClienteRow[]);
          setSource("mock");
          setNotionError(json.error ?? null);
        }
      })
      .catch(() => {
        setClients(cazaClients as ClienteRow[]);
        setSource("mock");
      });
  }, []);

  const total       = clients.length;
  const ativos      = clients.filter((c) => c.status === "Ativo" || c.status === "Em Proposta").length;
  const convertidos = clients.filter((c) => c.status === "Convertido").length;
  const perdidos    = clients.filter((c) => c.status === "Perdido").length;

  return (
    <>
      <Header title="Clientes" subtitle="Marcas, agências e empresas — Caza Vision" />
      <div className="px-8 py-6 space-y-6">

        {/* ── Source badge ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          {source === "loading" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-800 border border-gray-700 text-xs text-gray-400">
              <Database size={11} /> Conectando ao Notion…
            </span>
          )}
          {source === "notion" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
              <Database size={11} /> Dados ao vivo — Notion
            </span>
          )}
          {source === "mock" && (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400"
              title={notionError ?? ""}
            >
              <CloudOff size={11} /> Dados de demonstração
              {notionError && <span className="text-[10px] text-gray-500 ml-1">({notionError})</span>}
            </span>
          )}
        </div>

        {/* ── Summary strip ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total de Clientes",    value: total,       color: "text-white"       },
            { label: "Ativos / Em Proposta", value: ativos,      color: "text-emerald-400" },
            { label: "Convertidos",          value: convertidos, color: "text-brand-400"   },
            { label: "Perdidos",             value: perdidos,    color: "text-red-400"     },
          ].map((s) => (
            <div key={s.label} className="card p-4 text-center">
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Clients table ───────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Todos os Clientes</h2>
          {source === "loading" ? (
            <div className="flex items-center justify-center py-12 text-gray-600 text-sm gap-2">
              <AlertCircle size={16} /> Carregando…
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Cliente</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Perfil</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Budget Anual</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Segmento</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Desde</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const TypeIcon = typeIcon[c.type] ?? Users;
                  return (
                    <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="text-gray-300 font-medium text-xs">{c.name}</div>
                        <div className="text-[10px] text-gray-600 mt-0.5">{c.email}</div>
                        <div className="text-[10px] text-gray-600">{c.phone}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className={`flex items-center gap-1.5 text-xs ${typeColor[c.type] ?? "text-gray-400"}`}>
                          <TypeIcon size={12} />
                          {c.type}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right text-white font-semibold text-xs">
                        {c.budget_anual > 0 ? fmtR(c.budget_anual) : <span className="text-gray-600">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-gray-400">{c.segmento || "—"}</td>
                      <td className="py-2.5 px-3 text-[11px] text-gray-600">{c.since || "—"}</td>
                      <td className="py-2.5 px-3">
                        <span className={statusConfig[c.status] ?? "badge"}>{c.status}</span>
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
