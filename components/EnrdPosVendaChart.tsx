"use client";

import { useState } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

export type SeriePonto = {
  periodo: string;
  faturamento: number;
  contribuicao: number;
  esperado: number; // custo fixo do período (operação precisa cobrir)
  resultado: number; // contribuição − esperado
  cora: number; // caixa líquido conciliado (Cora ENRD)
};

export type Series = { dia: SeriePonto[]; mes: SeriePonto[]; ano: SeriePonto[] };

type Gran = "dia" | "mes" | "ano";
type SerieKey = "resultado" | "esperado" | "contribuicao" | "cora";

const SERIE_META: Record<SerieKey, { label: string; color: string; tipo: "bar" | "line" }> = {
  resultado: { label: "Resultado", color: "#dc2626", tipo: "line" },
  esperado: { label: "Esperado operacional (custo fixo)", color: "#f59e0b", tipo: "line" },
  contribuicao: { label: "Contribuição", color: "#10b981", tipo: "bar" },
  cora: { label: "Cora · conciliação (caixa líq.)", color: "#0891b2", tipo: "bar" },
};

const BRL0 = (v: number) => `R$ ${Math.round(v).toLocaleString("pt-BR")}`;

export default function EnrdPosVendaChart({ series }: { series: Series }) {
  const [gran, setGran] = useState<Gran>("mes");
  const [ativos, setAtivos] = useState<Record<SerieKey, boolean>>({
    resultado: true,
    esperado: true,
    contribuicao: false,
    cora: true,
  });

  const data = series[gran];
  const toggle = (k: SerieKey) => setAtivos((p) => ({ ...p, [k]: !p[k] }));

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-gray-900">
          Comparativo — resultado × esperado × conciliação Cora
        </h2>
        {/* Filtro de granularidade */}
        <div className="inline-flex rounded-lg border overflow-hidden text-xs">
          {(["dia", "mes", "ano"] as Gran[]).map((g) => (
            <button
              key={g}
              onClick={() => setGran(g)}
              className={`px-3 py-1.5 font-medium ${
                gran === g ? "bg-orange-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {g === "dia" ? "Diário" : g === "mes" ? "Mensal" : "Anual"}
            </button>
          ))}
        </div>
      </div>

      {/* Seleção de séries (filtro de comparação) */}
      <div className="flex flex-wrap gap-3 mb-4">
        {(Object.keys(SERIE_META) as SerieKey[]).map((k) => (
          <label key={k} className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input type="checkbox" checked={ativos[k]} onChange={() => toggle(k)} className="accent-orange-600" />
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: SERIE_META[k].color }} />
            {SERIE_META[k].label}
          </label>
        ))}
      </div>

      {data.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-400">Sem dados no período.</div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
            <Tooltip formatter={(v: number, name) => [BRL0(v), name]} labelClassName="text-xs" />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine y={0} stroke="#999" strokeWidth={1} />
            {ativos.contribuicao && (
              <Bar dataKey="contribuicao" name={SERIE_META.contribuicao.label} fill={SERIE_META.contribuicao.color} barSize={18} radius={[3, 3, 0, 0]} />
            )}
            {ativos.cora && (
              <Bar dataKey="cora" name={SERIE_META.cora.label} fill={SERIE_META.cora.color} barSize={18} radius={[3, 3, 0, 0]} />
            )}
            {ativos.esperado && (
              <Line type="monotone" dataKey="esperado" name={SERIE_META.esperado.label} stroke={SERIE_META.esperado.color} strokeWidth={2} strokeDasharray="5 4" dot={false} />
            )}
            {ativos.resultado && (
              <Line type="monotone" dataKey="resultado" name={SERIE_META.resultado.label} stroke={SERIE_META.resultado.color} strokeWidth={2.5} dot={{ r: 3 }} />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      )}

      <p className="text-xs text-gray-400 mt-3">
        <strong>Resultado</strong> = contribuição − custo fixo (folha + encargos + veículo).{" "}
        <strong>Esperado operacional</strong> = custo fixo que a operação precisa cobrir no período.{" "}
        <strong>Cora</strong> = caixa líquido conciliado da conta ENRD (entradas − saídas).
      </p>
    </section>
  );
}
