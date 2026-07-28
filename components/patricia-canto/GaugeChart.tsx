"use client";

// Gauge em meio-círculo para indicadores percentuais (taxas de conversão,
// sucesso, metas). pathLength="100" normaliza o comprimento do arco para
// 0–100, então o progresso é só "clamped, 100-clamped" no dasharray — sem
// precisar calcular circunferência manualmente.
export default function GaugeChart({
  pct,
  label,
  value,
  color = "#847455",
  size = 132,
}: {
  pct: number;
  label: string;
  value: string;
  color?: string;
  size?: number;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  const strokeWidth = 11;
  const pad = strokeWidth / 2 + 2;
  const r = size / 2 - pad;
  const cy = size / 2;
  const arc = `M ${pad} ${cy} A ${r} ${r} 0 0 1 ${size - pad} ${cy}`;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + pad} viewBox={`0 0 ${size} ${size / 2 + pad}`}>
        <path d={arc} fill="none" stroke="#E3D9C4" strokeWidth={strokeWidth} strokeLinecap="round" pathLength={100} />
        <path
          d={arc}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${clamped} ${100 - clamped}`}
        />
      </svg>
      <p className="-mt-1 text-xl font-semibold text-canto-900">{value}</p>
      <p className="text-center text-[11px] font-medium uppercase tracking-wide text-canto-500">{label}</p>
    </div>
  );
}
