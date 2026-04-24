// GET /api/caza/crm/leads  — lista leads da Caza Vision
// POST /api/caza/crm/leads — cria novo lead

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { initCazaCrmDB, listLeads, createLead } from "@/lib/caza-crm-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "caza_vision", "CRM Leads Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json([]);
  await initCazaCrmDB();
  return NextResponse.json(await listLeads());
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "create", "caza_vision", "CRM Leads Caza Vision");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  try {
    const body = await req.json() as Record<string, unknown>;
    if (!String(body.nome ?? "").trim()) {
      return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });
    }

    await initCazaCrmDB();
    const today = new Date().toISOString().slice(0, 10);
    const lead = await createLead({
      nome:              String(body.nome ?? "").trim(),
      empresa:           String(body.empresa ?? "").trim(),
      contato_principal: String(body.contato_principal ?? "").trim(),
      telefone:          String(body.telefone ?? "").trim(),
      email:             String(body.email ?? "").trim(),
      origem:            String(body.origem ?? "Outro"),
      tipo_servico:      String(body.tipo_servico ?? ""),
      interesse:         String(body.interesse ?? "").trim(),
      status:            String(body.status ?? "Novo"),
      owner:             String(body.owner ?? "").trim(),
      data_entrada:      String(body.data_entrada ?? today),
      observacoes:       String(body.observacoes ?? "").trim(),
    });
    return NextResponse.json(lead, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
