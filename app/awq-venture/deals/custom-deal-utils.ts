// ─── Custom Deal Types & Utils ────────────────────────────────────────────────
// Shared between /deals/page.tsx (listing) and /deals/novo/page.tsx (form).
// Persistence: Supabase via /api/venture/deals (with localStorage fallback).

export interface CustomDeal {
  id:           string;
  companyName:  string;
  cnpj:         string;
  sector:       string;
  location:     string;
  dealType:     string;
  stage:        string;
  ticket:       number;
  assignee:     string;
  riskLevel:    string;
  priority:     string;
  sendStatus:   string;
  tese:         string;
  structura:    string;
  fee:          string;
  earnin:       string;
  conditions:   string;
  nextSteps:    string;
  notes:        string;
  contactName:  string;
  contactEmail: string;
  contactPhone: string;
  website:      string;
  createdAt:    string;
  updatedAt:    string;
}

const LS_KEY = "awq_custom_deals";

// ─── API helpers ──────────────────────────────────────────────────────────────

function customDealToDealWorkspace(d: CustomDeal) {
  return {
    id:             d.id,
    companyName:    d.companyName,
    stage:          d.stage,
    assignee:       d.assignee,
    lastUpdated:    d.updatedAt,
    sendStatus:     d.sendStatus || "Rascunho",
    operationType:  d.dealType || "Aquisição Parcial",
    valuationRange: "",
    proposedValue:  d.ticket,
    dealScore:      0,
    riskLevel:      d.riskLevel,
    priority:       d.priority,
    identification: {
      companyName:      d.companyName,
      sector:           d.sector,
      location:         d.location,
      mainContact:      d.contactName,
      mainContactRole:  "",
      mainContactEmail: d.contactEmail || null,
      mainContactPhone: d.contactPhone || null,
      dealStage:        d.stage,
      dealOrigin:       "",
      website:          d.website || null,
    },
    strategicThesis:   { strategicRationale: d.tese, whyNow: "", synergies: "", valueCreationThesis: "", awqVentureFit: "" },
    assetDiagnosis:    { summary: d.notes, strengths: [], weaknesses: [], operationalMaturity: 1, commercialMaturity: 1, risks: [] },
    financials:        { estimatedRevenue: null, estimatedEbitda: null, ebitdaMargin: null, askValuation: d.ticket, proposedValuation: d.ticket, impliedMultiple: null, offerStructure: d.structura, dealType: d.dealType, targetOwnership: null, estimatedInvestment: d.ticket, expectedUpside: null, financialNotes: d.fee, revenueConfidence: "estimated" },
    riskDiligence:     { legalRisks: "", financialRisks: "", operationalRisks: "", integrationRisks: "", diligencePending: [], blockers: [] },
    proposalStructure: { economicProposal: d.structura, paymentStructure: d.fee, stages: [], conditions: d.conditions ? [d.conditions] : [], timeline: "", nextSteps: d.nextSteps ? [d.nextSteps] : [] },
    governance:        { createdBy: d.assignee, createdAt: d.createdAt, updatedBy: d.assignee, updatedAt: d.updatedAt, sourceOfTruth: "AWQ_Venture" as const, status: (d.sendStatus || "Rascunho") as "Rascunho", version: 1, internalOnly: true, clientVisible: false, auditTrail: [] },
  };
}

async function syncToAPI(deal: CustomDeal): Promise<void> {
  try {
    await fetch("/api/venture/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "upsert", deal: customDealToDealWorkspace(deal), isCustom: true }),
    });
  } catch { /* API unavailable — localStorage is source of truth */ }
}

async function deleteFromAPI(id: string): Promise<void> {
  try {
    await fetch("/api/venture/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
  } catch { /* ignore */ }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function loadCustomDeals(): CustomDeal[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]"); } catch { return []; }
}

export function saveCustomDeals(deals: CustomDeal[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(deals));
  // Sync each deal to DB in background
  for (const d of deals) syncToAPI(d);
}

export async function addCustomDeal(deal: CustomDeal): Promise<void> {
  const existing = loadCustomDeals();
  const updated = [...existing.filter((d) => d.id !== deal.id), deal];
  localStorage.setItem(LS_KEY, JSON.stringify(updated));
  await syncToAPI(deal);
}

export async function removeCustomDeal(id: string): Promise<void> {
  const updated = loadCustomDeals().filter((d) => d.id !== id);
  localStorage.setItem(LS_KEY, JSON.stringify(updated));
  await deleteFromAPI(id);
}
