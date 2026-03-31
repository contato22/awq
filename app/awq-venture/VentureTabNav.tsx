"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn } from "lucide-react";

const tabs = [
  { label: "AWQ",           href: "/awq-venture/awq"           },
  { label: "Grupo Energdy", href: "/awq-venture/grupo-energdy" },
  { label: "Sales",         href: "/awq-venture/sales"         },
  { label: "PoC",           href: "/awq-venture"               },
  { label: "YoY 2025",      href: "/awq-venture/yoy-2025"      },
  { label: "RI",            href: "/awq-venture/ri"            },
  { label: "Benchmark",     href: "/awq-venture/benchmark"     },
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
        <nav className="flex items-center gap-1">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                isActive(tab.href)
                  ? "border-gray-900 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
        <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors py-2">
          <LogIn size={14} />
          Login
        </button>
      </div>
    </div>
  );
}
