import { NextRequest, NextResponse } from "next/server";
import { initCrmDB, listEmailLog, logEmail } from "@/lib/crm-db";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    await initCrmDB();
    const p = req.nextUrl.searchParams;
    const rows = await listEmailLog({
      related_to_id: p.get("related_to_id") ?? undefined,
      sent_by:       p.get("sent_by")        ?? undefined,
      limit:         p.has("limit")          ? parseInt(p.get("limit")!) : undefined,
    });
    return ok(rows);
  } catch (e) { return err(String(e), 500); }
}

export async function POST(req: NextRequest) {
  try {
    await initCrmDB();
    const body = await req.json();
    if (!body.to_email?.trim())       return err("to_email required");
    if (!body.subject?.trim())        return err("subject required");
    if (!body.related_to_type)        return err("related_to_type required");
    if (!body.related_to_id)          return err("related_to_id required");
    const row = await logEmail(body);
    return ok(row);
  } catch (e) { return err(String(e), 500); }
}
