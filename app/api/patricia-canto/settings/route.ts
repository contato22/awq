import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/patricia-canto/auth";
import { getSetting, setSetting } from "@/lib/patricia-canto/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INVESTMENT_KEY = "channel_investment";

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!requireSession(req)) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    const investment = await getSetting(INVESTMENT_KEY, {});
    return NextResponse.json({ investment });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest): Promise<NextResponse> {
  if (!requireSession(req)) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  try {
    const investment = await req.json();
    await setSetting(INVESTMENT_KEY, investment);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
