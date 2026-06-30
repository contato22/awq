"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownLeft, Scale, CalendarDays } from "lucide-react";

type Day = {
  date: string;
  faturado: number;
  gasto: number;
  custoVar: number;
  custoFixoDia: number;
  margem: number;
  margemPct: number;
  nOS: number;
};
type BiResp = {
  ok: boolean;
  stale?: boolean;
  hoje: Day;
  dias: Day[];
  mes: { ref: string; custoFixoDia: number; diasNoMes: number; comBonus: boolean };
};

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const PCT = (v: number) => `${(v * 100).toFixed(0)}%`;
const diaLabel = (d: string) => {
  const [, m, day] = d.split("-");
  return `${day}/${m}`;
};

// BI diário da BU: por dia, quanto faturamos, gastamos e a margem.
// Fonte: P&L do pós-venda (OS realizadas + rateio diário do custo fixo).
export default function EnrdBiDaily() {
  const [data, setData] = useState<BiResp | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/enrd/bi-daily")
      .then((r) => r.json())
      .then((j) => {
        if (!j.ok) throw new Error(j.error || "falha");
        setData(j);
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="card p-5 flex items-center justify-center">
        <div className="w-4 h-4 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  if (err || !data)
    return (
      <div className="card p-4 text-xs text-amber-700 bg-amber-50 border-amber-200">
        BI diário indisponível: {err}
      </div>
    );

  const h = data.hoje;
  const maxAbs = Math.max(1, ...data.dias.map((d) => Math.abs(d.margem)));

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <CalendarDays size={15} className="text-orange-600" /> BI diário — pós-venda/O&amp;M
        </h2>
        <div className="flex items-center gap-2">
          {data.stale ? (
            <span className="text-[11px] font-medium text-amber-600">● SNAPSHOT</span>
          ) : (
            <span className="text-[11px] font-medium text-emerald-600">● AO VIVO</span>
          )}
          <span className="text-xs text-gray-400">
            Hoje · {diaLabel(h.date)} ({h.nOS} OS)
          </span>
        </div>
      </div>

      {/* Hoje: faturado / gasto / margem */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-center gap-1.5 text-xs text-emerald-800">
            <ArrowUpRight size={13} /> Faturado
          </div>
          <div className="text-xl font-bold text-emerald-700 mt-1">{BRL(h.faturado)}</div>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="flex items-center gap-1.5 text-xs text-red-800">
            <ArrowDownLeft size={13} /> Gasto
          </div>
          <div className="text-xl font-bold text-red-700 mt-1">{BRL(h.gasto)}</div>
          <div className="text-[11px] text-red-400 mt-0.5">
            fixo/dia {BRL(h.custoFixoDia)} + var {BRL(h.custoVar)}
          </div>
        </div>
        <div className={`rounded-lg border p-3 ${h.margem >= 0 ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
          <div className={`flex items-center gap-1.5 text-xs ${h.margem >= 0 ? "text-emerald-800" : "text-red-800"}`}>
            <Scale size={13} /> Margem
          </div>
          <div className={`text-xl font-bold mt-1 ${h.margem >= 0 ? "text-emerald-700" : "text-red-700"}`}>
            {BRL(h.margem)}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">
            {h.faturado > 0 ? PCT(h.margemPct) : "sem faturamento hoje"}
          </div>
        </div>
      </div>

      {/* Faixa dos últimos 14 dias (margem por dia) */}
      <div className="mt-4">
        <div className="text-[11px] text-gray-400 mb-1.5">Margem dos últimos 14 dias</div>
        <div className="flex items-end gap-1 h-20">
          {data.dias.map((d) => {
            const pos = d.margem >= 0;
            const hgt = Math.max(2, (Math.abs(d.margem) / maxAbs) * 72);
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center justify-end group relative">
                <div
                  className={`w-full rounded-sm ${pos ? "bg-emerald-400" : "bg-red-400"} group-hover:opacity-80`}
                  style={{ height: `${hgt}px` }}
                />
                <div className="text-[8px] text-gray-400 mt-0.5">{diaLabel(d.date).slice(0, 2)}</div>
                <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 whitespace-nowrap rounded bg-gray-900 text-white text-[10px] px-1.5 py-1">
                  {diaLabel(d.date)} · fat {BRL(d.faturado)} · gasto {BRL(d.gasto)} · marg {BRL(d.margem)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-gray-400 mt-3">
        Faturado = OS de pós-venda realizadas no dia · Gasto = material+combustível do dia + rateio diário do custo
        fixo (folha/veículo ÷ {data.mes.diasNoMes} dias) · Margem = faturado − gasto. Dias sem OS mostram só o burn
        fixo (margem negativa) — é a tese do custo fixo diário.
      </p>
    </div>
  );
}
