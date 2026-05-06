// GET   /api/venture/crm/oportunidades  — lista oportunidades VENTURE CRM
// POST  /api/venture/crm/oportunidades  — cria nova oportunidade
// PATCH /api/venture/crm/oportunidades  — atualiza oportunidade (body: { id, ...updates })

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import {
  listVentureCrmOpportunities,
  createVentureCrmOpportunity,
  updateVentureCrmOpportunity,
  deleteVentureCrmOpportunity,
} from "@/lib/venture-crm-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "awq_venture", "CRM Oportunidades Venture");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  return NextResponse.json(
    await listVentureCrmOpportunities({
      stage:     searchParams.get("stage")     ?? undefined,
      prioridade: searchParams.get("prioridade") ?? undefined,
    })
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "create", "awq_venture", "CRM Oportunidades Venture");
  if (denied) return denied;

  try {
    const body = await req.json() as Record<string, unknown>;
    if (!String(body.empresa ?? "").trim()) {
      return NextResponse.json({ error: "empresa é obrigatório" }, { status: 400 });
    }
    const today = new Date().toISOString().slice(0, 10);
    const opp = await createVentureCrmOpportunity({
      empresa:                    String(body.empresa ?? "").trim(),
      setor:                      String(body.setor ?? "").trim(),
      origem:                     String(body.origem ?? "").trim(),
      deal_type:                  String(body.deal_type ?? "Oportunidade em Diligência"),
      stage:                      String(body.stage ?? "Oportunidade"),
      probabilidade:              Number(body.probabilidade ?? 0),
      prioridade:                 (body.prioridade as "Alta" | "Média" | "Baixa") ?? "Média",
      responsavel:                String(body.responsavel ?? "AWQ Venture"),
      fee_mensal:                 body.fee_mensal != null ? Number(body.fee_mensal) : null,
      fee_mensal_quality:         String(body.fee_mensal_quality ?? "sem_dado"),
      arr:                        body.arr != null ? Number(body.arr) : null,
      arr_quality:                String(body.arr_quality ?? "sem_dado"),
      contract_value:             body.contract_value != null ? Number(body.contract_value) : null,
      contract_value_quality:     String(body.contract_value_quality ?? "sem_dado"),
      upside_pct:                 body.upside_pct != null ? Number(body.upside_pct) : null,
      upside_type:                String(body.upside_type ?? "") || null,
      upside_quality:             String(body.upside_quality ?? "sem_dado"),
      valor_patrimonial_estimado: body.valor_patrimonial_estimado != null ? Number(body.valor_patrimonial_estimado) : null,
      valor_patrimonial_quality:  String(body.valor_patrimonial_quality ?? "sem_dado"),
      proxima_acao:               String(body.proxima_acao ?? "").trim(),
      deal_ref:                   String(body.deal_ref ?? "") || null,
      notas_internas:             String(body.notas_internas ?? "").trim(),
      last_updated:               today,
    });
    return NextResponse.json(opp, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "update", "awq_venture", "CRM Oportunidades Venture");
  if (denied) return denied;

  try {
    const body = await req.json() as Record<string, unknown>;
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

    const updated = await updateVentureCrmOpportunity(id, body as never);
    if (!updated) return NextResponse.json({ error: "não encontrado" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "delete", "awq_venture", "CRM Oportunidades Venture");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

  await deleteVentureCrmOpportunity(id);
  return NextResponse.json({ ok: true });
}
