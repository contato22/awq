// ─── Caza Vision CRM — Query helper (Supabase-aware) ──────────────────────────
//
// Prioridade de dados:
//   1. Supabase direto (browser ou servidor) — se NEXT_PUBLIC_SUPABASE_URL presente
//   2. API route /api/caza/crm/{entity}      — Vercel SSR sem Supabase configurado
//   3. Snapshot JSON estático                — último recurso
//
// ISOLADO de jacqes-crm-query — zero cross-BU.

import {
  listLeads, listOpportunities, listProposals, listInteractions,
} from "./caza-crm-db";
import { HAS_SUPABASE } from "./supabase";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/awq";

const SUPABASE_FN: Record<string, () => Promise<unknown[]>> = {
  leads:         listLeads,
  oportunidades: listOpportunities,
  propostas:     listProposals,
  interacoes:    () => listInteractions(),
};

export async function fetchCazaCRM<T>(entity: string): Promise<T[]> {
  // ── 1. Supabase direto ────────────────────────────────────────────────────
  if (HAS_SUPABASE) {
    const fn = SUPABASE_FN[entity];
    if (fn) {
      try {
        const data = await fn();
        return data as T[];
      } catch { /* fall through */ }
    }
  }

  // ── 2. API route ──────────────────────────────────────────────────────────
  try {
    const res = await fetch(`/api/caza/crm/${entity}`);
    if (res.ok) {
      try {
        const data = await res.json() as T[];
        if (Array.isArray(data) && data.length > 0) return data;
      } catch { /* JSON inválido */ }
    }
  } catch { /* API indisponível */ }

  // ── 3. Snapshot JSON estático ─────────────────────────────────────────────
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
