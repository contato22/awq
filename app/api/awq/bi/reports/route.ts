import { NextResponse } from "next/server";
import { initBIDB, getBIReports, upsertBIReport, deleteBIReport } from "@/lib/bi-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await initBIDB();
    const data = await getBIReports();
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await initBIDB();
    const body = await req.json();
    if (body.action === "upsert") await upsertBIReport(body.data);
    else if (body.action === "delete") await deleteBIReport(body.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
