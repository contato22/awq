// ─── AWQ Security — Types (v1 → v2) ──────────────────────────────────────────
//
// ESCOPO: Tipos canônicos da camada de segurança da AWQ.
//
// SEPARAÇÃO OBRIGATÓRIA:
//   Security  → protege acesso, dado, API e gera logs de auditoria
//   Compliance → prova LGPD, aceites, políticas internas (lib/compliance — futuro)
//
// ROLES CANÔNICOS (v2):
//   "owner"    → acesso irrestrito
//   "admin"    → gestão plena exceto manage_security; pode usar supervisor
//   "finance"  → financeiro — leitura, exportação e importação de dados financeiros
//   "operator" → operações/CRM — sem acesso financeiro ou security
//   "viewer"   → leitura mínima, sem acesso a financeiro ou infra
//
// ROLES LEGADOS (aliases — mantidos para não quebrar JWTs ativos):
//   "analyst"  → normalizado para "finance" em runtime (Priya Nair)
//   "cs-ops"   → normalizado para "operator" em runtime (Danilo)

export type SecurityRole =
  | "owner"     // acesso irrestrito
  | "admin"     // gestão plena exceto manage_security
  | "finance"   // analista financeiro — leitura/export/import financeiro
  | "operator"  // operações/CRM — sem acesso financeiro ou security
  | "viewer"    // leitura limitada, sem financeiro ou infra
  | "analyst"   // LEGADO — alias de "finance"
  | "cs-ops";   // LEGADO — alias de "operator"

// Modo de enforcement do guard (substitui ENFORCEMENT_ACTIVE boolean)
//   audit_only  → loga tudo, nunca bloqueia
//   api_guarded → bloqueia em APIs sensíveis; UI permanece permissiva (MODO ATUAL)
//   full        → bloqueia API e UI (futuro v3)
export type EnforcementMode = "audit_only" | "api_guarded" | "full";

// Ações possíveis sobre um recurso
export type SecurityAction =
  | "view"            // leitura/visualização
  | "create"          // criação de registros
  | "update"          // atualização de registros
  | "delete"          // exclusão de registros
  | "export"          // exportação de dados
  | "import"          // ingestão/importação
  | "approve"         // aprovação de fluxos / uso de ferramentas autônomas
  | "manage_security"; // configurar security layer

// Camadas arquiteturais da plataforma para controle de acesso
export type SecurityLayer =
  | "holding"      // AWQ Group / Control Tower
  | "jacqes"       // BU JACQES — agência
  | "caza_vision"  // BU Caza Vision — produtora
  | "awq_venture"  // BU AWQ Venture — deals/portfólio
  | "advisor"      // BU Advisor — consultoria
  | "financeiro"   // Financeiro Corporativo (FP&A, Tesouraria, Controladoria)
  | "juridico"     // Governança & Jurídico (contratos, societário, compliance)
  | "dados_infra"  // Dados & Infra (ingestão, base, qualidade)
  | "security"     // Segurança de Dados (esta camada)
  | "system"       // Sistema (auth, settings, supervisor autônomo)
  | "ai"           // IA & Agentes (chat, agents, supervisor)
  | "ar_module";   // AR — Clientes & Contas a Receber (owner-only)

// Resultado de uma verificação de acesso ou evento de auditoria
export type AuditResult = "allowed" | "blocked";

// Evento de auditoria — NUNCA contém senha, token, secret ou payload sensível
export interface AuditEvent {
  /** UUID do evento */
  id: string;
  /** ISO 8601 — timestamp do evento */
  timestamp: string;
  /** Email do usuário ou "anonymous" — JAMAIS senha, token ou secret */
  user_id: string;
  /** Nome do role raw (antes de normalização) ou "unknown" */
  role: string;
  /** Rota ou path da API acessada */
  path: string;
  /** Ação tentada */
  action: SecurityAction;
  /** Descrição legível do recurso */
  resource: string;
  /** Se o acesso foi permitido ou bloqueado */
  result: AuditResult;
  /** Motivo do resultado — legível, sem dados sensíveis */
  reason: string;
}

// Rota sensível registrada no security registry
export interface SensitiveRoute {
  path: string;
  layer: SecurityLayer;
  sensitivity: "high" | "medium" | "low";
  requiredAction: SecurityAction;
  description: string;
  /** v3 prep: prontidão para enforcement em UI */
  routeGuardStatus?: "registered" | "ready_for_guard" | "guarded" | "not_ready";
}

// API sensível registrada no security registry
export interface SensitiveApi {
  pattern: string;
  layer: SecurityLayer;
  resource: string;
  requiredAction: SecurityAction;
  description: string;
  authEnforcement: "middleware-jwt" | "internal-token-check" | "middleware-only" | "none";
  /** Estado do guard nesta API */
  guardStatus: "guarded" | "audit_only" | "registered";
}
