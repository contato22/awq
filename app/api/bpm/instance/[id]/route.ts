// GET /api/bpm/instance/[id] — Retorna instância com tasks e history

import { NextRequest, NextResponse } from "next/server";
import { USE_DB, sql } from "@/lib/db";
import { initBpmDB, dbGetInstance, dbGetHistory } from "@/lib/bpm-db";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

    if (!USE_DB || !sql) {
      return NextResponse.json({ success: true, no_db: true, data: null });
    }

    await initBpmDB();
    const instance = await dbGetInstance(id);
    if (!instance) {
      return NextResponse.json({ success: false, error: "Instance not found" }, { status: 404 });
    }

    const history = await dbGetHistory(id);

    return NextResponse.json({ success: true, data: { instance, history } });
  } catch (err) {
    console.error("[bpm/instance/[id]]", err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
