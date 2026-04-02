/**
 * /api/director/log — Read Director cycle history
 *
 * POST { id?: string } → returns specific cycle or full log + stats
 */

import { NextRequest } from "next/server";
import { readCycleLog, getCycleStats } from "@/lib/director-engine";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const cycleId = (body as { id?: string }).id;

  if (cycleId) {
    const cycles = readCycleLog();
    const cycle = cycles.find((c) => c.id === cycleId);
    if (!cycle) {
      return new Response(JSON.stringify({ error: "Cycle not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify(cycle), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const stats = getCycleStats();
  const cycles = readCycleLog().slice(0, 20).map((c) => ({
    id: c.id,
    trigger: c.trigger,
    startedAt: c.startedAt,
    completedAt: c.completedAt,
    status: c.status,
    durationMs: c.durationMs,
    agentCount: c.agents.length,
    escalationCount: c.escalations.length,
    agents: c.agents.map((a) => ({
      agentId: a.agentId,
      status: a.status,
      durationMs: a.durationMs,
    })),
  }));

  return new Response(JSON.stringify({ stats, cycles }), {
    headers: { "Content-Type": "application/json" },
  });
}
