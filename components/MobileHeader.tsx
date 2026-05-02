"use client";

import { usePathname } from "next/navigation";
import { Menu, Bell, Zap } from "lucide-react";
import { alerts } from "@/lib/data";

interface MobileHeaderProps {
  onMenuOpen: () => void;
}

// Ordered longest-prefix first so more-specific paths match before their parents
const PAGE_TITLES: Array<{ prefix: string; label: string }> = [
  { prefix: "/awq/financial",            label: "Financial" },
  { prefix: "/awq/cashflow",             label: "Cash Flow" },
  { prefix: "/awq/budget",               label: "Orçamento" },
  { prefix: "/awq/forecast",             label: "Forecast" },
  { prefix: "/awq/risk",                 label: "Risk" },
  { prefix: "/awq/bank",                 label: "Contas Banco" },
  { prefix: "/awq/allocations",          label: "Alocações" },
  { prefix: "/awq/epm",                  label: "EPM" },
  { prefix: "/awq/ppm",                  label: "PPM" },
  { prefix: "/awq",                      label: "AWQ Group" },
  { prefix: "/jacqes/financial",         label: "Financial" },
  { prefix: "/jacqes/customers",         label: "Customers" },
  { prefix: "/jacqes/unit-economics",    label: "Unit Economics" },
  { prefix: "/jacqes/budget",            label: "Budget" },
  { prefix: "/jacqes",                   label: "JACQES" },
  { prefix: "/caza-vision/financial",    label: "Financial" },
  { prefix: "/caza-vision/clientes",     label: "Clientes" },
  { prefix: "/caza-vision/imoveis",      label: "Projetos" },
  { prefix: "/caza-vision/pipeline",     label: "Pipeline" },
  { prefix: "/caza-vision",             label: "Caza Vision" },
  { prefix: "/advisor/financial",        label: "Financial" },
  { prefix: "/advisor/customers",        label: "Customers" },
  { prefix: "/advisor/portfolio",        label: "Portfólio" },
  { prefix: "/advisor",                  label: "Advisor" },
  { prefix: "/awq-venture/portfolio",    label: "Portfólio" },
  { prefix: "/awq-venture/pipeline",     label: "Pipeline" },
  { prefix: "/awq-venture/financial",    label: "Financial" },
  { prefix: "/awq-venture",             label: "AWQ Venture" },
  { prefix: "/business-units",           label: "Business Units" },
  { prefix: "/agents",                   label: "Agentes IA" },
  { prefix: "/openclaw",                 label: "OpenClaw" },
  { prefix: "/settings",                 label: "Settings" },
  { prefix: "/desempenho",               label: "Desempenho" },
  { prefix: "/carteira",                 label: "Carteira" },
  { prefix: "/analise",                  label: "Análise" },
  { prefix: "/csops",                    label: "CS Ops" },
  { prefix: "/reports",                  label: "Relatórios" },
  { prefix: "/categorias",               label: "Categorias" },
];

function getPageTitle(pathname: string): string {
  const match = PAGE_TITLES.find((t) => pathname.startsWith(t.prefix));
  return match?.label ?? "AWQ";
}

export default function MobileHeader({ onMenuOpen }: MobileHeaderProps) {
  const pathname = usePathname() ?? "";
  const unreadCount = alerts.filter(
    (a) => a.type === "warning" || a.type === "error"
  ).length;
  const pageTitle = getPageTitle(pathname);
  const badgeLabel = unreadCount > 9 ? "9+" : String(unreadCount);

  return (
    <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
      <button
        onClick={onMenuOpen}
        className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      {/* Page title — updates on every navigation */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-awq-gold to-amber-600 flex items-center justify-center shrink-0">
          <Zap size={11} className="text-gray-900" />
        </div>
        <span className="text-sm font-bold text-gray-900 truncate max-w-[160px]">
          {pageTitle}
        </span>
      </div>

      <button
        className="relative p-2 -mr-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount})` : ""}`}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full ring-2 ring-white flex items-center justify-center px-0.5">
            {badgeLabel}
          </span>
        )}
      </button>
    </header>
  );
}
