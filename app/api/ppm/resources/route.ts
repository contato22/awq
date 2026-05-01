import { NextRequest, NextResponse } from "next/server";
import { listAllocations, createAllocation, getResourceUtilization } from "@/lib/ppm-db";

function ok(data: unknown)          { return NextResponse.json({ success: true,  data }); }
function err(msg: string, s = 400)  { return NextResponse.json({ success: false, error: msg }, { status: s }); }

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const mode = p.get("mode"); // "utilization" | "allocations"

    if (mode === "utilization") {
      const util = await getResourceUtilization();
      return ok(util);
    }

    const allocations = await listAllocations(
      p.get("project_id") ?? undefined,
      p.get("user_id")    ?? undefined,
    );
    return ok(allocations);
  } catch (e) {
    return err((e as Error).message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.project_id)     return err("project_id is required");
    if (!body.user_id)        return err("user_id is required");
    if (!body.role)           return err("role is required");
    if (body.allocation_pct == null) return err("allocation_pct is required");
    if (!body.start_date)     return err("start_date is required");

    const allocation = await createAllocation({
      ...body,
      is_billable: body.is_billable ?? true,
      status:      body.status ?? "active",
    });
    return ok(allocation);
  } catch (e) {
    return err((e as Error).message, 500);
  }
}
