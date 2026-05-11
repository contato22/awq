import { NextResponse } from "next/server";
import { initEPMDB, getFXRates, getFCTransactions, upsertFXRate, upsertFCTransaction } from "@/lib/epm-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await initEPMDB();
    const [fxRates, fcTransactions] = await Promise.all([getFXRates(), getFCTransactions()]);
    return NextResponse.json({ success: true, fxRates, fcTransactions });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await initEPMDB();
    const body = await req.json();
    if (body.action === "upsert_fx") await upsertFXRate(body.data);
    else if (body.action === "upsert_fc") await upsertFCTransaction(body.data);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
