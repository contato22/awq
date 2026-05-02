// ─── Advisor CRM — Client-side localStorage store ────────────────────────────
//
// Source of truth para CRM Advisor em ambientes estáticos (GitHub Pages).
// Em Vercel (SSR), fetchAdvisorCRM() usa a live API; localStorage é cache.
//
// Key format: "advisor_crm_v1_{entity}"

const PREFIX = "advisor_crm_v1_";
const key = (entity: string) => PREFIX + entity;

export function crmRead<T>(entity: string): T[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key(entity));
    return raw ? (JSON.parse(raw) as T[]) : null;
  } catch {
    return null;
  }
}

export function crmWrite<T>(entity: string, data: T[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key(entity), JSON.stringify(data));
  } catch {
    // Quota exceeded — silently ignore
  }
}

export function crmSeed<T>(entity: string, data: T[]): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(key(entity)) === null) {
    crmWrite(entity, data);
  }
}

export function crmCreate<T extends Record<string, unknown>>(
  entity: string,
  record: Omit<T, "id">,
  idPrefix = "advisor"
): T {
  const existing = crmRead<T>(entity) ?? [];
  const withId = { ...record, id: `${idPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` } as unknown as T;
  crmWrite<T>(entity, [withId, ...existing]);
  return withId;
}

export function crmUpdate<T extends { id: string }>(entity: string, id: string, patch: Partial<T>): boolean {
  const existing = crmRead<T>(entity);
  if (!existing) return false;
  const idx = existing.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  existing[idx] = { ...existing[idx], ...patch };
  crmWrite<T>(entity, existing);
  return true;
}

export function crmDelete<T extends { id: string }>(entity: string, id: string): void {
  const existing = crmRead<T>(entity) ?? [];
  crmWrite<T>(entity, existing.filter((r) => r.id !== id));
}
