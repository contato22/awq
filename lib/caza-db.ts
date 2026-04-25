// ─── Caza Vision — Internal Database Layer ────────────────────────────────────
//
// SOURCE OF TRUTH: Neon Postgres (Vercel deployment).
// Notion is import-only — never queried at runtime by this module.
//
// Tables:
//   caza_projects  — production projects
//   caza_clients   — client register

import { sql } from "@/lib/db";
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
  if (!sql) return;

  await sql`
    CREATE TABLE IF NOT EXISTS caza_projects (
      id                    TEXT PRIMARY KEY,
      titulo                TEXT NOT NULL DEFAULT '',
      cliente               TEXT NOT NULL DEFAULT '',
      tipo                  TEXT NOT NULL DEFAULT '',
      status                TEXT NOT NULL DEFAULT 'Em Produção',
      prioridade            TEXT NOT NULL DEFAULT '',
      diretor               TEXT NOT NULL DEFAULT '',
      prazo                 TEXT NOT NULL DEFAULT '',
      inicio                TEXT NOT NULL DEFAULT '',
      valor                 NUMERIC NOT NULL DEFAULT 0,
      alimentacao           NUMERIC NOT NULL DEFAULT 0,
      gasolina              NUMERIC NOT NULL DEFAULT 0,
      despesas              NUMERIC NOT NULL DEFAULT 0,
      lucro                 NUMERIC NOT NULL DEFAULT 0,
      recebido              BOOLEAN NOT NULL DEFAULT false,
      recebimento           TEXT NOT NULL DEFAULT '',
      imported_from_notion  BOOLEAN NOT NULL DEFAULT false,
      notion_page_id        TEXT,
      imported_at           TEXT,
      last_internal_update  TEXT NOT NULL,
      sync_status           TEXT NOT NULL DEFAULT 'internal'
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS caza_clients (
      id                    TEXT PRIMARY KEY,
      name                  TEXT NOT NULL DEFAULT '',
      email                 TEXT NOT NULL DEFAULT '',
      phone                 TEXT NOT NULL DEFAULT '',
      type                  TEXT NOT NULL DEFAULT 'Marca',
      budget_anual          NUMERIC NOT NULL DEFAULT 0,
      status                TEXT NOT NULL DEFAULT 'Ativo',
      segmento              TEXT NOT NULL DEFAULT '',
      since                 TEXT NOT NULL DEFAULT '',
      cnpj                  TEXT NOT NULL DEFAULT '',
      contato_nome          TEXT NOT NULL DEFAULT '',
      contato_cargo         TEXT NOT NULL DEFAULT '',
      modelo_contrato       TEXT NOT NULL DEFAULT '',
      owner                 TEXT NOT NULL DEFAULT '',
      health_score          NUMERIC NOT NULL DEFAULT 80,
      nps                   NUMERIC,
      observacoes           TEXT NOT NULL DEFAULT '',
      imported_from_notion  BOOLEAN NOT NULL DEFAULT false,
      notion_page_id        TEXT,
      imported_at           TEXT,
      last_internal_update  TEXT NOT NULL,
      sync_status           TEXT NOT NULL DEFAULT 'internal'
    )
  `;

  // Additive migration — safe on existing tables
  await sql`ALTER TABLE caza_clients ADD COLUMN IF NOT EXISTS cnpj TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE caza_clients ADD COLUMN IF NOT EXISTS contato_nome TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE caza_clients ADD COLUMN IF NOT EXISTS contato_cargo TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE caza_clients ADD COLUMN IF NOT EXISTS modelo_contrato TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE caza_clients ADD COLUMN IF NOT EXISTS owner TEXT NOT NULL DEFAULT ''`;
  await sql`ALTER TABLE caza_clients ADD COLUMN IF NOT EXISTS health_score NUMERIC NOT NULL DEFAULT 80`;
  await sql`ALTER TABLE caza_clients ADD COLUMN IF NOT EXISTS nps NUMERIC`;
  await sql`ALTER TABLE caza_clients ADD COLUMN IF NOT EXISTS observacoes TEXT NOT NULL DEFAULT ''`;

  await sql`CREATE INDEX IF NOT EXISTS idx_caza_proj_recebido ON caza_projects(recebido)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_caza_proj_prazo    ON caza_projects(prazo)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_caza_cli_status    ON caza_clients(status)`;
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
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM caza_projects ORDER BY prazo DESC NULLS LAST, titulo ASC
  `;
  return rows.map(coerceProject);
}

export async function getProject(id: string): Promise<CazaProject | null> {
  if (!sql) return null;
  const rows = await sql`SELECT * FROM caza_projects WHERE id = ${id}`;
  return rows[0] ? coerceProject(rows[0]) : null;
}

export async function upsertProject(
  p: Omit<CazaProject, "last_internal_update">
): Promise<CazaProject> {
  if (!sql) throw new Error("DB not available");
  const now = new Date().toISOString();
  const rows = await sql`
    INSERT INTO caza_projects (
      id, titulo, cliente, tipo, status, prioridade, diretor,
      prazo, inicio, valor, alimentacao, gasolina, despesas, lucro,
      recebido, recebimento,
      imported_from_notion, notion_page_id, imported_at,
      last_internal_update, sync_status
    ) VALUES (
      ${p.id}, ${p.titulo}, ${p.cliente}, ${p.tipo}, ${p.status},
      ${p.prioridade}, ${p.diretor}, ${p.prazo}, ${p.inicio},
      ${p.valor}, ${p.alimentacao}, ${p.gasolina}, ${p.despesas}, ${p.lucro},
      ${p.recebido}, ${p.recebimento},
      ${p.imported_from_notion}, ${p.notion_page_id ?? null}, ${p.imported_at ?? null},
      ${now}, ${p.sync_status}
    )
    ON CONFLICT (id) DO UPDATE SET
      titulo               = EXCLUDED.titulo,
      cliente              = EXCLUDED.cliente,
      tipo                 = EXCLUDED.tipo,
      status               = EXCLUDED.status,
      prioridade           = EXCLUDED.prioridade,
      diretor              = EXCLUDED.diretor,
      prazo                = EXCLUDED.prazo,
      inicio               = EXCLUDED.inicio,
      valor                = EXCLUDED.valor,
      alimentacao          = EXCLUDED.alimentacao,
      gasolina             = EXCLUDED.gasolina,
      despesas             = EXCLUDED.despesas,
      lucro                = EXCLUDED.lucro,
      recebido             = EXCLUDED.recebido,
      recebimento          = EXCLUDED.recebimento,
      last_internal_update = ${now},
      sync_status          = EXCLUDED.sync_status
    RETURNING *
  `;
  return coerceProject(rows[0]);
}

export async function updateProject(
  id: string,
  updates: Partial<Omit<CazaProject, "id" | "imported_from_notion" | "notion_page_id" | "imported_at">>
): Promise<CazaProject | null> {
  if (!sql) return null;
  const now = new Date().toISOString();
  const existing = await getProject(id);
  if (!existing) return null;
  const m = { ...existing, ...updates };
  const rows = await sql`
    UPDATE caza_projects SET
      titulo               = ${m.titulo},
      cliente              = ${m.cliente},
      tipo                 = ${m.tipo},
      status               = ${m.status},
      prioridade           = ${m.prioridade},
      diretor              = ${m.diretor},
      prazo                = ${m.prazo},
      inicio               = ${m.inicio},
      valor                = ${m.valor},
      alimentacao          = ${m.alimentacao},
      gasolina             = ${m.gasolina},
      despesas             = ${m.despesas},
      lucro                = ${m.lucro},
      recebido             = ${m.recebido},
      recebimento          = ${m.recebimento},
      last_internal_update = ${now},
      sync_status          = 'modified'
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? coerceProject(rows[0]) : null;
}

export async function deleteProject(id: string): Promise<boolean> {
  if (!sql) return false;
  await sql`DELETE FROM caza_projects WHERE id = ${id}`;
  return true;
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function listClients(): Promise<CazaClient[]> {
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM caza_clients ORDER BY name ASC
  `;
  return rows.map(coerceClient);
}

export async function getClient(id: string): Promise<CazaClient | null> {
  if (!sql) return null;
  const rows = await sql`SELECT * FROM caza_clients WHERE id = ${id}`;
  return rows[0] ? coerceClient(rows[0]) : null;
}

export async function upsertClient(
  c: Omit<CazaClient, "last_internal_update">
): Promise<CazaClient> {
  if (!sql) throw new Error("DB not available");
  const now = new Date().toISOString();
  const rows = await sql`
    INSERT INTO caza_clients (
      id, name, email, phone, type, budget_anual, status, segmento, since,
      cnpj, contato_nome, contato_cargo, modelo_contrato, owner,
      health_score, nps, observacoes,
      imported_from_notion, notion_page_id, imported_at,
      last_internal_update, sync_status
    ) VALUES (
      ${c.id}, ${c.name}, ${c.email}, ${c.phone}, ${c.type},
      ${c.budget_anual}, ${c.status}, ${c.segmento}, ${c.since},
      ${c.cnpj ?? ""}, ${c.contato_nome ?? ""}, ${c.contato_cargo ?? ""},
      ${c.modelo_contrato ?? ""}, ${c.owner ?? ""},
      ${c.health_score ?? 80}, ${c.nps ?? null}, ${c.observacoes ?? ""},
      ${c.imported_from_notion}, ${c.notion_page_id ?? null}, ${c.imported_at ?? null},
      ${now}, ${c.sync_status}
    )
    ON CONFLICT (id) DO UPDATE SET
      name                 = EXCLUDED.name,
      email                = EXCLUDED.email,
      phone                = EXCLUDED.phone,
      type                 = EXCLUDED.type,
      budget_anual         = EXCLUDED.budget_anual,
      status               = EXCLUDED.status,
      segmento             = EXCLUDED.segmento,
      since                = EXCLUDED.since,
      cnpj                 = EXCLUDED.cnpj,
      contato_nome         = EXCLUDED.contato_nome,
      contato_cargo        = EXCLUDED.contato_cargo,
      modelo_contrato      = EXCLUDED.modelo_contrato,
      owner                = EXCLUDED.owner,
      health_score         = EXCLUDED.health_score,
      nps                  = EXCLUDED.nps,
      observacoes          = EXCLUDED.observacoes,
      last_internal_update = ${now},
      sync_status          = EXCLUDED.sync_status
    RETURNING *
  `;
  return coerceClient(rows[0]);
}

export async function updateClient(
  id: string,
  updates: Partial<Omit<CazaClient, "id" | "imported_from_notion" | "notion_page_id" | "imported_at">>
): Promise<CazaClient | null> {
  if (!sql) return null;
  const now = new Date().toISOString();
  const existing = await getClient(id);
  if (!existing) return null;
  const m = { ...existing, ...updates };
  const rows = await sql`
    UPDATE caza_clients SET
      name                 = ${m.name},
      email                = ${m.email},
      phone                = ${m.phone},
      type                 = ${m.type},
      budget_anual         = ${m.budget_anual},
      status               = ${m.status},
      segmento             = ${m.segmento},
      since                = ${m.since},
      cnpj                 = ${m.cnpj ?? ""},
      contato_nome         = ${m.contato_nome ?? ""},
      contato_cargo        = ${m.contato_cargo ?? ""},
      modelo_contrato      = ${m.modelo_contrato ?? ""},
      owner                = ${m.owner ?? ""},
      health_score         = ${m.health_score ?? 80},
      nps                  = ${m.nps ?? null},
      observacoes          = ${m.observacoes ?? ""},
      last_internal_update = ${now},
      sync_status          = 'modified'
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? coerceClient(rows[0]) : null;
}

export async function deleteClient(id: string): Promise<boolean> {
  if (!sql) return false;
  await sql`DELETE FROM caza_clients WHERE id = ${id}`;
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
