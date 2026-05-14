/**
 * /api/agents — Server-side agent runner with tool use (agentic loop).
 *
 * GET  → returns manifest of all agents (id, name, bu, role)
 * POST → runs an agent in an agentic loop:
 *        1. Call Claude with tools
 *        2. If Claude invokes a tool → execute it (Notion read/write) → feed result back
 *        3. Repeat until stop_reason = "end_turn"
 *        4. Stream SSE events: { type: "tool_call", name, input }
 *                              { type: "tool_result", name, summary }
 *                              { text: "..." }
 *                              "data: [DONE]"
 */

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { guard } from "@/lib/security-guard";
import { AGENTS } from "@/lib/agents-config";
import { AGENT_TOOLS, executeTool } from "@/lib/agent-tools";

export type { AgentConfig } from "@/lib/agents-config";

export async function GET() {
  return new Response(
    JSON.stringify(AGENTS.map(({ id, name, bu, role }) => ({ id, name, bu, role }))),
    { headers: { "Content-Type": "application/json" } }
  );
}

export async function POST(req: NextRequest) {
  // ── RBAC guard: view em ai — owner, admin, finance, operator permitidos ──
  const token   = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const user_id = (token?.email as string | undefined) ?? "anonymous";
  const rawRole = (token?.role  as string | undefined) ?? "anonymous";
  const { result: guardResult, reason: guardReason } = guard(
    user_id, rawRole, "/api/agents", "ai", "view", "Agentes IA"
  );
  if (guardResult === "blocked") {
    return new Response(
      JSON.stringify({ error: "Acesso negado", code: "RBAC_DENIED", reason: guardReason }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { agentId } = await req.json();

    const clientKey = req.headers.get("x-anthropic-key");
    const serverKey = process.env.ANTHROPIC_API_KEY;
    const apiKey = clientKey || (serverKey !== "sk-ant-api03-placeholder" ? serverKey : null);

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API_KEY_REQUIRED" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const agent = AGENTS.find((a) => a.id === agentId);
    if (!agent) {
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Notion env config for tool execution
    const notionEnv = {
      notionKey: process.env.NOTION_API_KEY ?? "",
      dbProperties: process.env.NOTION_DATABASE_ID_CAZA_PROPERTIES ?? "",
      dbClients: process.env.NOTION_DATABASE_ID_CAZA_CLIENTS ?? "",
      dbFinancial: process.env.NOTION_DATABASE_ID_CAZA_FINANCIAL ?? "",
    };
    const hasNotion = !!notionEnv.notionKey;

    // Filter tools to those configured for this agent
    const agentTools = hasNotion
      ? AGENT_TOOLS.filter((t) => agent.tools.includes(t.name))
      : [];

    const client = new Anthropic({ apiKey });
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        const send = (obj: object) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

        try {
          // ── Agentic loop ────────────────────────────────────────────────────
          type MessageParam = Anthropic.MessageParam;
          const messages: MessageParam[] = [{ role: "user", content: agent.prompt }];

          let iterations = 0;
          const MAX_ITERATIONS = 8;

          while (iterations < MAX_ITERATIONS) {
            iterations++;

            const response = await client.messages.create({
              model: "claude-opus-4-6",
              max_tokens: 2048,
              system: agent.system,
              tools: agentTools.length > 0 ? agentTools : undefined,
              messages,
            });

            // Stream any text blocks
            for (const block of response.content) {
              if (block.type === "text") {
                // Chunk text to simulate streaming
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

            // If stop reason is end_turn (no tools called) → we're done
            if (response.stop_reason === "end_turn") break;

            // Handle tool calls
            if (response.stop_reason === "tool_use") {
              const toolUseBlocks = response.content.filter(
                (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
              );

              // Append assistant message with tool_use blocks
              messages.push({ role: "assistant", content: response.content });

              // Execute each tool and collect results
              const toolResults: Anthropic.ToolResultBlockParam[] = [];
              for (const toolBlock of toolUseBlocks) {
                // Notify frontend of tool call
                send({
                  type: "tool_call",
                  name: toolBlock.name,
                  input: toolBlock.input,
                });

                type ToolInput = Parameters<typeof executeTool>[1];
                const result = await executeTool(
                  toolBlock.name,
                  toolBlock.input as ToolInput,
                  notionEnv
                );

                // Summarize result for frontend notification
                let summary = "";
                try {
                  const parsed = JSON.parse(typeof result === "string" ? result : JSON.stringify(result));
                  if (parsed.data && Array.isArray(parsed.data)) {
                    summary = `${parsed.data.length} registros lidos`;
                  } else if (parsed.updated) {
                    summary = "Notion atualizado";
                  } else if (parsed.created) {
                    summary = "Alerta criado no Notion";
                  } else if (parsed.written === true) {
                    summary = `Arquivo salvo: ${(parsed as Record<string, unknown>).path ?? (toolBlock.input as Record<string, unknown>)?.path ?? ""}`;
                  } else if (parsed.written === false) {
                    summary = `Escrita negada: ${parsed.error ?? "path não permitido"}`;
                  } else if (parsed.files) {
                    summary = `${parsed.files.length} arquivos listados`;
                  } else {
                    summary = "Concluído";
                  }
                } catch {
                  // Plain text result (e.g. file content)
                  const preview = String(result).slice(0, 60).replace(/\n/g, " ");
                  summary = toolBlock.name === "read_file" ? `Lido (${String(result).length} chars)` : preview;
                }

                send({ type: "tool_result", name: toolBlock.name, summary });

                toolResults.push({
                  type: "tool_result",
                  tool_use_id: toolBlock.id,
                  content: typeof result === "string" ? result : JSON.stringify(result),
                });
              }

              // Feed results back to continue the loop
              messages.push({ role: "user", content: toolResults });
              continue;
            }

            // Any other stop reason → exit
            break;
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          send({ error: err instanceof Error ? err.message : "Agent failed" });
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
  } catch (error) {
    console.error("Agent error:", error);
    return new Response(JSON.stringify({ error: "Agent failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
