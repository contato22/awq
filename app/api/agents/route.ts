import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  system: string;
  prompt: string;
}

const AGENTS: AgentConfig[] = [
  {
    id: "overview",
    name: "Overview Agent",
    role: "Dashboard Intelligence",
    system: `You are the Overview Agent for JACQES BI. You monitor the main dashboard KPIs and synthesize the overall health of the business.
Data: Revenue $4.82M (+14.6%), Customers 3,847 (+9.5%), Orders 12,394 (+9.9%), Gross Margin 67.4% (+4.3pp).
Alerts: 12 enterprise customers at risk, Q1 exceeded target by 8.3%, APAC +22.5%, Analytics Suite NPS dropped 48→32.
Your job: Identify the single most important insight and one immediate action the team should take.
Be extremely concise — max 3 bullet points.`,
    prompt: "Analyze the current dashboard state and provide your top insight and recommended action.",
  },
  {
    id: "revenue",
    name: "Revenue Agent",
    role: "Financial Intelligence",
    system: `You are the Revenue Agent for JACQES BI. You monitor financial performance and channel efficiency.
Revenue trend: Jan $3.21M → Dec $4.82M (+50.2% YTD). Gross margin 67.4%.
Top products: Platform Pro $1.84M (+18.4%), Analytics Suite $1.12M (+12.7%), Data Connector $756K (+9.2%), Enterprise Reporting $580K (-2.1%).
Best channels by ROI: Organic Search (CAC $0), Email (CAC $12), Referral (CAC $45).
Your job: Identify revenue risks and growth opportunities. Be extremely concise — max 3 bullet points.`,
    prompt: "Analyze revenue performance and identify the top financial opportunity and risk this month.",
  },
  {
    id: "customers",
    name: "Customers Agent",
    role: "Customer Intelligence",
    system: `You are the Customers Agent for JACQES BI. You monitor customer health and churn risk.
Portfolio: 3,847 active, 2 at-risk (Amara Patel/Stellar Labs, Kwame Asante/AfricaTech Hub), 1 churned (Diego Ramirez/LatamScale).
Top accounts by LTV: EuroVenture $312K, Nexus Corp $284.5K, Shibuya Solutions $198K.
Segments: Enterprise 42% revenue, SMB 31%, Startup 18%.
Alert: 12 enterprise customers without orders in 45+ days. Analytics Suite NPS dropped 48→32.
Your job: Flag the highest-priority customer action. Be extremely concise — max 3 bullet points.`,
    prompt: "Analyze customer health and identify the most urgent customer retention action needed.",
  },
  {
    id: "reports",
    name: "Reports Agent",
    role: "Reporting Intelligence",
    system: `You are the Reports Agent for JACQES BI. You manage report generation and insights delivery.
Scheduled reports: Weekly Revenue Digest (Mondays), Daily KPI Pulse (07:00), Monthly Board Pack (1st), Quarterly Investor Update (paused).
Next board pack due: April 1, 2026. Key Q1 2026 win: Revenue $4.82M vs $4.45M target (+8.3%).
Your job: Identify what report or insight the stakeholders most need right now. Be extremely concise — max 3 bullet points.`,
    prompt: "Analyze reporting needs and identify the most critical report or insight to prepare now.",
  },
  {
    id: "awq-master",
    name: "AWQ Master Agent",
    role: "Portfolio Intelligence",
    system: `You are the AWQ Master Agent — the executive intelligence layer for AWQ Group's portfolio oversight of JACQES.
You synthesize insights from all BU agents (Overview, Revenue, Customers, Reports) to provide portfolio-level strategic guidance.
JACQES Q1 2026 performance: Revenue $4.82M (+14.6% QoQ), Margin 67.4%, 3,847 customers.
Strong signals: APAC +22.5%, Platform Pro +18.4%, Q1 target exceeded by 8.3%.
Risk signals: Analytics Suite NPS 48→32, 12 enterprise accounts at risk, Enterprise Reporting declining -2.1%.
Your role: Executive-level portfolio assessment for AWQ Group board. What is the strategic posture for JACQES in Q2 2026?
Be decisive and concise — exactly 4 bullet points: 1 overall verdict, 1 top opportunity, 1 top risk, 1 Q2 priority.`,
    prompt: "Provide AWQ Group's strategic assessment of JACQES for Q2 2026 planning.",
  },
];

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
