"use client";

import { Bell, Search, RefreshCw } from "lucide-react";
import { alerts } from "@/lib/data";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const unreadCount = alerts.filter((a) => a.type === "warning" || a.type === "error").length;

  return (
    <header className="px-8 py-5 border-b border-gray-200 bg-white flex items-center justify-between gap-4">
      <div>
        <h1 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-48 pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/30 transition-all"
          />
        </div>

        {/* Refresh */}
        <button className="p-2 text-gray-400 hover:text-slate-700 hover:bg-gray-100 rounded-xl transition-colors" title="Refresh data">
          <RefreshCw size={15} />
        </button>

        {/* Notifications */}
        <button className="relative p-2 text-gray-400 hover:text-slate-700 hover:bg-gray-100 rounded-xl transition-colors" title="Alerts">
          <Bell size={15} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
          )}
        </button>

        {/* Date range chip */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-xl text-xs text-white font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live · Mar 2026
        </div>
      </div>
    </header>
  );
}
