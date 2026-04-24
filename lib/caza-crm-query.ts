// ─── Caza Vision CRM — Static-safe query helper ───────────────────────────────
//
// Usage:  import { fetchCazaCRM } from "@/lib/caza-crm-query";
//         const leads = await fetchCazaCRM<CazaCrmLead>("leads");
//
// On GitHub Pages (IS_STATIC=true):  reads /awq/data/caza-crm-{entity}.json
// On Vercel (IS_STATIC=false):       tries /api/caza/crm/{entity} first,
//                                    falls back to static JSON on failure.
//
// ISOLATED from jacqes-crm-query — zero cross-BU data access.

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/awq";

export async function fetchCazaCRM<T>(entity: string): Promise<T[]> {
  if (!IS_STATIC) {
    try {
      const res = await fetch(`/api/caza/crm/${entity}`);
      if (res.ok) {
        try {
          const data = await res.json() as T[];
          if (Array.isArray(data) && data.length > 0) return data;
        } catch { /* invalid JSON — fall through */ }
      }
    } catch { /* API unavailable — fall through */ }
  }

  try {
    const res = await fetch(`${BASE_PATH}/data/caza-crm-${entity}.json`);
    if (res.ok) {
      try {
        const data = await res.json() as T[];
        return Array.isArray(data) ? data : [];
      } catch { return []; }
    }
  } catch { /* network error */ }

  return [];
}
