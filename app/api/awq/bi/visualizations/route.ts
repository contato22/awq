import { NextResponse } from "next/server";
import { initBIDB, getBIVisualizations, upsertBIVisualization, deleteBIVisualization } from "@/lib/bi-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await initBIDB();
    const data = await getBIVisualizations();
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await initBIDB();
    const body = await req.json();
    if (body.action === "upsert") await upsertBIVisualization(body.data);
    else if (body.action === "delete") await deleteBIVisualization(body.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
  }
}
