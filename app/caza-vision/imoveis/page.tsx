"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import EmptyState from "@/components/EmptyState";
import { Film, CheckCircle2, Clock, Clapperboard, Database, CloudOff, AlertCircle, TrendingUp, BarChart3 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProjetoRow {
  id: string;
  titulo: string;
  tipo: string;
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
  if (n >= 1_000)     return "R$" + (n / 1_000).toFixed(1) + "K";
  return "R$" + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtDate(d: string) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

// ─── Data source abstraction ──────────────────────────────────────────────────

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/awq";

const prioridadeColor: Record<string, string> = {
  Alta:  "text-red-600",
  Média: "text-amber-700",
  Baixa: "text-emerald-600",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjetosPage() {
  const [rows,   setRows]   = useState<ProjetoRow[]>([]);
  const [source, setSource] = useState<"internal" | "static" | "empty" | "loading">("loading");

  useEffect(() => {
    async function load() {
      if (!IS_STATIC) {
        try {
          const res = await fetch("/api/caza/projects");
          if (res.ok) {
            const data = await res.json() as ProjetoRow[];
            if (Array.isArray(data) && data.length > 0) {
              setRows(data); setSource("internal"); return;
            }
          }
        } catch { /* API unavailable — fall through */ }
      }

      try {
        const res = await fetch(`${BASE_PATH}/data/caza-properties.json`);
        if (res.ok) {
          const data = await res.json() as ProjetoRow[];
          setRows(Array.isArray(data) ? data : []);
          setSource(Array.isArray(data) && data.length > 0 ? "static" : "empty");
          return;
        }
      } catch { /* ignore */ }
      setRows([]); setSource("empty");
    }
    load();
  }, []);

  const total         = rows.length;
  const emAberto      = rows.filter(p => !p.recebido).length;
  const entregues     = rows.filter(p => p.recebido).length;
  const totalValor    = rows.reduce((s, p) => s + p.valor, 0);
  const totalDespesas = rows.reduce((s, p) => s + (p.despesas ?? 0), 0);
  const totalLucro    = rows.reduce((s, p) => s + (p.lucro ?? p.valor), 0);
  const taxaEntrega   = total > 0 ? ((entregues / total) * 100).toFixed(0) : "0";
  const ticketMedio   = total > 0 ? Math.round(totalValor / total) : 0;

  // Por tipo
  const tipoMap = new Map<string, { count: number; receita: number }>();
  for (const p of rows) {
    const tipo = p.tipo || "Outros";
    const acc  = tipoMap.get(tipo) ?? { count: 0, receita: 0 };
    acc.count++;
    acc.receita += p.valor;
    tipoMap.set(tipo, acc);
  }
  const tipoStats = Array.from(tipoMap.entries())
    .map(([tipo, d]) => ({ tipo, ...d }))
    .sort((a, b) => b.receita - a.receita);

  // Por status
  const statusMap = new Map<string, number>();
  for (const p of rows) {
    const s = p.status || "Em Produção";
    statusMap.set(s, (statusMap.get(s) ?? 0) + 1);
  }
  const statusStats = Array.from(statusMap.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <>
      <Header title="Projetos" subtitle="Carteira de projetos — Caza Vision" />
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
              <CloudOff size={11} /> Sem projetos — importe do Notion ou crie internamente
            </span>
          )}
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
          {[
            { label: "Total Projetos",  value: total,                    color: "text-gray-900",    fmt: String },
            { label: "Em Aberto",       value: emAberto,                 color: "text-brand-600",   fmt: String },
            { label: "Recebidos",       value: entregues,                color: "text-emerald-600", fmt: String },
            { label: "Taxa Entrega",    value: taxaEntrega + "%",        color: "text-violet-600",  fmt: (v: string) => v },
            { label: "Orçamento Total", value: totalValor,               color: "text-gray-900",    fmt: fmtR   },
            { label: "Despesas",        value: totalDespesas,            color: "text-red-600",     fmt: fmtR   },
            { label: "Lucro Líquido",   value: totalLucro,               color: "text-emerald-600", fmt: fmtR   },
            { label: "Ticket Médio",    value: ticketMedio,              color: "text-amber-700",   fmt: fmtR   },
          ].map((s) => (
            <div key={s.label} className="card p-4 text-center">
              <div className={`text-2xl font-bold ${s.color} tabular-nums`}>{s.fmt(s.value as never)}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tipo + Status distribution */}
        {rows.length > 0 && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Film size={14} className="text-brand-600" />
                <h2 className="text-sm font-semibold text-gray-900">Projetos por Tipo</h2>
              </div>
              <div className="space-y-2">
                {tipoStats.map((t) => {
                  const pct = totalValor > 0 ? Math.round((t.receita / totalValor) * 100) : 0;
                  return (
                    <div key={t.tipo} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-40 shrink-0 truncate">{t.tipo}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-500 rounded-full" style={{ width: `${Math.max(pct, 2)}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-900 w-6 text-right shrink-0 tabular-nums">{t.count}</span>
                      <span className="text-[11px] text-gray-400 w-16 text-right shrink-0">{fmtR(t.receita)}</span>
                      <span className="text-[10px] text-gray-400 w-8 text-right shrink-0">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={14} className="text-emerald-600" />
                <h2 className="text-sm font-semibold text-gray-900">Distribuição por Status</h2>
              </div>
              <div className="space-y-2">
                {statusStats.map((s) => {
                  const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                  const color = s.status === "Entregue" ? "bg-emerald-500"
                    : s.status === "Em Produção" ? "bg-brand-500"
                    : s.status === "Em Edição" ? "bg-amber-500"
                    : "bg-violet-500";
                  return (
                    <div key={s.status} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-40 shrink-0">{s.status}</span>
                      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-900 w-6 text-right shrink-0 tabular-nums">{s.count}</span>
                      <span className="text-[10px] text-gray-400 w-8 text-right shrink-0">{pct}%</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between text-xs text-gray-400">
                <span>{total} projetos total</span>
                <span className="font-semibold text-emerald-600">{taxaEntrega}% entregues</span>
              </div>
            </div>
          </div>
        )}

        {/* Margin analytics */}
        {rows.length > 0 && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={14} className="text-emerald-600" />
              <h2 className="text-sm font-semibold text-gray-900">Análise de Margem por Projeto</h2>
            </div>
            <div className="space-y-2">
              {rows.filter(p => p.valor > 0)
                .sort((a, b) => (b.lucro ?? b.valor) / b.valor - (a.lucro ?? a.valor) / a.valor)
                .map((p) => {
                  const lucro  = p.lucro ?? p.valor;
                  const margin = p.valor > 0 ? (lucro / p.valor) * 100 : 0;
                  return (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className="text-[11px] text-gray-400 w-44 shrink-0 truncate">{p.titulo || "—"}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${margin >= 60 ? "bg-emerald-500" : margin >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${Math.min(margin, 100)}%` }} />
                      </div>
                      <span className={`text-[11px] font-bold w-10 text-right shrink-0 ${margin >= 60 ? "text-emerald-600" : margin >= 40 ? "text-amber-700" : "text-red-600"}`}>
                        {margin.toFixed(0)}%
                      </span>
                      <span className="text-[10px] text-gray-400 w-16 text-right shrink-0">{fmtR(lucro)}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Projects table */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Todos os Projetos</h2>
          {source === "loading" ? (
            <div className="flex items-center justify-center py-12 text-gray-400 text-sm gap-2">
              <AlertCircle size={16} /> Carregando…
            </div>
          ) : rows.length === 0 ? (
            <EmptyState compact title="Nenhum projeto" description="Importe do Notion via /caza-vision/import ou crie um registro internamente." />
          ) : (
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Projeto</th>
                    <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Tipo</th>
                    <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Prioridade</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Orçamento</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Alimentação</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Gasolina</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Lucro</th>
                    <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Responsável</th>
                    <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Competência</th>
                    <th className="text-left  py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 text-gray-700 font-medium text-xs">
                          <Clapperboard size={11} className="text-gray-400 shrink-0" />
                          {p.titulo || "—"}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-gray-500">{p.tipo || <span className="text-gray-400">—</span>}</td>
                      <td className="py-2.5 px-3 text-xs">
                        {p.prioridade
                          ? <span className={`font-semibold ${prioridadeColor[p.prioridade] ?? "text-gray-400"}`}>{p.prioridade}</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-gray-900 font-semibold text-xs">
                        {p.valor > 0 ? fmtR(p.valor) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs text-red-600">
                        {p.alimentacao > 0 ? fmtR(p.alimentacao) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs text-red-600">
                        {p.gasolina > 0 ? fmtR(p.gasolina) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs font-semibold text-emerald-600">
                        {p.lucro > 0 ? fmtR(p.lucro) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-gray-500">{p.diretor || <span className="text-gray-400">—</span>}</td>
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
                    <td className="py-2.5 px-3 text-xs font-bold text-gray-400">TOTAL</td>
                    <td /><td />
                    <td className="py-2.5 px-3 text-right text-gray-900 font-bold text-xs">{fmtR(totalValor)}</td>
                    <td className="py-2.5 px-3 text-right text-red-600 font-bold text-xs">{totalDespesas > 0 ? fmtR(totalDespesas) : "—"}</td>
                    <td />
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
