// ─── JACQES CRM — Static-safe query helper ────────────────────────────────────
//
// Usage:  import { fetchCRM } from "@/lib/jacqes-crm-query";
//         const leads = await fetchCRM<CrmLead>("leads");
//
// Static mode (GitHub Pages, IS_STATIC=true):
//   1. Check localStorage (user-modified data is the source of truth)
//   2. If empty → fetch static JSON → seed localStorage → return
//
// Vercel / SSR mode (IS_STATIC=false):
//   1. Try live API (correct Portuguese route segment)
//   2. If API fails → check localStorage cache
//   3. Last resort: static JSON snapshot

import { crmRead, crmSeed } from "./jacqes-crm-store";

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/awq";

// Maps English entity keys (used in static JSON filenames) to API route segments
const API_ROUTE: Record<string, string> = {
  leads:         "leads",
  opportunities: "oportunidades",
  clients:       "clientes",
  tasks:         "tarefas",
  interactions:  "interacoes",
  expansion:     "expansao",
  health:        "health",
  proposals:     "propostas",
};

async function fetchStaticJSON<T>(entity: string): Promise<T[]> {
  try {
    const res = await fetch(`${BASE_PATH}/data/jacqes-crm-${entity}.json`);
    if (res.ok) {
      try {
        const data = (await res.json()) as T[];
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    }
  } catch {
    // network error
  }
  return [];
}

export async function fetchCRM<T>(entity: string): Promise<T[]> {
  // ── Static / GitHub Pages mode ────────────────────────────────────────────
  if (IS_STATIC) {
    // localStorage is the source of truth (seeded from JSON on first load)
    const local = crmRead<T>(entity);
    if (local !== null) return local;

    // First visit: seed from static JSON snapshot
    const data = await fetchStaticJSON<T>(entity);
    crmSeed<T>(entity, data);
    return data;
  }

  // ── Vercel / SSR mode ─────────────────────────────────────────────────────
  const apiSegment = API_ROUTE[entity] ?? entity;
  try {
    const res = await fetch(`/api/jacqes/crm/${apiSegment}`);
    if (res.ok) {
      try {
        const data = (await res.json()) as T[];
        if (Array.isArray(data) && data.length > 0) return data;
      } catch {
        // HTML response or invalid JSON — fall through
      }
    }
  } catch {
    // API unavailable — fall through
  }

  // API failed: check localStorage cache
  const local = crmRead<T>(entity);
  if (local !== null) return local;

  // Last resort: static JSON snapshot
  return fetchStaticJSON<T>(entity);
}
