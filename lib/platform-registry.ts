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
//   layer       – architectural layer (see ERP macro-structure below)
//   status      – see above
//   dataSource  – where this page gets its data
//   inSidebar   – appears in sidebar nav
//   inTabNav    – appears in a tab nav (venture layout only)
//   canonical   – for redirects: the target href
//
// ERP LAYER MAPPING
//   control-tower       – AWQ Group / Holding: visão executiva, KPIs, risco, portfolio
//   corporate-fpa       – Financeiro Corporativo / FP&A: DRE, budget, forecast, allocations
//   corporate-treasury  – Financeiro Corporativo / Tesouraria: cash flow, contas, investimentos
//   corporate-control   – Financeiro Corporativo / Controladoria: diagnósticos, qualidade, fechamento
//   corporate-legal     – Governança & Jurídico: jurídico, societário, compliance
//   data-infra          – Dados & Infra: ingestão, base de dados, qualidade
//   bu-overview         – BU landing / overview
//   bu-financial        – BU financial sub-page
//   bu-operations       – BU ops (customers, pipeline, unit-econ…)
//   system              – Platform-level (auth, settings…)
//   ai                  – AI / agent tooling
//
// DISCIPLINE
//   New route:    add here (stub) → create page → set inSidebar:true → mark active
//   Remove route: remove from nav → remove page → remove here
//   Never:        add to nav without a registry entry; add entry without a page

export type RouteStatus = "active" | "stub" | "redirect" | "external";
export type RouteLayer =
  | "control-tower"      // AWQ Group / Holding — visão executiva e KPIs consolidados
  | "corporate-fpa"      // Financeiro Corporativo — FP&A (DRE, budget, forecast, allocations)
  | "corporate-treasury" // Financeiro Corporativo — Tesouraria (cash flow, contas, investimentos)
  | "corporate-control"  // Financeiro Corporativo — Controladoria (fechamento, qualidade, diagnósticos)
  | "corporate-legal"    // Governança & Jurídico (contratos, societário, compliance)
  | "data-infra"         // Dados & Infra (ingestão, base de dados, qualidade)
  | "bu-overview"        // BU landing / overview
  | "bu-financial"       // BU financial sub-page
  | "bu-operations"      // BU ops (customers, pipeline, unit-econ…)
  | "system"             // Platform-level (auth, settings…)
  | "ai";                // AI / agent tooling

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
  { href: "/awq",             label: "Visão Geral",    bu: "awq", layer: "control-tower", status: "active", dataSource: "lib/financial-query.ts (FCO real) + lib/awq-group-data.ts (risk/alloc snapshot)", inSidebar: true,  inTabNav: false },
  { href: "/business-units",  label: "Business Units", bu: "awq", layer: "control-tower", status: "active", dataSource: "lib/financial-metric-query.ts → financial-query.ts (FCO real) + snapshot (BU accrual)", inSidebar: true,  inTabNav: false },
  { href: "/awq/kpis",        label: "KPIs",           bu: "awq", layer: "control-tower", status: "active", dataSource: "lib/financial-metric-query.ts → financial-query.ts (real) + snapshot (accrual KPIs)", inSidebar: true,  inTabNav: false },
  { href: "/awq/risk",        label: "Risk & Alertas", bu: "awq", layer: "control-tower", status: "active", dataSource: "lib/financial-metric-query.ts → getAWQGroupKPIs() + getEntityCashMetrics() (real) + snapshot (risk signals)", inSidebar: true,  inTabNav: false },
  { href: "/awq/portfolio",   label: "Portfolio",      bu: "awq", layer: "control-tower", status: "active", dataSource: "lib/financial-metric-query.ts → getPortfolioMetrics() (real caixa + snapshot capital)", inSidebar: true,  inTabNav: false },
  { href: "/awq/allocations", label: "Allocations",    bu: "awq", layer: "control-tower", status: "active", dataSource: "lib/awq-group-data.ts (snapshot planejamento — aviso explícito na página)", inSidebar: true,  inTabNav: false },

  // ── AWQ Group — Financeiro Corporativo / FP&A ─────────────────────────────
  { href: "/awq/financial", label: "Financial (DRE)", bu: "awq", layer: "corporate-fpa", status: "active", dataSource: "lib/financial-query.ts (pipeline canônico — sem snapshot)", inSidebar: true, inTabNav: false },
  { href: "/awq/budget",    label: "Budget",          bu: "awq", layer: "corporate-fpa", status: "active", dataSource: "lib/awq-group-data.ts (snapshot accrual — aviso explícito na página)", inSidebar: true, inTabNav: false },
  { href: "/awq/forecast",  label: "Forecast",        bu: "awq", layer: "corporate-fpa", status: "active", dataSource: "lib/awq-group-data.ts (snapshot accrual — aviso explícito na página)", inSidebar: true, inTabNav: false },

  // ── AWQ Group — Financeiro Corporativo / Tesouraria ───────────────────────
  { href: "/awq/cashflow",    label: "Cash Flow",     bu: "awq", layer: "corporate-treasury", status: "active", dataSource: "lib/financial-query.ts (pipeline canônico — sem snapshot)", inSidebar: true, inTabNav: false },
  { href: "/awq/bank",        label: "Contas Banco",  bu: "awq", layer: "corporate-treasury", status: "active", dataSource: "localStorage (saldos locais — não persistido no servidor — dívida técnica)", inSidebar: true, inTabNav: false },
  { href: "/awq/investments", label: "Investimentos", bu: "awq", layer: "corporate-treasury", status: "active", dataSource: "lib/investment-query.ts (aplicacao/resgate financeiro — pipeline canônico)", inSidebar: true, inTabNav: false },

  // ── AWQ Group — Financeiro Corporativo / Controladoria ───────────────────
  { href: "/awq/management",    label: "Controladoria",  bu: "awq", layer: "corporate-control", status: "active", dataSource: "lib/financial-metric-query.ts (diagnostics) + lib/snapshot-registry.ts + lib/platform-registry.ts", inSidebar: true, inTabNav: false },
  { href: "/awq/contabilidade", label: "Contabilidade",  bu: "awq", layer: "corporate-control", status: "stub",   dataSource: "pending — plano de contas, balancete, lançamentos (requer pipeline contábil)", inSidebar: true, inTabNav: false },
  { href: "/awq/fiscal",        label: "Fiscal",         bu: "awq", layer: "corporate-control", status: "stub",   dataSource: "pending — NF emitidas/recebidas, tributos, obrigações acessórias (requer integração fiscal)", inSidebar: true, inTabNav: false },

  // ── AWQ Group — Governança & Jurídico ─────────────────────────────────────
  { href: "/awq/juridico",   label: "Jurídico",   bu: "awq", layer: "corporate-legal", status: "stub", dataSource: "pending — contratos, aditivos, vencimentos, procurações", inSidebar: true, inTabNav: false },
  { href: "/awq/societario", label: "Societário", bu: "awq", layer: "corporate-legal", status: "stub", dataSource: "pending — quadro societário, participações, cap table, vesting, SCPs", inSidebar: true, inTabNav: false },
  { href: "/awq/compliance", label: "Compliance", bu: "awq", layer: "corporate-legal", status: "stub", dataSource: "pending — políticas LGPD, confidencialidade, aceites, controles de acesso, obrigações regulatórias", inSidebar: true, inTabNav: false },

  // ── AWQ Group — Dados & Infra ─────────────────────────────────────────────
  { href: "/awq/ingest", label: "Ingestão",      bu: "awq", layer: "data-infra", status: "active", dataSource: "public/data/financial/ (documento-backed, server-side — fluxo canônico)", inSidebar: true, inTabNav: false },
  { href: "/awq/data",   label: "Base de Dados", bu: "awq", layer: "data-infra", status: "active", dataSource: "lib/financial-ingest-status.ts + lib/platform-registry.ts + financial-db.ts (gestão real da camada de storage)", inSidebar: true, inTabNav: false },

  // ── JACQES — Agência ─────────────────────────────────────────────────────
  { href: "/jacqes",                label: "Visão Geral",    bu: "jacqes", layer: "bu-overview",   status: "active", dataSource: "lib/data.ts",                                             inSidebar: true,  inTabNav: false },
  { href: "/jacqes/fpa",            label: "FP&A",           bu: "jacqes", layer: "bu-financial",  status: "active", dataSource: "lib/awq-group-data.ts (hub canônico — 11 seções)",        inSidebar: true,  inTabNav: false },
  { href: "/jacqes/reports",        label: "Relatórios",     bu: "jacqes", layer: "bu-operations", status: "active", dataSource: "lib/data.ts (mocked)",                                    inSidebar: true,  inTabNav: false },

  // ── JACQES CRM — 12 módulos ativos em Neon Postgres ──────────────────────
  // IMPORTANTE: todas estas rotas já existiam no sidebar (crmNav) e no código.
  // Ausência do registry era um bug estrutural de governança — corrigido aqui.
  { href: "/jacqes/crm",                label: "CRM Visão Geral",  bu: "jacqes", layer: "bu-operations", status: "active", dataSource: "lib/jacqes-crm-db.ts + lib/jacqes-crm-query.ts (Neon Postgres)",          inSidebar: true,  inTabNav: false },
  { href: "/jacqes/crm/pipeline",       label: "Pipeline CRM",     bu: "jacqes", layer: "bu-operations", status: "active", dataSource: "lib/jacqes-crm-db.ts (jacqes_crm_opportunities — Neon Postgres)",        inSidebar: true,  inTabNav: false },
  { href: "/jacqes/crm/leads",          label: "Leads",            bu: "jacqes", layer: "bu-operations", status: "active", dataSource: "lib/jacqes-crm-db.ts (jacqes_crm_leads — Neon Postgres)",                inSidebar: true,  inTabNav: false },
  { href: "/jacqes/crm/oportunidades",  label: "Oportunidades",    bu: "jacqes", layer: "bu-operations", status: "active", dataSource: "lib/jacqes-crm-db.ts (jacqes_crm_opportunities — Neon Postgres)",        inSidebar: true,  inTabNav: false },
  { href: "/jacqes/crm/propostas",      label: "Propostas CRM",    bu: "jacqes", layer: "bu-operations", status: "active", dataSource: "lib/jacqes-crm-db.ts (jacqes_crm_proposals — Neon Postgres)",            inSidebar: true,  inTabNav: false },
  { href: "/jacqes/crm/clientes",       label: "Clientes CRM",     bu: "jacqes", layer: "bu-operations", status: "active", dataSource: "lib/jacqes-crm-db.ts (jacqes_crm_clients — Neon Postgres)",              inSidebar: true,  inTabNav: false },
  { href: "/jacqes/crm/carteira",       label: "Carteira CRM",     bu: "jacqes", layer: "bu-operations", status: "active", dataSource: "lib/jacqes-crm-db.ts (jacqes_crm_clients — Neon Postgres)",              inSidebar: true,  inTabNav: false },
  { href: "/jacqes/crm/tarefas",        label: "Tarefas & SLA",    bu: "jacqes", layer: "bu-operations", status: "active", dataSource: "lib/jacqes-crm-db.ts (jacqes_crm_tasks — Neon Postgres)",                inSidebar: true,  inTabNav: false },
  { href: "/jacqes/crm/interacoes",     label: "Interações",       bu: "jacqes", layer: "bu-operations", status: "active", dataSource: "lib/jacqes-crm-db.ts (jacqes_crm_interactions — Neon Postgres)",         inSidebar: true,  inTabNav: false },
  { href: "/jacqes/crm/expansao",       label: "Expansão CRM",     bu: "jacqes", layer: "bu-operations", status: "active", dataSource: "lib/jacqes-crm-db.ts (jacqes_crm_expansion — Neon Postgres)",            inSidebar: true,  inTabNav: false },
  { href: "/jacqes/crm/health",         label: "Churn & Health",   bu: "jacqes", layer: "bu-operations", status: "active", dataSource: "lib/jacqes-crm-db.ts (jacqes_crm_health_snapshot — Neon Postgres)",      inSidebar: true,  inTabNav: false },
  { href: "/jacqes/crm/relatorios",     label: "Relatórios CRM",   bu: "jacqes", layer: "bu-operations", status: "active", dataSource: "lib/jacqes-crm-query.ts (queries agregadas — Neon Postgres)",            inSidebar: true,  inTabNav: false },

  // Stubs — sem conteúdo real; removidos do sidebar até implementação
  { href: "/jacqes/desempenho",     label: "Desempenho",     bu: "jacqes", layer: "bu-operations", status: "stub",   dataSource: "none — placeholder",                                      inSidebar: false, inTabNav: false },
  { href: "/jacqes/carteira",       label: "Carteira",       bu: "jacqes", layer: "bu-operations", status: "stub",   dataSource: "none — placeholder",                                      inSidebar: false, inTabNav: false },
  { href: "/jacqes/analise",        label: "Análise",        bu: "jacqes", layer: "bu-operations", status: "stub",   dataSource: "none — placeholder",                                      inSidebar: false, inTabNav: false },
  { href: "/jacqes/csops",          label: "CS Ops",         bu: "jacqes", layer: "bu-operations", status: "stub",   dataSource: "none — placeholder",                                      inSidebar: false, inTabNav: false },
  { href: "/jacqes/categorias",     label: "Categorias",     bu: "jacqes", layer: "bu-operations", status: "stub",   dataSource: "none — placeholder",                                      inSidebar: false, inTabNav: false },
  { href: "/jacqes/carreira",       label: "Modo Carreira",  bu: "jacqes", layer: "bu-operations", status: "stub",   dataSource: "none — placeholder",                                      inSidebar: true,  inTabNav: false },
  // Redirects from JACQES sub-pages
  { href: "/jacqes/sga",            label: "SGA",            bu: "jacqes", layer: "bu-financial",  status: "redirect", dataSource: "→ /jacqes/fpa (hub canônico)",           inSidebar: false, inTabNav: false, canonical: "/jacqes/fpa" },
  { href: "/jacqes/financial",      label: "Financial",      bu: "jacqes", layer: "bu-financial",  status: "redirect", dataSource: "→ /jacqes/fpa (hub canônico)",           inSidebar: false, inTabNav: false, canonical: "/jacqes/fpa" },
  { href: "/jacqes/revenue",        label: "Revenue",        bu: "jacqes", layer: "bu-financial",  status: "redirect", dataSource: "→ /jacqes/fpa (Seção 1 · Receita)",      inSidebar: false, inTabNav: false, canonical: "/jacqes/fpa" },
  { href: "/jacqes/customers",      label: "Customers",      bu: "jacqes", layer: "bu-operations", status: "redirect", dataSource: "→ /jacqes/fpa (Seções 10–11)",            inSidebar: false, inTabNav: false, canonical: "/jacqes/fpa" },
  { href: "/jacqes/unit-economics", label: "Unit Economics", bu: "jacqes", layer: "bu-operations", status: "redirect", dataSource: "→ /jacqes/fpa (Seção 10 · Unit Econ)",   inSidebar: false, inTabNav: false, canonical: "/jacqes/fpa" },
  { href: "/jacqes/budget",         label: "Budget",         bu: "jacqes", layer: "bu-financial",  status: "redirect", dataSource: "→ /jacqes/fpa (Seção 7 · Resultado)",    inSidebar: false, inTabNav: false, canonical: "/jacqes/fpa" },

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
  { href: "/caza-vision",                label: "Visão Geral",    bu: "caza", layer: "bu-overview",   status: "active", dataSource: "lib/caza-data.ts",                                                         inSidebar: true,  inTabNav: false },
  { href: "/caza-vision/imoveis",        label: "Projetos",       bu: "caza", layer: "bu-operations", status: "active", dataSource: "lib/caza-data.ts",                                                         inSidebar: true,  inTabNav: false },
  { href: "/caza-vision/clientes",       label: "Clientes",       bu: "caza", layer: "bu-operations", status: "active", dataSource: "lib/caza-data.ts + Notion",                                                inSidebar: true,  inTabNav: false },
  { href: "/caza-vision/financial",      label: "Financial",      bu: "caza", layer: "bu-financial",  status: "active", dataSource: "Notion API (receita projetos, accrual) — aviso bancário na página",        inSidebar: true,  inTabNav: false },
  { href: "/caza-vision/unit-economics", label: "Unit Economics", bu: "caza", layer: "bu-operations", status: "active", dataSource: "lib/caza-data.ts",                                                         inSidebar: true,  inTabNav: false },
  { href: "/caza-vision/import",         label: "Importar",       bu: "caza", layer: "bu-operations", status: "active", dataSource: "lib/notion-import.ts + Notion API — importação de projetos/clientes",      inSidebar: true,  inTabNav: false },
  // Not yet implemented — add to sidebar only after page is created
  // { href: "/caza-vision/pipeline",    label: "Pipeline",        status: "stub", inSidebar: false }
  // { href: "/caza-vision/relatorios",  label: "Relatórios",      status: "stub", inSidebar: false }

  // ── AWQ Venture — Investimentos ───────────────────────────────────────────
  { href: "/awq-venture",                   label: "Visão Geral",   bu: "venture", layer: "bu-overview",   status: "active", dataSource: "lib/awq-group-data.ts",                                                             inSidebar: true,  inTabNav: true  },
  { href: "/awq-venture/comercial",         label: "Comercial",     bu: "venture", layer: "bu-operations", status: "active", dataSource: "lib/venture-commercial-data.ts + lib/venture-company-registry.ts",                  inSidebar: true,  inTabNav: true  },
  { href: "/awq-venture/portfolio",         label: "Portfólio",     bu: "venture", layer: "bu-operations", status: "active", dataSource: "lib/awq-group-data.ts",                                                             inSidebar: true,  inTabNav: true  },
  { href: "/awq-venture/pipeline",          label: "Pipeline",      bu: "venture", layer: "bu-operations", status: "active", dataSource: "lib/awq-group-data.ts",                                                             inSidebar: true,  inTabNav: true  },
  { href: "/awq-venture/deals",                    label: "Deals",              bu: "venture", layer: "bu-operations", status: "active", dataSource: "lib/deal-data.ts",                                                                              inSidebar: true,  inTabNav: true  },
  { href: "/awq-venture/deals/novo",               label: "Novo Deal",          bu: "venture", layer: "bu-operations", status: "active", dataSource: "lib/deal-data.ts (criação de nova entrada no dealWorkspaces)",                     inSidebar: false, inTabNav: false },
  { href: "/awq-venture/deals/[id]",               label: "Deal Workspace",     bu: "venture", layer: "bu-operations", status: "active", dataSource: "lib/deal-data.ts getDealById()",                                                   inSidebar: false, inTabNav: false },
  { href: "/awq-venture/deals/[id]/negotiation",   label: "Deal Negociação",    bu: "venture", layer: "bu-operations", status: "active", dataSource: "lib/deal-data.ts getDealById() — aba de negociação do workspace",               inSidebar: false, inTabNav: false },
  { href: "/awq-venture/deals/[id]/history",       label: "Deal Histórico",     bu: "venture", layer: "bu-operations", status: "active", dataSource: "lib/deal-data.ts getDealById() — histórico de alterações do deal",              inSidebar: false, inTabNav: false },
  { href: "/awq-venture/deals/[id]/pdf",           label: "Deal PDF",           bu: "venture", layer: "bu-operations", status: "active", dataSource: "lib/deal-data.ts getDealById() — geração de PDF da proposta",                  inSidebar: false, inTabNav: false },
  { href: "/awq-venture/deals/[id]/share",         label: "Deal Share",         bu: "venture", layer: "bu-operations", status: "active", dataSource: "lib/deal-data.ts getDealById() — visão cliente, sem dados internos AWQ",       inSidebar: false, inTabNav: false },
  { href: "/awq-venture/financial",         label: "Financial",     bu: "venture", layer: "bu-financial",  status: "active", dataSource: "lib/awq-group-data.ts",                                                             inSidebar: true,  inTabNav: true  },
  { href: "/awq-venture/yoy-2025",          label: "YoY 2025",      bu: "venture", layer: "bu-operations", status: "active", dataSource: "hardcoded — registrar em snapshot-registry",                                        inSidebar: true,  inTabNav: true  },
  { href: "/awq-venture/sales",             label: "Sales",         bu: "venture", layer: "bu-operations", status: "active", dataSource: "public/data/venture-sales.json + lib/notion-fetch.ts fetchVentureSales()",          inSidebar: true,  inTabNav: true  },
  { href: "/awq-venture/awq",              label: "AWQ",            bu: "venture", layer: "bu-overview",   status: "stub",   dataSource: "none — placeholder",                                                                inSidebar: false, inTabNav: true  },
  { href: "/awq-venture/grupo-energdy",    label: "Grupo Energdy",  bu: "venture", layer: "bu-operations", status: "stub",   dataSource: "none — placeholder",                                                                inSidebar: false, inTabNav: true  },
  { href: "/awq-venture/ri",               label: "RI",             bu: "venture", layer: "bu-operations", status: "stub",   dataSource: "none — placeholder",                                                                inSidebar: false, inTabNav: true  },
  { href: "/awq-venture/benchmark",        label: "Benchmark",      bu: "venture", layer: "bu-operations", status: "stub",   dataSource: "none — placeholder",                                                                inSidebar: false, inTabNav: true  },

  // ── Advisor — Consultoria (Pré-Receita) ───────────────────────────────────
  // IMPORTANT: Advisor é economicType="pre_revenue". Páginas mostram estado vazio
  // com dados zerados próprios — NÃO consomem lib/caza-data.ts.
  { href: "/advisor",           label: "Visão Geral", bu: "advisor", layer: "bu-overview",   status: "active", dataSource: "dados próprios — pre_revenue, sem extrato ou contrato ativo", inSidebar: true, inTabNav: false },
  { href: "/advisor/financial", label: "Financial",   bu: "advisor", layer: "bu-financial",  status: "active", dataSource: "dados próprios — pre_revenue, estado vazio explícito",         inSidebar: true, inTabNav: false },
  { href: "/advisor/customers", label: "Customers",   bu: "advisor", layer: "bu-operations", status: "active", dataSource: "dados próprios — pre_revenue, carteira vazia",                 inSidebar: true, inTabNav: false },
  // Not yet implemented — add to sidebar only after page is created
  // { href: "/advisor/mandatos",   label: "Mandatos",    status: "stub", inSidebar: false }
  // { href: "/advisor/pipeline",   label: "Pipeline",    status: "stub", inSidebar: false }

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

/** Routes by ERP layer — useful for governance dashboards */
export function getRoutesByLayer(layer: RouteLayer): PlatformRoute[] {
  return PLATFORM_ROUTES.filter((r) => r.layer === layer && r.status !== "redirect");
}
