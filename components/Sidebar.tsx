"use client";

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
    Tag,
    Building2,
    LineChart,
    Film,
    FileText,
    Calculator,
    Wallet,
    CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Route membership ──────────────────────────────────────────────────────────
const JACQES_PREFIXES = [
    "/jacqes",
    "/desempenho",
    "/carteira",
    "/analise",
    "/csops",
    "/revenue",
    "/reports",
];

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
    { label: "Visão Geral",    href: "/jacqes",                 icon: LayoutDashboard },
    { label: "Desempenho",     href: "/desempenho",             icon: TrendingUp       },
    { label: "Carteira",       href: "/carteira",               icon: Users            },
    { label: "Análise",        href: "/analise",                icon: Activity         },
    { label: "CS Ops",         href: "/csops",                  icon: HeartPulse       },
    { label: "Financial",      href: "/jacqes/financial",       icon: DollarSign       },
    { label: "Customers",      href: "/jacqes/customers",       icon: Users            },
    { label: "Unit Economics", href: "/jacqes/unit-economics",  icon: Calculator       },
    { label: "Budget",         href: "/jacqes/budget",          icon: Wallet           },
    { label: "Relatórios",     href: "/reports",                icon: BarChart3        },
    { label: "Categorias",     href: "/categorias",             icon: Tag              },
];

const cazaNav = [
    { label: "Visão Geral",    href: "/caza-vision",                   icon: LayoutDashboard },
    { label: "Projetos",       href: "/caza-vision/imoveis",           icon: Film            },
    { label: "Clientes",       href: "/caza-vision/clientes",          icon: Users           },
    { label: "Financial",      href: "/caza-vision/financial",         icon: DollarSign      },
    { label: "Unit Economics", href: "/caza-vision/unit-economics",    icon: Calculator      },
    { label: "Pipeline",       href: "/caza-vision/pipeline",          icon: Activity        },
    { label: "Relatórios",     href: "/caza-vision/relatorios",        icon: BarChart3       },
];

const advisorNav = [
    { label: "Visão Geral", href: "/advisor",              icon: LayoutDashboard },
    { label: "Financial",   href: "/advisor/financial",    icon: DollarSign      },
    { label: "Customers",   href: "/advisor/customers",    icon: Users           },
    { label: "Portfólio",   href: "/advisor/portfolio",    icon: LineChart       },
    { label: "Relatórios",  href: "/advisor/relatorios",   icon: FileText        },
];

const ventureNav = [
    { label: "Visão Geral", href: "/awq-venture",           icon: LayoutDashboard },
    { label: "Portfólio",   href: "/awq-venture/portfolio", icon: Briefcase       },
    { label: "Pipeline",    href: "/awq-venture/pipeline",  icon: Activity        },
    { label: "Financial",   href: "/awq-venture/financial", icon: DollarSign      },
];

const gestaoNav = [
    { label: "Modo Carreira", href: "/carreira", icon: Briefcase },
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
        href: "https://contato22.github.io/jacqes-bi/",
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
        href: "https://contato22.github.io/advisor-bi/",
        icon: Briefcase,
        color: "bg-violet-600",
    },
];

const awqNav = [
    { label: "Visão Geral",    href: "/awq",            icon: LayoutDashboard },
    { label: "Business Units", href: "/business-units",  icon: Building2       },
    { label: "Financial",      href: "/awq/financial",   icon: LineChart       },
    { label: "Cash Flow",      href: "/awq/cashflow",    icon: Zap             },
    { label: "Budget",         href: "/awq/budget",      icon: Wallet          },
    { label: "Forecast",       href: "/awq/forecast",    icon: TrendingUp      },
    { label: "Allocations",    href: "/awq/allocations", icon: Wallet          },
    { label: "Risk",           href: "/awq/risk",        icon: Activity        },
    { label: "FEM",            href: "/awq/fem",         icon: TrendingUp      },
    { label: "Contas Banco",   href: "/awq/bank",        icon: CreditCard      },
];

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
            className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group",
                active
                    ? "bg-brand-50 text-brand-700 border border-brand-200"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            )}
        >
            <Icon
                size={16}
                className={cn(active ? "text-brand-600" : "text-gray-400 group-hover:text-gray-400")}
            />
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
    return (
        <div className="px-4 py-4 border-t border-gray-100">
            <div className="flex items-center gap-3 px-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-awq-gold to-amber-600 flex items-center justify-center text-xs font-bold text-gray-900 shrink-0">
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
                <button
                    className="p-1.5 text-gray-400 hover:text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
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
    const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
    return (
        <>
            <AwqHeader />
            <nav className="flex-1 overflow-y-auto px-3 py-2">
                <SectionLabel>AWQ Group</SectionLabel>
                <div className="space-y-0.5">
                    {awqNav.map((item) => (
                        <NavItem key={item.href} {...item} active={isActive(item.href)} />
                    ))}
                </div>

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
    const isActive = (href: string) => pathname.startsWith(href);
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
        <aside className="w-[260px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col h-full">
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
        </aside>
    );
}
