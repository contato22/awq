"use client";

import { useMemo, useState } from "react";
import type { Lead } from "@/lib/patricia-canto/leads";
import type { BusinessUnit } from "@/lib/patricia-canto/business-units";
import { computeRfmForUnits, RFM_GRID, SEGMENTOS, type SegmentoId } from "@/lib/patricia-canto/rfm";
import UrgenciaBadge from "./UrgenciaBadge";

function currency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Linhas = score de Recência (3 no topo = movimentação mais recente entre os
// leads da unidade). Colunas = média arredondada de Frequência + Valor.
const GRID_ROWS: (1 | 2 | 3)[] = [3, 2, 1];
const GRID_COLS: (1 | 2 | 3)[] = [1, 2, 3];

export default function RfmMatrixUnitsView({ leads, businessUnits }: { leads: Lead[]; businessUnits: BusinessUnit[] }) {
  const [filtro, setFiltro] = useState<SegmentoId | "todos">("todos");

  const entries = useMemo(() => computeRfmForUnits(leads, businessUnits), [leads, businessUnits]);

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

  if (businessUnits.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-canto-300 py-8 text-center text-sm text-canto-500">
        Nenhuma unidade de negócio cadastrada ainda.
      </p>
    );
  }

  return (
    <div>
      <div className="rounded-xl border border-canto-line bg-white p-4">
        <h3 className="font-canto-serif text-base font-semibold text-canto-900">
          Matriz de Comunicação — Unidades de Negócio
        </h3>
        <p className="mt-1 text-xs text-canto-500">
          Segmenta as unidades por Recência (dias desde a movimentação mais recente de um lead da unidade),
          Frequência (nº de leads trazidos) e Valor Monetário (honorários/valor de ação), e indica a ação de
          comunicação recomendada com cada parceria. Clique numa célula pra filtrar a lista abaixo.
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
          <div className="mt-3 rounded-lg bg-canto-50 px-3 py-2.5 text-xs text-canto-600">
            <div className="flex flex-wrap items-center gap-2">
              <strong>{SEGMENTOS[filtro].label}</strong>
              <UrgenciaBadge urgencia={SEGMENTOS[filtro].urgencia} />
              <button onClick={() => setFiltro("todos")} className="ml-auto font-semibold text-canto-700 underline">
                limpar filtro
              </button>
            </div>
            <p className="mt-1">{SEGMENTOS[filtro].hint}</p>
            <p className="mt-1 font-medium text-canto-700">Ação recomendada: {SEGMENTOS[filtro].acao}</p>
          </div>
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-canto-line bg-white">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-canto-line text-left text-xs uppercase tracking-wide text-canto-500">
              <th className="px-3 py-2">Unidade</th>
              <th className="px-3 py-2">Segmento de atuação</th>
              <th className="px-3 py-2">Recência</th>
              <th className="px-3 py-2">Frequência</th>
              <th className="px-3 py-2">Valor</th>
              <th className="px-3 py-2">Segmento</th>
              <th className="px-3 py-2">Urgência</th>
              <th className="px-3 py-2">Ação recomendada</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((e) => {
              const info = SEGMENTOS[e.segmentoId];
              return (
                <tr key={e.unit.id} className="border-b border-canto-line/60 last:border-0">
                  <td className="px-3 py-2 font-medium text-canto-900">{e.unit.nome}</td>
                  <td className="px-3 py-2 text-canto-500">{e.unit.segmento}</td>
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
                  <td className="px-3 py-2">
                    <UrgenciaBadge urgencia={info.urgencia} />
                  </td>
                  <td className="px-3 py-2 text-canto-600">{info.acao}</td>
                </tr>
              );
            })}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-xs text-canto-500">
                  Nenhuma unidade nesse segmento
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
