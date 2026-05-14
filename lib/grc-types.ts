export type RiskSeverity = "low" | "medium" | "high" | "critical";
export type RiskStatus = "open" | "in_treatment" | "accepted" | "closed";
export type ControlStatus = "active" | "inactive" | "under_review";
export type ControlType = "preventive" | "detective" | "corrective";
export type PolicyStatus = "draft" | "active" | "under_review" | "retired";
export type AuditStatus = "planned" | "in_progress" | "completed" | "cancelled";

export interface GrcRisk {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  severity: RiskSeverity;
  status: RiskStatus;
  owner: string | null;
  created_at: string;
  updated_at: string;
}

export interface GrcControl {
  id: string;
  title: string;
  description: string | null;
  type: ControlType;
  status: ControlStatus;
  risk_id: string | null;
  owner: string | null;
  created_at: string;
  updated_at: string;
}

export interface GrcPolicy {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: PolicyStatus;
  version: string | null;
  effective_date: string | null;
  owner: string | null;
  created_at: string;
  updated_at: string;
}

export interface GrcAudit {
  id: string;
  title: string;
  description: string | null;
  status: AuditStatus;
  audit_date: string | null;
  auditor: string | null;
  findings: string | null;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      grc_risks: {
        Row: GrcRisk;
        Insert: Omit<GrcRisk, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<GrcRisk, "id" | "created_at" | "updated_at">>;
      };
      grc_controls: {
        Row: GrcControl;
        Insert: Omit<GrcControl, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<GrcControl, "id" | "created_at" | "updated_at">>;
      };
      grc_policies: {
        Row: GrcPolicy;
        Insert: Omit<GrcPolicy, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<GrcPolicy, "id" | "created_at" | "updated_at">>;
      };
      grc_audits: {
        Row: GrcAudit;
        Insert: Omit<GrcAudit, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<GrcAudit, "id" | "created_at" | "updated_at">>;
      };
    };
  };
}

export const SEVERITY_LABELS: Record<RiskSeverity, string> = {
  low: "Baixo",
  medium: "Médio",
  high: "Alto",
  critical: "Crítico",
};

export const RISK_STATUS_LABELS: Record<RiskStatus, string> = {
  open: "Aberto",
  in_treatment: "Em tratamento",
  accepted: "Aceito",
  closed: "Fechado",
};

export const CONTROL_TYPE_LABELS: Record<ControlType, string> = {
  preventive: "Preventivo",
  detective: "Detectivo",
  corrective: "Corretivo",
};

export const CONTROL_STATUS_LABELS: Record<ControlStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  under_review: "Em revisão",
};

export const POLICY_STATUS_LABELS: Record<PolicyStatus, string> = {
  draft: "Rascunho",
  active: "Ativo",
  under_review: "Em revisão",
  retired: "Retirado",
};

export const AUDIT_STATUS_LABELS: Record<AuditStatus, string> = {
  planned: "Planejada",
  in_progress: "Em andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
};

export const SEVERITY_COLORS: Record<RiskSeverity, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};
