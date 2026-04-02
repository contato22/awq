/**
 * /api/agents/data-governance — Autonomous Data Governance Agent
 *
 * GET  → Returns latest governance report (no AI call, pure engine scan)
 * POST → Runs the full AI-powered governance agent with agentic loop
 *        The agent uses the governance engine scan as context,
 *        then autonomously decides what to fix and what to escalate.
 *
 * This agent is designed to run 24/7 on a recurring schedule.
 * It only surfaces issues that require human attention.
 */

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { AGENTS } from "@/lib/agents-config";
import { AGENT_TOOLS, executeTool } from "@/lib/agent-tools";
import { runGovernanceScan, formatReportForHuman } from "@/store/governance";

export async function GET() {
  const report = runGovernanceScan();
  const humanReport = formatReportForHuman(report);

  return new Response(
    JSON.stringify({
      report,
      formatted: humanReport,
      hasEscalations: report.escalations.length > 0,
      healthScore: report.health.overall,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const clientKey = req.headers.get("x-anthropic-key");
    const serverKey = process.env.ANTHROPIC_API_KEY;
    const apiKey = clientKey || (serverKey !== "sk-ant-api03-placeholder" ? serverKey : null);

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API_KEY_REQUIRED" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const agent = AGENTS.find((a) => a.id === "data-governance");
    if (!agent) {
      return new Response(JSON.stringify({ error: "Data governance agent not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Run the governance engine scan first — inject as context
    const scan = runGovernanceScan();
    const scanReport = formatReportForHuman(scan);

    const contextInjection = `
=== PRE-SCAN RESULTS (from governance engine) ===
${scanReport}

=== AUTO-FIXABLE ISSUES (${scan.autoFixable.length}) ===
${scan.autoFixable.map((i) => `• [${i.id}] ${i.title}: ${i.description}\n  → FIX: ${i.suggestion}`).join("\n")}

=== ESCALATIONS NEEDED (${scan.escalations.length}) ===
${scan.escalations.map((i) => `• [${i.id}] 🔴 ${i.title}: ${i.description}\n  → WHY ESCALATE: ${i.suggestion}`).join("\n")}

=== YOUR INSTRUCTIONS FOR THIS CYCLE ===
1. Review the pre-scan results above
2. For each AUTO-FIXABLE issue: read the affected file, make the fix, write the file back
3. For each ESCALATION: create a Notion alert with priority "Alta" and full context
4. After all actions, produce your governance report
5. If health score is above 85% and there are no escalations, just say "✅ Ciclo limpo — nenhuma ação necessária"
`;

    const notionEnv = {
      notionKey: process.env.NOTION_API_KEY ?? "",
      dbProperties: process.env.NOTION_DATABASE_ID_CAZA_PROPERTIES ?? "",
      dbClients: process.env.NOTION_DATABASE_ID_CAZA_CLIENTS ?? "",
      dbFinancial: process.env.NOTION_DATABASE_ID_CAZA_PROPERTIES ?? "",
    };
    const hasNotion = !!notionEnv.notionKey;

    const agentTools = hasNotion
      ? AGENT_TOOLS.filter((t) => agent.tools.includes(t.name))
      : AGENT_TOOLS.filter((t) =>
          ["read_file", "write_file", "list_directory"].includes(t.name)
        );

    const client = new Anthropic({ apiKey });
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        const send = (obj: object) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

        try {
          // Notify start with pre-scan results
          send({
            type: "governance_scan",
            healthScore: scan.health.overall,
            issues: scan.issues.length,
            autoFixable: scan.autoFixable.length,
            escalations: scan.escalations.length,
          });

          type MessageParam = Anthropic.MessageParam;
          const messages: MessageParam[] = [
            { role: "user", content: contextInjection + "\n\n" + agent.prompt },
          ];

          let iterations = 0;
          const MAX_ITERATIONS = 12; // More iterations for governance — may need to read/fix multiple files

          while (iterations < MAX_ITERATIONS) {
            iterations++;

            const response = await client.messages.create({
              model: "claude-sonnet-4-6",
              max_tokens: 2048,
              system: agent.system,
              tools: agentTools.length > 0 ? agentTools : undefined,
              messages,
            });

            for (const block of response.content) {
              if (block.type === "text") {
                const words = block.text.split(" ");
                let buffer = "";
                for (const word of words) {
                  buffer += (buffer ? " " : "") + word;
                  if (buffer.length > 40) {
                    send({ text: buffer });
                    buffer = "";
                    await new Promise((r) => setTimeout(r, 0));
                  }
                }
                if (buffer) send({ text: buffer });
              }
            }

            if (response.stop_reason === "end_turn") break;

            if (response.stop_reason === "tool_use") {
              const toolBlocks = response.content.filter(
                (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
              );
              messages.push({ role: "assistant", content: response.content });

              const toolResults: Anthropic.ToolResultBlockParam[] = [];
              for (const tb of toolBlocks) {
                send({
                  type: "tool_call",
                  name: tb.name,
                  input: tb.input,
                });

                type TInput = Parameters<typeof executeTool>[1];
                const result = await executeTool(tb.name, tb.input as TInput, notionEnv);

                let summary = "";
                try {
                  const p = JSON.parse(typeof result === "string" ? result : JSON.stringify(result));
                  if (p.data && Array.isArray(p.data)) summary = `${p.data.length} registros`;
                  else if (p.written === true) summary = `salvo: ${(p as Record<string, unknown>).path ?? ""}`;
                  else if (p.written === false) summary = `negado: ${(p as Record<string, unknown>).error ?? ""}`;
                  else if (p.updated) summary = "atualizado";
                  else if (p.created) summary = "alerta criado";
                  else if (p.files) summary = `${p.files.length} arquivos`;
                  else summary = "ok";
                } catch {
                  summary = typeof result === "string" ? `${result.length} chars` : "ok";
                }

                send({ type: "tool_result", name: tb.name, summary });
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: tb.id,
                  content: typeof result === "string" ? result : JSON.stringify(result),
                });
              }
              messages.push({ role: "user", content: toolResults });
              continue;
            }

            break;
          }

          // Run post-scan to measure improvement
          const postScan = runGovernanceScan();
          send({
            type: "governance_post_scan",
            healthBefore: scan.health.overall,
            healthAfter: postScan.health.overall,
            issuesBefore: scan.issues.length,
            issuesAfter: postScan.issues.length,
            delta: postScan.health.overall - scan.health.overall,
          });

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          send({ error: err instanceof Error ? err.message : "Governance agent failed" });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
