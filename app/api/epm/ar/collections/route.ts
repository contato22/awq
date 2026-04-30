import { NextRequest, NextResponse } from "next/server";
import {
  addCollectionLog,
  getCollectionLog,
  initCollectionsDB,
  type ARCollection,
} from "@/lib/ap-ar-db";

let _ready = false;
async function ensureDB() {
  if (!_ready) { await initCollectionsDB(); _ready = true; }
}

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    await ensureDB();
    const ar_id = req.nextUrl.searchParams.get("ar_id");
    if (!ar_id) return err("ar_id is required");
    return ok(await getCollectionLog(ar_id));
  } catch (e) { return err(String(e), 500); }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDB();
    const body = await req.json();
    const { ar_id, collection_date, method, outcome, next_followup, notes } = body;
    if (!ar_id || !collection_date || !method || !outcome)
      return err("ar_id, collection_date, method and outcome are required");
    const input: Omit<ARCollection, "id" | "created_at"> = {
      ar_id, collection_date, method, outcome, next_followup, notes,
    };
    const item = await addCollectionLog(input);
    return ok(item);
  } catch (e) { return err(String(e)); }
}
