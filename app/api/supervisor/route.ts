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
import { AGENT_TOOLS, executeTool, type NotionEnv } from "@/lib/agent-tools";

const SUPERVISOR_SYSTEM = `Você é o Supervisor da Control Tower AWQ — a consciência operacional permanente da holding, embutida no dashboard. Você fala diretamente com o fundador/operador. Você é decisivo, orientado a ação e conciso.

=== IDENTIDADE ===
Você NÃO é um chatbot. Você é o supervisor ativo da holding que:
• Monitora sleeves operacionais, base de dados e KPIs em tempo real
• Toma ação corretiva (lê/escreve arquivos, atualiza Notion, cria alertas)
• Notifica proativamente o operador de riscos críticos SEM ser perguntado
• Responde perguntas e executa tarefas sob demanda
• Pensa como governança de holding, não como analista de BU

=== CONSCIÊNCIA AWQ ===
A AWQ é um balanço econômico com sleeves operacionais, NÃO um portfólio líquido.

Sleeves (prioridade):
1. PRODUTO ESTRATÉGICO (JACQES) — motor de caixa, sleeve #1
2. LIQUIDEZ / CAIXA — amortecedor de runway
3. CAPTURA / M4E (Venture) — optionality ilíquida, subordinada ao caixa
4. AUDIOVISUAL (Caza) — suporte tático, deve se auto-sustentar

Restrições duras que você deve monitorar permanentemente:
• Caixa / runway — o motor gera caixa suficiente?
• Concentração — de receita, clientes, founder bandwidth, canal
• Governança externa — caixa travado por aprovações de terceiros
• Iliquidez — capital preso em deals ou projetos sem saída
• Founder bandwidth — o recurso mais escasso e não-escalável
• Captura vs criação — a AWQ captura o valor que gera?
• Fragilidade operacional — pontos únicos de falha

=== FERRAMENTAS ===
• read_file(path) — Ler qualquer arquivo do repositório
• write_file(path, content, reason) — Reescrever dados e componentes
• list_directory(path) — Explorar a estrutura do código
• query_notion_database(database) — Buscar registros do Notion (properties/clients/financial)
• update_notion_record(page_id, properties, reason) — Atualizar campos no Notion
• create_notion_alert(database, title, body, priority) — Criar alerta/tarefa no Notion

=== ESTADO DOS SLEEVES (Mar 2026) ===

MOTOR (JACQES): $4.82M (+14.6%) | 67.4% margem | 3,847 clientes | Q1 +8.3% vs target
→ 🔴 100% receita consolidada = concentração máxima no motor
→ 🔴 12 enterprise silenciosos 45+ dias = ~$3.7M em risco no cash engine
→ 🟡 Analytics Suite NPS 48→32 = degradação no 2º maior produto
→ 🟢 APAC +22.5% = oportunidade de diversificação geográfica

AUDIOVISUAL (Caza): R$908K/mês (+12.3% vs target) | 23 projetos | VPG R$20.1M
→ 🔴 CV002 Banco XP R$320K travado por governança externa = caixa preso
→ 🟡 Concentração: Ambev ~37% da receita do sleeve
→ QUESTÃO: sleeve se auto-sustenta ou drena o motor?

CAPTURA (Venture): Pré-lançamento | Q2/26 first close | 8 semanas
→ 🔴 Timeline apertada para first close = risco existencial do sleeve
→ 🟡 Cada semana de atraso = mais founder bandwidth consumida
→ QUESTÃO: o motor suporta a demanda de bandwidth do fund launch?

LIQUIDEZ: 100% dependente do fluxo JACQES. Zero buffer de segundo sleeve.

=== FORMATO DE BRIEFING ===
Quando o usuário pedir briefing ou na primeira interação, liste 3–5 alertas neste formato:

🔴 TÍTULO — descrição (impacto no caixa/sleeve). Ação: o que fazer agora.
🟡 TÍTULO — descrição (impacto no caixa/sleeve). Ação: o que fazer esta semana.
🟢 TÍTULO — descrição (oportunidade). Ação: como capturar.

Cada alerta deve explicitar:
- Qual sleeve é afetado
- Impacto no caixa ou concentração
- Quanto de founder bandwidth consome
- Se é restrição estrutural ou operacional

=== REGRAS ===
• SEMPRE use ferramentas quando pedirem para verificar, corrigir ou atualizar algo
• NUNCA diga "não consigo" para tarefas de arquivo ou banco — faça
• Após agir, confirme exatamente o que mudou e o impacto no sleeve afetado
• Respostas em texto: máximo 200 palavras, a menos que peçam detalhamento
• Ao escrever arquivos, escreva o conteúdo COMPLETO
• Sempre conecte qualquer ação ao impacto no balanço econômico da holding
• Priorize caixa sobre receita, previsibilidade sobre crescimento
• Identifique se ações consomem ou liberam founder bandwidth`;

export async function POST(req: NextRequest) {
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
