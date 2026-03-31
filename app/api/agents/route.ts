import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { AGENTS } from "@/lib/agents-config";

export type { AgentConfig } from "@/lib/agents-config";

export async function POST(req: NextRequest) {
  try {
    const { agentId } = await req.json();

    const clientKey = req.headers.get("x-anthropic-key");
    const serverKey = process.env.ANTHROPIC_API_KEY;
    const apiKey = clientKey || (serverKey !== "sk-ant-api03-placeholder" ? serverKey : null);

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API_KEY_REQUIRED" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const agent = AGENTS.find((a) => a.id === agentId);
    if (!agent) {
      return new Response(
        JSON.stringify({ error: "Agent not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const client = new Anthropic({ apiKey });

    const stream = client.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 512,
      system: agent.system,
      messages: [{ role: "user", content: agent.prompt }],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ agentId, agentName: agent.name })}\n\n`)
          );
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.error(err);
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
    return new Response(
      JSON.stringify({ error: "Agent failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function GET() {
  return new Response(
    JSON.stringify(AGENTS.map(({ id, name, role }) => ({ id, name, role }))),
    { headers: { "Content-Type": "application/json" } }
  );
}
