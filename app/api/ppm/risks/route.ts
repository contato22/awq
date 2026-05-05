import { NextRequest, NextResponse } from "next/server";
import { listRisks, createRisk, updateRisk } from "@/lib/ppm-db";

function ok(data: unknown)          { return NextResponse.json({ success: true,  data }); }
function err(msg: string, s = 400)  { return NextResponse.json({ success: false, error: msg }, { status: s }); }

export async function GET(req: NextRequest) {
  try {
    const project_id = req.nextUrl.searchParams.get("project_id") ?? undefined;
    const risks = await listRisks(project_id);
    return ok(risks);
  } catch (e) {
    return err((e as Error).message, 500);
  }
}

export async function POST(req: NextRequest) {
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

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { risk_id, ...patch } = body;
    if (!risk_id) return err("risk_id is required");
    const updated = await updateRisk(risk_id, patch);
    if (!updated) return err("Risk not found", 404);
    return ok(updated);
  } catch (e) {
    return err((e as Error).message, 500);
  }
}
