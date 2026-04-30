"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, DollarSign, Target, Users } from "lucide-react";
import type { CrmOpportunity } from "@/lib/crm-types";
import { SEED_OPPORTUNITIES } from "@/lib/crm-db";

function fmtBRL(n: number) {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000)     return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

const STAGE_PT: Record<string, string> = {
  discovery:"Discovery", qualification:"Qual.", proposal:"Proposal", negotiation:"Negoc.", closed_won:"Won", closed_lost:"Lost",
};
const STAGE_COLORS: Record<string, string> = {
  discovery:"#3b82f6", qualification:"#8b5cf6", proposal:"#f59e0b", negotiation:"#f97316", closed_won:"#10b981", closed_lost:"#ef4444",
};
const BU_COLORS: Record<string, string> = {
  JACQES:"#3b82f6", CAZA:"#8b5cf6", ADVISOR:"#10b981", VENTURE:"#f59e0b",
};

type Analytics = {
  leadsNew: number; openOpportunities: number; pipelineValue: number;
  weightedForecast: number; closedWonThisMonth: number; revenueThisMonth: number; winRate: number;
  byBU: Record<string, { count: number; value: number; weighted: number }>;
  byStage: Record<string, { count: number; value: number; weighted: number }>;
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [opps, setOpps] = useState<CrmOpportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/crm/analytics").then(r=>r.json()),
      fetch("/api/crm/opportunities").then(r=>r.json()),
    ])
      .then(([ana, opp]) => {
        setData(ana.success ? ana.data : null);
        setOpps(opp.success ? opp.data : SEED_OPPORTUNITIES);
      })
      .catch(() => setOpps(SEED_OPPORTUNITIES))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <>
      <Header title="Analytics — CRM AWQ" subtitle="Métricas de pipeline e performance" />
      <div className="page-container">
        <div className="card p-8 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-brand-500 rounded-full animate-spin" />
        </div>
      </div>
    </>
  );

  // Compute from opps if no API data
  const open = opps.filter(o=>o.stage!=="closed_won"&&o.stage!=="closed_lost");
  const won  = opps.filter(o=>o.stage==="closed_won");
  const closed = opps.filter(o=>o.stage==="closed_won"||o.stage==="closed_lost");
  const metrics = data ?? {
    leadsNew: 0,
    openOpportunities: open.length,
    pipelineValue: open.reduce((s,o)=>s+o.deal_value,0),
    weightedForecast: open.reduce((s,o)=>s+o.deal_value*o.probability/100,0),
    closedWonThisMonth: won.length,
    revenueThisMonth: won.reduce((s,o)=>s+o.deal_value,0),
    winRate: closed.length>0?Math.round(won.length/closed.length*100):0,
    byBU: {},
    byStage: {},
  };

  // Pipeline by stage chart data
  const stageData = ["discovery","qualification","proposal","negotiation"].map(s => ({
    stage: STAGE_PT[s],
    value: data?.byStage[s]?.value ?? opps.filter(o=>o.stage===s).reduce((sum,o)=>sum+o.deal_value,0),
    count: data?.byStage[s]?.count ?? opps.filter(o=>o.stage===s).length,
    weighted: data?.byStage[s]?.weighted ?? opps.filter(o=>o.stage===s).reduce((sum,o)=>sum+o.deal_value*o.probability/100,0),
    color: ["#3b82f6","#8b5cf6","#f59e0b","#f97316"][["discovery","qualification","proposal","negotiation"].indexOf(s)],
  }));

  // By BU chart
  const buData = ["JACQES","CAZA","ADVISOR","VENTURE"].map(bu => ({
    bu,
    value: data?.byBU[bu]?.value ?? opps.filter(o=>o.bu===bu&&o.stage!=="closed_won"&&o.stage!=="closed_lost").reduce((s,o)=>s+o.deal_value,0),
    count: data?.byBU[bu]?.count ?? opps.filter(o=>o.bu===bu&&o.stage!=="closed_won"&&o.stage!=="closed_lost").length,
    color: BU_COLORS[bu],
  }));

  // Rep performance
  const reps = ["Miguel","Danilo"].map(r => {
    const myOpps = opps.filter(o=>o.owner===r);
    const myOpen = myOpps.filter(o=>o.stage!=="closed_won"&&o.stage!=="closed_lost");
    const myWon  = myOpps.filter(o=>o.stage==="closed_won");
    const myLost = myOpps.filter(o=>o.stage==="closed_lost");
    const myClosed = myWon.length + myLost.length;
    return {
      name: r,
      pipeline: myOpen.reduce((s,o)=>s+o.deal_value,0),
      won: myWon.reduce((s,o)=>s+o.deal_value,0),
      deals: myOpen.length,
      wonDeals: myWon.length,
      winRate: myClosed>0?Math.round(myWon.length/myClosed*100):0,
    };
  });

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg text-xs">
          <p className="font-semibold text-gray-900 mb-1">{label}</p>
          <p className="text-gray-600">{fmtBRL(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <Header title="Analytics — CRM AWQ" subtitle="Métricas de pipeline e performance de vendas" />
      <div className="page-container">

        {/* KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Pipeline Aberto",    value: fmtBRL(metrics.pipelineValue),    icon: DollarSign, color:"text-blue-600",    bg:"bg-blue-50" },
            { label: "Forecast Ponderado", value: fmtBRL(metrics.weightedForecast), icon: TrendingUp, color:"text-emerald-600", bg:"bg-emerald-50" },
            { label: "Deals Abertos",      value: metrics.openOpportunities,        icon: Target,     color:"text-violet-600",  bg:"bg-violet-50" },
            { label: "Win Rate Geral",     value: `${metrics.winRate}%`,            icon: TrendingUp, color:"text-amber-600",   bg:"bg-amber-50" },
          ].map(k => (
            <div key={k.label} className="card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center shrink-0`}>
                <k.icon size={16} className={k.color} />
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">{k.value}</div>
                <div className="text-[10px] text-gray-500">{k.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* Pipeline por Stage */}
          <div className="card p-5">
            <SectionHeader icon={<BarChart size={14} className="text-blue-500" />} title="Pipeline por Estágio (R$)" />
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stageData} margin={{ top:0, right:0, bottom:0, left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="stage" tick={{ fontSize:11, fill:"#6b7280" }} />
                <YAxis tickFormatter={v=>fmtBRL(v)} tick={{ fontSize:10, fill:"#9ca3af" }} width={55} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[6,6,0,0]}>
                  {stageData.map((entry,i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {stageData.map(s => (
                <div key={s.stage} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                    <span className="text-[11px] text-gray-600">{s.stage}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-bold text-gray-900">{fmtBRL(s.value)}</div>
                    <div className="text-[9px] text-gray-400">{s.count} deals</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline por BU */}
          <div className="card p-5">
            <SectionHeader icon={<Target size={14} className="text-violet-500" />} title="Pipeline por BU (R$)" />
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={buData} margin={{ top:0, right:0, bottom:0, left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="bu" tick={{ fontSize:11, fill:"#6b7280" }} />
                <YAxis tickFormatter={v=>fmtBRL(v)} tick={{ fontSize:10, fill:"#9ca3af" }} width={55} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[6,6,0,0]}>
                  {buData.map((entry,i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {buData.map(b => (
                <div key={b.bu} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: b.color }} />
                    <span className="text-[11px] text-gray-600">{b.bu}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-bold text-gray-900">{fmtBRL(b.value)}</div>
                    <div className="text-[9px] text-gray-400">{b.count} deals</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Rep Performance */}
        <div className="card p-5">
          <SectionHeader icon={<Users size={14} className="text-emerald-500" />} title="Performance por Rep" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {reps.map(rep => (
              <div key={rep.name} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-sm font-bold text-brand-700">
                    {rep.name[0]}
                  </div>
                  <span className="font-semibold text-gray-900">{rep.name}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Pipeline", value: fmtBRL(rep.pipeline) },
                    { label: "Won", value: fmtBRL(rep.won) },
                    { label: "Deals abertos", value: rep.deals },
                    { label: "Win Rate", value: `${rep.winRate}%` },
                  ].map(m => (
                    <div key={m.label}>
                      <div className="text-[10px] text-gray-500">{m.label}</div>
                      <div className="text-sm font-bold text-gray-900">{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* This Month */}
        <div className="card p-5">
          <SectionHeader icon={<TrendingUp size={14} className="text-amber-500" />} title="Este Mês" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Deals Ganhos",   value: metrics.closedWonThisMonth, color:"text-emerald-600" },
              { label: "Receita Gerada", value: fmtBRL(metrics.revenueThisMonth), color:"text-emerald-600" },
              { label: "Leads Novos",    value: metrics.leadsNew, color:"text-blue-600" },
              { label: "Win Rate",       value: `${metrics.winRate}%`, color:"text-amber-600" },
            ].map(m => (
              <div key={m.label} className="text-center p-3 bg-gray-50 rounded-xl">
                <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
                <div className="text-[11px] text-gray-500 mt-0.5">{m.label}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
