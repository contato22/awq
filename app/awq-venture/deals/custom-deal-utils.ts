// ─── Custom Deal Types & Utils ────────────────────────────────────────────────
// Shared between /deals/page.tsx (listing) and /deals/novo/page.tsx (form).
// Storage: Neon Postgres via /api/venture/deals (persistent across devices).

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

function uid(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function loadCustomDeals(): Promise<CustomDeal[]> {
  try {
    const res = await fetch("/api/venture/deals");
    if (res.ok) return res.json();
  } catch { /* fall through */ }
  return [];
}

export async function createCustomDeal(data: Omit<CustomDeal, "id" | "createdAt" | "updatedAt">): Promise<CustomDeal> {
  const now = new Date().toISOString();
  const deal: CustomDeal = { ...data, id: uid(), createdAt: now, updatedAt: now };
  const res = await fetch("/api/venture/deals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(deal),
  });
  if (!res.ok) throw new Error("Failed to create deal");
  return res.json();
}

export async function updateCustomDeal(id: string, patch: Partial<CustomDeal>): Promise<CustomDeal> {
  const res = await fetch(`/api/venture/deals/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("Failed to update deal");
  return res.json();
}

export async function deleteCustomDeal(id: string): Promise<void> {
  await fetch(`/api/venture/deals/${id}`, { method: "DELETE" });
}

// Legacy sync helpers kept for pages that call saveCustomDeals([...]).
// They now re-map to the async API — callers should migrate to the async functions above.
export function saveCustomDeals(_deals: CustomDeal[]) {
  // no-op: data is now persisted server-side
}
