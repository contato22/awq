import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/patricia-canto/auth";
import { getSetting, setSetting } from "@/lib/patricia-canto/db";
import type { ComunicacaoItem } from "@/lib/patricia-canto/gtm-extra";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KEY = "comunicacoes";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!requireSession(req)) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    const comunicacoes = await getSetting<ComunicacaoItem[]>(KEY, []);
    return NextResponse.json({ comunicacoes });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  if (!requireSession(req)) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    const comunicacoes = await req.json();
    await setSetting(KEY, comunicacoes);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
