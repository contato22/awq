"use client";

import { usePathname } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { Menu, X } from "lucide-react";
import Sidebar from "./Sidebar";
import OpenClawWidget from "./OpenClawWidget";
import SupervisorWidget from "./SupervisorWidget";
import { cn } from "@/lib/utils";

const SIDEBAR_STORAGE_KEY = "awq-sidebar-collapsed";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed,   setCollapsed]   = useState(false);

  const openSidebar  = useCallback(() => setSidebarOpen(true),  []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Load collapsed preference from localStorage after mount
  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  // Persist and toggle collapsed state
  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Close mobile sidebar on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Mobile Sidebar Overlay ─────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40 lg:hidden animate-fade-in"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────── */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 flex flex-col",
          "transform transition-all duration-300 ease-out",
          "lg:relative lg:translate-x-0 lg:z-auto",
          // Mobile: always full-width, slides in/out
          "w-[280px]",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: width depends on collapsed state
          collapsed ? "lg:w-[72px]" : "lg:w-[260px]"
        )}
      >
        {/* Mobile close button */}
        <button
          onClick={closeSidebar}
          className="absolute top-4 right-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 lg:hidden transition-micro"
          aria-label="Fechar menu"
        >
          <X size={18} />
        </button>

        <Sidebar collapsed={collapsed} onToggle={toggleCollapsed} />
      </aside>

      {/* ── Main Content ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <div className="flex items-center h-14 px-4 border-b border-gray-200 bg-white lg:hidden shrink-0">
          <button
            onClick={openSidebar}
            className="p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-micro"
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2.5 ml-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-awq-gold to-amber-600 flex items-center justify-center">
              <span className="text-[10px] font-bold text-gray-900">A</span>
            </div>
            <span className="text-sm font-bold text-gray-900">AWQ Group</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
        <OpenClawWidget />
        <SupervisorWidget />
      </div>
    </div>
  );
}
