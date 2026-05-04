"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Layers,
  DollarSign,
  Zap,
  Landmark,
  Database,
  CheckCircle,
  Scale,
  TrendingUp,
  AlertTriangle,
  Briefcase,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Sub  = { label: string; href: string };
type Item = {
  label:     string;
  href:      string;
  icon:      LucideIcon;
  color:     string;
  bg:        string;
  subs:      Sub[];
  iconOnly?: boolean; // render as plain icon-link, no dropdown
};

const ITEMS: Item[] = [
  {
    label: "CRM",
    href:  "/crm",
    icon:  Target,
    color: "text-emerald-600",
    bg:    "bg-emerald-50",
    subs: [
      { label: "Dashboard CRM",  href: "/crm"               },
      { label: "Contas",         href: "/crm/accounts"       },
      { label: "Oportunidades",  href: "/crm/opportunities"  },
      { label: "Leads",          href: "/crm/leads"          },
      { label: "Propostas",      href: "/crm/proposals"      },
      { label: "E-mail",         href: "/crm/email"          },
      { label: "Account Health", href: "/crm/health"         },
      { label: "Quota Tracking", href: "/crm/quota"          },
      { label: "Analytics",      href: "/crm/analytics"      },
      { label: "Matriz RFM",     href: "/crm/rfm"            },
    ],
  },
  {
    label:    "PPM",
    href:     "/awq/ppm",
    icon:     Briefcase,
    color:    "text-violet-600",
    bg:       "bg-violet-50",
    subs: [
      { label: "Portfolio",     href: "/awq/ppm"               },
      { label: "Gantt",         href: "/awq/ppm/gantt"         },
      { label: "Tarefas",       href: "/awq/ppm/tasks"         },
      { label: "Timesheets",    href: "/awq/ppm/timesheets"    },
      { label: "Recursos",      href: "/awq/ppm/resources"     },
      { label: "Utilização",    href: "/awq/ppm/utilization"   },
      { label: "Rentabilidade", href: "/awq/ppm/profitability" },
      { label: "Riscos",        href: "/awq/ppm/risks"         },
    ],
  },
  {
    label:    "EPM",
    href:     "/awq/epm",
    icon:     Layers,
    color:    "text-brand-600",
    bg:       "bg-brand-50",
    iconOnly: true,
    subs:     [],
  },
  {
    label: "Financial",
    href:  "/awq/financial",
    icon:  DollarSign,
    color: "text-emerald-600",
    bg:    "bg-emerald-50",
    subs: [
      { label: "Budget",               href: "/awq/budget"   },
      { label: "Forecast",             href: "/awq/forecast" },
    ],
  },
  {
    label: "Cash Flow",
    href:  "/awq/cashflow",
    icon:  Zap,
    color: "text-cyan-700",
    bg:    "bg-cyan-50",
    subs: [
      { label: "Conciliação",          href: "/awq/conciliacao" },
      { label: "Contas Banco",         href: "/awq/bank"        },
      { label: "Investimentos",        href: "/awq/investments" },
      { label: "AP & AR",              href: "/awq/ap-ar"       },
    ],
  },
  {
    label: "Investimentos",
    href:  "/awq/investments",
    icon:  Landmark,
    color: "text-violet-600",
    bg:    "bg-violet-50",
    subs: [
      { label: "Cash Flow",            href: "/awq/cashflow" },
      { label: "Contas Banco",         href: "/awq/bank"     },
      { label: "AP & AR",              href: "/awq/ap-ar"    },
    ],
  },
  {
    label: "Ingestão",
    href:  "/awq/conciliacao",
    icon:  Database,
    color: "text-brand-600",
    bg:    "bg-brand-50",
    subs: [
      { label: "Base de Dados",        href: "/awq/data"     },
      { label: "Cash Flow",            href: "/awq/cashflow" },
    ],
  },
  {
    label: "Base de Dados",
    href:  "/awq/data",
    icon:  CheckCircle,
    color: "text-emerald-600",
    bg:    "bg-emerald-50",
    subs: [
      { label: "Segurança",            href: "/awq/security" },
    ],
  },
  {
    label: "Budget",
    href:  "/awq/budget",
    icon:  Scale,
    color: "text-violet-600",
    bg:    "bg-violet-50",
    subs: [
      { label: "Financial (DRE)",      href: "/awq/financial"     },
      { label: "Forecast",             href: "/awq/forecast"      },
      { label: "EPM Budget",           href: "/awq/epm/budget"    },
    ],
  },
  {
    label: "Forecast",
    href:  "/awq/forecast",
    icon:  TrendingUp,
    color: "text-amber-700",
    bg:    "bg-amber-50",
    subs: [
      { label: "Financial (DRE)",      href: "/awq/financial" },
      { label: "Budget",               href: "/awq/budget"    },
    ],
  },
  {
    label: "Risk",
    href:  "/awq/risk",
    icon:  AlertTriangle,
    color: "text-red-500",
    bg:    "bg-red-50",
    subs: [
      { label: "KPIs Consolidados",    href: "/awq/kpis"        },
      { label: "Portfolio",            href: "/awq/portfolio"   },
      { label: "Allocations",          href: "/awq/allocations" },
    ],
  },
];

function NavItem({ item }: { item: Item }) {
  const [open, setOpen] = useState(false);
  const Icon = item.icon;

  if (item.iconOnly) {
    return (
      <Link
        href={item.href}
        title={item.label}
        className={[
          "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-150",
          item.bg,
          "hover:brightness-95",
        ].join(" ")}
      >
        <Icon size={17} className={item.color} />
      </Link>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* Icon pill */}
      <Link
        href={item.href}
        title={item.label}
        className={[
          "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-150",
          item.bg,
          open ? "ring-2 ring-offset-1 ring-gray-200 brightness-95" : "hover:brightness-95",
        ].join(" ")}
      >
        <Icon size={17} className={item.color} />
      </Link>

      {/* Dropdown — appears below the icon */}
      <div
        className={[
          "absolute left-0 top-11 z-50 w-52",
          "bg-white border border-gray-100 rounded-xl shadow-lg",
          "transition-all duration-150 origin-top-left",
          open
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none",
        ].join(" ")}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <Link
          href={item.href}
          className="flex items-center justify-between px-3 py-2.5 border-b border-gray-50 hover:bg-gray-50 rounded-t-xl transition-colors"
        >
          <span className="text-xs font-semibold text-gray-900">{item.label}</span>
          <ChevronRight size={11} className="text-gray-400" />
        </Link>
        <div className="p-1.5 flex flex-col gap-0.5">
          {item.subs.map((sub) => (
            <Link
              key={sub.href}
              href={sub.href}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <span className="text-[11px] text-gray-500 group-hover:text-gray-800 transition-colors">
                {sub.label}
              </span>
              <ChevronRight size={9} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ExpandableQuickNav() {
  return (
    <div className="flex flex-wrap gap-2">
      {ITEMS.map((item) => (
        <NavItem key={item.href} item={item} />
      ))}
    </div>
  );
}
