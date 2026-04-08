// ─── Deal Workspace — Canonical Types ────────────────────────────────────────
// SOURCE OF TRUTH: AWQ Venture (via /awq-venture/deals/[id])
// HOLDING: read-only DealHoldingSummary consumer at /awq/portfolio

export type DealStage =
  | "Triagem"
  | "Prospecção"
  | "Due Diligence"
  | "Term Sheet"
  | "Negociação"
  | "Fechado"
  | "Cancelado";

export type DealRisk = "Baixo" | "Médio" | "Alto" | "Crítico";

export type DealSendStatus =
  | "Rascunho"
  | "Pronto para Envio"
  | "Enviado"
  | "Em Negociação"
  | "Aprovado"
  | "Rejeitado";

export type DealOperationType =
  | "Aquisição Total"
  | "Aquisição Parcial"
  | "Fusão"
  | "Joint Venture"
  | "Investimento Minoritário";

export type DealPriority = "Alta" | "Média" | "Baixa";
export type DealConfidence = "confirmed" | "probable" | "estimated";
export type MaturityLevel = 1 | 2 | 3 | 4 | 5;

// ─── Section 3: Identificação ────────────────────────────────────────────────

export interface DealIdentification {
  companyName:      string;
  sector:           string;
  location:         string;
  mainContact:      string;
  mainContactRole:  string;
  mainContactEmail: string | null;
  mainContactPhone: string | null;
  dealStage:        DealStage;
  dealOrigin:       string;
  website:          string | null;
}

// ─── Section 4: Tese Estratégica ─────────────────────────────────────────────

export interface DealStrategicThesis {
  strategicRationale:  string;
  whyNow:              string;
  synergies:           string;
  valueCreationThesis: string;
  awqVentureFit:       string;
}

// ─── Section 5: Diagnóstico do Ativo ─────────────────────────────────────────

export interface DealAssetDiagnosis {
  summary:              string;
  strengths:            string[];
  weaknesses:           string[];
  operationalMaturity:  MaturityLevel;
  commercialMaturity:   MaturityLevel;
  risks:                string[];
}

// ─── Section 6: Econômico-Financeiro ─────────────────────────────────────────

export interface DealFinancials {
  estimatedRevenue:   number | null;
  estimatedEbitda:    number | null;
  ebitdaMargin:       number | null;
  askValuation:       number;
  proposedValuation:  number;
  impliedMultiple:    number | null;
  offerStructure:     string;
  dealType:           DealOperationType;
  targetOwnership:    number;            // %
  estimatedInvestment: number;
  expectedUpside:     number | null;     // %
  financialNotes:     string;
  revenueConfidence:  DealConfidence;
}

// ─── Section 7: Risco e Diligência ───────────────────────────────────────────

export interface DealRiskDiligence {
  legalRisks:        string;
  financialRisks:    string;
  operationalRisks:  string;
  integrationRisks:  string;
  diligencePending:  string[];
  blockers:          string[];
}

// ─── Section 8: Estrutura da Proposta ────────────────────────────────────────

export interface DealProposalStage {
  label:       string;
  description: string;
  targetDate:  string;
}

export interface DealProposalStructure {
  economicProposal:  string;
  paymentStructure:  string;
  stages:            DealProposalStage[];
  conditions:        string[];
  timeline:          string;
  nextSteps:         string[];
}

// ─── Section 9: Governança ───────────────────────────────────────────────────

export interface DealAuditEntry {
  date:   string;
  by:     string;
  action: string;
}

export interface DealGovernance {
  createdBy:     string;
  createdAt:     string;
  updatedBy:     string;
  updatedAt:     string;
  sourceOfTruth: "AWQ_Venture";
  status:        DealSendStatus;
  version:       number;
  internalOnly:  boolean;
  clientVisible: boolean;
  auditTrail:    DealAuditEntry[];
}

// ─── Full Deal Workspace ─────────────────────────────────────────────────────

export interface DealWorkspace {
  // Cabeçalho executivo
  id:             string;
  companyName:    string;
  stage:          DealStage;
  assignee:       string;
  lastUpdated:    string;
  sendStatus:     DealSendStatus;
  operationType:  DealOperationType;
  valuationRange: string;
  proposedValue:  number;
  dealScore:      number;    // 0–10
  riskLevel:      DealRisk;
  priority:       DealPriority;

  // Sections
  identification:    DealIdentification;
  strategicThesis:   DealStrategicThesis;
  assetDiagnosis:    DealAssetDiagnosis;
  financials:        DealFinancials;
  riskDiligence:     DealRiskDiligence;
  proposalStructure: DealProposalStructure;
  governance:        DealGovernance;
}

// ─── Holding Summary (read-only — AWQ Holding consumes only this) ─────────────

export interface DealHoldingSummary {
  dealId:        string;
  companyName:   string;
  sector:        string;
  stage:         DealStage;
  proposedValue: number;
  valuationRange: string;
  operationType: DealOperationType;
  riskLevel:     DealRisk;
  expectedUpside: number | null;
  sendStatus:    DealSendStatus;
  lastUpdated:   string;
  assignee:      string;
  dealScore:     number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function toDealHoldingSummary(d: DealWorkspace): DealHoldingSummary {
  return {
    dealId:         d.id,
    companyName:    d.companyName,
    sector:         d.identification.sector,
    stage:          d.stage,
    proposedValue:  d.proposedValue,
    valuationRange: d.valuationRange,
    operationType:  d.operationType,
    riskLevel:      d.riskLevel,
    expectedUpside: d.financials.expectedUpside,
    sendStatus:     d.sendStatus,
    lastUpdated:    d.lastUpdated,
    assignee:       d.assignee,
    dealScore:      d.dealScore,
  };
}
