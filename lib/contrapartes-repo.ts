// ─── Contrapartes — repository ────────────────────────────────────────────────
// Data access layer for client components. Uses /api/treasury/contrapartes
// (Supabase) when available, falls back to IndexedDB for offline/static mode.

import type { Contraparte, ContraprtePapel } from "./contraparte-types";

function iso(): string { return new Date().toISOString(); }
function uid(): string {
  return (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const API = "/api/treasury/contrapartes";

// ─── IDB fallback (offline / static) ─────────────────────────────────────────

async function idbAll(): Promise<Contraparte[]> {
  try {
    const { getIDB } = await import("./idb");
    const db = await getIDB();
    const all = await (db as unknown as { getAll(s: string): Promise<Contraparte[]> }).getAll("contrapartes");
    return all.filter((c) => !c.deletedAt);
  } catch { return []; }
}

async function idbGet(id: string): Promise<Contraparte | undefined> {
  try {
    const { getIDB } = await import("./idb");
    const db = await getIDB();
    return (db as unknown as { get(s: string, k: string): Promise<Contraparte | undefined> }).get("contrapartes", id);
  } catch { return undefined; }
}

async function idbPut(c: Contraparte): Promise<void> {
  try {
    const { getIDB } = await import("./idb");
    const db = await getIDB();
    await (db as unknown as { put(s: string, v: Contraparte): Promise<void> }).put("contrapartes", c);
  } catch { /* offline */ }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function listContrapartes(): Promise<Contraparte[]> {
  if (typeof window === "undefined") return [];
  try {
    const res = await fetch(API);
    if (!res.ok) throw new Error("api");
    const json = await res.json() as { success: boolean; data: Contraparte[] };
    return json.data;
  } catch {
    return idbAll();
  }
}

export async function getContraparte(id: string): Promise<Contraparte | undefined> {
  if (typeof window === "undefined") return undefined;
  try {
    const res = await fetch(`${API}?id=${encodeURIComponent(id)}`);
    if (!res.ok) return idbGet(id);
    const json = await res.json() as { success: boolean; data: Contraparte };
    return json.data;
  } catch {
    return idbGet(id);
  }
}

export async function searchContrapartes(
  query: string,
  filters?: { papel?: ContraprtePapel | "all"; bu?: string; status?: string }
): Promise<Contraparte[]> {
  if (typeof window === "undefined") return [];
  try {
    const sp = new URLSearchParams();
    if (query)                                        sp.set("q",      query);
    if (filters?.papel  && filters.papel  !== "all") sp.set("papel",  filters.papel);
    if (filters?.bu     && filters.bu     !== "all") sp.set("bu",     filters.bu);
    if (filters?.status && filters.status !== "all") sp.set("status", filters.status);
    const res = await fetch(`${API}?${sp.toString()}`);
    if (!res.ok) throw new Error("api");
    const json = await res.json() as { success: boolean; data: Contraparte[] };
    return json.data;
  } catch {
    const all = await idbAll();
    const q   = query.toLowerCase().trim();
    return all.filter((c) => {
      if (filters?.papel  && filters.papel  !== "all" && c.papel  !== filters.papel)  return false;
      if (filters?.bu     && filters.bu     !== "all" && c.bu     !== filters.bu)     return false;
      if (filters?.status && filters.status !== "all" && c.status !== filters.status) return false;
      if (!q) return true;
      return [c.razaoSocial, c.nomeFantasia, c.cnpjCpf, c.emailFinanceiro]
        .filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createContraparte(
  data: Omit<Contraparte, "id" | "createdAt" | "updatedAt" | "deletedAt">
): Promise<Contraparte> {
  const c: Contraparte = { ...data, id: uid(), createdAt: iso(), updatedAt: iso() };
  await idbPut(c); // optimistic local write
  fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "upsert", contraparte: c }),
  }).catch(() => { /* keep IDB value as fallback */ });
  return c;
}

export async function updateContraparte(
  id: string,
  patch: Partial<Omit<Contraparte, "id" | "createdAt">>
): Promise<Contraparte> {
  const prev = await getContraparte(id);
  if (!prev) throw new Error(`Contraparte ${id} not found`);
  const updated: Contraparte = { ...prev, ...patch, updatedAt: iso() };
  await idbPut(updated); // optimistic
  fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "upsert", contraparte: updated }),
  }).catch(() => { /* keep IDB value */ });
  return updated;
}

export async function softDeleteContraparte(id: string): Promise<void> {
  await updateContraparte(id, { deletedAt: iso(), status: "inativo" });
  fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "soft_delete", id }),
  }).catch(() => { /* keep IDB value */ });
}
