"use client";

import { useState } from "react";
import { Bell, Search, RefreshCw, SlidersHorizontal } from "lucide-react";
import { alerts } from "@/lib/data";
import MobileFilterSheet from "./MobileFilterSheet";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const unreadCount = alerts.filter((a) => a.type === "warning" || a.type === "error").length;
  const [filterOpen, setFilterOpen] = useState(false);
  const [period, setPeriod] = useState("ytd");

  return (
    <>
      <header className="sticky top-0 z-30 px-6 lg:px-8 py-4 border-b border-gray-200/80 bg-white/95 backdrop-blur-sm flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-gray-900 tracking-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1 font-medium truncate">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Mobile filter button */}
          <button
            className="lg:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-micro"
            onClick={() => setFilterOpen(true)}
            title="Filtros"
            aria-label="Abrir filtros"
          >
            <SlidersHorizontal size={15} />
          </button>

          {/* Search — hidden on mobile */}
          <div className="relative hidden md:block">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Buscar..."
              aria-label="Buscar na plataforma"
              className="w-44 pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 placeholder:text-gray-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all"
            />
          </div>

          {/* Refresh */}
          <button
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-micro"
            title="Atualizar dados"
            aria-label="Atualizar dados"
          >
            <RefreshCw size={15} />
          </button>

          {/* Notifications — hidden on mobile (in MobileHeader) */}
          <button
            className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-micro hidden lg:flex"
            title="Alertas"
            aria-label={`Alertas${unreadCount > 0 ? ` (${unreadCount} não lidos)` : ""}`}
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {/* Date range chip */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live · {new Date().toLocaleString("pt-BR", { month: "short", year: "numeric" })}
          </div>
        </div>
      </header>

      {/* Mobile Filter Sheet */}
      <MobileFilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        period={period}
        onPeriodChange={setPeriod}
      />
    </>
  );
}
