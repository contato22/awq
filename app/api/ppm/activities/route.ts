import { NextRequest, NextResponse } from "next/server";
import { listActivities, createActivity } from "@/lib/ppm-db";

function ok(data: unknown)         { return NextResponse.json({ success: true,  data }); }
function err(msg: string, s = 400) { return NextResponse.json({ success: false, error: msg }, { status: s }); }

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const project_id = p.get("project_id") ?? undefined;
    const limit      = parseInt(p.get("limit") ?? "50");
    return ok(await listActivities(project_id, limit));
  } catch (e) { return err((e as Error).message, 500); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.project_id) return err("project_id is required");
    if (!body.action)     return err("action is required");
    if (!body.description)return err("description is required");
    return ok(await createActivity(body));
  } catch (e) { return err((e as Error).message, 500); }
}
