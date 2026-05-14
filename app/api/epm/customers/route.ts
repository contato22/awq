import { NextRequest, NextResponse } from "next/server";
import {
  getCustomers,
  addCustomer,
  initCustomersDB,
} from "@/lib/ap-ar-db";

let _ready = false;
async function ensureDB() {
  if (!_ready) { await initCustomersDB(); _ready = true; }
}

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET() {
  try {
    await ensureDB();
    return ok(await getCustomers());
  } catch (e) { return err(String(e), 500); }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDB();
    const body = await req.json();
    const { name, doc, email, phone, address, notes } = body;
    if (!name) return err("name is required");
    const item = await addCustomer({ name, doc, email, phone, address, notes });
    return ok(item);
  } catch (e) { return err(String(e)); }
}
