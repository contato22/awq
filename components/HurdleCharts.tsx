"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, ScatterChart, Scatter, ZAxis, ComposedChart, Legend,
  AreaChart, Area, RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";
import type { BuHurdleConfig, HurdleProject, PpmHurdleRow, BuCashContext } from "@/lib/epm-hurdle";

// ── shared helpers ────────────────────────────────────────────────────────────

function fmtBRL(n: number) {
  const a = Math.abs(n);
  if (a >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (a >= 1_000)     return (n / 1_000).toFixed(0) + "K";
  return n.toFixed(0);
}

const STATUS_COLOR: Record<string, string> = {
  approved: "#10b981",
  watch:    "#f59e0b",
  rejected: "#ef4444",
  pending:  "#9ca3af",
};

// ── 1. Build-up Waterfall ─────────────────────────────────────────────────────
// Stacked bar per BU showing each build-up component.

interface WaterfallProps { buHurdles: BuHurdleConfig[] }

export function BuildupWaterfall({ buHurdles }: WaterfallProps) {
  const data = buHurdles.map((h) => ({
    bu:       h.bu.replace(" Holding", "").replace(" Vision", ""),
    rf:       h.rf,
    erp:      h.matureERP,
    size:     h.sizePremium,
    specific: h.specificPremium,
    buRisk:   h.buRiskPremium,
    hurdle:   h.hurdle,
  }));

  const LAYERS = [
    { key: "rf",       label: "Rf (Selic)",       color: "#3b82f6" },
    { key: "erp",      label: "ERP",              color: "#6366f1" },
    { key: "size",     label: "Tamanho",          color: "#8b5cf6" },
    { key: "specific", label: "Específico",       color: "#a855f7" },
    { key: "buRisk",   label: "Prêmio BU",        color: "#f59e0b" },
  ];

  return (
    <div>
      <p className="text-xs text-gray-400 mb-2">Ke = Rf + ERP + Tamanho + Específico + BU — cada camada visível</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} barSize={32} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="bu" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => v + "%"} domain={[0, 42]} />
          <Tooltip
            formatter={(val: number, name: string) => [`+${val.toFixed(2)}%`, name]}
            contentStyle={{ fontSize: 11, borderRadius: 8 }}
          />
          <Legend iconType="square" wrapperStyle={{ fontSize: 11 }} />
          {LAYERS.map(({ key, label, color }) => (
            <Bar key={key} dataKey={key} name={label} stackId="a" fill={color} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 2. Bullet chart — Hurdle vs ROIC ─────────────────────────────────────────

interface BulletProps { buHurdles: BuHurdleConfig[] }

export function BulletChart({ buHurdles }: BulletProps) {
  const data = buHurdles
    .filter((h) => h.roicReal !== undefined)
    .map((h) => ({
      bu:     h.bu.replace(" Holding", "").replace(" Vision", ""),
      hurdle: h.hurdle,
      roic:   h.roicReal ?? 0,
      spread: (h.roicReal ?? 0) - h.hurdle,
    }));

  if (data.length === 0) return (
    <p className="text-xs text-gray-400 italic py-4 text-center">ROIC real indisponível — sem dados de planning.</p>
  );

  return (
    <div>
      <p className="text-xs text-gray-400 mb-2">Barras = ROIC real · Linha = hurdle (barra de separação)</p>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} layout="vertical" margin={{ top: 4, right: 40, left: 60, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => v + "%"} domain={[0, "dataMax + 5"]} />
          <YAxis type="category" dataKey="bu" tick={{ fontSize: 11 }} width={58} />
          <Tooltip
            formatter={(val: number, name: string) => [val.toFixed(1) + "%", name]}
            contentStyle={{ fontSize: 11, borderRadius: 8 }}
          />
          <Bar dataKey="hurdle" name="Hurdle" fill="#e5e7eb" barSize={22} radius={[0, 3, 3, 0]} />
          <Bar dataKey="roic"   name="ROIC real" barSize={10} radius={[0, 3, 3, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.spread >= 0 ? "#10b981" : "#ef4444"} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 3. Bubble scatter — capital × spread, tamanho = |NPV| ────────────────────

export interface ChartProject {
  name:          string;
  bu_id:         string;
  irrAnnualized: number | null;
  spread:        number | null;
  status:        string;
  capex:         number;
  npvApprox?:    number | null;
}

interface BubbleProps { projects: ChartProject[] }

export function BubbleScatter({ projects }: BubbleProps) {
  const data = projects
    .filter((p) => p.spread !== null && p.capex > 0)
    .map((p) => ({
      x:      +(p.spread as number).toFixed(2),
      y:      p.capex,
      z:      Math.max(Math.abs(p.npvApprox ?? 0), p.capex * 0.05),
      name:   p.name,
      status: p.status,
    }));

  if (data.length === 0) return (
    <p className="text-xs text-gray-400 italic py-4 text-center">Projetos com spread indisponível.</p>
  );

  const byStatus = ["approved", "watch", "rejected", "pending"].map((s) => ({
    status: s,
    points: data.filter((d) => d.status === s),
  })).filter((g) => g.points.length > 0);

  return (
    <div>
      <p className="text-xs text-gray-400 mb-2">X = spread (pp) · Y = CAPEX · tamanho ∝ |NPV|</p>
      <ResponsiveContainer width="100%" height={240}>
        <ScatterChart margin={{ top: 8, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            type="number" dataKey="x" name="Spread" unit="pp"
            tick={{ fontSize: 10 }} label={{ value: "spread (pp)", position: "insideBottom", dy: 14, fontSize: 10 }}
          />
          <YAxis
            type="number" dataKey="y" name="CAPEX"
            tick={{ fontSize: 10 }} tickFormatter={fmtBRL}
            label={{ value: "CAPEX", angle: -90, position: "insideLeft", fontSize: 10 }}
          />
          <ZAxis type="number" dataKey="z" range={[40, 400]} name="NPV" />
          <ReferenceLine x={0} stroke="#6366f1" strokeDasharray="4 2" label={{ value: "hurdle", fontSize: 9, fill: "#6366f1" }} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-white border border-gray-200 rounded-lg shadow p-2 text-xs">
                  <p className="font-semibold">{d.name}</p>
                  <p>Spread: {d.x >= 0 ? "+" : ""}{d.x}pp · CAPEX: R${fmtBRL(d.y)}</p>
                </div>
              );
            }}
          />
          {byStatus.map(({ status, points }) => (
            <Scatter
              key={status}
              name={status}
              data={points}
              fill={STATUS_COLOR[status]}
              fillOpacity={0.8}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 4. Diverging bar — spread por projeto ────────────────────────────────────

interface DivergingProps { projects: ChartProject[] }

export function DivergingBarProjects({ projects }: DivergingProps) {
  const data = projects
    .filter((p) => p.spread !== null)
    .sort((a, b) => (b.spread as number) - (a.spread as number))
    .map((p) => ({
      name:   (("name" in p ? p.name : "") as string).slice(0, 22),
      spread: +(p.spread as number).toFixed(1),
      status: p.status,
    }));

  if (data.length === 0) return (
    <p className="text-xs text-gray-400 italic py-4 text-center">Nenhum spread calculado.</p>
  );

  return (
    <div>
      <p className="text-xs text-gray-400 mb-2">Spread = IRR a.a. − hurdle (centrado em 0)</p>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 28 + 40)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, left: 140, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => v + "pp"} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={138} />
          <ReferenceLine x={0} stroke="#374151" strokeWidth={1.5} />
          <ReferenceLine x={-2} stroke="#ef4444" strokeDasharray="3 2" strokeOpacity={0.5} />
          <Tooltip
            formatter={(val: number) => [(val >= 0 ? "+" : "") + val.toFixed(1) + "pp", "Spread"]}
            contentStyle={{ fontSize: 11, borderRadius: 8 }}
          />
          <Bar dataKey="spread" radius={[0, 3, 3, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={STATUS_COLOR[d.status]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 5. Cash Runway chart ──────────────────────────────────────────────────────
// Approximation: AR inflows / 3mo, AP outflows / 3mo, CAPEX draws over 12mo.

interface RunwayProps {
  cashRows: Array<{ bu: BuHurdleConfig; ctx: BuCashContext }>;
  approvedCapex: number;
}

export function CashRunwayChart({ cashRows, approvedCapex }: RunwayProps) {
  const totalAR  = cashRows.reduce((s, r) => s + r.ctx.arOutstanding, 0);
  const totalAP  = cashRows.reduce((s, r) => s + r.ctx.apOutstanding, 0);
  const deployed = cashRows.reduce((s, r) => s + r.ctx.capitalDeployed, 0);

  if (totalAR === 0 && totalAP === 0) return (
    <p className="text-xs text-gray-400 italic py-4 text-center">AR/AP indisponível — sem dados para projeção.</p>
  );
  const remaining = Math.max(approvedCapex - deployed, 0);

  // Project 6 months: AR collected in 3mo, AP paid in 3mo, CAPEX drawn evenly over 12mo
  const months = Array.from({ length: 7 }, (_, i) => i);
  const data = months.map((m) => {
    const arCollected  = m <= 3 ? totalAR * (m / 3) : totalAR;
    const apPaid       = m <= 3 ? totalAP * (m / 3) : totalAP;
    const capexDrawn   = remaining * (Math.min(m, 12) / 12);
    return {
      mo:    m === 0 ? "Hoje" : `+${m}m`,
      caixa: Math.round(arCollected - apPaid - capexDrawn),
      ar:    Math.round(totalAR - arCollected),
      ap:    Math.round(totalAP - apPaid),
    };
  });

  return (
    <div>
      <p className="text-xs text-gray-400 mb-2">
        Projeção de caixa líquido — AR a receber, AP a pagar, CAPEX aprovado (simplificado)
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
          <defs>
            <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="mo" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtBRL} />
          <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 2" />
          <Tooltip
            formatter={(val: number) => ["R$" + fmtBRL(val), ""]}
            contentStyle={{ fontSize: 11, borderRadius: 8 }}
          />
          <Area
            type="monotone" dataKey="caixa" name="Caixa líquido"
            stroke="#6366f1" strokeWidth={2}
            fill="url(#cashGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── 6. Funding gap gauge per BU ───────────────────────────────────────────────

interface GaugeProps {
  cashRows: Array<{ bu: BuHurdleConfig; ctx: BuCashContext }>;
  approvedCapexByBu: Record<string, number>;
}

export function FundingGaugeChart({ cashRows, approvedCapexByBu }: GaugeProps) {
  const data = cashRows
    .map(({ bu, ctx }) => {
      const capex    = approvedCapexByBu[bu.bu_id] ?? 0;
      const deployed = ctx.capitalDeployed;
      const gap      = capex - deployed;
      if (capex === 0 && deployed === 0) return null;
      const pct = capex > 0 ? Math.min((deployed / capex) * 100, 100) : 0;
      return {
        bu:      bu.bu.replace(" Holding", "").replace(" Vision", ""),
        pct:     +pct.toFixed(0),
        deployed,
        capex,
        gap,
        fill:    gap > 0 ? "#f59e0b" : "#10b981",
      };
    })
    .filter(Boolean) as Array<{ bu: string; pct: number; deployed: number; capex: number; gap: number; fill: string }>;

  if (data.length === 0) return (
    <p className="text-xs text-gray-400 italic py-4 text-center">Sem dados de CAPEX aprovado / capital aplicado.</p>
  );

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 mb-2">CAPEX aprovado × capital já aplicado (conciliação)</p>
      {data.map((d) => (
        <div key={d.bu} className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 font-medium w-28 shrink-0">{d.bu}</span>
            <div className="flex-1 mx-3 bg-gray-100 rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${d.pct}%`, backgroundColor: d.fill }}
              />
            </div>
            <span className="tabular-nums text-gray-500 w-24 text-right">
              {fmtBRL(d.deployed)} / {fmtBRL(d.capex)}
            </span>
            <span className={`ml-2 tabular-nums font-semibold w-20 text-right ${d.gap > 0 ? "text-amber-600" : "text-emerald-600"}`}>
              {d.gap > 0 ? "gap " : "ok "}{fmtBRL(Math.abs(d.gap))}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 7. Tornado chart ─────────────────────────────────────────────────────────
// For each parameter ±1pp, count how many projects change status.

export interface TornadoProject {
  irrAnnualized: number | null;
  spread:        number | null;
  hurdle:        number;
  status:        string;
  bu_id:         string;
}

interface TornadoProps {
  projects:  TornadoProject[];
  buHurdles: BuHurdleConfig[];
}

function countFlips(
  projects: TornadoProject[],
  delta: number,
  buId?: string,
): number {
  return projects.filter((p) => {
    if (p.irrAnnualized === null) return false;
    const d = buId ? (p.bu_id === buId ? delta : 0) : delta;
    const adjSpread = p.irrAnnualized - (p.hurdle + d);
    const adjStatus = adjSpread >= 0 ? "approved" : adjSpread >= -2 ? "watch" : "rejected";
    return adjStatus !== p.status;
  }).length;
}

export function TornadoChart({ projects, buHurdles }: TornadoProps) {
  const eligible = projects.filter((p) => p.irrAnnualized !== null);
  if (eligible.length === 0) return (
    <p className="text-xs text-gray-400 italic py-4 text-center">Projetos sem IRR — tornado indisponível.</p>
  );

  const DELTA = 1.5; // pp shock

  const rows: Array<{ label: string; up: number; down: number }> = [
    { label: `Rf +${DELTA}pp (Selic ↑)`,   up: countFlips(eligible, +DELTA), down: countFlips(eligible, -DELTA) },
    { label: `ERP +${DELTA}pp`,              up: countFlips(eligible, +DELTA), down: countFlips(eligible, -DELTA) },
    ...buHurdles.map((h) => ({
      label: `Prêmio ${h.bu.replace(" Holding","").replace(" Vision","")} +${DELTA}pp`,
      up:   countFlips(eligible, +DELTA, h.bu_id),
      down: countFlips(eligible, -DELTA, h.bu_id),
    })),
  ];

  // Sort by max impact
  const sorted = [...rows].sort((a, b) => Math.max(b.up, b.down) - Math.max(a.up, a.down));
  const data = sorted.map((r) => ({ ...r, upNeg: -r.up }));

  if (data.every((d) => d.up === 0 && d.down === 0)) return (
    <p className="text-xs text-gray-400 italic py-4 text-center">
      Nenhum projeto muda de status com Δ±{DELTA}pp em qualquer parâmetro.
    </p>
  );

  return (
    <div>
      <p className="text-xs text-gray-400 mb-2">
        Nº de projetos que mudam de status com Δ±{DELTA}pp por parâmetro
        · verde = alívio · vermelho = pressão
      </p>
      <ResponsiveContainer width="100%" height={Math.max(160, data.length * 30 + 40)}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 32, left: 180, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis
            type="number" tick={{ fontSize: 10 }}
            tickFormatter={(v) => Math.abs(v).toString()}
            label={{ value: "projetos afetados", position: "insideBottom", dy: 14, fontSize: 10 }}
          />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={178} />
          <ReferenceLine x={0} stroke="#374151" strokeWidth={1} />
          <Tooltip
            formatter={(val: number, name: string) => [
              Math.abs(val) + " projeto(s)",
              name === "upNeg" ? `+${DELTA}pp` : `-${DELTA}pp`,
            ]}
            contentStyle={{ fontSize: 11, borderRadius: 8 }}
          />
          <Bar dataKey="upNeg" name={`+${DELTA}pp (pressão)`} fill="#ef4444" fillOpacity={0.75} radius={[3, 0, 0, 3]} />
          <Bar dataKey="down"  name={`-${DELTA}pp (alívio)`}  fill="#10b981" fillOpacity={0.75} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
