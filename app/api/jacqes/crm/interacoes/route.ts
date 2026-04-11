// GET /api/jacqes/crm/interacoes   — lista interações
// POST /api/jacqes/crm/interacoes  — cria interação
import { NextRequest, NextResponse } from "next/server";
import { listInteractions, createInteraction } from "@/lib/jacqes-crm-db";

export const runtime = "nodejs";

export async function GET(): Promise<NextResponse> {
  const interactions = await listInteractions();
  return NextResponse.json(interactions);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json();
    if (!body.tipo?.trim()) {
      return NextResponse.json({ error: "tipo é obrigatório" }, { status: 400 });
    }
    if (!body.resumo?.trim()) {
      return NextResponse.json({ error: "resumo é obrigatório" }, { status: 400 });
    }
    const interaction = await createInteraction({
      cliente_id:           body.cliente_id           ?? null,
      opportunity_id:       body.opportunity_id       ?? null,
      lead_id:              body.lead_id              ?? null,
      tipo:                 body.tipo.trim(),
      canal:                body.canal?.trim()                ?? "",
      data:                 body.data                        ?? new Date().toISOString().slice(0, 10),
      resumo:               body.resumo.trim(),
      proximo_passo:        body.proximo_passo?.trim()        ?? "",
      responsavel:          body.responsavel?.trim()          ?? "",
      satisfacao_percebida: body.satisfacao_percebida?.trim() ?? "Neutro",
      risco_percebido:      body.risco_percebido?.trim()      ?? "Baixo",
    });
    return NextResponse.json(interaction, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
