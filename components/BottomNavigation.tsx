"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import {
  LayoutDashboard,
  Building2,
  DollarSign,
  BarChart3,
  Bot,
  Home,
  ShoppingCart,
  Wallet,
  ClipboardList,
  Briefcase,
  Calendar,
  Users,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import QuickActionsSheet from "./QuickActionsSheet";

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
    default: // awq — handled separately to insert center FAB
      return [];
  }
}

// ── AWQ context: 5 slots with center FAB ────────────────────────────────────
const AWQ_LEFT_TABS: NavTab[] = [
  { label: "Início", href: "/awq",            icon: Home,          match: (p) => p === "/awq" },
  { label: "Vendas", href: "/crm",            icon: ShoppingCart,  match: (p) => p.startsWith("/crm") },
];
const AWQ_RIGHT_TABS: NavTab[] = [
  { label: "Financeiro", href: "/awq/financial", icon: Wallet,         match: (p) => p.startsWith("/awq/financial") || p.startsWith("/awq/cashflow") || p.startsWith("/awq/conciliacao") },
  { label: "Cadastros",  href: "/awq/erp",       icon: ClipboardList,  match: (p) => p.startsWith("/awq/erp") || p === "/customers" },
];

function NavLink({ tab, pathname }: { tab: NavTab; pathname: string }) {
  const active = tab.match(pathname);
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      className={cn(
        "relative flex-1 flex flex-col items-center justify-center py-2 pt-2.5 gap-0.5 text-xs font-medium transition-colors min-h-[56px]",
        active ? "text-brand-600" : "text-gray-400 active:text-gray-600"
      )}
    >
      {active && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-brand-600 rounded-full" />
      )}
      <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
      <span>{tab.label}</span>
    </Link>
  );
}

function AwqBottomNav({ pathname }: { pathname: string }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-gray-200/80 safe-area-bottom shadow-[0_-1px_12px_rgba(0,0,0,0.06)]">
        <div className="flex items-stretch relative">
          {AWQ_LEFT_TABS.map((tab) => (
            <NavLink key={tab.href} tab={tab} pathname={pathname} />
          ))}

          {/* spacer for center FAB */}
          <div className="w-16 shrink-0" aria-hidden />

          {AWQ_RIGHT_TABS.map((tab) => (
            <NavLink key={tab.href} tab={tab} pathname={pathname} />
          ))}

          {/* Center FAB */}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label="Ações rápidas"
            className="absolute left-1/2 -translate-x-1/2 -top-6 w-14 h-14 rounded-full bg-brand-600 active:bg-brand-700 text-white flex items-center justify-center shadow-xl shadow-brand-600/40 active:scale-95 transition-transform ring-4 ring-white"
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
        </div>
      </nav>

      <QuickActionsSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}

const ENRD_TABS: NavTab[] = [
  { label: "Projetos",   href: "/awq/ppm?bu=ENRD",  icon: Briefcase,     match: (p) => p === "/awq/ppm" },
  { label: "Calendário", href: "/awq/ppm/calendar", icon: Calendar,      match: (p) => p.startsWith("/awq/ppm/calendar") },
  { label: "Tarefas",    href: "/awq/ppm/tasks",    icon: ClipboardList, match: (p) => p.startsWith("/awq/ppm/tasks") },
  { label: "CRM",        href: "/crm",              icon: Users,         match: (p) => p.startsWith("/crm") },
];

export default function BottomNavigation() {
  const rawPathname = usePathname();
  const pathname = rawPathname ?? "";
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (role === "enrd") {
    return (
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-gray-200/80 safe-area-bottom shadow-[0_-1px_12px_rgba(0,0,0,0.06)]">
        <div className="flex items-stretch">
          {ENRD_TABS.map((tab) => (
            <NavLink key={tab.href} tab={tab} pathname={pathname} />
          ))}
        </div>
      </nav>
    );
  }

  const ctx = getContext(pathname);

  if (ctx === "awq") {
    return <AwqBottomNav pathname={pathname} />;
  }

  const tabs = getNavTabs(ctx);
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-t border-gray-200/80 safe-area-bottom shadow-[0_-1px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-stretch">
        {tabs.map((tab) => (
          <NavLink key={tab.href} tab={tab} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}
