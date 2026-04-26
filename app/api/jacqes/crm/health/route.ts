// GET /api/jacqes/crm/health — lista snapshots de saúde dos clientes
import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { listHealth } from "@/lib/jacqes-crm-db";

export const runtime = "nodejs";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "jacqes", "CRM JACQES — Health");
  if (denied) return denied;

  try {
    const data = await listHealth();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
