"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  FileBarChart,
  Settings,
  ChevronRight,
  Zap,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Overview",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Revenue",
    href: "/revenue",
    icon: TrendingUp,
  },
  {
    label: "Customers",
    href: "/customers",
    icon: Users,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: FileBarChart,
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[260px] flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-900/40">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-white tracking-wide">JACQES BI</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-widest">AWQ Group</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <div className="px-3 mb-3">
          <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
            Analytics
          </span>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                isActive
                  ? "bg-brand-600/20 text-brand-400 border border-brand-500/20"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
              )}
            >
              <Icon
                size={16}
                className={cn(
                  "transition-colors",
                  isActive ? "text-brand-400" : "text-gray-500 group-hover:text-gray-300"
                )}
              />
              <span className="flex-1">{item.label}</span>
              {isActive && (
                <ChevronRight size={14} className="text-brand-500" />
              )}
            </Link>
          );
        })}

        <div className="px-3 mt-5 mb-3">
          <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
            AI Assistant
          </span>
        </div>

        <Link
          href="/openclaw"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
            pathname === "/openclaw"
              ? "bg-brand-600/20 text-brand-400 border border-brand-500/20"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
          )}
        >
          <Sparkles
            size={16}
            className={cn(
              "transition-colors",
              pathname === "/openclaw"
                ? "text-brand-400"
                : "text-gray-500 group-hover:text-gray-300"
            )}
          />
          <span className="flex-1">OpenClaw</span>
          {pathname === "/openclaw" && (
            <ChevronRight size={14} className="text-brand-500" />
          )}
        </Link>

        <div className="px-3 mt-5 mb-3">
          <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
            System
          </span>
        </div>

        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
            pathname === "/settings"
              ? "bg-brand-600/20 text-brand-400 border border-brand-500/20"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
          )}
        >
          <Settings
            size={16}
            className={cn(
              "transition-colors",
              pathname === "/settings"
                ? "text-brand-400"
                : "text-gray-500 group-hover:text-gray-300"
            )}
          />
          Settings
        </Link>
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-awq-gold to-amber-600 flex items-center justify-center text-xs font-bold text-white">
            AW
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-gray-300 truncate">AWQ Group</div>
            <div className="text-[10px] text-gray-600 truncate">admin@awqgroup.com</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
