import { NextRequest, NextResponse } from "next/server";
import { initCrmDB, listEmailSequences, createEmailSequence } from "@/lib/crm-db";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    await initCrmDB();
    const bu = req.nextUrl.searchParams.get("bu") ?? undefined;
    const rows = await listEmailSequences({ bu });
    return ok(rows);
  } catch (e) { return err(String(e), 500); }
}

export async function POST(req: NextRequest) {
  try {
    await initCrmDB();
    const body = await req.json();
    const { action, ...data } = body;
    if (action === "create") {
      if (!data.name?.trim()) return err("name required");
      const row = await createEmailSequence(data);
      return ok(row);
    }
    return err("Unknown action");
  } catch (e) { return err(String(e), 500); }
}
