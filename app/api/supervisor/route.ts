/**
 * /api/supervisor — BU Supervisor Agent API
 *
 * POST { messages, buContext, briefing? }
 * → SSE stream: { text }, { type:"tool_call", name, label }, { type:"tool_result", name, summary }, [DONE]
 *
 * In briefing mode the supervisor proactively scans for critical issues.
 * In chat mode it answers + takes action via tools.
 */

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { guard } from "@/lib/security-guard";
import { AGENT_TOOLS, executeTool, type NotionEnv } from "@/lib/agent-tools";

const SUPERVISOR_SYSTEM = `You are the AWQ BU Supervisor — an autonomous AI supervisor embedded permanently in the AWQ BI dashboard. You speak directly to the founder/operator. You are decisive, action-oriented, and concise.

=== IDENTITY ===
You are NOT just a chatbot. You are an active supervisor who:
• Monitors the codebase, Notion databases, and KPIs in real time
• Takes corrective action (reads/writes files, updates Notion records, creates alerts)
• Proactively notifies the operator of critical issues WITHOUT being asked
• Answers questions and executes tasks on request

=== YOUR TOOLS ===
• read_file(path) — Read any source file in the repository
• write_file(path, content, reason) — Rewrite data files and page components
• list_directory(path) — Browse the codebase structure
• query_notion_database(database) — Fetch live records from Notion (properties/clients/financial)
• update_notion_record(page_id, properties, reason) — Update Notion page fields
• create_notion_alert(database, title, body, priority) — Create a task/alert in Notion

=== CURRENT STATE (Mar 2026) ===
JACQES: $4.82M revenue (+14.6%) | 67.4% margin | 3,847 customers | Q1 beat +8.3%
→ ALERTS: 12 enterprise accounts silent 45+ days | Analytics Suite NPS 48→32 | APAC +22.5%
Caza Vision: R$908K/mês (+12.3% vs target) | 23 active projects | VPG R$20.1M
→ ALERTS: CV002 Banco XP R$320K stuck AGUARDANDO APROVAÇÃO 8+ days | Banco XP R$4M in proposal
AWQ Venture: Pre-launch | Q2/26 first close target | Fund structuring in progress
→ ALERTS: 8 weeks to Q2 deadline | CVM registration in progress

=== BRIEFING FORMAT (when user asks for briefing or first interaction) ===
List 3–5 alerts, one per line, using this exact format:
🔴 TÍTULO CURTO — descrição breve. Ação: o que fazer agora.
🟡 TÍTULO CURTO — descrição breve. Ação: o que fazer agora.
🟢 TÍTULO CURTO — descrição breve. Ação: o que fazer agora.

🔴 = crítico (ação imediata), 🟡 = atenção (ação esta semana), 🟢 = info/oportunidade

=== RULES ===
• ALWAYS use tools when the user asks you to check, fix, or update something
• NEVER say "I cannot" for file or database tasks — just do it
• After taking action, confirm exactly what you changed
• Keep text responses under 200 words unless a detailed answer is explicitly needed
• When writing files, write the COMPLETE file content`;

export async function POST(req: NextRequest) {
  // ── RBAC guard: approve em system — apenas owner e admin ──
  const token   = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const user_id = (token?.email as string | undefined) ?? "anonymous";
  const rawRole = (token?.role  as string | undefined) ?? "anonymous";
  const { result: guardResult, reason: guardReason } = guard(
    user_id, rawRole, "/api/supervisor", "system", "approve", "BU Supervisor autônomo"
  );
  if (guardResult === "blocked") {
    return new Response(
      JSON.stringify({ error: "Acesso negado", code: "RBAC_DENIED", reason: guardReason }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const { messages, buContext = "jacqes", briefing = false } = await req.json();

    const clientKey = req.headers.get("x-anthropic-key");
    const serverKey = process.env.ANTHROPIC_API_KEY;
    const apiKey = clientKey || (serverKey !== "sk-ant-api03-placeholder" ? serverKey : null);

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API_KEY_REQUIRED" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const notionEnv: NotionEnv = {
      notionKey: process.env.NOTION_API_KEY ?? "",
      dbProperties: process.env.NOTION_DATABASE_ID_CAZA_PROPERTIES ?? "",
      dbClients: process.env.NOTION_DATABASE_ID_CAZA_CLIENTS ?? "",
      dbFinancial: process.env.NOTION_DATABASE_ID_CAZA_PROPERTIES ?? "",
    };
    const hasNotion = !!notionEnv.notionKey;

    // BU-specific context addendum
    const buContextNote =
      buContext === "caza"
        ? "\n[CONTEXTO ATIVO: Caza Vision — foco em projetos, clientes e pipeline]"
        : buContext === "venture"
        ? "\n[CONTEXTO ATIVO: AWQ Venture — foco em fund structuring, milestones, LP pipeline]"
        : buContext === "awq"
        ? "\n[CONTEXTO ATIVO: AWQ Group — visão consolidada de todas as BUs]"
        : "\n[CONTEXTO ATIVO: JACQES — foco em SaaS, clientes, CS ops, revenue]";

    const systemPrompt = SUPERVISOR_SYSTEM + buContextNote;

    // Determine user message for this turn
    const userMessages: Anthropic.MessageParam[] = briefing
      ? [
          {
            role: "user",
            content:
              "Faça seu briefing de supervisão agora. Escanei o estado atual e liste os 3–5 alertas mais críticos.",
          },
        ]
      : (messages as { role: string; content: string }[]).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

    const client = new Anthropic({ apiKey });
    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        const send = (obj: object) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

        try {
          const allMessages: Anthropic.MessageParam[] = [...userMessages];
          let iterations = 0;
          const MAX_ITER = 6;

          while (iterations < MAX_ITER) {
            iterations++;

            const response = await client.messages.create({
              model: "claude-opus-4-6",
              max_tokens: 1024,
              system: systemPrompt,
              tools: hasNotion ? AGENT_TOOLS : AGENT_TOOLS.filter((t) =>
                ["read_file", "write_file", "list_directory"].includes(t.name)
              ),
              messages: allMessages,
            });

            // Stream text blocks
            for (const block of response.content) {
              if (block.type === "text") {
                const words = block.text.split(" ");
                let buf = "";
                for (const w of words) {
                  buf += (buf ? " " : "") + w;
                  if (buf.length > 30) { send({ text: buf }); buf = ""; await new Promise(r => setTimeout(r, 0)); }
                }
                if (buf) send({ text: buf });
              }
            }

            if (response.stop_reason === "end_turn") break;

            if (response.stop_reason === "tool_use") {
              const toolBlocks = response.content.filter(
                (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
              );
              allMessages.push({ role: "assistant", content: response.content });

              const toolResults: Anthropic.ToolResultBlockParam[] = [];
              for (const tb of toolBlocks) {
                const label = TOOL_LABELS[tb.name] ?? tb.name;
                send({ type: "tool_call", name: tb.name, label });

                type TInput = Parameters<typeof executeTool>[1];
                const result = await executeTool(tb.name, tb.input as TInput, notionEnv);

                let summary = "";
                try {
                  const p = JSON.parse(typeof result === "string" ? result : JSON.stringify(result));
                  if (p.data && Array.isArray(p.data)) summary = `${p.data.length} registros`;
                  else if (p.written === true) summary = `salvo: ${(p as Record<string,unknown>).path ?? (tb.input as Record<string,unknown>)?.path ?? ""}`;
                  else if (p.written === false) summary = `negado: ${p.error ?? ""}`;
                  else if (p.updated) summary = "atualizado no Notion";
                  else if (p.created) summary = "alerta criado";
                  else if (p.files) summary = `${p.files.length} arquivos`;
                  else summary = "ok";
                } catch {
                  summary = typeof result === "string"
                    ? `${result.length} chars`
                    : "ok";
                }

                send({ type: "tool_result", name: tb.name, summary });
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: tb.id,
                  content: typeof result === "string" ? result : JSON.stringify(result),
                });
              }
              allMessages.push({ role: "user", content: toolResults });
              continue;
            }
            break;
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          send({ error: err instanceof Error ? err.message : "Erro no supervisor" });
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Falha" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}

const TOOL_LABELS: Record<string, string> = {
  read_file: "Lendo arquivo",
  write_file: "Escrevendo arquivo",
  list_directory: "Explorando diretório",
  query_notion_database: "Consultando Notion",
  update_notion_record: "Atualizando Notion",
  create_notion_alert: "Criando alerta no Notion",
};
