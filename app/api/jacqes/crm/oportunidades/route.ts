// GET /api/jacqes/crm/oportunidades   — lista oportunidades
// POST /api/jacqes/crm/oportunidades  — cria oportunidade
import { NextRequest, NextResponse } from "next/server";
import { listOpportunities, createOpportunity } from "@/lib/jacqes-crm-db";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const opps = await listOpportunities();
  return NextResponse.json(opps);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    if (!body.nome_oportunidade?.trim()) {
      return NextResponse.json({ error: "nome_oportunidade é obrigatório" }, { status: 400 });
    }
    if (!body.owner?.trim()) {
      return NextResponse.json({ error: "owner é obrigatório" }, { status: 400 });
    }
    if (!body.stage?.trim()) {
      return NextResponse.json({ error: "stage é obrigatório" }, { status: 400 });
    }
    const opp = await createOpportunity({
      lead_id:                 body.lead_id                 ?? null,
      cliente_id:              body.cliente_id              ?? null,
      nome_oportunidade:       body.nome_oportunidade.trim(),
      empresa:                 body.empresa?.trim()         ?? "",
      segmento:                body.segmento?.trim()        ?? "",
      produto:                 body.produto?.trim()         ?? "",
      ticket_estimado:         Number(body.ticket_estimado) || 0,
      valor_potencial:         Number(body.valor_potencial) || 0,
      stage:                   body.stage.trim(),
      probabilidade:           Number(body.probabilidade)   || 20,
      owner:                   body.owner.trim(),
      data_abertura:           body.data_abertura           ?? new Date().toISOString().slice(0, 10),
      proxima_acao:            body.proxima_acao?.trim()    ?? "",
      data_proxima_acao:       body.data_proxima_acao       ?? null,
      risco:                   body.risco?.trim()           ?? "Baixo",
      motivo_perda:            body.motivo_perda?.trim()    ?? "",
      data_fechamento_prevista: body.data_fechamento_prevista ?? null,
      observacoes:             body.observacoes?.trim()     ?? "",
    });
    return NextResponse.json(opp, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
