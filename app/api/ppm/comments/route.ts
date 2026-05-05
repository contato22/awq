import { NextRequest, NextResponse } from "next/server";
import { listComments, createComment } from "@/lib/ppm-db";

function ok(data: unknown)         { return NextResponse.json({ success: true,  data }); }
function err(msg: string, s = 400) { return NextResponse.json({ success: false, error: msg }, { status: s }); }

export async function GET(req: NextRequest) {
  try {
    const project_id = req.nextUrl.searchParams.get("project_id") ?? undefined;
    return ok(await listComments(project_id));
  } catch (e) { return err((e as Error).message, 500); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.project_id) return err("project_id is required");
    if (!body.content?.trim()) return err("content is required");
    const comment = await createComment({
      ...body,
      entity_type: body.entity_type ?? "project",
      user_id:   body.user_id   ?? "system",
      user_name: body.user_name ?? "Usuário",
    });
    return ok(comment);
  } catch (e) { return err((e as Error).message, 500); }
}
