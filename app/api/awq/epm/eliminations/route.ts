import { NextResponse } from "next/server";
import { initEPMDB, getICTransactions, upsertICTransaction, deleteICTransaction } from "@/lib/epm-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await initEPMDB();
    const data = await getICTransactions();
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await initEPMDB();
    const body = await req.json();
    if (body.action === "upsert") await upsertICTransaction(body.data);
    else if (body.action === "delete") await deleteICTransaction(body.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
