"use client";

import { usePathname } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { Menu, X } from "lucide-react";
import Sidebar from "./Sidebar";
import OpenClawWidget from "./OpenClawWidget";
import SupervisorWidget from "./SupervisorWidget";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Close sidebar on Escape key
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
        className={`
          fixed inset-y-0 left-0 z-50 w-[280px] bg-white border-r border-gray-200 flex flex-col
          transform transition-transform duration-300 ease-out
          lg:relative lg:translate-x-0 lg:w-[260px] lg:z-auto
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Mobile close button */}
        <button
          onClick={closeSidebar}
          className="absolute top-4 right-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 lg:hidden transition-micro"
          aria-label="Fechar menu"
        >
          <X size={18} />
        </button>
        <Sidebar />
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
