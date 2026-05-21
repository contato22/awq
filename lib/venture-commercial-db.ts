// ─── Venture Commercial — Database Layer ─────────────────────────────────────
//
// Persistence adapter for AWQ Venture commercial pipeline.
// Tables created by migration 012.
// Falls back to static venture-commercial-data.ts when DATABASE_URL is unset.
// SERVER-ONLY — do not import in client components.

import { sql, USE_DB } from "@/lib/db";
import {
  commercialOpportunities as staticOpps,
} from "@/lib/venture-commercial-data";
import type { CommercialOpportunity } from "@/lib/venture-commercial-types";

// ─── Row mapper ───────────────────────────────────────────────────────────────

function rowToOpp(row: Record<string, unknown>): CommercialOpportunity {
  const data = typeof row.data === "string" ? JSON.parse(row.data) : row.data;
  return data as CommercialOpportunity;
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export async function listCommercialOpportunities(): Promise<CommercialOpportunity[]> {
  if (!(USE_DB && sql)) return staticOpps;
  const rows = await sql`
    SELECT data FROM venture_commercial_opportunities
    ORDER BY
      CASE priority WHEN 'Alta' THEN 0 WHEN 'Média' THEN 1 ELSE 2 END,
      id ASC
  `;
  if (rows.length === 0) return staticOpps;
  return rows.map((r) => rowToOpp(r as Record<string, unknown>));
}

export async function getCommercialOpportunity(id: string): Promise<CommercialOpportunity | null> {
  if (!(USE_DB && sql)) return staticOpps.find((o) => o.id === id) ?? null;
  const rows = await sql`
    SELECT data FROM venture_commercial_opportunities WHERE id = ${id} LIMIT 1
  `;
  return rows[0] ? rowToOpp(rows[0] as Record<string, unknown>) : null;
}

// ─── Writes ───────────────────────────────────────────────────────────────────

export async function upsertCommercialOpportunity(opp: CommercialOpportunity): Promise<void> {
  if (!(USE_DB && sql)) throw new Error("DB unavailable");
  await sql`
    INSERT INTO venture_commercial_opportunities
      (id, company, stage, deal_type, priority, probability, data, updated_at)
    VALUES
      (${opp.id}, ${opp.company}, ${opp.stage}, ${opp.dealType},
       ${opp.priority}, ${opp.probability}, ${JSON.stringify(opp)}, NOW())
    ON CONFLICT (id) DO UPDATE SET
      company     = EXCLUDED.company,
      stage       = EXCLUDED.stage,
      deal_type   = EXCLUDED.deal_type,
      priority    = EXCLUDED.priority,
      probability = EXCLUDED.probability,
      data        = EXCLUDED.data,
      updated_at  = NOW()
  `;
}

export async function deleteCommercialOpportunity(id: string): Promise<void> {
  if (!(USE_DB && sql)) throw new Error("DB unavailable");
  await sql`DELETE FROM venture_commercial_opportunities WHERE id = ${id}`;
}
