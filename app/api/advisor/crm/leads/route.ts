// GET /api/advisor/crm/leads   — lista leads
// POST /api/advisor/crm/leads  — cria lead
import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { listLeads, createLead } from "@/lib/advisor-crm-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "advisor", "CRM Advisor — Leads");
  if (denied) return denied;

  const leads = await listLeads();
  return NextResponse.json(leads);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "create", "advisor", "CRM Advisor — Leads");
  if (denied) return denied;

  try {
    const body = await req.json();
    if (!body.nome?.trim()) {
      return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });
    }
    if (!body.owner?.trim()) {
      return NextResponse.json({ error: "owner é obrigatório" }, { status: 400 });
    }
    const lead = await createLead({
      nome:         body.nome.trim(),
      cargo:        body.cargo?.trim()         ?? "",
      empresa:      body.empresa?.trim()       ?? "",
      cnpj:         body.cnpj?.trim()          ?? "",
      telefone:     body.telefone?.trim()      ?? "",
      email:        body.email?.trim()         ?? "",
      origem:       body.origem?.trim()        ?? "Indicação",
      tipo_servico: body.tipo_servico?.trim()  ?? "",
      interesse:    body.interesse?.trim()     ?? "",
      status:       body.status?.trim()        ?? "Novo",
      owner:        body.owner.trim(),
      data_entrada: body.data_entrada          ?? new Date().toISOString().slice(0, 10),
      observacoes:  body.observacoes?.trim()   ?? "",
    });
    return NextResponse.json(lead, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
