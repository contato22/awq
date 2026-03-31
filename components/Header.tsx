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
    <header className="px-8 py-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between gap-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
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

        {/* Notifications */}
        <button className="relative p-2 text-gray-500 hover:text-gray-400 hover:bg-gray-100 rounded-lg transition-colors" title="Alerts">
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
  );
}
