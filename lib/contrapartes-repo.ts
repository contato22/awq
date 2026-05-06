// ─── Contrapartes — repository ────────────────────────────────────────────────
// Data access layer. All UI components import from here.
// Storage: Neon Postgres via /api/awq/contrapartes (cross-device persistent).

import type { Contraparte, ContraprtePapel } from "./contraparte-types";

function uid(): string {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function listContrapartes(
  filters?: { papel?: ContraprtePapel | "all"; bu?: string; status?: string; q?: string }
): Promise<Contraparte[]> {
  const params = new URLSearchParams();
  if (filters?.papel  && filters.papel  !== "all") params.set("papel",  filters.papel);
  if (filters?.bu     && filters.bu     !== "all") params.set("bu",     filters.bu);
  if (filters?.status && filters.status !== "all") params.set("status", filters.status);
  if (filters?.q) params.set("q", filters.q);

  const res = await fetch(`/api/awq/contrapartes?${params}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getContraparte(id: string): Promise<Contraparte | undefined> {
  const all = await listContrapartes();
  return all.find((c) => c.id === id);
}

export async function searchContrapartes(
  query: string,
  filters?: { papel?: ContraprtePapel | "all"; bu?: string; status?: string }
): Promise<Contraparte[]> {
  return listContrapartes({ ...filters, q: query });
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createContraparte(
  data: Omit<Contraparte, "id" | "createdAt" | "updatedAt" | "deletedAt">
): Promise<Contraparte> {
  const payload = { ...data, id: uid() };
  const res = await fetch("/api/awq/contrapartes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create contraparte");
  return res.json();
}

export async function updateContraparte(
  id: string,
  patch: Partial<Omit<Contraparte, "id" | "createdAt">>
): Promise<Contraparte> {
  const res = await fetch(`/api/awq/contrapartes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Contraparte ${id} not found`);
  return res.json();
}

export async function softDeleteContraparte(id: string): Promise<void> {
  await fetch(`/api/awq/contrapartes/${id}`, { method: "DELETE" });
}
