"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Lançamentos",   href: "/awq/epm/ar" },
  { label: "Cadastro CoA",  href: "/awq/epm/ar/cadastro" },
  { label: "Aging",         href: "/awq/epm/ar/aging" },
  { label: "Cobrança",      href: "/awq/epm/ar/collections" },
  { label: "Contratos",     href: "/awq/epm/ar/contracts" },
];

export default function ARTabNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-0.5 border-b border-gray-200 mb-4 overflow-x-auto">
      {TABS.map((t) => {
        const active =
          t.href === "/awq/epm/ar"
            ? pathname === "/awq/epm/ar"
            : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
              active
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
