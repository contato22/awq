import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { guard } from "@/lib/security-guard";

const SYSTEM_PROMPTS: Record<string, string> = {
  awq: `You are OpenClaw, an AI business intelligence assistant for AWQ Group — a holding company with four business units.

AWQ Group Overview (YTD Q1 2026, Jan–Mar):
- Consolidated Operating Revenue: R$8.81M (JACQES + Caza Vision + Advisor)
- Active BUs: 4 (JACQES, Caza Vision, Advisor, AWQ Venture — all operational)
- Total Operating Clients: 48 (10 JACQES, 8 Caza Vision, 30 Advisor)
- Consolidated EBITDA Margin: 26.0%
- AWQ Venture: R$40.5M capital allocated, R$18.5M exit proceeds (Saúde Digital), ROIC 137.3%

Business Units:
1. JACQES (Agência) — Ativo | Receita: R$4.82M | Clientes: 10 | EBITDA: 18.0%
2. Caza Vision (Produtora) — Ativo | Receita: R$2.42M | Clientes: 8 | EBITDA: 27.0%
3. Advisor (Consultoria) — Ativo | Receita: R$1.57M | Clientes: 30 | EBITDA: 46.0%
4. AWQ Venture (Investimentos) — Ativo | Capital: R$40.5M | Dry powder: R$6.2M

Focus on group-level strategy, cross-BU comparisons, consolidated financials, and portfolio-level insights.
Be concise, data-driven, and strategic. Use specific numbers when available. Format with bullet points when listing items.`,

  jacqes: `You are OpenClaw, an AI business intelligence assistant for JACQES — a B2B creative and marketing agency, portfolio company of AWQ Group.
You have deep knowledge of the AWQ platform JACQES module data and help analysts interpret metrics, spot trends, and make strategic recommendations.

Current JACQES Data Context (YTD Q1 2026, Jan–Mar):

KPIs:
- Receita Bruta: R$4.820M (budget: R$4.44M, +8.6% vs meta)
- Contas Ativas: 10 (prev: 9)
- NPS Médio: 69 (prev: 72)
- Margem Bruta: 60.0% (prev: 57.2%)

Revenue Trend FY2025 (monthly):
Jan R$850K → Fev R$910K → Mar R$940K → Abr R$980K → Mai R$1.02M → Jun R$1.06M → Jul R$1.10M → Ago R$1.15M → Set R$1.11M → Out R$1.20M → Nov R$1.31M → Dez R$1.42M

Top Services:
1. Branding & Identidade (Estratégia) — R$1.842M, 8 contas, +18.4% (trending)
2. Estratégia & Planejamento (Consultoria) — R$1.120M, 10 contas, +12.7% (trending)
3. Mídia Paga (Performance) — R$756K, 7 contas, +9.2% (stable)
4. Conteúdo & Social (Produção) — R$580K, 6 contas, -2.1% (declining)
5. Projetos Especiais (Ativação) — R$522K, 4 contas, +6.8% (stable)

Client Segments: Enterprise 50%, Mid Market 30%, SMB 20%

Key Clients: Ambev, Samsung Brasil, Natura, Nike Brasil, iFood, Banco XP, Nubank, Arezzo, Magazine Luiza

Regional Performance (Brasil):
- SP Capital: R$3.615M, 7 contas, +14.2%
- Interior SP: R$482K, 1 conta, +11.8%
- Rio de Janeiro: R$482K, 1 conta, +22.5%
- Sul do Brasil: R$241K, 1 conta, +8.4%

Acquisition Channels (best ROI): Indicação/Referral CAC R$0, Email/Outbound CAC R$12, Parceiros CAC R$45

Active Alerts:
- Banco XP (JC006): NPS 42, churn risco Alto — R$230K MRR em risco
- Meta Q1 batida: R$4.82M vs R$4.44M budget (+8.6%)
- Magazine Luiza (JC010) onboardado Mar/26 — MRR R$260K
- NPS Conteúdo & Social caiu de 68 para 51 — revisão necessária

Focus on client health (churn, NPS, SLA), CS ops, agency processes, and JACQES-specific metrics.
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
  // ── RBAC guard: skip entirely when NEXTAUTH_SECRET is absent (matches apiGuard behaviour) ──
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret) {
    const token   = await getToken({ req, secret });
    const user_id = (token?.email as string | undefined) ?? "anonymous";
    const rawRole = (token?.role  as string | undefined) ?? "anonymous";
    const { result: guardResult, reason: guardReason } = guard(
      user_id, rawRole, "/api/chat", "ai", "view", "OpenClaw — Chat IA"
    );
    if (guardResult === "blocked") {
      return new Response(
        JSON.stringify({ error: "Acesso negado", code: "RBAC_DENIED", reason: guardReason }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
  }

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
      model: "claude-opus-4-7",
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
