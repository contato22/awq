"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  X,
  Zap,
  LayoutDashboard,
  Building2,
  LineChart,
  Activity,
  Wallet,
  TrendingUp,
  CreditCard,
  BarChart3,
  DollarSign,
  Users,
  HeartPulse,
  Calculator,
  Film,
  Briefcase,
  FileText,
  Settings,
  ChevronRight,
  ChevronLeft,
  Tag,
  GanttChart,
  Clock,
  AlertTriangle,
  Layers,
  Target,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
}

// ── Route membership (mirrored from Sidebar) ──────────────────────────────
const JACQES_PREFIXES  = ["/jacqes", "/desempenho", "/carteira", "/analise", "/csops", "/revenue", "/reports"];
const CAZA_PREFIXES    = ["/caza-vision"];
const ADVISOR_PREFIXES = ["/advisor"];
const VENTURE_PREFIXES = ["/awq-venture"];

function isJacqesRoute(p: string)  { return JACQES_PREFIXES.some((x)  => p.startsWith(x)); }
function isCazaRoute(p: string)    { return CAZA_PREFIXES.some((x)    => p.startsWith(x)); }
function isAdvisorRoute(p: string) { return ADVISOR_PREFIXES.some((x) => p.startsWith(x)); }
function isVentureRoute(p: string) { return VENTURE_PREFIXES.some((x) => p.startsWith(x)); }

// ── Nav configs ───────────────────────────────────────────────────────────
const awqNav = [
  { label: "Visão Geral",    href: "/awq",               icon: LayoutDashboard },
  { label: "Business Units", href: "/business-units",    icon: Building2 },
  { label: "Financial",      href: "/awq/financial",     icon: LineChart },
  { label: "Cash Flow",      href: "/awq/cashflow",      icon: Zap },
  { label: "Budget",         href: "/awq/budget",        icon: Wallet },
  { label: "Forecast",       href: "/awq/forecast",      icon: TrendingUp },
  { label: "Allocations",    href: "/awq/allocations",   icon: Wallet },
  { label: "Risk",           href: "/awq/risk",          icon: Activity },
  { label: "Contas Banco",   href: "/awq/bank",          icon: CreditCard },
];

const awqPpmNav = [
  { label: "Portfolio",      href: "/awq/ppm",               icon: Briefcase    },
  { label: "Gantt",          href: "/awq/ppm/gantt",         icon: GanttChart   },
  { label: "Tarefas",        href: "/awq/ppm/tasks",         icon: FileText     },
  { label: "Timesheets",     href: "/awq/ppm/timesheets",    icon: Clock        },
  { label: "Recursos",       href: "/awq/ppm/resources",     icon: Users        },
  { label: "Utilização",     href: "/awq/ppm/utilization",   icon: BarChart3    },
  { label: "Rentabilidade",  href: "/awq/ppm/profitability", icon: TrendingUp   },
  { label: "Riscos",         href: "/awq/ppm/risks",         icon: AlertTriangle},
];

const awqCrmNav = [
  { label: "Dashboard CRM",  href: "/crm",                   icon: Target       },
];

const awqEpmNav = [
  { label: "Visão Geral EPM",href: "/awq/epm",               icon: Layers       },
];

const awqBpmNav = [
  { label: "Minha Fila",  href: "/awq/bpm/tasks",                 icon: ClipboardList },
  { label: "Processos",   href: "/awq/bpm/processes",             icon: Activity      },
  { label: "Instâncias",  href: "/awq/bpm/instances",             icon: Layers        },
  { label: "Analytics",   href: "/awq/bpm/analytics/performance", icon: BarChart3     },
];

const jacqesNav = [
  { label: "Visão Geral",    href: "/jacqes",                icon: LayoutDashboard },
  { label: "Desempenho",     href: "/desempenho",            icon: TrendingUp },
  { label: "Carteira",       href: "/carteira",              icon: Users },
  { label: "Análise",        href: "/analise",               icon: Activity },
  { label: "CS Ops",         href: "/csops",                 icon: HeartPulse },
  { label: "Financial",      href: "/jacqes/financial",      icon: DollarSign },
  { label: "Customers",      href: "/jacqes/customers",      icon: Users },
  { label: "Unit Economics", href: "/jacqes/unit-economics", icon: Calculator },
  { label: "Budget",         href: "/jacqes/budget",         icon: Wallet },
  { label: "Relatórios",     href: "/reports",               icon: BarChart3 },
  { label: "Categorias",     href: "/categorias",            icon: Tag },
  { label: "CRM",            href: "/crm",                   icon: Target },
];

const cazaNav = [
  { label: "Visão Geral",    href: "/caza-vision",                icon: LayoutDashboard },
  { label: "Projetos",       href: "/caza-vision/imoveis",        icon: Film },
  { label: "Clientes",       href: "/caza-vision/clientes",       icon: Users },
  { label: "Financial",      href: "/caza-vision/financial",      icon: DollarSign },
  { label: "Unit Economics", href: "/caza-vision/unit-economics", icon: Calculator },
  { label: "Pipeline",       href: "/caza-vision/pipeline",       icon: Activity },
  { label: "Relatórios",     href: "/caza-vision/relatorios",     icon: BarChart3 },
  { label: "CRM",            href: "/crm",                        icon: Target },
];

const advisorNav = [
  { label: "Visão Geral", href: "/advisor",              icon: LayoutDashboard },
  { label: "Financial",   href: "/advisor/financial",    icon: DollarSign },
  { label: "Customers",   href: "/advisor/customers",    icon: Users },
  { label: "Portfólio",   href: "/advisor/portfolio",    icon: LineChart },
  { label: "Relatórios",  href: "/advisor/relatorios",   icon: FileText },
];

const ventureNav = [
  { label: "Visão Geral", href: "/awq-venture",           icon: LayoutDashboard },
  { label: "Portfólio",   href: "/awq-venture/portfolio", icon: Briefcase },
  { label: "Pipeline",    href: "/awq-venture/pipeline",  icon: Activity },
  { label: "Financial",   href: "/awq-venture/financial", icon: DollarSign },
];

const businessUnits = [
  { id: "jacqes",  label: "JACQES",      sub: "Agência",        href: "/jacqes",       color: "bg-brand-600" },
  { id: "caza",    label: "Caza Vision", sub: "Produtora",      href: "/caza-vision",  color: "bg-emerald-600" },
  { id: "venture", label: "AWQ Venture", sub: "Investimentos",  href: "/awq-venture",  color: "bg-amber-600" },
  { id: "advisor", label: "Advisor",     sub: "Consultoria",    href: "/advisor",      color: "bg-violet-600" },
];

// ── Helpers ──────────────────────────────────────────────────────────────
function NavLink({
  href,
  icon: Icon,
  label,
  active,
  onNavigate,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all",
        active
          ? "bg-brand-50 text-brand-700 border border-brand-200"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200"
      )}
    >
      <Icon size={18} className={cn(active ? "text-brand-600" : "text-gray-400")} />
      <span className="flex-1">{label}</span>
      {active && <ChevronRight size={14} className="text-brand-500" />}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 mb-1 mt-5">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
        {children}
      </span>
    </div>
  );
}

function BUContextBar({
  label,
  sub,
  colorClass,
  onNavigate,
}: {
  label: string;
  sub: string;
  colorClass: string;
  onNavigate: () => void;
}) {
  return (
    <div className="px-3 pt-3">
      <div className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl border", colorClass)}>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold truncate">{label}</div>
          <div className="text-[10px] opacity-70 truncate">{sub}</div>
        </div>
      </div>
      <Link
        href="/business-units"
        onClick={onNavigate}
        className="flex items-center gap-1.5 text-[11px] text-gray-400 hover:text-brand-600 transition-colors mt-2 px-1"
      >
        <ChevronLeft size={12} />
        Voltar para AWQ Group
      </Link>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  const rawPathname = usePathname();
  const pathname = rawPathname ?? "";
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const jacqesMode  = isJacqesRoute(pathname);
  const cazaMode    = isCazaRoute(pathname);
  const advisorMode = isAdvisorRoute(pathname);
  const ventureMode = isVentureRoute(pathname);

  let currentNav = awqNav;
  let sectionTitle = "AWQ Group";
  let buContext: React.ReactNode = null;

  if (jacqesMode) {
    currentNav = jacqesNav;
    sectionTitle = "JACQES";
    buContext = (
      <BUContextBar
        label="JACQES"
        sub="Agência · AWQ Group"
        colorClass="bg-brand-50 border-brand-200 text-brand-700"
        onNavigate={onClose}
      />
    );
  } else if (cazaMode) {
    currentNav = cazaNav;
    sectionTitle = "Caza Vision";
    buContext = (
      <BUContextBar
        label="Caza Vision"
        sub="Produtora · AWQ Group"
        colorClass="bg-emerald-50 border-emerald-200 text-emerald-700"
        onNavigate={onClose}
      />
    );
  } else if (advisorMode) {
    currentNav = advisorNav;
    sectionTitle = "Advisor";
    buContext = (
      <BUContextBar
        label="Advisor"
        sub="Consultoria · AWQ Group"
        colorClass="bg-violet-50 border-violet-200 text-violet-700"
        onNavigate={onClose}
      />
    );
  } else if (ventureMode) {
    currentNav = ventureNav;
    sectionTitle = "AWQ Venture";
    buContext = (
      <BUContextBar
        label="AWQ Venture"
        sub="Investimentos · AWQ Group"
        colorClass="bg-amber-50 border-amber-200 text-amber-700"
        onNavigate={onClose}
      />
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className={cn(
          "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={cn(
          "fixed top-0 left-0 bottom-0 z-50 w-[300px] max-w-[85vw] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer Header */}
        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-awq-gold to-amber-600 flex items-center justify-center shadow-md">
              <Zap size={15} className="text-gray-900" />
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900">AWQ Group</div>
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                Plataforma Central
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Fechar menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* BU context if inside a BU */}
        {buContext}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 overscroll-contain">
          <SectionLabel>{sectionTitle} · Navegação</SectionLabel>
          <div className="space-y-0.5">
            {currentNav.map((item) => (
              <NavLink
                key={item.href}
                {...item}
                active={isActive(item.href)}
                onNavigate={onClose}
              />
            ))}
          </div>

          {/* PPM, CRM, EPM — only in AWQ mode */}
          {!jacqesMode && !cazaMode && !advisorMode && !ventureMode && (
            <>
              <SectionLabel>PPM</SectionLabel>
              <div className="space-y-0.5">
                {awqPpmNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
              <SectionLabel>CRM</SectionLabel>
              <div className="space-y-0.5">
                {awqCrmNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
              <SectionLabel>EPM</SectionLabel>
              <div className="space-y-0.5">
                {awqEpmNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
              <SectionLabel>BPM</SectionLabel>
              <div className="space-y-0.5">
                {awqBpmNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
            </>
          )}

          {/* BU quick-switch when in AWQ mode */}
          {!jacqesMode && !cazaMode && !advisorMode && !ventureMode && (
            <>
              <SectionLabel>Business Units</SectionLabel>
              <div className="space-y-2 mt-1">
                {businessUnits.map((bu) => (
                  <Link
                    key={bu.id}
                    href={bu.href}
                    onClick={onClose}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl border border-gray-200 hover:border-brand-200 hover:bg-brand-50 transition-all active:bg-brand-100"
                  >
                    <div className={`w-8 h-8 rounded-lg ${bu.color} flex items-center justify-center shrink-0`}>
                      <Building2 size={14} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-800">{bu.label}</div>
                      <div className="text-[10px] text-gray-400">{bu.sub}</div>
                    </div>
                    <ChevronRight size={14} className="text-gray-300" />
                  </Link>
                ))}
              </div>
            </>
          )}

          <SectionLabel>Sistema</SectionLabel>
          <div className="space-y-0.5">
            <NavLink href="/settings" icon={Settings} label="Settings" active={pathname === "/settings"} onNavigate={onClose} />
          </div>
        </nav>

        {/* Drawer Footer */}
        <div className="px-4 py-4 border-t border-gray-100 shrink-0">
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-awq-gold to-amber-600 flex items-center justify-center text-xs font-bold text-gray-900 shrink-0">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-gray-800">Admin</span>
              <div className="text-[10px] text-gray-400">Administrador</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
