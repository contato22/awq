// ─── JACQES CRM — Query helper (Supabase-aware) ────────────────────────────────
//
// Prioridade de dados:
//   1. Supabase direto (browser ou servidor) — se NEXT_PUBLIC_SUPABASE_URL presente
//   2. API route /api/jacqes/crm/{entity}    — Vercel SSR sem Supabase configurado
//   3. Snapshot JSON estático                — último recurso

import {
  listLeads, listOpportunities, listCrmClients, listInteractions,
  listTasks, listExpansion, listHealth, listProposals,
} from "./jacqes-crm-db";
import { crmRead, crmSeed } from "./jacqes-crm-store";
import { HAS_SUPABASE } from "./supabase";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/awq";

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

// Maps entity key → direct Supabase list function
const SUPABASE_FN: Record<string, () => Promise<unknown[]>> = {
  leads:         listLeads,
  opportunities: listOpportunities,
  clients:       listCrmClients,
  interactions:  listInteractions,
  tasks:         listTasks,
  expansion:     listExpansion,
  health:        listHealth,
  proposals:     listProposals,
};

async function fetchStaticJSON<T>(entity: string): Promise<T[]> {
  try {
    const res = await fetch(`${BASE_PATH}/data/jacqes-crm-${entity}.json`);
    if (res.ok) {
      try {
        const data = (await res.json()) as T[];
        return Array.isArray(data) ? data : [];
      } catch { return []; }
    }
  } catch { /* network error */ }
  return [];
}

export async function fetchCRM<T>(entity: string): Promise<T[]> {
  // ── 1. Supabase direto (funciona em browser e servidor) ───────────────────
  if (HAS_SUPABASE) {
    const fn = SUPABASE_FN[entity];
    if (fn) {
      try {
        const data = await fn();
        return data as T[];
      } catch { /* fall through */ }
    }
  }

  // ── 2. API route (Vercel SSR sem Supabase) ────────────────────────────────
  const apiSegment = API_ROUTE[entity] ?? entity;
  try {
    const res = await fetch(`/api/jacqes/crm/${apiSegment}`);
    if (res.ok) {
      try {
        const data = (await res.json()) as T[];
        if (Array.isArray(data) && data.length > 0) return data;
      } catch { /* HTML ou JSON inválido */ }
    }
  } catch { /* API indisponível */ }

  // ── 3. localStorage cache ─────────────────────────────────────────────────
  const local = crmRead<T>(entity);
  if (local !== null) return local;

  // ── 4. Snapshot JSON estático ─────────────────────────────────────────────
  const snap = await fetchStaticJSON<T>(entity);
  crmSeed<T>(entity, snap);
  return snap;
}
