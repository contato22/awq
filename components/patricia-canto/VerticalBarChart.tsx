"use client";

export interface FlowDatum {
  label: string;
  value: number;
}

// Barras verticais simples pra séries temporais (dia/mês/ano) — complementa
// o HorizontalBarChart, que é melhor pra ranking de categorias, não pra
// fluxo ao longo do tempo com várias barras seguidas.
export default function VerticalBarChart({
  data,
  formatValue,
  color = "#847455",
  height = 150,
}: {
  data: FlowDatum[];
  formatValue: (v: number) => string;
  color?: string;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const labelStride = Math.max(1, Math.ceil(data.length / 10));

  return (
    <div>
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {data.map((d, i) => (
          <div
            key={i}
            title={`${d.label}: ${formatValue(d.value)}`}
            className="min-w-[3px] flex-1 rounded-t-sm transition-all"
            style={{
              height: d.value > 0 ? `${Math.max(2, (d.value / max) * 100)}%` : "1px",
              backgroundColor: d.value > 0 ? color : "#E3D9C4",
            }}
          />
        ))}
      </div>
      <div className="mt-1.5 flex gap-[3px]">
        {data.map((d, i) => (
          <div key={i} className="flex-1 text-center text-[9px] leading-tight text-canto-400">
            {i % labelStride === 0 ? d.label : ""}
          </div>
        ))}
      </div>
      {data.every((d) => d.value === 0) && (
        <p className="mt-2 text-center text-xs text-canto-500">Sem vendas registradas no período.</p>
      )}
    </div>
  );
}
