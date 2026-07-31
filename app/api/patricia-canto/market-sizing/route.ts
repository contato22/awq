import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/patricia-canto/auth";
import { getSetting, setSetting, logActivity } from "@/lib/patricia-canto/db";
import { EMPTY_MARKET_SIZING } from "@/lib/patricia-canto/gtm-extra";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = "market_sizing";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!requireSession(req)) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    const marketSizing = await getSetting(KEY, EMPTY_MARKET_SIZING);
    return NextResponse.json({ marketSizing });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  const role = requireSession(req);
  if (!role) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    const marketSizing = await req.json();
    await setSetting(KEY, marketSizing);
    await logActivity(role, "Atualizou TAM/SAM/SOM");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
