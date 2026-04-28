// ─── AWQ Platform — Architectural Layer Registry ──────────────────────────────
//
// This file documents the real state of each architectural layer in the platform.
// It is not aspirational documentation — it reflects what actually exists.
//
// LAYER STATUS
//   real        = implemented, integrated, verified working
//   partial     = partially implemented, some gaps
//   permissive  = implemented but policy intentionally weak (MVP phase)
//   nonexistent = layer name referenced but not built; zero code exists
//
// DISCIPLINE
//   Never mark a layer as "real" without a verifiable implementation.
//   Never call something integrated without a page/route that consumes it.
//   If a layer is nonexistent, do NOT create stub code to make it appear real.

// ── Layer 1: Store ────────────────────────────────────────────────────────────
//
// STATUS: real (lib-as-store pattern)
//
// The platform uses a direct-import data pattern — no global state library
// (no Zustand, Redux, Jotai). Each page imports its data directly from lib files.
//
// DATA STORES (single source of truth by domain):
//   lib/awq-group-data.ts  → AWQ Group holding layer (consolidated P&L, BU stats,
//                            risk signals, capital allocation, forecast)
//   lib/data.ts            → JACQES BU data (KPIs, revenue trend, customers,
//                            products, channels, alerts) — snapshot Q1 2026
//   lib/caza-data.ts       → Caza Vision BU data (projects, clients, financial)
//                            — snapshot Q1 2026
//   lib/notion-fetch.ts    → Dual-mode fetcher: Notion API (Vercel SSR) or
//                            static JSON from public/data/ (GitHub Pages)
//   lib/agents-config.ts   → Agent definitions (BU agents + their tool permissions)
//   lib/agent-tools.ts     → Tool implementations + WRITABLE_PATHS whitelist
//   lib/platform-registry.ts → Route registry (canonical route table)
//
// AUTH STORE:
//   next-auth SessionProvider (via AuthProvider.tsx) → JWT token in all pages
//   lib/auth-users.ts          → User credentials, roles, homeRoutes
//
// LOCAL UI STATE:
//   components/LayoutShell.tsx → useState(sidebarOpen) — sidebar toggle only
//   components/OpenClaw.tsx + OpenClawWidget.tsx + AgentsPanel.tsx
//                              → localStorage: API key persistence
//
// WRITABLE DATA PATHS (agents may update these):
//   lib/data.ts, lib/caza-data.ts, public/data/,
//   app/jacqes/financial/page.tsx, app/jacqes/customers/page.tsx,
//   app/caza-vision/page.tsx, app/awq/page.tsx
//
// CLASSIFICATION: store real. No global state library needed at current scale.
// DRIFT RISK: agents writing to lib/*.ts means the store can be autonomously
//             mutated — acceptable by design (agents are the write layer).

export const STORE_LAYER = {
  status: "real" as const,
  pattern: "lib-as-store (direct import, no global state library)",
  authStore: "next-auth SessionProvider + JWT",
  dataStores: {
    "awq-group": "lib/awq-group-data.ts",
    jacqes: "lib/data.ts",
    caza: "lib/caza-data.ts",
    "notion-fetch": "lib/notion-fetch.ts",
  },
  uiState: "localStorage (API key) + useState (sidebar toggle)",
  agentWritablePaths: [
    "lib/data.ts",
    "lib/caza-data.ts",
    "public/data/",
    "app/jacqes/financial/page.tsx",
    "app/jacqes/customers/page.tsx",
    "app/caza-vision/page.tsx",
    "app/awq/page.tsx",
  ],
} as const;

// ── Layer 2: Security ─────────────────────────────────────────────────────────
//
// STATUS: authentication = real | authorization = permissive by design (MVP)
//
// AUTHENTICATION (real):
//   - middleware.ts: withAuth() blocks all routes (except /login, /api/auth, _next)
//   - Unauthenticated requests → redirect to /login
//   - JWT strategy via next-auth, bcrypt password verification
//   - 4 users with distinct roles: owner, admin, analyst, cs-ops
//
// AUTHORIZATION (permissive by design):
//   - ROLE_ALLOWED_PREFIXES: all roles have ["/"] → all authenticated users
//     have access to all routes. This is intentional for MVP phase.
//   - canAccess() works correctly but the prefix "/" matches everything.
//   - homeRoute per user determines WHERE they land after login, not WHAT they can access.
//   - API routes skip RBAC entirely — each handler manages its own auth.
//
// FUTURE POLICY (not yet implemented):
//   analyst: ["/jacqes", "/"] — JACQES BU + AWQ overview
//   cs-ops:  ["/jacqes/csops", "/jacqes/customers", "/jacqes/carteira"]
//
// CLASSIFICATION: security layer = authentication real, authorization permissive.
// NOT a security bug — a conscious MVP decision. Must be explicitly updated
// when role isolation becomes a product requirement.

export const SECURITY_LAYER = {
  status: "permissive" as const,
  authentication: "real — next-auth JWT + bcrypt + middleware route guard",
  authorization: "permissive by design — all roles have full access (MVP)",
  users: [
    { email: "alex@awqgroup.com",  role: "owner",   homeRoute: "/" },
    { email: "s.chen@jacqes.com",  role: "admin",   homeRoute: "/" },
    { email: "p.nair@jacqes.com",  role: "analyst", homeRoute: "/jacqes" },
    { email: "danilo@jacqes.com",  role: "cs-ops",  homeRoute: "/jacqes/csops" },
  ],
  rbac: "declared but intentionally permissive — update ROLE_ALLOWED_PREFIXES to enforce",
} as const;

// ── Layer 3: FEM (Financial Engine/Model) ─────────────────────────────────────
//
// STATUS: nonexistent
//
// The acronym "FEM" or "Financial Engine/Model" does not exist anywhere in the codebase.
// Zero grep matches for: FEM, financial engine, financial model, forecast engine.
//
// WHAT EXISTS INSTEAD (financial data layer):
//   lib/awq-group-data.ts  → Hardcoded P&L, EBITDA, forecast, cash flow rows
//   app/awq/financial/     → Financial page that renders awq-group-data
//   app/awq/forecast/      → Forecast page (renders revenueForecasts from awq-group-data)
//   app/awq/cashflow/      → Cash flow page (renders cashFlowRows from awq-group-data)
//   app/jacqes/financial/  → JACQES financial page (hardcoded BRL data)
//   app/caza-vision/financial/ → Caza financial page (from lib/caza-data.ts)
//
// These are data-display pages, not a financial calculation engine.
// The data is pre-computed and hardcoded, not dynamically modelled.
//
// CLASSIFICATION: FEM = nonexistent. Financial display layer = real (hardcoded snapshots).
// If a FEM is needed, it would be built in lib/financial-engine.ts with calculation
// functions for margins, EBITDA, ROIC, etc. — and should receive data from Notion
// rather than hardcoded values.
//
// DO NOT reference FEM as if it exists. It does not.

export const FEM_LAYER = {
  status: "nonexistent" as const,
  definition: "No financial engine or model layer exists in the codebase",
  whatExists: "Static data in lib/awq-group-data.ts rendered by financial display pages",
  backlog: "lib/financial-engine.ts — calculation functions fed by Notion (not yet built)",
} as const;

// ── Layer 4: Agents ───────────────────────────────────────────────────────────
//
// STATUS: real (4 BU agents + OpenClaw + SupervisorWidget)
//
// WHAT EXISTS:
//   lib/agents-config.ts         → 4 agent definitions (jacqes, caza-vision, awq-venture, awq-master)
//   lib/agent-tools.ts           → Tool schemas + server-side executor (Notion + filesystem)
//   app/api/agents/route.ts      → SSE streaming agentic loop (GET: manifest, POST: run agent)
//   app/api/supervisor/route.ts  → Supervisor agent (briefing + tool-use chat)
//   app/api/chat/route.ts        → OpenClaw chat API (BU-context system prompts)
//   app/agents/page.tsx          → Agent listing UI (accessible from sidebar)
//   app/openclaw/page.tsx        → OpenClaw full-page chat (accessible from sidebar)
//   components/AgentsPanel.tsx   → Agent cards + run buttons → calls /api/agents
//   components/OpenClaw.tsx      → Full-page OpenClaw chat component
//   components/OpenClawWidget.tsx → Persistent floating chat widget (all pages via LayoutShell)
//   components/SupervisorWidget.tsx → Persistent briefing widget (all pages via LayoutShell)
//
// AGENT EXECUTION FLOW:
//   User → AgentsPanel → POST /api/agents { agentId }
//   → Agentic loop (max 8 iterations): Claude → tool_use → executeTool → tool_result → Claude
//   → SSE stream: { type: "tool_call" } | { type: "tool_result" } | { text: "..." } | [DONE]
//
// NAVIGATION INTEGRATION:
//   Both /agents and /openclaw are in aiNav (sidebar) + platform-registry (active status)
//
// AUTO-DESIGN AGENT:
//   STATUS: nonexistent
//   The term "auto design", "auto-design", "design agent" has zero matches in the codebase.
//   There is no agent that modifies UI/design-system components.
//   The WRITABLE_PATHS whitelist contains data files and BU pages — not design-system files.
//   If an auto-design agent is needed, it requires:
//     1. A new agent config in lib/agents-config.ts
//     2. design-system paths added to WRITABLE_PATHS in lib/agent-tools.ts
//     3. Scoped tools that can safely modify Tailwind classes / component structure
//
// NOTION INTEGRATION:
//   Defined in agent-tools.ts. Works when NOTION_API_KEY + database IDs are set.
//   In static mode (GitHub Pages), Notion tools are disabled — agents run without Notion access.
//
// CLASSIFICATION:
//   BU agents (4)        = real & integrated
//   OpenClaw chat        = real & integrated
//   SupervisorWidget     = real & integrated (persistent, always visible)
//   Auto-design agent    = nonexistent

export const AGENT_LAYER = {
  status: "real" as const,
  agents: ["jacqes", "caza-vision", "awq-venture", "awq-master"],
  chat: "OpenClaw (widget on all pages + full page at /openclaw)",
  supervisor: "SupervisorWidget (persistent on all pages, briefing + tool-use)",
  autoDesignAgent: "nonexistent — not built, not referenced anywhere",
  notionIntegration: "partial — requires NOTION_API_KEY env var (server/Vercel only)",
  writablePaths: [
    "lib/data.ts",
    "lib/caza-data.ts",
    "public/data/",
    "app/jacqes/financial/page.tsx",
    "app/jacqes/customers/page.tsx",
    "app/caza-vision/page.tsx",
    "app/awq/page.tsx",
  ],
} as const;
