import { NextRequest, NextResponse } from "next/server";
import { initCrmDB, listEmailTemplates, createEmailTemplate, updateEmailTemplate } from "@/lib/crm-db";

function ok(data: unknown) { return NextResponse.json({ success: true, data }); }
function err(msg: string, status = 400) { return NextResponse.json({ success: false, error: msg }, { status }); }

export async function GET(req: NextRequest) {
  try {
    await initCrmDB();
    const p = req.nextUrl.searchParams;
    const rows = await listEmailTemplates({
      bu:        p.get("bu")       ?? undefined,
      category:  p.get("category") ?? undefined,
      is_active: p.has("is_active") ? p.get("is_active") === "true" : undefined,
    });
    return ok(rows);
  } catch (e) { return err(String(e), 500); }
}

export async function POST(req: NextRequest) {
  try {
    await initCrmDB();
    const body = await req.json();
    const { action, ...data } = body;

    if (action === "create") {
      if (!data.name?.trim()) return err("name required");
      if (!data.subject?.trim()) return err("subject required");
      if (!data.body_text?.trim()) return err("body_text required");
      const row = await createEmailTemplate(data);
      return ok(row);
    }
    if (action === "update") {
      if (!data.template_id) return err("template_id required");
      const { template_id, ...rest } = data;
      const row = await updateEmailTemplate(template_id, rest);
      return ok(row);
    }
    return err("Unknown action");
  } catch (e) { return err(String(e), 500); }
}
