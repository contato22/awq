// GET /api/awq-venture/crm/deals   — lista deals
// POST /api/awq-venture/crm/deals  — cria deal
import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { listDeals, createDeal } from "@/lib/venture-crm-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "awq_venture", "CRM Venture — Deals");
  if (denied) return denied;
  return NextResponse.json(await listDeals());
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "create", "awq_venture", "CRM Venture — Deals");
  if (denied) return denied;

  try {
    const body = await req.json();
    if (!body.nome_deal?.trim()) {
      return NextResponse.json({ error: "nome_deal é obrigatório" }, { status: 400 });
    }
    const deal = await createDeal({
      lead_id:           body.lead_id           ?? null,
      nome_deal:         body.nome_deal.trim(),
      empresa:           body.empresa?.trim()         ?? "",
      setor:             body.setor?.trim()           ?? "",
      stage:             body.stage?.trim()           ?? "Triagem",
      ticket_midia:      Number(body.ticket_midia)    || 0,
      equity_percentual: Number(body.equity_percentual) || 0,
      valuation_pre:     Number(body.valuation_pre)   || 0,
      eta:               body.eta?.trim()             ?? "",
      score:             Number(body.score)           || 0,
      owner:             body.owner?.trim()           ?? "",
      data_abertura:     body.data_abertura           ?? new Date().toISOString().slice(0, 10),
      proxima_acao:      body.proxima_acao?.trim()    ?? "",
      data_proxima_acao: body.data_proxima_acao       ?? null,
      priority:          body.priority?.trim()        ?? "Média",
      close_reason:      body.close_reason?.trim()    ?? "",
      observacoes:       body.observacoes?.trim()     ?? "",
    });
    return NextResponse.json(deal, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
