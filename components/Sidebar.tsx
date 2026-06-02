"use client";

import { useState, useEffect, useRef } from "react";
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
    Truck,
    Box,
    Wrench,
    RotateCcw,
    GitMerge,
    Star,
    ThumbsUp,
    Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Route membership ──────────────────────────────────────────────────────────
const JACQES_PREFIXES = ["/jacqes"];
const CAZA_PREFIXES = ["/caza-vision"];
const ADVISOR_PREFIXES = ["/advisor"];
const VENTURE_PREFIXES = ["/awq-venture"];
const ENRD_PREFIXES = ["/enrd"];
const CRM_PREFIXES = ["/crm"];
function isJacqesRoute(p: string) { return JACQES_PREFIXES.some((x) => p.startsWith(x)); }
function isCazaRoute(p: string)   { return CAZA_PREFIXES.some((x) => p.startsWith(x)); }
function isAdvisorRoute(p: string){ return ADVISOR_PREFIXES.some((x) => p.startsWith(x)); }
function isVentureRoute(p: string){ return VENTURE_PREFIXES.some((x) => p.startsWith(x)); }
function isEnrdRoute(p: string)   { return ENRD_PREFIXES.some((x) => p.startsWith(x)); }
function isCrmRoute(p: string)    { return CRM_PREFIXES.some((x) => p === x || p.startsWith(x + "/")); }

const EPM_PREFIXES = [
    "/awq/epm", "/awq/financial", "/awq/budget", "/awq/forecast",
    "/awq/cashflow", "/awq/conciliacao", "/awq/bank", "/awq/investments",
    "/awq/ap-ar", "/awq/management", "/awq/contabilidade", "/awq/fiscal",
];
function isEpmRoute(p: string) { return EPM_PREFIXES.some((x) => p === x || p.startsWith(x + "/")); }

const MA_PREFIXES = ["/awq/ma", "/awq/portfolio"];
function isMaRoute(p: string) { return MA_PREFIXES.some((x) => p === x || p.startsWith(x + "/")); }

const PPM_PREFIXES = ["/awq/ppm"];
function isPpmRoute(p: string) { return PPM_PREFIXES.some((x) => p === x || p.startsWith(x + "/")); }

const BI_PREFIXES = ["/awq/bi", "/awq/data"];
function isBiRoute(p: string) { return BI_PREFIXES.some((x) => p === x || p.startsWith(x + "/")); }

const SETTINGS_PREFIXES = ["/settings"];
function isSettingsRoute(p: string) { return SETTINGS_PREFIXES.some((x) => p === x || p.startsWith(x + "/")); }

// ── Nav data types ────────────────────────────────────────────────────────────
type NavBadgeVariant = "gold" | "blue" | "green";
type ModuleItem = {
    label: string;
    href: string;
    icon: React.ElementType;
    badge?: string;
    badgeVariant?: NavBadgeVariant;
    starred?: boolean;
};
type ModuleSection = {
    id: string;
    label: string;
    icon: React.ElementType;
    items: ModuleItem[];
};
type AwqModule = {
    id: string;
    label: string;
    description: string;
    icon: React.ElementType;
    items: ModuleItem[];
    sections?: ModuleSection[];
};

// ── BU nav arrays ─────────────────────────────────────────────────────────────
const aiNav: ModuleItem[] = [
    { label: "Agents",   href: "/agents",   icon: Bot      },
    { label: "OpenClaw", href: "/openclaw", icon: Sparkles },
];

const settingsPanelItems: ModuleItem[] = [
    { label: "Geral",       href: "/settings",                icon: Settings    },
    { label: "Segurança",   href: "/settings/security",       icon: ShieldCheck },
    { label: "Integrações", href: "/settings/integrations",   icon: Database    },
];

// ── AWQ_MODULES ───────────────────────────────────────────────────────────────
const AWQ_MODULES: AwqModule[] = [
    {
        id: "epm",
        label: "EPM",
        description: "Dinheiro, finanças, budget, P&L, cashflow, AP/AR",
        icon: DollarSign,
        items: [],
        sections: [
            {
                id: "financial-management",
                label: "Financial Management",
                icon: Landmark,
                items: [
                    { label: "Visão Geral EPM",       href: "/awq/epm",                     icon: Layers        },
                    { label: "Razão Geral (GL)",       href: "/awq/epm/gl",                  icon: ListOrdered   },
                    { label: "Contabilidade",          href: "/awq/contabilidade",            icon: BookOpen      },
                    { label: "Contas a Pagar (AP)",    href: "/awq/epm/ap",                  icon: ArrowDownLeft },
                    { label: "AP Aging",               href: "/awq/epm/ap/aging",            icon: Receipt       },
                    { label: "Fornecedores",           href: "/awq/epm/suppliers",           icon: Building2     },
                    { label: "Contas a Receber (AR)",  href: "/awq/epm/ar",                  icon: ArrowUpRight  },
                    { label: "AR Aging",               href: "/awq/epm/ar/aging",            icon: Receipt       },
                    { label: "Clientes (AR)",          href: "/awq/epm/customers",           icon: Users         },
                    { label: "AP & AR Visão Geral",    href: "/awq/ap-ar",                   icon: FileText      },
                    { label: "Contas Banco",           href: "/awq/bank",                    icon: CreditCard,   starred: true },
                    { label: "Conciliação Bancária",   href: "/awq/epm/bank-reconciliation", icon: Landmark      },
                    { label: "Cash Flow",              href: "/awq/cashflow",                icon: Zap,          starred: true },
                    { label: "Conciliação",            href: "/awq/conciliacao",             icon: CheckCircle2, badge: "Novo", badgeVariant: "gold" },
                    { label: "Fixed Assets",           href: "/awq/epm/fixed-assets",        icon: Building      },
                    { label: "Investimentos",          href: "/awq/investments",             icon: TrendingUp    },
                    { label: "Reconhec. de Receita",   href: "/awq/epm/revenue-recognition", icon: BookOpen      },
                    { label: "Fiscal",                 href: "/awq/fiscal",                  icon: Receipt       },
                ],
            },
            {
                id: "budgeting-planning",
                label: "Budgeting & Planning",
                icon: BarChart3,
                items: [
                    { label: "Budget",           href: "/awq/budget",          icon: BarChart3  },
                    { label: "Budget vs Actual", href: "/awq/epm/budget",      icon: Target     },
                    { label: "Forecast",         href: "/awq/forecast",        icon: TrendingUp, badge: "Beta", badgeVariant: "blue" },
                    { label: "Centros de Custo", href: "/awq/epm/cost-centers",icon: LayoutGrid },
                ],
            },
            {
                id: "financial-reporting",
                label: "Financial Reporting",
                icon: LineChart,
                items: [
                    { label: "Financial (DRE)",    href: "/awq/financial",              icon: LineChart,   starred: true },
                    { label: "P&L (DRE)",          href: "/awq/epm/pl",                 icon: LineChart    },
                    { label: "Balanço Patrimonial", href: "/awq/epm/balance-sheet",     icon: Scale        },
                    { label: "Relatório Anual",    href: "/awq/epm/reports/annual",     icon: FileText     },
                    { label: "Board Pack",         href: "/awq/epm/reports/board-pack", icon: Briefcase    },
                    { label: "Controladoria",      href: "/awq/management",             icon: ShieldCheck  },
                ],
            },
            {
                id: "consolidation",
                label: "Consolidation",
                icon: Building2,
                items: [
                    { label: "Consolidação",   href: "/awq/epm/consolidation",             icon: Building2  },
                    { label: "Eliminations",   href: "/awq/epm/consolidation/eliminations",icon: Layers     },
                    { label: "Currency",       href: "/awq/epm/currency",                  icon: DollarSign },
                ],
            },
            {
                id: "financial-kpis",
                label: "Financial KPIs",
                icon: PieChart,
                items: [
                    { label: "KPI Dashboard", href: "/awq/epm/kpis", icon: PieChart },
                ],
            },
        ],
    },
    {
        id: "crm",
        label: "CRM",
        description: "Vendas, leads, pipeline, clientes, oportunidades",
        icon: Users,
        items: [
            { label: "Dashboard CRM",  href: "/crm",                   icon: Target,       starred: true },
            { label: "Novo Cadastro",  href: "/crm/novo",              icon: Plus         },
            { label: "Contas",         href: "/crm/accounts",          icon: Building2     },
            { label: "Contatos",       href: "/crm/contacts",          icon: Users         },
            { label: "Leads",          href: "/crm/leads",             icon: UserPlus      },
            { label: "Pipeline",       href: "/crm/pipeline",          icon: Activity,     starred: true },
            { label: "Oportunidades",  href: "/crm/opportunities",     icon: ArrowUpRight  },
            { label: "Atividades",     href: "/crm/activities",        icon: Activity      },
            { label: "Analytics",      href: "/crm/analytics",         icon: BarChart3     },
            { label: "Matriz RFM",     href: "/crm/rfm",               icon: PieChart      },
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
            { label: "Jurídico",    href: "/awq/juridico",       icon: Scale         },
            { label: "Societário",  href: "/awq/societario",     icon: Building      },
            { label: "Compliance",  href: "/awq/compliance",     icon: Lock          },
            { label: "Segurança",   href: "/awq/security",       icon: ShieldAlert   },
            { label: "Políticas",   href: "/awq/grc/policies",   icon: FileText      },
            { label: "Riscos",      href: "/awq/grc/risks",      icon: AlertTriangle },
            { label: "Auditorias",  href: "/awq/grc/audits",     icon: ClipboardList },
            { label: "Controles",   href: "/awq/grc/controls",   icon: ShieldCheck   },
        ],
    },
    {
        id: "ma",
        label: "M&A",
        description: "Deal pipeline M4E, portfólio, cap table, IC, consolidação",
        icon: TrendingUp,
        items: [],
        sections: [
            {
                id: "deal-pipeline",
                label: "Deal Pipeline",
                icon: Activity,
                items: [
                    { label: "M&A Hub",         href: "/awq/ma",                  icon: GitMerge  },
                    { label: "Deal Pipeline",   href: "/awq/ma/deals",            icon: Activity  },
                    { label: "Novo Deal",       href: "/awq/ma/deals/new",        icon: FileText  },
                    { label: "IC Meetings",     href: "/awq/ma/ic",               icon: Users     },
                ],
            },
            {
                id: "portfolio",
                label: "Portfolio Companies",
                icon: Briefcase,
                items: [
                    { label: "Portfolio",       href: "/awq/portfolio",           icon: Briefcase },
                    { label: "Atualizar KPIs",  href: "/awq/portfolio/kpis",      icon: BarChart3 },
                    { label: "Board Meetings",  href: "/awq/portfolio/board",     icon: Calendar  },
                    { label: "Mídia M4E",       href: "/awq/portfolio/media",     icon: Film      },
                ],
            },
            {
                id: "analytics",
                label: "Analytics & Estrutura",
                icon: DollarSign,
                items: [
                    { label: "Cap Table",        href: "/awq/ma/cap-table",        icon: Users     },
                    { label: "Sinergias",         href: "/awq/ma/synergies",        icon: Layers    },
                    { label: "Consolidação IC",   href: "/awq/ma/consolidation",    icon: Building2 },
                ],
            },
        ],
    },
    {
        id: "dms",
        label: "DMS",
        description: "Documentos, arquivos, versionamento, colaboração",
        icon: FolderOpen,
        items: [
            { label: "Documentos",    href: "/awq/dms",                  icon: FileText      },
            { label: "Arquivos",      href: "/awq/dms/files",            icon: FolderOpen    },
            { label: "Versionamento", href: "/awq/dms/versioning",       icon: Layers        },
            { label: "Colaboração",   href: "/awq/dms/collaboration",    icon: MessageSquare },
        ],
    },
    {
        id: "erp",
        label: "ERP",
        description: "Procurement, inventário, pedidos, contratos, time tracking, assets",
        icon: Package,
        items: [],
        sections: [
            {
                id: "procurement",
                label: "Procurement",
                icon: ShoppingCart,
                items: [
                    { label: "Requisições",     href: "/awq/erp/procurement/requisitions", icon: ClipboardList },
                    { label: "Purchase Orders", href: "/awq/erp/purchases",                icon: ShoppingCart  },
                    { label: "Recebimento",     href: "/awq/erp/procurement/receiving",    icon: ArrowDownLeft },
                ],
            },
            {
                id: "inventory",
                label: "Inventory",
                icon: Box,
                items: [
                    { label: "Produtos / Items",     href: "/awq/erp/inventory/items",      icon: Box      },
                    { label: "Movimentações",        href: "/awq/erp/inventory/movements",  icon: Activity },
                    { label: "Armazéns",             href: "/awq/erp/inventory/warehouses", icon: Building },
                    { label: "Avaliação de Estoque", href: "/awq/erp/inventory/valuation",  icon: Layers   },
                ],
            },
            {
                id: "order-management",
                label: "Order Management",
                icon: ListOrdered,
                items: [
                    { label: "Pedidos de Venda", href: "/awq/erp/orders/sales",       icon: ShoppingCart },
                    { label: "Fulfillment",      href: "/awq/erp/orders/fulfillment", icon: CheckCircle2 },
                    { label: "Faturamento",      href: "/awq/erp/orders/billing",     icon: Receipt      },
                    { label: "Expedição",        href: "/awq/erp/orders/shipping",    icon: Truck        },
                ],
            },
            {
                id: "time-expense",
                label: "Time & Expense",
                icon: Clock,
                items: [
                    { label: "Timesheets",            href: "/awq/erp/timetracking",          icon: Clock        },
                    { label: "Despesas",              href: "/awq/erp/expenses",              icon: Receipt      },
                    { label: "Aprovações",            href: "/awq/erp/timeexpense/approvals", icon: CheckCircle2 },
                ],
            },
            {
                id: "contract-management",
                label: "Contract Management",
                icon: FileText,
                items: [
                    { label: "Contratos",      href: "/awq/erp/contracts",             icon: FileText      },
                    { label: "Ciclo de Vida",  href: "/awq/erp/contracts/lifecycle",   icon: Activity      },
                    { label: "Renovações",     href: "/awq/erp/contracts/renewals",    icon: RotateCcw     },
                    { label: "Obrigações",     href: "/awq/erp/contracts/obligations", icon: ClipboardList },
                ],
            },
            {
                id: "asset-management",
                label: "Asset Management",
                icon: Package,
                items: [
                    { label: "Assets",           href: "/awq/erp/assets",              icon: Package       },
                    { label: "Depreciação",      href: "/awq/erp/assets/depreciation", icon: TrendingUp    },
                    { label: "Manutenção",       href: "/awq/erp/assets/maintenance",  icon: Wrench        },
                    { label: "Baixa de Ativos",  href: "/awq/erp/assets/disposal",     icon: AlertTriangle },
                ],
            },
        ],
    },
    {
        id: "hcm",
        label: "HCM",
        description: "RH, folha, férias, recrutamento, treinamento",
        icon: HeartPulse,
        items: [
            { label: "RH",                 href: "/awq/hcm",             icon: Users      },
            { label: "Folha de Pagamento", href: "/awq/hcm/payroll",     icon: DollarSign },
            { label: "Férias",             href: "/awq/hcm/vacation",    icon: Calendar   },
            { label: "Recrutamento",       href: "/awq/hcm/recruitment", icon: UserPlus   },
            { label: "Treinamento",        href: "/awq/hcm/training",    icon: BookOpen   },
        ],
    },
];

// ── Business Units ─────────────────────────────────────────────────────────────
const businessUnits = [
    { id: "jacqes",  label: "JACQES",      sub: "Agência · AWQ Group",      href: "/jacqes",       icon: BarChart3,  color: "bg-brand-600"   },
    { id: "caza",    label: "Caza Vision", sub: "Produtora · AWQ Group",    href: "/caza-vision",  icon: Building2,  color: "bg-emerald-600" },
    { id: "venture", label: "AWQ Venture", sub: "Investimentos · AWQ Group",href: "/awq-venture",  icon: TrendingUp, color: "bg-amber-600"   },
    { id: "advisor", label: "Advisor",     sub: "Consultoria · AWQ Group",  href: "/advisor",      icon: Briefcase,  color: "bg-brand-600"  },
    { id: "enrd",    label: "ENRD",        sub: "Agência Solar · AWQ Group",href: "/enrd",         icon: Zap,        color: "bg-orange-600"  },
];

// ── BU module configs ─────────────────────────────────────────────────────────
type BUModule = { id: string; label: string; description: string; icon: React.ElementType; items: ModuleItem[] };

const JACQES_MODULES: BUModule[] = [
    { id: "epm",  label: "EPM",    description: "Financeiro & Performance", icon: DollarSign, items: [
        { label: "FP&A",        href: "/jacqes/fpa",            icon: BarChart3  },
        { label: "Relatórios",  href: "/jacqes/reports",        icon: FileText   },
    ]},
    { id: "crm",  label: "CRM",    description: "Vendas & Relacionamento",  icon: Users,      items: [
        { label: "Dashboard CRM",  href: "/crm",                     icon: Target       },
        { label: "Leads",          href: "/crm/leads?bu=JACQES",     icon: UserPlus     },
        { label: "Pipeline",       href: "/crm/pipeline",            icon: Activity     },
        { label: "Clientes",       href: "/crm/accounts",            icon: Users        },
        { label: "Oportunidades",  href: "/crm/opportunities",       icon: ArrowUpRight },
    ]},
    { id: "ppm",  label: "PPM",    description: "Projetos & Portfólio",     icon: Briefcase,  items: [
        { label: "Portfolio",      href: "/awq/ppm?bu=JACQES",       icon: Briefcase     },
        { label: "Calendário",     href: "/awq/ppm/calendar",        icon: Calendar      },
        { label: "Gantt",          href: "/awq/ppm/gantt",           icon: GanttChart    },
        { label: "Tarefas",        href: "/awq/ppm/tasks",           icon: ClipboardList },
        { label: "Novo Projeto",   href: "/awq/ppm/add?bu=JACQES",   icon: FolderOpen    },
    ]},
    { id: "bi",   label: "BI",     description: "Analytics & Relatórios",   icon: PieChart,   items: [
        { label: "Mini P&L",       href: "/jacqes/pl",             icon: LineChart  },
        { label: "Receita",        href: "/jacqes/revenue",        icon: TrendingUp },
        { label: "Unit Economics", href: "/jacqes/unit-economics", icon: Calculator },
    ]},
    { id: "bpm",  label: "BPM",    description: "Processos & Workflows",    icon: Activity,   items: [
        { label: "Minha Fila", href: "/awq/bpm/tasks",                 icon: ClipboardList },
        { label: "Processos",  href: "/awq/bpm/processes",             icon: Activity      },
        { label: "Instâncias", href: "/awq/bpm/instances",             icon: Layers        },
        { label: "Analytics",  href: "/awq/bpm/analytics/performance", icon: BarChart3     },
    ]},
    { id: "ops",  label: "Gestão", description: "Carreira & Operações",     icon: Briefcase,  items: [
        { label: "Modo Carreira", href: "/jacqes/carreira", icon: Briefcase },
    ]},
];

const CAZA_MODULES: BUModule[] = [
    { id: "epm", label: "EPM", description: "Financeiro & Performance", icon: DollarSign, items: [
        { label: "Financial",      href: "/caza-vision/financial",      icon: DollarSign },
        { label: "Unit Economics", href: "/caza-vision/unit-economics", icon: Calculator },
        { label: "Contas",         href: "/caza-vision/contas",         icon: Briefcase  },
        { label: "Importar",       href: "/caza-vision/import",         icon: FileUp     },
    ]},
    { id: "ppm", label: "PPM", description: "Projetos & Portfólio",      icon: Film,       items: [
        { label: "Projetos",       href: "/caza-vision/imoveis",   icon: Film          },
        { label: "Portfolio AWQ",  href: "/awq/ppm",               icon: Briefcase     },
        { label: "Gantt",          href: "/awq/ppm/gantt",         icon: GanttChart    },
        { label: "Tarefas",        href: "/awq/ppm/tasks",         icon: ClipboardList },
    ]},
    { id: "crm", label: "CRM", description: "Clientes & Relacionamento",  icon: Users,      items: [
        { label: "Clientes",      href: "/caza-vision/clientes", icon: Users  },
        { label: "Dashboard CRM", href: "/crm",                  icon: Target },
    ]},
];

const ADVISOR_MODULES: BUModule[] = [
    { id: "epm", label: "EPM", description: "Financeiro & Performance",   icon: DollarSign, items: [
        { label: "Financial", href: "/advisor/financial", icon: DollarSign },
    ]},
    { id: "crm", label: "CRM", description: "Clientes & Relacionamento",  icon: Users,      items: [
        { label: "Customers", href: "/advisor/customers", icon: Users },
    ]},
];

const VENTURE_MODULES: BUModule[] = [
    { id: "epm", label: "EPM", description: "Financeiro & Performance",  icon: DollarSign, items: [
        { label: "Financial", href: "/awq-venture/financial", icon: DollarSign },
        { label: "YoY 2025",  href: "/awq-venture/yoy-2025",  icon: LineChart  },
    ]},
    { id: "crm", label: "CRM", description: "Comercial & Pipeline",      icon: TrendingUp, items: [
        { label: "Comercial", href: "/awq-venture/comercial", icon: TrendingUp },
        { label: "Deals",     href: "/awq-venture/deals",     icon: FileText   },
        { label: "Pipeline",  href: "/awq-venture/pipeline",  icon: Activity   },
        { label: "Sales",     href: "/awq-venture/sales",     icon: DollarSign },
    ]},
    { id: "ppm", label: "PPM", description: "Portfólio & Investimentos",  icon: Briefcase,  items: [
        { label: "Portfólio", href: "/awq-venture/portfolio", icon: Briefcase },
    ]},
];

const ENRD_MODULES: BUModule[] = [
    { id: "epm", label: "EPM", description: "Financeiro & Performance",  icon: DollarSign, items: [
        { label: "Financial (ENRD)",    href: "/enrd/financial",              icon: DollarSign    },
        { label: "P&L (DRE)",           href: "/awq/epm/pl",                  icon: LineChart     },
        { label: "Balanço Patrimonial", href: "/awq/epm/balance-sheet",       icon: Scale         },
        { label: "Budget vs Actual",    href: "/awq/epm/budget",              icon: Target        },
        { label: "KPI Dashboard",       href: "/awq/epm/kpis",                icon: PieChart      },
        { label: "Contas a Pagar",      href: "/awq/epm/ap",                  icon: ArrowDownLeft },
        { label: "Contas a Receber",    href: "/awq/epm/ar",                  icon: ArrowUpRight  },
        { label: "Razão Geral (GL)",    href: "/awq/epm/gl",                  icon: ListOrdered   },
        { label: "Conciliação",         href: "/awq/epm/bank-reconciliation", icon: Landmark      },
        { label: "Cora · Conciliação",  href: "/enrd/conciliacao",            icon: CheckCircle2  },
        { label: "Forecast",            href: "/awq/epm/forecast",            icon: Activity      },
        { label: "Ativo Imobilizado",   href: "/awq/epm/fixed-assets",        icon: Package       },
        { label: "Centros de Custo",    href: "/awq/epm/cost-centers",        icon: LayoutGrid    },
        { label: "Períodos",            href: "/awq/epm/periods",             icon: Lock          },
    ]},
    { id: "crm", label: "CRM", description: "Clientes & Relacionamento", icon: Users,      items: [
        { label: "Dashboard CRM", href: "/crm",                icon: Target   },
        { label: "Leads",         href: "/crm/leads?bu=ENRD",  icon: UserPlus },
        { label: "Pipeline",      href: "/crm/pipeline",       icon: Activity },
    ]},
    { id: "ppm", label: "PPM", description: "Projetos & Portfólio",      icon: Briefcase,  items: [
        { label: "Portfolio",      href: "/awq/ppm?bu=ENRD",      icon: Briefcase     },
        { label: "Calendário",     href: "/awq/ppm/calendar",     icon: Calendar      },
        { label: "Gantt",          href: "/awq/ppm/gantt",        icon: GanttChart    },
        { label: "Tarefas",        href: "/awq/ppm/tasks",        icon: ClipboardList },
        { label: "Novo Projeto",   href: "/awq/ppm/add?bu=ENRD",  icon: FolderOpen    },
    ]},
    { id: "bpm", label: "BPM", description: "Workflows & Aprovações",     icon: Activity,   items: [
        { label: "Minha Fila",     href: "/awq/bpm/tasks",                 icon: ClipboardList },
        { label: "Processos",      href: "/awq/bpm/processes",             icon: Activity      },
        { label: "Instâncias",     href: "/awq/bpm/instances",             icon: Layers        },
    ]},
    { id: "bi", label: "BI", description: "Analytics & Relatórios",       icon: PieChart,   items: [
        { label: "Analytics", href: "/crm/analytics", icon: BarChart3 },
        { label: "Pipeline",  href: "/crm/pipeline",  icon: Activity  },
        { label: "RFM",       href: "/crm/rfm",       icon: PieChart  },
    ]},
];

// ── Color tokens per BU ───────────────────────────────────────────────────────
type BUColors = { iconBg: string; activeBg: string; activeText: string };
const BU_COLORS: Record<string, BUColors> = {
    jacqes:  { iconBg: "bg-brand-600",   activeBg: "bg-awq-gold",  activeText: "text-awq-navy" },
    caza:    { iconBg: "bg-emerald-600",  activeBg: "bg-awq-gold",  activeText: "text-awq-navy" },
    advisor: { iconBg: "bg-brand-600",   activeBg: "bg-awq-gold",  activeText: "text-awq-navy" },
    venture: { iconBg: "bg-amber-600",    activeBg: "bg-awq-gold",  activeText: "text-awq-navy" },
    enrd:    { iconBg: "bg-orange-600",   activeBg: "bg-awq-gold",  activeText: "text-awq-navy" },
};

// ── Shared visual primitives ──────────────────────────────────────────────────

function NavBadge({ label, variant = "gold" }: { label: string; variant?: NavBadgeVariant }) {
    return (
        <span className={cn(
            "text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none shrink-0",
            variant === "gold"  && "bg-awq-gold text-awq-navy",
            variant === "blue"  && "bg-blue-400/20 text-blue-300 border border-blue-400/30",
            variant === "green" && "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30",
        )}>
            {label}
        </span>
    );
}

function NavItem({
    href,
    icon: Icon,
    label,
    active,
    badge,
    badgeVariant,
    starred,
}: {
    href: string;
    icon: React.ElementType;
    label: string;
    active: boolean;
    badge?: string;
    badgeVariant?: NavBadgeVariant;
    starred?: boolean;
}) {
    return (
        <Link
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 group",
                "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30",
                active
                    ? "bg-white text-gray-900 font-semibold shadow"
                    : "text-white hover:text-white hover:bg-white/[0.08] font-medium"
            )}
        >
            <Icon
                size={15}
                className={cn(
                    "shrink-0 transition-colors",
                    active ? "text-brand-600" : "text-white/80 group-hover:text-white"
                )}
            />
            <span className="flex-1 truncate">{label}</span>
            {badge && <NavBadge label={badge} variant={badgeVariant} />}
            {starred && (
                <Star
                    size={10}
                    className={cn(
                        "shrink-0 transition-colors fill-current",
                        active ? "text-gray-400" : "text-white/30 group-hover:text-white/60"
                    )}
                />
            )}
        </Link>
    );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <div className="px-3 mb-1.5 mt-5 first:mt-2">
            <span className="text-xs font-bold text-white/50 uppercase tracking-[0.10em]">
                {children}
            </span>
        </div>
    );
}

function PanelFooter() {
    return (
        <div className="px-2 py-3 border-t border-white/[0.07] shrink-0">
            <button className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-white/45 hover:text-white/70 hover:bg-white/[0.06] transition-all text-xs">
                <ThumbsUp size={11} />
                <span>Avalie o nosso design</span>
            </button>
        </div>
    );
}

function SlimUserButton() {
    const { data: session } = useSession();
    const user = session?.user as { name?: string; email?: string } | undefined;
    const name = user?.name ?? user?.email ?? "?";
    const initials = name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
    return (
        <div className="px-1.5 py-3 border-t border-white/[0.07] shrink-0">
            <button
                onClick={() => void signOut({ callbackUrl: "/login" })}
                title="Sair"
                className="flex flex-col items-center gap-0.5 w-full py-1.5 rounded-lg hover:bg-red-500/10 transition-colors group"
            >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-awq-gold to-amber-600 flex items-center justify-center text-xs font-bold text-gray-900">
                    {initials}
                </div>
                <LogOut size={9} className="text-white/25 group-hover:text-red-400 transition-colors" />
            </button>
        </div>
    );
}

// ── Icon bar (shared across AWQ routes) ───────────────────────────────────────
function IconBar({
    pathname,
    activePanel,
    onToggle,
    modules,
    showBus = true,
    showAi = true,
    getModuleActive,
}: {
    pathname: string;
    activePanel: string | null;
    onToggle: (id: string) => void;
    modules: Array<{ id: string; label: string; icon: React.ElementType }>;
    showBus?: boolean;
    showAi?: boolean;
    getModuleActive: (id: string) => boolean;
}) {
    return (
        <div className="flex flex-col h-full w-[52px] bg-[#0487D9] shrink-0">
            {/* Logo */}
            <div className="h-[52px] flex items-center justify-center border-b border-white/[0.06] shrink-0">
                <Link href="/awq">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-awq-gold to-amber-600 flex items-center justify-center shadow-md">
                        <Zap size={15} className="text-gray-900" />
                    </div>
                </Link>
            </div>

            {/* Home */}
            <div className="px-1.5 pt-1.5 shrink-0">
                <Link
                    href="/awq"
                    title="Visão Geral"
                    className={cn(
                        "flex items-center justify-center py-2.5 px-1 rounded-lg transition-all w-full",
                        pathname === "/awq"
                            ? "bg-white text-brand-600"
                            : "text-white hover:bg-white/[0.10] hover:text-white"
                    )}
                >
                    <LayoutDashboard size={18} />
                </Link>
            </div>

            <div className="mx-2 my-1 border-t border-white/[0.06] shrink-0" />

            {/* Module icons */}
            <nav className="flex-1 overflow-y-auto px-1.5 py-1 space-y-1 scrollbar-none">
                {modules.map((mod) => {
                    const modActive = getModuleActive(mod.id);
                    const isOpen = activePanel === mod.id;
                    const ModIcon = mod.icon;
                    return (
                        <button
                            key={mod.id}
                            onClick={() => onToggle(mod.id)}
                            title={mod.label}
                            className={cn(
                                "flex items-center justify-center py-2.5 px-1 rounded-lg transition-all w-full",
                                isOpen
                                    ? "bg-white text-brand-600"
                                    : modActive
                                    ? "text-white"
                                    : "text-white hover:bg-white/[0.10] hover:text-white"
                            )}
                        >
                            <ModIcon size={18} className="shrink-0" />
                        </button>
                    );
                })}
            </nav>

            <div className="mx-2 my-1 border-t border-white/[0.06] shrink-0" />

            {/* Bottom icons */}
            <div className="px-1.5 pb-1 space-y-0.5 shrink-0">
                {showBus && (
                    <button
                        onClick={() => onToggle("bus")}
                        title="Business Units"
                        className={cn(
                            "flex items-center justify-center py-2.5 px-1 rounded-lg transition-all w-full",
                            activePanel === "bus"
                                ? "bg-white text-brand-600"
                                : "text-white hover:bg-white/[0.10] hover:text-white"
                        )}
                    >
                        <Building2 size={18} />
                    </button>
                )}
                {showAi && (
                    <button
                        onClick={() => onToggle("ai")}
                        title="IA & Agentes"
                        className={cn(
                            "flex items-center justify-center py-2.5 px-1 rounded-lg transition-all w-full",
                            activePanel === "ai"
                                ? "bg-white text-brand-600"
                                : "text-white hover:bg-white/[0.10] hover:text-white"
                        )}
                    >
                        <Bot size={18} />
                    </button>
                )}
                <Link
                    href="/settings"
                    title="Settings"
                    className={cn(
                        "flex items-center justify-center py-2.5 px-1 rounded-lg transition-all w-full",
                        pathname.startsWith("/settings")
                            ? "bg-white text-brand-600"
                            : "text-white hover:bg-white/[0.10] hover:text-white"
                    )}
                >
                    <Settings size={18} />
                </Link>
            </div>

            <SlimUserButton />
        </div>
    );
}

// ── Panel helpers ─────────────────────────────────────────────────────────────
function PanelHeader({ title, onBack }: { title: string; onBack: () => void }) {
    return (
        <div className="h-[52px] flex items-center gap-2 px-3 border-b border-white/[0.07] shrink-0">
            <button
                onClick={onBack}
                className="p-1 text-white/55 hover:text-white/90 transition-colors rounded-md hover:bg-white/[0.07] shrink-0"
            >
                <ChevronLeft size={15} />
            </button>
            <span className="text-sm font-semibold text-white truncate">{title}</span>
        </div>
    );
}

// ── AWQ Sidebar — unified, persistent two-panel ───────────────────────────────
function AwqSidebar({ pathname }: { pathname: string }) {
    const getAllItems = (mod: AwqModule): ModuleItem[] => [
        ...mod.items,
        ...(mod.sections?.flatMap((s) => s.items) ?? []),
    ];

    const isActive = (href: string) =>
        href === "/awq" || href === "/crm"
            ? pathname === href
            : pathname === href || pathname.startsWith(href + "/");

    const findDefaultPanel = (): string | null => {
        if (isEpmRoute(pathname))  return "epm";
        if (isCrmRoute(pathname))  return "crm";
        if (isPpmRoute(pathname))  return "ppm";
        if (isBiRoute(pathname))   return "bi";
        if (isMaRoute(pathname))   return "ma";
        if (isSettingsRoute(pathname)) return "settings";
        for (const mod of AWQ_MODULES) {
            if (getAllItems(mod).some((i) => isActive(i.href))) return mod.id;
        }
        return null;
    };

    const [activePanel, setActivePanel] = useState<string | null>(findDefaultPanel);
    const navRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const found = findDefaultPanel();
        if (found) setActivePanel(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    const togglePanel = (id: string) => setActivePanel((p) => (p === id ? null : id));

    const getModuleActive = (id: string) => {
        const mod = AWQ_MODULES.find((m) => m.id === id);
        if (!mod) return false;
        return getAllItems(mod).some((i) => isActive(i.href));
    };

    const activeMod = AWQ_MODULES.find((m) => m.id === activePanel);

    const panelTitle =
        activePanel === "bus"      ? "Business Units"
        : activePanel === "ai"     ? "IA & Agentes"
        : activePanel === "settings" ? "Configurações"
        : activeMod?.label ?? "";

    return (
        <div className="flex h-full">
            <IconBar
                pathname={pathname}
                activePanel={activePanel}
                onToggle={togglePanel}
                modules={AWQ_MODULES}
                getModuleActive={getModuleActive}
            />

            {activePanel && (
                <div className="w-[220px] bg-[#023373] flex flex-col border-r border-white/[0.06] overflow-hidden">
                    <PanelHeader title={panelTitle} onBack={() => setActivePanel(null)} />

                    <nav className="flex-1 overflow-y-auto px-2 py-2.5 scrollbar-none">
                        {activePanel === "bus" && (
                            <div className="space-y-1 mt-1">
                                {businessUnits.map((bu) => (
                                    <Link
                                        key={bu.id}
                                        href={bu.href}
                                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-white/[0.07] hover:border-awq-gold/30 hover:bg-white/[0.04] transition-all group"
                                    >
                                        <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0", bu.color)}>
                                            <bu.icon size={12} className="text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[12px] font-semibold text-white/80 group-hover:text-white truncate">{bu.label}</div>
                                            <div className="text-xs text-white/30 truncate">{bu.sub}</div>
                                        </div>
                                        <ChevronRight size={11} className="text-white/25 group-hover:text-awq-gold shrink-0" />
                                    </Link>
                                ))}
                            </div>
                        )}

                        {activePanel === "ai" && (
                            <div className="space-y-0.5 mt-1">
                                {aiNav.map((item) => (
                                    <NavItem key={item.href} {...item} active={isActive(item.href)} />
                                ))}
                            </div>
                        )}

                        {activePanel === "settings" && (
                            <>
                                <SectionLabel>Configurações</SectionLabel>
                                <div className="space-y-0.5">
                                    {settingsPanelItems.map((item) => (
                                        <NavItem key={item.href} {...item} active={isActive(item.href)} />
                                    ))}
                                </div>
                            </>
                        )}

                        {activeMod && (
                            activeMod.sections ? (
                                activeMod.sections.map((section) => (
                                    <div key={section.id}>
                                        <SectionLabel>{section.label}</SectionLabel>
                                        <div className="space-y-0.5">
                                            {section.items.map((item) => (
                                                <NavItem key={item.href} {...item} active={isActive(item.href)} />
                                            ))}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="space-y-0.5 mt-1">
                                    {activeMod.items.map((item) => (
                                        <NavItem key={item.href} {...item} active={isActive(item.href)} />
                                    ))}
                                </div>
                            )
                        )}
                    </nav>

                    <PanelFooter />
                </div>
            )}
        </div>
    );
}

// ── BU Sidebar — persistent icon bar + panel ──────────────────────────────────
function BUSidebar({
    buId,
    label: _label,
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
    const colors = BU_COLORS[buId] ?? BU_COLORS.jacqes;

    const isActive = (href: string) =>
        href === homeHref ? pathname === homeHref : pathname === href || pathname.startsWith(href + "/");

    const findDefaultPanel = () =>
        modules.find((m) => m.items.some((i) => isActive(i.href)))?.id
        ?? (pathname === homeHref ? modules[0]?.id ?? null : null);

    const [activePanel, setActivePanel] = useState<string | null>(findDefaultPanel);

    useEffect(() => {
        const found = findDefaultPanel();
        if (found) setActivePanel(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    const togglePanel = (id: string) => setActivePanel((p) => (p === id ? null : id));
    const activeMod = modules.find((m) => m.id === activePanel);

    return (
        <div className="flex h-full">
            {/* Icon bar */}
            <div className="flex flex-col h-full w-[52px] bg-[#0487D9] shrink-0">
                {/* BU logo */}
                <div className="h-[52px] flex items-center justify-center border-b border-white/[0.06] shrink-0">
                    <Link href={homeHref} title={buId}>
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shadow-md", colors.iconBg)}>
                            <HeaderIcon size={15} className="text-white" />
                        </div>
                    </Link>
                </div>

                {showBack && (
                    <div className="px-1.5 pt-1.5 shrink-0">
                        <Link
                            href="/business-units"
                            title="Voltar para AWQ Group"
                            className="flex items-center justify-center py-2.5 px-1 rounded-lg w-full text-white hover:bg-white/[0.10] hover:text-white transition-all"
                        >
                            <ChevronLeft size={18} />
                        </Link>
                    </div>
                )}

                <div className="mx-2 my-1 border-t border-white/[0.06] shrink-0" />

                {/* Home */}
                <div className="px-1.5 shrink-0">
                    <Link
                        href={homeHref}
                        title="Visão Geral"
                        className={cn(
                            "flex items-center justify-center py-2.5 px-1 rounded-lg transition-all w-full",
                            pathname === homeHref
                                ? "bg-white text-brand-600"
                                : "text-white hover:bg-white/[0.10] hover:text-white"
                        )}
                    >
                        <LayoutDashboard size={18} />
                    </Link>
                </div>

                <div className="mx-2 my-1 border-t border-white/[0.06] shrink-0" />

                {/* Module icons */}
                <nav className="flex-1 overflow-y-auto px-1.5 py-1 space-y-1 scrollbar-none">
                    {modules.map((mod) => {
                        const modActive = mod.items.some((i) => isActive(i.href));
                        const isOpen = activePanel === mod.id;
                        const ModIcon = mod.icon;
                        return (
                            <button
                                key={mod.id}
                                onClick={() => togglePanel(mod.id)}
                                title={mod.label}
                                className={cn(
                                    "flex items-center justify-center py-2.5 px-1 rounded-lg transition-all w-full",
                                    isOpen
                                        ? "bg-white text-brand-600"
                                        : modActive
                                        ? "text-white"
                                        : "text-white hover:bg-white/[0.10] hover:text-white"
                                )}
                            >
                                <ModIcon size={18} className="shrink-0" />
                            </button>
                        );
                    })}
                </nav>

                <div className="mx-2 my-1 border-t border-white/[0.06] shrink-0" />

                <div className="px-1.5 pb-1 space-y-0.5 shrink-0">
                    <button
                        onClick={() => togglePanel("ai")}
                        title="IA & Agentes"
                        className={cn(
                            "flex items-center justify-center py-2.5 px-1 rounded-lg transition-all w-full",
                            activePanel === "ai"
                                ? "bg-white text-brand-600"
                                : "text-white hover:bg-white/[0.10] hover:text-white"
                        )}
                    >
                        <Bot size={18} />
                    </button>
                    <Link
                        href="/settings"
                        title="Settings"
                        className={cn(
                            "flex items-center justify-center py-2.5 px-1 rounded-lg transition-all w-full",
                            pathname.startsWith("/settings")
                                ? "bg-white text-brand-600"
                                : "text-white hover:bg-white/[0.10] hover:text-white"
                        )}
                    >
                        <Settings size={16} />
                    </Link>
                </div>

                <SlimUserButton />
            </div>

            {/* Panel */}
            {activePanel && (
                <div className="w-[220px] bg-[#023373] flex flex-col border-r border-white/[0.06] overflow-hidden">
                    <PanelHeader
                        title={activePanel === "ai" ? "IA & Agentes" : activeMod?.label ?? ""}
                        onBack={() => setActivePanel(null)}
                    />
                    <nav className="flex-1 overflow-y-auto px-2 py-2.5 scrollbar-none">
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
                    <PanelFooter />
                </div>
            )}
        </div>
    );
}

// ── BU sidebar wrappers ───────────────────────────────────────────────────────
function JacqesSidebar({ pathname }: { pathname: string }) {
    const { data: session } = useSession();
    const isJacqesOnly = (session?.user as { role?: string } | undefined)?.role === "jacqes";
    return <BUSidebar buId="jacqes" label="JACQES" homeHref="/jacqes" headerIcon={BarChart3} modules={JACQES_MODULES} pathname={pathname} showBack={!isJacqesOnly} />;
}

function CazaSidebar({ pathname }: { pathname: string }) {
    const { data: session } = useSession();
    const isCazaOnly = (session?.user as { role?: string } | undefined)?.role === "caza";
    const modules = isCazaOnly
        ? CAZA_MODULES.map((m) =>
            m.id === "epm" ? { ...m, items: m.items.filter((i) => i.href !== "/caza-vision/import") } : m
          )
        : CAZA_MODULES;
    return <BUSidebar buId="caza" label="Caza Vision" homeHref="/caza-vision" headerIcon={Building2} modules={modules} pathname={pathname} showBack={!isCazaOnly} />;
}

function AdvisorSidebar({ pathname }: { pathname: string }) {
    return <BUSidebar buId="advisor" label="Advisor" homeHref="/advisor" headerIcon={Briefcase} modules={ADVISOR_MODULES} pathname={pathname} />;
}

function AwqVentureSidebar({ pathname }: { pathname: string }) {
    return <BUSidebar buId="venture" label="AWQ Venture" homeHref="/awq-venture" headerIcon={TrendingUp} modules={VENTURE_MODULES} pathname={pathname} />;
}

function EnrdSidebar({ pathname }: { pathname: string }) {
    const { data: session } = useSession();
    const isEnrdOnly = (session?.user as { role?: string } | undefined)?.role === "enrd";
    // enrd-role users can't access /enrd or EPM routes — strip EPM module entirely
    const modules = isEnrdOnly
        ? ENRD_MODULES.filter((m) => m.id !== "epm")
        : ENRD_MODULES;
    // enrd-role home is PPM (they lack access to /enrd); owners/admins use /enrd
    const homeHref = isEnrdOnly ? "/awq/ppm" : "/enrd";
    return <BUSidebar buId="enrd" label="ENRD" homeHref={homeHref} headerIcon={Zap} modules={modules} pathname={pathname} showBack={!isEnrdOnly} />;
}

// ── Root Sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar() {
    const rawPathname = usePathname();
    const pathname = rawPathname ?? "";
    const { data: session } = useSession();
    const role = (session?.user as { role?: string } | undefined)?.role;

    if (role === "enrd")          return <div className="flex flex-col h-full"><EnrdSidebar pathname={pathname} /></div>;
    if (role === "jacqes")        return <div className="flex flex-col h-full"><JacqesSidebar pathname={pathname} /></div>;
    if (isJacqesRoute(pathname))  return <div className="flex flex-col h-full"><JacqesSidebar pathname={pathname} /></div>;
    if (isCazaRoute(pathname))    return <div className="flex flex-col h-full"><CazaSidebar pathname={pathname} /></div>;
    if (isAdvisorRoute(pathname)) return <div className="flex flex-col h-full"><AdvisorSidebar pathname={pathname} /></div>;
    if (isVentureRoute(pathname)) return <div className="flex flex-col h-full"><AwqVentureSidebar pathname={pathname} /></div>;
    if (isEnrdRoute(pathname))    return <div className="flex flex-col h-full"><EnrdSidebar pathname={pathname} /></div>;

    return <div className="flex flex-col h-full"><AwqSidebar pathname={pathname} /></div>;
}
