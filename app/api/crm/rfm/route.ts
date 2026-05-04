import { NextRequest, NextResponse } from "next/server";
import { initCrmDB, listOpportunities, SEED_ACCOUNTS, SEED_OPPORTUNITIES } from "@/lib/crm-db";
import { getForcedBu } from "@/lib/api-guard";
import type { CrmOpportunity } from "@/lib/crm-types";
import { sql } from "@/lib/db";

export type RfmSegment =
  | "Champions"
  | "Clientes Leais"
  | "Potencial de Fidelidade"
  | "Novos Clientes"
  | "Requer Atenção"
  | "Em Risco"
  | "Não Pode Perder"
  | "Hibernando";

export type RfmCustomer = {
  account_id: string;
  account_name: string;
  industry: string | null;
  owner: string;
  recency_days: number;
  frequency: number;
  monetary: number;
  r_score: number;
  f_score: number;
  m_score: number;
  rfm_score: number;
  segment: RfmSegment;
  segment_color: string;
  segment_bg: string;
};

export type RfmResponse = {
  customers: RfmCustomer[];
  segments: Record<RfmSegment, { count: number; color: string; bg: string }>;
  totals: { customers: number; monetary: number; avgMonetary: number };
};

const SEGMENT_META: Record<RfmSegment, { color: string; bg: string }> = {
  "Champions":              { color: "#10b981", bg: "#d1fae5" },
  "Clientes Leais":         { color: "#3b82f6", bg: "#dbeafe" },
  "Potencial de Fidelidade":{ color: "#8b5cf6", bg: "#ede9fe" },
  "Novos Clientes":         { color: "#06b6d4", bg: "#cffafe" },
  "Requer Atenção":         { color: "#f59e0b", bg: "#fef3c7" },
  "Não Pode Perder":        { color: "#f97316", bg: "#ffedd5" },
  "Em Risco":               { color: "#ef4444", bg: "#fee2e2" },
  "Hibernando":             { color: "#6b7280", bg: "#f3f4f6" },
};

function assignSegment(r: number, f: number): RfmSegment {
  if (r >= 4 && f >= 4) return "Champions";
  if (r >= 4 && f <= 1) return "Novos Clientes";
  if (r >= 3 && f >= 3) return "Clientes Leais";
  if (r >= 3 && f <= 2) return "Potencial de Fidelidade";
  if (r <= 1 && f >= 4) return "Não Pode Perder";
  if (r <= 2 && f >= 3) return "Em Risco";
  if (r <= 2 && f <= 1) return "Hibernando";
  return "Requer Atenção";
}

function scoreQuantile(value: number, sorted: number[], lowerIsBetter = false): number {
  if (sorted.length === 0) return 3;
  const rank = sorted.filter(v => lowerIsBetter ? v < value : v < value).length;
  const pct = rank / sorted.length;
  if (pct >= 0.8) return lowerIsBetter ? 1 : 5;
  if (pct >= 0.6) return lowerIsBetter ? 2 : 4;
  if (pct >= 0.4) return lowerIsBetter ? 3 : 3;
  if (pct >= 0.2) return lowerIsBetter ? 4 : 2;
  return lowerIsBetter ? 5 : 1;
}

type CustomerRaw = {
  account_id: string;
  account_name: string;
  industry: string | null;
  owner: string;
  recency_days: number;
  frequency: number;
  monetary: number;
};

// Seed fallback — synthetic data showing all 8 segments
const SEED_RFM_RAW: CustomerRaw[] = [
  { account_id: "a1", account_name: "XP Investimentos S.A.",       industry: "finance",   owner: "Miguel", recency_days: 10,  frequency: 6, monetary: 420000 },
  { account_id: "a2", account_name: "Nu Pagamentos S.A.",           industry: "finance",   owner: "Danilo", recency_days: 28,  frequency: 4, monetary: 285000 },
  { account_id: "a3", account_name: "Colégio CEM",                  industry: "education", owner: "Miguel", recency_days: 95,  frequency: 3, monetary: 125000 },
  { account_id: "a4", account_name: "Reabilicor Clínica Cardíaca",  industry: "health",    owner: "Danilo", recency_days: 175, frequency: 2, monetary: 95000  },
  { account_id: "a5", account_name: "Clínica Teresópolis",          industry: "health",    owner: "Danilo", recency_days: 370, frequency: 1, monetary: 50000  },
  { account_id: "a6", account_name: "Carol Bertolini",              industry: "media",     owner: "Miguel", recency_days: 19,  frequency: 1, monetary: 18000  },
];

function buildRfmCustomers(raw: CustomerRaw[]): RfmCustomer[] {
  const recencies = raw.map(c => c.recency_days).sort((a, b) => a - b);
  const frequencies = raw.map(c => c.frequency).sort((a, b) => a - b);
  const monetaries = raw.map(c => c.monetary).sort((a, b) => a - b);

  return raw.map(c => {
    const r = scoreQuantile(c.recency_days, recencies, true);
    const f = scoreQuantile(c.frequency, frequencies, false);
    const m = scoreQuantile(c.monetary, monetaries, false);
    const segment = assignSegment(r, f);
    return {
      ...c,
      r_score: r,
      f_score: f,
      m_score: m,
      rfm_score: r + f + m,
      segment,
      segment_color: SEGMENT_META[segment].color,
      segment_bg: SEGMENT_META[segment].bg,
    };
  });
}

async function fetchFromDb(forcedBu: string | null): Promise<CustomerRaw[] | null> {
  if (!sql) return null;
  const today = new Date();
  // Use closed_won opportunities; if forcedBu is set, restrict to that BU
  const rows = await sql`
    SELECT
      a.account_id,
      a.account_name,
      a.industry,
      a.owner,
      EXTRACT(DAY FROM (${today.toISOString()}::timestamptz - MAX(o.actual_close_date::timestamptz)))::int AS recency_days,
      COUNT(o.opportunity_id)::int AS frequency,
      SUM(o.deal_value)::float     AS monetary
    FROM crm_opportunities o
    JOIN crm_accounts a ON a.account_id = o.account_id
    WHERE o.stage = 'closed_won'
      AND o.actual_close_date IS NOT NULL
      AND (${forcedBu}::text IS NULL OR o.bu = ${forcedBu})
    GROUP BY a.account_id, a.account_name, a.industry, a.owner
    HAVING COUNT(o.opportunity_id) > 0
    ORDER BY SUM(o.deal_value) DESC
  `;
  if (rows.length === 0) return null;
  return rows as CustomerRaw[];
}

export async function GET(req: NextRequest) {
  try {
    await initCrmDB();
    const forcedBu = await getForcedBu(req);
    const raw = (await fetchFromDb(forcedBu)) ?? SEED_RFM_RAW;
    const customers = buildRfmCustomers(raw);

    const segments = Object.fromEntries(
      Object.entries(SEGMENT_META).map(([seg, meta]) => [
        seg,
        { count: customers.filter(c => c.segment === seg).length, ...meta },
      ])
    ) as RfmResponse["segments"];

    const totalMonetary = customers.reduce((s, c) => s + c.monetary, 0);
    const totals: RfmResponse["totals"] = {
      customers: customers.length,
      monetary: totalMonetary,
      avgMonetary: customers.length > 0 ? Math.round(totalMonetary / customers.length) : 0,
    };

    return NextResponse.json({ success: true, data: { customers, segments, totals } });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
