// GET /api/advisor/crm/clientes   — lista clientes
// POST /api/advisor/crm/clientes  — cria cliente
import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { listCrmClients, createCrmClient } from "@/lib/advisor-crm-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "advisor", "CRM Advisor — Clientes");
  if (denied) return denied;

  const clients = await listCrmClients();
  return NextResponse.json(clients);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "create", "advisor", "CRM Advisor — Clientes");
  if (denied) return denied;

  try {
    const body = await req.json();
    if (!body.nome?.trim()) {
      return NextResponse.json({ error: "nome é obrigatório" }, { status: 400 });
    }
    const client = await createCrmClient({
      nome:               body.nome.trim(),
      razao_social:       body.razao_social?.trim()   ?? "",
      cnpj:               body.cnpj?.trim()           ?? "",
      segmento:           body.segmento?.trim()       ?? "",
      servico_ativo:      body.servico_ativo?.trim()  ?? "",
      fee_mensal:         Number(body.fee_mensal)     || 0,
      inicio_relacao:     body.inicio_relacao         ?? null,
      owner:              body.owner?.trim()          ?? "",
      status_conta:       body.status_conta?.trim()   ?? "Ativo",
      health_score:       Number(body.health_score)   || 80,
      churn_risk:         body.churn_risk?.trim()     ?? "Baixo",
      potencial_expansao: Number(body.potencial_expansao) || 0,
      observacoes:        body.observacoes?.trim()    ?? "",
    });
    return NextResponse.json(client, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
