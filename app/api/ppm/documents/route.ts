import { NextRequest, NextResponse } from "next/server";
import { listDocuments, createDocument } from "@/lib/ppm-db";

function ok(data: unknown)         { return NextResponse.json({ success: true,  data }); }
function err(msg: string, s = 400) { return NextResponse.json({ success: false, error: msg }, { status: s }); }

export async function GET(req: NextRequest) {
  try {
    const project_id = req.nextUrl.searchParams.get("project_id") ?? undefined;
    return ok(await listDocuments(project_id));
  } catch (e) { return err((e as Error).message, 500); }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.project_id) return err("project_id is required");
    if (!body.title?.trim()) return err("title is required");
    if (!body.url?.trim())   return err("url is required");
    const doc = await createDocument({
      ...body,
      doc_type:    body.doc_type    ?? "other",
      uploaded_by: body.uploaded_by ?? "system",
    });
    return ok(doc);
  } catch (e) { return err((e as Error).message, 500); }
}
