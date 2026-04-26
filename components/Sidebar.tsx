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
    ShieldAlert,
    UserPlus,
    ClipboardList,
    MessageSquare,
    ArrowUpRight,
    ArrowDownLeft,
    CheckCircle2,
    Scale,
    BookOpen,
    Receipt,
    Building,
    AlertTriangle,
    Lock,
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
    { label: "AP & AR",        href: "/jacqes/ap-ar",       icon: ArrowDownLeft   },
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
    { label: "Contas",         href: "/caza-vision/contas",            icon: Briefcase       },
    { label: "Financial",      href: "/caza-vision/financial",         icon: DollarSign      },
    { label: "Unit Economics", href: "/caza-vision/unit-economics",    icon: Calculator      },
    { label: "AP & AR",        href: "/caza-vision/ap-ar",             icon: ArrowDownLeft   },
    { label: "Importar",       href: "/caza-vision/import",            icon: FileUp          },
];

// CRM sub-navigation da Caza Vision — isolado do CRM JACQES
const cazaCrmNav = [
    { label: "Visão Geral",   href: "/caza-vision/crm",                icon: LayoutDashboard },
    { label: "Pipeline",      href: "/caza-vision/crm/pipeline",       icon: TrendingUp      },
    { label: "Leads",         href: "/caza-vision/crm/leads",          icon: UserPlus        },
    { label: "Oportunidades", href: "/caza-vision/crm/oportunidades",  icon: CheckCircle2    },
    { label: "Propostas",     href: "/caza-vision/crm/propostas",      icon: FileText        },
    { label: "Carteira",      href: "/caza-vision/clientes",           icon: Wallet          },
    { label: "Relatórios CRM",href: "/caza-vision/crm/relatorios",     icon: BarChart3       },
];

const advisorNav = [
    { label: "Visão Geral", href: "/advisor",              icon: LayoutDashboard },
    { label: "Financial",   href: "/advisor/financial",    icon: DollarSign      },
    { label: "Customers",   href: "/advisor/customers",    icon: Users           },
    { label: "AP & AR",     href: "/advisor/ap-ar",        icon: ArrowDownLeft   },
];

const ventureNav = [
    { label: "Visão Geral", href: "/awq-venture",              icon: LayoutDashboard },
    { label: "Comercial",   href: "/awq-venture/comercial",    icon: TrendingUp      },
    { label: "Deals",       href: "/awq-venture/deals",        icon: FileText        },
    { label: "Pipeline",    href: "/awq-venture/pipeline",     icon: Activity        },
    { label: "Portfólio",   href: "/awq-venture/portfolio",    icon: Briefcase       },
    { label: "Financial",   href: "/awq-venture/financial",    icon: DollarSign      },
    { label: "AP & AR",     href: "/awq-venture/ap-ar",        icon: ArrowDownLeft   },
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

// ── GOVERNANCE REGISTRY: AWQ holding routes by ERP layer ─────────────────────
// RULE: Every /awq/* page MUST appear here and ONLY here.
// To add a new page: append to the correct section array → never elsewhere.

// Control Tower — visão executiva, KPIs, risco, portfolio
const AWQ_CONTROL_TOWER_ITEMS = [
    { label: "KPIs Consolidados", href: "/awq/kpis",        icon: BarChart3      },
    { label: "Risk & Alertas",    href: "/awq/risk",         icon: AlertTriangle  },
    { label: "Portfolio",         href: "/awq/portfolio",    icon: Briefcase      },
    { label: "Allocations",       href: "/awq/allocations",  icon: Wallet         },
] as const;

// Financeiro Corporativo — FP&A (DRE, planejamento, projeção)
const AWQ_FPA_ITEMS = [
    { label: "Financial (DRE)", href: "/awq/financial",   icon: LineChart  },
    { label: "Budget",          href: "/awq/budget",      icon: BarChart3  },
    { label: "Forecast",        href: "/awq/forecast",    icon: TrendingUp },
] as const;

// Financeiro Corporativo — Tesouraria (caixa, contas, aplicações)
// Conciliação aparece PRIMEIRO — é o passo operacional que alimenta DFC/DRE/KPIs.
const AWQ_TESOURARIA_ITEMS = [
    { label: "Conciliação",   href: "/awq/conciliacao",    icon: CheckCircle2 },
    { label: "Cash Flow",     href: "/awq/cashflow",       icon: Zap          },
    { label: "Contas Banco",  href: "/awq/bank",           icon: CreditCard   },
    { label: "Investimentos", href: "/awq/investments",    icon: Landmark     },
    { label: "AP & AR",       href: "/awq/ap-ar",          icon: FileText     },
] as const;

// Financeiro Corporativo — Controladoria & Contábil
const AWQ_CONTROLADORIA_ITEMS = [
    { label: "Controladoria", href: "/awq/management",    icon: ShieldCheck },
    { label: "Contabilidade", href: "/awq/contabilidade", icon: BookOpen    },
    { label: "Fiscal",        href: "/awq/fiscal",        icon: Receipt     },
] as const;

// Governança & Jurídico
const AWQ_JURIDICO_ITEMS = [
    { label: "Jurídico",    href: "/awq/juridico",   icon: Scale    },
    { label: "Societário",  href: "/awq/societario", icon: Building },
    { label: "Compliance",  href: "/awq/compliance", icon: Lock     },
] as const;

// Dados & Infra
const AWQ_DADOS_ITEMS = [
    { label: "Base de Dados", href: "/awq/data",      icon: Database    },
    { label: "Segurança",     href: "/awq/security",  icon: ShieldAlert },
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

// ── Collapsible section helper ────────────────────────────────────────────────
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

// ── AWQ Group sidebar ────────────────────────────────────────────────────────
// Navigation structure follows the AWQ ERP macro-architecture:
//   1. Control Tower    — visão executiva, KPIs, risco, portfolio
//   2. Financeiro Corp  — FP&A · Tesouraria · Controladoria
//   3. Governança       — Jurídico · Societário
//   4. Dados & Infra    — Ingestão · Base de Dados
//   5. Business Units   — access cards to BU sidebars
function AwqSidebar({ pathname }: { pathname: string }) {
    const isActive = (href: string) =>
        href === "/awq"
            ? pathname === "/awq"
            : pathname === href || pathname.startsWith(href + "/");

    const isGroupActive = (items: readonly { href: string }[]) =>
        items.some((i) => pathname === i.href || pathname.startsWith(i.href + "/"));

    // Collapsible open states — auto-expand when child route is active
    const ctActive           = isGroupActive(AWQ_CONTROL_TOWER_ITEMS);
    const fpaActive          = isGroupActive(AWQ_FPA_ITEMS);
    const tesourariaActive   = isGroupActive(AWQ_TESOURARIA_ITEMS);
    const controladoriaActive= isGroupActive(AWQ_CONTROLADORIA_ITEMS);

    // Initialize all sections closed to avoid SSR/client hydration mismatch
    // (usePathname() returns different values during static export vs. browser).
    // useEffect opens the correct section after mount.
    const [ctOpen,            setCtOpen]           = useState(false);
    const [fpaOpen,           setFpaOpen]          = useState(false);
    const [tesourariaOpen,    setTesourariaOpen]   = useState(false);
    const [controladoriaOpen, setControladoriaOpen]= useState(false);

    useEffect(() => { if (ctActive)           setCtOpen(true);           }, [ctActive]);
    useEffect(() => { if (fpaActive)          setFpaOpen(true);          }, [fpaActive]);
    useEffect(() => { if (tesourariaActive)   setTesourariaOpen(true);   }, [tesourariaActive]);
    useEffect(() => { if (controladoriaActive)setControladoriaOpen(true);}, [controladoriaActive]);

    return (
        <>
            <AwqHeader />
            <nav className="flex-1 overflow-y-auto px-3 py-2">

                {/* ── 1. Control Tower ──────────────────────────────────── */}
                <SectionLabel>Control Tower</SectionLabel>
                <div className="space-y-0.5">
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

                {/* ── 2. Financeiro Corporativo ─────────────────────────── */}
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

                {/* ── 3. Governança & Jurídico ──────────────────────────── */}
                <SectionLabel>Governança & Jurídico</SectionLabel>
                <div className="space-y-0.5">
                    {AWQ_JURIDICO_ITEMS.map((item) => (
                        <NavItem key={item.href} {...item} active={isActive(item.href)} />
                    ))}
                </div>

                {/* ── 4. Dados & Infra ──────────────────────────────────── */}
                <SectionLabel>Dados & Infra</SectionLabel>
                <div className="space-y-0.5">
                    {AWQ_DADOS_ITEMS.map((item) => (
                        <NavItem key={item.href} {...item} active={isActive(item.href)} />
                    ))}
                </div>

                {/* ── 5. Business Unit quick-access cards ───────────────── */}
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
    const [crmOpen, setCrmOpen] = useState(false);

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

    const isCazaCrmActive = pathname === "/caza-vision/crm" || pathname.startsWith("/caza-vision/crm/");
    const [crmOpen, setCrmOpen] = useState(false);

    useEffect(() => {
        if (isCazaCrmActive) setCrmOpen(true);
    }, [isCazaCrmActive]);
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

                {/* CRM — collapsible group, isolado do CRM JACQES */}
                <div className="mt-0.5">
                    <button
                        onClick={() => setCrmOpen((o) => !o)}
                        className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-1",
                            isCazaCrmActive
                                ? "bg-emerald-50 text-emerald-700 shadow-sm"
                                : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                        )}
                    >
                        <Users
                            size={16}
                            className={cn(
                                "shrink-0 transition-colors",
                                isCazaCrmActive ? "text-emerald-600" : "text-gray-400"
                            )}
                        />
                        <span className="flex-1 text-left truncate">CRM</span>
                        {crmOpen ? (
                            <ChevronDown size={13} className="shrink-0 text-gray-400" />
                        ) : (
                            <ChevronRight size={13} className="shrink-0 text-gray-400" />
                        )}
                    </button>

                    {crmOpen && (
                        <div className="ml-3 mt-0.5 pl-3 border-l border-gray-100 space-y-0.5">
                            {cazaCrmNav.map((item) => (
                                <NavItem
                                    key={item.href}
                                    href={item.href}
                                    icon={item.icon}
                                    label={item.label}
                                    active={
                                        item.href === "/caza-vision/crm"
                                            ? pathname === "/caza-vision/crm"
                                            : pathname === item.href || pathname.startsWith(item.href + "/")
                                    }
                                />
                            ))}
                        </div>
                    )}
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
