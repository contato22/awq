// GET /api/jacqes/crm/expansao — lista oportunidades de expansão
import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { listExpansion } from "@/lib/jacqes-crm-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "jacqes", "CRM JACQES — Expansão");
  if (denied) return denied;

  try {
    const data = await listExpansion();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
