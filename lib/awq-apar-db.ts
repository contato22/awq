// ─── AWQ AP/AR Manual Items — Database Layer ──────────────────────────────────
//
// Stores the simplified manual AP/AR items created via the /awq/ap-ar UI.
// Distinct from lib/ap-ar-db.ts (EPM full AP/AR with installments, tax etc).
//
// STORAGE:
//   DATABASE_URL set  → Supabase Postgres (awq_ap_ar_items)
//   DATABASE_URL unset → returns [] (client uses localStorage as fallback)

import { sql } from "./db";

export interface APARManualItem {
  id:                   string;
  type:                 "ap" | "ar";
  bu:                   string;
  description:          string;
  entity:               string;
  amount:               number;
  due_date:             string;
  status:               "pending" | "overdue" | "settled";
  category:             string;
  created_at:           string;
  financial_link_status?: string | null;
  financial_link_note?:  string | null;
  financial_link_source?: string | null;
}

let _ready = false;

export async function initAWQAPARDB(): Promise<void> {
  if (!sql || _ready) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS awq_ap_ar_items (
        id                    TEXT PRIMARY KEY,
        type                  TEXT NOT NULL,
        bu                    TEXT NOT NULL,
        description           TEXT NOT NULL,
        entity                TEXT NOT NULL,
        amount                NUMERIC NOT NULL,
        due_date              TEXT NOT NULL,
        status                TEXT NOT NULL DEFAULT 'pending',
        category              TEXT NOT NULL,
        created_at            TEXT NOT NULL,
        financial_link_status TEXT,
        financial_link_note   TEXT,
        financial_link_source TEXT,
        updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_awq_apar_type   ON awq_ap_ar_items(type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_awq_apar_bu     ON awq_ap_ar_items(bu)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_awq_apar_status ON awq_ap_ar_items(status)`;
    _ready = true;
  } catch { /* DB unavailable — client falls back to localStorage */ }
}

function rowToItem(r: Record<string, unknown>): APARManualItem {
  return {
    id:                   r.id as string,
    type:                 r.type as "ap" | "ar",
    bu:                   r.bu as string,
    description:          r.description as string,
    entity:               r.entity as string,
    amount:               Number(r.amount),
    due_date:             r.due_date as string,
    status:               r.status as APARManualItem["status"],
    category:             r.category as string,
    created_at:           r.created_at as string,
    financial_link_status: (r.financial_link_status as string) ?? null,
    financial_link_note:   (r.financial_link_note   as string) ?? null,
    financial_link_source: (r.financial_link_source as string) ?? null,
  };
}

export async function getAllAPARItems(): Promise<APARManualItem[]> {
  await initAWQAPARDB();
  if (!sql) return [];
  const rows = await sql`SELECT * FROM awq_ap_ar_items ORDER BY due_date ASC, created_at DESC`;
  return rows.map(rowToItem);
}

export async function upsertAPARItem(item: APARManualItem): Promise<void> {
  await initAWQAPARDB();
  if (!sql) return;
  await sql`
    INSERT INTO awq_ap_ar_items
      (id, type, bu, description, entity, amount, due_date, status, category,
       created_at, financial_link_status, financial_link_note, financial_link_source, updated_at)
    VALUES
      (${item.id}, ${item.type}, ${item.bu}, ${item.description}, ${item.entity},
       ${item.amount}, ${item.due_date}, ${item.status}, ${item.category},
       ${item.created_at}, ${item.financial_link_status ?? null},
       ${item.financial_link_note ?? null}, ${item.financial_link_source ?? null}, NOW())
    ON CONFLICT (id) DO UPDATE SET
      type                  = EXCLUDED.type,
      bu                    = EXCLUDED.bu,
      description           = EXCLUDED.description,
      entity                = EXCLUDED.entity,
      amount                = EXCLUDED.amount,
      due_date              = EXCLUDED.due_date,
      status                = EXCLUDED.status,
      category              = EXCLUDED.category,
      financial_link_status = EXCLUDED.financial_link_status,
      financial_link_note   = EXCLUDED.financial_link_note,
      financial_link_source = EXCLUDED.financial_link_source,
      updated_at            = NOW()
  `;
}

export async function upsertManyAPARItems(items: APARManualItem[]): Promise<void> {
  await Promise.all(items.map(upsertAPARItem));
}

export async function deleteAPARItem(id: string): Promise<void> {
  await initAWQAPARDB();
  if (!sql) return;
  await sql`DELETE FROM awq_ap_ar_items WHERE id = ${id}`;
}
