// ─── Caza Vision — Internal Database Layer ────────────────────────────────────
//
// SOURCE OF TRUTH: Supabase Postgres (service role, server-side only).
// Notion is import-only — never queried at runtime by this module.
//
// Tables:
//   caza_projects  — production projects
//   caza_clients   — client register

import { supabase } from "@/lib/supabase";
import { randomUUID } from "crypto";

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

export async function initCazaDB(): Promise<void> {
  // Tables and additive migrations are handled via SQL migration — nothing to do at runtime.
}

// ─── ID helpers ───────────────────────────────────────────────────────────────

export function newProjectId() {
  return `CV-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export function newClientId() {
  return `CL-${randomUUID().slice(0, 8).toUpperCase()}`;
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function listProjects(): Promise<CazaProject[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("caza_projects")
    .select("*")
    .order("prazo", { ascending: false })
    .order("titulo", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(coerceProject);
}

export async function getProject(id: string): Promise<CazaProject | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("caza_projects")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null; // row not found
    throw error;
  }
  return data ? coerceProject(data) : null;
}

export async function upsertProject(
  p: Omit<CazaProject, "last_internal_update">
): Promise<CazaProject> {
  if (!supabase) throw new Error("DB not available");
  const now = new Date().toISOString();
  const row = {
    id:                   p.id,
    titulo:               p.titulo,
    cliente:              p.cliente,
    tipo:                 p.tipo,
    status:               p.status,
    prioridade:           p.prioridade,
    diretor:              p.diretor,
    prazo:                p.prazo,
    inicio:               p.inicio,
    valor:                p.valor,
    alimentacao:          p.alimentacao,
    gasolina:             p.gasolina,
    despesas:             p.despesas,
    lucro:                p.lucro,
    recebido:             p.recebido,
    recebimento:          p.recebimento,
    imported_from_notion: p.imported_from_notion,
    notion_page_id:       p.notion_page_id ?? null,
    imported_at:          p.imported_at ?? null,
    last_internal_update: now,
    sync_status:          p.sync_status,
  };
  const { data, error } = await supabase
    .from("caza_projects")
    .upsert(row, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return coerceProject(data);
}

export async function updateProject(
  id: string,
  updates: Partial<Omit<CazaProject, "id" | "imported_from_notion" | "notion_page_id" | "imported_at">>
): Promise<CazaProject | null> {
  if (!supabase) return null;
  const now = new Date().toISOString();
  const existing = await getProject(id);
  if (!existing) return null;
  const m = { ...existing, ...updates };
  const { data, error } = await supabase
    .from("caza_projects")
    .update({
      titulo:               m.titulo,
      cliente:              m.cliente,
      tipo:                 m.tipo,
      status:               m.status,
      prioridade:           m.prioridade,
      diretor:              m.diretor,
      prazo:                m.prazo,
      inicio:               m.inicio,
      valor:                m.valor,
      alimentacao:          m.alimentacao,
      gasolina:             m.gasolina,
      despesas:             m.despesas,
      lucro:                m.lucro,
      recebido:             m.recebido,
      recebimento:          m.recebimento,
      last_internal_update: now,
      sync_status:          "modified",
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data ? coerceProject(data) : null;
}

export async function deleteProject(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("caza_projects")
    .delete()
    .eq("id", id);
  if (error) throw error;
  return true;
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function listClients(): Promise<CazaClient[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("caza_clients")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(coerceClient);
}

export async function getClient(id: string): Promise<CazaClient | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("caza_clients")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null; // row not found
    throw error;
  }
  return data ? coerceClient(data) : null;
}

export async function upsertClient(
  c: Omit<CazaClient, "last_internal_update">
): Promise<CazaClient> {
  if (!supabase) throw new Error("DB not available");
  const now = new Date().toISOString();
  const row = {
    id:                   c.id,
    name:                 c.name,
    email:                c.email,
    phone:                c.phone,
    type:                 c.type,
    budget_anual:         c.budget_anual,
    status:               c.status,
    segmento:             c.segmento,
    since:                c.since,
    cnpj:                 c.cnpj ?? "",
    contato_nome:         c.contato_nome ?? "",
    contato_cargo:        c.contato_cargo ?? "",
    modelo_contrato:      c.modelo_contrato ?? "",
    owner:                c.owner ?? "",
    health_score:         c.health_score ?? 80,
    nps:                  c.nps ?? null,
    observacoes:          c.observacoes ?? "",
    imported_from_notion: c.imported_from_notion,
    notion_page_id:       c.notion_page_id ?? null,
    imported_at:          c.imported_at ?? null,
    last_internal_update: now,
    sync_status:          c.sync_status,
  };
  const { data, error } = await supabase
    .from("caza_clients")
    .upsert(row, { onConflict: "id" })
    .select()
    .single();
  if (error) throw error;
  return coerceClient(data);
}

export async function updateClient(
  id: string,
  updates: Partial<Omit<CazaClient, "id" | "imported_from_notion" | "notion_page_id" | "imported_at">>
): Promise<CazaClient | null> {
  if (!supabase) return null;
  const now = new Date().toISOString();
  const existing = await getClient(id);
  if (!existing) return null;
  const m = { ...existing, ...updates };
  const { data, error } = await supabase
    .from("caza_clients")
    .update({
      name:                 m.name,
      email:                m.email,
      phone:                m.phone,
      type:                 m.type,
      budget_anual:         m.budget_anual,
      status:               m.status,
      segmento:             m.segmento,
      since:                m.since,
      cnpj:                 m.cnpj ?? "",
      contato_nome:         m.contato_nome ?? "",
      contato_cargo:        m.contato_cargo ?? "",
      modelo_contrato:      m.modelo_contrato ?? "",
      owner:                m.owner ?? "",
      health_score:         m.health_score ?? 80,
      nps:                  m.nps ?? null,
      observacoes:          m.observacoes ?? "",
      last_internal_update: now,
      sync_status:          "modified",
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data ? coerceClient(data) : null;
}

export async function deleteClient(id: string): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from("caza_clients")
    .delete()
    .eq("id", id);
  if (error) throw error;
  return true;
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
