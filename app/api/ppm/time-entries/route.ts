import { NextRequest, NextResponse } from "next/server";
import { listTimeEntries, createTimeEntry, approveTimeEntry } from "@/lib/ppm-db";
import type { TimeEntryStatus } from "@/lib/ppm-types";

function ok(data: unknown)          { return NextResponse.json({ success: true,  data }); }
function err(msg: string, s = 400)  { return NextResponse.json({ success: false, error: msg }, { status: s }); }

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const entries = await listTimeEntries({
      project_id: p.get("project_id") ?? undefined,
      user_id:    p.get("user_id")    ?? undefined,
      status:    (p.get("status")     ?? undefined) as TimeEntryStatus | undefined,
    });
    return ok(entries);
  } catch (e) {
    return err((e as Error).message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // APPROVE action
    if (action === "approve") {
      if (!body.entry_id)    return err("entry_id is required");
      if (!body.approved_by) return err("approved_by is required");
      await approveTimeEntry(body.entry_id, body.approved_by);
      return ok({ approved: true });
    }

    // CREATE action
    if (!body.user_id)    return err("user_id is required");
    if (!body.project_id) return err("project_id is required");
    if (!body.entry_date) return err("entry_date is required");
    if (!body.hours)      return err("hours is required");
    if (body.hours <= 0 || body.hours > 24) return err("hours must be between 0 and 24");

    const entry = await createTimeEntry({
      ...body,
      is_billable: body.is_billable ?? true,
      invoiced:    false,
      status:      body.status ?? "submitted",
    });
    return ok(entry);
  } catch (e) {
    return err((e as Error).message, 500);
  }
}
