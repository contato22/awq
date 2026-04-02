import Header from "@/components/Header";
import { ArrowUpRight, ArrowDownRight, CheckCircle2 } from "lucide-react";

// ─── Data ─────────────────────────────────────────────────────────────────────

const fundMetrics = [
  { metric: "IRR Bruto",           awq: 34.2,  benchmark: 22.0, unit: "%",    lowerBetter: false },
  { metric: "MOIC (TVPI)",         awq: 2.42,  benchmark: 1.80, unit: "x",    lowerBetter: false },
  { metric: "DPI (Distribuído)",   awq: 0.46,  benchmark: 0.35, unit: "x",    lowerBetter: false },
  { metric: "Prazo Médio de Exit", awq: 4.2,   benchmark: 5.5,  unit: " anos", lowerBetter: true },
  { metric: "Loss Ratio",          awq: 16.7,  benchmark: 30.0, unit: "%",    lowerBetter: true },
  { metric: "Follow-on Ratio",     awq: 67.0,  benchmark: 55.0, unit: "%",    lowerBetter: false },
];

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(0) + "M";
  return "R$" + (n / 1_000).toFixed(0) + "K";
}

const peerFunds = [
  { name: "AWQ Venture",     vintage: 2022, irr: 34.2, moic: 2.42, dpi: 0.46, deployed: 40_500_000 },
  { name: "Fundo Alpha VC",  vintage: 2021, irr: 28.5, moic: 2.10, dpi: 0.62, deployed: 85_000_000 },
  { name: "Nexus Partners",  vintage: 2022, irr: 22.0, moic: 1.80, dpi: 0.35, deployed: 120_000_000 },
  { name: "LatAm Seed Co",   vintage: 2021, irr: 19.8, moic: 1.65, dpi: 0.48, deployed: 45_000_000 },
  { name: "BR Ventures II",  vintage: 2020, irr: 15.2, moic: 1.42, dpi: 0.55, deployed: 200_000_000 },
];

const quartiles = [
  { label: "Top Quartile (Q1)", irr: ">25%", moic: ">2.5x", dpi: ">0.5x" },
  { label: "Second Quartile (Q2)", irr: "18-25%", moic: "1.8-2.5x", dpi: "0.3-0.5x" },
  { label: "Third Quartile (Q3)", irr: "10-18%", moic: "1.2-1.8x", dpi: "0.1-0.3x" },
  { label: "Bottom Quartile (Q4)", irr: "<10%", moic: "<1.2x", dpi: "<0.1x" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BenchmarkPage() {
  return (
    <>
      <Header title="Benchmark — AWQ Venture" subtitle="Performance comparada vs mercado de VC LatAm" />
      <div className="px-8 py-6 space-y-6">

        {/* AWQ vs Benchmark */}
        <div className="card-elevated p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-4">AWQ Venture vs Mercado (Micro-VC LatAm)</h2>
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            {fundMetrics.map((m) => {
              const better = m.lowerBetter ? m.awq < m.benchmark : m.awq > m.benchmark;
              const delta = m.awq - m.benchmark;
              return (
                <div key={m.metric} className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-2">{m.metric}</div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-xl font-bold text-slate-800">
                        {m.unit === "x" ? m.awq.toFixed(2) + "x" : m.awq.toFixed(1) + m.unit}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">AWQ Venture</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        {m.unit === "x" ? m.benchmark.toFixed(2) + "x" : m.benchmark.toFixed(1) + m.unit}
                      </div>
                      <div className="text-[10px] text-gray-500">Benchmark</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    {better ? <ArrowUpRight size={11} className="text-emerald-600" /> : <ArrowDownRight size={11} className="text-red-600" />}
                    <span className={`text-[10px] font-semibold ${better ? "text-emerald-600" : "text-red-600"}`}>
                      {delta > 0 ? "+" : ""}{m.unit === "x" ? delta.toFixed(2) + "x" : delta.toFixed(1) + (m.unit === "%" ? "pp" : m.unit)}
                    </span>
                    <span className="text-[10px] text-gray-500">vs mercado</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Peer Comparison */}
          <div className="card-elevated p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-4">Comparação entre Fundos</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="text-left py-2 px-3 text-xs font-bold">Fundo</th>
                    <th className="text-right py-2 px-3 text-xs font-bold">IRR</th>
                    <th className="text-right py-2 px-3 text-xs font-bold">MOIC</th>
                    <th className="text-right py-2 px-3 text-xs font-bold">DPI</th>
                    <th className="text-right py-2 px-3 text-xs font-bold">Deployed</th>
                  </tr>
                </thead>
                <tbody>
                  {peerFunds.map((f, i) => (
                    <tr key={f.name} className={`border-b border-gray-100 even:bg-gray-50/60 hover:bg-gray-100 transition-colors ${i === 0 ? "bg-amber-50/50" : ""}`}>
                      <td className="py-2.5 px-3">
                        <div className={`text-xs font-medium ${i === 0 ? "text-amber-800" : "text-gray-800"}`}>{f.name}</div>
                        <div className="text-[10px] text-gray-500">Vintage {f.vintage}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span className={`text-xs font-bold ${f.irr >= 25 ? "text-emerald-600" : f.irr >= 15 ? "text-amber-700" : "text-gray-500"}`}>{f.irr.toFixed(1)}%</span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-xs font-bold text-emerald-600">{f.moic.toFixed(2)}x</td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-500">{f.dpi.toFixed(2)}x</td>
                      <td className="py-2.5 px-3 text-right text-xs text-gray-500">{fmtR(f.deployed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quartile Reference */}
          <div className="card-elevated p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-4">Referência de Quartis — VC LatAm</h2>
            <div className="space-y-3">
              {quartiles.map((q, i) => (
                <div key={q.label} className={`p-4 rounded-xl border ${i === 0 ? "bg-emerald-50 border-emerald-200" : "bg-gray-50 border-gray-200"}`}>
                  <div className={`text-xs font-semibold mb-2 ${i === 0 ? "text-emerald-700" : "text-gray-700"}`}>
                    {q.label}
                    {i === 0 && <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded">AWQ Venture</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-[11px]">
                    <div><span className="text-gray-500">IRR: </span><span className="font-semibold text-gray-700">{q.irr}</span></div>
                    <div><span className="text-gray-500">MOIC: </span><span className="font-semibold text-gray-700">{q.moic}</span></div>
                    <div><span className="text-gray-500">DPI: </span><span className="font-semibold text-gray-700">{q.dpi}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
