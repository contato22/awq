// GET  /api/venture/crm/interacoes  — lista interações VENTURE CRM
// POST /api/venture/crm/interacoes  — registra nova interação

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import {
  listVentureCrmInteractions,
  createVentureCrmInteraction,
} from "@/lib/venture-crm-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "awq_venture", "CRM Interações Venture");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const opportunity_id = searchParams.get("opportunity_id") ?? undefined;
  return NextResponse.json(await listVentureCrmInteractions(opportunity_id));
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "create", "awq_venture", "CRM Interações Venture");
  if (denied) return denied;

  try {
    const body = await req.json() as Record<string, unknown>;
    if (!String(body.resumo ?? "").trim()) {
      return NextResponse.json({ error: "resumo é obrigatório" }, { status: 400 });
    }
    const today = new Date().toISOString().slice(0, 10);
    const interaction = await createVentureCrmInteraction({
      opportunity_id: String(body.opportunity_id ?? "") || null,
      tipo:           String(body.tipo ?? "Ligação"),
      resumo:         String(body.resumo ?? "").trim(),
      proximo_passo:  String(body.proximo_passo ?? "").trim(),
      responsavel:    String(body.responsavel ?? "AWQ Venture"),
      data:           String(body.data ?? today),
      observacoes:    String(body.observacoes ?? "").trim(),
    });
    return NextResponse.json(interaction, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
