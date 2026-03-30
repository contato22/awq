"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import { projetos as mockProjetos } from "@/lib/caza-data";
import { Film, CheckCircle2, Clock, Clapperboard, Database, CloudOff, AlertCircle } from "lucide-react";

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
  Alta:   "text-red-400",
  Média:  "text-amber-400",
  Baixa:  "text-emerald-400",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjetosPage() {
  const [rows, setRows] = useState<ProjetoRow[]>([]);
  const [source, setSource] = useState<"notion" | "mock" | "loading">("loading");
  const [notionError, setNotionError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/notion?database=properties")
      .then((r) => r.json())
      .then((json) => {
        if (json.source === "notion" && Array.isArray(json.data) && json.data.length > 0) {
          setRows(json.data as ProjetoRow[]);
          setSource("notion");
        } else {
          // Fallback: convert mock data to ProjetoRow shape
          setRows(mockProjetos.map((p) => ({
            id:          p.id,
            titulo:      p.titulo,
            prioridade:  "",
            diretor:     p.diretor,
            prazo:       p.prazo,
            recebimento: "",
            recebido:    p.status === "Entregue",
            valor:       p.valor,
            alimentacao: 0,
            gasolina:    0,
            despesas:    0,
            lucro:       p.valor,
            status:      p.status,
          })));
          setSource("mock");
          setNotionError(json.error ?? null);
        }
      })
      .catch(() => {
        setRows(mockProjetos.map((p) => ({
          id: p.id, titulo: p.titulo, prioridade: "", diretor: p.diretor,
          prazo: p.prazo, recebimento: "", recebido: p.status === "Entregue",
          valor: p.valor, alimentacao: 0, gasolina: 0, despesas: 0, lucro: p.valor, status: p.status,
        })));
        setSource("mock");
      });
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
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400"
              title={notionError ?? ""}>
              <CloudOff size={11} /> Dados de demonstração
              {notionError && <span className="text-[10px] text-gray-500 ml-1">({notionError})</span>}
            </span>
          )}
        </div>

        {/* ── Summary strip ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">
          {[
            { label: "Total Projetos",    value: total,         color: "text-white",       fmt: String },
            { label: "Em Aberto",         value: emProducao,    color: "text-brand-400",   fmt: String },
            { label: "Recebidos",         value: entregues,     color: "text-emerald-400", fmt: String },
            { label: "Orçamento Total",   value: totalValor,    color: "text-white",       fmt: fmtR   },
            { label: "Despesas",          value: totalDespesas, color: "text-red-400",     fmt: fmtR   },
            { label: "Lucro Líquido",     value: totalLucro,    color: "text-emerald-400", fmt: fmtR   },
          ].map((s) => (
            <div key={s.label} className="card p-4 text-center">
              <div className={`text-3xl font-bold ${s.color}`}>{s.fmt(s.value)}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Projects table ──────────────────────────────────────────────── */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Todos os Projetos</h2>
          {source === "loading" ? (
            <div className="flex items-center justify-center py-12 text-gray-600 text-sm gap-2">
              <AlertCircle size={16} /> Carregando…
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Projeto</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Prioridade</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Orçamento</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Alimentação</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Gasolina</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Lucro</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Responsável</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Competência</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5 text-gray-300 font-medium text-xs">
                        <Clapperboard size={11} className="text-gray-600 shrink-0" />
                        {p.titulo || "—"}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-xs">
                      {p.prioridade ? (
                        <span className={`font-semibold ${prioridadeColor[p.prioridade] ?? "text-gray-400"}`}>
                          {p.prioridade}
                        </span>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right text-white font-semibold text-xs">
                      {p.valor > 0 ? fmtR(p.valor) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right text-xs text-red-400">
                      {p.alimentacao > 0 ? fmtR(p.alimentacao) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right text-xs text-red-400">
                      {p.gasolina > 0 ? fmtR(p.gasolina) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right text-xs font-semibold text-emerald-400">
                      {p.lucro > 0 ? fmtR(p.lucro) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-gray-400">
                      {p.diretor || <span className="text-gray-600">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-gray-400">{fmtDate(p.prazo)}</td>
                    <td className="py-2.5 px-3">
                      {p.recebido ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 size={9} /> Recebido
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-500/10 text-brand-400 border border-brand-500/20">
                          <Clock size={9} /> Em Aberto
                        </span>
                      )}
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
