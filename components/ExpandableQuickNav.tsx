"use client";

import Link from "next/link";
import {
  ChevronRight,
  Layers,
  DollarSign,
  Zap,
  Target,
  Database,
  CheckCircle,
  Scale,
  TrendingUp,
  AlertTriangle,
  LineChart,
  BarChart3,
  Wallet,
  Landmark,
  FileText,
  ShieldAlert,
  Building2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Sub = { label: string; href: string };
type Item = {
  label: string;
  href: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  subs: Sub[];
};

const ITEMS: Item[] = [
  {
    label: "EPM",
    href: "/awq/epm",
    icon: Layers,
    color: "text-brand-600",
    bg: "bg-brand-50",
    subs: [
      { label: "P&L (DRE)", href: "/awq/epm/pl" },
      { label: "Balanço Patrimonial", href: "/awq/epm/balance-sheet" },
      { label: "Budget vs Actual", href: "/awq/epm/budget" },
      { label: "KPI Dashboard", href: "/awq/epm/kpis" },
      { label: "Contas a Pagar", href: "/awq/epm/ap" },
      { label: "Contas a Receber", href: "/awq/epm/ar" },
      { label: "Razão Geral (GL)", href: "/awq/epm/gl" },
      { label: "Consolidação", href: "/awq/epm/consolidation" },
    ],
  },
  {
    label: "Financial",
    href: "/awq/financial",
    icon: DollarSign,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    subs: [
      { label: "Budget", href: "/awq/budget" },
      { label: "Forecast", href: "/awq/forecast" },
    ],
  },
  {
    label: "Cash Flow",
    href: "/awq/cashflow",
    icon: Zap,
    color: "text-cyan-700",
    bg: "bg-cyan-50",
    subs: [
      { label: "Conciliação", href: "/awq/conciliacao" },
      { label: "Contas Banco", href: "/awq/bank" },
      { label: "Investimentos", href: "/awq/investments" },
      { label: "AP & AR", href: "/awq/ap-ar" },
    ],
  },
  {
    label: "Investimentos",
    href: "/awq/investments",
    icon: Landmark,
    color: "text-violet-600",
    bg: "bg-violet-50",
    subs: [
      { label: "Cash Flow", href: "/awq/cashflow" },
      { label: "Contas Banco", href: "/awq/bank" },
      { label: "AP & AR", href: "/awq/ap-ar" },
    ],
  },
  {
    label: "Ingestão",
    href: "/awq/conciliacao",
    icon: Database,
    color: "text-brand-600",
    bg: "bg-brand-50",
    subs: [
      { label: "Base de Dados", href: "/awq/data" },
      { label: "Cash Flow", href: "/awq/cashflow" },
    ],
  },
  {
    label: "Base de Dados",
    href: "/awq/data",
    icon: CheckCircle,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    subs: [{ label: "Segurança", href: "/awq/security" }],
  },
  {
    label: "Budget",
    href: "/awq/budget",
    icon: Scale,
    color: "text-violet-600",
    bg: "bg-violet-50",
    subs: [
      { label: "Financial (DRE)", href: "/awq/financial" },
      { label: "Forecast", href: "/awq/forecast" },
      { label: "EPM Budget", href: "/awq/epm/budget" },
    ],
  },
  {
    label: "Forecast",
    href: "/awq/forecast",
    icon: TrendingUp,
    color: "text-amber-700",
    bg: "bg-amber-50",
    subs: [
      { label: "Financial (DRE)", href: "/awq/financial" },
      { label: "Budget", href: "/awq/budget" },
    ],
  },
  {
    label: "Risk",
    href: "/awq/risk",
    icon: AlertTriangle,
    color: "text-red-500",
    bg: "bg-red-50",
    subs: [
      { label: "KPIs Consolidados", href: "/awq/kpis" },
      { label: "Portfolio", href: "/awq/portfolio" },
      { label: "Allocations", href: "/awq/allocations" },
    ],
  },
];

function NavItem({ item }: { item: Item }) {
  const Icon = item.icon;
  return (
    <div className="group/qn relative">
      {/* Icon pill — always visible */}
      <Link
        href={item.href}
        title={item.label}
        className={`
          flex items-center justify-center w-10 h-10 rounded-xl
          ${item.bg} hover:brightness-95
          transition-all duration-150
        `}
      >
        <Icon size={17} className={item.color} />
      </Link>

      {/* Flyout panel — slides in from left-12 on hover */}
      <div
        className={`
          absolute left-12 top-0 z-40
          w-52 bg-white border border-gray-100 shadow-lg rounded-xl
          opacity-0 pointer-events-none -translate-x-1
          group-hover/qn:opacity-100 group-hover/qn:pointer-events-auto group-hover/qn:translate-x-0
          transition-all duration-150
        `}
      >
        <Link
          href={item.href}
          className="flex items-center justify-between px-3 py-2.5 border-b border-gray-50 hover:bg-gray-50 rounded-t-xl"
        >
          <span className="text-xs font-semibold text-gray-900">{item.label}</span>
          <ChevronRight size={11} className="text-gray-400" />
        </Link>
        <div className="p-1.5 flex flex-col gap-0.5">
          {item.subs.map((sub) => (
            <Link
              key={sub.href}
              href={sub.href}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors group/sub"
            >
              <span className="text-[11px] text-gray-500 group-hover/sub:text-gray-800 transition-colors">
                {sub.label}
              </span>
              <ChevronRight size={9} className="text-gray-300 group-hover/sub:text-gray-500 shrink-0 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ExpandableQuickNav() {
  return (
    <div className="flex flex-col gap-1.5 relative">
      {ITEMS.map((item) => (
        <NavItem key={item.href} item={item} />
      ))}
    </div>
  );
}
