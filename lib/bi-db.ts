// ─── BI — Supabase Database Layer ─────────────────────────────────────────────
//
// Covers: Reports, Analytics, Visualizations.
//
// STORAGE:
//   DATABASE_URL set  → Supabase Postgres (bi_* tables)
//   DATABASE_URL unset → returns [] / no-op

import { sql } from "./db";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BIReport {
  id: string;
  title: string;
  description: string;
  category: string;
  query_type: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface BIAnalytic {
  id: string;
  name: string;
  description: string;
  type: "chart" | "table" | "kpi";
  config: Record<string, unknown>;
  created_at: string;
}

export interface BIVisualization {
  id: string;
  name: string;
  description: string;
  chart_type: string;
  data_source: string;
  config: Record<string, unknown>;
  created_at: string;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

let _ready = false;

export async function initBIDB(): Promise<void> {
  if (_ready || !sql) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS bi_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT 'Geral',
        query_type TEXT NOT NULL DEFAULT 'custom',
        created_by TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS bi_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        type TEXT NOT NULL DEFAULT 'chart',
        config JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS bi_visualizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        chart_type TEXT NOT NULL DEFAULT 'bar',
        data_source TEXT NOT NULL DEFAULT '',
        config JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    _ready = true;
  } catch { /* silent */ }
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function getBIReports(): Promise<BIReport[]> {
  if (!sql) return [];
  try {
    const rows = await sql`SELECT * FROM bi_reports ORDER BY created_at DESC`;
    return rows.map(r => ({
      id: r.id as string,
      title: r.title as string,
      description: r.description as string,
      category: r.category as string,
      query_type: r.query_type as string,
      created_by: r.created_by as string,
      created_at: r.created_at as string,
      updated_at: r.updated_at as string,
    }));
  } catch { return []; }
}

export async function upsertBIReport(rep: Omit<BIReport, "id" | "created_at" | "updated_at"> & { id?: string }): Promise<void> {
  if (!sql) return;
  try {
    await sql`
      INSERT INTO bi_reports (id, title, description, category, query_type, created_by)
      VALUES (${rep.id ?? crypto.randomUUID()}, ${rep.title}, ${rep.description},
              ${rep.category}, ${rep.query_type}, ${rep.created_by})
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title, description = EXCLUDED.description,
        category = EXCLUDED.category, query_type = EXCLUDED.query_type,
        created_by = EXCLUDED.created_by, updated_at = NOW()
    `;
  } catch { /* no-op */ }
}

export async function deleteBIReport(id: string): Promise<void> {
  if (!sql) return;
  try {
    await sql`DELETE FROM bi_reports WHERE id = ${id}`;
  } catch { /* no-op */ }
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getBIAnalytics(): Promise<BIAnalytic[]> {
  if (!sql) return [];
  try {
    const rows = await sql`SELECT * FROM bi_analytics ORDER BY created_at DESC`;
    return rows.map(r => ({
      id: r.id as string,
      name: r.name as string,
      description: r.description as string,
      type: r.type as BIAnalytic["type"],
      config: typeof r.config === "string" ? JSON.parse(r.config) : (r.config ?? {}),
      created_at: r.created_at as string,
    }));
  } catch { return []; }
}

export async function upsertBIAnalytic(a: Omit<BIAnalytic, "id" | "created_at"> & { id?: string }): Promise<void> {
  if (!sql) return;
  try {
    await sql`
      INSERT INTO bi_analytics (id, name, description, type, config)
      VALUES (${a.id ?? crypto.randomUUID()}, ${a.name}, ${a.description},
              ${a.type}, ${JSON.stringify(a.config)}::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, description = EXCLUDED.description,
        type = EXCLUDED.type, config = EXCLUDED.config
    `;
  } catch { /* no-op */ }
}

export async function deleteBIAnalytic(id: string): Promise<void> {
  if (!sql) return;
  try {
    await sql`DELETE FROM bi_analytics WHERE id = ${id}`;
  } catch { /* no-op */ }
}

// ─── Visualizations ───────────────────────────────────────────────────────────

export async function getBIVisualizations(): Promise<BIVisualization[]> {
  if (!sql) return [];
  try {
    const rows = await sql`SELECT * FROM bi_visualizations ORDER BY created_at DESC`;
    return rows.map(r => ({
      id: r.id as string,
      name: r.name as string,
      description: r.description as string,
      chart_type: r.chart_type as string,
      data_source: r.data_source as string,
      config: typeof r.config === "string" ? JSON.parse(r.config) : (r.config ?? {}),
      created_at: r.created_at as string,
    }));
  } catch { return []; }
}

export async function upsertBIVisualization(v: Omit<BIVisualization, "id" | "created_at"> & { id?: string }): Promise<void> {
  if (!sql) return;
  try {
    await sql`
      INSERT INTO bi_visualizations (id, name, description, chart_type, data_source, config)
      VALUES (${v.id ?? crypto.randomUUID()}, ${v.name}, ${v.description},
              ${v.chart_type}, ${v.data_source}, ${JSON.stringify(v.config)}::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name, description = EXCLUDED.description,
        chart_type = EXCLUDED.chart_type, data_source = EXCLUDED.data_source,
        config = EXCLUDED.config
    `;
  } catch { /* no-op */ }
}

export async function deleteBIVisualization(id: string): Promise<void> {
  if (!sql) return;
  try {
    await sql`DELETE FROM bi_visualizations WHERE id = ${id}`;
  } catch { /* no-op */ }
}
