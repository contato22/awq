// GET /api/jacqes/crm/clientes   — lista clientes CRM
// POST /api/jacqes/crm/clientes  — cria cliente
import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { listCrmClients, createCrmClient } from "@/lib/jacqes-crm-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "jacqes", "CRM JACQES — Clientes");
  if (denied) return denied;

  const clients = await listCrmClients();
  return NextResponse.json(clients);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "create", "jacqes", "CRM JACQES — Clientes");
  if (denied) return denied;

  try {
    const body = await req.json();
    if (!body.nome?.trim()) {
      return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });
    }
    const client = await createCrmClient({
      nome:               body.nome.trim(),
      razao_social:       body.razao_social?.trim()      ?? "",
      cnpj:               body.cnpj?.trim()              ?? "",
      segmento:           body.segmento?.trim()          ?? "",
      produto_ativo:      body.produto_ativo?.trim()     ?? "",
      ticket_mensal:      Number(body.ticket_mensal)     || 0,
      inicio_relacao:     body.inicio_relacao             ?? null,
      owner:              body.owner?.trim()             ?? "",
      status_conta:       body.status_conta?.trim()      ?? "Ativo",
      health_score:       Number(body.health_score)      || 80,
      churn_risk:         body.churn_risk?.trim()        ?? "Baixo",
      potencial_expansao: Number(body.potencial_expansao) || 0,
      observacoes:        body.observacoes?.trim()       ?? "",
    });
    return NextResponse.json(client, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
