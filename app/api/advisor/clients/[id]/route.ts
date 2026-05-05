// PATCH /api/advisor/clients/[id]  — atualiza cliente advisor
// DELETE /api/advisor/clients/[id] — remove cliente advisor
import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { initAdvisorDB, updateAdvisorClient, deleteAdvisorClient } from "@/lib/advisor-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

export async function generateStaticParams() {
  return [{ id: "_" }];
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "update", "advisor", "Clientes Advisor");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });
  await initAdvisorDB();

  try {
    const body = await req.json() as Record<string, unknown>;
    const client = await updateAdvisorClient(params.id, {
      name:          body.name          != null ? String(body.name)          : undefined,
      segmento:      body.segmento      != null ? String(body.segmento)      : undefined,
      tipo_servico:  body.tipo_servico  != null ? String(body.tipo_servico)  : undefined,
      aum:           body.aum           != null ? Number(body.aum)           : undefined,
      fee_mensal:    body.fee_mensal    != null ? Number(body.fee_mensal)    : undefined,
      status:        body.status        != null ? String(body.status)        : undefined,
      since:         body.since         != null ? String(body.since)         : undefined,
      responsavel:   body.responsavel   != null ? String(body.responsavel)   : undefined,
      contato_email: body.contato_email != null ? String(body.contato_email) : undefined,
      contato_phone: body.contato_phone != null ? String(body.contato_phone) : undefined,
      nps:           body.nps           != null ? Number(body.nps)           : undefined,
    });
    if (!client) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    return NextResponse.json(client);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "delete", "advisor", "Clientes Advisor");
  if (denied) return denied;

  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });
  await initAdvisorDB();

  try {
    await deleteAdvisorClient(params.id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
