/**
 * /api/director/run — Manual Director trigger (SSE stream)
 *
 * POST { trigger?: "manual" }
 * → SSE stream of DirectorEvents as the cycle runs
 *
 * Used by the Director dashboard to trigger and observe cycles in real time.
 */

import { NextRequest } from "next/server";
import { runDirectorCycle, type DirectorEvent } from "@/lib/director-engine";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const clientKey = req.headers.get("x-anthropic-key");
  const serverKey = process.env.ANTHROPIC_API_KEY;
  const apiKey = clientKey || (serverKey !== "sk-ant-api03-placeholder" ? serverKey : null);

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API_KEY_REQUIRED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      const send = (event: DirectorEvent) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

      try {
        const cycle = await runDirectorCycle("manual", apiKey, send);

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "cycle_complete", cycle: {
            id: cycle.id,
            status: cycle.status,
            durationMs: cycle.durationMs,
            escalations: cycle.escalations,
            masterSynthesis: cycle.masterSynthesis,
            agents: cycle.agents.map((a) => ({
              agentId: a.agentId,
              agentName: a.agentName,
              status: a.status,
              durationMs: a.durationMs,
              toolCalls: a.toolCalls.length,
              escalations: a.escalations.length,
              reportPreview: a.report.slice(0, 300),
            })),
          }})}\n\n`)
        );
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", message: err instanceof Error ? err.message : "Cycle failed" })}\n\n`)
        );
      }

      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
