"use client";

import { Menu, Bell, Zap } from "lucide-react";
import { alerts } from "@/lib/data";

interface MobileHeaderProps {
  onMenuOpen: () => void;
}

export default function MobileHeader({ onMenuOpen }: MobileHeaderProps) {
  const unreadCount = alerts.filter(
    (a) => a.type === "warning" || a.type === "error"
  ).length;

  return (
    <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
      <button
        onClick={onMenuOpen}
        className="p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>

      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-awq-gold to-amber-600 flex items-center justify-center">
          <Zap size={14} className="text-gray-900" />
        </div>
        <span className="text-sm font-bold text-gray-900">AWQ</span>
      </div>

      <button
        className="relative p-2 -mr-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notificações"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
        )}
      </button>
    </header>
  );
}
