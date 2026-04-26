// ─── GET /api/ap/[id]/history — histórico de um AP

import { NextRequest, NextResponse } from "next/server";
import { apiGuard } from "@/lib/api-guard";
import { initAPDB, getAPHistory } from "@/lib/ap-db";
import { initSuppliersDB } from "@/lib/suppliers-db";
import { sql } from "@/lib/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const denied = await apiGuard(req, "view", "financeiro", "Contas a Pagar");
  if (denied) return denied;
  if (!sql) return NextResponse.json([], { status: 200 });

  await initSuppliersDB();
  await initAPDB();

  const { id } = await ctx.params;
  const history = await getAPHistory(Number(id));
  return NextResponse.json(history);
}
