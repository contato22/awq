"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn } from "lucide-react";

// Tabs ordered: real-content pages first, then stubs (marked visually as Em breve)
const tabs = [
  { label: "Visão Geral",  href: "/awq-venture",              stub: false },
  { label: "Portfólio",    href: "/awq-venture/portfolio",    stub: false },
  { label: "Pipeline",     href: "/awq-venture/pipeline",     stub: false },
  { label: "Financial",    href: "/awq-venture/financial",    stub: false },
  { label: "YoY 2025",     href: "/awq-venture/yoy-2025",     stub: false },
  { label: "AWQ",          href: "/awq-venture/awq",          stub: true  },
  { label: "Sales",        href: "/awq-venture/sales",        stub: false },
  { label: "Grupo Energdy",href: "/awq-venture/grupo-energdy",stub: true  },
  { label: "RI",           href: "/awq-venture/ri",           stub: true  },
  { label: "Benchmark",    href: "/awq-venture/benchmark",    stub: true  },
];

export default function VentureTabNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/awq-venture") return pathname === "/awq-venture";
    return pathname?.startsWith(href) ?? false;
  };

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="flex items-center justify-between px-6">
        <nav className="flex items-center gap-0.5 overflow-x-auto" aria-label="AWQ Venture navigation">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive(tab.href) ? "page" : undefined}
              className={`px-3.5 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive(tab.href)
                  ? "border-gray-900 text-gray-900"
                  : tab.stub
                  ? "border-transparent text-gray-300 hover:text-gray-500 hover:border-gray-200"
                  : "border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
              {tab.stub && (
                <span className="ml-1.5 text-[9px] font-semibold text-gray-300 uppercase tracking-wide">
                  EM BREVE
                </span>
              )}
            </Link>
          ))}
        </nav>
        <button className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors py-2 shrink-0 ml-4">
          <LogIn size={14} />
          Login
        </button>
      </div>
    </div>
  );
}
