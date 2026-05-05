// GET  /api/jacqes/crm/expansao — lista oportunidades de expansão
// POST /api/jacqes/crm/expansao — cria oportunidade de expansão
import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { listExpansion, createExpansion } from "@/lib/jacqes-crm-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "jacqes", "CRM JACQES — Expansão");
  if (denied) return denied;

  const data = await listExpansion();
  return NextResponse.json(data);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "create", "jacqes", "CRM JACQES — Expansão");
  if (denied) return denied;

  try {
    const body = await req.json();
    if (!body.owner?.trim()) {
      return NextResponse.json({ error: "owner é obrigatório" }, { status: 400 });
    }
    if (!body.proxima_acao?.trim()) {
      return NextResponse.json({ error: "proxima_acao é obrigatória" }, { status: 400 });
    }
    const expansion = await createExpansion({
      cliente_id:      body.cliente_id      ?? "",
      tipo:            body.tipo?.trim()    ?? "Upsell",
      valor_potencial: Number(body.valor_potencial) || 0,
      status:          body.status?.trim()  ?? "Identificada",
      owner:           body.owner.trim(),
      proxima_acao:    body.proxima_acao.trim(),
      observacoes:     body.observacoes?.trim() ?? "",
    });
    return NextResponse.json(expansion, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
