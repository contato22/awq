// ─── AP/AR — Persistence Layer ───────────────────────────────────────────────
//
// STORAGE:
//   DATABASE_URL set  → Neon Postgres (ap_ar_items table)
//   DATABASE_URL unset → JSON file fallback (public/data/ap-ar/items.json)
//
// BU ISOLATION:
//   Every item carries a `bu` field. Queries filter by BU when buScope is set.
//   Group-level queries (buScope = null) return all items across all BUs.
//
// Server-only — do not import in client components.

import fs   from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { sql } from "@/lib/db";

// ─── Constants ────────────────────────────────────────────────────────────────

const DATA_DIR  = path.join(process.cwd(), "public", "data", "ap-ar");
const JSON_FILE = path.join(DATA_DIR, "items.json");

// ─── Types ────────────────────────────────────────────────────────────────────

export type APARType   = "ap" | "ar";
export type APARStatus = "pending" | "overdue" | "settled";
export type APARBU     = "awq" | "jacqes" | "caza" | "venture" | "advisor";

export interface APARItem {
  id:          string;
  type:        APARType;
  bu:          APARBU;
  description: string;
  entity:      string;
  amount:      number;
  due_date:    string;   // YYYY-MM-DD
  status:      APARStatus;
  category:    string;
  created_at:  string;  // ISO datetime
  updated_at:  string;  // ISO datetime
}

// ─── JSON fallback helpers ────────────────────────────────────────────────────

function readJSON(): APARItem[] {
  try {
    if (!fs.existsSync(JSON_FILE)) return [];
    const content = fs.readFileSync(JSON_FILE, "utf-8").trim();
    if (!content) return [];
    return JSON.parse(content) as APARItem[];
  } catch {
    return [];
  }
}

function writeJSON(items: APARItem[]): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(JSON_FILE, JSON.stringify(items, null, 2), "utf-8");
}

// ─── Schema bootstrap ─────────────────────────────────────────────────────────

export async function initAPARDB(): Promise<void> {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS ap_ar_items (
      id          TEXT PRIMARY KEY,
      type        TEXT NOT NULL CHECK (type IN ('ap', 'ar')),
      bu          TEXT NOT NULL CHECK (bu IN ('awq', 'jacqes', 'caza', 'venture', 'advisor')),
      description TEXT NOT NULL,
      entity      TEXT NOT NULL DEFAULT '',
      amount      NUMERIC NOT NULL DEFAULT 0,
      due_date    TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'overdue', 'settled')),
      category    TEXT NOT NULL DEFAULT '',
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_ap_ar_bu   ON ap_ar_items(bu)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ap_ar_type ON ap_ar_items(type)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ap_ar_status ON ap_ar_items(status)`;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/** List items. buScope = null → all BUs (group view). */
export async function listAPARItems(buScope: APARBU | null): Promise<APARItem[]> {
  if (sql) {
    const rows = buScope
      ? await sql`SELECT * FROM ap_ar_items WHERE bu = ${buScope} ORDER BY due_date ASC, created_at DESC`
      : await sql`SELECT * FROM ap_ar_items ORDER BY due_date ASC, created_at DESC`;
    return rows.map(rowToItem);
  }
  const items = readJSON();
  return buScope ? items.filter((i) => i.bu === buScope) : items;
}

export async function getAPARItem(id: string): Promise<APARItem | null> {
  if (sql) {
    const rows = await sql`SELECT * FROM ap_ar_items WHERE id = ${id} LIMIT 1`;
    return rows.length ? rowToItem(rows[0]) : null;
  }
  return readJSON().find((i) => i.id === id) ?? null;
}

export async function createAPARItem(data: Omit<APARItem, "id" | "created_at" | "updated_at">): Promise<APARItem> {
  const now  = new Date().toISOString();
  const item: APARItem = { id: randomUUID(), ...data, created_at: now, updated_at: now };

  if (sql) {
    await sql`
      INSERT INTO ap_ar_items
        (id, type, bu, description, entity, amount, due_date, status, category, created_at, updated_at)
      VALUES
        (${item.id}, ${item.type}, ${item.bu}, ${item.description}, ${item.entity},
         ${item.amount}, ${item.due_date}, ${item.status}, ${item.category},
         ${item.created_at}, ${item.updated_at})
    `;
    return item;
  }

  const items = readJSON();
  items.push(item);
  writeJSON(items);
  return item;
}

export async function updateAPARItem(
  id: string,
  patch: Partial<Pick<APARItem, "status" | "description" | "entity" | "amount" | "due_date" | "category">>
): Promise<APARItem | null> {
  const now = new Date().toISOString();

  if (sql) {
    const existing = await getAPARItem(id);
    if (!existing) return null;
    const merged = { ...existing, ...patch, updated_at: now };
    await sql`
      UPDATE ap_ar_items SET
        description = ${merged.description},
        entity      = ${merged.entity},
        amount      = ${merged.amount},
        due_date    = ${merged.due_date},
        status      = ${merged.status},
        category    = ${merged.category},
        updated_at  = ${merged.updated_at}
      WHERE id = ${id}
    `;
    return merged;
  }

  const items = readJSON();
  const idx   = items.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  items[idx] = { ...items[idx], ...patch, updated_at: now };
  writeJSON(items);
  return items[idx];
}

export async function deleteAPARItem(id: string): Promise<boolean> {
  if (sql) {
    await sql`DELETE FROM ap_ar_items WHERE id = ${id}`;
    return true;
  }
  const items = readJSON();
  const next  = items.filter((i) => i.id !== id);
  if (next.length === items.length) return false;
  writeJSON(next);
  return true;
}

// ─── Private helpers ──────────────────────────────────────────────────────────

function rowToItem(row: Record<string, unknown>): APARItem {
  return {
    id:          row.id          as string,
    type:        row.type        as APARType,
    bu:          row.bu          as APARBU,
    description: row.description as string,
    entity:      (row.entity     as string) ?? "",
    amount:      Number(row.amount),
    due_date:    row.due_date    as string,
    status:      row.status      as APARStatus,
    category:    (row.category   as string) ?? "",
    created_at:  row.created_at  as string,
    updated_at:  row.updated_at  as string,
  };
}
