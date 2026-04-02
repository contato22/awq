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
      <header className="px-4 py-4 lg:px-8 lg:py-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base lg:text-lg font-semibold text-gray-900 truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs lg:text-sm text-gray-500 mt-0.5 truncate">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile filter button */}
          <button
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => setFilterOpen(true)}
            title="Filtros"
          >
            <SlidersHorizontal size={15} />
          </button>

          {/* Search — hidden on mobile */}
          <div className="relative hidden md:block">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search..."
              className="w-48 pl-8 pr-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-400 placeholder:text-gray-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/30 transition-all"
            />
          </div>

          {/* Refresh */}
          <button className="p-2 text-gray-500 hover:text-gray-400 hover:bg-gray-100 rounded-lg transition-colors" title="Refresh data">
            <RefreshCw size={15} />
          </button>

          {/* Notifications — hidden on mobile (in MobileHeader) */}
          <button className="relative p-2 text-gray-500 hover:text-gray-400 hover:bg-gray-100 rounded-lg transition-colors hidden lg:flex" title="Alerts">
            <Bell size={15} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-1 ring-white" />
            )}
          </button>

          {/* Date range chip */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-xs text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live · Mar 2026
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
