import { NextRequest, NextResponse } from "next/server";
import { listRisks, createRisk } from "@/lib/ppm-db";
import type { BuCode } from "@/lib/ppm-types";
import { requireSession } from "@/lib/api-auth";

function ok(data: unknown)          { return NextResponse.json({ success: true,  data }); }
function err(msg: string, s = 400)  { return NextResponse.json({ success: false, error: msg }, { status: s }); }

export async function GET(req: NextRequest) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  try {
    const lockedBU = (auth.buLock ?? undefined) as BuCode | undefined;
    const project_id = req.nextUrl.searchParams.get("project_id") ?? undefined;
    const risks = await listRisks(project_id, { bu_code: lockedBU });
    return ok(risks);
  } catch (e) {
    return err((e as Error).message, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSession(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    if (!body.project_id)       return err("project_id is required");
    if (!body.risk_description) return err("risk_description is required");
    if (!body.impact)           return err("impact is required");
    if (!body.probability)      return err("probability is required");

    const risk = await createRisk({
      ...body,
      status:          body.status          ?? "identified",
      identified_date: body.identified_date ?? new Date().toISOString().slice(0, 10),
    });
    return ok(risk);
  } catch (e) {
    return err((e as Error).message, 500);
  }
}
