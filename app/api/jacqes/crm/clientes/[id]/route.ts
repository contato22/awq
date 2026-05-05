// PATCH /api/jacqes/crm/clientes/[id]  — atualiza cliente
// DELETE /api/jacqes/crm/clientes/[id] — remove cliente
import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { updateCrmClient, deleteCrmClient } from "@/lib/jacqes-crm-db";

export const runtime = "nodejs";

export async function generateStaticParams() {
  return [{ id: "_" }];
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "update", "jacqes", "CRM JACQES — Clientes");
  if (denied) return denied;

  try {
    const body = await req.json();
    const client = await updateCrmClient(params.id, body);
    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }
    return NextResponse.json(client);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "delete", "jacqes", "CRM JACQES — Clientes");
  if (denied) return denied;

  try {
    const removed = await deleteCrmClient(params.id);
    if (!removed) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
