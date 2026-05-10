import { NextRequest, NextResponse } from "next/server";
import { initMaDB, listDdItems, createDdItem, updateDdItem } from "@/lib/ma-db";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 500) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    await initMaDB();
    const p = req.nextUrl.searchParams;
    const deal_id = p.get("deal_id");
    if (!deal_id) return err("deal_id required", 400);
    const rows = await listDdItems(deal_id);
    return ok(rows);
  } catch (e) { return err(String(e)); }
}

export async function POST(req: NextRequest) {
  try {
    await initMaDB();
    const body = await req.json();
    const { action, ...data } = body;

    if (action === "create") {
      if (!data.deal_id)      return err("deal_id required", 400);
      if (!data.dd_category)  return err("dd_category required", 400);
      if (!data.item_name)    return err("item_name required", 400);
      const row = await createDdItem(data);
      return ok(row);
    }

    if (action === "update") {
      const { dd_item_id, ...rest } = data;
      if (!dd_item_id) return err("dd_item_id required", 400);
      const row = await updateDdItem(dd_item_id, rest);
      return ok(row);
    }

    return err("Unknown action", 400);
  } catch (e) { return err(String(e)); }
}
