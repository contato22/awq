// ─── AWQ Security v1 — Types ──────────────────────────────────────────────────
//
// ESCOPO: Tipos canônicos da camada de segurança da AWQ.
//
// SEPARAÇÃO OBRIGATÓRIA:
//   Security  → protege acesso, dado, API e gera logs de auditoria
//   Compliance → prova LGPD, aceites, políticas internas (lib/compliance — futuro)
//
// ROLES: reaproveitados de lib/auth-users.ts — não renomear, não criar fictícios
//   "owner"   → acesso irrestrito
//   "admin"   → gestão plena exceto gerenciar security
//   "analyst" → leitura/exportação de dados financeiros e BUs
//   "cs-ops"  → operação de CRM JACQES

export type SecurityRole = "owner" | "admin" | "analyst" | "cs-ops";

// Ações possíveis sobre um recurso
export type SecurityAction =
  | "view"            // leitura/visualização
  | "create"          // criação de registros
  | "update"          // atualização de registros
  | "delete"          // exclusão de registros
  | "export"          // exportação de dados
  | "import"          // ingestão/importação
  | "approve"         // aprovação de fluxos
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
  | "system"       // Sistema (auth, settings)
  | "ai";          // IA & Agentes

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
  /** Nome do role ou "unknown" */
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
  /** Path canônico da rota */
  path: string;
  /** Camada de segurança à qual pertence */
  layer: SecurityLayer;
  /** Nível de sensibilidade */
  sensitivity: "high" | "medium" | "low";
  /** Ação mínima exigida para acesso */
  requiredAction: SecurityAction;
  /** Descrição do que a rota expõe */
  description: string;
}

// API sensível registrada no security registry
export interface SensitiveApi {
  /** Padrão da rota (pode conter * para wildcard) */
  pattern: string;
  /** Camada de segurança */
  layer: SecurityLayer;
  /** Recurso que a API manipula */
  resource: string;
  /** Ação mínima exigida */
  requiredAction: SecurityAction;
  /** Descrição do que a API faz e como está protegida */
  description: string;
  /** Como a auth é aplicada hoje */
  authEnforcement: "middleware-jwt" | "internal-token-check" | "middleware-only" | "none";
}
