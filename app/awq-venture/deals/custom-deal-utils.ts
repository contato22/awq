// ─── Custom Deal Types & Utils ────────────────────────────────────────────────
// Shared between /deals/page.tsx (listing) and /deals/novo/page.tsx (form).

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

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";
const STORAGE_KEY = "awq_custom_deals";

// ─── Column mapping ───────────────────────────────────────────────────────────

function toRow(d: CustomDeal): Record<string, unknown> {
  return {
    id:            d.id,
    company_name:  d.companyName,
    cnpj:          d.cnpj,
    sector:        d.sector,
    location:      d.location,
    deal_type:     d.dealType,
    stage:         d.stage,
    ticket:        d.ticket,
    assignee:      d.assignee,
    risk_level:    d.riskLevel,
    priority:      d.priority,
    send_status:   d.sendStatus,
    tese:          d.tese,
    structura:     d.structura,
    fee:           d.fee,
    earnin:        d.earnin,
    conditions:    d.conditions,
    next_steps:    d.nextSteps,
    notes:         d.notes,
    contact_name:  d.contactName,
    contact_email: d.contactEmail,
    contact_phone: d.contactPhone,
    website:       d.website,
    created_at:    d.createdAt,
    updated_at:    d.updatedAt,
  };
}

function fromRow(r: Record<string, unknown>): CustomDeal {
  return {
    id:           String(r.id           ?? ""),
    companyName:  String(r.company_name ?? ""),
    cnpj:         String(r.cnpj         ?? ""),
    sector:       String(r.sector       ?? ""),
    location:     String(r.location     ?? ""),
    dealType:     String(r.deal_type    ?? ""),
    stage:        String(r.stage        ?? ""),
    ticket:       Number(r.ticket       ?? 0),
    assignee:     String(r.assignee     ?? ""),
    riskLevel:    String(r.risk_level   ?? ""),
    priority:     String(r.priority     ?? ""),
    sendStatus:   String(r.send_status  ?? ""),
    tese:         String(r.tese         ?? ""),
    structura:    String(r.structura    ?? ""),
    fee:          String(r.fee          ?? ""),
    earnin:       String(r.earnin       ?? ""),
    conditions:   String(r.conditions   ?? ""),
    nextSteps:    String(r.next_steps   ?? ""),
    notes:        String(r.notes        ?? ""),
    contactName:  String(r.contact_name  ?? ""),
    contactEmail: String(r.contact_email ?? ""),
    contactPhone: String(r.contact_phone ?? ""),
    website:      String(r.website      ?? ""),
    createdAt:    String(r.created_at   ?? ""),
    updatedAt:    String(r.updated_at   ?? ""),
  };
}

// ─── localStorage (IS_STATIC=true) ───────────────────────────────────────────

export function loadCustomDeals(): CustomDeal[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}

export function saveCustomDeals(deals: CustomDeal[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(deals));
}

// ─── API (IS_STATIC=false) ────────────────────────────────────────────────────

export async function fetchCustomDeals(): Promise<CustomDeal[]> {
  if (IS_STATIC) return loadCustomDeals();
  try {
    const res = await fetch("/api/venture/deals");
    if (!res.ok) return [];
    const json = await res.json() as { success: boolean; data: Record<string, unknown>[] };
    return Array.isArray(json.data) ? json.data.map(fromRow) : [];
  } catch { return []; }
}

export async function persistCustomDeal(deal: CustomDeal): Promise<void> {
  if (IS_STATIC) return;
  await fetch("/api/venture/deals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "upsert", ...toRow(deal) }),
  }).catch(() => undefined);
}

export async function deleteCustomDeal(id: string): Promise<void> {
  if (IS_STATIC) return;
  await fetch("/api/venture/deals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", id }),
  }).catch(() => undefined);
}
