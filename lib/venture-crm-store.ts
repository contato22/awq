// ─── AWQ Venture CRM — Client-side localStorage store ────────────────────────
//
// Key format: "venture_crm_v1_{entity}"

const PREFIX = "venture_crm_v1_";
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
  } catch {}
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
  idPrefix = "venture"
): T {
  const existing = crmRead<T>(entity) ?? [];
  const withId = { ...record, id: `${idPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` } as unknown as T;
  crmWrite<T>(entity, [withId, ...existing]);
  return withId;
}
