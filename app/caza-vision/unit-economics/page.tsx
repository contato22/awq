"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import EmptyState from "@/components/EmptyState";
import {
  DollarSign,
  TrendingUp,
  Users,
  Film,
  ArrowUpRight,
  Clapperboard,
  Database,
  CloudOff,
  AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjetoRow {
  id:         string;
  titulo:     string;
  diretor:    string;
  prazo:      string;
  valor:      number;
  alimentacao:number;
  gasolina:   number;
  despesas:   number;
  lucro:      number;
  status:     string;
  tipo?:      string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(1) + "K";
  return "R$" + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Data source abstraction ──────────────────────────────────────────────────

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/awq";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CazaUnitEconomicsPage() {
  const [projects, setProjects] = useState<ProjetoRow[]>([]);
  const [source, setSource]     = useState<"internal" | "static" | "empty" | "loading">("loading");

  useEffect(() => {
    async function load() {
      if (!IS_STATIC) {
        try {
          const res = await fetch("/api/caza/projects");
          if (res.ok) {
            const data = await res.json() as ProjetoRow[];
            if (Array.isArray(data) && data.length > 0) {
              setProjects(data); setSource("internal"); return;
            }
          }
        } catch { /* API unavailable — fall through */ }
      }

      try {
        const res = await fetch(`${BASE_PATH}/data/caza-properties.json`);
        if (res.ok) {
          const data = await res.json() as ProjetoRow[];
          setProjects(Array.isArray(data) ? data : []);
          setSource(Array.isArray(data) && data.length > 0 ? "static" : "empty");
          return;
        }
      } catch { /* ignore */ }
      setProjects([]); setSource("empty");
    }
    load();
  }, []);

  // ── Derived metrics ──────────────────────────────────────────────────────
  const totalProjetos = projects.length;
  const totalReceita  = projects.reduce((s, p) => s + p.valor, 0);
  const totalLucro    = projects.reduce((s, p) => s + (p.lucro ?? 0), 0);
  const avgTicket     = totalProjetos > 0 ? Math.round(totalReceita / totalProjetos) : 0;
  const avgMargem     = totalReceita > 0 ? ((totalLucro / totalReceita) * 100).toFixed(1) : "0.0";

  // By project type
  const typeMap = new Map<string, { projetos: number; receita: number; lucro: number }>();
  for (const p of projects) {
    const tipo = p.tipo || "Outros";
    const acc  = typeMap.get(tipo) ?? { projetos: 0, receita: 0, lucro: 0 };
    acc.projetos++;
    acc.receita += p.valor;
    acc.lucro   += p.lucro ?? 0;
    typeMap.set(tipo, acc);
  }
  const projectTypeRevenue = Array.from(typeMap.entries())
    .map(([type, d]) => ({
      type,
      projetos: d.projetos,
      receita:  d.receita,
      lucro:    d.lucro,
      avgValue: d.projetos > 0 ? Math.round(d.receita / d.projetos) : 0,
    }))
    .sort((a, b) => b.receita - a.receita);

  // By director
  const dirMap = new Map<string, { projetos: number; receita: number; despesas: number; lucro: number }>();
  for (const p of projects) {
    const dir = p.diretor || "Sem Responsável";
    const acc = dirMap.get(dir) ?? { projetos: 0, receita: 0, despesas: 0, lucro: 0 };
    acc.projetos++;
    acc.receita  += p.valor;
    acc.despesas += p.despesas ?? 0;
    acc.lucro    += p.lucro ?? 0;
    dirMap.set(dir, acc);
  }
  const directorEconomics = Array.from(dirMap.entries())
    .map(([name, d]) => ({
      name,
      projetos:    d.projetos,
      receita:     d.receita,
      despesas:    d.despesas,
      lucro:       d.lucro,
      ticketMedio: d.projetos > 0 ? Math.round(d.receita / d.projetos) : 0,
    }))
    .sort((a, b) => b.receita - a.receita);

  return (
    <>
      <Header
        title="Unit Economics — Caza Vision"
        subtitle="CAC · LTV · Margem por projeto e cliente · Rendimento por diretor"
      />
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
              <CloudOff size={11} /> Sem dados — importe do Notion ou crie projetos internamente
            </span>
          )}
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total de Projetos",   value: String(totalProjetos), color: "text-gray-900",    icon: Clapperboard },
            { label: "Receita Total",        value: fmtR(totalReceita),   color: "text-brand-600",   icon: DollarSign   },
            { label: "Ticket Médio",         value: fmtR(avgTicket),      color: "text-amber-700",   icon: TrendingUp   },
            { label: "Margem Média",         value: `${avgMargem}%`,      color: "text-emerald-600", icon: ArrowUpRight },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="card p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                  <Icon size={17} className={s.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5">{s.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {source === "loading" ? (
          <div className="flex items-center justify-center py-12 text-gray-400 text-sm gap-2">
            <AlertCircle size={16} /> Carregando…
          </div>
        ) : projects.length === 0 ? (
          <EmptyState compact title="Sem dados" description="Importe projetos do Notion via /caza-vision/import ou crie registros internamente." />
        ) : (
          <>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

              {/* Revenue by project type */}
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Receita por Tipo de Projeto</h2>
                <div className="space-y-4">
                  {projectTypeRevenue.map((t) => {
                    const pct = totalReceita > 0 ? (t.receita / totalReceita) * 100 : 0;
                    return (
                      <div key={t.type}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Film size={11} className="text-gray-500" />
                            <span className="text-xs text-gray-500">{t.type}</span>
                            <span className="text-[10px] text-gray-400">{t.projetos}p</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px]">
                            <span className="text-gray-500">ticket: {fmtR(t.avgValue)}</span>
                            <span className="text-gray-900 font-semibold">{fmtR(t.receita)}</span>
                            <span className="text-gray-500">{pct.toFixed(0)}%</span>
                          </div>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-xs text-gray-500">{totalProjetos} projetos · ticket médio</span>
                  <span className="text-xs font-bold text-gray-900">{fmtR(avgTicket)}</span>
                </div>
              </div>

              {/* Director economics */}
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Produção por Responsável</h2>
                {directorEconomics.length === 0 ? (
                  <EmptyState compact title="Sem dados" description="Nenhum responsável identificado." />
                ) : (
                  <div className="table-scroll">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Responsável</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Projetos</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Receita</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Lucro</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Ticket</th>
                        </tr>
                      </thead>
                      <tbody>
                        {directorEconomics.map((d) => {
                          const margin = d.receita > 0 ? ((d.lucro / d.receita) * 100).toFixed(0) : "0";
                          return (
                            <tr key={d.name} className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors">
                              <td className="py-2.5 px-3 text-xs font-medium text-gray-700">{d.name}</td>
                              <td className="py-2.5 px-3 text-right text-xs text-gray-500">{d.projetos}</td>
                              <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-900">{fmtR(d.receita)}</td>
                              <td className="py-2.5 px-3 text-right text-xs">
                                <span className="text-emerald-600 font-semibold">{fmtR(d.lucro)}</span>
                                <span className="text-[10px] text-gray-400 ml-1">{margin}%</span>
                              </td>
                              <td className="py-2.5 px-3 text-right text-xs text-gray-500">{fmtR(d.ticketMedio)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-gray-300">
                          <td className="py-2.5 px-3 text-xs font-bold text-gray-400">TOTAL</td>
                          <td className="py-2.5 px-3 text-right text-xs text-gray-400 font-bold">
                            {directorEconomics.reduce((s, d) => s + d.projetos, 0)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">
                            {fmtR(directorEconomics.reduce((s, d) => s + d.receita, 0))}
                          </td>
                          <td className="py-2.5 px-3 text-right text-xs font-bold text-emerald-600">
                            {fmtR(directorEconomics.reduce((s, d) => s + d.lucro, 0))}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Top projects by margin */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users size={14} className="text-brand-600" />
                <h2 className="text-sm font-semibold text-gray-900">Top Projetos por Margem</h2>
              </div>
              <div className="space-y-2">
                {[...projects]
                  .filter(p => p.valor > 0)
                  .sort((a, b) => {
                    const mA = a.valor > 0 ? (a.lucro ?? 0) / a.valor : 0;
                    const mB = b.valor > 0 ? (b.lucro ?? 0) / b.valor : 0;
                    return mB - mA;
                  })
                  .slice(0, 10)
                  .map((p) => {
                    const margin = p.valor > 0 ? ((p.lucro ?? 0) / p.valor) * 100 : 0;
                    return (
                      <div key={p.id} className="flex items-center gap-3">
                        <span className="text-[11px] text-gray-400 w-44 shrink-0 truncate">{p.titulo || "—"}</span>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${margin >= 60 ? "bg-emerald-500" : margin >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                            style={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }}
                          />
                        </div>
                        <span className={`text-[11px] font-bold w-10 text-right shrink-0 ${margin >= 60 ? "text-emerald-600" : margin >= 40 ? "text-amber-700" : "text-red-600"}`}>
                          {margin.toFixed(0)}%
                        </span>
                        <span className="text-[10px] text-gray-400 w-16 text-right shrink-0">{fmtR(p.lucro ?? 0)}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </>
        )}

      </div>
    </>
  );
}
