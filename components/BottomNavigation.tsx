"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  DollarSign,
  BarChart3,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";

const JACQES_PREFIXES  = ["/jacqes", "/desempenho", "/carteira", "/analise", "/csops", "/revenue", "/reports"];
const CAZA_PREFIXES    = ["/caza-vision"];
const ADVISOR_PREFIXES = ["/advisor"];
const VENTURE_PREFIXES = ["/awq-venture"];

function getContext(pathname: string) {
  if (JACQES_PREFIXES.some((p)  => pathname.startsWith(p))) return "jacqes";
  if (CAZA_PREFIXES.some((p)    => pathname.startsWith(p))) return "caza";
  if (ADVISOR_PREFIXES.some((p) => pathname.startsWith(p))) return "advisor";
  if (VENTURE_PREFIXES.some((p) => pathname.startsWith(p))) return "venture";
  return "awq";
}

interface NavTab {
  label: string;
  href: string;
  icon: React.ElementType;
  match: (pathname: string) => boolean;
}

function getNavTabs(ctx: string): NavTab[] {
  switch (ctx) {
    case "jacqes":
      return [
        { label: "Overview",  href: "/jacqes",           icon: LayoutDashboard, match: (p) => p === "/jacqes" },
        { label: "Financial", href: "/jacqes/financial",  icon: DollarSign,      match: (p) => p.startsWith("/jacqes/financial") },
        { label: "Customers", href: "/jacqes/customers",  icon: BarChart3,       match: (p) => p.startsWith("/jacqes/customers") },
        { label: "BUs",       href: "/business-units",    icon: Building2,       match: (p) => p === "/business-units" },
        { label: "AI",        href: "/agents",            icon: Bot,             match: (p) => p.startsWith("/agents") },
      ];
    case "caza":
      return [
        { label: "Overview",  href: "/caza-vision",              icon: LayoutDashboard, match: (p) => p === "/caza-vision" },
        { label: "Financial", href: "/caza-vision/financial",     icon: DollarSign,      match: (p) => p.startsWith("/caza-vision/financial") },
        { label: "Clientes",  href: "/caza-vision/clientes",      icon: BarChart3,       match: (p) => p.startsWith("/caza-vision/clientes") },
        { label: "BUs",       href: "/business-units",            icon: Building2,       match: (p) => p === "/business-units" },
        { label: "AI",        href: "/agents",                    icon: Bot,             match: (p) => p.startsWith("/agents") },
      ];
    case "advisor":
      return [
        { label: "Overview",  href: "/advisor",           icon: LayoutDashboard, match: (p) => p === "/advisor" },
        { label: "Financial", href: "/advisor/financial",  icon: DollarSign,      match: (p) => p.startsWith("/advisor/financial") },
        { label: "Customers", href: "/advisor/customers",  icon: BarChart3,       match: (p) => p.startsWith("/advisor/customers") },
        { label: "BUs",       href: "/business-units",    icon: Building2,       match: (p) => p === "/business-units" },
        { label: "AI",        href: "/agents",            icon: Bot,             match: (p) => p.startsWith("/agents") },
      ];
    case "venture":
      return [
        { label: "Overview",  href: "/awq-venture",               icon: LayoutDashboard, match: (p) => p === "/awq-venture" },
        { label: "Portfolio", href: "/awq-venture/portfolio",      icon: BarChart3,       match: (p) => p.startsWith("/awq-venture/portfolio") },
        { label: "Financial", href: "/awq-venture/financial",      icon: DollarSign,      match: (p) => p.startsWith("/awq-venture/financial") },
        { label: "BUs",       href: "/business-units",             icon: Building2,       match: (p) => p === "/business-units" },
        { label: "AI",        href: "/agents",                     icon: Bot,             match: (p) => p.startsWith("/agents") },
      ];
    default: // awq — "Control" catches all /awq/* not handled by the other tabs
      return [
        {
          label: "Control",
          href: "/awq",
          icon: LayoutDashboard,
          match: (p) =>
            p === "/awq" ||
            (p.startsWith("/awq/") &&
              !p.startsWith("/awq/financial") &&
              !p.startsWith("/awq/cashflow") &&
              !p.startsWith("/awq/risk") &&
              !p.startsWith("/awq/budget")),
        },
        { label: "Financial", href: "/awq/financial", icon: DollarSign,   match: (p) => p.startsWith("/awq/financial") || p.startsWith("/awq/cashflow") },
        { label: "BUs",       href: "/business-units", icon: Building2,   match: (p) => p === "/business-units" },
        { label: "Risk",      href: "/awq/risk",       icon: BarChart3,   match: (p) => p.startsWith("/awq/risk") || p.startsWith("/awq/budget") },
        { label: "AI",        href: "/agents",         icon: Bot,         match: (p) => p.startsWith("/agents") },
      ];
  }
}

export default function BottomNavigation() {
  const rawPathname = usePathname();
  const pathname = rawPathname ?? "";
  const ctx = getContext(pathname);
  const tabs = getNavTabs(ctx);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-area-bottom">
      <div className="flex items-stretch">
        {tabs.map((tab) => {
          const active = tab.match(pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "relative flex-1 flex flex-col items-center justify-center py-1.5 pt-2 gap-0.5 text-[10px] font-medium transition-colors min-h-[56px]",
                active ? "text-brand-600" : "text-gray-500 active:text-gray-700"
              )}
            >
              {/* Top indicator bar */}
              <div
                className={cn(
                  "absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-200",
                  active ? "w-10 bg-brand-600" : "w-0 bg-transparent"
                )}
              />
              {/* Icon with active background pill */}
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-6 rounded-full transition-colors duration-150",
                  active ? "bg-brand-50" : ""
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
              </div>
              <span className={cn("transition-all duration-150", active ? "font-semibold" : "")}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
