"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  Activity,
  HeartPulse,
  DollarSign,
  BarChart3,
  Briefcase,
  Settings,
  ChevronRight,
  ChevronDown,
  Zap,
  Bot,
  Sparkles,
  LogOut,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Navigation structure ───────────────────────────────────────────────────────

const jacqesNav = [
  { label: "Visão Geral",  href: "/",             icon: LayoutDashboard },
  { label: "Desempenho",   href: "/desempenho",   icon: TrendingUp },
  { label: "Carteira",     href: "/carteira",     icon: Users },
  { label: "Análise",      href: "/analise",      icon: Activity },
  { label: "CS Ops",       href: "/csops",        icon: HeartPulse },
  { label: "Financial",    href: "/revenue",      icon: DollarSign },
  { label: "Relatórios",   href: "/reports",      icon: BarChart3 },
  { label: "Categorias",   href: "/categorias",   icon: Tag },
];

const gestaoNav = [
  { label: "Modo Carreira", href: "/carreira", icon: Briefcase },
];

const aiNav = [
  { label: "Agents",    href: "/agents",    icon: Bot },
  { label: "OpenClaw",  href: "/openclaw",  icon: Sparkles },
];

const sistemaNav = [
  { label: "Settings", href: "/settings", icon: Settings },
];

// ── NavItem ────────────────────────────────────────────────────────────────────

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
        active
          ? "bg-brand-50 text-brand-700 border border-brand-200"
          : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
      )}
    >
      <Icon
        size={16}
        className={cn(
          active ? "text-brand-600" : "text-gray-400 group-hover:text-gray-600"
        )}
      />
      <span className="flex-1">{label}</span>
      {active && <ChevronRight size={14} className="text-brand-500" />}
    </Link>
  );
}

// ── Section label ──────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 mb-1 mt-5">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        {children}
      </span>
    </div>
  );
}

// ── Sidebar ────────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="w-[260px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">

      {/* AWQ Group header */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-awq-gold to-amber-600 flex items-center justify-center shadow-md">
            <Zap size={17} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900">AWQ Group</div>
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
              Plataforma Central
            </div>
          </div>
        </div>
      </div>

      {/* JACQES company selector */}
      <div className="px-3 pt-3">
        <div className="flex items-center gap-3 px-3 py-2.5 bg-brand-50 border border-brand-200 rounded-xl cursor-pointer hover:bg-brand-100 transition-colors">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
            <BarChart3 size={13} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-brand-700 truncate">JACQES</div>
            <div className="text-[10px] text-brand-500 truncate">Agência · AWQ Group</div>
          </div>
          <ChevronDown size={14} className="text-brand-400 shrink-0" />
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">

        <SectionLabel>JACQES · Navegação</SectionLabel>
        <div className="space-y-0.5">
          {jacqesNav.map((item) => (
            <NavItem key={item.href} {...item} active={isActive(item.href)} />
          ))}
        </div>

        <SectionLabel>Gestão</SectionLabel>
        <div className="space-y-0.5">
          {gestaoNav.map((item) => (
            <NavItem key={item.href} {...item} active={isActive(item.href)} />
          ))}
        </div>

        <SectionLabel>IA & Agentes</SectionLabel>
        <div className="space-y-0.5">
          {aiNav.map((item) => (
            <NavItem key={item.href} {...item} active={isActive(item.href)} />
          ))}
        </div>

        <SectionLabel>Sistema</SectionLabel>
        <div className="space-y-0.5">
          {sistemaNav.map((item) => (
            <NavItem key={item.href} {...item} active={isActive(item.href)} />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-awq-gold to-amber-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
            AD
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-800 truncate">Admin</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                ADMIN
              </span>
            </div>
            <div className="text-[10px] text-gray-400 truncate">Administrador</div>
          </div>
          <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Sair">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
