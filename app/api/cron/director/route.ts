/**
 * /api/cron/director — Director Cron endpoint
 *
 * POST — Triggered by Vercel Cron (via vercel.json) or external webhook.
 * Runs the full Director cycle: all 4 BU agents + master.
 *
 * Security: validates CRON_SECRET header to prevent unauthorized triggers.
 * Uses ANTHROPIC_API_KEY from env (no client key in cron context).
 */

import { NextRequest } from "next/server";
import { runDirectorCycle } from "@/lib/director-engine";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "sk-ant-api03-placeholder") {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const cycle = await runDirectorCycle("cron", apiKey);

    return new Response(
      JSON.stringify({
        ok: true,
        cycleId: cycle.id,
        status: cycle.status,
        agents: cycle.agents.map((a) => ({
          id: a.agentId,
          status: a.status,
          durationMs: a.durationMs,
          escalations: a.escalations.length,
        })),
        escalations: cycle.escalations,
        durationMs: cycle.durationMs,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Director cycle failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
