// ─── Advisor CRM — Static-safe query helper ───────────────────────────────────
//
// Static mode (GitHub Pages, IS_STATIC=true):
//   1. localStorage (fonte de verdade do usuário)
//   2. Se vazio → fetch JSON estático → seed localStorage → retorna
//
// Vercel / SSR mode:
//   1. Live API
//   2. Se API falhar → localStorage cache
//   3. Último recurso: JSON estático

import { crmRead, crmSeed } from "./advisor-crm-store";

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC_DATA === "1";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/awq";

const API_ROUTE: Record<string, string> = {
  leads:         "leads",
  opportunities: "oportunidades",
  clients:       "clientes",
  interactions:  "interacoes",
  proposals:     "propostas",
  tasks:         "tarefas",
};

async function fetchStaticJSON<T>(entity: string): Promise<T[]> {
  try {
    const res = await fetch(`${BASE_PATH}/data/advisor-crm-${entity}.json`);
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

export async function fetchAdvisorCRM<T>(entity: string): Promise<T[]> {
  if (IS_STATIC) {
    const local = crmRead<T>(entity);
    if (local !== null) return local;
    const data = await fetchStaticJSON<T>(entity);
    crmSeed<T>(entity, data);
    return data;
  }

  const apiSegment = API_ROUTE[entity] ?? entity;
  try {
    const res = await fetch(`/api/advisor/crm/${apiSegment}`);
    if (res.ok) {
      try {
        const data = (await res.json()) as T[];
        if (Array.isArray(data) && data.length > 0) return data;
      } catch {
        // HTML response ou JSON inválido
      }
    }
  } catch {
    // API indisponível
  }

  const local = crmRead<T>(entity);
  if (local !== null) return local;

  return fetchStaticJSON<T>(entity);
}
