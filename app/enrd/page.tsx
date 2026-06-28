"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import Header from "@/components/Header";
import EnrdMontagemSummaryCard from "@/components/EnrdMontagemSummaryCard";
import {
  Zap, Users, DollarSign, TrendingUp, ChevronRight,
  LineChart, Scale, Target, PieChart,
  ArrowDownLeft, ArrowUpRight, ListOrdered,
  Landmark, Activity, Package, Lock,
  LayoutGrid, Briefcase, BarChart3, CheckCircle2,
} from "lucide-react";

const BASE_EPM_MODULES = [
  { label: "Financial (ENRD)",    sub: "Dados da BU · Estruturação",   href: "/enrd/financial",              color: "text-orange-600",  bg: "bg-orange-50"  },
  { label: "P&L (DRE)",          sub: "Demonstração de Resultado",     href: "/awq/epm/pl",                  color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Balanço Patrimonial",sub: "Ativo = Passivo + PL",          href: "/awq/epm/balance-sheet",       color: "text-brand-600",   bg: "bg-brand-50"   },
  { label: "Budget vs Actual",   sub: "Variance analysis",             href: "/awq/epm/budget",              color: "text-brand-600",   bg: "bg-brand-50"   },
  { label: "KPI Dashboard",      sub: "MRR, EBITDA, Runway…",          href: "/awq/epm/kpis",                color: "text-cyan-700",    bg: "bg-cyan-50"    },
  { label: "Contas a Pagar",     sub: "AP · Aging · DPO",              href: "/awq/epm/ap",                  color: "text-red-600",     bg: "bg-red-50"     },
  { label: "Contas a Receber",   sub: "AR · Aging · DSO",              href: "/awq/epm/ar",                  color: "text-emerald-600", bg: "bg-emerald-50" },
  { label: "Razão Geral (GL)",   sub: "Lançamentos contábeis",         href: "/awq/epm/gl",                  color: "text-amber-700",   bg: "bg-amber-50"   },
  { label: "Conciliação Bancária",sub: "Auto-match transações × AP/AR",href: "/awq/epm/bank-reconciliation", color: "text-cyan-700",    bg: "bg-cyan-50"    },
  { label: "Forecast",           sub: "13-Week Cash · Driver-Based",   href: "/awq/epm/forecast",            color: "text-brand-600",   bg: "bg-brand-50"   },
  { label: "Ativo Imobilizado",  sub: "CAPEX · Depreciação",           href: "/awq/epm/fixed-assets",        color: "text-orange-600",  bg: "bg-orange-50"  },
  { label: "Centros de Custo",   sub: "CC por BU e categoria",         href: "/awq/epm/cost-centers",        color: "text-orange-600",  bg: "bg-orange-50"  },
  { label: "Fechamento Períodos",sub: "Open → Reviewing → Locked",     href: "/awq/epm/periods",             color: "text-gray-700",    bg: "bg-gray-100"   },
];

const CORA_MODULE = { label: "Cora · Conciliação", sub: "Sync bancário Cora · ENRD", href: "/enrd/conciliacao", color: "text-cyan-700", bg: "bg-cyan-50" };

const iconMap: Record<string, React.ElementType> = {
  "/enrd/financial":              DollarSign,
  "/awq/epm/pl":                  LineChart,
  "/awq/epm/balance-sheet":       Scale,
  "/awq/epm/budget":              Target,
  "/awq/epm/kpis":                PieChart,
  "/awq/epm/ap":                  ArrowDownLeft,
  "/awq/epm/ar":                  ArrowUpRight,
  "/awq/epm/gl":                  ListOrdered,
  "/awq/epm/bank-reconciliation": Landmark,
  "/enrd/conciliacao":            CheckCircle2,
  "/awq/epm/forecast":            Activity,
  "/awq/epm/fixed-assets":        Package,
  "/awq/epm/cost-centers":        LayoutGrid,
  "/awq/epm/periods":             Lock,
};

export default function EnrdPage() {
  const { data: session } = useSession();
  const isEnrdOnly = (session?.user as { role?: string } | undefined)?.role === "enrd";

  const EPM_MODULES = isEnrdOnly
    ? BASE_EPM_MODULES
    : [...BASE_EPM_MODULES.slice(0, 9), CORA_MODULE, ...BASE_EPM_MODULES.slice(9)];

  const kpis = [
    { label: "Receita YTD",   value: "—", icon: DollarSign },
    { label: "Clientes",      value: "—", icon: Users      },
    { label: "EBITDA %",      value: "—", icon: TrendingUp },
  ];

  return (
    <>
      <Header title="ENRD" subtitle="Agência Solar · AWQ Group" />
      <div className="page-container">

        {/* Quick access pills */}
        <section className="flex flex-wrap gap-2">
          {[
            { label: "Financial",     href: "/enrd/financial",        icon: DollarSign,   color: "text-orange-600",  bg: "bg-orange-50"  },
            { label: "CRM Clientes",  href: "/enrd/customers",        icon: Users,        color: "text-brand-600",   bg: "bg-brand-50"   },
            { label: "Leads",         href: "/crm/leads?bu=ENRD",     icon: TrendingUp,   color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Pipeline",      href: "/crm/pipeline",          icon: Target,       color: "text-brand-600",   bg: "bg-brand-50"   },
            { label: "PPM Portfolio", href: "/awq/ppm?bu=ENRD",       icon: Briefcase,    color: "text-cyan-700",    bg: "bg-cyan-50"    },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 h-10 rounded-xl text-xs font-semibold transition-all duration-150 ${item.bg} ${item.color} hover:brightness-95`}
              >
                <Icon size={15} />
                {item.label}
              </Link>
            );
          })}
        </section>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="card p-5 flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center shrink-0">
                <kpi.icon size={16} className="text-orange-700" />
              </div>
              <div>
                <div className="text-xl font-bold text-gray-900">{kpi.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{kpi.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Resumo Controle de Montagem (espelho do portal gestão) — owner/admin */}
        {!isEnrdOnly && <EnrdMontagemSummaryCard />}

        {/* EPM Modules grid */}
        <section>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Módulos EPM
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {EPM_MODULES.map((mod) => {
              const Icon = iconMap[mod.href] ?? DollarSign;
              return (
                <Link key={mod.href} href={mod.href}
                  className="card-interactive p-4 flex flex-col gap-2 group">
                  <div className="flex items-center justify-between">
                    <div className={`w-8 h-8 rounded-lg ${mod.bg} flex items-center justify-center`}>
                      <Icon size={14} className={mod.color} />
                    </div>
                    <ChevronRight size={13} className="text-gray-300 group-hover:text-brand-500 transition-colors" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-900 group-hover:text-brand-700 transition-colors leading-tight">
                      {mod.label}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate">{mod.sub}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* CRM + PPM */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <section className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users size={14} className="text-brand-600" />
              <h2 className="text-base font-semibold text-gray-900">CRM</h2>
            </div>
            <div className="space-y-1">
              {[
                { label: "Clientes",      sub: "Cadastro ENRD",      href: "/enrd/customers"      },
                { label: "Dashboard CRM", sub: "Visão geral vendas",  href: "/crm"                 },
                { label: "Leads",         sub: "Leads ENRD",         href: "/crm/leads?bu=ENRD"   },
                { label: "Pipeline",      sub: "Oportunidades",       href: "/crm/pipeline"        },
              ].map((item) => (
                <Link key={item.href} href={item.href}
                  className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div>
                    <div className="text-xs font-semibold text-gray-900">{item.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{item.sub}</div>
                  </div>
                  <ChevronRight size={13} className="text-gray-300" />
                </Link>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase size={14} className="text-cyan-700" />
              <h2 className="text-base font-semibold text-gray-900">PPM</h2>
            </div>
            <div className="space-y-1">
              {[
                { label: "Portfolio",     sub: "Projetos ENRD",      href: "/awq/ppm?bu=ENRD"     },
                { label: "Novo Projeto",  sub: "Criar projeto",       href: "/awq/ppm/add?bu=ENRD" },
              ].map((item) => (
                <Link key={item.href} href={item.href}
                  className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div>
                    <div className="text-xs font-semibold text-gray-900">{item.label}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{item.sub}</div>
                  </div>
                  <ChevronRight size={13} className="text-gray-300" />
                </Link>
              ))}
            </div>
          </section>
        </div>

      </div>
    </>
  );
}
