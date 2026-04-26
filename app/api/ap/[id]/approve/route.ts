// ─── POST /api/ap/[id]/approve — aprovar ou rejeitar uma conta a pagar

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { initAPDB, approveAP, rejectAP } from "@/lib/ap-db";
import { initSuppliersDB } from "@/lib/suppliers-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const denied = await apiGuard(req, "update", "financeiro", "Contas a Pagar");
  if (denied) return denied;
  if (!sql) return NextResponse.json({ error: "DB not available" }, { status: 503 });

  await initSuppliersDB();
  await initAPDB();

  const { id } = await ctx.params;
  const body   = await req.json() as Record<string, unknown>;
  const action = String(body.action ?? "approve");  // "approve" | "reject"
  const by     = body.approver ? String(body.approver) : "system";
  const level  = body.level != null ? Number(body.level) : 1;

  if (action === "reject") {
    if (!body.reason) {
      return NextResponse.json({ error: "reason é obrigatório para rejeição" }, { status: 400 });
    }
    const updated = await rejectAP(Number(id), by, String(body.reason), level);
    return NextResponse.json(updated);
  }

  const updated = await approveAP(Number(id), by, level);
  return NextResponse.json(updated);
}
