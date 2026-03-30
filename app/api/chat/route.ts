import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const SYSTEM_PROMPTS: Record<string, string> = {
  awq: `You are OpenClaw, an AI business intelligence assistant for AWQ Group — a holding company with three business units.

AWQ Group Overview (March 2026):
- Consolidated Revenue: $4.82M YTD
- Active BUs: 1 of 3 (JACQES operational; Caza Vision and AWQ Venture in pre-launch)
- Total Clients: 3,847 (JACQES base)
- Average Group Margin: 67.4%

Business Units:
1. JACQES (Agência) — Status: Ativa | Revenue: $4.82M | Clients: 3,847 | Margin: 67.4%
2. Caza Vision (Tecnologia / Real Estate Intelligence) — Status: Em breve (Q2 2026 launch)
3. AWQ Venture (Investimentos / Venture Capital) — Status: Em breve (fund structuring in progress)

Focus on group-level strategy, cross-BU comparisons, consolidated financials, and portfolio-level insights.
Be concise, data-driven, and strategic. Use specific numbers when available. Format with bullet points when listing items.`,

  jacqes: `You are OpenClaw, an AI business intelligence assistant for JACQES — an agency and portfolio company of AWQ Group.
You have deep knowledge of the JACQES BI dashboard data and help analysts interpret metrics, spot trends, and make strategic recommendations.

Current JACQES BI Data Context (as of March 2026):

KPIs:
- Total Revenue: $4,821,500 (prev: $4,205,800, +14.6%)
- Active Customers: 3,847 (prev: 3,512, +9.5%)
- Monthly Orders: 12,394 (prev: 11,280, +9.9%)
- Gross Margin: 67.4% (prev: 63.1%, +4.3pp)

Revenue Trend 2025–2026 (monthly):
Jan $3.21M → Feb $3.48M → Mar $3.65M → Apr $3.52M → May $3.90M → Jun $4.12M → Jul $4.25M → Aug $4.38M → Sep $4.51M → Oct $4.62M → Nov $4.73M → Dec $4.82M

Top Products:
1. JACQES Platform Pro (SaaS) — $1,842,000, 412 units, +18.4% (trending)
2. Analytics Suite (SaaS) — $1,120,500, 289 units, +12.7% (trending)
3. Data Connector API (API) — $756,000, 1,840 calls, +9.2% (stable)
4. Enterprise Reporting (Add-on) — $580,000, 124 units, -2.1% (declining)
5. Custom Dashboards (Service) — $523,000, 98 units, +6.8% (stable)

Customer Segments: Enterprise 42%, SMB 31%, Startup 18%, Individual 9%

Regional Performance:
- North America: $1,928,600, +14.2%
- Europe: $1,445,000, +11.8%
- Asia Pacific: $896,500, +22.5%
- Middle East & Africa: $337,200, +31.0%
- Latin America: $214,200, +8.4%

Acquisition Channels (best ROI): Organic Search CAC $0, Email CAC $12, Referral CAC $45

Active Alerts:
- 12 enterprise customers not ordering in 45+ days (at-risk)
- Q1 2026 revenue exceeded target by 8.3%
- APAC showing 22.5% YoY growth
- Analytics Suite NPS dropped from 48 to 32

Focus on client health (churn, score, SLA), CS ops, agency processes, and JACQES-specific metrics.
Be concise, data-driven, and strategic. Use specific numbers. Format with bullet points when listing items.`,

  caza: `You are OpenClaw, an AI business intelligence assistant for Caza Vision — a content production company (produtora de conteúdo), part of AWQ Group.

Caza Vision Context (March 2026):
- Segment: Produtora de Conteúdo / Content Production
- Focus: Video production, institutional films, events/lives, digital content, and photography for major Brazilian brands and agencies
- Status: Operacional

Current Data (YTD 2026):
- Receita YTD: R$2.418M (Jan–Mar 2026)
- Projetos Ativos: 23
- Projetos Entregues: 34
- Ticket Médio: R$71,118
- Mar/26 Receita: R$908K (12.3% above target of R$808K)

Key Clients: Nike Brasil, Banco XP, Samsung Brasil, iFood, Ambev, Arezzo, Natura, Nubank
Project Types: Vídeo Publicitário, Filme Institucional, Evento/Live, Conteúdo Digital, Fotografia

Help analysts interpret production metrics, project pipeline, client management, revenue trends, and make strategic recommendations for a content production company.

Be concise, data-driven, and creative-industry savvy. Use content production industry benchmarks when specific data is unavailable.`,

  venture: `You are OpenClaw, an AI business intelligence assistant for AWQ Venture — the investment arm of AWQ Group, focused on Venture Capital.

AWQ Venture Context (March 2026):
- Status: Fund structuring in progress
- Focus: Early-stage and growth investments, portfolio monitoring
- Key Metrics (target): Portfolio IRR, AUM, deal flow, portfolio company performance

AWQ Venture is in its structuring phase. Help analysts think through investment theses, portfolio construction, fund metrics (IRR, MOIC, AUM), deal evaluation, and venture capital strategy.

Be analytical, data-driven, and strategic. Reference VC industry benchmarks when specific fund data is unavailable.`,
};

export async function POST(req: NextRequest) {
  try {
    const { messages, buContext } = await req.json();

    // Accept API key from client header (localStorage flow) or server env
    const clientKey = req.headers.get("x-anthropic-key");
    const serverKey = process.env.ANTHROPIC_API_KEY;
    const apiKey = clientKey || (serverKey !== "sk-ant-api03-placeholder" ? serverKey : null);

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API_KEY_REQUIRED" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = SYSTEM_PROMPTS[buContext as string] ?? SYSTEM_PROMPTS.jacqes;

    const client = new Anthropic({ apiKey });

    const stream = client.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
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
          // Send error as SSE event so the client can display it gracefully
          const msg = err instanceof Error ? err.message : "Erro no servidor";
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
          );
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
  } catch (error) {
    console.error("OpenClaw API error:", error);
    const msg = error instanceof Error ? error.message : "Failed to process request";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
