// GET  /api/venture/crm/propostas  — lista propostas VENTURE CRM
// POST /api/venture/crm/propostas  — cria nova proposta

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import {
  listVentureCrmProposals,
  createVentureCrmProposal,
} from "@/lib/venture-crm-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "awq_venture", "CRM Propostas Venture");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const opportunity_id = searchParams.get("opportunity_id") ?? undefined;
  return NextResponse.json(await listVentureCrmProposals(opportunity_id));
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "create", "awq_venture", "CRM Propostas Venture");
  if (denied) return denied;

  try {
    const body = await req.json() as Record<string, unknown>;
    if (!String(body.opportunity_id ?? "").trim()) {
      return NextResponse.json({ error: "opportunity_id é obrigatório" }, { status: 400 });
    }
    const proposal = await createVentureCrmProposal({
      opportunity_id:   String(body.opportunity_id ?? ""),
      versao:           Number(body.versao ?? 1),
      status:           String(body.status ?? "Rascunho"),
      titulo:           String(body.titulo ?? "").trim(),
      resumo_executivo: String(body.resumo_executivo ?? "").trim(),
      fee_mensal:       body.fee_mensal != null ? Number(body.fee_mensal) : null,
      fee_quality:      String(body.fee_quality ?? "sem_dado"),
      duracao_contrato: String(body.duracao_contrato ?? ""),
      descricao_upside: String(body.descricao_upside ?? ""),
      client_visible:   Boolean(body.client_visible ?? false),
      enviado_em:       String(body.enviado_em ?? "") || null,
      observacoes:      String(body.observacoes ?? "").trim(),
    });
    return NextResponse.json(proposal, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
