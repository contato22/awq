// ─── Seed Opportunities from PPM — one-shot idempotente ─────────────────────
// GET /api/holding/seed-opportunities-from-ppm
//
// Para cada projeto PPM com budget_revenue > 0, cria uma opportunity
// closed_won em crm_opportunities (deal_value = MRR × 12 quando retainer,
// senão = budget_revenue). Isso faz a holding consolidada em /crm enxergar
// receita real das BUs (CAZA, ENRD, JACQES, ADVISOR).
//
// Idempotente por (bu, opportunity_name).

import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { listProjects } from "@/lib/ppm-db";
import { createOpportunity, listOpportunities } from "@/lib/crm-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_EMAILS = new Set(["contato@awq.com.br"]);

const OWNER_BY_BU: Record<string, string> = {
  JACQES: "Danilo",
  CAZA: "Miguel",
  ENRD: "Gabriel Cazadem",
  ADVISOR: "Miguel",
  VENTURE: "Miguel",
  AWQ: "Miguel",
};

function dealValueFor(p: { budget_revenue: number; project_type: string; start_date: string; planned_end_date: string }): number {
  if (p.project_type === "retainer") {
    const months = Math.max(
      1,
      Math.round(
        (new Date(p.planned_end_date).getTime() - new Date(p.start_date).getTime()) /
        (30 * 86400000),
      ),
    );
    return p.budget_revenue * months;
  }
  return p.budget_revenue;
}

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req });
    if (!token?.email || !ALLOWED_EMAILS.has(token.email.toLowerCase())) {
      return NextResponse.json(
        { error: "Forbidden — only the AWQ Holding owner can run this seed" },
        { status: 403 },
      );
    }

    const projects = await listProjects();
    const existing = await listOpportunities();
    const existingKeys = new Set(
      existing.map(o => `${o.bu}::${o.opportunity_name.toLowerCase().trim()}`),
    );

    const created: Array<{ bu: string; name: string; deal_value: number; opportunity_id: string }> = [];
    const skipped: Array<{ bu: string; name: string; reason: string }> = [];
    const failed: Array<{ bu: string; name: string; error: string }> = [];

    for (const p of projects) {
      const name = p.project_name;
      const bu = p.bu_code;

      if (!p.budget_revenue || p.budget_revenue <= 0) {
        skipped.push({ bu, name, reason: "budget_revenue <= 0" });
        continue;
      }

      const key = `${bu}::${name.toLowerCase().trim()}`;
      if (existingKeys.has(key)) {
        skipped.push({ bu, name, reason: "opportunity já existe" });
        continue;
      }

      try {
        const dealValue = dealValueFor(p);
        const opp = await createOpportunity({
          opportunity_name: name,
          bu,
          stage: "closed_won",
          deal_value: dealValue,
          probability: 100,
          expected_close_date: p.start_date,
          owner: OWNER_BY_BU[bu] ?? "Miguel",
        });
        created.push({ bu, name, deal_value: dealValue, opportunity_id: opp.opportunity_id });
        existingKeys.add(key);
      } catch (err) {
        failed.push({ bu, name, error: String(err) });
      }
    }

    return NextResponse.json({
      ok: true,
      runBy: token.email,
      runAt: new Date().toISOString(),
      summary: {
        projects: projects.length,
        created: created.length,
        skipped: skipped.length,
        failed: failed.length,
      },
      created,
      skipped,
      failed,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, fatal: String(err), stack: err instanceof Error ? err.stack : undefined },
      { status: 500 },
    );
  }
}
