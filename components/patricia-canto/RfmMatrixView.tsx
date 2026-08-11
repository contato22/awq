"use client";

import { useMemo, useState } from "react";
import type { Lead } from "@/lib/patricia-canto/leads";
import { computeRfm, RFM_GRID, SEGMENTOS, type SegmentoId } from "@/lib/patricia-canto/rfm";

function currency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Linhas = score de Recência (3 no topo = contato mais recente).
// Colunas = média arredondada de Frequência + Valor (1 = baixo, 3 = alto).
const GRID_ROWS: (1 | 2 | 3)[] = [3, 2, 1];
const GRID_COLS: (1 | 2 | 3)[] = [1, 2, 3];

export default function RfmMatrixView({ leads }: { leads: Lead[] }) {
  const [filtro, setFiltro] = useState<SegmentoId | "todos">("todos");

  const entries = useMemo(() => computeRfm(leads), [leads]);

  const porSegmento = useMemo(() => {
    const map = new Map<SegmentoId, { count: number; valor: number }>();
    for (const s of Object.keys(SEGMENTOS) as SegmentoId[]) map.set(s, { count: 0, valor: 0 });
    for (const e of entries) {
      const cur = map.get(e.segmentoId)!;
      cur.count += 1;
      cur.valor += e.valorMonetario;
    }
    return map;
  }, [entries]);

  const filtrados = useMemo(() => {
    const list = filtro === "todos" ? entries : entries.filter((e) => e.segmentoId === filtro);
    return [...list].sort((a, b) => b.recenciaDias - a.recenciaDias);
  }, [entries, filtro]);

  return (
    <div>
      <div className="rounded-xl border border-canto-line bg-white p-4">
        <h3 className="font-canto-serif text-base font-semibold text-canto-900">Matriz RFM</h3>
        <p className="mt-1 text-xs text-canto-500">
          Recência (dias desde a última movimentação), Frequência (nº de leads do mesmo cliente) e Valor Monetário
          (honorários ou valor da ação). Clique numa célula pra filtrar a lista abaixo.
        </p>

        <div className="mt-4 overflow-x-auto">
          <div className="flex min-w-[560px] gap-2">
            <div className="flex w-28 shrink-0 flex-col justify-around py-2 text-right text-[10px] font-medium uppercase tracking-wide text-canto-500">
              <span>Recente</span>
              <span>Médio</span>
              <span>Antigo</span>
            </div>
            <div className="flex-1">
              <div className="grid grid-cols-3 gap-2">
                {GRID_ROWS.map((r) =>
                  GRID_COLS.map((fm) => {
                    const segId = RFM_GRID[r][fm];
                    const info = SEGMENTOS[segId];
                    const stats = porSegmento.get(segId) ?? { count: 0, valor: 0 };
                    const active = filtro === segId;
                    return (
                      <button
                        key={`${r}-${fm}`}
                        onClick={() => setFiltro(active ? "todos" : segId)}
                        className={`rounded-lg border p-3 text-left transition ${
                          active ? "border-canto-700 ring-2 ring-canto-700" : "border-canto-line hover:border-canto-400"
                        }`}
                        style={{ backgroundColor: `${info.color}1a` }}
                      >
                        <p className="text-xs font-semibold text-canto-900">{info.label}</p>
                        <p className="mt-1 text-lg font-bold text-canto-900">{stats.count}</p>
                        <p className="text-[10px] text-canto-500">{currency(stats.valor)}</p>
                      </button>
                    );
                  }),
                )}
              </div>
              <p className="mt-2 text-center text-[10px] font-medium uppercase tracking-wide text-canto-500">
                Frequência + Valor: baixo → alto
              </p>
            </div>
          </div>
        </div>

        {filtro !== "todos" && (
          <p className="mt-3 text-xs text-canto-600">
            <strong>{SEGMENTOS[filtro].label}:</strong> {SEGMENTOS[filtro].hint}{" "}
            <button onClick={() => setFiltro("todos")} className="ml-1 font-semibold text-canto-700 underline">
              limpar filtro
            </button>
          </p>
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-canto-line bg-white">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-canto-line text-left text-xs uppercase tracking-wide text-canto-500">
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Tipo de processo</th>
              <th className="px-3 py-2">Recência</th>
              <th className="px-3 py-2">Frequência</th>
              <th className="px-3 py-2">Valor</th>
              <th className="px-3 py-2">Segmento</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((e) => {
              const info = SEGMENTOS[e.segmentoId];
              return (
                <tr key={e.lead.id} className="border-b border-canto-line/60 last:border-0">
                  <td className="px-3 py-2 font-medium text-canto-900">{e.lead.nomeCliente}</td>
                  <td className="px-3 py-2 text-canto-500">{e.lead.tipoProcesso}</td>
                  <td className="px-3 py-2 text-canto-700">{e.recenciaDias}d</td>
                  <td className="px-3 py-2 text-canto-700">{e.frequencia}</td>
                  <td className="px-3 py-2 text-canto-700">{currency(e.valorMonetario)}</td>
                  <td className="px-3 py-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{ backgroundColor: `${info.color}26`, color: info.color }}
                    >
                      {info.label}
                    </span>
                  </td>
                </tr>
              );
            })}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-xs text-canto-500">
                  Nenhum lead nesse segmento
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
