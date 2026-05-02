// GET /api/advisor/crm/oportunidades   — lista oportunidades
// POST /api/advisor/crm/oportunidades  — cria oportunidade
import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { listOpportunities, createOpportunity } from "@/lib/advisor-crm-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "advisor", "CRM Advisor — Oportunidades");
  if (denied) return denied;

  const opps = await listOpportunities();
  return NextResponse.json(opps);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "create", "advisor", "CRM Advisor — Oportunidades");
  if (denied) return denied;

  try {
    const body = await req.json();
    if (!body.nome_oportunidade?.trim()) {
      return NextResponse.json({ error: "nome_oportunidade é obrigatório" }, { status: 400 });
    }
    const opp = await createOpportunity({
      lead_id:            body.lead_id             ?? null,
      cliente_id:         body.cliente_id          ?? null,
      nome_oportunidade:  body.nome_oportunidade.trim(),
      empresa:            body.empresa?.trim()     ?? "",
      tipo_servico:       body.tipo_servico?.trim()  ?? "",
      valor_estimado:     Number(body.valor_estimado) || 0,
      recorrencia_mensal: body.recorrencia_mensal ? Number(body.recorrencia_mensal) : null,
      stage:              body.stage?.trim()       ?? "Prospecção",
      probabilidade:      Number(body.probabilidade) || 20,
      owner:              body.owner?.trim()       ?? "",
      data_abertura:      body.data_abertura       ?? new Date().toISOString().slice(0, 10),
      prazo_estimado:     body.prazo_estimado      ?? null,
      proxima_acao:       body.proxima_acao?.trim()  ?? "",
      data_proxima_acao:  body.data_proxima_acao   ?? null,
      risco:              body.risco?.trim()       ?? "Baixo",
      motivo_perda:       body.motivo_perda?.trim()  ?? "",
      observacoes:        body.observacoes?.trim()   ?? "",
    });
    return NextResponse.json(opp, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
