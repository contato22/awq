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
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-200/80 flex items-center justify-between gap-4 px-6 lg:px-8 py-3.5"
        style={{ borderTop: "2.5px solid #0487D9" }}
      >
        <div className="min-w-0">
          <h1 className="text-[15px] font-bold tracking-tight truncate" style={{ color: "#023373" }}>
            {title}
          </h1>
          {subtitle && (
            <p className="text-[11px] text-gray-400 mt-0.5 font-medium truncate tracking-wide">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Mobile filter button */}
          <button
            className="lg:hidden p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-micro"
            onClick={() => setFilterOpen(true)}
            title="Filtros"
            aria-label="Abrir filtros"
          >
            <SlidersHorizontal size={15} />
          </button>

          {/* Search */}
          <div className="relative hidden md:block">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Buscar..."
              aria-label="Buscar na plataforma"
              className="w-48 pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 placeholder:text-gray-400 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 focus:bg-white transition-all"
            />
          </div>

          {/* Refresh */}
          <button
            className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-micro"
            title="Atualizar dados"
            aria-label="Atualizar dados"
          >
            <RefreshCw size={14} />
          </button>

          {/* Notifications */}
          <button
            className="relative p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-micro hidden lg:flex"
            title="Alertas"
            aria-label={`Alertas${unreadCount > 0 ? ` (${unreadCount} não lidos)` : ""}`}
          >
            <Bell size={14} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {/* Live chip */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-brand-50 border border-brand-100 rounded-lg text-[11px] font-semibold" style={{ color: "#023373" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            Live · {new Date().toLocaleString("pt-BR", { month: "short", year: "numeric" })}
          </div>
        </div>
      </header>

      <MobileFilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        period={period}
        onPeriodChange={setPeriod}
      />
    </>
  );
}
