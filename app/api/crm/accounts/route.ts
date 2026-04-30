import { NextRequest, NextResponse } from "next/server";
import { initCrmDB, listAccounts, getAccount, createAccount, updateAccount, listContacts, listOpportunities, listActivities } from "@/lib/crm-db";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    await initCrmDB();
    const p = req.nextUrl.searchParams;
    const id = p.get("id");

    if (id) {
      const [account, contacts, opportunities, activities] = await Promise.all([
        getAccount(id),
        listContacts({ account_id: id }),
        listOpportunities({ account_id: id }),
        listActivities({ related_to_type: "account", related_to_id: id }),
      ]);
      if (!account) return err("Not found", 404);
      return ok({ account, contacts, opportunities, activities });
    }

    const rows = await listAccounts({
      account_type: p.get("account_type") ?? undefined,
      owner:        p.get("owner")        ?? undefined,
      search:       p.get("search")       ?? undefined,
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
      if (!data.account_name) return err("account_name required", 400);
      const row = await createAccount(data);
      return ok(row);
    }
    if (action === "update") {
      const { account_id, ...rest } = data;
      if (!account_id) return err("account_id required", 400);
      const row = await updateAccount(account_id, rest);
      return ok(row);
    }
    return err("Unknown action", 400);
  } catch (e) { return err(String(e)); }
}
