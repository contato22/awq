// GET /api/awq-venture/crm/leads   — lista leads
// POST /api/awq-venture/crm/leads  — cria lead
import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { listLeads, createLead } from "@/lib/venture-crm-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "awq_venture", "CRM Venture — Leads");
  if (denied) return denied;
  return NextResponse.json(await listLeads());
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "create", "awq_venture", "CRM Venture — Leads");
  if (denied) return denied;

  try {
    const body = await req.json();
    if (!body.nome_empresa?.trim()) {
      return NextResponse.json({ error: "nome_empresa é obrigatório" }, { status: 400 });
    }
    const lead = await createLead({
      nome_empresa:    body.nome_empresa.trim(),
      setor:           body.setor?.trim()           ?? "",
      estagio_empresa: body.estagio_empresa?.trim() ?? "",
      site:            body.site?.trim()            ?? "",
      nome_fundador:   body.nome_fundador?.trim()   ?? "",
      email:           body.email?.trim()           ?? "",
      telefone:        body.telefone?.trim()        ?? "",
      origem:          body.origem?.trim()          ?? "Indicação",
      status:          body.status?.trim()          ?? "Novo",
      owner:           body.owner?.trim()           ?? "",
      data_entrada:    body.data_entrada            ?? new Date().toISOString().slice(0, 10),
      pitch_url:       body.pitch_url?.trim()       ?? "",
      observacoes:     body.observacoes?.trim()     ?? "",
    });
    return NextResponse.json(lead, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
