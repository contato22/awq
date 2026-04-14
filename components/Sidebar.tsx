"use client";

import { useState, useEffect, createContext, useContext } from "react";
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
    ShieldAlert,
    UserPlus,
    ClipboardList,
    MessageSquare,
    ArrowUpRight,
    CheckCircle2,
    Scale,
    BookOpen,
    Receipt,
    Building,
    AlertTriangle,
    Lock,
    PanelLeftClose,
    PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Sidebar collapse context ──────────────────────────────────────────────────
interface SidebarCtxValue {
    /** Raw user preference (persisted in localStorage). */
    collapsed: boolean;
    /** True when viewport is ≥ 1024 px (desktop). */
    isDesktop: boolean;
    /** Toggle collapsed preference. */
    toggle: () => void;
}

const SidebarCtx = createContext<SidebarCtxValue>({
    collapsed: false,
    isDesktop: false,
    toggle: () => {},
});

/**
 * Returns true only when the sidebar should visually be collapsed.
 * On mobile the sidebar is an overlay, so it is always "expanded" content-wise.
 */
function useEffectiveCollapsed(): boolean {
    const { collapsed, isDesktop } = useContext(SidebarCtx);
    return collapsed && isDesktop;
}

// ── Route membership ──────────────────────────────────────────────────────────
const JACQES_PREFIXES  = ["/jacqes"];
const CAZA_PREFIXES    = ["/caza-vision"];
const ADVISOR_PREFIXES = ["/advisor"];
const VENTURE_PREFIXES = ["/awq-venture"];

function isJacqesRoute(p: string)  { return JACQES_PREFIXES.some(x  => p.startsWith(x)); }
function isCazaRoute(p: string)    { return CAZA_PREFIXES.some(x    => p.startsWith(x)); }
function isAdvisorRoute(p: string) { return ADVISOR_PREFIXES.some(x => p.startsWith(x)); }
function isVentureRoute(p: string) { return VENTURE_PREFIXES.some(x => p.startsWith(x)); }

// ── Nav items ─────────────────────────────────────────────────────────────────
const jacqesNav = [
    { label: "Visão Geral", href: "/jacqes",         icon: LayoutDashboard },
    { label: "FP&A",        href: "/jacqes/fpa",     icon: BarChart3       },
    { label: "Relatórios",  href: "/jacqes/reports", icon: BarChart3       },
];

const crmNav = [
    { label: "Visão Geral",    href: "/jacqes/crm",               icon: LayoutDashboard },
    { label: "Pipeline",       href: "/jacqes/crm/pipeline",      icon: TrendingUp      },
    { label: "Leads",          href: "/jacqes/crm/leads",         icon: UserPlus        },
    { label: "Oportunidades",  href: "/jacqes/crm/oportunidades", icon: CheckCircle2    },
    { label: "Propostas",      href: "/jacqes/crm/propostas",     icon: FileText        },
    { label: "Clientes",       href: "/jacqes/crm/clientes",      icon: Users           },
    { label: "Carteira",       href: "/jacqes/crm/carteira",      icon: Wallet          },
    { label: "Tarefas & SLA",  href: "/jacqes/crm/tarefas",       icon: ClipboardList   },
    { label: "Interações",     href: "/jacqes/crm/interacoes",    icon: MessageSquare   },
    { label: "Expansão",       href: "/jacqes/crm/expansao",      icon: ArrowUpRight    },
    { label: "Churn & Health", href: "/jacqes/crm/health",        icon: HeartPulse      },
    { label: "Relatórios CRM", href: "/jacqes/crm/relatorios",    icon: BarChart3       },
];

const cazaNav = [
    { label: "Visão Geral",    href: "/caza-vision",                icon: LayoutDashboard },
    { label: "Projetos",       href: "/caza-vision/imoveis",        icon: Film            },
    { label: "Clientes",       href: "/caza-vision/clientes",       icon: Users           },
    { label: "Financial",      href: "/caza-vision/financial",      icon: DollarSign      },
    { label: "Unit Economics", href: "/caza-vision/unit-economics", icon: Calculator      },
    { label: "Importar",       href: "/caza-vision/import",         icon: FileUp          },
];

const advisorNav = [
    { label: "Visão Geral", href: "/advisor",           icon: LayoutDashboard },
    { label: "Financial",   href: "/advisor/financial", icon: DollarSign      },
    { label: "Customers",   href: "/advisor/customers", icon: Users           },
];

const ventureNav = [
    { label: "Visão Geral", href: "/awq-venture",           icon: LayoutDashboard },
    { label: "Comercial",   href: "/awq-venture/comercial", icon: TrendingUp      },
    { label: "Deals",       href: "/awq-venture/deals",     icon: FileText        },
    { label: "Pipeline",    href: "/awq-venture/pipeline",  icon: Activity        },
    { label: "Portfólio",   href: "/awq-venture/portfolio", icon: Briefcase       },
    { label: "Financial",   href: "/awq-venture/financial", icon: DollarSign      },
    { label: "YoY 2025",    href: "/awq-venture/yoy-2025", icon: LineChart       },
    { label: "Sales",       href: "/awq-venture/sales",     icon: DollarSign      },
];

const gestaoNav  = [{ label: "Modo Carreira", href: "/jacqes/carreira", icon: Briefcase }];
const aiNav      = [
    { label: "Agents",   href: "/agents",   icon: Bot      },
    { label: "OpenClaw", href: "/openclaw", icon: Sparkles },
];
const sistemaNav = [{ label: "Settings", href: "/settings", icon: Settings }];

// ── Business Units for AWQ mode ───────────────────────────────────────────────
const businessUnits = [
    { id: "jacqes",  label: "JACQES",      sub: "Agência · AWQ Group",      href: "/jacqes",      icon: BarChart3,  color: "bg-brand-600"   },
    { id: "caza",    label: "Caza Vision", sub: "Produtora · AWQ Group",    href: "/caza-vision", icon: Building2,  color: "bg-emerald-600" },
    { id: "venture", label: "AWQ Venture", sub: "Investimentos · AWQ Group", href: "/awq-venture", icon: TrendingUp, color: "bg-amber-600"   },
    { id: "advisor", label: "Advisor",     sub: "Consultoria · AWQ Group",  href: "/advisor",     icon: Briefcase,  color: "bg-violet-600"  },
];

// ── AWQ primary nav ───────────────────────────────────────────────────────────
const awqPrimaryNav = [
    { label: "Visão Geral",    href: "/awq",           icon: LayoutDashboard },
    { label: "Business Units", href: "/business-units", icon: Building2       },
] as const;

// ── GOVERNANCE REGISTRY: AWQ holding routes by ERP layer ─────────────────────
const AWQ_CONTROL_TOWER_ITEMS = [
    { label: "KPIs Consolidados", href: "/awq/kpis",       icon: BarChart3     },
    { label: "Risk & Alertas",    href: "/awq/risk",        icon: AlertTriangle },
    { label: "Portfolio",         href: "/awq/portfolio",   icon: Briefcase     },
    { label: "Allocations",       href: "/awq/allocations", icon: Wallet        },
] as const;

const AWQ_FPA_ITEMS = [
    { label: "Financial (DRE)", href: "/awq/financial", icon: LineChart  },
    { label: "Budget",          href: "/awq/budget",    icon: BarChart3  },
    { label: "Forecast",        href: "/awq/forecast",  icon: TrendingUp },
] as const;

const AWQ_TESOURARIA_ITEMS = [
    { label: "Cash Flow",     href: "/awq/cashflow",    icon: Zap        },
    { label: "Contas Banco",  href: "/awq/bank",        icon: CreditCard },
    { label: "Investimentos", href: "/awq/investments", icon: Landmark   },
] as const;

const AWQ_CONTROLADORIA_ITEMS = [
    { label: "Controladoria", href: "/awq/management",    icon: ShieldCheck },
    { label: "Contabilidade", href: "/awq/contabilidade", icon: BookOpen    },
    { label: "Fiscal",        href: "/awq/fiscal",        icon: Receipt     },
] as const;

const AWQ_JURIDICO_ITEMS = [
    { label: "Jurídico",   href: "/awq/juridico",   icon: Scale    },
    { label: "Societário", href: "/awq/societario", icon: Building },
    { label: "Compliance", href: "/awq/compliance", icon: Lock     },
] as const;

const AWQ_DADOS_ITEMS = [
    { label: "Ingestão",      href: "/awq/ingest",   icon: FileUp      },
    { label: "Base de Dados", href: "/awq/data",     icon: Database    },
    { label: "Segurança",     href: "/awq/security", icon: ShieldAlert },
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
    const collapsed = useEffectiveCollapsed();

    if (collapsed) {
        return (
            <Link
                href={href}
                title={label}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                    "flex items-center justify-center w-9 h-9 mx-auto rounded-lg transition-all duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-1",
                    active
                        ? "bg-brand-50 shadow-sm"
                        : "hover:bg-gray-50"
                )}
            >
                <Icon
                    size={18}
                    className={cn(
                        "shrink-0 transition-colors",
                        active ? "text-brand-600" : "text-gray-400 hover:text-gray-600"
                    )}
                />
            </Link>
        );
    }

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
    const collapsed = useEffectiveCollapsed();

    if (collapsed) {
        return <div className="mx-2 my-3 h-px bg-gray-100" />;
    }

    return (
        <div className="px-3 mb-1.5 mt-6 first:mt-2">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em]">
                {children}
            </span>
        </div>
    );
}

// ── AWQ Group header ──────────────────────────────────────────────────────────
function AwqHeader() {
    const { toggle } = useContext(SidebarCtx);
    const collapsed  = useEffectiveCollapsed();

    if (collapsed) {
        return (
            <div className="flex flex-col items-center px-2 py-4 border-b border-gray-100 gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-awq-gold to-amber-600 flex items-center justify-center shadow-md">
                    <Zap size={17} className="text-gray-900" />
                </div>
                <button
                    onClick={toggle}
                    aria-label="Expandir menu"
                    title="Expandir menu"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                    <PanelLeftOpen size={15} />
                </button>
            </div>
        );
    }

    return (
        <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-awq-gold to-amber-600 flex items-center justify-center shadow-md">
                    <Zap size={17} className="text-gray-900" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900">AWQ Group</div>
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                        Plataforma Central
                    </div>
                </div>
                <button
                    onClick={toggle}
                    aria-label="Recolher menu"
                    title="Recolher menu"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0 hidden lg:flex"
                >
                    <PanelLeftClose size={15} />
                </button>
            </div>
        </div>
    );
}

// ── Footer ────────────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
    owner:   "Owner",
    admin:   "Admin",
    analyst: "Analyst",
    "cs-ops": "CS Ops",
};

function SidebarFooter() {
    const { data: session } = useSession();
    const collapsed = useEffectiveCollapsed();

    const user      = session?.user as { name?: string; email?: string; role?: string } | undefined;
    const name      = user?.name ?? user?.email ?? "Usuário";
    const initials  = name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase() || "?";
    const role      = user?.role;
    const roleLabel = ROLE_LABELS[role ?? ""] ?? role ?? "—";

    if (collapsed) {
        return (
            <div className="px-2 py-3 border-t border-gray-100 flex flex-col items-center gap-2">
                <div
                    title={`${name}${role ? ` — ${roleLabel}` : ""}`}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-awq-gold to-amber-600 flex items-center justify-center text-xs font-bold text-gray-900 shrink-0 cursor-default select-none"
                >
                    {initials}
                </div>
                <button
                    onClick={() => void signOut({ callbackUrl: "/login" })}
                    title="Sair"
                    aria-label="Sair"
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                    <LogOut size={14} />
                </button>
            </div>
        );
    }

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
                    aria-label="Sair"
                >
                    <LogOut size={14} />
                </button>
            </div>
        </div>
    );
}

// ── Collapsible section ───────────────────────────────────────────────────────
function CollapsibleSection({
    label,
    icon: Icon,
    isAnyActive,
    isOpen,
    onToggle,
    children,
}: {
    label: string;
    icon: React.ElementType;
    isAnyActive: boolean;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    const { toggle: expandSidebar } = useContext(SidebarCtx);
    const collapsed = useEffectiveCollapsed();

    if (collapsed) {
        return (
            <div className="mt-0.5">
                <button
                    onClick={expandSidebar}
                    title={`${label} — clique para expandir`}
                    aria-label={label}
                    className={cn(
                        "flex items-center justify-center w-9 h-9 mx-auto rounded-lg transition-all duration-150",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-1",
                        isAnyActive
                            ? "bg-brand-50 shadow-sm"
                            : "hover:bg-gray-50"
                    )}
                >
                    <Icon
                        size={18}
                        className={cn(
                            "shrink-0 transition-colors",
                            isAnyActive ? "text-brand-600" : "text-gray-400"
                        )}
                    />
                </button>
            </div>
        );
    }

    return (
        <div className="mt-0.5">
            <button
                onClick={onToggle}
                className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-1",
                    isAnyActive
                        ? "bg-brand-50 text-brand-700 shadow-sm"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                )}
            >
                <Icon
                    size={16}
                    className={cn("shrink-0 transition-colors", isAnyActive ? "text-brand-600" : "text-gray-400")}
                />
                <span className="flex-1 text-left truncate">{label}</span>
                {isOpen ? (
                    <ChevronDown size={13} className="shrink-0 text-gray-400" />
                ) : (
                    <ChevronRight size={13} className="shrink-0 text-gray-400" />
                )}
            </button>
            {isOpen && (
                <div className="ml-3 mt-0.5 pl-3 border-l border-gray-100 space-y-0.5">
                    {children}
                </div>
            )}
        </div>
    );
}

// ── AWQ Group sidebar ─────────────────────────────────────────────────────────
function AwqSidebar({ pathname }: { pathname: string }) {
    const collapsed = useEffectiveCollapsed();

    const isActive = (href: string) =>
        href === "/awq"
            ? pathname === "/awq"
            : pathname === href || pathname.startsWith(href + "/");

    const isGroupActive = (items: readonly { href: string }[]) =>
        items.some((i) => pathname === i.href || pathname.startsWith(i.href + "/"));

    const ctActive            = isGroupActive(AWQ_CONTROL_TOWER_ITEMS);
    const fpaActive           = isGroupActive(AWQ_FPA_ITEMS);
    const tesourariaActive    = isGroupActive(AWQ_TESOURARIA_ITEMS);
    const controladoriaActive = isGroupActive(AWQ_CONTROLADORIA_ITEMS);

    const [ctOpen,             setCtOpen]            = useState(ctActive);
    const [fpaOpen,            setFpaOpen]           = useState(fpaActive);
    const [tesourariaOpen,     setTesourariaOpen]    = useState(tesourariaActive);
    const [controladoriaOpen,  setControladoriaOpen] = useState(controladoriaActive);

    useEffect(() => { if (ctActive)            setCtOpen(true);            }, [ctActive]);
    useEffect(() => { if (fpaActive)           setFpaOpen(true);           }, [fpaActive]);
    useEffect(() => { if (tesourariaActive)    setTesourariaOpen(true);    }, [tesourariaActive]);
    useEffect(() => { if (controladoriaActive) setControladoriaOpen(true); }, [controladoriaActive]);

    return (
        <>
            <AwqHeader />
            <nav className={cn("flex-1 overflow-y-auto py-2", collapsed ? "px-2" : "px-3")}>

                {/* ── 1. Control Tower ────────────────────────────────── */}
                <SectionLabel>Control Tower</SectionLabel>
                <div className={cn(collapsed ? "space-y-1" : "space-y-0.5")}>
                    {awqPrimaryNav.map((item) => (
                        <NavItem key={item.href} {...item} active={isActive(item.href)} />
                    ))}
                </div>
                <CollapsibleSection
                    label="Indicadores"
                    icon={BarChart3}
                    isAnyActive={ctActive}
                    isOpen={ctOpen}
                    onToggle={() => setCtOpen((o) => !o)}
                >
                    {AWQ_CONTROL_TOWER_ITEMS.map((item) => (
                        <NavItem
                            key={item.href}
                            href={item.href}
                            icon={item.icon}
                            label={item.label}
                            active={pathname === item.href || pathname.startsWith(item.href + "/")}
                        />
                    ))}
                </CollapsibleSection>

                {/* ── 2. Financeiro Corporativo ──────────────────────── */}
                <SectionLabel>Financeiro Corporativo</SectionLabel>
                <CollapsibleSection
                    label="FP&A"
                    icon={LineChart}
                    isAnyActive={fpaActive}
                    isOpen={fpaOpen}
                    onToggle={() => setFpaOpen((o) => !o)}
                >
                    {AWQ_FPA_ITEMS.map((item) => (
                        <NavItem
                            key={item.href}
                            href={item.href}
                            icon={item.icon}
                            label={item.label}
                            active={pathname === item.href || pathname.startsWith(item.href + "/")}
                        />
                    ))}
                </CollapsibleSection>
                <CollapsibleSection
                    label="Tesouraria"
                    icon={Wallet}
                    isAnyActive={tesourariaActive}
                    isOpen={tesourariaOpen}
                    onToggle={() => setTesourariaOpen((o) => !o)}
                >
                    {AWQ_TESOURARIA_ITEMS.map((item) => (
                        <NavItem
                            key={item.href}
                            href={item.href}
                            icon={item.icon}
                            label={item.label}
                            active={pathname === item.href || pathname.startsWith(item.href + "/")}
                        />
                    ))}
                </CollapsibleSection>
                <CollapsibleSection
                    label="Controladoria"
                    icon={ShieldCheck}
                    isAnyActive={controladoriaActive}
                    isOpen={controladoriaOpen}
                    onToggle={() => setControladoriaOpen((o) => !o)}
                >
                    {AWQ_CONTROLADORIA_ITEMS.map((item) => (
                        <NavItem
                            key={item.href}
                            href={item.href}
                            icon={item.icon}
                            label={item.label}
                            active={pathname === item.href || pathname.startsWith(item.href + "/")}
                        />
                    ))}
                </CollapsibleSection>

                {/* ── 3. Governança & Jurídico ───────────────────────── */}
                <SectionLabel>Governança & Jurídico</SectionLabel>
                <div className={cn(collapsed ? "space-y-1" : "space-y-0.5")}>
                    {AWQ_JURIDICO_ITEMS.map((item) => (
                        <NavItem key={item.href} {...item} active={isActive(item.href)} />
                    ))}
                </div>

                {/* ── 4. Dados & Infra ───────────────────────────────── */}
                <SectionLabel>Dados & Infra</SectionLabel>
                <div className={cn(collapsed ? "space-y-1" : "space-y-0.5")}>
                    {AWQ_DADOS_ITEMS.map((item) => (
                        <NavItem key={item.href} {...item} active={isActive(item.href)} />
                    ))}
                </div>

                {/* ── 5. Business Units ──────────────────────────────── */}
                <SectionLabel>Business Units</SectionLabel>
                {collapsed ? (
                    <div className="flex flex-col items-center space-y-1.5 mt-1">
                        {businessUnits.map((bu) => (
                            <Link
                                key={bu.id}
                                href={bu.href}
                                title={`${bu.label} — ${bu.sub}`}
                                aria-label={bu.label}
                                className={cn(
                                    "w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:opacity-90 hover:shadow-sm",
                                    bu.color
                                )}
                            >
                                <bu.icon size={16} className="text-gray-900" />
                            </Link>
                        ))}
                    </div>
                ) : (
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
                )}

                <SectionLabel>IA & Agentes</SectionLabel>
                <div className={cn(collapsed ? "space-y-1" : "space-y-0.5")}>
                    {aiNav.map((item) => (
                        <NavItem key={item.href} {...item} active={isActive(item.href)} />
                    ))}
                </div>

                <SectionLabel>Sistema</SectionLabel>
                <div className={cn(collapsed ? "space-y-1" : "space-y-0.5")}>
                    {sistemaNav.map((item) => (
                        <NavItem key={item.href} {...item} active={pathname === item.href} />
                    ))}
                </div>
            </nav>
            <SidebarFooter />
        </>
    );
}

// ── JACQES sidebar ────────────────────────────────────────────────────────────
function JacqesSidebar({ pathname }: { pathname: string }) {
    const { toggle: expandSidebar } = useContext(SidebarCtx);
    const collapsed = useEffectiveCollapsed();

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

            {/* BU selector — hidden when collapsed */}
            {!collapsed && (
                <>
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
                    <div className="px-4 pt-2">
                        <Link
                            href="/business-units"
                            className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-brand-600 transition-colors"
                        >
                            <ChevronLeft size={11} />
                            Voltar para AWQ Group
                        </Link>
                    </div>
                </>
            )}

            <nav className={cn("flex-1 overflow-y-auto py-2", collapsed ? "px-2" : "px-3")}>
                <SectionLabel>JACQES · Navegação</SectionLabel>
                <div className={cn(collapsed ? "space-y-1" : "space-y-0.5")}>
                    {jacqesNav.map((item) => (
                        <NavItem key={item.href} {...item} active={isActive(item.href)} />
                    ))}
                </div>

                {/* CRM — collapsible */}
                {collapsed ? (
                    <div className="mt-1">
                        <button
                            onClick={expandSidebar}
                            title="CRM — clique para expandir"
                            aria-label="CRM"
                            className={cn(
                                "flex items-center justify-center w-9 h-9 mx-auto rounded-lg transition-all duration-150",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-1",
                                isCrmActive ? "bg-brand-50 shadow-sm" : "hover:bg-gray-50"
                            )}
                        >
                            <Users
                                size={18}
                                className={cn("shrink-0", isCrmActive ? "text-brand-600" : "text-gray-400")}
                            />
                        </button>
                    </div>
                ) : (
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
                                className={cn("shrink-0 transition-colors", isCrmActive ? "text-brand-600" : "text-gray-400")}
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
                )}

                <SectionLabel>Gestão</SectionLabel>
                <div className={cn(collapsed ? "space-y-1" : "space-y-0.5")}>
                    {gestaoNav.map((item) => (
                        <NavItem key={item.href} {...item} active={isActive(item.href)} />
                    ))}
                </div>

                <SectionLabel>IA & Agentes</SectionLabel>
                <div className={cn(collapsed ? "space-y-1" : "space-y-0.5")}>
                    {aiNav.map((item) => (
                        <NavItem key={item.href} {...item} active={isActive(item.href)} />
                    ))}
                </div>

                <SectionLabel>Sistema</SectionLabel>
                <div className={cn(collapsed ? "space-y-1" : "space-y-0.5")}>
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
    const collapsed = useEffectiveCollapsed();

    const isActive = (href: string) =>
        href === "/caza-vision" ? pathname === href : pathname.startsWith(href);

    return (
        <>
            <AwqHeader />

            {!collapsed && (
                <>
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
                    <div className="px-4 pt-2">
                        <Link
                            href="/business-units"
                            className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-emerald-600 transition-colors"
                        >
                            <ChevronLeft size={11} />
                            Voltar para AWQ Group
                        </Link>
                    </div>
                </>
            )}

            <nav className={cn("flex-1 overflow-y-auto py-2", collapsed ? "px-2" : "px-3")}>
                <SectionLabel>Caza Vision · Navegação</SectionLabel>
                <div className={cn(collapsed ? "space-y-1" : "space-y-0.5")}>
                    {cazaNav.map((item) => (
                        <NavItem key={item.href} {...item} active={isActive(item.href)} />
                    ))}
                </div>

                <SectionLabel>IA & Agentes</SectionLabel>
                <div className={cn(collapsed ? "space-y-1" : "space-y-0.5")}>
                    {aiNav.map((item) => (
                        <NavItem key={item.href} {...item} active={isActive(item.href)} />
                    ))}
                </div>

                <SectionLabel>Sistema</SectionLabel>
                <div className={cn(collapsed ? "space-y-1" : "space-y-0.5")}>
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
    const collapsed = useEffectiveCollapsed();

    const isActive = (href: string) =>
        href === "/advisor" ? pathname === href : pathname.startsWith(href);

    return (
        <>
            <AwqHeader />

            {!collapsed && (
                <>
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
                    <div className="px-4 pt-2">
                        <Link
                            href="/business-units"
                            className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-violet-600 transition-colors"
                        >
                            <ChevronLeft size={11} />
                            Voltar para AWQ Group
                        </Link>
                    </div>
                </>
            )}

            <nav className={cn("flex-1 overflow-y-auto py-2", collapsed ? "px-2" : "px-3")}>
                <SectionLabel>Advisor · Navegação</SectionLabel>
                <div className={cn(collapsed ? "space-y-1" : "space-y-0.5")}>
                    {advisorNav.map((item) => (
                        <NavItem key={item.href} {...item} active={isActive(item.href)} />
                    ))}
                </div>

                <SectionLabel>IA & Agentes</SectionLabel>
                <div className={cn(collapsed ? "space-y-1" : "space-y-0.5")}>
                    {aiNav.map((item) => (
                        <NavItem key={item.href} {...item} active={isActive(item.href)} />
                    ))}
                </div>

                <SectionLabel>Sistema</SectionLabel>
                <div className={cn(collapsed ? "space-y-1" : "space-y-0.5")}>
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
    const collapsed = useEffectiveCollapsed();

    const isActive = (href: string) =>
        href === "/awq-venture" ? pathname === href : pathname.startsWith(href);

    return (
        <>
            <AwqHeader />

            {!collapsed && (
                <>
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
                    <div className="px-4 pt-2">
                        <Link
                            href="/business-units"
                            className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-amber-600 transition-colors"
                        >
                            <ChevronLeft size={11} />
                            Voltar para AWQ Group
                        </Link>
                    </div>
                </>
            )}

            <nav className={cn("flex-1 overflow-y-auto py-2", collapsed ? "px-2" : "px-3")}>
                <SectionLabel>AWQ Venture · Navegação</SectionLabel>
                <div className={cn(collapsed ? "space-y-1" : "space-y-0.5")}>
                    {ventureNav.map((item) => (
                        <NavItem key={item.href} {...item} active={isActive(item.href)} />
                    ))}
                </div>

                <SectionLabel>IA & Agentes</SectionLabel>
                <div className={cn(collapsed ? "space-y-1" : "space-y-0.5")}>
                    {aiNav.map((item) => (
                        <NavItem key={item.href} {...item} active={isActive(item.href)} />
                    ))}
                </div>

                <SectionLabel>Sistema</SectionLabel>
                <div className={cn(collapsed ? "space-y-1" : "space-y-0.5")}>
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
export default function Sidebar({
    collapsed,
    onToggle,
}: {
    collapsed: boolean;
    onToggle: () => void;
}) {
    const rawPathname = usePathname();
    const pathname    = rawPathname ?? "";

    // Track desktop breakpoint (≥ 1024 px) — single listener for entire sidebar tree
    const [isDesktop, setIsDesktop] = useState(false);
    useEffect(() => {
        const mq      = window.matchMedia("(min-width: 1024px)");
        setIsDesktop(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);

    const jacqesMode  = isJacqesRoute(pathname);
    const cazaMode    = isCazaRoute(pathname);
    const advisorMode = isAdvisorRoute(pathname);
    const ventureMode = isVentureRoute(pathname);

    return (
        <SidebarCtx.Provider value={{ collapsed, isDesktop, toggle: onToggle }}>
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
        </SidebarCtx.Provider>
    );
}
