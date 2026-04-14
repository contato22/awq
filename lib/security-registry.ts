// ─── AWQ Security — Registry de Rotas e APIs Sensíveis (v2) ──────────────────
//
// Catálogo canônico de rotas e APIs que manipulam dados sensíveis.
//
// guardStatus (API):
//   guarded    = guard() ativo — bloqueia sem permissão em api_guarded
//   registered = apenas registrado, sem guard interno ainda
//
// routeGuardStatus (Rota UI — v3 prep):
//   registered       = registrada no catálogo, sem enforcement
//   ready_for_guard  = pronta para enforcement (testada com roles)
//   not_ready        = requer teste adicional antes de enforcement
//
// SEPARAÇÃO: /awq/compliance → Governança & Jurídico | /awq/security → Dados & Infra

import type { SensitiveRoute, SensitiveApi } from "./security-types";

// ── Rotas sensíveis da plataforma (v3 prep: routeGuardStatus) ─────────────────
export const SENSITIVE_ROUTES: SensitiveRoute[] = [
  { path: "/awq/financial",     layer: "financeiro",  sensitivity: "high",   requiredAction: "view",   description: "DRE gerencial consolidado (pipeline financeiro real)",     routeGuardStatus: "ready_for_guard" },
  { path: "/awq/cashflow",      layer: "financeiro",  sensitivity: "high",   requiredAction: "view",   description: "Fluxo de caixa operacional (pipeline financeiro real)",   routeGuardStatus: "ready_for_guard" },
  { path: "/awq/bank",          layer: "financeiro",  sensitivity: "high",   requiredAction: "view",   description: "Contas bancárias e saldos (localStorage)",               routeGuardStatus: "ready_for_guard" },
  { path: "/awq/investments",   layer: "financeiro",  sensitivity: "high",   requiredAction: "view",   description: "Aplicações financeiras e resgates",                      routeGuardStatus: "ready_for_guard" },
  { path: "/awq/management",    layer: "financeiro",  sensitivity: "high",   requiredAction: "view",   description: "Controladoria: qualidade, diagnósticos, fechamento",     routeGuardStatus: "ready_for_guard" },
  { path: "/awq/ingest",        layer: "dados_infra", sensitivity: "high",   requiredAction: "import", description: "Importação de extratos bancários PDF",                   routeGuardStatus: "ready_for_guard" },
  { path: "/awq/data",          layer: "dados_infra", sensitivity: "medium", requiredAction: "view",   description: "Base de dados canônica: sync, documentos, storage",      routeGuardStatus: "ready_for_guard" },
  { path: "/awq/security",      layer: "security",    sensitivity: "high",   requiredAction: "view",   description: "Painel de segurança: RBAC, APIs, audit log",             routeGuardStatus: "ready_for_guard" },
  { path: "/awq/juridico",      layer: "juridico",    sensitivity: "high",   requiredAction: "view",   description: "Jurídico operacional (stub)",                            routeGuardStatus: "not_ready"       },
  { path: "/awq/societario",    layer: "juridico",    sensitivity: "high",   requiredAction: "view",   description: "Societário: quadro de sócios, cap table (stub)",         routeGuardStatus: "not_ready"       },
  { path: "/awq/compliance",    layer: "juridico",    sensitivity: "medium", requiredAction: "view",   description: "Compliance: LGPD, aceites, obrigações (stub)",           routeGuardStatus: "not_ready"       },
  { path: "/awq/contabilidade", layer: "financeiro",  sensitivity: "medium", requiredAction: "view",   description: "Contabilidade formal (stub)",                            routeGuardStatus: "not_ready"       },
  { path: "/awq/fiscal",        layer: "financeiro",  sensitivity: "medium", requiredAction: "view",   description: "Fiscal e obrigações tributárias (stub)",                  routeGuardStatus: "not_ready"       },
];

// ── APIs sensíveis ────────────────────────────────────────────────────────────
export const SENSITIVE_APIS: SensitiveApi[] = [
  // ── Dados & Infra ─────────────
  { pattern: "/api/ingest/upload",       layer: "dados_infra", resource: "Extrato bancário PDF",                   requiredAction: "import", description: "Upload de extrato — guard() ativo",                            authEnforcement: "internal-token-check", guardStatus: "guarded" },
  { pattern: "/api/ingest/process",      layer: "dados_infra", resource: "Pipeline de processamento de extrato",   requiredAction: "import", description: "Processamento/parsing de extrato — guard() ativo",              authEnforcement: "internal-token-check", guardStatus: "guarded" },
  { pattern: "/api/ingest/documents",    layer: "dados_infra", resource: "Documentos financeiros ingeridos",       requiredAction: "view",   description: "Listagem de documentos (Pages Router) — guard() ativo",        authEnforcement: "internal-token-check", guardStatus: "guarded" },
  { pattern: "/api/ingest/transactions", layer: "dados_infra", resource: "Transações bancárias classificadas",     requiredAction: "view",   description: "Listagem de transações (Pages Router) — guard() ativo",        authEnforcement: "internal-token-check", guardStatus: "guarded" },

  // ── Caza Vision ─────────────
  { pattern: "/api/caza/import",         layer: "caza_vision", resource: "Importação Notion → Caza Vision DB",     requiredAction: "import", description: "Importação Notion para Neon — guard() ativo",                  authEnforcement: "internal-token-check", guardStatus: "guarded" },
  { pattern: "/api/caza/projects",       layer: "caza_vision", resource: "Projetos Caza Vision",                   requiredAction: "view",   description: "CRUD projetos — guard() ativo (view/create/update/delete)",     authEnforcement: "internal-token-check", guardStatus: "guarded" },
  { pattern: "/api/caza/clients",        layer: "caza_vision", resource: "Clientes Caza Vision",                   requiredAction: "view",   description: "CRUD clientes — guard() ativo (view/create/update/delete)",     authEnforcement: "internal-token-check", guardStatus: "guarded" },
  { pattern: "/api/caza/stats",          layer: "caza_vision", resource: "KPIs Caza Vision",                       requiredAction: "view",   description: "KPIs e métricas consolidadas — guard() ativo",                 authEnforcement: "internal-token-check", guardStatus: "guarded" },
  { pattern: "/api/caza/financial",      layer: "caza_vision", resource: "Financeiro Caza Vision",                 requiredAction: "view",   description: "Agregação financeira mensal — guard() ativo",                  authEnforcement: "internal-token-check", guardStatus: "guarded" },

  // ── JACQES CRM ─────────────
  { pattern: "/api/jacqes/crm/*",        layer: "jacqes",      resource: "CRM JACQES — Neon Postgres",             requiredAction: "view",   description: "Leads, clientes, oportunidades, tarefas — guard() ativo",      authEnforcement: "internal-token-check", guardStatus: "guarded" },

  // ── IA & Agentes ─────────────
  { pattern: "/api/agents/*",            layer: "ai",          resource: "Agentes IA (agentic loop + tools)",       requiredAction: "view",   description: "Execução de agentes — guard() ativo via JWT",                  authEnforcement: "internal-token-check", guardStatus: "guarded" },
  { pattern: "/api/chat",                layer: "ai",          resource: "OpenClaw — Chat IA",                      requiredAction: "view",   description: "Chat IA com contexto financeiro — guard() ativo",              authEnforcement: "internal-token-check", guardStatus: "guarded" },

  // ── Sistema ─────────────
  { pattern: "/api/supervisor/*",        layer: "system",      resource: "BU Supervisor autônomo",                  requiredAction: "approve", description: "Supervisor (owner/admin only) — guard() ativo",               authEnforcement: "internal-token-check", guardStatus: "guarded" },
  { pattern: "/api/security/audit",      layer: "security",    resource: "Audit log de segurança",                  requiredAction: "view",   description: "Consulta audit log — guard() ativo (owner/admin only)",        authEnforcement: "internal-token-check", guardStatus: "guarded" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getSensitiveRoute(path: string): SensitiveRoute | undefined {
  return SENSITIVE_ROUTES.find((r) => path === r.path || path.startsWith(r.path + "/"));
}

export function getSensitiveApi(path: string): SensitiveApi | undefined {
  return SENSITIVE_APIS.find((api) => {
    const pattern = api.pattern;
    if (pattern.endsWith("/*")) {
      const base = pattern.slice(0, -2);
      return path === base || path.startsWith(base + "/");
    }
    return path === pattern;
  });
}
