// ─── /awq/epm/reports/board-pack — Quarterly Board Pack ───────────────────────
//
// Quarterly management pack for the AWQ Board:
//   • Executive summary (1-page view)
//   • P&L highlights vs budget
//   • Cash position and runway
//   • KPI scorecard
//   • Key initiatives and risks
//   • Next quarter outlook

import Header from "@/components/Header";
import Link from "next/link";
import {
  FileText, TrendingUp, DollarSign, Target, BarChart3,
  CheckCircle2, AlertTriangle, ArrowUpRight, Layers,
  Building2, Calendar,
} from "lucide-react";
import { buildDreQuery } from "@/lib/dre-query";
import { consolidated, consolidatedMargins, budgetVsActual } from "@/lib/awq-derived-metrics";

function fmtBRL(n: number): string {
  const abs  = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return sign + "R$" + (abs / 1_000_000).toFixed(2) + "M";
  if (abs >= 1_000)     return sign + "R$" + (abs / 1_000).toFixed(0)     + "K";
  return sign + "R$" + abs.toLocaleString("pt-BR", { minimumFractionDigits: 0 });
}

function pct(n: number): string {
  return (n * 100).toFixed(1) + "%";
}

interface Initiative {
  label:    string;
  status:   "on_track" | "at_risk" | "completed" | "not_started";
  owner:    string;
  deadline: string;
  update:   string;
}

const INITIATIVES: Initiative[] = [
  { label: "Contratação Sales Manager JACQES",          status: "on_track",    owner: "CEO",     deadline: "2026-06-30", update: "2 candidatos finalistas — entrevistas marcadas para maio." },
  { label: "Expansão carteira CAZA — 3 novos clientes", status: "at_risk",     owner: "CAZA",    deadline: "2026-06-30", update: "Pipeline insuficiente. Necessário reforçar prospecção ativa." },
  { label: "Sistema ERP EPM — módulo imobilizado",      status: "completed",   owner: "CFO",     deadline: "2026-04-30", update: "Fixed assets register implantado em Abr/2026." },
  { label: "Fechamento Q1/2026",                        status: "completed",   owner: "CFO",     deadline: "2026-04-08", update: "Fechado em D+8. Auditoria interna OK." },
  { label: "Pitch Seed Rodada ADVISOR",                 status: "not_started", owner: "Founder", deadline: "2026-09-30", update: "Aguardando conclusão do produto MVP para iniciar roadshow." },
  { label: "Budget FY2026-Bull — reavaliação Q3",       status: "not_started", owner: "CFO",     deadline: "2026-07-31", update: "Agendar revisão orçamentária com board em Jul/2026." },
];

const STATUS_CFG = {
  on_track:    { label: "No prazo",     color: "text-emerald-700", bg: "bg-emerald-100", icon: CheckCircle2   },
  at_risk:     { label: "Em risco",     color: "text-red-700",     bg: "bg-red-100",     icon: AlertTriangle  },
  completed:   { label: "Concluído",    color: "text-brand-700",   bg: "bg-brand-100",   icon: CheckCircle2   },
  not_started: { label: "Não iniciado", color: "text-gray-500",    bg: "bg-gray-100",    icon: Calendar       },
};

interface Risk {
  description: string;
  probability: "HIGH" | "MEDIUM" | "LOW";
  impact:      "HIGH" | "MEDIUM" | "LOW";
  mitigation:  string;
}

const RISKS: Risk[] = [
  { description: "Churn de cliente-chave JACQES (>20% MRR)", probability: "MEDIUM", impact: "HIGH",   mitigation: "Aprofundar relacionamento, quarterly business reviews, plano de expansão de escopo." },
  { description: "Aumento custo freelancers (pressão COGS)",   probability: "HIGH",   impact: "MEDIUM", mitigation: "Contratar 1 FTE sênior em produção para reduzir dependência de outsourcing." },
  { description: "Volatilidade cambial USD/BRL (software)",    probability: "MEDIUM", impact: "LOW",    mitigation: "Monitorar via módulo FX. Considerar pagamento anual para travar taxa." },
  { description: "Atraso lançamento produto ADVISOR",          probability: "HIGH",   impact: "MEDIUM", mitigation: "MVP enxuto definido. Go/no-go decision em Jun/2026." },
];

const RISK_COLORS = {
  HIGH:   "bg-red-100 text-red-700",
  MEDIUM: "bg-amber-100 text-amber-700",
  LOW:    "bg-emerald-100 text-emerald-700",
};

export default async function BoardPackPage() {
  const dre  = await buildDreQuery("all");
  const snap = consolidated;

  const revenue      = dre.hasData ? dre.dreRevenue      : snap.revenue;
  const ebitda       = dre.hasData ? dre.dreEBITDA        : snap.ebitda;
  const grossProfit  = dre.hasData ? dre.dreGrossProfit   : snap.grossProfit;
  const gmPct        = revenue > 0 ? grossProfit / revenue : consolidatedMargins.grossMargin;
  const ebitdaPct    = revenue > 0 ? ebitda / revenue      : consolidatedMargins.ebitdaMargin;
  const budgetVar    = budgetVsActual;

  const cashBalance  = 412_000;  // from snapshot / bank
  const burnRate     = 78_000;   // monthly
  const runway       = Math.round(cashBalance / burnRate);

  const quarter = "Q1/2026";
  const nextQ   = "Q2/2026";

  return (
    <>
      <Header
        title={`Board Pack — ${quarter}`}
        subtitle="EPM · AWQ Group · Management Report · Trimestral"
      />
      <div className="page-container">

        {/* ── Cover section ─────────────────────────────────────────── */}
        <div className="card p-6 bg-gradient-to-br from-brand-600 to-brand-800 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-brand-200 mb-2">
                Relatório Trimestral para o Board
              </div>
              <h2 className="text-2xl font-bold mb-1">AWQ Group — {quarter}</h2>
              <p className="text-brand-200 text-sm">
                Consolidado · 4 Business Units · Gestão Financeira & Operacional
              </p>
            </div>
            <FileText size={32} className="text-brand-300" />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-6">
            {[
              { label: "Receita YTD",    value: fmtBRL(revenue),  color: "text-white" },
              { label: "EBITDA YTD",     value: fmtBRL(ebitda),   color: ebitda >= 0 ? "text-emerald-300" : "text-red-300" },
              { label: "Budget Var.",    value: (budgetVar >= 0 ? "+" : "") + budgetVar.toFixed(1) + "%", color: budgetVar >= 0 ? "text-emerald-300" : "text-red-300" },
            ].map((card) => (
              <div key={card.label} className="bg-white/10 rounded-xl p-3 text-center">
                <div className={`text-xl font-bold tabular-nums ${card.color}`}>{card.value}</div>
                <div className="text-xs text-brand-200 mt-1">{card.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── P&L Highlights ────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={14} className="text-emerald-600" />
            <span className="text-sm font-semibold text-gray-900">P&L Highlights — {quarter}</span>
            <span className="ml-auto text-xs text-gray-400">{dre.hasData ? "Base bancária real" : "Snapshot planejamento"}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: "Receita Bruta",   value: fmtBRL(revenue),      color: "text-emerald-700" },
              { label: "Lucro Bruto",     value: fmtBRL(grossProfit),   color: "text-brand-700"   },
              { label: "Margem Bruta",    value: pct(gmPct ?? 0),       color: "text-brand-700"   },
              { label: "EBITDA",          value: fmtBRL(ebitda),        color: ebitda >= 0 ? "text-emerald-700" : "text-red-700" },
              { label: "Margem EBITDA",   value: pct(ebitdaPct ?? 0),   color: ebitdaPct !== null && ebitdaPct >= 0.1 ? "text-emerald-700" : "text-amber-700" },
            ].map((card) => (
              <div key={card.label} className="bg-gray-50 rounded-xl p-4 text-center">
                <div className={`text-lg font-bold tabular-nums ${card.color}`}>{card.value}</div>
                <div className="text-[11px] text-gray-400 mt-1">{card.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Cash & Liquidity ──────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={14} className="text-brand-600" />
            <span className="text-sm font-semibold text-gray-900">Posição de Caixa & Liquidez</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Caixa Disponível",  value: fmtBRL(cashBalance),   color: "text-emerald-700" },
              { label: "Burn Rate Mensal",  value: fmtBRL(burnRate),      color: "text-red-700"     },
              { label: "Cash Runway",       value: runway + " meses",     color: runway > 6 ? "text-emerald-700" : "text-red-700" },
              { label: "DSO (AR)",          value: "32 dias",             color: "text-brand-700"   },
            ].map((card) => (
              <div key={card.label} className="bg-gray-50 rounded-xl p-4 text-center">
                <div className={`text-lg font-bold tabular-nums ${card.color}`}>{card.value}</div>
                <div className="text-[11px] text-gray-400 mt-1">{card.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── KPI Scorecard ─────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target size={14} className="text-violet-600" />
            <span className="text-sm font-semibold text-gray-900">KPI Scorecard — {quarter}</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: "Rule of 40",        value: "72",    target: ">40",  status: "good" as const  },
              { label: "ROIC",              value: "18.4%", target: ">15%", status: "good" as const  },
              { label: "CCC",               value: "28d",   target: "<30d", status: "good" as const  },
              { label: "Budget Var.",        value: (budgetVar >= 0 ? "+" : "") + budgetVar.toFixed(1) + "%", target: ">0%", status: budgetVar >= 0 ? "good" as const : "bad" as const },
              { label: "MRR JACQES",        value: "R$420K", target: "R$350K", status: "good" as const },
              { label: "Margem Bruta",      value: pct(gmPct ?? 0), target: ">50%", status: (gmPct ?? 0) >= 0.5 ? "good" as const : "warn" as const },
              { label: "DSO",               value: "32d",    target: "<45d", status: "good" as const  },
              { label: "Burn Rate",         value: fmtBRL(burnRate), target: "<R$90K", status: "good" as const },
            ].map((kpi) => {
              const color = kpi.status === "good" ? "text-emerald-700" : kpi.status === "warn" ? "text-amber-700" : "text-red-700";
              const bg    = kpi.status === "good" ? "bg-emerald-50" : kpi.status === "warn" ? "bg-amber-50" : "bg-red-50";
              const dot   = kpi.status === "good" ? "bg-emerald-400" : kpi.status === "warn" ? "bg-amber-400" : "bg-red-500";
              return (
                <div key={kpi.label} className={`rounded-xl p-3 ${bg}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500 font-semibold">{kpi.label}</span>
                    <span className={`w-2 h-2 rounded-full ${dot}`} />
                  </div>
                  <div className={`text-base font-bold tabular-nums ${color}`}>{kpi.value}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Target: {kpi.target}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── BU Performance ───────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={14} className="text-brand-600" />
            <span className="text-sm font-semibold text-gray-900">Performance por BU — {quarter}</span>
          </div>
          <div className="table-scroll">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">BU</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Receita</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Budget</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Var %</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">EBITDA</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-right">Margem</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { bu: "JACQES",  revenue: 3_624_000, budget: 3_400_000, ebitda: 905_000  },
                  { bu: "CAZA",    revenue:   826_800,  budget: 1_000_000, ebitda:  33_072  },
                  { bu: "ADVISOR", revenue:         0,  budget:         0, ebitda: -95_000  },
                  { bu: "VENTURE", revenue:    24_000,  budget:    24_000, ebitda:   2_400  },
                ].map((row) => {
                  const varPct    = row.budget > 0 ? ((row.revenue - row.budget) / row.budget) * 100 : 0;
                  const margin    = row.revenue > 0 ? (row.ebitda / row.revenue) * 100 : 0;
                  const onTrack   = row.budget === 0 || varPct >= -10;
                  return (
                    <tr key={row.bu} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 px-3 font-bold text-gray-900">{row.bu}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-gray-900 font-semibold">{fmtBRL(row.revenue)}</td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-gray-400">{row.budget > 0 ? fmtBRL(row.budget) : "—"}</td>
                      <td className={`py-2.5 px-3 text-right tabular-nums font-semibold ${varPct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {row.budget > 0 ? (varPct >= 0 ? "+" : "") + varPct.toFixed(1) + "%" : "—"}
                      </td>
                      <td className={`py-2.5 px-3 text-right tabular-nums font-semibold ${row.ebitda >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {fmtBRL(row.ebitda)}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-gray-500">
                        {row.revenue > 0 ? margin.toFixed(1) + "%" : "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${onTrack ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {onTrack ? "✓ OK" : "⚠ Atenção"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Strategic Initiatives ─────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <ArrowUpRight size={14} className="text-brand-600" />
            <span className="text-sm font-semibold text-gray-900">Iniciativas Estratégicas</span>
          </div>
          <div className="space-y-3">
            {INITIATIVES.map((init) => {
              const cfg  = STATUS_CFG[init.status];
              const Icon = cfg.icon;
              return (
                <div key={init.label} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50">
                  <Icon size={14} className={`${cfg.color} shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-gray-900">{init.label}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{init.update}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-gray-400">{init.owner}</div>
                    <div className="text-[10px] text-gray-400">{init.deadline}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Risk register ─────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={14} className="text-amber-600" />
            <span className="text-sm font-semibold text-gray-900">Registro de Riscos</span>
          </div>
          <div className="table-scroll">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">Risco</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-center">Probabilidade</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold text-center">Impacto</th>
                  <th className="py-2.5 px-3 text-gray-500 font-semibold">Mitigação</th>
                </tr>
              </thead>
              <tbody>
                {RISKS.map((risk, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 px-3 text-gray-700 max-w-[200px]">{risk.description}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${RISK_COLORS[risk.probability]}`}>
                        {risk.probability}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${RISK_COLORS[risk.impact]}`}>
                        {risk.impact}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-500 text-[11px] max-w-[250px]">{risk.mitigation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Next quarter outlook ──────────────────────────────────── */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={14} className="text-emerald-600" />
            <span className="text-sm font-semibold text-gray-900">Outlook — {nextQ}</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              {
                label: "Receita Projetada",
                value: fmtBRL(1_400_000),
                note: "+12% vs Q1 · 2 novos contratos pipeline",
                color: "text-emerald-700",
              },
              {
                label: "EBITDA Projetado",
                value: fmtBRL(210_000),
                note: "Margem 15% · Headcount estável",
                color: "text-brand-700",
              },
              {
                label: "Foco Operacional",
                value: "Sales + Produto",
                note: "Contratação SM + MVP ADVISOR Go/No-Go",
                color: "text-violet-700",
              },
            ].map((card) => (
              <div key={card.label} className="bg-gray-50 rounded-xl p-4">
                <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-1">{card.label}</div>
                <div className={`text-xl font-bold tabular-nums ${card.color}`}>{card.value}</div>
                <div className="text-[11px] text-gray-500 mt-1">{card.note}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <Link href="/awq/epm" className="text-brand-600 hover:underline">← EPM Overview</Link>
          <span className="text-gray-300">|</span>
          <Link href="/awq/epm/reports/annual" className="text-brand-600 hover:underline">Relatório Anual →</Link>
          <Link href="/awq/epm/kpis" className="text-brand-600 hover:underline">KPIs →</Link>
        </div>

      </div>
    </>
  );
}
