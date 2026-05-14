import { NextRequest, NextResponse } from "next/server";
import { listMilestones, createMilestone } from "@/lib/ppm-db";

function ok(data: unknown)          { return NextResponse.json({ success: true,  data }); }
function err(msg: string, s = 400)  { return NextResponse.json({ success: false, error: msg }, { status: s }); }

export async function GET(req: NextRequest) {
  try {
    const project_id = req.nextUrl.searchParams.get("project_id") ?? undefined;
    const milestones = await listMilestones(project_id);
    return ok(milestones);
  } catch (e) {
    return err((e as Error).message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.project_id)     return err("project_id is required");
    if (!body.milestone_name) return err("milestone_name is required");
    if (!body.planned_date)   return err("planned_date is required");

    const milestone = await createMilestone({
      ...body,
      status:           body.status           ?? "upcoming",
      triggers_payment: body.triggers_payment ?? false,
      requires_approval:body.requires_approval ?? false,
    });
    return ok(milestone);
  } catch (e) {
    return err((e as Error).message, 500);
  }
}
