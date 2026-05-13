// ─── Caza Vision — Internal Database Layer ────────────────────────────────────
//
// SOURCE OF TRUTH: Supabase Postgres.
// Notion is import-only — never queried at runtime by this module.
//
// Tables:
//   caza_projects  — production projects
//   caza_clients   — client register

import { getSupabaseAdmin } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CazaProject {
  id: string;
  titulo: string;
  cliente: string;
  tipo: string;
  status: string;
  prioridade: string;
  diretor: string;
  prazo: string;            // ISO date or month label (YYYY-MM-DD)
  inicio: string;
  valor: number;
  alimentacao: number;
  gasolina: number;
  despesas: number;
  lucro: number;
  recebido: boolean;
  recebimento: string;
  // Origin metadata
  imported_from_notion: boolean;
  notion_page_id: string | null;
  imported_at: string | null;
  last_internal_update: string;
  sync_status: "internal" | "imported" | "modified";
}

export interface CazaClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: string;
  budget_anual: number;
  status: string;
  segmento: string;
  since: string;
  // Account management (post-purchase)
  cnpj?: string;
  contato_nome?: string;
  contato_cargo?: string;
  modelo_contrato?: string;
  owner?: string;
  health_score?: number;
  nps?: number | null;
  observacoes?: string;
  // Origin metadata
  imported_from_notion: boolean;
  notion_page_id: string | null;
  imported_at: string | null;
  last_internal_update: string;
  sync_status: "internal" | "imported" | "modified";
}

export interface ImportSummary {
  projects_imported: number;
  projects_skipped: number;
  projects_conflicts: string[];
  clients_imported: number;
  clients_skipped: number;
  clients_conflicts: string[];
  errors: string[];
  imported_at: string;
}

// ─── Schema bootstrap ─────────────────────────────────────────────────────────

export async function initCazaDB(): Promise<void> {}

// ─── ID helpers ───────────────────────────────────────────────────────────────

export function newProjectId() {
  return `CV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

export function newClientId() {
  return `CL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function listProjects(): Promise<CazaProject[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data } = await sb
    .from("caza_projects")
    .select("*")
    .order("prazo", { ascending: false })
    .order("titulo", { ascending: true });
  return (data ?? []).map(coerceProject);
}

export async function getProject(id: string): Promise<CazaProject | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data: row } = await sb.from("caza_projects").select("*").eq("id", id).single();
  return row ? coerceProject(row) : null;
}

export async function upsertProject(
  p: Omit<CazaProject, "last_internal_update">
): Promise<CazaProject> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("DB not available");
  const now = new Date().toISOString();
  const { data: row, error } = await sb
    .from("caza_projects")
    .upsert({ ...p, last_internal_update: now }, { onConflict: "id" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return coerceProject(row);
}

export async function updateProject(
  id: string,
  updates: Partial<Omit<CazaProject, "id" | "imported_from_notion" | "notion_page_id" | "imported_at">>
): Promise<CazaProject | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const now = new Date().toISOString();
  const existing = await getProject(id);
  if (!existing) return null;
  const patch = { ...updates, last_internal_update: now, sync_status: "modified" as const };
  const { data: row, error } = await sb
    .from("caza_projects")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) return null;
  return coerceProject(row);
}

export async function deleteProject(id: string): Promise<boolean> {
  const sb = getSupabaseAdmin();
  if (!sb) return false;
  const { error } = await sb.from("caza_projects").delete().eq("id", id);
  return !error;
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function listClients(): Promise<CazaClient[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];
  const { data } = await sb.from("caza_clients").select("*").order("name", { ascending: true });
  return (data ?? []).map(coerceClient);
}

export async function getClient(id: string): Promise<CazaClient | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const { data: row } = await sb.from("caza_clients").select("*").eq("id", id).single();
  return row ? coerceClient(row) : null;
}

export async function upsertClient(
  c: Omit<CazaClient, "last_internal_update">
): Promise<CazaClient> {
  const sb = getSupabaseAdmin();
  if (!sb) throw new Error("DB not available");
  const now = new Date().toISOString();
  const { data: row, error } = await sb
    .from("caza_clients")
    .upsert({ ...c, last_internal_update: now }, { onConflict: "id" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return coerceClient(row);
}

export async function updateClient(
  id: string,
  updates: Partial<Omit<CazaClient, "id" | "imported_from_notion" | "notion_page_id" | "imported_at">>
): Promise<CazaClient | null> {
  const sb = getSupabaseAdmin();
  if (!sb) return null;
  const now = new Date().toISOString();
  const existing = await getClient(id);
  if (!existing) return null;
  const patch = { ...updates, last_internal_update: now, sync_status: "modified" as const };
  const { data: row, error } = await sb
    .from("caza_clients")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) return null;
  return coerceClient(row);
}

export async function deleteClient(id: string): Promise<boolean> {
  const sb = getSupabaseAdmin();
  if (!sb) return false;
  const { error } = await sb.from("caza_clients").delete().eq("id", id);
  return !error;
}

// ─── Coercions (DB rows → typed objects) ──────────────────────────────────────

function coerceProject(r: Record<string, unknown>): CazaProject {
  return {
    id:                   String(r.id ?? ""),
    titulo:               String(r.titulo ?? ""),
    cliente:              String(r.cliente ?? ""),
    tipo:                 String(r.tipo ?? ""),
    status:               String(r.status ?? ""),
    prioridade:           String(r.prioridade ?? ""),
    diretor:              String(r.diretor ?? ""),
    prazo:                String(r.prazo ?? ""),
    inicio:               String(r.inicio ?? ""),
    valor:                Number(r.valor ?? 0),
    alimentacao:          Number(r.alimentacao ?? 0),
    gasolina:             Number(r.gasolina ?? 0),
    despesas:             Number(r.despesas ?? 0),
    lucro:                Number(r.lucro ?? 0),
    recebido:             Boolean(r.recebido),
    recebimento:          String(r.recebimento ?? ""),
    imported_from_notion: Boolean(r.imported_from_notion),
    notion_page_id:       r.notion_page_id != null ? String(r.notion_page_id) : null,
    imported_at:          r.imported_at != null ? String(r.imported_at) : null,
    last_internal_update: String(r.last_internal_update ?? ""),
    sync_status:          (r.sync_status as CazaProject["sync_status"]) ?? "internal",
  };
}

function coerceClient(r: Record<string, unknown>): CazaClient {
  return {
    id:                   String(r.id ?? ""),
    name:                 String(r.name ?? ""),
    email:                String(r.email ?? ""),
    phone:                String(r.phone ?? ""),
    type:                 String(r.type ?? "Marca"),
    budget_anual:         Number(r.budget_anual ?? 0),
    status:               String(r.status ?? "Ativo"),
    segmento:             String(r.segmento ?? ""),
    since:                String(r.since ?? ""),
    cnpj:                 String(r.cnpj ?? ""),
    contato_nome:         String(r.contato_nome ?? ""),
    contato_cargo:        String(r.contato_cargo ?? ""),
    modelo_contrato:      String(r.modelo_contrato ?? ""),
    owner:                String(r.owner ?? ""),
    health_score:         Number(r.health_score ?? 80),
    nps:                  r.nps != null ? Number(r.nps) : null,
    observacoes:          String(r.observacoes ?? ""),
    imported_from_notion: Boolean(r.imported_from_notion),
    notion_page_id:       r.notion_page_id != null ? String(r.notion_page_id) : null,
    imported_at:          r.imported_at != null ? String(r.imported_at) : null,
    last_internal_update: String(r.last_internal_update ?? ""),
    sync_status:          (r.sync_status as CazaClient["sync_status"]) ?? "internal",
  };
}
