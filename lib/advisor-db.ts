// ─── Advisor — Internal Database Layer ────────────────────────────────────────
//
// SOURCE OF TRUTH: Neon Postgres (Vercel deployment).
//
// Tables:
//   advisor_clients   — client register (consultoria / gestão patrimonial)

import { sql } from "@/lib/db";
import { randomUUID } from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdvisorClient {
  id: string;
  name: string;
  segmento: string;
  tipo_servico: string;
  aum: number;               // Assets under management (R$)
  fee_mensal: number;        // Monthly advisory fee (R$)
  status: string;            // "Ativo" | "Em Negociação" | "Pausado" | "Encerrado"
  since: string;             // ISO date YYYY-MM-DD
  responsavel: string;       // AWQ advisor in charge
  contato_email: string;
  contato_phone: string;
  nps: number | null;
  // Origin metadata
  imported_from_notion: boolean;
  notion_page_id: string | null;
  imported_at: string | null;
  last_internal_update: string;
  sync_status: "internal" | "imported" | "modified";
}

// ─── Schema bootstrap ─────────────────────────────────────────────────────────

export async function initAdvisorDB(): Promise<void> {
  if (!sql) return;

  await sql`
    CREATE TABLE IF NOT EXISTS advisor_clients (
      id                    TEXT PRIMARY KEY,
      name                  TEXT NOT NULL DEFAULT '',
      segmento              TEXT NOT NULL DEFAULT '',
      tipo_servico          TEXT NOT NULL DEFAULT '',
      aum                   NUMERIC NOT NULL DEFAULT 0,
      fee_mensal            NUMERIC NOT NULL DEFAULT 0,
      status                TEXT NOT NULL DEFAULT 'Ativo',
      since                 TEXT NOT NULL DEFAULT '',
      responsavel           TEXT NOT NULL DEFAULT '',
      contato_email         TEXT NOT NULL DEFAULT '',
      contato_phone         TEXT NOT NULL DEFAULT '',
      nps                   NUMERIC,
      imported_from_notion  BOOLEAN NOT NULL DEFAULT false,
      notion_page_id        TEXT,
      imported_at           TEXT,
      last_internal_update  TEXT NOT NULL,
      sync_status           TEXT NOT NULL DEFAULT 'internal'
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_advisor_cli_status ON advisor_clients(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_advisor_cli_since  ON advisor_clients(since)`;
}

// ─── ID helpers ───────────────────────────────────────────────────────────────

export function newAdvisorClientId() {
  return `ADV-${randomUUID().slice(0, 8).toUpperCase()}`;
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function listAdvisorClients(): Promise<AdvisorClient[]> {
  if (!sql) return [];
  const rows = await sql`
    SELECT * FROM advisor_clients ORDER BY name ASC
  `;
  return rows.map(coerceClient);
}

export async function getAdvisorClient(id: string): Promise<AdvisorClient | null> {
  if (!sql) return null;
  const rows = await sql`SELECT * FROM advisor_clients WHERE id = ${id}`;
  return rows[0] ? coerceClient(rows[0]) : null;
}

export async function upsertAdvisorClient(
  c: Omit<AdvisorClient, "last_internal_update">
): Promise<AdvisorClient> {
  if (!sql) throw new Error("DB not available");
  const now = new Date().toISOString();
  const rows = await sql`
    INSERT INTO advisor_clients (
      id, name, segmento, tipo_servico, aum, fee_mensal, status, since,
      responsavel, contato_email, contato_phone, nps,
      imported_from_notion, notion_page_id, imported_at,
      last_internal_update, sync_status
    ) VALUES (
      ${c.id}, ${c.name}, ${c.segmento}, ${c.tipo_servico},
      ${c.aum}, ${c.fee_mensal}, ${c.status}, ${c.since},
      ${c.responsavel}, ${c.contato_email}, ${c.contato_phone},
      ${c.nps ?? null},
      ${c.imported_from_notion}, ${c.notion_page_id ?? null}, ${c.imported_at ?? null},
      ${now}, ${c.sync_status}
    )
    ON CONFLICT (id) DO UPDATE SET
      name                 = EXCLUDED.name,
      segmento             = EXCLUDED.segmento,
      tipo_servico         = EXCLUDED.tipo_servico,
      aum                  = EXCLUDED.aum,
      fee_mensal           = EXCLUDED.fee_mensal,
      status               = EXCLUDED.status,
      since                = EXCLUDED.since,
      responsavel          = EXCLUDED.responsavel,
      contato_email        = EXCLUDED.contato_email,
      contato_phone        = EXCLUDED.contato_phone,
      nps                  = EXCLUDED.nps,
      last_internal_update = ${now},
      sync_status          = EXCLUDED.sync_status
    RETURNING *
  `;
  if (!rows[0]) throw new Error("upsertAdvisorClient: no row returned");
  return coerceClient(rows[0]);
}

export async function updateAdvisorClient(
  id: string,
  updates: Partial<Omit<AdvisorClient, "id" | "imported_from_notion" | "notion_page_id" | "imported_at">>
): Promise<AdvisorClient | null> {
  if (!sql) return null;
  const now = new Date().toISOString();
  const existing = await getAdvisorClient(id);
  if (!existing) return null;
  const m = { ...existing, ...updates };
  const rows = await sql`
    UPDATE advisor_clients SET
      name                 = ${m.name},
      segmento             = ${m.segmento},
      tipo_servico         = ${m.tipo_servico},
      aum                  = ${m.aum},
      fee_mensal           = ${m.fee_mensal},
      status               = ${m.status},
      since                = ${m.since},
      responsavel          = ${m.responsavel},
      contato_email        = ${m.contato_email},
      contato_phone        = ${m.contato_phone},
      nps                  = ${m.nps ?? null},
      last_internal_update = ${now},
      sync_status          = 'modified'
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ? coerceClient(rows[0]) : null;
}

export async function deleteAdvisorClient(id: string): Promise<boolean> {
  if (!sql) return false;
  await sql`DELETE FROM advisor_clients WHERE id = ${id}`;
  return true;
}

// ─── Coercions (DB rows → typed objects) ──────────────────────────────────────

function coerceClient(r: Record<string, unknown>): AdvisorClient {
  return {
    id:                   String(r.id ?? ""),
    name:                 String(r.name ?? ""),
    segmento:             String(r.segmento ?? ""),
    tipo_servico:         String(r.tipo_servico ?? ""),
    aum:                  Number(r.aum ?? 0),
    fee_mensal:           Number(r.fee_mensal ?? 0),
    status:               String(r.status ?? "Ativo"),
    since:                String(r.since ?? ""),
    responsavel:          String(r.responsavel ?? ""),
    contato_email:        String(r.contato_email ?? ""),
    contato_phone:        String(r.contato_phone ?? ""),
    nps:                  r.nps != null ? Number(r.nps) : null,
    imported_from_notion: Boolean(r.imported_from_notion),
    notion_page_id:       r.notion_page_id != null ? String(r.notion_page_id) : null,
    imported_at:          r.imported_at != null ? String(r.imported_at) : null,
    last_internal_update: String(r.last_internal_update ?? ""),
    sync_status:          (r.sync_status as AdvisorClient["sync_status"]) ?? "internal",
  };
}
