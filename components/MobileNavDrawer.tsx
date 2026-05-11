"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
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
  Bot,
  Sparkles,
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
  ShieldCheck,
  ShieldAlert,
  Lock,
  Scale,
  PieChart,
  FolderOpen,
  Package,
  UserPlus,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  FileUp,
  Landmark,
  Receipt,
  ListOrdered,
  BookOpen,
  LayoutGrid,
  Database,
  Building,
  Calendar,
  MessageSquare,
  GitMerge,
  LogOut,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
}

// ── Route membership (mirrored from Sidebar) ──────────────────────────────
const JACQES_PREFIXES  = ["/jacqes"];
const CAZA_PREFIXES    = ["/caza-vision"];
const ADVISOR_PREFIXES = ["/advisor"];
const VENTURE_PREFIXES = ["/awq-venture"];
const CRM_PREFIXES     = ["/crm"];
const EPM_PREFIXES     = [
    "/awq/epm",
    "/awq/financial",
    "/awq/budget",
    "/awq/forecast",
    "/awq/cashflow",
    "/awq/conciliacao",
    "/awq/reconciliation",
    "/awq/bank",
    "/awq/investments",
    "/awq/ap-ar",
    "/awq/management",
    "/awq/contabilidade",
    "/awq/fiscal",
];
const PPM_PREFIXES     = ["/awq/ppm"];
const BI_PREFIXES      = ["/awq/bi"];
const SETTINGS_PREFIXES = ["/settings"];

function isJacqesRoute(p: string)   { return JACQES_PREFIXES.some((x)   => p.startsWith(x)); }
function isCazaRoute(p: string)     { return CAZA_PREFIXES.some((x)     => p.startsWith(x)); }
function isAdvisorRoute(p: string)  { return ADVISOR_PREFIXES.some((x)  => p.startsWith(x)); }
function isVentureRoute(p: string)  { return VENTURE_PREFIXES.some((x)  => p.startsWith(x)); }
function isCrmRoute(p: string)      { return CRM_PREFIXES.some((x)      => p === x || p.startsWith(x + "/")); }
function isEpmRoute(p: string)      { return EPM_PREFIXES.some((x)      => p === x || p.startsWith(x + "/")); }
function isPpmRoute(p: string)      { return PPM_PREFIXES.some((x)      => p === x || p.startsWith(x + "/")); }
function isBiRoute(p: string)       { return BI_PREFIXES.some((x)       => p === x || p.startsWith(x + "/")); }
function isSettingsRoute(p: string) { return SETTINGS_PREFIXES.some((x) => p === x || p.startsWith(x + "/")); }

// ── Nav configs ───────────────────────────────────────────────────────────
const awqNav = [
  { label: "Visão Geral",    href: "/awq",             icon: LayoutDashboard },
  { label: "Business Units", href: "/business-units",  icon: Building2       },
];

// EPM — Dinheiro, finanças, budget, P&L, cashflow, AP/AR
const awqEpmNav = [
  { label: "Visão Geral EPM",  href: "/awq/epm",            icon: Layers      },
  { label: "Financial (DRE)",  href: "/awq/financial",      icon: LineChart   },
  { label: "Cash Flow",        href: "/awq/cashflow",       icon: Zap         },
  { label: "Budget",           href: "/awq/budget",         icon: Wallet      },
  { label: "Forecast",         href: "/awq/forecast",       icon: TrendingUp  },
  { label: "AP & AR",          href: "/awq/ap-ar",          icon: FileText    },
  { label: "Contas a Pagar",   href: "/awq/epm/ap",         icon: FileText    },
  { label: "Contas a Receber", href: "/awq/epm/ar",         icon: FileText    },
  { label: "Conciliação",      href: "/awq/conciliacao",    icon: CheckCircle2},
  { label: "Contas Banco",     href: "/awq/bank",           icon: CreditCard  },
  { label: "Controladoria",    href: "/awq/management",     icon: ShieldCheck },
];

// CRM — Vendas, leads, pipeline, clientes, oportunidades (AWQ module list)
const awqCrmNav = [
  { label: "Dashboard CRM",  href: "/crm",                 icon: Target       },
  { label: "Leads",          href: "/crm/leads",           icon: UserPlus     },
  { label: "Pipeline",       href: "/crm/pipeline",        icon: Activity     },
  { label: "Clientes",       href: "/crm/customers",       icon: Users        },
  { label: "Oportunidades",  href: "/crm/opportunities",   icon: ArrowUpRight },
  { label: "Matriz RFM",     href: "/crm/rfm",             icon: BarChart3    },
];

// CRM Tower — nav completo (espelha CrmSidebar desktop)
const crmTowerNav = [
  { label: "Dashboard CRM",  href: "/crm",                 icon: Target       },
  { label: "Contas",         href: "/crm/accounts",        icon: Building2    },
  { label: "Contatos",       href: "/crm/contacts",        icon: Users        },
  { label: "Leads",          href: "/crm/leads",           icon: UserPlus     },
  { label: "Oportunidades",  href: "/crm/opportunities",   icon: ArrowUpRight },
  { label: "Atividades",     href: "/crm/activities",      icon: Activity     },
  { label: "Analytics",      href: "/crm/analytics",       icon: BarChart3    },
  { label: "Matriz RFM",     href: "/crm/rfm",             icon: PieChart     },
];

// EPM Tower — FP&A
const epmFpaNav = [
  { label: "Visão Geral EPM",      href: "/awq/epm",                    icon: Layers        },
  { label: "Financial (DRE)",      href: "/awq/financial",              icon: LineChart     },
  { label: "P&L (DRE)",           href: "/awq/epm/pl",                  icon: LineChart     },
  { label: "Balanço Patrimonial",  href: "/awq/epm/balance-sheet",      icon: Scale         },
  { label: "Budget",              href: "/awq/budget",                  icon: BarChart3     },
  { label: "Forecast",            href: "/awq/forecast",                icon: TrendingUp    },
  { label: "Budget vs Actual",    href: "/awq/epm/budget",              icon: Target        },
  { label: "Budget Approval",     href: "/awq/epm/budget/approval",     icon: CheckCircle2  },
  { label: "KPI Dashboard",       href: "/awq/epm/kpis",                icon: PieChart      },
];

// EPM Tower — Tesouraria
const epmTesourariaNav = [
  { label: "Cash Flow",           href: "/awq/cashflow",                icon: Zap           },
  { label: "Conciliação",         href: "/awq/conciliacao",             icon: CheckCircle2  },
  { label: "Conciliação Oper.",   href: "/awq/reconciliation",          icon: RotateCcw     },
  { label: "Contas Banco",        href: "/awq/bank",                    icon: CreditCard    },
  { label: "Câmbio / FX",        href: "/awq/epm/currency",            icon: DollarSign    },
  { label: "Investimentos",       href: "/awq/investments",             icon: Landmark      },
];

// EPM Tower — AP & AR
const epmApArNav = [
  { label: "AP & AR",             href: "/awq/ap-ar",                   icon: FileText      },
  { label: "Contas a Pagar",      href: "/awq/epm/ap",                  icon: ArrowDownLeft },
  { label: "AP Aging",            href: "/awq/epm/ap/aging",            icon: Receipt       },
  { label: "Contas a Receber",    href: "/awq/epm/ar",                  icon: ArrowUpRight  },
  { label: "AR Aging",            href: "/awq/epm/ar/aging",            icon: Receipt       },
  { label: "Contratos AR",        href: "/awq/epm/ar/contracts",        icon: FileText      },
  { label: "Cobranças AR",        href: "/awq/epm/ar/collections",      icon: Receipt       },
];

// EPM Tower — Controladoria
const epmControladoriaNav = [
  { label: "Razão Geral (GL)",    href: "/awq/epm/gl",                          icon: ListOrdered  },
  { label: "Consolidação",        href: "/awq/epm/consolidation",               icon: Building2    },
  { label: "Eliminações IC",      href: "/awq/epm/consolidation/eliminations",  icon: Layers       },
  { label: "Conciliação Bancária",href: "/awq/epm/bank-reconciliation",         icon: Landmark     },
  { label: "Reconhec. de Receita",href: "/awq/epm/revenue-recognition",         icon: BookOpen     },
  { label: "Centros de Custo",    href: "/awq/epm/cost-centers",                icon: LayoutGrid   },
  { label: "Ativo Imobilizado",   href: "/awq/epm/fixed-assets",                icon: Building     },
  { label: "Fechamento Períodos", href: "/awq/epm/periods",                     icon: Calendar     },
  { label: "Fornecedores",        href: "/awq/epm/suppliers",                   icon: Building2    },
  { label: "Clientes EPM",        href: "/awq/epm/customers",                   icon: Users        },
  { label: "Controladoria",       href: "/awq/management",                      icon: ShieldCheck  },
  { label: "Contabilidade",       href: "/awq/contabilidade",                   icon: BookOpen     },
  { label: "Fiscal",              href: "/awq/fiscal",                          icon: Receipt      },
];

// EPM Tower — Relatórios
const epmRelatoriosNav = [
  { label: "Board Pack",          href: "/awq/epm/reports/board-pack",  icon: Briefcase     },
  { label: "Relatório Anual",     href: "/awq/epm/reports/annual",      icon: FileText      },
];

// PPM Tower
const ppmTowerNav = [
  { label: "Portfolio",           href: "/awq/ppm",                     icon: Briefcase     },
  { label: "Gantt",               href: "/awq/ppm/gantt",               icon: GanttChart    },
  { label: "Tarefas",             href: "/awq/ppm/tasks",               icon: ClipboardList },
  { label: "Timesheets",          href: "/awq/ppm/timesheets",          icon: Clock         },
  { label: "Recursos",            href: "/awq/ppm/resources",           icon: Users         },
  { label: "Utilização",          href: "/awq/ppm/utilization",         icon: BarChart3     },
  { label: "Rentabilidade",       href: "/awq/ppm/profitability",       icon: TrendingUp    },
  { label: "Riscos",              href: "/awq/ppm/risks",               icon: AlertTriangle },
];

// BI Tower
const biTowerNav = [
  { label: "Dashboards",          href: "/awq/bi",                      icon: PieChart      },
  { label: "Relatórios",          href: "/awq/bi/reports",              icon: FileText      },
  { label: "Análises",            href: "/awq/bi/analytics",            icon: BarChart3     },
  { label: "Visualizações",       href: "/awq/bi/visualizations",       icon: LineChart     },
  { label: "Base de Dados",       href: "/awq/data",                    icon: Database      },
];

// PPM — Projetos, tasks, alocação de pessoas, cronogramas
const awqPpmNav = [
  { label: "Portfolio",      href: "/awq/ppm",               icon: Briefcase     },
  { label: "Gantt",          href: "/awq/ppm/gantt",         icon: GanttChart    },
  { label: "Tarefas",        href: "/awq/ppm/tasks",         icon: FileText      },
  { label: "Timesheets",     href: "/awq/ppm/timesheets",    icon: Clock         },
  { label: "Recursos",       href: "/awq/ppm/resources",     icon: Users         },
  { label: "Utilização",     href: "/awq/ppm/utilization",   icon: BarChart3     },
  { label: "Rentabilidade",  href: "/awq/ppm/profitability", icon: TrendingUp    },
  { label: "Riscos",         href: "/awq/ppm/risks",         icon: AlertTriangle },
];

// BPM — Processos, workflows, aprovações, automação
const awqBpmNav = [
  { label: "Minha Fila",  href: "/awq/bpm/tasks",                 icon: ClipboardList },
  { label: "Processos",   href: "/awq/bpm/processes",             icon: Activity      },
  { label: "Instâncias",  href: "/awq/bpm/instances",             icon: Layers        },
  { label: "Analytics",   href: "/awq/bpm/analytics/performance", icon: BarChart3     },
];

// BI — Dashboards, relatórios, análises, visualizações
const awqBiNav = [
  { label: "Dashboards",    href: "/awq/bi",                icon: PieChart  },
  { label: "Relatórios",    href: "/awq/bi/reports",        icon: FileText  },
  { label: "Análises",      href: "/awq/bi/analytics",      icon: BarChart3 },
  { label: "Visualizações", href: "/awq/bi/visualizations", icon: LineChart },
  { label: "Base de Dados", href: "/awq/data",              icon: Database  },
];

// CPM — Estratégia, OKRs, scorecards, performance reviews
const awqCpmNav = [
  { label: "KPIs Consolidados",   href: "/awq/kpis",            icon: BarChart3    },
  { label: "Risk & Alertas",      href: "/awq/risk",            icon: AlertTriangle},
  { label: "Portfolio Corp.",     href: "/awq/portfolio",       icon: Briefcase    },
  { label: "Allocations",         href: "/awq/allocations",     icon: Wallet       },
  { label: "Estratégia",          href: "/awq/cpm/strategy",    icon: Target       },
  { label: "OKRs",                href: "/awq/cpm/okrs",        icon: CheckCircle2 },
  { label: "Scorecards",          href: "/awq/cpm/scorecards",  icon: ClipboardList},
  { label: "Performance Reviews", href: "/awq/cpm/reviews",     icon: BarChart3    },
  { label: "Novidades",           href: "/awq/novidades",       icon: Sparkles     },
];

// GRC — Políticas, riscos, compliance, auditorias, controles
const awqGrcNav = [
  { label: "Jurídico",    href: "/awq/juridico",      icon: Scale        },
  { label: "Societário",  href: "/awq/societario",    icon: Building     },
  { label: "Compliance",  href: "/awq/compliance",    icon: Lock         },
  { label: "Segurança",   href: "/awq/security",      icon: ShieldAlert  },
  { label: "Políticas",   href: "/awq/grc/policies",  icon: FileText     },
  { label: "Riscos",      href: "/awq/grc/risks",     icon: AlertTriangle},
  { label: "Auditorias",  href: "/awq/grc/audits",    icon: ClipboardList},
  { label: "Controles",   href: "/awq/grc/controls",  icon: ShieldCheck  },
];

// M&A — Deal pipeline, portfólio, cap table, IC, consolidação
const awqMaNav = [
  { label: "M&A Hub",        href: "/awq/ma",               icon: GitMerge      },
  { label: "Deal Pipeline",  href: "/awq/ma/deals",         icon: Activity      },
  { label: "Novo Deal",      href: "/awq/ma/deals/new",     icon: FileText      },
  { label: "IC Meetings",    href: "/awq/ma/ic",            icon: Users         },
  { label: "Portfolio",      href: "/awq/portfolio",        icon: Briefcase     },
  { label: "Atualizar KPIs", href: "/awq/portfolio/kpis",   icon: BarChart3     },
  { label: "Board Meetings", href: "/awq/portfolio/board",  icon: ClipboardList },
  { label: "Mídia M4E",      href: "/awq/portfolio/media",  icon: Film          },
  { label: "Cap Table",      href: "/awq/ma/cap-table",     icon: PieChart      },
  { label: "Sinergias",      href: "/awq/ma/synergies",     icon: ArrowUpRight  },
  { label: "Consolidação",   href: "/awq/ma/consolidation", icon: Layers        },
];

// DMS — Documentos, arquivos, versionamento, colaboração
const awqDmsNav = [
  { label: "Documentos",    href: "/awq/dms",                  icon: FileText     },
  { label: "Arquivos",      href: "/awq/dms/files",            icon: FolderOpen   },
  { label: "Versionamento", href: "/awq/dms/versioning",       icon: Layers       },
  { label: "Colaboração",   href: "/awq/dms/collaboration",    icon: MessageSquare},
];

// ERP — Compras, contratos, time tracking, assets
const awqErpNav = [
  { label: "Requisições",     href: "/awq/erp/procurement/requisitions", icon: ClipboardList },
  { label: "Compras",         href: "/awq/erp/purchases",                icon: Package       },
  { label: "Recebimento",     href: "/awq/erp/procurement/receiving",    icon: ArrowDownLeft },
  { label: "Estoque",         href: "/awq/erp/inventory/items",          icon: Package       },
  { label: "Pedidos de Venda",href: "/awq/erp/orders/sales",             icon: ClipboardList },
  { label: "Faturamento",     href: "/awq/erp/orders/billing",           icon: Receipt       },
  { label: "Contratos",       href: "/awq/erp/contracts",                icon: FileText      },
  { label: "Time Tracking",   href: "/awq/erp/timetracking",             icon: Clock         },
  { label: "Despesas",        href: "/awq/erp/expenses",                 icon: Receipt       },
  { label: "Assets",          href: "/awq/erp/assets",                   icon: Package       },
];

// HCM — RH, folha, férias, recrutamento, treinamento
const awqHcmNav = [
  { label: "RH",                 href: "/awq/hcm",             icon: Users      },
  { label: "Folha de Pagamento", href: "/awq/hcm/payroll",     icon: DollarSign },
  { label: "Férias",             href: "/awq/hcm/vacation",    icon: Calendar   },
  { label: "Recrutamento",       href: "/awq/hcm/recruitment", icon: UserPlus   },
  { label: "Treinamento",        href: "/awq/hcm/training",    icon: HeartPulse },
];

// ── BU nav — mirrors desktop Sidebar module configs exactly ──────────────
// JACQES: EPM · CRM · Gestão
const jacqesEpmNav = [
  { label: "FP&A",       href: "/jacqes/fpa",     icon: BarChart3 },
  { label: "Relatórios", href: "/jacqes/reports", icon: FileText  },
];
const jacquesCrmNav = [
  { label: "Dashboard CRM",  href: "/crm",               icon: Target       },
  { label: "Leads",          href: "/crm/leads",         icon: UserPlus     },
  { label: "Pipeline",       href: "/crm/pipeline",      icon: Activity     },
  { label: "Clientes",       href: "/crm/customers",     icon: Users        },
  { label: "Oportunidades",  href: "/crm/opportunities", icon: ArrowUpRight },
];
const jacqesGestaoNav = [
  { label: "Modo Carreira", href: "/jacqes/carreira", icon: Briefcase },
];

// Caza Vision: EPM · PPM · CRM
const cazaEpmNav = [
  { label: "Financial",      href: "/caza-vision/financial",      icon: DollarSign },
  { label: "Unit Economics", href: "/caza-vision/unit-economics", icon: Calculator },
  { label: "Contas",         href: "/caza-vision/contas",         icon: Briefcase  },
  { label: "Importar",       href: "/caza-vision/import",         icon: FileUp     },
];
const cazaPpmNav = [
  { label: "Projetos", href: "/caza-vision/imoveis", icon: Film },
];
const cazaCrmNav = [
  { label: "Clientes",      href: "/caza-vision/clientes", icon: Users  },
  { label: "Dashboard CRM", href: "/crm",                  icon: Target },
];

// Advisor: EPM · CRM
const advisorEpmNav = [
  { label: "Financial", href: "/advisor/financial", icon: DollarSign },
];
const advisorCrmNav = [
  { label: "Customers", href: "/advisor/customers", icon: Users },
];

// AWQ Venture: EPM · CRM · PPM
const ventureEpmNav = [
  { label: "Financial", href: "/awq-venture/financial",  icon: DollarSign },
  { label: "YoY 2025",  href: "/awq-venture/yoy-2025",   icon: LineChart  },
];
const ventureCrmNav = [
  { label: "Comercial", href: "/awq-venture/comercial", icon: TrendingUp },
  { label: "Deals",     href: "/awq-venture/deals",     icon: FileText   },
  { label: "Pipeline",  href: "/awq-venture/pipeline",  icon: Activity   },
  { label: "Sales",     href: "/awq-venture/sales",     icon: DollarSign },
];
const venturePpmNav = [
  { label: "Portfólio", href: "/awq-venture/portfolio", icon: Briefcase },
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

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  analyst: "Analyst",
  "cs-ops": "CS Ops",
};

// ── Main Component ────────────────────────────────────────────────────────
export default function MobileNavDrawer({ open, onClose }: MobileNavDrawerProps) {
  const rawPathname = usePathname();
  const pathname = rawPathname ?? "";
  const backdropRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const sessionUser = session?.user as { name?: string; email?: string; role?: string } | undefined;
  const userName = sessionUser?.name ?? sessionUser?.email ?? "Usuário";
  const userInitials = userName.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  const userRole = sessionUser?.role;
  const roleLabel = ROLE_LABELS[userRole ?? ""] ?? userRole ?? "—";

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

  const jacqesMode   = isJacqesRoute(pathname);
  const cazaMode     = isCazaRoute(pathname);
  const advisorMode  = isAdvisorRoute(pathname);
  const ventureMode  = isVentureRoute(pathname);
  const crmMode      = isCrmRoute(pathname);
  const epmMode      = isEpmRoute(pathname);
  const ppmMode      = isPpmRoute(pathname);
  const biMode       = isBiRoute(pathname);
  const settingsMode = isSettingsRoute(pathname);

  const isBuMode = jacqesMode || cazaMode || advisorMode || ventureMode;
  const isTowerMode = crmMode || epmMode || ppmMode || biMode || settingsMode;

  let buContext: React.ReactNode = null;

  if (jacqesMode) {
    buContext = (
      <BUContextBar
        label="JACQES"
        sub="Agência · AWQ Group"
        colorClass="bg-brand-50 border-brand-200 text-brand-700"
        onNavigate={onClose}
      />
    );
  } else if (cazaMode) {
    buContext = (
      <BUContextBar
        label="Caza Vision"
        sub="Produtora · AWQ Group"
        colorClass="bg-emerald-50 border-emerald-200 text-emerald-700"
        onNavigate={onClose}
      />
    );
  } else if (advisorMode) {
    buContext = (
      <BUContextBar
        label="Advisor"
        sub="Consultoria · AWQ Group"
        colorClass="bg-violet-50 border-violet-200 text-violet-700"
        onNavigate={onClose}
      />
    );
  } else if (ventureMode) {
    buContext = (
      <BUContextBar
        label="AWQ Venture"
        sub="Investimentos · AWQ Group"
        colorClass="bg-amber-50 border-amber-200 text-amber-700"
        onNavigate={onClose}
      />
    );
  } else if (crmMode) {
    buContext = (
      <BUContextBar
        label="CRM Tower"
        sub="Vendas · AWQ Group"
        colorClass="bg-brand-50 border-brand-200 text-brand-700"
        onNavigate={onClose}
      />
    );
  } else if (epmMode) {
    buContext = (
      <BUContextBar
        label="EPM Tower"
        sub="Finanças · AWQ Group"
        colorClass="bg-brand-50 border-brand-200 text-brand-700"
        onNavigate={onClose}
      />
    );
  } else if (ppmMode) {
    buContext = (
      <BUContextBar
        label="PPM Tower"
        sub="Projetos · AWQ Group"
        colorClass="bg-brand-50 border-brand-200 text-brand-700"
        onNavigate={onClose}
      />
    );
  } else if (biMode) {
    buContext = (
      <BUContextBar
        label="BI Tower"
        sub="Analytics · AWQ Group"
        colorClass="bg-brand-50 border-brand-200 text-brand-700"
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

          {/* ── JACQES ───────────────────────────────────── */}
          {jacqesMode && (
            <>
              <div className="space-y-0.5 mt-2 mb-1">
                <NavLink href="/jacqes" icon={LayoutDashboard} label="Visão Geral" active={pathname === "/jacqes"} onNavigate={onClose} />
              </div>
              <SectionLabel>EPM · Financeiro & Performance</SectionLabel>
              <div className="space-y-0.5">
                {jacqesEpmNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
              <SectionLabel>CRM · Vendas & Relacionamento</SectionLabel>
              <div className="space-y-0.5">
                {jacquesCrmNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
              <SectionLabel>Gestão</SectionLabel>
              <div className="space-y-0.5">
                {jacqesGestaoNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
            </>
          )}

          {/* ── Caza Vision ──────────────────────────────── */}
          {cazaMode && (
            <>
              <div className="space-y-0.5 mt-2 mb-1">
                <NavLink href="/caza-vision" icon={LayoutDashboard} label="Visão Geral" active={pathname === "/caza-vision"} onNavigate={onClose} />
              </div>
              <SectionLabel>EPM · Financeiro & Performance</SectionLabel>
              <div className="space-y-0.5">
                {cazaEpmNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
              <SectionLabel>PPM · Projetos</SectionLabel>
              <div className="space-y-0.5">
                {cazaPpmNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
              <SectionLabel>CRM · Clientes & Relacionamento</SectionLabel>
              <div className="space-y-0.5">
                {cazaCrmNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
            </>
          )}

          {/* ── Advisor ──────────────────────────────────── */}
          {advisorMode && (
            <>
              <div className="space-y-0.5 mt-2 mb-1">
                <NavLink href="/advisor" icon={LayoutDashboard} label="Visão Geral" active={pathname === "/advisor"} onNavigate={onClose} />
              </div>
              <SectionLabel>EPM · Financeiro & Performance</SectionLabel>
              <div className="space-y-0.5">
                {advisorEpmNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
              <SectionLabel>CRM · Clientes & Relacionamento</SectionLabel>
              <div className="space-y-0.5">
                {advisorCrmNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
            </>
          )}

          {/* ── AWQ Venture ──────────────────────────────── */}
          {ventureMode && (
            <>
              <div className="space-y-0.5 mt-2 mb-1">
                <NavLink href="/awq-venture" icon={LayoutDashboard} label="Visão Geral" active={pathname === "/awq-venture"} onNavigate={onClose} />
              </div>
              <SectionLabel>EPM · Financeiro & Performance</SectionLabel>
              <div className="space-y-0.5">
                {ventureEpmNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
              <SectionLabel>CRM · Comercial & Pipeline</SectionLabel>
              <div className="space-y-0.5">
                {ventureCrmNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
              <SectionLabel>PPM · Portfólio & Investimentos</SectionLabel>
              <div className="space-y-0.5">
                {venturePpmNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
            </>
          )}

          {/* ── CRM Tower ────────────────────────────────── */}
          {crmMode && (
            <>
              <SectionLabel>CRM · Navegação</SectionLabel>
              <div className="space-y-0.5">
                {crmTowerNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
            </>
          )}

          {/* ── EPM Tower ────────────────────────────────── */}
          {epmMode && (
            <>
              <SectionLabel>FP&A</SectionLabel>
              <div className="space-y-0.5">
                {epmFpaNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
              <SectionLabel>Tesouraria</SectionLabel>
              <div className="space-y-0.5">
                {epmTesourariaNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
              <SectionLabel>AP & AR</SectionLabel>
              <div className="space-y-0.5">
                {epmApArNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
              <SectionLabel>Controladoria</SectionLabel>
              <div className="space-y-0.5">
                {epmControladoriaNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
              <SectionLabel>Relatórios</SectionLabel>
              <div className="space-y-0.5">
                {epmRelatoriosNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
            </>
          )}

          {/* ── PPM Tower ────────────────────────────────── */}
          {ppmMode && (
            <>
              <SectionLabel>PPM · Navegação</SectionLabel>
              <div className="space-y-0.5">
                {ppmTowerNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
            </>
          )}

          {/* ── BI Tower ─────────────────────────────────── */}
          {biMode && (
            <>
              <SectionLabel>BI · Navegação</SectionLabel>
              <div className="space-y-0.5">
                {biTowerNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
            </>
          )}

          {/* ── Settings ─────────────────────────────────── */}
          {settingsMode && (
            <>
              <SectionLabel>Configurações</SectionLabel>
              <div className="space-y-0.5">
                <NavLink href="/settings" icon={Settings} label="Geral" active={pathname === "/settings"} onNavigate={onClose} />
              </div>
              <SectionLabel>Segurança</SectionLabel>
              <div className="space-y-0.5">
                <NavLink href="/settings/security" icon={ShieldCheck} label="Segurança" active={isActive("/settings/security")} onNavigate={onClose} />
              </div>
              <SectionLabel>Sistema</SectionLabel>
              <div className="space-y-0.5">
                <NavLink href="/settings/integrations" icon={Database} label="Integrações" active={isActive("/settings/integrations")} onNavigate={onClose} />
              </div>
            </>
          )}

          {/* ── AWQ Group ────────────────────────────────── */}
          {!isBuMode && !isTowerMode && (
            <>
              <SectionLabel>AWQ Group · Visão Geral</SectionLabel>
              <div className="space-y-0.5">
                {awqNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
            </>
          )}

          {/* 10 modules — only in AWQ mode */}
          {!isBuMode && !isTowerMode && (
            <>
              <SectionLabel>EPM · Finanças & Performance</SectionLabel>
              <div className="space-y-0.5">
                {awqEpmNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
              <SectionLabel>CRM · Vendas & Relacionamento</SectionLabel>
              <div className="space-y-0.5">
                {awqCrmNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
              <SectionLabel>PPM · Projetos & Portfólio</SectionLabel>
              <div className="space-y-0.5">
                {awqPpmNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
              <SectionLabel>BPM · Processos & Workflows</SectionLabel>
              <div className="space-y-0.5">
                {awqBpmNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
              <SectionLabel>BI · Dashboards & Análises</SectionLabel>
              <div className="space-y-0.5">
                {awqBiNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
              <SectionLabel>CPM · Estratégia & Performance</SectionLabel>
              <div className="space-y-0.5">
                {awqCpmNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
              <SectionLabel>GRC · Governança & Compliance</SectionLabel>
              <div className="space-y-0.5">
                {awqGrcNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
              <SectionLabel>M&A · Fusões, Aquisições & Portfólio</SectionLabel>
              <div className="space-y-0.5">
                {awqMaNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
              <SectionLabel>DMS · Documentos & Arquivos</SectionLabel>
              <div className="space-y-0.5">
                {awqDmsNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
              <SectionLabel>ERP · Compras & Contratos</SectionLabel>
              <div className="space-y-0.5">
                {awqErpNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
              <SectionLabel>HCM · RH & Pessoas</SectionLabel>
              <div className="space-y-0.5">
                {awqHcmNav.map((item) => (
                  <NavLink key={item.href} {...item} active={isActive(item.href)} onNavigate={onClose} />
                ))}
              </div>
            </>
          )}

          {/* BU quick-switch when in AWQ mode */}
          {!isBuMode && !isTowerMode && (
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

          {/* IA & Agentes — sempre visível */}
          {!settingsMode && (
            <>
              <SectionLabel>IA & Agentes</SectionLabel>
              <div className="space-y-0.5">
                <NavLink href="/agents"   icon={Bot}      label="Agents"   active={isActive("/agents")}   onNavigate={onClose} />
                <NavLink href="/openclaw" icon={Sparkles} label="OpenClaw" active={isActive("/openclaw")} onNavigate={onClose} />
              </div>
            </>
          )}

          {/* Sistema — sempre visível */}
          {!settingsMode && (
            <SectionLabel>Sistema</SectionLabel>
          )}
          {!settingsMode && (
            <div className="space-y-0.5">
              <NavLink href="/settings" icon={Settings} label="Settings" active={pathname === "/settings"} onNavigate={onClose} />
            </div>
          )}
        </nav>

        {/* Drawer Footer */}
        <div className="px-4 py-4 border-t border-gray-100 shrink-0">
          <div className="flex items-center gap-3 px-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-awq-gold to-amber-600 flex items-center justify-center text-xs font-bold text-gray-900 shrink-0">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-800 truncate">{userName}</span>
                {userRole && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                    {roleLabel.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-gray-400 truncate">{sessionUser?.email ?? "—"}</div>
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
      </div>
    </>
  );
}
