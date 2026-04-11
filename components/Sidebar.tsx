"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
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
    ChevronLeft,
    Zap,
    Bot,
    Sparkles,
    LogOut,
    Building2,
    LineChart,
    Film,
    FileText,
    Calculator,
    Wallet,
    CreditCard,
    FileUp,
    Landmark,
    Database,
    ShieldCheck,
    UserPlus,
    ClipboardList,
    MessageSquare,
    ArrowUpRight,
    CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Route membership ──────────────────────────────────────────────────────────
// All JACQES routes are now under /jacqes/*. Root-level legacy routes redirect here.
const JACQES_PREFIXES = ["/jacqes"];

const CAZA_PREFIXES = ["/caza-vision"];

const ADVISOR_PREFIXES = ["/advisor"];

const VENTURE_PREFIXES = ["/awq-venture"];

function isJacqesRoute(pathname: string) {
    return JACQES_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isCazaRoute(pathname: string) {
    return CAZA_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isAdvisorRoute(pathname: string) {
    return ADVISOR_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isVentureRoute(pathname: string) {
    return VENTURE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// ── Nav items ────────────────────────────────────────────────────────────────
const jacqesNav = [
    { label: "Visão Geral",    href: "/jacqes",             icon: LayoutDashboard },
    { label: "FP&A",           href: "/jacqes/fpa",         icon: BarChart3       },
    { label: "Relatórios",     href: "/jacqes/reports",     icon: BarChart3       },
];

// CRM sub-navigation — todos os módulos do CRM JACQES
const crmNav = [
    { label: "Visão Geral",   href: "/jacqes/crm",                 icon: LayoutDashboard },
    { label: "Pipeline",      href: "/jacqes/crm/pipeline",        icon: TrendingUp      },
    { label: "Leads",         href: "/jacqes/crm/leads",           icon: UserPlus        },
    { label: "Oportunidades", href: "/jacqes/crm/oportunidades",   icon: CheckCircle2    },
    { label: "Propostas",     href: "/jacqes/crm/propostas",       icon: FileText        },
    { label: "Clientes",      href: "/jacqes/crm/clientes",        icon: Users           },
    { label: "Carteira",      href: "/jacqes/crm/carteira",        icon: Wallet          },
    { label: "Tarefas & SLA", href: "/jacqes/crm/tarefas",         icon: ClipboardList   },
    { label: "Interações",    href: "/jacqes/crm/interacoes",      icon: MessageSquare   },
    { label: "Expansão",      href: "/jacqes/crm/expansao",        icon: ArrowUpRight    },
    { label: "Churn & Health",href: "/jacqes/crm/health",          icon: HeartPulse      },
    { label: "Relatórios CRM",href: "/jacqes/crm/relatorios",      icon: BarChart3       },
];

const cazaNav = [
    { label: "Visão Geral",    href: "/caza-vision",                   icon: LayoutDashboard },
    { label: "Projetos",       href: "/caza-vision/imoveis",           icon: Film            },
    { label: "Clientes",       href: "/caza-vision/clientes",          icon: Users           },
    { label: "Financial",      href: "/caza-vision/financial",         icon: DollarSign      },
    { label: "Unit Economics", href: "/caza-vision/unit-economics",    icon: Calculator      },
    { label: "Importar",       href: "/caza-vision/import",            icon: FileUp          },
];

const advisorNav = [
    { label: "Visão Geral", href: "/advisor",              icon: LayoutDashboard },
    { label: "Financial",   href: "/advisor/financial",    icon: DollarSign      },
    { label: "Customers",   href: "/advisor/customers",    icon: Users           },
];

const ventureNav = [
    { label: "Visão Geral", href: "/awq-venture",              icon: LayoutDashboard },
    { label: "Comercial",   href: "/awq-venture/comercial",    icon: TrendingUp      },
    { label: "Deals",       href: "/awq-venture/deals",        icon: FileText        },
    { label: "Pipeline",    href: "/awq-venture/pipeline",     icon: Activity        },
    { label: "Portfólio",   href: "/awq-venture/portfolio",    icon: Briefcase       },
    { label: "Financial",   href: "/awq-venture/financial",    icon: DollarSign      },
    { label: "YoY 2025",    href: "/awq-venture/yoy-2025",     icon: LineChart       },
    { label: "Sales",       href: "/awq-venture/sales",        icon: DollarSign      },
];

const gestaoNav = [
    { label: "Modo Carreira", href: "/jacqes/carreira", icon: Briefcase },
];

const aiNav = [
    { label: "Agents",   href: "/agents",   icon: Bot      },
    { label: "OpenClaw", href: "/openclaw", icon: Sparkles },
];

const sistemaNav = [
    { label: "Settings", href: "/settings", icon: Settings },
];

// ── Business Units for AWQ mode ──────────────────────────────────────────────
const businessUnits = [
    {
        id: "jacqes",
        label: "JACQES",
        sub: "Agência · AWQ Group",
        href: "/jacqes",
        icon: BarChart3,
        color: "bg-brand-600",
    },
    {
        id: "caza",
        label: "Caza Vision",
        sub: "Produtora · AWQ Group",
        href: "/caza-vision",
        icon: Building2,
        color: "bg-emerald-600",
    },
    {
        id: "venture",
        label: "AWQ Venture",
        sub: "Investimentos · AWQ Group",
        href: "/awq-venture",
        icon: TrendingUp,
        color: "bg-amber-600",
    },
    {
        id: "advisor",
        label: "Advisor",
        sub: "Consultoria · AWQ Group",
        href: "/advisor",
        icon: Briefcase,
        color: "bg-violet-600",
    },
];

// ── AWQ primary nav (always visible, top of sidebar) ─────────────────────────
const awqPrimaryNav = [
    { label: "Visão Geral",    href: "/awq",           icon: LayoutDashboard },
    { label: "Business Units", href: "/business-units", icon: Building2       },
] as const;

// ── GOVERNANCE REGISTRY: all AWQ holding indicator routes ────────────────────
// RULE: Every /awq/* indicator page MUST appear here and ONLY here.
// Do NOT add indicator pages as standalone primary nav items.
// To add a new indicator page, append it to this array — never elsewhere.
const HOLDING_INDICATOR_ITEMS = [
    { label: "KPIs",          href: "/awq/kpis",        icon: BarChart3   },
    { label: "Financial",     href: "/awq/financial",   icon: LineChart   },
    { label: "Cash Flow",     href: "/awq/cashflow",    icon: Zap         },
    { label: "Investimentos", href: "/awq/investments", icon: Landmark    },
    { label: "Portfolio",     href: "/awq/portfolio",   icon: Briefcase   },
    { label: "Allocations",   href: "/awq/allocations", icon: Wallet      },
    { label: "Risk",          href: "/awq/risk",        icon: Activity    },
    { label: "Budget",        href: "/awq/budget",      icon: Wallet      },
    { label: "Forecast",      href: "/awq/forecast",    icon: TrendingUp  },
    { label: "Contas Banco",  href: "/awq/bank",        icon: CreditCard  },
] as const;

// ── AWQ ops/governance nav (always visible, below indicators) ────────────────
const awqOpsNav = [
    { label: "Ingestão",      href: "/awq/ingest",     icon: FileUp    },
    { label: "Base de Dados", href: "/awq/data",        icon: Database  },
    { label: "Governança",    href: "/awq/management",  icon: ShieldCheck },
] as const;

// ── Shared helpers ────────────────────────────────────────────────────────────
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
            aria-current={active ? "page" : undefined}
            className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-1",
                active
                    ? "bg-brand-50 text-brand-700 shadow-sm"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
            )}
        >
            <Icon
                size={16}
                className={cn(
                    "shrink-0 transition-colors",
                    active ? "text-brand-600" : "text-gray-400 group-hover:text-gray-600"
                )}
            />
            <span className="flex-1 truncate">{label}</span>
            {active && <ChevronRight size={13} className="text-brand-400 shrink-0" />}
        </Link>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="px-3 mb-1.5 mt-6 first:mt-2">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em]">
                {children}
            </span>
        </div>
    );
}

// ── AWQ Group header (shared) ────────────────────────────────────────────────
function AwqHeader() {
    return (
        <div className="px-5 py-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-awq-gold to-amber-600 flex items-center justify-center shadow-md">
                    <Zap size={17} className="text-gray-900" />
                </div>
                <div>
                    <div className="text-sm font-bold text-gray-900">AWQ Group</div>
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                        Plataforma Central
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Footer (shared) ───────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  analyst: "Analyst",
  "cs-ops": "CS Ops",
};

function SidebarFooter() {
    const { data: session } = useSession();
    const user = session?.user as { name?: string; email?: string; role?: string } | undefined;
    const name = user?.name ?? user?.email ?? "Usuário";
    const initials = name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase() || "?";
    const role = user?.role;
    const roleLabel = ROLE_LABELS[role ?? ""] ?? role ?? "—";

    return (
        <div className="px-4 py-4 border-t border-gray-100">
            <div className="flex items-center gap-3 px-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-awq-gold to-amber-600 flex items-center justify-center text-xs font-bold text-gray-900 shrink-0">
                    {initials}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800 truncate">{name}</span>
                        {role && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                                {roleLabel.toUpperCase()}
                            </span>
                        )}
                    </div>
                    <div className="text-[10px] text-gray-400 truncate">{user?.email ?? "—"}</div>
                </div>
                <button
                    onClick={() => void signOut({ callbackUrl: "/login" })}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Sair"
                >
                    <LogOut size={14} />
                </button>
            </div>
        </div>
    );
}

// ── AWQ Group sidebar ────────────────────────────────────────────────────────
function AwqSidebar({ pathname }: { pathname: string }) {
    // /awq root is active only on exact match (all /awq/* belong to Indicadores Holding)
    const isActive = (href: string) =>
        href === "/awq"
            ? pathname === "/awq"
            : pathname === href || pathname.startsWith(href + "/");

    // Determine if any indicator child is currently active
    const anyIndicatorActive = HOLDING_INDICATOR_ITEMS.some(
        (item) => pathname === item.href || pathname.startsWith(item.href + "/")
    );

    const [indicatorsOpen, setIndicatorsOpen] = useState(anyIndicatorActive);

    // Auto-expand when navigating into any indicator route
    useEffect(() => {
        if (anyIndicatorActive) setIndicatorsOpen(true);
    }, [anyIndicatorActive]);

    return (
        <>
            <AwqHeader />
            <nav className="flex-1 overflow-y-auto px-3 py-2">

                {/* ── Primary nav: Visão Geral + Business Units ─────────── */}
                <div className="space-y-0.5 mt-1">
                    {awqPrimaryNav.map((item) => (
                        <NavItem key={item.href} {...item} active={isActive(item.href)} />
                    ))}
                </div>

                {/* ── Indicadores Holding — collapsible parent ──────────── */}
                <div className="mt-0.5">
                    <button
                        onClick={() => setIndicatorsOpen((o) => !o)}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-1",
                            anyIndicatorActive
                                ? "bg-brand-50 text-brand-700 shadow-sm"
                                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                        )}
                    >
                        <BarChart3
                            size={16}
                            className={cn(
                                "shrink-0 transition-colors",
                                anyIndicatorActive ? "text-brand-600" : "text-gray-400"
                            )}
                        />
                        <span className="flex-1 text-left truncate">Indicadores Holding</span>
                        {indicatorsOpen ? (
                            <ChevronDown size={13} className="shrink-0 text-gray-400" />
                        ) : (
                            <ChevronRight size={13} className="shrink-0 text-gray-400" />
                        )}
                    </button>

                    {indicatorsOpen && (
                        <div className="ml-3 mt-0.5 pl-3 border-l border-gray-100 space-y-0.5">
                            {HOLDING_INDICATOR_ITEMS.map((item) => (
                                <NavItem
                                    key={item.href}
                                    href={item.href}
                                    icon={item.icon}
                                    label={item.label}
                                    active={pathname === item.href || pathname.startsWith(item.href + "/")}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Ops / governance (primary, always visible) ────────── */}
                <div className="space-y-0.5 mt-0.5">
                    {awqOpsNav.map((item) => (
                        <NavItem key={item.href} {...item} active={isActive(item.href)} />
                    ))}
                </div>

                {/* ── Business Unit quick-access cards ────────────────────── */}
                <SectionLabel>Business Units</SectionLabel>
                <div className="space-y-2 mt-1">
                    {businessUnits.map((bu) => (
                        <Link
                            key={bu.id}
                            href={bu.href}
                            className="flex items-center gap-3 px-3 py-3 rounded-xl border border-gray-200 hover:border-brand-200 hover:bg-brand-50 transition-all group"
                        >
                            <div className={`w-8 h-8 rounded-lg ${bu.color} flex items-center justify-center shrink-0`}>
                                <bu.icon size={14} className="text-gray-900" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-gray-800 group-hover:text-brand-700">
                                    {bu.label}
                                </div>
                                <div className="text-[10px] text-gray-400">{bu.sub}</div>
                            </div>
                            <ChevronRight size={14} className="text-gray-400 group-hover:text-brand-600" />
                        </Link>
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
                        <NavItem key={item.href} {...item} active={pathname === item.href} />
                    ))}
                </div>
            </nav>
            <SidebarFooter />
        </>
    );
}

// ── JACQES sidebar ───────────────────────────────────────────────────────────
function JacqesSidebar({ pathname }: { pathname: string }) {
    const isActive = (href: string) =>
        href === "/jacqes"
            ? pathname === "/jacqes"
            : pathname === href || pathname.startsWith(href + "/");

    const isCrmActive = pathname === "/jacqes/crm" || pathname.startsWith("/jacqes/crm/");
    const [crmOpen, setCrmOpen] = useState(isCrmActive);

    useEffect(() => {
        if (isCrmActive) setCrmOpen(true);
    }, [isCrmActive]);

    return (
        <>
            <AwqHeader />
            {/* JACQES company selector */}
            <div className="px-3 pt-3">
                <Link
                    href="/business-units"
                    className="flex items-center gap-3 px-3 py-2.5 bg-brand-50 border border-brand-200 rounded-xl hover:bg-brand-100 transition-colors group"
                >
                    <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
                        <BarChart3 size={13} className="text-gray-900" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-brand-700 truncate">JACQES</div>
                        <div className="text-[10px] text-brand-500 truncate">Agência · AWQ Group</div>
                    </div>
                    <ChevronDown size={14} className="text-brand-600 shrink-0" />
                </Link>
            </div>

            {/* Back to AWQ link */}
            <div className="px-4 pt-2">
                <Link
                    href="/business-units"
                    className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-brand-600 transition-colors"
                >
                    <ChevronLeft size={11} />
                    Voltar para AWQ Group
                </Link>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-2">
                <SectionLabel>JACQES · Navegação</SectionLabel>
                <div className="space-y-0.5">
                    {jacqesNav.map((item) => (
                        <NavItem key={item.href} {...item} active={isActive(item.href)} />
                    ))}
                </div>

                {/* CRM — collapsible group */}
                <div className="mt-0.5">
                    <button
                        onClick={() => setCrmOpen((o) => !o)}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-1",
                            isCrmActive
                                ? "bg-brand-50 text-brand-700 shadow-sm"
                                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                        )}
                    >
                        <Users
                            size={16}
                            className={cn(
                                "shrink-0 transition-colors",
                                isCrmActive ? "text-brand-600" : "text-gray-400"
                            )}
                        />
                        <span className="flex-1 text-left truncate">CRM</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-100 text-brand-600 border border-brand-200 shrink-0">
                            NOVO
                        </span>
                        {crmOpen ? (
                            <ChevronDown size={13} className="shrink-0 text-gray-400 ml-1" />
                        ) : (
                            <ChevronRight size={13} className="shrink-0 text-gray-400 ml-1" />
                        )}
                    </button>

                    {crmOpen && (
                        <div className="ml-3 mt-0.5 pl-3 border-l border-gray-100 space-y-0.5">
                            {crmNav.map((item) => (
                                <NavItem
                                    key={item.href}
                                    href={item.href}
                                    icon={item.icon}
                                    label={item.label}
                                    active={
                                        item.href === "/jacqes/crm"
                                            ? pathname === "/jacqes/crm"
                                            : pathname === item.href || pathname.startsWith(item.href + "/")
                                    }
                                />
                            ))}
                        </div>
                    )}
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
            <SidebarFooter />
        </>
    );
}

// ── Caza Vision sidebar ───────────────────────────────────────────────────────
function CazaSidebar({ pathname }: { pathname: string }) {
    const isActive = (href: string) =>
        href === "/caza-vision" ? pathname === href : pathname.startsWith(href);
    return (
        <>
            <AwqHeader />
            {/* Caza Vision company selector */}
            <div className="px-3 pt-3">
                <Link
                    href="/business-units"
                    className="flex items-center gap-3 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors group"
                >
                    <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center shrink-0">
                        <Building2 size={13} className="text-gray-900" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-emerald-700 truncate">Caza Vision</div>
                        <div className="text-[10px] text-emerald-500 truncate">Produtora · AWQ Group</div>
                    </div>
                    <ChevronDown size={14} className="text-emerald-600 shrink-0" />
                </Link>
            </div>

            {/* Back to AWQ link */}
            <div className="px-4 pt-2">
                <Link
                    href="/business-units"
                    className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-emerald-600 transition-colors"
                >
                    <ChevronLeft size={11} />
                    Voltar para AWQ Group
                </Link>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-2">
                <SectionLabel>Caza Vision · Navegação</SectionLabel>
                <div className="space-y-0.5">
                    {cazaNav.map((item) => (
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
                        <NavItem key={item.href} {...item} active={pathname === item.href} />
                    ))}
                </div>
            </nav>
            <SidebarFooter />
        </>
    );
}

// ── Advisor sidebar ───────────────────────────────────────────────────────────
function AdvisorSidebar({ pathname }: { pathname: string }) {
    const isActive = (href: string) =>
        href === "/advisor" ? pathname === href : pathname.startsWith(href);
    return (
        <>
            <AwqHeader />
            {/* Advisor company selector */}
            <div className="px-3 pt-3">
                <Link
                    href="/business-units"
                    className="flex items-center gap-3 px-3 py-2.5 bg-violet-50 border border-violet-200 rounded-xl hover:bg-violet-100 transition-colors group"
                >
                    <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
                        <Briefcase size={13} className="text-gray-900" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-violet-700 truncate">Advisor</div>
                        <div className="text-[10px] text-violet-500 truncate">Consultoria · AWQ Group</div>
                    </div>
                    <ChevronDown size={14} className="text-violet-700 shrink-0" />
                </Link>
            </div>

            {/* Back to AWQ link */}
            <div className="px-4 pt-2">
                <Link
                    href="/business-units"
                    className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-violet-600 transition-colors"
                >
                    <ChevronLeft size={11} />
                    Voltar para AWQ Group
                </Link>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-2">
                <SectionLabel>Advisor · Navegação</SectionLabel>
                <div className="space-y-0.5">
                    {advisorNav.map((item) => (
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
                        <NavItem key={item.href} {...item} active={pathname === item.href} />
                    ))}
                </div>
            </nav>
            <SidebarFooter />
        </>
    );
}

// ── AWQ Venture sidebar ───────────────────────────────────────────────────────
function AwqVentureSidebar({ pathname }: { pathname: string }) {
    const isActive = (href: string) =>
        href === "/awq-venture" ? pathname === href : pathname.startsWith(href);
    return (
        <>
            <AwqHeader />
            {/* AWQ Venture company selector */}
            <div className="px-3 pt-3">
                <Link
                    href="/business-units"
                    className="flex items-center gap-3 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors group"
                >
                    <div className="w-7 h-7 rounded-lg bg-amber-600 flex items-center justify-center shrink-0">
                        <TrendingUp size={13} className="text-gray-900" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-amber-700 truncate">AWQ Venture</div>
                        <div className="text-[10px] text-amber-500 truncate">Investimentos · AWQ Group</div>
                    </div>
                    <ChevronDown size={14} className="text-amber-700 shrink-0" />
                </Link>
            </div>

            {/* Back to AWQ link */}
            <div className="px-4 pt-2">
                <Link
                    href="/business-units"
                    className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-amber-600 transition-colors"
                >
                    <ChevronLeft size={11} />
                    Voltar para AWQ Group
                </Link>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-2">
                <SectionLabel>AWQ Venture · Navegação</SectionLabel>
                <div className="space-y-0.5">
                    {ventureNav.map((item) => (
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
                        <NavItem key={item.href} {...item} active={pathname === item.href} />
                    ))}
                </div>
            </nav>
            <SidebarFooter />
        </>
    );
}

// ── Root Sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar() {
    const rawPathname = usePathname();
    const pathname = rawPathname ?? "";
    const jacqesMode  = isJacqesRoute(pathname);
    const cazaMode    = isCazaRoute(pathname);
    const advisorMode = isAdvisorRoute(pathname);
    const ventureMode = isVentureRoute(pathname);
    return (
        <div className="flex flex-col h-full">
            {jacqesMode ? (
                <JacqesSidebar pathname={pathname} />
            ) : cazaMode ? (
                <CazaSidebar pathname={pathname} />
            ) : advisorMode ? (
                <AdvisorSidebar pathname={pathname} />
            ) : ventureMode ? (
                <AwqVentureSidebar pathname={pathname} />
            ) : (
                <AwqSidebar pathname={pathname} />
            )}
        </div>
    );
}
