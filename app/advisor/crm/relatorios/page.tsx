"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import SectionHeader from "@/components/SectionHeader";
import Link from "next/link";
import { BarChart3, ArrowLeft, TrendingUp, DollarSign, Target, Users } from "lucide-react";
import { fetchAdvisorCRM } from "@/lib/advisor-crm-query";
import type { AdvisorCrmOpportunity, AdvisorCrmLead, AdvisorCrmClient } from "@/lib/advisor-crm-db";

function fmtCurrency(n: number): string {
  if (n >= 1_000_000) return "R$" + (n / 1_000_000).toFixed(2) + "M";
  if (n >= 1_000) return "R$" + (n / 1_000).toFixed(0) + "K";
  return "R$" + n.toLocaleString("pt-BR");
}

interface StatCard {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}

function StatCard({ label, value, sub, icon: Icon, color, bg }: StatCard) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
          <Icon size={16} className={color} />
        </div>
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  );
}

export default function AdvisorCrmRelatoriosPage() {
  const [opps,    setOpps]    = useState<AdvisorCrmOpportunity[]>([]);
  const [leads,   setLeads]   = useState<AdvisorCrmLead[]>([]);
  const [clients, setClients] = useState<AdvisorCrmClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchAdvisorCRM<AdvisorCrmOpportunity>("opportunities"),
      fetchAdvisorCRM<AdvisorCrmLead>("leads"),
      fetchAdvisorCRM<AdvisorCrmClient>("clients"),
    ]).then(([o, l, c]) => {
      setOpps(o); setLeads(l); setClients(c);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <>
        <Header title="Relatórios — Advisor" subtitle="Carregando..." />
        <div className="page-container">
          <div className="card p-8 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-gray-600 border-t-brand-400 rounded-full animate-spin" />
          </div>
        </div>
      </>
    );
  }

  const openOpps       = opps.filter(o => !o.stage.startsWith("Fechado"));
  const ganhos         = opps.filter(o => o.stage === "Fechado Ganho");
  const perdidos       = opps.filter(o => o.stage === "Fechado Perdido");
  const totalFechados  = ganhos.length + perdidos.length;
  const winRate        = totalFechados > 0 ? Math.round((ganhos.length / totalFechados) * 100) : 0;
  const pipelineTotal  = openOpps.reduce((s, o) => s + o.valor_estimado, 0);
  const revenueGanho   = ganhos.reduce((s, o) => s + o.valor_estimado, 0);
  const receitaPotencial = Math.round(openOpps.reduce((s, o) => s + o.valor_estimado * o.probabilidade / 100, 0));
  const mrrTotal       = clients.filter(c => c.status_conta === "Ativo").reduce((s, c) => s + c.fee_mensal, 0);
  const leadsAtivos    = leads.filter(l => l.status !== "Convertido" && l.status !== "Perdido").length;
  const leadsConvertidos = leads.filter(l => l.status === "Convertido").length;
  const conversionRate = leads.length > 0 ? Math.round((leadsConvertidos / leads.length) * 100) : 0;

  // Por serviço
  const byService: Record<string, { count: number; valor: number }> = {};
  opps.forEach(o => {
    const k = o.tipo_servico || "Não especificado";
    if (!byService[k]) byService[k] = { count: 0, valor: 0 };
    byService[k].count += 1;
    byService[k].valor += o.valor_estimado;
  });
  const byServiceArr = Object.entries(byService).sort((a, b) => b[1].valor - a[1].valor);
  const maxServiceVal = Math.max(...byServiceArr.map(([, v]) => v.valor), 1);

  return (
    <>
      <Header title="Relatórios — Advisor" subtitle="Análise de performance comercial" />
      <div className="page-container">

        <div className="flex items-center gap-3">
          <Link href="/advisor/crm" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300">
            <ArrowLeft size={12} /> CRM
          </Link>
          <span className="text-gray-700">/</span>
          <span className="text-xs text-gray-400">Relatórios</span>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Pipeline Total"    value={fmtCurrency(pipelineTotal)}      sub={`${openOpps.length} oportunidades abertas`} icon={BarChart3}  color="text-amber-400"   bg="bg-amber-500/10" />
          <StatCard label="Receita Potencial" value={fmtCurrency(receitaPotencial)}   sub="ponderada por probabilidade"                icon={TrendingUp} color="text-emerald-400" bg="bg-emerald-500/10" />
          <StatCard label="Revenue Fechado"   value={fmtCurrency(revenueGanho)}       sub={`${ganhos.length} deals ganhos`}            icon={DollarSign} color="text-brand-400"   bg="bg-brand-500/10" />
          <StatCard label="Win Rate"          value={`${winRate}%`}                   sub={`${totalFechados} deals fechados`}          icon={Target}     color="text-violet-400"  bg="bg-violet-500/10" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="MRR Retainers"     value={fmtCurrency(mrrTotal)}           sub={`${clients.filter(c=>c.status_conta==="Ativo").length} clientes ativos`} icon={DollarSign} color="text-teal-400"    bg="bg-teal-500/10" />
          <StatCard label="Leads Ativos"      value={String(leadsAtivos)}             sub={`${leadsConvertidos} convertidos`}          icon={Users}      color="text-blue-400"    bg="bg-blue-500/10" />
          <StatCard label="Taxa Conversão"    value={`${conversionRate}%`}            sub="leads → oportunidades"                     icon={TrendingUp} color="text-orange-400"  bg="bg-orange-500/10" />
          <StatCard label="Clientes Ativos"   value={String(clients.filter(c=>c.status_conta==="Ativo").length)} sub="carteira atual" icon={Users}      color="text-emerald-400" bg="bg-emerald-500/10" />
        </div>

        {/* Por tipo de serviço */}
        {byServiceArr.length > 0 && (
          <div className="card p-5">
            <SectionHeader icon={<BarChart3 size={15} />} title="Pipeline por Tipo de Serviço" />
            <div className="space-y-3 mt-3">
              {byServiceArr.map(([service, data]) => (
                <div key={service} className="flex items-center gap-3">
                  <div className="w-40 shrink-0 text-[11px] font-medium text-gray-400 text-right truncate">{service}</div>
                  <div className="flex-1 h-6 bg-gray-800/60 rounded-lg overflow-hidden relative">
                    <div className="h-full rounded-lg bg-brand-500/60 transition-all duration-500"
                      style={{ width: `${(data.valor / maxServiceVal) * 100}%` }} />
                    {data.count > 0 && (
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/90">
                        {data.count} opp{data.count !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div className="w-20 shrink-0 text-right text-[11px] font-semibold text-amber-400">
                    {fmtCurrency(data.valor)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
