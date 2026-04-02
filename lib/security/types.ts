// ─── AWQ Cyber Security Core — Type Definitions ─────────────────────────────

// ── Trust & Confidence ───────────────────────────────────────────────────────

/** How confident we are in a finding — based on what the repository allows us to verify */
export type TrustLevel =
  | "confirmed"       // directly verifiable in the repository
  | "probable"        // strong evidence but not fully provable
  | "ambiguous"       // partial evidence, needs investigation
  | "not_verifiable"; // cannot be determined from static analysis alone

/** Severity of a security finding */
export type Severity = "critical" | "high" | "medium" | "low" | "info";

/** Current status of a risk item */
export type RiskStatus =
  | "open"           // identified, not yet addressed
  | "in_progress"    // being worked on
  | "mitigated"      // partially addressed
  | "resolved"       // fully addressed
  | "accepted"       // risk accepted by owner
  | "not_applicable";

/** Monitoring readiness — honest about what is real vs planned */
export type MonitoringState =
  | "active"         // currently monitored in real time
  | "configured"     // set up but not real-time
  | "planned"        // architecture exists, not yet implemented
  | "not_available"; // no monitoring capability yet

// ── Data Sources ─────────────────────────────────────────────────────────────

export type DataSourceType =
  | "static_file"     // hardcoded data in lib/*.ts
  | "notion_api"      // Notion database integration
  | "internal_api"    // Next.js API routes
  | "external_api"    // third-party APIs
  | "mock"            // mock/placeholder data
  | "env_variable"    // environment-sourced config
  | "localStorage"    // client-side storage
  | "session_jwt";    // NextAuth JWT session

export interface DataSourceAudit {
  id: string;
  name: string;
  type: DataSourceType;
  bu: string;                   // which BU this belongs to, or "AWQ" for platform-level
  module: string;               // which feature/page uses this
  filePath: string;             // where this source is defined/consumed
  hasExternalDependency: boolean;
  requiresSecret: boolean;      // needs API key or token
  secretExposed: boolean;       // is the secret at risk of client-side exposure?
  hasFallback: boolean;         // does it have a fallback if source fails?
  fallbackInsecure: boolean;    // is the fallback itself a security risk?
  hasMockData: boolean;         // is mock data present?
  mockInProduction: boolean;    // is mock data potentially served in production?
  trustLevel: TrustLevel;
  riskNotes: string;
}

// ── Credentials & Secrets ────────────────────────────────────────────────────

export type SecretType =
  | "api_key"
  | "database_id"
  | "auth_secret"
  | "password_hash"
  | "jwt_token"
  | "oauth_token";

export type SecretExposureRisk = "none" | "server_only" | "client_risk" | "hardcoded" | "not_verifiable";

export interface SecretAudit {
  id: string;
  name: string;
  type: SecretType;
  envVariable: string;          // expected env var name
  usedInFiles: string[];        // files that reference it
  serverOnly: boolean;          // only accessed server-side?
  exposureRisk: SecretExposureRisk;
  rotationPolicy: MonitoringState;
  trustLevel: TrustLevel;
  notes: string;
}

// ── Access & Authentication ──────────────────────────────────────────────────

export interface AccessAudit {
  id: string;
  area: string;
  description: string;
  hasAuthentication: boolean;
  hasAuthorization: boolean;    // role-based or permission check
  rbacEnforced: boolean;        // is RBAC actually enforced (not just defined)?
  buIsolation: boolean;         // is data isolated between BUs?
  trustLevel: TrustLevel;
  severity: Severity;
  notes: string;
}

// ── Risk Register ────────────────────────────────────────────────────────────

export type RiskCategory =
  | "credential_exposure"
  | "access_control"
  | "data_exposure"
  | "dependency_risk"
  | "configuration"
  | "bu_isolation"
  | "hardcoded_data"
  | "missing_auth"
  | "insecure_fallback"
  | "governance";

export interface SecurityRisk {
  id: string;
  title: string;
  description: string;
  category: RiskCategory;
  severity: Severity;
  status: RiskStatus;
  bu: string;                   // affected BU or "AWQ" for platform
  module: string;               // affected module/feature
  evidence: string;             // what we found / file path
  trustLevel: TrustLevel;
  recommendation: string;
  impact: string;
  owner: string;                // suggested owner
  createdAt: string;            // ISO date
}

// ── Security Posture ─────────────────────────────────────────────────────────

export interface PostureScore {
  overall: number;              // 0-100
  authentication: number;
  authorization: number;
  secretManagement: number;
  dataProtection: number;
  buIsolation: number;
  dependencyHealth: number;
  configurationHygiene: number;
  methodology: string;          // how we calculated this
  lastAssessed: string;         // ISO date
  trustLevel: TrustLevel;
}

// ── KPI Summary ──────────────────────────────────────────────────────────────

export interface SecurityKPIs {
  totalRisks: number;
  criticalRisks: number;
  highRisks: number;
  mediumRisks: number;
  lowRisks: number;
  openRisks: number;
  resolvedRisks: number;
  totalDataSources: number;
  secureDataSources: number;
  ambiguousDataSources: number;
  totalSecrets: number;
  exposedSecrets: number;
  serverOnlySecrets: number;
  totalModulesWithoutAuth: number;
  externalDependencies: number;
  postureScore: number;
}

// ── Monitoring Readiness ─────────────────────────────────────────────────────

export interface MonitoringCapability {
  id: string;
  name: string;
  description: string;
  state: MonitoringState;
  category: "real_time" | "periodic" | "manual" | "planned";
  notes: string;
}

// ── Action Queue ─────────────────────────────────────────────────────────────

export type ActionPriority = "p0_immediate" | "p1_urgent" | "p2_standard" | "p3_improvement";

export interface SecurityAction {
  id: string;
  title: string;
  description: string;
  priority: ActionPriority;
  severity: Severity;
  relatedRiskId: string;
  suggestedOwner: string;
  estimatedEffort: "small" | "medium" | "large";
  status: RiskStatus;
}
