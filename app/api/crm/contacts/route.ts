import { NextRequest, NextResponse } from "next/server";
import { initCrmDB, listContacts, createContact, updateContact } from "@/lib/crm-db";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    await initCrmDB();
    const p = req.nextUrl.searchParams;
    const rows = await listContacts({
      account_id: p.get("account_id") ?? undefined,
      search:     p.get("search")     ?? undefined,
    });
    return ok(rows);
  } catch (e) { return err(String(e)); }
}

export async function POST(req: NextRequest) {
  try {
    await initCrmDB();
    const body = await req.json();
    const { action, ...data } = body;
    if (action === "create") {
      if (!data.full_name) return err("full_name required", 400);
      const row = await createContact(data);
      return ok(row);
    }
    if (action === "update") {
      const { contact_id, ...rest } = data;
      if (!contact_id) return err("contact_id required", 400);
      const row = await updateContact(contact_id, rest);
      return ok(row);
    }
    return err("Unknown action", 400);
  } catch (e) { return err(String(e)); }
}
