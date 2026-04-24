// GET /api/caza/crm/oportunidades  — lista oportunidades da Caza Vision
// POST /api/caza/crm/oportunidades — cria nova oportunidade

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { initCazaCrmDB, listOpportunities, createOpportunity, updateOpportunity } from "@/lib/caza-crm-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "caza_vision", "CRM Oportunidades Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json([]);
  await initCazaCrmDB();
  return NextResponse.json(await listOpportunities());
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "create", "caza_vision", "CRM Oportunidades Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  try {
    const body = await req.json() as Record<string, unknown>;
    if (!String(body.nome_oportunidade ?? "").trim()) {
      return NextResponse.json({ error: "nome_oportunidade é obrigatório" }, { status: 400 });
    }

    await initCazaCrmDB();
    const today = new Date().toISOString().slice(0, 10);
    const opp = await createOpportunity({
      lead_id:           String(body.lead_id ?? "") || null,
      nome_oportunidade: String(body.nome_oportunidade ?? "").trim(),
      empresa:           String(body.empresa ?? "").trim(),
      tipo_servico:      String(body.tipo_servico ?? ""),
      valor_estimado:    Number(body.valor_estimado ?? 0),
      stage:             String(body.stage ?? "Lead Captado"),
      probabilidade:     Number(body.probabilidade ?? 10),
      owner:             String(body.owner ?? "").trim(),
      data_abertura:     String(body.data_abertura ?? today),
      prazo_estimado:    String(body.prazo_estimado ?? "") || null,
      proxima_acao:      String(body.proxima_acao ?? "").trim(),
      data_proxima_acao: String(body.data_proxima_acao ?? "") || null,
      risco:             String(body.risco ?? "Baixo"),
      motivo_perda:      String(body.motivo_perda ?? "").trim(),
      observacoes:       String(body.observacoes ?? "").trim(),
    });
    return NextResponse.json(opp, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "update", "caza_vision", "CRM Oportunidades Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  try {
    const body = await req.json() as Record<string, unknown>;
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

    await initCazaCrmDB();
    const updated = await updateOpportunity(id, {
      stage:             body.stage != null ? String(body.stage) : undefined,
      probabilidade:     body.probabilidade != null ? Number(body.probabilidade) : undefined,
      risco:             body.risco != null ? String(body.risco) : undefined,
      proxima_acao:      body.proxima_acao != null ? String(body.proxima_acao) : undefined,
      data_proxima_acao: body.data_proxima_acao != null ? (String(body.data_proxima_acao) || null) : undefined,
      motivo_perda:      body.motivo_perda != null ? String(body.motivo_perda) : undefined,
      observacoes:       body.observacoes != null ? String(body.observacoes) : undefined,
    });
    if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
