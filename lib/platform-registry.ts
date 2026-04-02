// ─── AWQ Platform Route Registry ─────────────────────────────────────────────
//
// Single source of truth for every route in the platform.
//
// PURPOSE
//   Prevents nav drift: any new route MUST be registered here before it can
//   appear in a sidebar or tab-nav. Any nav link not backed by an entry here
//   is a structural bug.
//
// ROUTE STATUS
//   active   = page has real content (data-driven or substantial UI)
//   stub     = page file exists, content is "Em construção / Em breve"
//   redirect = root-level legacy path that redirects to the canonical location
//   external = off-platform URL (different repo/domain)
//
// FIELDS
//   href        – canonical Next.js route (no basePath prefix)
//   label       – display label used in nav components
//   bu          – owning business unit
//   layer       – architectural layer
//   status      – see above
//   dataSource  – where this page gets its data
//   inSidebar   – appears in sidebar nav
//   inTabNav    – appears in a tab nav (venture layout only)
//   canonical   – for redirects: the target href
//
// DISCIPLINE
//   New route:    add here (stub) → create page → set inSidebar:true → mark active
//   Remove route: remove from nav → remove page → remove here
//   Never:        add to nav without a registry entry; add entry without a page

export type RouteStatus = "active" | "stub" | "redirect" | "external";
export type RouteLayer =
  | "control-tower"   // AWQ Group holding governance
  | "bu-overview"     // BU landing / overview
  | "bu-financial"    // BU financial sub-page
  | "bu-operations"   // BU ops (customers, pipeline, unit-econ…)
  | "system"          // Platform-level (auth, settings…)
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
  canonical?: string;  // for redirect entries only
}

export const PLATFORM_ROUTES: PlatformRoute[] = [
  // ── AWQ Group — Control Tower ─────────────────────────────────────────────
  { href: "/awq",              label: "Visão Geral",    bu: "awq",  layer: "control-tower", status: "active", dataSource: "lib/awq-group-data.ts", inSidebar: true,  inTabNav: false },
  { href: "/business-units",   label: "Business Units", bu: "awq",  layer: "control-tower", status: "active", dataSource: "lib/awq-group-data.ts", inSidebar: true,  inTabNav: false },
  { href: "/awq/kpis",         label: "KPIs",           bu: "awq",  layer: "control-tower", status: "active", dataSource: "lib/awq-group-data.ts", inSidebar: true,  inTabNav: false },
  { href: "/awq/financial",    label: "Financial",      bu: "awq",  layer: "bu-financial",  status: "active", dataSource: "lib/awq-group-data.ts", inSidebar: true,  inTabNav: false },
  { href: "/awq/portfolio",    label: "Portfolio",      bu: "awq",  layer: "control-tower", status: "active", dataSource: "lib/awq-group-data.ts", inSidebar: true,  inTabNav: false },
  { href: "/awq/cashflow",     label: "Cash Flow",      bu: "awq",  layer: "bu-financial",  status: "active", dataSource: "lib/awq-group-data.ts", inSidebar: true,  inTabNav: false },
  { href: "/awq/budget",       label: "Budget",         bu: "awq",  layer: "bu-financial",  status: "active", dataSource: "lib/awq-group-data.ts", inSidebar: true,  inTabNav: false },
  { href: "/awq/forecast",     label: "Forecast",       bu: "awq",  layer: "bu-financial",  status: "active", dataSource: "lib/awq-group-data.ts", inSidebar: true,  inTabNav: false },
  { href: "/awq/allocations",  label: "Allocations",    bu: "awq",  layer: "control-tower", status: "active", dataSource: "lib/awq-group-data.ts", inSidebar: true,  inTabNav: false },
  { href: "/awq/risk",         label: "Risk",           bu: "awq",  layer: "control-tower", status: "active", dataSource: "lib/awq-group-data.ts", inSidebar: true,  inTabNav: false },
  { href: "/awq/bank",         label: "Contas Banco",   bu: "awq",  layer: "bu-financial",  status: "active", dataSource: "lib/awq-group-data.ts", inSidebar: true,  inTabNav: false },

  // ── JACQES — Agência ─────────────────────────────────────────────────────
  { href: "/jacqes",                  label: "Visão Geral",    bu: "jacqes", layer: "bu-overview",   status: "active", dataSource: "lib/data.ts",            inSidebar: true,  inTabNav: false },
  { href: "/jacqes/financial",        label: "Financial",      bu: "jacqes", layer: "bu-financial",  status: "active", dataSource: "lib/data.ts",            inSidebar: true,  inTabNav: false },
  { href: "/jacqes/revenue",          label: "Revenue",        bu: "jacqes", layer: "bu-financial",  status: "active", dataSource: "lib/data.ts",            inSidebar: true,  inTabNav: false },
  { href: "/jacqes/customers",        label: "Customers",      bu: "jacqes", layer: "bu-operations", status: "active", dataSource: "lib/data.ts",            inSidebar: true,  inTabNav: false },
  { href: "/jacqes/unit-economics",   label: "Unit Economics", bu: "jacqes", layer: "bu-operations", status: "active", dataSource: "lib/data.ts",            inSidebar: true,  inTabNav: false },
  { href: "/jacqes/budget",           label: "Budget",         bu: "jacqes", layer: "bu-financial",  status: "active", dataSource: "lib/data.ts",            inSidebar: true,  inTabNav: false },
  { href: "/jacqes/desempenho",       label: "Desempenho",     bu: "jacqes", layer: "bu-operations", status: "stub",   dataSource: "none — placeholder",     inSidebar: true,  inTabNav: false },
  { href: "/jacqes/carteira",         label: "Carteira",       bu: "jacqes", layer: "bu-operations", status: "stub",   dataSource: "none — placeholder",     inSidebar: true,  inTabNav: false },
  { href: "/jacqes/analise",          label: "Análise",        bu: "jacqes", layer: "bu-operations", status: "stub",   dataSource: "none — placeholder",     inSidebar: true,  inTabNav: false },
  { href: "/jacqes/csops",            label: "CS Ops",         bu: "jacqes", layer: "bu-operations", status: "stub",   dataSource: "none — placeholder",     inSidebar: true,  inTabNav: false },
  { href: "/jacqes/reports",          label: "Relatórios",     bu: "jacqes", layer: "bu-operations", status: "active", dataSource: "lib/data.ts (mocked)",   inSidebar: true,  inTabNav: false },
  { href: "/jacqes/categorias",       label: "Categorias",     bu: "jacqes", layer: "bu-operations", status: "stub",   dataSource: "none — placeholder",     inSidebar: true,  inTabNav: false },
  { href: "/jacqes/carreira",         label: "Modo Carreira",  bu: "jacqes", layer: "bu-operations", status: "stub",   dataSource: "none — placeholder",     inSidebar: true,  inTabNav: false },

  // Legacy root-level JACQES redirects (kept for backward compatibility)
  { href: "/desempenho", label: "Desempenho",  bu: "jacqes", layer: "bu-operations", status: "redirect", dataSource: "n/a", inSidebar: false, inTabNav: false, canonical: "/jacqes/desempenho" },
  { href: "/carteira",   label: "Carteira",    bu: "jacqes", layer: "bu-operations", status: "redirect", dataSource: "n/a", inSidebar: false, inTabNav: false, canonical: "/jacqes/carteira"   },
  { href: "/analise",    label: "Análise",     bu: "jacqes", layer: "bu-operations", status: "redirect", dataSource: "n/a", inSidebar: false, inTabNav: false, canonical: "/jacqes/analise"    },
  { href: "/csops",      label: "CS Ops",      bu: "jacqes", layer: "bu-operations", status: "redirect", dataSource: "n/a", inSidebar: false, inTabNav: false, canonical: "/jacqes/csops"      },
  { href: "/reports",    label: "Relatórios",  bu: "jacqes", layer: "bu-operations", status: "redirect", dataSource: "n/a", inSidebar: false, inTabNav: false, canonical: "/jacqes/reports"    },
  { href: "/categorias", label: "Categorias",  bu: "jacqes", layer: "bu-operations", status: "redirect", dataSource: "n/a", inSidebar: false, inTabNav: false, canonical: "/jacqes/categorias" },
  { href: "/carreira",   label: "Carreira",    bu: "jacqes", layer: "bu-operations", status: "redirect", dataSource: "n/a", inSidebar: false, inTabNav: false, canonical: "/jacqes/carreira"   },
  { href: "/revenue",    label: "Revenue",     bu: "jacqes", layer: "bu-financial",  status: "redirect", dataSource: "n/a", inSidebar: false, inTabNav: false, canonical: "/jacqes/revenue"    },
  { href: "/customers",  label: "Customers",   bu: "jacqes", layer: "bu-operations", status: "redirect", dataSource: "n/a", inSidebar: false, inTabNav: false, canonical: "/jacqes/customers"  },
  { href: "/financial",  label: "Financial",   bu: "jacqes", layer: "bu-financial",  status: "redirect", dataSource: "n/a", inSidebar: false, inTabNav: false, canonical: "/jacqes/financial"  },

  // ── Caza Vision — Produtora ───────────────────────────────────────────────
  { href: "/caza-vision",                label: "Visão Geral",    bu: "caza", layer: "bu-overview",   status: "active", dataSource: "lib/caza-data.ts",     inSidebar: true,  inTabNav: false },
  { href: "/caza-vision/imoveis",        label: "Projetos",       bu: "caza", layer: "bu-operations", status: "active", dataSource: "lib/caza-data.ts",     inSidebar: true,  inTabNav: false },
  { href: "/caza-vision/clientes",       label: "Clientes",       bu: "caza", layer: "bu-operations", status: "active", dataSource: "lib/caza-data.ts + Notion", inSidebar: true, inTabNav: false },
  { href: "/caza-vision/financial",      label: "Financial",      bu: "caza", layer: "bu-financial",  status: "active", dataSource: "lib/caza-data.ts",     inSidebar: true,  inTabNav: false },
  { href: "/caza-vision/unit-economics", label: "Unit Economics", bu: "caza", layer: "bu-operations", status: "active", dataSource: "lib/caza-data.ts",     inSidebar: true,  inTabNav: false },
  // Not yet implemented — add to sidebar only after page is created
  // { href: "/caza-vision/pipeline",    label: "Pipeline",        status: "stub", inSidebar: false }
  // { href: "/caza-vision/relatorios",  label: "Relatórios",      status: "stub", inSidebar: false }

  // ── AWQ Venture — Investimentos ───────────────────────────────────────────
  { href: "/awq-venture",               label: "Visão Geral",  bu: "venture", layer: "bu-overview",   status: "active", dataSource: "lib/awq-group-data.ts",                         inSidebar: true,  inTabNav: true  },
  { href: "/awq-venture/portfolio",     label: "Portfólio",    bu: "venture", layer: "bu-operations", status: "active", dataSource: "lib/awq-group-data.ts",                         inSidebar: true,  inTabNav: true  },
  { href: "/awq-venture/pipeline",      label: "Pipeline",     bu: "venture", layer: "bu-operations", status: "active", dataSource: "lib/awq-group-data.ts",                         inSidebar: true,  inTabNav: true  },
  { href: "/awq-venture/financial",     label: "Financial",    bu: "venture", layer: "bu-financial",  status: "active", dataSource: "lib/awq-group-data.ts",                         inSidebar: true,  inTabNav: true  },
  { href: "/awq-venture/yoy-2025",      label: "YoY 2025",     bu: "venture", layer: "bu-operations", status: "active", dataSource: "hardcoded",                                     inSidebar: true,  inTabNav: true  },
  { href: "/awq-venture/sales",         label: "Sales",        bu: "venture", layer: "bu-operations", status: "active", dataSource: "public/data/venture-sales.json + lib/notion-fetch.ts fetchVentureSales()", inSidebar: false, inTabNav: true },
  { href: "/awq-venture/awq",           label: "AWQ",          bu: "venture", layer: "bu-overview",   status: "stub",   dataSource: "none — placeholder",                            inSidebar: false, inTabNav: true  },
  { href: "/awq-venture/grupo-energdy", label: "Grupo Energdy",bu: "venture", layer: "bu-operations", status: "stub",   dataSource: "none — placeholder",                            inSidebar: false, inTabNav: true  },
  { href: "/awq-venture/ri",            label: "RI",           bu: "venture", layer: "bu-operations", status: "stub",   dataSource: "none — placeholder",                            inSidebar: false, inTabNav: true  },
  { href: "/awq-venture/benchmark",     label: "Benchmark",    bu: "venture", layer: "bu-operations", status: "stub",   dataSource: "none — placeholder",                            inSidebar: false, inTabNav: true  },

  // ── Advisor — Consultoria ─────────────────────────────────────────────────
  { href: "/advisor",            label: "Visão Geral", bu: "advisor", layer: "bu-overview",   status: "active", dataSource: "lib/caza-data.ts (cazaClients)", inSidebar: true, inTabNav: false },
  { href: "/advisor/financial",  label: "Financial",   bu: "advisor", layer: "bu-financial",  status: "active", dataSource: "lib/caza-data.ts",              inSidebar: true, inTabNav: false },
  { href: "/advisor/customers",  label: "Customers",   bu: "advisor", layer: "bu-operations", status: "active", dataSource: "lib/caza-data.ts",              inSidebar: true, inTabNav: false },
  // Not yet implemented — add to sidebar only after page is created
  // { href: "/advisor/portfolio",  label: "Portfólio",   status: "stub", inSidebar: false }
  // { href: "/advisor/relatorios", label: "Relatórios",  status: "stub", inSidebar: false }

  // ── System ────────────────────────────────────────────────────────────────
  { href: "/login",    label: "Login",    bu: "system", layer: "system", status: "active", dataSource: "next-auth / lib/auth-users.ts", inSidebar: false, inTabNav: false },
  { href: "/settings", label: "Settings", bu: "system", layer: "system", status: "active", dataSource: "none",                         inSidebar: true,  inTabNav: false },

  // ── AI & Agents ───────────────────────────────────────────────────────────
  { href: "/agents",   label: "Agents",   bu: "ai", layer: "ai", status: "active", dataSource: "lib/agents-config.ts + /api/agents", inSidebar: true, inTabNav: false },
  { href: "/openclaw", label: "OpenClaw", bu: "ai", layer: "ai", status: "active", dataSource: "/api/chat (Anthropic SDK)",          inSidebar: true, inTabNav: false },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Active (non-stub, non-redirect) routes for a given BU */
export function getActiveRoutes(bu: PlatformRoute["bu"]): PlatformRoute[] {
  return PLATFORM_ROUTES.filter((r) => r.bu === bu && r.status === "active");
}

/** Routes that appear in the sidebar for a given BU */
export function getSidebarRoutes(bu: PlatformRoute["bu"]): PlatformRoute[] {
  return PLATFORM_ROUTES.filter((r) => r.bu === bu && r.inSidebar);
}

/** Stubs that are visible in the sidebar — useful for audit/tracking */
export function getStubSidebarRoutes(): PlatformRoute[] {
  return PLATFORM_ROUTES.filter((r) => r.inSidebar && r.status === "stub");
}

/** All redirect entries — backward-compat routes that should never appear in nav */
export function getRedirectRoutes(): PlatformRoute[] {
  return PLATFORM_ROUTES.filter((r) => r.status === "redirect");
}
