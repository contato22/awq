// GET  /api/advisor/crm/oportunidades  — lista oportunidades ADVISOR CRM
// POST /api/advisor/crm/oportunidades  — cria nova oportunidade
// PATCH /api/advisor/crm/oportunidades — atualiza oportunidade (body: { id, ...updates })

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import {
  listAdvisorCrmOpportunities,
  createAdvisorCrmOpportunity,
  updateAdvisorCrmOpportunity,
  deleteAdvisorCrmOpportunity,
} from "@/lib/advisor-crm-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "advisor", "CRM Oportunidades Advisor");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  return NextResponse.json(
    await listAdvisorCrmOpportunities({
      stage: searchParams.get("stage") ?? undefined,
      owner: searchParams.get("owner") ?? undefined,
    })
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "create", "advisor", "CRM Oportunidades Advisor");
  if (denied) return denied;

  try {
    const body = await req.json() as Record<string, unknown>;
    if (!String(body.nome_oportunidade ?? "").trim()) {
      return NextResponse.json({ error: "nome_oportunidade é obrigatório" }, { status: 400 });
    }
    const today = new Date().toISOString().slice(0, 10);
    const opp = await createAdvisorCrmOpportunity({
      lead_id:                  String(body.lead_id ?? "") || null,
      nome_oportunidade:        String(body.nome_oportunidade ?? "").trim(),
      empresa:                  String(body.empresa ?? "").trim(),
      segmento:                 String(body.segmento ?? "").trim(),
      tipo_servico:             String(body.tipo_servico ?? ""),
      fee_estimado_mensal:      Number(body.fee_estimado_mensal ?? 0),
      aum_potencial:            body.aum_potencial != null ? Number(body.aum_potencial) : null,
      stage:                    String(body.stage ?? "Novo Lead"),
      probabilidade:            Number(body.probabilidade ?? 20),
      owner:                    String(body.owner ?? "").trim(),
      data_abertura:            String(body.data_abertura ?? today),
      data_fechamento_prevista: String(body.data_fechamento_prevista ?? "") || null,
      proxima_acao:             String(body.proxima_acao ?? "").trim(),
      data_proxima_acao:        String(body.data_proxima_acao ?? "") || null,
      risco:                    String(body.risco ?? "Baixo"),
      motivo_perda:             String(body.motivo_perda ?? ""),
      observacoes:              String(body.observacoes ?? "").trim(),
    });
    return NextResponse.json(opp, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "update", "advisor", "CRM Oportunidades Advisor");
  if (denied) return denied;

  try {
    const body = await req.json() as Record<string, unknown>;
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

    const updated = await updateAdvisorCrmOpportunity(id, body as never);
    if (!updated) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "delete", "advisor", "CRM Oportunidades Advisor");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

  await deleteAdvisorCrmOpportunity(id);
  return NextResponse.json({ ok: true });
}
