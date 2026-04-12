// ─── AWQ Security — Registry de Rotas e APIs Sensíveis (v1 → v2) ─────────────
//
// PROPÓSITO: Catálogo canônico de todas as rotas e APIs que manipulam dados
// sensíveis. Todo novo endpoint sensível DEVE ser registrado aqui.
//
// guardStatus por API:
//   guarded     = guard() aplicado; bloqueia sem permissão em api_guarded
//   audit_only  = guard() aplicado mas enforcement desligado para esta API
//   registered  = registrado mas sem guard aplicado ainda
//
// SEPARAÇÃO:
//   /awq/compliance → Governança & Jurídico (LGPD, aceites, políticas)
//   /awq/security   → Dados & Infra (acesso, RBAC, APIs, audit log) ← ESTE MÓDULO

import type { SensitiveRoute, SensitiveApi } from "./security-types";

// ── Rotas sensíveis da plataforma ─────────────────────────────────────────────
export const SENSITIVE_ROUTES: SensitiveRoute[] = [
  {
    path:           "/awq/financial",
    layer:          "financeiro",
    sensitivity:    "high",
    requiredAction: "view",
    description:    "DRE gerencial consolidado da holding (pipeline financeiro real)",
  },
  {
    path:           "/awq/cashflow",
    layer:          "financeiro",
    sensitivity:    "high",
    requiredAction: "view",
    description:    "Fluxo de caixa operacional (pipeline financeiro real)",
  },
  {
    path:           "/awq/bank",
    layer:          "financeiro",
    sensitivity:    "high",
    requiredAction: "view",
    description:    "Contas bancárias e saldos (localStorage — dívida técnica pendente)",
  },
  {
    path:           "/awq/investments",
    layer:          "financeiro",
    sensitivity:    "high",
    requiredAction: "view",
    description:    "Aplicações financeiras e resgates (investment-query canônico)",
  },
  {
    path:           "/awq/management",
    layer:          "financeiro",
    sensitivity:    "high",
    requiredAction: "view",
    description:    "Controladoria: qualidade de dados, diagnósticos e fechamento gerencial",
  },
  {
    path:           "/awq/ingest",
    layer:          "dados_infra",
    sensitivity:    "high",
    requiredAction: "import",
    description:    "Importação de extratos bancários PDF (pipeline canônico de ingestão)",
  },
  {
    path:           "/awq/data",
    layer:          "dados_infra",
    sensitivity:    "medium",
    requiredAction: "view",
    description:    "Base de dados canônica: status de sync, documentos ingeridos, storage",
  },
  {
    path:           "/awq/security",
    layer:          "security",
    sensitivity:    "high",
    requiredAction: "view",
    description:    "Painel de segurança: matriz RBAC, rotas/APIs protegidas, audit log",
  },
  {
    path:           "/awq/juridico",
    layer:          "juridico",
    sensitivity:    "high",
    requiredAction: "view",
    description:    "Jurídico operacional: contratos, aditivos, vencimentos (stub)",
  },
  {
    path:           "/awq/societario",
    layer:          "juridico",
    sensitivity:    "high",
    requiredAction: "view",
    description:    "Societário: quadro de sócios, participações, cap table (stub)",
  },
  {
    path:           "/awq/compliance",
    layer:          "juridico",
    sensitivity:    "medium",
    requiredAction: "view",
    description:    "Compliance: LGPD, confidencialidade, aceites, obrigações regulatórias (stub)",
  },
  {
    path:           "/awq/contabilidade",
    layer:          "financeiro",
    sensitivity:    "medium",
    requiredAction: "view",
    description:    "Contabilidade formal: plano de contas, balancete, DRE contábil (stub)",
  },
  {
    path:           "/awq/fiscal",
    layer:          "financeiro",
    sensitivity:    "medium",
    requiredAction: "view",
    description:    "Fiscal e obrigações tributárias: NFs, tributos, calendário (stub)",
  },
];

// ── APIs sensíveis da plataforma ──────────────────────────────────────────────
//
// guardStatus:
//   guarded     = guard() ativo → bloqueia sem permissão no modo api_guarded
//   audit_only  = guard() aplicado com enforcement desligado para esta rota
//   registered  = apenas registrado, sem guard implementado ainda
export const SENSITIVE_APIS: SensitiveApi[] = [
  {
    pattern:         "/api/ingest/upload",
    layer:           "dados_infra",
    resource:        "Extrato bancário PDF",
    requiredAction:  "import",
    description:     "Upload de extrato bancário — getToken() interno + guard() ativo",
    authEnforcement: "internal-token-check",
    guardStatus:     "guarded",
  },
  {
    pattern:         "/api/ingest/process",
    layer:           "dados_infra",
    resource:        "Pipeline de processamento de extrato",
    requiredAction:  "import",
    description:     "Processamento e parsing de extrato já ingerido — middleware-only, sem guard interno",
    authEnforcement: "middleware-only",
    guardStatus:     "registered",
  },
  {
    pattern:         "/api/caza/import",
    layer:           "caza_vision",
    resource:        "Importação Notion → Caza Vision DB",
    requiredAction:  "import",
    description:     "Importação de projetos e clientes do Notion para Neon — guard() ativo",
    authEnforcement: "internal-token-check",
    guardStatus:     "guarded",
  },
  {
    pattern:         "/api/caza/*",
    layer:           "caza_vision",
    resource:        "Dados BU Caza Vision (projetos, clientes, financeiro)",
    requiredAction:  "view",
    description:     "CRUD de projetos e clientes da Caza Vision — middleware-only, sem guard interno",
    authEnforcement: "middleware-only",
    guardStatus:     "registered",
  },
  {
    pattern:         "/api/jacqes/crm/*",
    layer:           "jacqes",
    resource:        "CRM JACQES — Neon Postgres",
    requiredAction:  "view",
    description:     "Leitura e escrita no CRM JACQES (leads, clientes, oportunidades, tarefas) — guard() ativo",
    authEnforcement: "internal-token-check",
    guardStatus:     "guarded",
  },
  {
    pattern:         "/api/agents/*",
    layer:           "ai",
    resource:        "Agentes IA (agentic loop com ferramentas Notion e BU)",
    requiredAction:  "view",
    description:     "Execução de agentes com acesso a ferramentas de leitura/escrita — guard() ativo via JWT",
    authEnforcement: "internal-token-check",
    guardStatus:     "guarded",
  },
  {
    pattern:         "/api/chat",
    layer:           "ai",
    resource:        "OpenClaw — LLM com contexto financeiro AWQ",
    requiredAction:  "view",
    description:     "Chat IA com contexto de dados financeiros — guard() ativo via JWT",
    authEnforcement: "internal-token-check",
    guardStatus:     "guarded",
  },
  {
    pattern:         "/api/supervisor/*",
    layer:           "system",
    resource:        "BU Supervisor — agente autônomo com escrita em Notion e arquivos",
    requiredAction:  "approve",
    description:     "Supervisor autônomo (owner/admin only) — guard() ativo; requer approve em system",
    authEnforcement: "internal-token-check",
    guardStatus:     "guarded",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Retorna a rota sensível que corresponde ao path (exact ou prefix) */
export function getSensitiveRoute(path: string): SensitiveRoute | undefined {
  return SENSITIVE_ROUTES.find(
    (r) => path === r.path || path.startsWith(r.path + "/")
  );
}

/** Retorna a API sensível que corresponde ao path (suporta wildcard *) */
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
