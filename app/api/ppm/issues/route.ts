import { NextRequest, NextResponse } from "next/server";
import { listIssues, createIssue } from "@/lib/ppm-db";

function ok(data: unknown)          { return NextResponse.json({ success: true,  data }); }
function err(msg: string, s = 400)  { return NextResponse.json({ success: false, error: msg }, { status: s }); }

export async function GET(req: NextRequest) {
  try {
    const project_id = req.nextUrl.searchParams.get("project_id") ?? undefined;
    const issues = await listIssues(project_id);
    return ok(issues);
  } catch (e) {
    return err((e as Error).message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.project_id)       return err("project_id is required");
    if (!body.issue_description)return err("issue_description is required");
    if (!body.severity)         return err("severity is required");

    const issue = await createIssue({
      ...body,
      status:        body.status        ?? "open",
      reported_date: body.reported_date ?? new Date().toISOString().slice(0, 10),
    });
    return ok(issue);
  } catch (e) {
    return err((e as Error).message, 500);
  }
}
