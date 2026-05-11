import { NextResponse } from "next/server";
import { getPlanningBlob, upsertPlanningBlob } from "@/lib/planning-db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  if (!key) return NextResponse.json({ success: false, error: "Missing key" }, { status: 400 });
  try {
    const data = await getPlanningBlob(key);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { key, data } = await req.json();
    if (!key) return NextResponse.json({ success: false, error: "Missing key" }, { status: 400 });
    await upsertPlanningBlob(key, data);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
