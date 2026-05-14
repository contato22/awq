import { NextRequest, NextResponse } from "next/server";
import { getDFCByMonth, initAllAPARTables, type BuCode } from "@/lib/ap-ar-db";

let _ready = false;
async function ensureDB() {
  if (!_ready) { await initAllAPARTables(); _ready = true; }
}

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    await ensureDB();
    const sp      = req.nextUrl.searchParams;
    const bu_code = (sp.get("bu_code") ?? undefined) as BuCode | undefined;
    return ok(await getDFCByMonth(bu_code ? { bu_code } : undefined));
  } catch (e) { return err(String(e), 500); }
}
