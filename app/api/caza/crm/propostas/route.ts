// GET /api/caza/crm/propostas  — lista propostas da Caza Vision
// POST /api/caza/crm/propostas — cria nova proposta

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { initCazaCrmDB, listProposals, createProposal, updateProposal } from "@/lib/caza-crm-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "caza_vision", "CRM Propostas Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json([]);
  await initCazaCrmDB();
  return NextResponse.json(await listProposals());
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "create", "caza_vision", "CRM Propostas Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  try {
    const body = await req.json() as Record<string, unknown>;
    if (!String(body.opportunity_id ?? "").trim()) {
      return NextResponse.json({ error: "opportunity_id é obrigatório" }, { status: 400 });
    }

    await initCazaCrmDB();
    const proposal = await createProposal({
      opportunity_id: String(body.opportunity_id ?? ""),
      versao:         Number(body.versao ?? 1),
      valor_proposto: Number(body.valor_proposto ?? 0),
      escopo:         String(body.escopo ?? "").trim(),
      status:         String(body.status ?? "Em Elaboração"),
      data_envio:     String(body.data_envio ?? "") || null,
      data_resposta:  String(body.data_resposta ?? "") || null,
      observacoes:    String(body.observacoes ?? "").trim(),
    });
    return NextResponse.json(proposal, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "update", "caza_vision", "CRM Propostas Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  try {
    const body = await req.json() as Record<string, unknown>;
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });

    await initCazaCrmDB();
    const updated = await updateProposal(id, {
      status:        body.status != null ? String(body.status) : undefined,
      valor_proposto: body.valor_proposto != null ? Number(body.valor_proposto) : undefined,
      data_envio:    body.data_envio != null ? (String(body.data_envio) || null) : undefined,
      data_resposta: body.data_resposta != null ? (String(body.data_resposta) || null) : undefined,
      observacoes:   body.observacoes != null ? String(body.observacoes) : undefined,
    });
    if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
