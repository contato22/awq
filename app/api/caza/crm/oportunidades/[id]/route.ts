// PATCH /api/caza/crm/oportunidades/[id] — editar oportunidade
// DELETE /api/caza/crm/oportunidades/[id] — remover oportunidade

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { initCazaCrmDB, updateOpportunity, deleteOpportunity } from "@/lib/caza-crm-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function generateStaticParams() {
  return [{ id: "_" }];
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "update", "caza_vision", "CRM Oportunidade Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });
  await initCazaCrmDB();

  const body = await req.json() as Record<string, unknown>;
  const updated = await updateOpportunity(params.id, {
    nome_oportunidade: body.nome_oportunidade != null ? String(body.nome_oportunidade).trim() : undefined,
    empresa:           body.empresa           != null ? String(body.empresa).trim()           : undefined,
    tipo_servico:      body.tipo_servico      != null ? String(body.tipo_servico)             : undefined,
    valor_estimado:    body.valor_estimado    != null ? Number(body.valor_estimado)           : undefined,
    stage:             body.stage             != null ? String(body.stage)                    : undefined,
    probabilidade:     body.probabilidade     != null ? Number(body.probabilidade)            : undefined,
    owner:             body.owner             != null ? String(body.owner).trim()             : undefined,
    prazo_estimado:    body.prazo_estimado    != null ? (String(body.prazo_estimado) || null) : undefined,
    proxima_acao:      body.proxima_acao      != null ? String(body.proxima_acao).trim()      : undefined,
    data_proxima_acao: body.data_proxima_acao != null ? (String(body.data_proxima_acao) || null) : undefined,
    risco:                 body.risco                 != null ? String(body.risco)                                : undefined,
    motivo_perda:          body.motivo_perda          != null ? String(body.motivo_perda).trim()                  : undefined,
    observacoes:           body.observacoes           != null ? String(body.observacoes).trim()                   : undefined,
    data_ultima_interacao: body.data_ultima_interacao != null ? (String(body.data_ultima_interacao) || null)      : undefined,
    tipo_negocio:          body.tipo_negocio          != null ? String(body.tipo_negocio)                        : undefined,
  });

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "delete", "caza_vision", "CRM Oportunidade Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });
  await initCazaCrmDB();
  await deleteOpportunity(params.id);
  return NextResponse.json({ ok: true });
}
