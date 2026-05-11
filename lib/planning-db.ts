// ─── AWQ Planning Data — Supabase Blob Store ──────────────────────────────────
//
// Stores arbitrary planning data (BU profiles, budget lines, etc.) as JSONB
// so planners can update them without code changes.
//
// Falls back gracefully when DATABASE_URL is not set.

import { sql } from "@/lib/db";

let _ready = false;

export async function initPlanningDB(): Promise<void> {
  if (_ready || !sql) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS awq_planning_blobs (
        key        TEXT PRIMARY KEY,
        data       JSONB NOT NULL DEFAULT '[]',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    _ready = true;
  } catch { /* silent */ }
}

export async function getPlanningBlob<T>(key: string): Promise<T | null> {
  if (!sql) return null;
  try {
    await initPlanningDB();
    const rows = await sql`SELECT data FROM awq_planning_blobs WHERE key = ${key}`;
    if (!rows.length) return null;
    const data = rows[0].data;
    return (typeof data === "string" ? JSON.parse(data) : data) as T;
  } catch { return null; }
}

export async function upsertPlanningBlob(key: string, data: unknown): Promise<void> {
  if (!sql) return;
  try {
    await initPlanningDB();
    await sql`
      INSERT INTO awq_planning_blobs (key, data, updated_at)
      VALUES (${key}, ${JSON.stringify(data)}::jsonb, NOW())
      ON CONFLICT (key) DO UPDATE SET
        data = EXCLUDED.data,
        updated_at = NOW()
    `;
  } catch { /* no-op */ }
}
