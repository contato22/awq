"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { projetos as mockProjetos } from "@/lib/caza-data";
import { fetchNotionData } from "@/lib/notion-fetch";
import { Film, CheckCircle2, Clock, Clapperboard, Database, CloudOff, AlertCircle, TrendingUp } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjetoRow {
  id: string;
  titulo: string;
  prioridade: string;
  diretor: string;
  prazo: string;
  recebimento: string;
  recebido: boolean;
  valor: number;
  alimentacao: number;
  gasolina: number;
  despesas: number;
  lucro: number;
  status: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n;
}

function fmtDate(d: string) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const prioridadeColor: Record<string, string> = {
  Alta:   "text-red-600",
  Média:  "text-amber-700",
  Baixa:  "text-emerald-600",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjetosPage() {
  const [rows, setRows] = useState<ProjetoRow[]>([]);
  const [source, setSource] = useState<"notion" | "mock" | "loading">("loading");
  const [notionError, setNotionError] = useState<string | null>(null);

  const mockFallback = mockProjetos.map((p) => ({
    id: p.id, titulo: p.titulo, prioridade: "", diretor: p.diretor,
    prazo: p.prazo, recebimento: "", recebido: p.status === "Entregue",
    valor: p.valor, alimentacao: 0, gasolina: 0, despesas: 0, lucro: p.valor, status: p.status,
  }));

  useEffect(() => {
    fetchNotionData("properties").then((json) => {
      if (json.source === "notion" && Array.isArray(json.data) && json.data.length > 0) {
        setRows(json.data as ProjetoRow[]);
        setSource("notion");
      } else {
        setRows(mockFallback);
        setSource("mock");
        setNotionError(json.error ?? null);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total         = rows.length;
  const emProducao    = rows.filter((p) => !p.recebido).length;
  const entregues     = rows.filter((p) => p.recebido).length;
  const totalValor    = rows.reduce((s, p) => s + p.valor, 0);
  const totalDespesas = rows.reduce((s, p) => s + (p.despesas ?? 0), 0);
  const totalLucro    = rows.reduce((s, p) => s + (p.lucro ?? p.valor), 0);

  return (
    <>
      <Header title="Projetos" subtitle="Carteira de projetos — Caza Vision" />
      <div className="px-8 py-6 space-y-6">

        {/* ── Source badge ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          {source === "loading" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 border border-gray-300 text-xs text-gray-500">
              <Database size={11} /> Conectando ao Notion…
            </span>
          )}
          {source === "notion" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-600">
              <Database size={11} /> Dados ao vivo — Notion
            </span>
          )}
          {source === "mock" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700"
              title={notionError ?? ""}>
              <CloudOff size={11} /> Dados de demonstração
              {notionError && <span className="text-[10px] text-gray-500 ml-1">({notionError})</span>}
            </span>
          )}
        </div>

        {/* ── Summary strip ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">
          {[
            { label: "Total Projetos",    value: total,         color: "text-slate-800",       fmt: String },
            { label: "Em Aberto",         value: emProducao,    color: "text-brand-600",   fmt: String },
            { label: "Recebidos",         value: entregues,     color: "text-emerald-600", fmt: String },
            { label: "Orçamento Total",   value: totalValor,    color: "text-emerald-600",       fmt: fmtR   },
            { label: "Despesas",          value: totalDespesas, color: "text-red-600",     fmt: fmtR   },
            { label: "Lucro Líquido",     value: totalLucro,    color: "text-emerald-600", fmt: fmtR   },
          ].map((s) => (
            <div key={s.label} className="card-elevated p-4 text-center">
              <div className={`text-3xl font-bold ${s.color}`}>{s.fmt(s.value)}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Margin Analytics ────────────────────────────────────────────── */}
        {rows.length > 0 && (
          <div className="card-elevated p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} className="text-emerald-600" />
              <h2 className="section-title">Análise de Margem por Projeto</h2>
            </div>
            <div className="space-y-2">
              {rows
                .filter((p) => p.valor > 0)
                .sort((a, b) => {
                  const mA = (a.lucro ?? a.valor) / a.valor;
                  const mB = (b.lucro ?? b.valor) / b.valor;
                  return mB - mA;
                })
                .map((p) => {
                  const lucro  = p.lucro ?? p.valor;
                  const margin = p.valor > 0 ? (lucro / p.valor) * 100 : 0;
                  return (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className="text-[11px] text-gray-500 w-44 shrink-0 truncate">{p.titulo || "—"}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${margin >= 60 ? "bg-gradient-to-r from-slate-700 to-slate-500" : margin >= 40 ? "bg-gradient-to-r from-slate-600 to-slate-400" : "bg-red-500"}`}
                          style={{ width: `${Math.min(margin, 100)}%` }}
                        />
                      </div>
                      <span className={`text-[11px] font-bold w-10 text-right shrink-0 ${margin >= 60 ? "text-blue-600" : margin >= 40 ? "text-[#C9A84C]" : "text-red-600"}`}>
                        {margin.toFixed(0)}%
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold w-16 text-right shrink-0">{fmtR(lucro)}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ── Projects table ──────────────────────────────────────────────── */}
        <div className="card-elevated p-5">
          <h2 className="section-title mb-4">Todos os Projetos</h2>
          {source === "loading" ? (
            <div className="flex items-center justify-center py-12 text-gray-500 text-sm gap-2">
              <AlertCircle size={16} /> Carregando…
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800">
                  <th className="text-left py-2 px-3 text-xs font-bold text-white">Projeto</th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-white">Prioridade</th>
                  <th className="text-right py-2 px-3 text-xs font-bold text-white">Orçamento</th>
                  <th className="text-right py-2 px-3 text-xs font-bold text-white">Alimentação</th>
                  <th className="text-right py-2 px-3 text-xs font-bold text-white">Gasolina</th>
                  <th className="text-right py-2 px-3 text-xs font-bold text-white">Lucro</th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-white">Responsável</th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-white">Competência</th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-white">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 even:bg-gray-50/60 hover:bg-gray-100 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 text-slate-800 font-medium text-xs">
                        <Clapperboard size={11} className="text-gray-500 shrink-0" />
                        {p.titulo || "—"}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-xs">
                      {p.prioridade ? (
                        <span className={`font-semibold ${prioridadeColor[p.prioridade] ?? "text-gray-500"}`}>
                          {p.prioridade}
                        </span>
                      ) : <span className="text-gray-500">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 font-bold text-xs">
                      {p.valor > 0 ? fmtR(p.valor) : <span className="text-gray-500">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right text-xs text-red-600">
                      {p.alimentacao > 0 ? fmtR(p.alimentacao) : <span className="text-gray-500">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right text-xs text-red-600">
                      {p.gasolina > 0 ? fmtR(p.gasolina) : <span className="text-gray-500">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right text-xs font-bold text-emerald-600">
                      {p.lucro > 0 ? fmtR(p.lucro) : <span className="text-gray-500">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-gray-500">
                      {p.diretor || <span className="text-gray-500">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-gray-500">{fmtDate(p.prazo)}</td>
                    <td className="py-2.5 px-3">
                      {p.recebido ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                          <CheckCircle2 size={9} /> Recebido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-600 border border-brand-200">
                          <Clock size={9} /> Em Aberto
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-300">
                  <td className="py-2.5 px-3 text-xs font-bold text-gray-500">TOTAL</td>
                  <td colSpan={2} />
                  <td className="py-2.5 px-3 text-right text-emerald-600 font-bold text-xs">{fmtR(totalValor)}</td>
                  <td className="py-2.5 px-3 text-right text-red-600 font-bold text-xs">{totalDespesas > 0 ? fmtR(totalDespesas) : "—"}</td>
                  <td className="py-2.5 px-3 text-right text-red-600 font-bold text-xs">—</td>
                  <td className="py-2.5 px-3 text-right text-emerald-600 font-bold text-xs">{fmtR(totalLucro)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
          )}
        </div>

      </div>
    </>
  );
}
