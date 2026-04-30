import { NextRequest, NextResponse } from "next/server";
import {
  getRevenueRecognitions,
  recognizeRevenue,
  initRevenueRecognitionDB,
  type RevenueRecognition,
} from "@/lib/ap-ar-db";

let _ready = false;
async function ensureDB() {
  if (!_ready) { await initRevenueRecognitionDB(); _ready = true; }
}

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    await ensureDB();
    const sp     = req.nextUrl.searchParams;
    const ar_id  = sp.get("ar_id")  ?? undefined;
    const period = sp.get("period") ?? undefined;
    return ok(await getRevenueRecognitions(ar_id || period ? { ar_id, period } : undefined));
  } catch (e) { return err(String(e), 500); }
}

export async function POST(req: NextRequest) {
  try {
    await ensureDB();
    const body = await req.json();
    const { ar_id, period, recognized_amount, recognition_method, notes } = body;
    if (!ar_id || !period || !recognized_amount || !recognition_method)
      return err("ar_id, period, recognized_amount and recognition_method are required");
    if (!["cash", "accrual", "milestone"].includes(recognition_method))
      return err("recognition_method must be cash, accrual or milestone");
    if (typeof recognized_amount !== "number" || recognized_amount <= 0)
      return err("recognized_amount must be a positive number");

    const input: Omit<RevenueRecognition, "id" | "created_at"> = {
      ar_id, period, recognized_amount,
      recognition_method: recognition_method as RevenueRecognition["recognition_method"],
      notes,
    };
    return ok(await recognizeRevenue(input));
  } catch (e) { return err(String(e)); }
}
