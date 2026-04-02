// ─── AWQ Platform Route Registry ─────────────────────────────────────────────
//
// Single source of truth for every route in the platform.
//
// PURPOSE
//   Prevents nav drift: any new route MUST be registered here before it can
//   appear in a sidebar or tab-nav. Any nav link not backed by an entry here
//   is a structural bug.
//
// FIELDS
//   href        – canonical Next.js route (no basePath prefix)
//   label       – display label used in nav components
//   bu          – owning business unit: "awq" | "jacqes" | "caza" | "venture" | "advisor" | "system"
//   layer       – architectural layer
//   status      – "active" = real content; "stub" = "em breve"; "external" = off-platform URL
//   dataSource  – where this page gets its data from
//   inSidebar   – whether this route appears in the sidebar nav
//   inTabNav    – whether this route appears in a tab nav (venture layout)
//
// HOW TO USE
//   When adding a page:   add entry here → add page file → optionally add to sidebar
//   When removing a page: remove from sidebar/tab-nav first → remove page file → remove here
//   To audit nav drift:   compare sidebar nav arrays to this registry

export type RouteStatus = "active" | "stub" | "external";
export type RouteLayer =
  | "control-tower"   // AWQ Group top-level governance
  | "bu-overview"     // BU landing / overview
  | "bu-financial"    // BU financial sub-page
  | "bu-operations"   // BU ops sub-page (customers, pipeline, unit-econ…)
  | "system"          // Platform-level (agents, settings, login…)
  | "ai";             // AI / agent tooling

export interface PlatformRoute {
  href: string;
  label: string;
  bu: "awq" | "jacqes" | "caza" | "venture" | "advisor" | "system" | "ai";
  layer: RouteLayer;
  status: RouteStatus;
  dataSource: string;
  inSidebar: boolean;
  inTabNav: boolean;
}

export const PLATFORM_ROUTES: PlatformRoute[] = [
  // ── AWQ Group — Control Tower ─────────────────────────────────────────────
  { href: "/awq",              label: "Visão Geral",    bu: "awq",     layer: "control-tower",  status: "active",   dataSource: "lib/awq-group-data.ts",  inSidebar: true,  inTabNav: false },
  { href: "/business-units",   label: "Business Units", bu: "awq",     layer: "control-tower",  status: "active",   dataSource: "lib/awq-group-data.ts",  inSidebar: true,  inTabNav: false },
  { href: "/awq/kpis",         label: "KPIs",           bu: "awq",     layer: "control-tower",  status: "active",   dataSource: "lib/awq-group-data.ts",  inSidebar: true,  inTabNav: false },
  { href: "/awq/financial",    label: "Financial",      bu: "awq",     layer: "bu-financial",   status: "active",   dataSource: "lib/awq-group-data.ts",  inSidebar: true,  inTabNav: false },
  { href: "/awq/portfolio",    label: "Portfolio",      bu: "awq",     layer: "control-tower",  status: "active",   dataSource: "lib/awq-group-data.ts",  inSidebar: true,  inTabNav: false },
  { href: "/awq/cashflow",     label: "Cash Flow",      bu: "awq",     layer: "bu-financial",   status: "active",   dataSource: "lib/awq-group-data.ts",  inSidebar: true,  inTabNav: false },
  { href: "/awq/budget",       label: "Budget",         bu: "awq",     layer: "bu-financial",   status: "active",   dataSource: "lib/awq-group-data.ts",  inSidebar: true,  inTabNav: false },
  { href: "/awq/forecast",     label: "Forecast",       bu: "awq",     layer: "bu-financial",   status: "active",   dataSource: "lib/awq-group-data.ts",  inSidebar: true,  inTabNav: false },
  { href: "/awq/allocations",  label: "Allocations",    bu: "awq",     layer: "control-tower",  status: "active",   dataSource: "lib/awq-group-data.ts",  inSidebar: true,  inTabNav: false },
  { href: "/awq/risk",         label: "Risk",           bu: "awq",     layer: "control-tower",  status: "active",   dataSource: "lib/awq-group-data.ts",  inSidebar: true,  inTabNav: false },
  { href: "/awq/bank",         label: "Contas Banco",   bu: "awq",     layer: "bu-financial",   status: "active",   dataSource: "lib/awq-group-data.ts",  inSidebar: true,  inTabNav: false },

  // ── JACQES — Agência ─────────────────────────────────────────────────────
  { href: "/jacqes",                label: "Visão Geral",    bu: "jacqes",  layer: "bu-overview",    status: "active",   dataSource: "lib/data.ts",            inSidebar: true,  inTabNav: false },
  { href: "/jacqes/financial",      label: "Financial",      bu: "jacqes",  layer: "bu-financial",   status: "active",   dataSource: "lib/data.ts",            inSidebar: true,  inTabNav: false },
  { href: "/jacqes/customers",      label: "Customers",      bu: "jacqes",  layer: "bu-operations",  status: "active",   dataSource: "lib/data.ts",            inSidebar: true,  inTabNav: false },
  { href: "/jacqes/unit-economics", label: "Unit Economics", bu: "jacqes",  layer: "bu-operations",  status: "active",   dataSource: "lib/data.ts",            inSidebar: true,  inTabNav: false },
  { href: "/jacqes/budget",         label: "Budget",         bu: "jacqes",  layer: "bu-financial",   status: "active",   dataSource: "lib/data.ts",            inSidebar: true,  inTabNav: false },
  // Legacy root-level JACQES routes (functional, but outside /jacqes/* namespace — P2 migration candidate)
  { href: "/desempenho",    label: "Desempenho",  bu: "jacqes",  layer: "bu-operations",  status: "stub",     dataSource: "none — placeholder",     inSidebar: true,  inTabNav: false },
  { href: "/carteira",      label: "Carteira",    bu: "jacqes",  layer: "bu-operations",  status: "stub",     dataSource: "none — placeholder",     inSidebar: true,  inTabNav: false },
  { href: "/analise",       label: "Análise",     bu: "jacqes",  layer: "bu-operations",  status: "stub",     dataSource: "none — placeholder",     inSidebar: true,  inTabNav: false },
  { href: "/csops",         label: "CS Ops",      bu: "jacqes",  layer: "bu-operations",  status: "stub",     dataSource: "none — placeholder",     inSidebar: true,  inTabNav: false },
  { href: "/revenue",       label: "Revenue",     bu: "jacqes",  layer: "bu-financial",   status: "active",   dataSource: "lib/data.ts",            inSidebar: false, inTabNav: false },
  { href: "/reports",       label: "Relatórios",  bu: "jacqes",  layer: "bu-operations",  status: "stub",     dataSource: "none — placeholder",     inSidebar: true,  inTabNav: false },
  { href: "/categorias",    label: "Categorias",  bu: "jacqes",  layer: "bu-operations",  status: "stub",     dataSource: "none — placeholder",     inSidebar: true,  inTabNav: false },
  { href: "/carreira",      label: "Carreira",    bu: "jacqes",  layer: "bu-operations",  status: "stub",     dataSource: "none — placeholder",     inSidebar: true,  inTabNav: false },
  // Root-level pages with ambiguous ownership (originally JACQES, now unclear — P2 audit)
  { href: "/customers",     label: "Customers",   bu: "jacqes",  layer: "bu-operations",  status: "active",   dataSource: "lib/data.ts",            inSidebar: false, inTabNav: false },
  { href: "/financial",     label: "Financial",   bu: "jacqes",  layer: "bu-financial",   status: "active",   dataSource: "lib/data.ts",            inSidebar: false, inTabNav: false },

  // ── Caza Vision — Produtora ───────────────────────────────────────────────
  { href: "/caza-vision",                  label: "Visão Geral",    bu: "caza",    layer: "bu-overview",    status: "active",   dataSource: "lib/caza-data.ts",       inSidebar: true,  inTabNav: false },
  { href: "/caza-vision/imoveis",          label: "Projetos",       bu: "caza",    layer: "bu-operations",  status: "active",   dataSource: "lib/caza-data.ts",       inSidebar: true,  inTabNav: false },
  { href: "/caza-vision/clientes",         label: "Clientes",       bu: "caza",    layer: "bu-operations",  status: "active",   dataSource: "lib/caza-data.ts",       inSidebar: true,  inTabNav: false },
  { href: "/caza-vision/financial",        label: "Financial",      bu: "caza",    layer: "bu-financial",   status: "active",   dataSource: "lib/caza-data.ts",       inSidebar: true,  inTabNav: false },
  { href: "/caza-vision/unit-economics",   label: "Unit Economics", bu: "caza",    layer: "bu-operations",  status: "active",   dataSource: "lib/caza-data.ts",       inSidebar: true,  inTabNav: false },
  // Not yet implemented — do NOT add to sidebar until page exists
  // { href: "/caza-vision/pipeline",      label: "Pipeline",        bu: "caza",    layer: "bu-operations",  status: "stub",   dataSource: "none",                   inSidebar: false, inTabNav: false },
  // { href: "/caza-vision/relatorios",    label: "Relatórios",      bu: "caza",    layer: "bu-operations",  status: "stub",   dataSource: "none",                   inSidebar: false, inTabNav: false },

  // ── AWQ Venture — Investimentos ───────────────────────────────────────────
  { href: "/awq-venture",              label: "Visão Geral",  bu: "venture", layer: "bu-overview",    status: "active",   dataSource: "lib/awq-group-data.ts",  inSidebar: true,  inTabNav: true  },
  { href: "/awq-venture/portfolio",    label: "Portfólio",    bu: "venture", layer: "bu-operations",  status: "active",   dataSource: "lib/awq-group-data.ts",  inSidebar: true,  inTabNav: true  },
  { href: "/awq-venture/pipeline",     label: "Pipeline",     bu: "venture", layer: "bu-operations",  status: "active",   dataSource: "lib/awq-group-data.ts",  inSidebar: true,  inTabNav: true  },
  { href: "/awq-venture/financial",    label: "Financial",    bu: "venture", layer: "bu-financial",   status: "active",   dataSource: "lib/awq-group-data.ts",  inSidebar: true,  inTabNav: true  },
  { href: "/awq-venture/yoy-2025",     label: "YoY 2025",     bu: "venture", layer: "bu-operations",  status: "active",   dataSource: "hardcoded",              inSidebar: true,  inTabNav: true  },
  { href: "/awq-venture/awq",          label: "AWQ",          bu: "venture", layer: "bu-overview",    status: "stub",     dataSource: "none — placeholder",     inSidebar: false, inTabNav: true  },
  { href: "/awq-venture/sales",        label: "Sales",        bu: "venture", layer: "bu-operations",  status: "stub",     dataSource: "public/data/venture-sales.json — not wired", inSidebar: false, inTabNav: true  },
  { href: "/awq-venture/grupo-energdy",label: "Grupo Energdy",bu: "venture", layer: "bu-operations",  status: "stub",     dataSource: "none — placeholder",     inSidebar: false, inTabNav: true  },
  { href: "/awq-venture/ri",           label: "RI",           bu: "venture", layer: "bu-operations",  status: "stub",     dataSource: "none — placeholder",     inSidebar: false, inTabNav: true  },
  { href: "/awq-venture/benchmark",    label: "Benchmark",    bu: "venture", layer: "bu-operations",  status: "stub",     dataSource: "none — placeholder",     inSidebar: false, inTabNav: true  },

  // ── Advisor — Consultoria ─────────────────────────────────────────────────
  { href: "/advisor",            label: "Visão Geral", bu: "advisor", layer: "bu-overview",    status: "active",   dataSource: "lib/caza-data.ts (cazaClients)", inSidebar: true,  inTabNav: false },
  { href: "/advisor/financial",  label: "Financial",   bu: "advisor", layer: "bu-financial",   status: "active",   dataSource: "lib/caza-data.ts",              inSidebar: true,  inTabNav: false },
  { href: "/advisor/customers",  label: "Customers",   bu: "advisor", layer: "bu-operations",  status: "active",   dataSource: "lib/caza-data.ts",              inSidebar: true,  inTabNav: false },
  // Not yet implemented — do NOT add to sidebar until page exists
  // { href: "/advisor/portfolio",  label: "Portfólio",   bu: "advisor", layer: "bu-operations",  status: "stub",   dataSource: "none",                          inSidebar: false, inTabNav: false },
  // { href: "/advisor/relatorios", label: "Relatórios",  bu: "advisor", layer: "bu-operations",  status: "stub",   dataSource: "none",                          inSidebar: false, inTabNav: false },

  // ── System ────────────────────────────────────────────────────────────────
  { href: "/login",    label: "Login",    bu: "system", layer: "system", status: "active", dataSource: "next-auth",        inSidebar: false, inTabNav: false },
  { href: "/settings", label: "Settings", bu: "system", layer: "system", status: "active", dataSource: "none",             inSidebar: true,  inTabNav: false },
  { href: "/carreira", label: "Carreira", bu: "system", layer: "system", status: "stub",   dataSource: "none — placeholder", inSidebar: true, inTabNav: false },

  // ── AI & Agents ───────────────────────────────────────────────────────────
  { href: "/agents",   label: "Agents",   bu: "ai", layer: "ai", status: "active", dataSource: "lib/agents-config.ts + /api/agents", inSidebar: true, inTabNav: false },
  { href: "/openclaw", label: "OpenClaw", bu: "ai", layer: "ai", status: "active", dataSource: "/api/chat",                          inSidebar: true, inTabNav: false },
];

// ── Helpers ────────────────────────────────────────────────────────────────

/** All active (non-stub, non-external) routes for a given BU */
export function getActiveRoutes(bu: PlatformRoute["bu"]): PlatformRoute[] {
  return PLATFORM_ROUTES.filter((r) => r.bu === bu && r.status === "active");
}

/** All routes that should appear in a sidebar (regardless of BU) */
export function getSidebarRoutes(bu: PlatformRoute["bu"]): PlatformRoute[] {
  return PLATFORM_ROUTES.filter((r) => r.bu === bu && r.inSidebar);
}

/** Quick audit: routes in sidebar with stub status (visible but no real content) */
export function getStubSidebarRoutes(): PlatformRoute[] {
  return PLATFORM_ROUTES.filter((r) => r.inSidebar && r.status === "stub");
}
