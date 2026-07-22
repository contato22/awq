import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/patricia-canto/auth";
import { getCases, upsertCase } from "@/lib/patricia-canto/db";
import type { CaseItem } from "@/lib/patricia-canto/cases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!requireSession(req)) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    const cases = await getCases();
    return NextResponse.json({ cases });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!requireSession(req)) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    const item = (await req.json()) as CaseItem;
    await upsertCase(item);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
