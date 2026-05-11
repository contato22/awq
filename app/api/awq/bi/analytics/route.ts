import { NextResponse } from "next/server";
import { initBIDB, getBIAnalytics, upsertBIAnalytic, deleteBIAnalytic } from "@/lib/bi-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await initBIDB();
    const data = await getBIAnalytics();
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await initBIDB();
    const body = await req.json();
    if (body.action === "upsert") await upsertBIAnalytic(body.data);
    else if (body.action === "delete") await deleteBIAnalytic(body.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
