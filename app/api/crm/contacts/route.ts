import { NextRequest, NextResponse } from "next/server";
import { initCrmDB, listContacts, createContact, deleteContact, listAccounts } from "@/lib/crm-db";
import { getForcedBu, apiGuard } from "@/lib/api-guard";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  const denied = await apiGuard(req, "view", "holding", "CRM Contacts");
  if (denied) return denied;

  try {
    await initCrmDB();
    const p = req.nextUrl.searchParams;
    const forcedBu = await getForcedBu(req);
    let rows = await listContacts({
      account_id: p.get("account_id") ?? undefined,
      search:     p.get("search")     ?? undefined,
    });
    if (forcedBu) {
      const accs = await listAccounts({ bu: forcedBu });
      const allowed = new Set(accs.map(a => a.account_id));
      rows = rows.filter(c => c.account_id && allowed.has(c.account_id));
    }
    return ok(rows);
  } catch (e) { return err(String(e)); }
}

export async function POST(req: NextRequest) {
  const denied = await apiGuard(req, "create", "holding", "CRM Contacts");
  if (denied) return denied;

  try {
    await initCrmDB();
    const body = await req.json();
    const { action, ...data } = body;
    if (action === "create") {
      if (!data.full_name) return err("full_name required", 400);
      const row = await createContact(data);
      return ok(row);
    }
    if (action === "delete") {
      const { contact_id } = data;
      if (!contact_id) return err("contact_id required", 400);
      await deleteContact(contact_id);
      return ok({ deleted: true });
    }
    return err("Unknown action", 400);
  } catch (e) { return err(String(e)); }
}
