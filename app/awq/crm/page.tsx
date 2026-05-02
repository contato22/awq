"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import Link from "next/link";
import {
  BarChart3, DollarSign, Target, Users, TrendingUp,
  Building2, ArrowRight, Layers,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BuMetrics {
  bu_code: string;
  bu_name: string;
  href: string;
  color: string;
  leads_ativos: number;
  opps_abertas: number;
  pipeline_total: number;
  clientes_ativos: number;
  mrr: number;
  won_count: number;
  lost_count: number;
  win_rate: number;
}

interface ConsolidatedData {
  bus: BuMetrics[];
  totals: {
    pipeline_total: number;
    opps_abertas: number;
    leads_ativos: number;
    clientes_ativos: number;
    mrr_total: number;
    won_total: number;
  };
  source: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCurrency(n: number): string {
  if (n >= 1_000_000_000) return "R$" + (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

const BU_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  blue:   { bg: "bg-blue-500/10",   text: "text-blue-400",   border: "border-blue-700/50",   dot: "bg-blue-400"   },
  purple: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-700/50", dot: "bg-purple-400" },
  violet: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-700/50", dot: "bg-violet-400" },
  orange: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-700/50", dot: "bg-orange-400" },
};

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  sub?: string;
}

function KpiCard({ label, value, icon: Icon, iconColor, iconBg, sub }: KpiCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
          <Icon size={16} className={iconColor} />
        </div>
      </div>
      <div className={`text-2xl font-bold ${iconColor}`}>{value}</div>
      <div className="text-[11px] font-medium text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-gray-600 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AwqCrmConsolidatedPage() {
  const [data,    setData]    = useState<ConsolidatedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/awq/crm/consolidated")
      .then((r) => r.json())
      .then((json) => {
        if (json.bus) {
          setData(json as ConsolidatedData);
        } else {
          setError(json.error ?? "Erro ao carregar dados");
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e));
        setLoading(false);
      });
  }, []);

  const maxPipeline = data
    ? Math.max(...data.bus.map((b) => b.pipeline_total), 1)
    : 1;

  return (
    <>
      <Header
        title="CRM Consolidado — AWQ Group"
        subtitle="Visão unificada de todas as Business Units"
      />
      <div className="page-container">

        {/* Quick access BU links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: "/jacqes/crm",      label: "JACQES",      sub: "Agência",      color: "blue"   },
            { href: "/caza-vision/crm", label: "Caza Vision", sub: "Produtora",    color: "purple" },
            { href: "/advisor/crm",     label: "Advisor",     sub: "Consultoria",  color: "violet" },
            { href: "/awq-venture/crm", label: "AWQ Venture", sub: "M4E Deals",    color: "orange" },
          ].map((bu) => {
            const cfg = BU_COLORS[bu.color];
            return (
              <Link
                key={bu.href}
                href={bu.href}
                className={`flex items-center justify-between p-4 rounded-xl border ${cfg.border} ${cfg.bg} hover:opacity-90 transition-opacity group`}
              >
                <div>
                  <div className={`text-sm font-bold ${cfg.text}`}>{bu.label}</div>
                  <div className="text-[11px] text-gray-500">{bu.sub}</div>
                </div>
                <ArrowRight size={14} className={`${cfg.text} opacity-50 group-hover:opacity-100 transition-opacity`} />
              </Link>
            );
          })}
        </div>

        {/* KPIs consolidados */}
        {loading ? (
          <div className="card p-12 flex items-center justify-center">
            <div className="flex items-center gap-3 text-gray-500">
              <div className="w-4 h-4 border-2 border-gray-600 border-t-brand-400 rounded-full animate-spin" />
              <span className="text-sm">Carregando métricas consolidadas…</span>
            </div>
          </div>
        ) : error ? (
          <div className="card p-8 text-center">
            <div className="text-amber-400 text-sm font-semibold mb-2">Dados indisponíveis</div>
            <div className="text-gray-500 text-xs">{error}</div>
            <div className="text-gray-600 text-xs mt-2">
              Verifique os CRMs individuais de cada BU nos links acima.
            </div>
          </div>
        ) : data ? (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <KpiCard label="Pipeline Total"     value={fmtCurrency(data.totals.pipeline_total)}  icon={BarChart3}  iconColor="text-amber-400"   iconBg="bg-amber-500/10" sub="todas as BUs" />
              <KpiCard label="MRR Total"          value={fmtCurrency(data.totals.mrr_total)}       icon={DollarSign} iconColor="text-emerald-400" iconBg="bg-emerald-500/10" sub="retainers ativos" />
              <KpiCard label="Oportunidades"      value={data.totals.opps_abertas}                 icon={Target}     iconColor="text-brand-400"   iconBg="bg-brand-500/10" sub="abertas" />
              <KpiCard label="Leads Ativos"       value={data.totals.leads_ativos}                 icon={Users}      iconColor="text-blue-400"    iconBg="bg-blue-500/10" />
              <KpiCard label="Clientes"           value={data.totals.clientes_ativos}              icon={Building2}  iconColor="text-teal-400"    iconBg="bg-teal-500/10" sub="ativos" />
              <KpiCard label="Deals Fechados"     value={data.totals.won_total}                    icon={TrendingUp} iconColor="text-violet-400"  iconBg="bg-violet-500/10" sub="total acumulado" />
            </div>

            {/* Pipeline por BU (bar chart visual) */}
            <div className="card p-5">
              <SectionHeader icon={<Layers size={15} />} title="Pipeline por Business Unit" />
              <div className="space-y-4 mt-3">
                {data.bus.map((bu) => {
                  const cfg = BU_COLORS[bu.color] ?? BU_COLORS.blue;
                  const pct = (bu.pipeline_total / maxPipeline) * 100;
                  return (
                    <div key={bu.bu_code} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Link href={bu.href} className={`text-[12px] font-semibold ${cfg.text} hover:underline`}>
                          {bu.bu_name}
                        </Link>
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="text-gray-500">{bu.opps_abertas} opps</span>
                          <span className="text-gray-500">{bu.win_rate}% win rate</span>
                          <span className={`font-bold ${cfg.text}`}>{fmtCurrency(bu.pipeline_total)}</span>
                        </div>
                      </div>
                      <div className="h-5 bg-gray-800/60 rounded-lg overflow-hidden">
                        <div
                          className={`h-full rounded-lg ${cfg.dot} transition-all duration-700`}
                          style={{ width: `${Math.max(pct, bu.pipeline_total > 0 ? 2 : 0)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Comparison table */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800">
                <h3 className="text-sm font-bold text-gray-200">Comparação Detalhada</h3>
              </div>
              <div className="table-scroll">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-800/30">
                      <th className="text-left py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase">BU</th>
                      <th className="text-right py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase">Pipeline</th>
                      <th className="text-right py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase">MRR</th>
                      <th className="text-center py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase">Opps</th>
                      <th className="text-center py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase">Leads</th>
                      <th className="text-center py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase">Clientes</th>
                      <th className="text-center py-3 px-4 text-[10px] font-semibold text-gray-500 uppercase">Win Rate</th>
                      <th className="py-3 px-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.bus.map((bu) => {
                      const cfg = BU_COLORS[bu.color] ?? BU_COLORS.blue;
                      return (
                        <tr key={bu.bu_code} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                              <span className={`text-[12px] font-semibold ${cfg.text}`}>{bu.bu_name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right text-[12px] font-semibold text-amber-400">
                            {fmtCurrency(bu.pipeline_total)}
                          </td>
                          <td className="py-3 px-4 text-right text-[12px] text-emerald-400">
                            {bu.mrr > 0 ? fmtCurrency(bu.mrr) : "—"}
                          </td>
                          <td className="py-3 px-4 text-center text-[12px] text-gray-300">{bu.opps_abertas}</td>
                          <td className="py-3 px-4 text-center text-[12px] text-gray-300">{bu.leads_ativos}</td>
                          <td className="py-3 px-4 text-center text-[12px] text-gray-300">
                            {bu.clientes_ativos > 0 ? bu.clientes_ativos : "—"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`text-[12px] font-semibold ${bu.win_rate >= 50 ? "text-emerald-400" : bu.win_rate > 0 ? "text-amber-400" : "text-gray-600"}`}>
                              {bu.win_rate > 0 ? `${bu.win_rate}%` : "—"}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Link href={bu.href}
                              className={`inline-flex items-center gap-1 text-[10px] font-medium ${cfg.text} hover:underline`}>
                              Acessar <ArrowRight size={10} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Total row */}
                    <tr className="bg-gray-800/40">
                      <td className="py-3 px-4 text-[12px] font-bold text-gray-200">AWQ Group Total</td>
                      <td className="py-3 px-4 text-right text-[12px] font-bold text-amber-400">
                        {fmtCurrency(data.totals.pipeline_total)}
                      </td>
                      <td className="py-3 px-4 text-right text-[12px] font-bold text-emerald-400">
                        {fmtCurrency(data.totals.mrr_total)}
                      </td>
                      <td className="py-3 px-4 text-center text-[12px] font-bold text-gray-200">{data.totals.opps_abertas}</td>
                      <td className="py-3 px-4 text-center text-[12px] font-bold text-gray-200">{data.totals.leads_ativos}</td>
                      <td className="py-3 px-4 text-center text-[12px] font-bold text-gray-200">{data.totals.clientes_ativos}</td>
                      <td className="py-3 px-4" />
                      <td className="py-3 px-4" />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
