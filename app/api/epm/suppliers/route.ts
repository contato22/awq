import { NextRequest, NextResponse } from "next/server";
import {
  getSuppliers,
  addSupplier,
  initSuppliersDB,
} from "@/lib/ap-ar-db";

let _ready = false;
async function ensureDB() {
  if (!_ready) { await initSuppliersDB(); _ready = true; }
}

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET() {
  try {
    await ensureDB();
    return ok(await getSuppliers());
  } catch (e) { return err(String(e), 500); }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDB();
    const body = await req.json();
    const { name, doc, supplier_type, email, phone } = body;
    if (!name || !supplier_type) return err("name and supplier_type are required");
    const item = await addSupplier({ name, doc, supplier_type, email, phone });
    return ok(item);
  } catch (e) { return err(String(e)); }
}
