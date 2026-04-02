import Header from "@/components/Header";
import { customers } from "@/lib/data";
import { HeartPulse, Users, AlertTriangle, TrendingUp, CheckCircle2, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";

function fmtCurrency(n: number) {
  if (n >= 1_000_000) return "$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "$" + (n / 1_000).toFixed(0) + "K";
  return "$" + n;
}

const healthScores = [
  { account: "Nexus Corp",       score: 92, trend: "up",   nps: 72, tickets: 2,  lastTouch: "2026-03-28" },
  { account: "Zenith Digital",   score: 85, trend: "up",   nps: 65, tickets: 4,  lastTouch: "2026-03-25" },
  { account: "EuroVenture GmbH", score: 88, trend: "stable", nps: 68, tickets: 1, lastTouch: "2026-03-30" },
  { account: "Shibuya Solutions", score: 79, trend: "stable", nps: 58, tickets: 3, lastTouch: "2026-03-22" },
  { account: "Baltic Systems",   score: 76, trend: "up",   nps: 55, tickets: 5,  lastTouch: "2026-03-20" },
  { account: "Stellar Labs",     score: 42, trend: "down", nps: 28, tickets: 12, lastTouch: "2026-02-15" },
  { account: "AfricaTech Hub",   score: 38, trend: "down", nps: 22, tickets: 8,  lastTouch: "2026-01-10" },
  { account: "LatamScale",       score: 0,  trend: "down", nps: 0,  tickets: 0,  lastTouch: "2025-11-30" },
];

const csMetrics = [
  { month: "Jan/26", nps: 58, csat: 4.2, tickets: 34, resolved: 31, avgResolution: 4.2 },
  { month: "Fev/26", nps: 62, csat: 4.3, tickets: 28, resolved: 27, avgResolution: 3.8 },
  { month: "Mar/26", nps: 65, csat: 4.4, tickets: 22, resolved: 21, avgResolution: 3.1 },
];

const playbooks = [
  { name: "Onboarding 30-60-90",    status: "active",   accounts: 2, description: "Novos clientes: marcos de adoção em 30, 60 e 90 dias" },
  { name: "At-Risk Recovery",       status: "active",   accounts: 2, description: "Clientes com health score < 50: intervenção imediata" },
  { name: "Expansion Play",         status: "active",   accounts: 3, description: "Clientes maduros: upsell de módulos e upgrade de plano" },
  { name: "Churn Post-Mortem",      status: "completed", accounts: 1, description: "Análise pós-churn: root cause e lições aprendidas" },
];

export default function CsOpsPage() {
  const active = healthScores.filter((h) => h.score > 0);
  const avgHealth = Math.round(active.reduce((s, h) => s + h.score, 0) / active.length);
  const atRisk = healthScores.filter((h) => h.score > 0 && h.score < 50).length;
  const lastNps = csMetrics[csMetrics.length - 1].nps;

  return (
    <>
      <Header title="CS Ops" subtitle="Customer Success Operations — JACQES" />
      <div className="px-8 py-6 space-y-6">

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {[
            { label: "Health Score Médio", value: String(avgHealth), icon: HeartPulse, color: "text-brand-600" },
            { label: "NPS Atual", value: String(lastNps), icon: TrendingUp, color: "text-emerald-600" },
            { label: "Contas Ativas", value: String(active.length), icon: Users, color: "text-violet-700" },
            { label: "Em Risco", value: String(atRisk), icon: AlertTriangle, color: "text-amber-700" },
          ].map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="card p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0"><Icon size={18} className={kpi.color} /></div>
                <div>
                  <div className="text-xl font-bold text-slate-800">{kpi.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Health scores table */}
        <div className="card-elevated p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-4">Health Score por Conta</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-800">
                <th className="text-left py-2 px-3 text-xs font-semibold text-white">Conta</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-white">Score</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-white">Tendência</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-white">NPS</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-white">Tickets</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-white">Último Contato</th>
              </tr>
            </thead>
            <tbody>
              {healthScores.map((h, idx) => {
                const scoreColor = h.score >= 70 ? "text-emerald-600" : h.score >= 50 ? "text-amber-700" : h.score > 0 ? "text-red-600" : "text-gray-300";
                return (
                  <tr key={h.account} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${idx % 2 === 1 ? "bg-gray-50/60" : ""}`}>
                    <td className="py-2.5 px-3 text-xs font-medium text-gray-800">{h.account}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`text-xs font-bold ${scoreColor}`}>{h.score > 0 ? h.score : "—"}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      {h.trend === "up" && <ArrowUpRight size={12} className="text-emerald-600" />}
                      {h.trend === "down" && <ArrowDownRight size={12} className="text-red-600" />}
                      {h.trend === "stable" && <span className="text-[10px] text-gray-500">—</span>}
                    </td>
                    <td className="py-2.5 px-3 text-right text-xs text-gray-500">{h.nps > 0 ? h.nps : "—"}</td>
                    <td className="py-2.5 px-3 text-right text-xs text-gray-500">{h.tickets > 0 ? h.tickets : "—"}</td>
                    <td className="py-2.5 px-3 text-xs text-gray-500">{h.lastTouch}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* CS metrics trend */}
          <div className="card-elevated p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-4">Evolução CS — Últimos 3 Meses</h2>
            <div className="grid grid-cols-3 gap-3">
              {csMetrics.map((m) => (
                <div key={m.month} className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="text-[10px] text-gray-500 mb-2">{m.month}</div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">NPS</span>
                      <span className="text-xs font-bold text-slate-800">{m.nps}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">CSAT</span>
                      <span className="text-xs font-bold text-slate-800">{m.csat}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">Tickets</span>
                      <span className="text-xs font-semibold text-gray-600">{m.resolved}/{m.tickets}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-500">Tempo Res.</span>
                      <span className="text-xs font-semibold text-gray-600">{m.avgResolution}h</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Playbooks */}
          <div className="card-elevated p-5">
            <h2 className="text-sm font-bold text-slate-800 mb-4">Playbooks Ativos</h2>
            <div className="space-y-3">
              {playbooks.map((p) => (
                <div key={p.name} className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {p.status === "active" ? (
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      ) : (
                        <CheckCircle2 size={10} className="text-gray-500" />
                      )}
                      <span className="text-xs font-semibold text-gray-800">{p.name}</span>
                    </div>
                    <span className="text-[10px] text-gray-500">{p.accounts} conta{p.accounts !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="text-[11px] text-gray-500 ml-4">{p.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
