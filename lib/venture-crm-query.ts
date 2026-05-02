// ─── AWQ Venture CRM — Static-safe query helper ──────────────────────────────

import { crmRead, crmSeed } from "./venture-crm-store";

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/awq";

const API_ROUTE: Record<string, string> = {
  leads:        "leads",
  deals:        "deals",
  contacts:     "contatos",
  interactions: "interacoes",
};

async function fetchStaticJSON<T>(entity: string): Promise<T[]> {
  try {
    const res = await fetch(`${BASE_PATH}/data/venture-crm-${entity}.json`);
    if (res.ok) {
      const data = (await res.json()) as T[];
      return Array.isArray(data) ? data : [];
    }
  } catch {}
  return [];
}

export async function fetchVentureCRM<T>(entity: string): Promise<T[]> {
  if (IS_STATIC) {
    const local = crmRead<T>(entity);
    if (local !== null) return local;
    const data = await fetchStaticJSON<T>(entity);
    crmSeed<T>(entity, data);
    return data;
  }

  const apiSegment = API_ROUTE[entity] ?? entity;
  try {
    const res = await fetch(`/api/awq-venture/crm/${apiSegment}`);
    if (res.ok) {
      const data = (await res.json()) as T[];
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch {}

  const local = crmRead<T>(entity);
  if (local !== null) return local;
  return fetchStaticJSON<T>(entity);
}
