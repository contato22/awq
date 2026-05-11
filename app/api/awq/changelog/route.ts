import { NextResponse } from "next/server";
import { getChangelogs, upsertChangelog, deleteChangelog } from "@/lib/changelog-db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const data = await getChangelogs();
    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.action === "upsert") {
      await upsertChangelog(body.data);
      return NextResponse.json({ success: true });
    }
    if (body.action === "delete") {
      await deleteChangelog(body.id);
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
