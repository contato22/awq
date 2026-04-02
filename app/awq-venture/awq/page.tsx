import Header from "@/components/Header";
import { Zap, DollarSign, TrendingUp, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

function fmtR(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n;
}

const metrics = [
  { label: "AUM Target",       value: "R$50-100M",  icon: DollarSign, color: "text-emerald-600", bg: "bg-slate-100" },
  { label: "IRR Target",       value: "25-35%",     icon: TrendingUp, color: "text-brand-600",   bg: "bg-slate-100" },
  { label: "MOIC Target",      value: "3-5x",       icon: Zap,        color: "text-amber-700",   bg: "bg-slate-100" },
  { label: "Check Size",       value: "R$1-5M",     icon: DollarSign, color: "text-violet-700",  bg: "bg-slate-100" },
];

const milestones = [
  { label: "Estrutura legal",             status: "done",    date: "Q1/26" },
  { label: "CVM Registration",            status: "progress", date: "Q1/26" },
  { label: "LP Outreach — Fase 1",        status: "progress", date: "Q1-Q2/26" },
  { label: "First Close",                 status: "pending",  date: "Q2/26" },
  { label: "Primeiro deployment",          status: "pending",  date: "Q2/26" },
  { label: "Primeiras 3-5 companies",     status: "pending",  date: "Q3/26" },
];

const thesis = [
  { area: "B2B SaaS",        rationale: "JACQES como prova viva. Operator-led advantage." },
  { area: "Content Tech",    rationale: "Caza Vision como proof-of-concept. Mercado em expansão." },
  { area: "PropTech",        rationale: "Real assets + tech. Ciclo longo, upside assimétrico." },
  { area: "Creator Economy", rationale: "Mercado LatAm em formação. Early-mover optionality." },
];

export default function VentureAwqPage() {
  return (
    <>
      <Header title="AWQ Venture — Visão Holding" subtitle="Status do sleeve de captura dentro da AWQ" />
      <div className="px-8 py-6 space-y-6">

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {metrics.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="card-elevated p-5 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${kpi.bg} flex items-center justify-center shrink-0`}><Icon size={18} className={kpi.color} /></div>
                <div>
                  <div className="text-xl font-bold text-slate-800">{kpi.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="card-elevated p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-4">Milestones — Roadmap Q1-Q3 2026</h2>
            <div className="space-y-3">
              {milestones.map((m) => (
                <div key={m.label} className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    m.status === "done" ? "bg-emerald-100" : m.status === "progress" ? "bg-amber-100" : "bg-gray-100"
                  }`}>
                    {m.status === "done" ? <CheckCircle2 size={12} className="text-emerald-600" /> :
                     m.status === "progress" ? <Clock size={12} className="text-amber-700" /> :
                     <Clock size={12} className="text-gray-500" />}
                  </div>
                  <div className="flex-1">
                    <div className={`text-xs font-medium ${m.status === "pending" ? "text-gray-500" : "text-gray-800"}`}>{m.label}</div>
                    <div className="text-[10px] text-gray-500">{m.date}</div>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    m.status === "done" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" :
                    m.status === "progress" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                    "bg-gray-100 text-gray-500"
                  }`}>
                    {m.status === "done" ? "Concluído" : m.status === "progress" ? "Em andamento" : "Pendente"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="card-elevated p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-4">Tese de Investimento</h2>
            <div className="space-y-4">
              {thesis.map((t) => (
                <div key={t.area} className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="text-xs font-semibold text-gray-800 mb-1">{t.area}</div>
                  <div className="text-[11px] text-gray-500 leading-relaxed">{t.rationale}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-2 text-xs text-amber-800">
                <AlertTriangle size={13} />
                <span className="font-semibold">Diferencial: Operator-led fund</span>
              </div>
              <div className="text-[10px] text-amber-700 mt-1">JACQES + Caza Vision como prova viva da tese. Só funciona se os sleeves operacionais estiverem saudáveis.</div>
            </div>
          </div>
        </div>

        <div className="card-elevated p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-3">Arquitetura do Fundo</h2>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { label: "Veículo", value: "Micro-VC" },
              { label: "Modelo", value: "2/20" },
              { label: "Investimento", value: "5 anos" },
              { label: "Vida do Fundo", value: "10 anos" },
              { label: "Foco Geográfico", value: "LatAm" },
              { label: "Estágio", value: "Early-stage / Growth" },
              { label: "LP Target", value: "Family Offices, Corporates, FoFs" },
              { label: "Status", value: "Estruturação" },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                <div className="text-[10px] text-gray-500">{item.label}</div>
                <div className="text-xs font-semibold text-gray-800 mt-0.5">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
