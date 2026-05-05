// PATCH /api/jacqes/crm/oportunidades/[id]  — atualiza oportunidade
// DELETE /api/jacqes/crm/oportunidades/[id] — remove oportunidade
import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { updateOpportunity, deleteOpportunity } from "@/lib/jacqes-crm-db";

export const runtime = "nodejs";

export async function generateStaticParams() {
  return [{ id: "_" }];
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "update", "jacqes", "CRM JACQES — Oportunidades");
  if (denied) return denied;

  try {
    const body = await req.json();
    const opp = await updateOpportunity(params.id, body);
    if (!opp) {
      return NextResponse.json({ error: "Oportunidade não encontrada" }, { status: 404 });
    }
    return NextResponse.json(opp);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "delete", "jacqes", "CRM JACQES — Oportunidades");
  if (denied) return denied;

  try {
    const removed = await deleteOpportunity(params.id);
    if (!removed) {
      return NextResponse.json({ error: "Oportunidade não encontrada" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
