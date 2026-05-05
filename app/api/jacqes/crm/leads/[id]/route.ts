// PATCH /api/jacqes/crm/leads/[id]  — atualiza lead
// DELETE /api/jacqes/crm/leads/[id] — remove lead
import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { updateLead, deleteLead } from "@/lib/jacqes-crm-db";

export const runtime = "nodejs";

export async function generateStaticParams() {
  return [{ id: "_" }];
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "update", "jacqes", "CRM JACQES — Leads");
  if (denied) return denied;

  try {
    const body = await req.json();
    const lead = await updateLead(params.id, body);
    if (!lead) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }
    return NextResponse.json(lead);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const denied = await apiGuard(req, "delete", "jacqes", "CRM JACQES — Leads");
  if (denied) return denied;

  try {
    const removed = await deleteLead(params.id);
    if (!removed) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
