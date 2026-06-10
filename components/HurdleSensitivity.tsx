"use client";

import { useState, useMemo } from "react";
import { AlertTriangle, CheckCircle2, XCircle, Info } from "lucide-react";
import type { BuHurdleConfig, HurdleProject, HurdleStatus, PpmHurdleRow } from "@/lib/epm-hurdle";

interface Props {
  buHurdles:   BuHurdleConfig[];
  allProjects: HurdleProject[];
  ppmRows:     PpmHurdleRow[];
}

function statusFromSpread(sp: number | null): HurdleStatus {
  if (sp === null) return "pending";
  if (sp >= 0)  return "approved";
  if (sp >= -2) return "watch";
  return "rejected";
}

function fmtPct(n: number) { return n.toFixed(1) + "%"; }

function SliderRow({
  label, value, min, max, step, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  const color = value > 0 ? "text-red-600" : value < 0 ? "text-emerald-600" : "text-gray-500";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-36 shrink-0">{label}</span>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-brand-600"
      />
      <span className={`text-xs font-mono font-semibold w-14 text-right tabular-nums ${color}`}>
        {value >= 0 ? "+" : ""}{fmtPct(value)}
      </span>
      <button
        onClick={() => onChange(0)}
        className="text-xs text-gray-300 hover:text-gray-500 transition-colors"
        title="Resetar"
      >×</button>
    </div>
  );
}

export function HurdleSensitivity({ buHurdles, allProjects, ppmRows }: Props) {
  const [rfDelta,  setRfDelta]  = useState(0);
  const [erpDelta, setErpDelta] = useState(0);
  const [buDeltas, setBuDeltas] = useState<Record<string, number>>({});

  const setBuDelta = (buId: string, v: number) =>
    setBuDeltas((prev) => ({ ...prev, [buId]: v }));

  // Adjusted hurdle per BU
  const adjHurdles = useMemo(
    () => new Map(buHurdles.map((h) => [
      h.bu_id,
      h.hurdle + rfDelta + erpDelta + (buDeltas[h.bu_id] ?? 0),
    ])),
    [buHurdles, rfDelta, erpDelta, buDeltas],
  );

  // Status flips for capital projects
  const capitalFlips = useMemo(() => {
    return allProjects
      .filter((p) => p.irrAnnualized !== null)
      .map((p) => {
        const adjHurdle = adjHurdles.get(p.bu_id) ?? p.hurdle;
        const adjSpread = (p.irrAnnualized as number) - adjHurdle;
        const adjStatus = statusFromSpread(adjSpread);
        const flipped   = adjStatus !== p.status;
        return { ...p, adjHurdle, adjSpread, adjStatus, flipped };
      })
      .filter((p) => p.flipped);
  }, [allProjects, adjHurdles]);

  // Status flips for PPM
  const ppmFlips = useMemo(() => {
    return ppmRows
      .filter((p) => p.irrAnnualized !== null)
      .map((p) => {
        const adjHurdle = adjHurdles.get(p.bu_id) ?? p.hurdle;
        const adjSpread = (p.irrAnnualized as number) - adjHurdle;
        const adjStatus = statusFromSpread(adjSpread);
        const flipped   = adjStatus !== p.status;
        return { ...p, adjHurdle, adjSpread, adjStatus, flipped };
      })
      .filter((p) => p.flipped);
  }, [ppmRows, adjHurdles]);

  const totalFlips = capitalFlips.length + ppmFlips.length;

  return (
    <div className="card p-4 space-y-4">

      {/* Global sliders */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Fatores Globais</div>
        <SliderRow label="Δ Rf (Selic)" value={rfDelta} min={-5} max={5} step={0.25} onChange={setRfDelta} />
        <SliderRow label="Δ ERP (Damodaran)" value={erpDelta} min={-2} max={2} step={0.25} onChange={setErpDelta} />
      </div>

      {/* Per-BU slider */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1">Prêmio por BU</div>
        {buHurdles.map((h) => (
          <SliderRow
            key={h.bu_id}
            label={`Δ ${h.bu} (${fmtPct(h.hurdle)})`}
            value={buDeltas[h.bu_id] ?? 0}
            min={-5} max={10} step={0.25}
            onChange={(v) => setBuDelta(h.bu_id, v)}
          />
        ))}
      </div>

      {/* Adjusted hurdles summary */}
      <div className="border-t border-gray-100 pt-3">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Hurdle Ajustado por BU</div>
        <div className="flex flex-wrap gap-2">
          {buHurdles.map((h) => {
            const adj  = adjHurdles.get(h.bu_id) ?? h.hurdle;
            const diff = adj - h.hurdle;
            return (
              <div key={h.bu_id} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs">
                <span className="text-gray-500">{h.bu}: </span>
                <span className="font-bold text-brand-700 tabular-nums">{fmtPct(adj)}</span>
                {diff !== 0 && (
                  <span className={`ml-1 tabular-nums ${diff > 0 ? "text-red-500" : "text-emerald-600"}`}>
                    ({diff >= 0 ? "+" : ""}{fmtPct(diff)})
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Flip summary */}
      <div className="border-t border-gray-100 pt-3">
        {totalFlips === 0 ? (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Info size={12} />
            <span>Nenhum projeto muda de status com os ajustes atuais.</span>
          </div>
        ) : (
          <>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
              {totalFlips} projeto{totalFlips > 1 ? "s" : ""} mudam de status
            </div>
            <div className="space-y-1">
              {[...capitalFlips, ...ppmFlips].map((p) => {
                const Icon = p.adjStatus === "approved" ? CheckCircle2 : p.adjStatus === "rejected" ? XCircle : AlertTriangle;
                const clr  = p.adjStatus === "approved" ? "text-emerald-600" : p.adjStatus === "rejected" ? "text-red-600" : "text-amber-600";
                return (
                  <div key={p.id} className="flex items-center gap-2 text-xs py-1 border-b border-gray-50">
                    <Icon size={12} className={clr} />
                    <span className="font-medium text-gray-800 flex-1">{p.name}</span>
                    <span className="text-gray-400">
                      {p.status} → <span className={`font-semibold ${clr}`}>{p.adjStatus}</span>
                    </span>
                    <span className="tabular-nums text-gray-400 font-mono">
                      spread {(p.adjSpread >= 0 ? "+" : "")}{p.adjSpread.toFixed(1)}pp
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

    </div>
  );
}
