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
    CheckCircle2,
    Scale,
    BookOpen,
    Receipt,
    Building,
    AlertTriangle,
    Lock,
    Layers,
    PieChart,
    ListOrdered,
    ArrowDownLeft,
    Target,
    LayoutGrid,
    GanttChart,
    Clock,
    FolderOpen,
    Package,
    ShoppingCart,
    Calendar,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Route membership ──────────────────────────────────────────────────────────
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

// ── BU nav arrays (unchanged) ─────────────────────────────────────────────────
const jacqesNav = [
    { label: "Visão Geral",    href: "/jacqes",             icon: LayoutDashboard },
    { label: "FP&A",           href: "/jacqes/fpa",         icon: BarChart3       },
    { label: "Relatórios",     href: "/jacqes/reports",     icon: BarChart3       },
];

const cazaNav = [
    { label: "Visão Geral",    href: "/caza-vision",                   icon: LayoutDashboard },
    { label: "Projetos",       href: "/caza-vision/imoveis",           icon: Film            },
    { label: "Clientes",       href: "/caza-vision/clientes",          icon: Users           },
    { label: "Contas",         href: "/caza-vision/contas",            icon: Briefcase       },
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

// ── Business Units ─────────────────────────────────────────────────────────────
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

// ── AWQ Modules — icon sidebar ────────────────────────────────────────────────
// Each module groups related routes under a single icon.
// Existing hrefs are preserved; new stubs use /awq/<module>/<slug> convention.
type ModuleItem = { label: string; href: string; icon: React.ElementType };
type AwqModule = {
    id: string;
    label: string;
    description: string;
    icon: React.ElementType;
    items: ModuleItem[];
};

const AWQ_MODULES: AwqModule[] = [
    {
        id: "epm",
        label: "EPM",
        description: "Dinheiro, finanças, budget, P&L, cashflow, AP/AR",
        icon: DollarSign,
        items: [
            { label: "Visão Geral EPM",       href: "/awq/epm",                       icon: Layers        },
            { label: "Financial (DRE)",        href: "/awq/financial",                 icon: LineChart     },
            { label: "P&L (DRE)",             href: "/awq/epm/pl",                    icon: LineChart     },
            { label: "Balanço Patrimonial",    href: "/awq/epm/balance-sheet",         icon: Scale         },
            { label: "Budget",                href: "/awq/budget",                    icon: BarChart3     },
            { label: "Forecast",              href: "/awq/forecast",                  icon: TrendingUp    },
            { label: "Budget vs Actual",      href: "/awq/epm/budget",                icon: Target        },
            { label: "Cash Flow",             href: "/awq/cashflow",                  icon: Zap           },
            { label: "Conciliação",           href: "/awq/conciliacao",               icon: CheckCircle2  },
            { label: "Contas Banco",          href: "/awq/bank",                      icon: CreditCard    },
            { label: "Investimentos",         href: "/awq/investments",               icon: Landmark      },
            { label: "AP & AR",               href: "/awq/ap-ar",                     icon: FileText      },
            { label: "Contas a Pagar",        href: "/awq/epm/ap",                    icon: ArrowDownLeft },
            { label: "AP Aging",              href: "/awq/epm/ap/aging",              icon: Receipt       },
            { label: "Contas a Receber",      href: "/awq/epm/ar",                    icon: ArrowUpRight  },
            { label: "AR Aging",              href: "/awq/epm/ar/aging",              icon: Receipt       },
            { label: "KPI Dashboard",         href: "/awq/epm/kpis",                  icon: PieChart      },
            { label: "Fornecedores",          href: "/awq/epm/suppliers",             icon: Building2     },
            { label: "Clientes EPM",          href: "/awq/epm/customers",             icon: Users         },
            { label: "Razão Geral (GL)",      href: "/awq/epm/gl",                    icon: ListOrdered   },
            { label: "Consolidação",          href: "/awq/epm/consolidation",         icon: Building2     },
            { label: "Conciliação Bancária",  href: "/awq/epm/bank-reconciliation",   icon: Landmark      },
            { label: "Reconhec. de Receita",  href: "/awq/epm/revenue-recognition",   icon: BookOpen      },
            { label: "Centros de Custo",      href: "/awq/epm/cost-centers",          icon: LayoutGrid    },
            { label: "Controladoria",         href: "/awq/management",                icon: ShieldCheck   },
            { label: "Contabilidade",         href: "/awq/contabilidade",             icon: BookOpen      },
            { label: "Fiscal",                href: "/awq/fiscal",                    icon: Receipt       },
        ],
    },
    {
        id: "crm",
        label: "CRM",
        description: "Vendas, leads, pipeline, clientes, oportunidades",
        icon: Users,
        items: [
            { label: "Dashboard CRM",  href: "/crm",                   icon: Target       },
            { label: "Leads",          href: "/crm/leads",             icon: UserPlus     },
            { label: "Pipeline",       href: "/crm/pipeline",          icon: Activity     },
            { label: "Clientes",       href: "/crm/customers",         icon: Users        },
            { label: "Oportunidades",  href: "/crm/opportunities",     icon: ArrowUpRight },
        ],
    },
    {
        id: "ppm",
        label: "PPM",
        description: "Projetos, tasks, alocação de pessoas, cronogramas",
        icon: GanttChart,
        items: [
            { label: "Portfolio",      href: "/awq/ppm",               icon: Briefcase     },
            { label: "Gantt",          href: "/awq/ppm/gantt",         icon: GanttChart    },
            { label: "Tarefas",        href: "/awq/ppm/tasks",         icon: ClipboardList },
            { label: "Timesheets",     href: "/awq/ppm/timesheets",    icon: Clock         },
            { label: "Recursos",       href: "/awq/ppm/resources",     icon: Users         },
            { label: "Utilização",     href: "/awq/ppm/utilization",   icon: BarChart3     },
            { label: "Rentabilidade",  href: "/awq/ppm/profitability", icon: TrendingUp    },
            { label: "Riscos",         href: "/awq/ppm/risks",         icon: AlertTriangle },
        ],
    },
    {
        id: "bpm",
        label: "BPM",
        description: "Processos, workflows, aprovações, automação",
        icon: Activity,
        items: [
            { label: "Minha Fila",  href: "/awq/bpm/tasks",                 icon: ClipboardList },
            { label: "Processos",   href: "/awq/bpm/processes",             icon: Activity      },
            { label: "Instâncias",  href: "/awq/bpm/instances",             icon: Layers        },
            { label: "Analytics",   href: "/awq/bpm/analytics/performance", icon: BarChart3     },
        ],
    },
    {
        id: "bi",
        label: "BI",
        description: "Dashboards, relatórios, análises, visualizações",
        icon: PieChart,
        items: [
            { label: "Dashboards",    href: "/awq/bi",                icon: PieChart  },
            { label: "Relatórios",    href: "/awq/bi/reports",        icon: FileText  },
            { label: "Análises",      href: "/awq/bi/analytics",      icon: BarChart3 },
            { label: "Visualizações", href: "/awq/bi/visualizations", icon: LineChart },
            { label: "Base de Dados", href: "/awq/data",              icon: Database  },
        ],
    },
    {
        id: "cpm",
        label: "CPM",
        description: "Estratégia, OKRs, scorecards, performance reviews",
        icon: Target,
        items: [
            { label: "KPIs Consolidados",   href: "/awq/kpis",            icon: BarChart3     },
            { label: "Risk & Alertas",      href: "/awq/risk",            icon: AlertTriangle },
            { label: "Portfolio Corp.",     href: "/awq/portfolio",       icon: Briefcase     },
            { label: "Allocations",         href: "/awq/allocations",     icon: Wallet        },
            { label: "Estratégia",          href: "/awq/cpm/strategy",    icon: Target        },
            { label: "OKRs",                href: "/awq/cpm/okrs",        icon: CheckCircle2  },
            { label: "Scorecards",          href: "/awq/cpm/scorecards",  icon: ClipboardList },
            { label: "Performance Reviews", href: "/awq/cpm/reviews",     icon: BarChart3     },
            { label: "Novidades",           href: "/awq/novidades",       icon: Sparkles      },
        ],
    },
    {
        id: "grc",
        label: "GRC",
        description: "Políticas, riscos, compliance, auditorias, controles",
        icon: ShieldCheck,
        items: [
            { label: "Jurídico",    href: "/awq/juridico",      icon: Scale        },
            { label: "Societário",  href: "/awq/societario",    icon: Building     },
            { label: "Compliance",  href: "/awq/compliance",    icon: Lock         },
            { label: "Segurança",   href: "/awq/security",      icon: ShieldAlert  },
            { label: "Políticas",   href: "/awq/grc/policies",  icon: FileText     },
            { label: "Riscos",      href: "/awq/grc/risks",     icon: AlertTriangle},
            { label: "Auditorias",  href: "/awq/grc/audits",    icon: ClipboardList},
            { label: "Controles",   href: "/awq/grc/controls",  icon: ShieldCheck  },
        ],
    },
    {
        id: "dms",
        label: "DMS",
        description: "Documentos, arquivos, versionamento, colaboração",
        icon: FolderOpen,
        items: [
            { label: "Documentos",    href: "/awq/dms",                  icon: FileText     },
            { label: "Arquivos",      href: "/awq/dms/files",            icon: FolderOpen   },
            { label: "Versionamento", href: "/awq/dms/versioning",       icon: Layers       },
            { label: "Colaboração",   href: "/awq/dms/collaboration",    icon: MessageSquare},
        ],
    },
    {
        id: "erp",
        label: "ERP",
        description: "Compras, contratos, time tracking, assets",
        icon: Package,
        items: [
            { label: "Compras",       href: "/awq/erp/purchases",    icon: ShoppingCart },
            { label: "Contratos",     href: "/awq/erp/contracts",    icon: FileText     },
            { label: "Time Tracking", href: "/awq/erp/timetracking", icon: Clock        },
            { label: "Assets",        href: "/awq/erp/assets",       icon: Package      },
        ],
    },
    {
        id: "hcm",
        label: "HCM",
        description: "RH, folha, férias, recrutamento, treinamento",
        icon: HeartPulse,
        items: [
            { label: "RH",                href: "/awq/hcm",              icon: Users      },
            { label: "Folha de Pagamento", href: "/awq/hcm/payroll",     icon: DollarSign },
            { label: "Férias",            href: "/awq/hcm/vacation",     icon: Calendar   },
            { label: "Recrutamento",      href: "/awq/hcm/recruitment",  icon: UserPlus   },
            { label: "Treinamento",       href: "/awq/hcm/training",     icon: BookOpen   },
        ],
    },
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

// ── AWQ Group header ─────────────────────────────────────────────────────────
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

// ── Footer (BU sidebars) ──────────────────────────────────────────────────────
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

// ── Slim footer for icon sidebar ──────────────────────────────────────────────
function SlimSidebarFooter() {
    const { data: session } = useSession();
    const user = session?.user as { name?: string; email?: string } | undefined;
    const name = user?.name ?? user?.email ?? "?";
    const initials =
        name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

    return (
        <div className="px-2 py-3 border-t border-gray-100 shrink-0">
            <button
                onClick={() => void signOut({ callbackUrl: "/login" })}
                title="Sair"
                className="flex flex-col items-center gap-0.5 w-full py-1.5 rounded-lg hover:bg-red-50 transition-colors group"
            >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-awq-gold to-amber-600 flex items-center justify-center text-[10px] font-bold text-gray-900">
                    {initials}
                </div>
                <LogOut size={10} className="text-gray-300 group-hover:text-red-400 transition-colors" />
            </button>
        </div>
    );
}

// ── CollapsibleSection (used by BU sidebars) ──────────────────────────────────
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

// ── AWQ Group sidebar — icon-only with flyout panels ─────────────────────────
function AwqSidebar({ pathname }: { pathname: string }) {
    const [activePanel, setActivePanel] = useState<string | null>(null);

    // Close flyout on navigation
    useEffect(() => {
        setActivePanel(null);
    }, [pathname]);

    const isActive = (href: string) =>
        href === "/awq"
            ? pathname === "/awq"
            : pathname === href || pathname.startsWith(href + "/");

    const isModuleActive = (items: ModuleItem[]) =>
        items.some((i) => isActive(i.href));

    const togglePanel = (id: string) =>
        setActivePanel((prev) => (prev === id ? null : id));

    // Resolve flyout content
    const activeMod = AWQ_MODULES.find((m) => m.id === activePanel);

    return (
        <>
            {/* ── Icon bar ─────────────────────────────────────────── */}
            <div className="flex flex-col h-full w-16 bg-white border-r border-gray-100 relative z-30">
                {/* Logo */}
                <div className="h-14 flex items-center justify-center border-b border-gray-100 shrink-0">
                    <Link href="/awq" onClick={() => setActivePanel(null)}>
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-awq-gold to-amber-600 flex items-center justify-center shadow-md">
                            <Zap size={17} className="text-gray-900" />
                        </div>
                    </Link>
                </div>

                {/* Home shortcut */}
                <div className="px-2 pt-2 shrink-0">
                    <Link
                        href="/awq"
                        onClick={() => setActivePanel(null)}
                        title="Visão Geral"
                        className={cn(
                            "flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg transition-all w-full",
                            pathname === "/awq"
                                ? "bg-brand-50 text-brand-700"
                                : "text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                        )}
                    >
                        <LayoutDashboard size={18} />
                        <span className="text-[9px] font-semibold leading-none">Início</span>
                    </Link>
                </div>

                <div className="mx-3 my-1.5 border-t border-gray-100 shrink-0" />

                {/* Module icons */}
                <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5 scrollbar-none">
                    {AWQ_MODULES.map((mod) => {
                        const modActive = isModuleActive(mod.items);
                        const isOpen = activePanel === mod.id;
                        return (
                            <button
                                key={mod.id}
                                onClick={() => togglePanel(mod.id)}
                                title={`${mod.label}`}
                                className={cn(
                                    "flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg transition-all w-full",
                                    isOpen
                                        ? "bg-brand-600 text-white shadow-sm"
                                        : modActive
                                        ? "bg-brand-50 text-brand-700"
                                        : "text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                                )}
                            >
                                <mod.icon size={18} className="shrink-0" />
                                <span className="text-[9px] font-bold leading-none tracking-wide">
                                    {mod.label}
                                </span>
                            </button>
                        );
                    })}
                </nav>

                <div className="mx-3 my-1.5 border-t border-gray-100 shrink-0" />

                {/* Bottom icons */}
                <div className="px-2 pb-1 space-y-0.5 shrink-0">
                    {/* Business Units */}
                    <button
                        onClick={() => togglePanel("bus")}
                        title="Business Units"
                        className={cn(
                            "flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg transition-all w-full",
                            activePanel === "bus"
                                ? "bg-brand-600 text-white"
                                : "text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                        )}
                    >
                        <Building2 size={18} />
                        <span className="text-[9px] font-bold leading-none">BUs</span>
                    </button>

                    {/* IA & Agentes */}
                    <button
                        onClick={() => togglePanel("ai")}
                        title="IA & Agentes"
                        className={cn(
                            "flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg transition-all w-full",
                            activePanel === "ai"
                                ? "bg-brand-600 text-white"
                                : "text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                        )}
                    >
                        <Bot size={18} />
                        <span className="text-[9px] font-bold leading-none">IA</span>
                    </button>

                    {/* Settings */}
                    <Link
                        href="/settings"
                        title="Settings"
                        className={cn(
                            "flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg transition-all w-full",
                            pathname === "/settings"
                                ? "bg-brand-50 text-brand-700"
                                : "text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                        )}
                    >
                        <Settings size={18} />
                    </Link>
                </div>

                <SlimSidebarFooter />
            </div>

            {/* ── Flyout panel ─────────────────────────────────────── */}
            {activePanel && (
                <>
                    {/* Backdrop — click outside to close */}
                    <div
                        className="fixed inset-0 z-20"
                        onClick={() => setActivePanel(null)}
                    />

                    {/* Panel */}
                    <div className="fixed left-16 top-0 h-full w-64 bg-white border-r border-gray-200 shadow-2xl z-30 flex flex-col">
                        {/* Panel header */}
                        <div className="px-4 py-4 border-b border-gray-100 flex items-start justify-between shrink-0">
                            <div>
                                <div className="text-sm font-bold text-gray-900">
                                    {activePanel === "bus"
                                        ? "Business Units"
                                        : activePanel === "ai"
                                        ? "IA & Agentes"
                                        : activeMod?.label}
                                </div>
                                <div className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                                    {activePanel === "bus"
                                        ? "Unidades de Negócio"
                                        : activePanel === "ai"
                                        ? "Agentes e ferramentas"
                                        : activeMod?.description}
                                </div>
                            </div>
                            <button
                                onClick={() => setActivePanel(null)}
                                className="p-1 text-gray-300 hover:text-gray-500 rounded transition-colors shrink-0 ml-2"
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* Panel nav */}
                        <nav className="flex-1 overflow-y-auto px-3 py-2">
                            {activePanel === "bus" && (
                                <div className="space-y-2 mt-1">
                                    {businessUnits.map((bu) => (
                                        <Link
                                            key={bu.id}
                                            href={bu.href}
                                            onClick={() => setActivePanel(null)}
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

                            {activePanel === "ai" && (
                                <div className="space-y-0.5 mt-1">
                                    {aiNav.map((item) => (
                                        <NavItem
                                            key={item.href}
                                            {...item}
                                            active={isActive(item.href)}
                                        />
                                    ))}
                                </div>
                            )}

                            {activeMod && (
                                <div className="space-y-0.5 mt-1">
                                    {activeMod.items.map((item) => (
                                        <NavItem
                                            key={item.href}
                                            {...item}
                                            active={isActive(item.href)}
                                        />
                                    ))}
                                </div>
                            )}
                        </nav>
                    </div>
                </>
            )}
        </>
    );
}

// ── BU sidebar — generic icon-only + flyout ───────────────────────────────────
// Each BU defines its own modules using only its own routes (no cross-BU data).

type BUModule = {
    id: string;
    label: string;
    description: string;
    icon: React.ElementType;
    items: ModuleItem[];
};

// Per-BU color tokens (full Tailwind class strings for JIT)
type BUColors = {
    iconBg: string;   // open/selected icon button bg
    activeBg: string; // active route highlight bg
    activeText: string;
};

const BU_COLORS: Record<string, BUColors> = {
    jacqes:  { iconBg: "bg-brand-600",   activeBg: "bg-brand-50",   activeText: "text-brand-700"   },
    caza:    { iconBg: "bg-emerald-600",  activeBg: "bg-emerald-50", activeText: "text-emerald-700" },
    advisor: { iconBg: "bg-violet-600",   activeBg: "bg-violet-50",  activeText: "text-violet-700"  },
    venture: { iconBg: "bg-amber-600",    activeBg: "bg-amber-50",   activeText: "text-amber-700"   },
};

// ── Module configs — only existing BU routes, no new pages ────────────────────

const JACQES_MODULES: BUModule[] = [
    {
        id: "epm",
        label: "EPM",
        description: "Financeiro & Performance",
        icon: DollarSign,
        items: [
            { label: "FP&A",       href: "/jacqes/fpa",     icon: BarChart3 },
            { label: "Relatórios", href: "/jacqes/reports", icon: FileText  },
        ],
    },
    {
        id: "crm",
        label: "CRM",
        description: "Vendas & Relacionamento",
        icon: Users,
        items: [
            { label: "Dashboard CRM",  href: "/crm",               icon: Target       },
            { label: "Leads",          href: "/crm/leads",         icon: UserPlus     },
            { label: "Pipeline",       href: "/crm/pipeline",      icon: Activity     },
            { label: "Clientes",       href: "/crm/customers",     icon: Users        },
            { label: "Oportunidades",  href: "/crm/opportunities", icon: ArrowUpRight },
        ],
    },
    {
        id: "ops",
        label: "Gestão",
        description: "Carreira & Operações",
        icon: Briefcase,
        items: [
            { label: "Modo Carreira", href: "/jacqes/carreira", icon: Briefcase },
        ],
    },
];

const CAZA_MODULES: BUModule[] = [
    {
        id: "epm",
        label: "EPM",
        description: "Financeiro & Performance",
        icon: DollarSign,
        items: [
            { label: "Financial",      href: "/caza-vision/financial",      icon: DollarSign },
            { label: "Unit Economics", href: "/caza-vision/unit-economics", icon: Calculator },
            { label: "Contas",         href: "/caza-vision/contas",         icon: Briefcase  },
            { label: "Importar",       href: "/caza-vision/import",         icon: FileUp     },
        ],
    },
    {
        id: "ppm",
        label: "PPM",
        description: "Projetos & Portfólio",
        icon: Film,
        items: [
            { label: "Projetos", href: "/caza-vision/imoveis", icon: Film },
        ],
    },
    {
        id: "crm",
        label: "CRM",
        description: "Clientes & Relacionamento",
        icon: Users,
        items: [
            { label: "Clientes",      href: "/caza-vision/clientes", icon: Users  },
            { label: "Dashboard CRM", href: "/crm",                  icon: Target },
        ],
    },
];

const ADVISOR_MODULES: BUModule[] = [
    {
        id: "epm",
        label: "EPM",
        description: "Financeiro & Performance",
        icon: DollarSign,
        items: [
            { label: "Financial", href: "/advisor/financial", icon: DollarSign },
        ],
    },
    {
        id: "crm",
        label: "CRM",
        description: "Clientes & Relacionamento",
        icon: Users,
        items: [
            { label: "Customers", href: "/advisor/customers", icon: Users },
        ],
    },
];

const VENTURE_MODULES: BUModule[] = [
    {
        id: "epm",
        label: "EPM",
        description: "Financeiro & Performance",
        icon: DollarSign,
        items: [
            { label: "Financial", href: "/awq-venture/financial",  icon: DollarSign },
            { label: "YoY 2025",  href: "/awq-venture/yoy-2025",   icon: LineChart  },
        ],
    },
    {
        id: "crm",
        label: "CRM",
        description: "Comercial & Pipeline",
        icon: TrendingUp,
        items: [
            { label: "Comercial", href: "/awq-venture/comercial", icon: TrendingUp },
            { label: "Deals",     href: "/awq-venture/deals",     icon: FileText   },
            { label: "Pipeline",  href: "/awq-venture/pipeline",  icon: Activity   },
            { label: "Sales",     href: "/awq-venture/sales",     icon: DollarSign },
        ],
    },
    {
        id: "ppm",
        label: "PPM",
        description: "Portfólio & Investimentos",
        icon: Briefcase,
        items: [
            { label: "Portfólio", href: "/awq-venture/portfolio", icon: Briefcase },
        ],
    },
];

// ── Generic BU sidebar component ──────────────────────────────────────────────
function BUSidebar({
    buId,
    label,
    homeHref,
    headerIcon: HeaderIcon,
    modules,
    pathname,
    showBack = true,
}: {
    buId: string;
    label: string;
    homeHref: string;
    headerIcon: React.ElementType;
    modules: BUModule[];
    pathname: string;
    showBack?: boolean;
}) {
    const [activePanel, setActivePanel] = useState<string | null>(null);
    const colors = BU_COLORS[buId] ?? BU_COLORS.jacqes;

    useEffect(() => { setActivePanel(null); }, [pathname]);

    const isActive = (href: string) =>
        href === homeHref ? pathname === homeHref : pathname === href || pathname.startsWith(href + "/");

    const isModuleActive = (items: ModuleItem[]) => items.some((i) => isActive(i.href));

    const togglePanel = (id: string) => setActivePanel((prev) => (prev === id ? null : id));

    const activeMod = modules.find((m) => m.id === activePanel);

    return (
        <>
            {/* ── Icon bar ─────────────────────────────────────────── */}
            <div className="flex flex-col h-full w-16 bg-white border-r border-gray-100 relative z-30">

                {/* BU logo */}
                <div className="h-14 flex items-center justify-center border-b border-gray-100 shrink-0">
                    <Link href={homeHref} onClick={() => setActivePanel(null)} title={label}>
                        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shadow-md", colors.iconBg)}>
                            <HeaderIcon size={17} className="text-white" />
                        </div>
                    </Link>
                </div>

                {/* Back to AWQ */}
                {showBack && (
                    <div className="px-2 pt-2 shrink-0">
                        <Link
                            href="/business-units"
                            title="Voltar para AWQ Group"
                            className="flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg w-full text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all"
                        >
                            <ChevronLeft size={18} />
                            <span className="text-[9px] font-semibold leading-none">AWQ</span>
                        </Link>
                    </div>
                )}

                <div className="mx-3 my-1.5 border-t border-gray-100 shrink-0" />

                {/* Home */}
                <div className="px-2 shrink-0">
                    <Link
                        href={homeHref}
                        onClick={() => setActivePanel(null)}
                        title="Visão Geral"
                        className={cn(
                            "flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg transition-all w-full",
                            pathname === homeHref
                                ? cn(colors.activeBg, colors.activeText)
                                : "text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                        )}
                    >
                        <LayoutDashboard size={18} />
                        <span className="text-[9px] font-semibold leading-none">Início</span>
                    </Link>
                </div>

                <div className="mx-3 my-1.5 border-t border-gray-100 shrink-0" />

                {/* Module icons */}
                <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5 scrollbar-none">
                    {modules.map((mod) => {
                        const modActive = isModuleActive(mod.items);
                        const isOpen = activePanel === mod.id;
                        return (
                            <button
                                key={mod.id}
                                onClick={() => togglePanel(mod.id)}
                                title={mod.label}
                                className={cn(
                                    "flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg transition-all w-full",
                                    isOpen
                                        ? cn(colors.iconBg, "text-white shadow-sm")
                                        : modActive
                                        ? cn(colors.activeBg, colors.activeText)
                                        : "text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                                )}
                            >
                                <mod.icon size={18} className="shrink-0" />
                                <span className="text-[9px] font-bold leading-none tracking-wide">
                                    {mod.label}
                                </span>
                            </button>
                        );
                    })}
                </nav>

                <div className="mx-3 my-1.5 border-t border-gray-100 shrink-0" />

                {/* IA + Settings */}
                <div className="px-2 pb-1 space-y-0.5 shrink-0">
                    <button
                        onClick={() => togglePanel("ai")}
                        title="IA & Agentes"
                        className={cn(
                            "flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg transition-all w-full",
                            activePanel === "ai"
                                ? cn(colors.iconBg, "text-white")
                                : "text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                        )}
                    >
                        <Bot size={18} />
                        <span className="text-[9px] font-bold leading-none">IA</span>
                    </button>
                    <Link
                        href="/settings"
                        title="Settings"
                        className={cn(
                            "flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg transition-all w-full",
                            pathname === "/settings"
                                ? cn(colors.activeBg, colors.activeText)
                                : "text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                        )}
                    >
                        <Settings size={18} />
                    </Link>
                </div>

                <SlimSidebarFooter />
            </div>

            {/* ── Flyout panel ─────────────────────────────────────── */}
            {activePanel && (
                <>
                    <div className="fixed inset-0 z-20" onClick={() => setActivePanel(null)} />
                    <div className="fixed left-16 top-0 h-full w-64 bg-white border-r border-gray-200 shadow-2xl z-30 flex flex-col">
                        <div className="px-4 py-4 border-b border-gray-100 flex items-start justify-between shrink-0">
                            <div>
                                <div className="text-sm font-bold text-gray-900">
                                    {activePanel === "ai" ? "IA & Agentes" : activeMod?.label}
                                </div>
                                <div className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                                    {activePanel === "ai" ? "Agentes e ferramentas" : activeMod?.description}
                                </div>
                            </div>
                            <button
                                onClick={() => setActivePanel(null)}
                                className="p-1 text-gray-300 hover:text-gray-500 rounded transition-colors shrink-0 ml-2"
                            >
                                <X size={14} />
                            </button>
                        </div>
                        <nav className="flex-1 overflow-y-auto px-3 py-2">
                            {activePanel === "ai" ? (
                                <div className="space-y-0.5 mt-1">
                                    {aiNav.map((item) => (
                                        <NavItem key={item.href} {...item} active={isActive(item.href)} />
                                    ))}
                                </div>
                            ) : activeMod ? (
                                <div className="space-y-0.5 mt-1">
                                    {activeMod.items.map((item) => (
                                        <NavItem key={item.href} {...item} active={isActive(item.href)} />
                                    ))}
                                </div>
                            ) : null}
                        </nav>
                    </div>
                </>
            )}
        </>
    );
}

// ── BU sidebar wrappers ───────────────────────────────────────────────────────
function JacqesSidebar({ pathname }: { pathname: string }) {
    return (
        <BUSidebar
            buId="jacqes"
            label="JACQES"
            homeHref="/jacqes"
            headerIcon={BarChart3}
            modules={JACQES_MODULES}
            pathname={pathname}
        />
    );
}

function CazaSidebar({ pathname }: { pathname: string }) {
    const { data: session } = useSession();
    const isCazaOnly = (session?.user as { role?: string } | undefined)?.role === "caza";
    // isCazaOnly: show only overview, no back-to-AWQ
    const modules = isCazaOnly
        ? CAZA_MODULES.map((m) =>
            m.id === "epm"
                ? { ...m, items: m.items.filter((i) => i.href !== "/caza-vision/import") }
                : m
          )
        : CAZA_MODULES;
    return (
        <BUSidebar
            buId="caza"
            label="Caza Vision"
            homeHref="/caza-vision"
            headerIcon={Building2}
            modules={modules}
            pathname={pathname}
            showBack={!isCazaOnly}
        />
    );
}

function AdvisorSidebar({ pathname }: { pathname: string }) {
    return (
        <BUSidebar
            buId="advisor"
            label="Advisor"
            homeHref="/advisor"
            headerIcon={Briefcase}
            modules={ADVISOR_MODULES}
            pathname={pathname}
        />
    );
}

function AwqVentureSidebar({ pathname }: { pathname: string }) {
    return (
        <BUSidebar
            buId="venture"
            label="AWQ Venture"
            homeHref="/awq-venture"
            headerIcon={TrendingUp}
            modules={VENTURE_MODULES}
            pathname={pathname}
        />
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
