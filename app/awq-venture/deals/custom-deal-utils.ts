// ─── Custom Deal Types & Utils ────────────────────────────────────────────────
// Shared between /deals/page.tsx (listing) and /deals/novo/page.tsx (form).
// Storage: Supabase via /api/ma/deals when available, localStorage fallback.

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

const STORAGE_KEY = "awq_custom_deals";

// ─── Stage mapping: CustomDeal (PT-BR) ↔ MaDeal pipeline_stage ───────────────

const STAGE_TO_PIPELINE: Record<string, string> = {
  "Triagem":        "screening",
  "Prospecção":     "sourcing",
  "Due Diligence":  "due_diligence",
  "Term Sheet":     "structuring",
  "Negociação":     "ic_review",
  "Fechado":        "closed_won",
  "Cancelado":      "closed_lost",
};

const PIPELINE_TO_STAGE: Record<string, string> = {
  "screening":    "Triagem",
  "sourcing":     "Prospecção",
  "due_diligence":"Due Diligence",
  "structuring":  "Term Sheet",
  "ic_review":    "Negociação",
  "closed_won":   "Fechado",
  "closed_lost":  "Cancelado",
};

const DEAL_TYPE_TO_DB: Record<string, string> = {
  "M&A":                       "acquisition",
  "Investimento Minoritário":  "equity_investment",
  "Advisory":                  "equity_investment",
  "Joint Venture":             "equity_investment",
  "Fusão":                     "acquisition",
  "Aquisição Total":           "acquisition",
  "Participação Estratégica":  "equity_investment",
  "M4E":                       "m4e",
};

// ─── MaDeal row → CustomDeal ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToCustomDeal(row: Record<string, any>): CustomDeal {
  const tags: Record<string, string> = row.tags ?? {};
  return {
    id:           row.deal_id,
    companyName:  row.company_name ?? "",
    cnpj:         tags.cnpj ?? "",
    sector:       row.industry ?? "",
    location:     tags.location ?? "",
    dealType:     tags.original_deal_type ?? Object.keys(DEAL_TYPE_TO_DB).find(k => DEAL_TYPE_TO_DB[k] === row.deal_type) ?? row.deal_type ?? "M&A",
    stage:        PIPELINE_TO_STAGE[row.pipeline_stage] ?? "Triagem",
    ticket:       row.proposed_valuation ?? 0,
    assignee:     row.deal_lead ?? "",
    riskLevel:    tags.risk_level ?? "Médio",
    priority:     tags.priority_pt ?? "Média",
    sendStatus:   tags.send_status ?? "Rascunho",
    tese:         tags.tese ?? "",
    structura:    tags.structura ?? "",
    fee:          tags.fee ?? "",
    earnin:       tags.earnin ?? "",
    conditions:   tags.conditions ?? "",
    nextSteps:    tags.next_steps ?? "",
    notes:        row.notes ?? "",
    contactName:  tags.contact_name ?? "",
    contactEmail: tags.contact_email ?? "",
    contactPhone: tags.contact_phone ?? "",
    website:      row.company_website ?? "",
    createdAt:    row.created_at ?? new Date().toISOString(),
    updatedAt:    row.updated_at ?? new Date().toISOString(),
  };
}

// ─── CustomDeal → MaDeal insert/update payload ────────────────────────────────

function customDealToPayload(deal: CustomDeal) {
  return {
    deal_id:           deal.id,
    deal_code:         deal.id,
    deal_name:         deal.companyName,
    company_name:      deal.companyName,
    company_website:   deal.website || null,
    industry:          deal.sector || null,
    deal_type:         DEAL_TYPE_TO_DB[deal.dealType] ?? "equity_investment",
    pipeline_stage:    STAGE_TO_PIPELINE[deal.stage] ?? "screening",
    proposed_valuation: deal.ticket || null,
    deal_lead:         deal.assignee || null,
    notes:             deal.notes || null,
    tags: {
      cnpj:                deal.cnpj || undefined,
      location:            deal.location || undefined,
      original_deal_type:  deal.dealType,
      risk_level:          deal.riskLevel,
      priority_pt:         deal.priority,
      send_status:         deal.sendStatus,
      tese:                deal.tese || undefined,
      structura:           deal.structura || undefined,
      fee:                 deal.fee || undefined,
      earnin:              deal.earnin || undefined,
      conditions:          deal.conditions || undefined,
      next_steps:          deal.nextSteps || undefined,
      contact_name:        deal.contactName || undefined,
      contact_email:       deal.contactEmail || undefined,
      contact_phone:       deal.contactPhone || undefined,
    },
  };
}

// ─── localStorage helpers (fallback) ─────────────────────────────────────────

export function loadCustomDealsLocal(): CustomDeal[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}

function saveCustomDealsLocal(deals: CustomDeal[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
}

// ─── API-backed functions ─────────────────────────────────────────────────────

/**
 * Load all venture custom deals from API (falls back to localStorage).
 */
export async function loadCustomDeals(): Promise<CustomDeal[]> {
  try {
    const res = await fetch("/api/ma/deals?deal_type=custom_venture", { cache: "no-store" });
    // Treat non-ok or non-JSON as "API unavailable" — fall back to localStorage
    if (!res.ok) throw new Error("API unavailable");
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? "API error");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: CustomDeal[] = (json.data as Record<string, any>[])
      .filter((r) => r.tags?.is_venture_custom === true)
      .map(rowToCustomDeal);
    return rows;
  } catch {
    return loadCustomDealsLocal();
  }
}

/**
 * Save (create or update) a custom deal via API (falls back to localStorage).
 */
export async function saveCustomDeal(deal: CustomDeal): Promise<void> {
  const payload = customDealToPayload(deal);
  const tags = {
    ...payload.tags,
    is_venture_custom: true,
  };

  // Try API first
  try {
    // Attempt update; if that fails (not found / DB unavailable) try create
    const updateRes = await fetch("/api/ma/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", ...payload, tags }),
    });
    const updateJson = await updateRes.json();

    if (!updateJson.success) {
      // Not found in DB — create
      const createRes = await fetch("/api/ma/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          ...payload,
          tags,
          deal_name: deal.companyName || "Sem nome",
          company_name: deal.companyName || "Sem nome",
          deal_type: "custom_venture",
        }),
      });
      const createJson = await createRes.json();
      if (!createJson.success) throw new Error(createJson.error ?? "Create failed");
    }
    // On success, remove from localStorage if it was there
    const local = loadCustomDealsLocal().filter((d) => d.id !== deal.id);
    saveCustomDealsLocal(local);
    return;
  } catch {
    // Fall back to localStorage
  }

  const all = loadCustomDealsLocal();
  const idx = all.findIndex((d) => d.id === deal.id);
  const updated = { ...deal, updatedAt: new Date().toISOString() };
  if (idx >= 0) all[idx] = updated; else all.unshift(updated);
  saveCustomDealsLocal(all);
}

/**
 * Delete a custom deal via API (falls back to localStorage).
 */
export async function deleteCustomDeal(id: string): Promise<void> {
  try {
    const res = await fetch("/api/ma/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", deal_id: id }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? "Delete failed");
    // Also clean up localStorage
    const local = loadCustomDealsLocal().filter((d) => d.id !== id);
    saveCustomDealsLocal(local);
    return;
  } catch {
    // Fall back to localStorage
  }
  const all = loadCustomDealsLocal().filter((d) => d.id !== id);
  saveCustomDealsLocal(all);
}

// ─── Kept for backward compat (synchronous localStorage only) ─────────────────
/** @deprecated Use saveCustomDeal (async) instead */
export function saveCustomDeals(deals: CustomDeal[]) {
  saveCustomDealsLocal(deals);
}
