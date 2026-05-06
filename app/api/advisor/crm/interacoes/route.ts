// GET  /api/advisor/crm/interacoes  — lista interações ADVISOR CRM
// POST /api/advisor/crm/interacoes  — registra nova interação

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import {
  listAdvisorCrmInteractions,
  createAdvisorCrmInteraction,
} from "@/lib/advisor-crm-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "advisor", "CRM Interações Advisor");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  return NextResponse.json(
    await listAdvisorCrmInteractions({
      lead_id:        searchParams.get("lead_id")        ?? undefined,
      opportunity_id: searchParams.get("opportunity_id") ?? undefined,
      cliente_id:     searchParams.get("cliente_id")     ?? undefined,
    })
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "create", "advisor", "CRM Interações Advisor");
  if (denied) return denied;

  try {
    const body = await req.json() as Record<string, unknown>;
    if (!String(body.resumo ?? "").trim()) {
      return NextResponse.json({ error: "resumo é obrigatório" }, { status: 400 });
    }
    const today = new Date().toISOString().slice(0, 10);
    const interaction = await createAdvisorCrmInteraction({
      lead_id:        String(body.lead_id        ?? "") || null,
      opportunity_id: String(body.opportunity_id ?? "") || null,
      cliente_id:     String(body.cliente_id     ?? "") || null,
      tipo:           String(body.tipo           ?? "Ligação"),
      resumo:         String(body.resumo         ?? "").trim(),
      proximo_passo:  String(body.proximo_passo  ?? "").trim(),
      owner:          String(body.owner          ?? "").trim(),
      data:           String(body.data           ?? today),
      observacoes:    String(body.observacoes    ?? "").trim(),
    });
    return NextResponse.json(interaction, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
