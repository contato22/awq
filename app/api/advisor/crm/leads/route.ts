// GET  /api/advisor/crm/leads  — lista leads ADVISOR CRM
// POST /api/advisor/crm/leads  — cria novo lead

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import {
  listAdvisorCrmLeads,
  createAdvisorCrmLead,
} from "@/lib/advisor-crm-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "advisor", "CRM Leads Advisor");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  return NextResponse.json(
    await listAdvisorCrmLeads({
      status: searchParams.get("status") ?? undefined,
      owner:  searchParams.get("owner")  ?? undefined,
    })
  );
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "create", "advisor", "CRM Leads Advisor");
  if (denied) return denied;

  try {
    const body = await req.json() as Record<string, unknown>;
    if (!String(body.nome ?? "").trim()) {
      return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });
    }
    const today = new Date().toISOString().slice(0, 10);
    const lead = await createAdvisorCrmLead({
      nome:              String(body.nome ?? "").trim(),
      cargo:             String(body.cargo ?? "").trim(),
      empresa:           String(body.empresa ?? "").trim(),
      segmento:          String(body.segmento ?? "").trim(),
      contato_principal: String(body.contato_principal ?? "").trim(),
      telefone:          String(body.telefone ?? "").trim(),
      email:             String(body.email ?? "").trim(),
      origem:            String(body.origem ?? "Indicação"),
      tipo_servico:      String(body.tipo_servico ?? ""),
      aum_estimado:      body.aum_estimado != null ? Number(body.aum_estimado) : null,
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
