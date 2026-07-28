"use client";

export interface BarDatum {
  label: string;
  value: number;
  displayValue: string;
  color?: string;
}

export default function HorizontalBarChart({ data }: { data: BarDatum[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label}>
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-canto-700">{d.label}</span>
            <span className="font-semibold text-canto-900">{d.displayValue}</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-canto-100">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color ?? "#847455" }}
            />
          </div>
        </div>
      ))}
      {data.length === 0 && <p className="text-xs text-canto-500">Sem dados suficientes ainda.</p>}
    </div>
  );
}
