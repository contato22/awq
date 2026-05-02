// GET /api/awq-venture/crm/interacoes   — lista interações
// POST /api/awq-venture/crm/interacoes  — cria interação
import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { listInteractions, createInteraction } from "@/lib/venture-crm-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "awq_venture", "CRM Venture — Interações");
  if (denied) return denied;
  return NextResponse.json(await listInteractions());
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "create", "awq_venture", "CRM Venture — Interações");
  if (denied) return denied;

  try {
    const body = await req.json();
    if (!body.resumo?.trim()) {
      return NextResponse.json({ error: "resumo é obrigatório" }, { status: 400 });
    }
    const interaction = await createInteraction({
      deal_id:      body.deal_id      ?? null,
      lead_id:      body.lead_id      ?? null,
      tipo:         body.tipo?.trim() ?? "Reunião",
      data:         body.data         ?? new Date().toISOString().slice(0, 10),
      resumo:       body.resumo.trim(),
      proximo_passo: body.proximo_passo?.trim() ?? "",
      responsavel:  body.responsavel?.trim()    ?? "",
      signal:       body.signal?.trim()         ?? "Neutro",
    });
    return NextResponse.json(interaction, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
