"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { projetos as mockProjetos } from "@/lib/caza-data";
import { fetchNotionData } from "@/lib/notion-fetch";
import {
  DollarSign,
  TrendingUp,
  Users,
  Clapperboard,
  ArrowUpRight,
  Database,
  CloudOff,
  AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjetoRow {
  id: string;
  titulo: string;
  prioridade: string;
  diretor: string;
  prazo: string;
  recebido: boolean;
  valor: number;
  alimentacao: number;
  gasolina: number;
  despesas: number;
  lucro: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000)     return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CazaUnitEconomicsPage() {
  const [rows, setRows]   = useState<ProjetoRow[]>([]);
  const [source, setSource] = useState<"notion" | "mock" | "loading">("loading");

  useEffect(() => {
    fetchNotionData("properties").then((json) => {
      if (json.source === "notion" && Array.isArray(json.data) && json.data.length > 0) {
        setRows(json.data as ProjetoRow[]);
        setSource("notion");
      } else {
        setRows(
          mockProjetos.map((p) => ({
            id: p.id, titulo: p.titulo, prioridade: "", diretor: p.diretor,
            prazo: p.prazo, recebido: p.status === "Entregue",
            valor: p.valor, alimentacao: 0, gasolina: 0,
            despesas: 0, lucro: p.valor,
          }))
        );
        setSource("mock");
      }
    });
  }, []);

  // ── Aggregate metrics from real data ─────────────────────────────────────
  const totalProjetos  = rows.length;
  const totalReceita   = rows.reduce((s, r) => s + r.valor,    0);
  const totalDespesas  = rows.reduce((s, r) => s + r.despesas, 0);
  const totalLucro     = rows.reduce((s, r) => s + r.lucro,    0);
  const ticketMedio    = totalProjetos > 0 ? Math.round(totalReceita   / totalProjetos) : 0;
  const margemBruta    = totalReceita  > 0 ? (totalLucro / totalReceita) * 100 : 0;

  // ── Director Economics — grouped from real data ───────────────────────────
  const diretorMap = new Map<string, { projetos: number; receita: number; despesas: number; lucro: number }>();
  for (const r of rows) {
    const key = r.diretor || "Sem responsável";
    const acc = diretorMap.get(key) ?? { projetos: 0, receita: 0, despesas: 0, lucro: 0 };
    acc.projetos++;
    acc.receita  += r.valor;
    acc.despesas += r.despesas;
    acc.lucro    += r.lucro;
    diretorMap.set(key, acc);
  }
  const directorEconomics = Array.from(diretorMap.entries())
    .map(([name, d]) => ({
      name,
      projetos:    d.projetos,
      receita:     d.receita,
      despesas:    d.despesas,
      lucro:       d.lucro,
      ticketMedio: d.projetos > 0 ? Math.round(d.receita / d.projetos) : 0,
    }))
    .sort((a, b) => b.receita - a.receita);

  // ── Priority split (as proxy for project mix) ─────────────────────────────
  const prioMap = new Map<string, { projetos: number; receita: number; lucro: number }>();
  for (const r of rows) {
    const key = r.prioridade || "Não definida";
    const acc = prioMap.get(key) ?? { projetos: 0, receita: 0, lucro: 0 };
    acc.projetos++;
    acc.receita += r.valor;
    acc.lucro   += r.lucro;
    prioMap.set(key, acc);
  }
  const prioSplit = Array.from(prioMap.entries())
    .map(([label, d]) => ({ label, ...d, avgValue: d.projetos > 0 ? Math.round(d.receita / d.projetos) : 0 }))
    .sort((a, b) => b.receita - a.receita);

  // ── KPI cards derived from real data ─────────────────────────────────────
  const metricCards = [
    {
      label: "Total Projetos",
      value: String(totalProjetos),
      sub:   `${rows.filter((r) => r.recebido).length} recebidos · ${rows.filter((r) => !r.recebido).length} em aberto`,
      icon:  Users,
      color: "text-brand-600",
      bg:    "bg-brand-50",
      delta: "",
      up:    true,
    },
    {
      label: "Receita Total",
      value: fmtR(totalReceita),
      sub:   `Despesas: ${fmtR(totalDespesas)}`,
      icon:  DollarSign,
      color: "text-emerald-600",
      bg:    "bg-emerald-50",
      delta: "",
      up:    true,
    },
    {
      label: "Ticket Médio",
      value: fmtR(ticketMedio),
      sub:   "Orçamento por projeto",
      icon:  Clapperboard,
      color: "text-violet-700",
      bg:    "bg-violet-50",
      delta: "",
      up:    true,
    },
    {
      label: "Margem Bruta",
      value: margemBruta.toFixed(1) + "%",
      sub:   `Lucro: ${fmtR(totalLucro)}`,
      icon:  TrendingUp,
      color: "text-amber-700",
      bg:    "bg-amber-50",
      delta: "",
      up:    margemBruta >= 50,
    },
  ];

  return (
    <>
      <Header
        title="Unit Economics — Caza Vision"
        subtitle="Ticket médio · Margem · Produção por responsável"
      />
      <div className="px-8 py-6 space-y-6">

        {/* ── Source badge ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          {source === "loading" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 border border-gray-300 text-xs text-gray-400">
              <Database size={11} /> Conectando ao Notion…
            </span>
          )}
          {source === "notion" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-600">
              <Database size={11} /> Dados ao vivo — Notion
            </span>
          )}
          {source === "mock" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700">
              <CloudOff size={11} /> Dados de demonstração
            </span>
          )}
        </div>

        {/* ── Metric Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {metricCards.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="card p-5 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl ${m.bg} flex items-center justify-center shrink-0`}>
                  <Icon size={18} className={m.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-2xl font-bold text-gray-900">{m.value}</div>
                  <div className="text-xs font-medium text-gray-400 mt-0.5">{m.label}</div>
                  {m.sub && (
                    <div className="flex items-center gap-1 mt-1">
                      {m.delta && (
                        m.up
                          ? <ArrowUpRight size={11} className="text-emerald-600" />
                          : null
                      )}
                      <span className="text-[10px] text-gray-400">{m.sub}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {source === "loading" ? (
          <div className="flex items-center justify-center py-12 text-gray-400 text-sm gap-2">
            <AlertCircle size={16} /> Carregando…
          </div>
        ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* ── Priority / Mix Breakdown ────────────────────────────────────── */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Distribuição por Prioridade</h2>
            <div className="space-y-4">
              {prioSplit.map((t) => {
                const share = totalReceita > 0 ? (t.receita / totalReceita) * 100 : 0;
                return (
                  <div key={t.label}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Clapperboard size={11} className="text-gray-500" />
                        <span className="text-xs text-gray-400">{t.label}</span>
                        <span className="text-[10px] text-gray-400">{t.projetos}p</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]">
                        <span className="text-gray-500">ticket: {fmtR(t.avgValue)}</span>
                        <span className="text-gray-900 font-semibold">{fmtR(t.receita)}</span>
                        <span className="text-gray-500">{share.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-500">{totalProjetos} projetos · ticket médio</span>
              <span className="text-xs font-bold text-gray-900">{fmtR(ticketMedio)}</span>
            </div>
          </div>

          {/* ── Director Economics ──────────────────────────────────────────── */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Produção por Responsável</h2>
            {directorEconomics.length === 0 ? (
              <div className="text-xs text-gray-400 text-center py-8">
                Nenhum responsável encontrado nos projetos.
              </div>
            ) : (
            <div className="overflow-x-auto">
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
                      <tr key={d.name} className="border-b border-gray-100 hover:bg-gray-100 transition-colors">
                        <td className="py-2.5 px-3 text-xs font-medium text-gray-400">{d.name}</td>
                        <td className="py-2.5 px-3 text-right text-xs text-gray-400">{d.projetos}</td>
                        <td className="py-2.5 px-3 text-right text-xs font-semibold text-gray-900">{fmtR(d.receita)}</td>
                        <td className="py-2.5 px-3 text-right text-xs">
                          <span className="text-emerald-600 font-semibold">{fmtR(d.lucro)}</span>
                          <span className="text-[10px] text-gray-400 ml-1">{margin}%</span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-xs text-gray-400">{fmtR(d.ticketMedio)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-300">
                    <td className="py-2.5 px-3 text-xs font-bold text-gray-400">TOTAL</td>
                    <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-400">{totalProjetos}</td>
                    <td className="py-2.5 px-3 text-right text-xs font-bold text-gray-900">{fmtR(totalReceita)}</td>
                    <td className="py-2.5 px-3 text-right text-xs font-bold text-emerald-600">{fmtR(totalLucro)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            )}
          </div>
        </div>
        )}

        {/* ── Margin Analytics ─────────────────────────────────────────────── */}
        {rows.length > 0 && (
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Margem por Projeto</h2>
            <div className="space-y-2">
              {[...rows]
                .filter((r) => r.valor > 0)
                .sort((a, b) => {
                  const mA = a.lucro / a.valor;
                  const mB = b.lucro / b.valor;
                  return mB - mA;
                })
                .map((r) => {
                  const margin = (r.lucro / r.valor) * 100;
                  return (
                    <div key={r.id} className="flex items-center gap-3">
                      <span className="text-[11px] text-gray-400 w-44 shrink-0 truncate">{r.titulo || "—"}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${margin >= 60 ? "bg-emerald-500" : margin >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${Math.min(margin, 100)}%` }}
                        />
                      </div>
                      <span className={`text-[11px] font-bold w-10 text-right shrink-0 ${margin >= 60 ? "text-emerald-600" : margin >= 40 ? "text-amber-700" : "text-red-600"}`}>
                        {margin.toFixed(0)}%
                      </span>
                      <span className="text-[10px] text-gray-400 w-16 text-right shrink-0">{fmtR(r.lucro)}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

      </div>
    </>
  );
}
