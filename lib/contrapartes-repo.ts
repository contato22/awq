// ─── Contrapartes — repository ────────────────────────────────────────────────
// Data access layer. All UI components import from here, never from idb directly.
// Prepared for future migration to Supabase/Neon — swap implementations here only.

import { getIDB } from "./idb";
import type { Contraparte, ContraprtePapel } from "./contraparte-types";

const STORE = "contrapartes" as const;

function iso(): string { return new Date().toISOString(); }
function uid(): string { return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36); }

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function listContrapartes(): Promise<Contraparte[]> {
  const db   = await getIDB();
  const all  = await db.getAll(STORE);
  return all.filter((c) => !c.deletedAt);
}

export async function getContraparte(id: string): Promise<Contraparte | undefined> {
  const db = await getIDB();
  return db.get(STORE, id);
}

export async function searchContrapartes(
  query: string,
  filters?: { papel?: ContraprtePapel | "all"; bu?: string; status?: string }
): Promise<Contraparte[]> {
  const all = await listContrapartes();
  const q   = query.toLowerCase().trim();

  return all.filter((c) => {
    if (c.deletedAt) return false;

    if (filters?.papel && filters.papel !== "all" && c.papel !== filters.papel) return false;
    if (filters?.bu    && filters.bu    !== "all" && c.bu     !== filters.bu)    return false;
    if (filters?.status && filters.status !== "all" && c.status !== filters.status) return false;

    if (!q) return true;
    const haystack = [c.razaoSocial, c.nomeFantasia, c.cnpjCpf, c.emailFinanceiro]
      .filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(q);
  });
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createContraparte(
  data: Omit<Contraparte, "id" | "createdAt" | "updatedAt" | "deletedAt">
): Promise<Contraparte> {
  const db = await getIDB();
  const c: Contraparte = {
    ...data,
    id:        uid(),
    createdAt: iso(),
    updatedAt: iso(),
  };
  await db.put(STORE, c);
  return c;
}

export async function updateContraparte(
  id: string,
  patch: Partial<Omit<Contraparte, "id" | "createdAt">>
): Promise<Contraparte> {
  const db   = await getIDB();
  const prev = await db.get(STORE, id);
  if (!prev) throw new Error(`Contraparte ${id} not found`);
  const updated: Contraparte = { ...prev, ...patch, updatedAt: iso() };
  await db.put(STORE, updated);
  return updated;
}

export async function softDeleteContraparte(id: string): Promise<void> {
  await updateContraparte(id, { deletedAt: iso(), status: "inativo" });
}
