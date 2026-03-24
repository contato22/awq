import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const SYSTEM_PROMPT = `You are OpenClaw, an AI business intelligence assistant for JACQES — a portfolio company of AWQ Group.
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

Customer Segments:
- Enterprise: 42% of revenue
- SMB: 31%
- Startup: 18%
- Individual: 9%

Regional Performance:
- North America: $1,928,600, 1,542 customers, +14.2%
- Europe: $1,445,000, 1,089 customers, +11.8%
- Asia Pacific: $896,500, 712 customers, +22.5%
- Middle East & Africa: $337,200, 284 customers, +31.0%
- Latin America: $214,200, 220 customers, +8.4%

Acquisition Channels:
- Organic Search: 48,200 sessions, 1,204 conversions, $1.42M revenue, CAC $0
- Paid Search: 22,400 sessions, 672 conversions, $890K revenue, CAC $180
- Direct: 18,900 sessions, 511 conversions, $760K revenue, CAC $0
- Referral: 12,500 sessions, 375 conversions, $640K revenue, CAC $45
- Social Media: 31,000 sessions, 496 conversions, $580K revenue, CAC $95
- Email: 14,700 sessions, 588 conversions, $531.5K revenue, CAC $12

Active Alerts:
- 12 enterprise customers not ordering in 45+ days (at-risk)
- Q1 2026 revenue exceeded target by 8.3% ($4.82M vs $4.45M goal)
- APAC showing 22.5% YoY growth — capacity planning needed
- Analytics Suite NPS dropped from 48 to 32 this month

Be concise, data-driven, and strategic. Use specific numbers when answering. Format responses clearly with bullet points when listing multiple items.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey === "sk-ant-api03-placeholder") {
      return new Response(
        JSON.stringify({
          error: "ANTHROPIC_API_KEY not configured. Please set a valid API key in .env.local.",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    const client = new Anthropic({ apiKey });

    const stream = client.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
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
    console.error("OpenClaw API error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
