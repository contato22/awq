// ─── JACQES CRM — Static-safe query helper ────────────────────────────────────
//
// Usage:  import { fetchCRM } from "@/lib/jacqes-crm-query";
//         const leads = await fetchCRM<CrmLead>("leads");
//
// On GitHub Pages (IS_STATIC=true):  reads /awq/data/jacqes-crm-{entity}.json
// On Vercel (IS_STATIC=false):       tries /api/jacqes/crm/{entity} first,
//                                    falls back to static JSON on failure.
//
// Uses try-catch around .json() instead of content-type checks — GitHub Pages
// may serve JSON files without "application/json" content-type header.

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/awq";

export async function fetchCRM<T>(entity: string): Promise<T[]> {
  // Vercel/SSR — try live API first (API routes are available at root, no basePath)
  if (!IS_STATIC) {
    try {
      const res = await fetch(`/api/jacqes/crm/${entity}`);
      if (res.ok) {
        try {
          const data = await res.json() as T[];
          if (Array.isArray(data) && data.length > 0) return data;
        } catch { /* HTML response or invalid JSON — fall through */ }
      }
    } catch { /* API unavailable — fall through to static snapshot */ }
  }

  // GitHub Pages (IS_STATIC=true) or API empty/unavailable: read canonical JSON
  try {
    const res = await fetch(`${BASE_PATH}/data/jacqes-crm-${entity}.json`);
    if (res.ok) {
      try {
        const data = await res.json() as T[];
        return Array.isArray(data) ? data : [];
      } catch { return []; /* HTML 404 parsed as JSON — safe */ }
    }
  } catch { /* network error */ }

  return [];
}
