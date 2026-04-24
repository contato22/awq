// ─── JACQES CRM — Client-side localStorage store ─────────────────────────────
//
// Source of truth for CRM data in static / GitHub Pages environments.
// On Vercel (SSR), fetchCRM() uses the live API; localStorage serves as a
// client-side cache and fallback when the API is unreachable.
//
// Storage layout: one key per entity, each holding a JSON array.
// Key format: "jacqes_crm_v1_{entity}"  (versioned to allow schema resets)

export const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";

const PREFIX = "jacqes_crm_v1_";
const key = (entity: string) => PREFIX + entity;

// ─── Core read / write ────────────────────────────────────────────────────────

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
    // Quota exceeded or private mode — silently ignore
  }
}

// Seeds localStorage from static JSON (only if the key doesn't exist yet)
export function crmSeed<T>(entity: string, data: T[]): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(key(entity)) === null) {
    crmWrite(entity, data);
  }
}

// ─── CRUD helpers ─────────────────────────────────────────────────────────────

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function crmCreate<T extends Record<string, unknown>>(
  entity: string,
  record: Omit<T, "id">,
  idPrefix = "local"
): T {
  const existing = crmRead<T>(entity) ?? [];
  const withId = { ...record, id: genId(idPrefix) } as unknown as T;
  crmWrite<T>(entity, [withId, ...existing]);
  return withId;
}

export function crmUpdate<T extends { id: string }>(
  entity: string,
  id: string,
  patch: Partial<T>
): boolean {
  const existing = crmRead<T>(entity);
  if (!existing) return false;
  const idx = existing.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  existing[idx] = { ...existing[idx], ...patch };
  crmWrite<T>(entity, existing);
  return true;
}

export function crmDelete<T extends { id: string }>(
  entity: string,
  id: string
): void {
  const existing = crmRead<T>(entity) ?? [];
  crmWrite<T>(entity, existing.filter((r) => r.id !== id));
}

// ─── Reset (for debugging / data wipe) ───────────────────────────────────────

export function crmReset(entity?: string): void {
  if (typeof window === "undefined") return;
  if (entity) {
    localStorage.removeItem(key(entity));
  } else {
    // Remove all CRM keys
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  }
}
