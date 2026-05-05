// PATCH /api/jacqes/crm/expansao/[id]  — atualiza expansão
// DELETE /api/jacqes/crm/expansao/[id] — remove expansão
import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { updateExpansion, deleteExpansion } from "@/lib/jacqes-crm-db";

export const runtime = "nodejs";

export async function generateStaticParams() {
  return [{ id: "_" }];
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "update", "jacqes", "CRM JACQES — Expansão");
  if (denied) return denied;

  try {
    const body = await req.json();
    const expansion = await updateExpansion(params.id, body);
    if (!expansion) {
      return NextResponse.json({ error: "Expansão não encontrada" }, { status: 404 });
    }
    return NextResponse.json(expansion);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "delete", "jacqes", "CRM JACQES — Expansão");
  if (denied) return denied;

  try {
    const removed = await deleteExpansion(params.id);
    if (!removed) {
      return NextResponse.json({ error: "Expansão não encontrada" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
